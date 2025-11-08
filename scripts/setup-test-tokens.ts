import * as anchor from "@coral-xyz/anchor";
import { createMint, mintTo, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

/**
 * Creates two test SPL tokens and mints them to your wallet.
 * Use this script to set up tokens for testing the DEX frontend locally.
 *
 * Usage:
 *   ts-node scripts/setup-test-tokens.ts
 */
async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const payer = provider.wallet as anchor.Wallet;

  console.log("\n🔧 Setting up test tokens...");
  console.log("Wallet:", payer.publicKey.toString());
  console.log("RPC:", provider.connection.rpcEndpoint);
  console.log("");

  // Check SOL balance and airdrop if needed
  const balance = await provider.connection.getBalance(payer.publicKey);
  console.log(`Current SOL balance: ${balance / 1e9} SOL`);

  if (balance < 1e9) {
    // Less than 1 SOL
    console.log("⚠️  Low SOL balance, requesting airdrop...");
    try {
      const signature = await provider.connection.requestAirdrop(
        payer.publicKey,
        5 * 1e9 // 5 SOL
      );
      await provider.connection.confirmTransaction(signature);
      console.log("✅ Airdropped 5 SOL\n");
    } catch (err) {
      console.log("⚠️  Airdrop failed (this is normal on some networks)");
      console.log("   Please manually airdrop: solana airdrop 5\n");
    }
  }

  // Create Token A
  console.log("Creating Token A...");
  const tokenA = await createMint(
    provider.connection,
    payer.payer,
    payer.publicKey,
    null,
    9 // decimals
  );
  console.log("✅ Token A Mint:", tokenA.toString());

  // Create Token B
  console.log("\nCreating Token B...");
  const tokenB = await createMint(
    provider.connection,
    payer.payer,
    payer.publicKey,
    null,
    9 // decimals
  );
  console.log("✅ Token B Mint:", tokenB.toString());

  // Create associated token accounts
  console.log("\nCreating token accounts...");
  const ataA = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    payer.payer,
    tokenA,
    payer.publicKey
  );

  const ataB = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    payer.payer,
    tokenB,
    payer.publicKey
  );

  // Mint tokens to wallet
  console.log("Minting tokens...");
  await mintTo(
    provider.connection,
    payer.payer,
    tokenA,
    ataA.address,
    payer.publicKey,
    10_000 * 1e9 // 10,000 tokens
  );

  await mintTo(
    provider.connection,
    payer.payer,
    tokenB,
    ataB.address,
    payer.publicKey,
    10_000 * 1e9 // 10,000 tokens
  );

  console.log("✅ Minted 10,000 of each token to your wallet\n");

  console.log("═══════════════════════════════════════════════");
  console.log("📋 COPY THESE ADDRESSES TO THE FRONTEND:");
  console.log("═══════════════════════════════════════════════");
  console.log("Token A Mint:", tokenA.toString());
  console.log("Token B Mint:", tokenB.toString());
  console.log("═══════════════════════════════════════════════\n");

  console.log("🎉 Setup complete! You can now:");
  console.log("   1. Paste these addresses in the frontend");
  console.log("   2. Initialize a pool");
  console.log("   3. Add liquidity and start swapping!\n");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
