import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { createMint, mintTo, getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";

/**
 * Creates two test SPL tokens and mints them to your wallet.
 * Optionally transfers tokens and SOL to another address (e.g., Phantom wallet).
 *
 * Use this script to set up tokens for testing the DEX frontend locally.
 *
 * Usage:
 *   yarn setup-tokens                                    # Mint to CLI wallet
 *   yarn setup-tokens <RECIPIENT_ADDRESS>                # Mint and transfer to recipient
 */
async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const payer = provider.wallet as anchor.Wallet;
  const args = process.argv.slice(2);
  const recipientAddr = args[0];
  const recipient = recipientAddr ? new PublicKey(recipientAddr) : null;

  console.log("\n🔧 Setting up test tokens...");
  console.log("Payer (CLI):", payer.publicKey.toString());
  if (recipient) {
    console.log("Recipient:", recipient.toString());
  }
  console.log("RPC:", provider.connection.rpcEndpoint);
  console.log("");

  // Check SOL balance and airdrop if needed
  const balance = await provider.connection.getBalance(payer.publicKey);
  console.log(`CLI wallet SOL balance: ${balance / 1e9} SOL`);

  if (balance < 2e9) {
    // Less than 2 SOL
    console.log("⚠️  Low SOL balance, requesting airdrop...");
    try {
      const signature = await provider.connection.requestAirdrop(
        payer.publicKey,
        5 * 1e9 // 5 SOL
      );
      await provider.connection.confirmTransaction(signature);
      console.log("✅ Airdropped 5 SOL to CLI wallet\n");
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

  // Create associated token accounts for CLI wallet
  console.log("\nCreating token accounts for CLI wallet...");
  const cliAtaA = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    payer.payer,
    tokenA,
    payer.publicKey
  );

  const cliAtaB = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    payer.payer,
    tokenB,
    payer.publicKey
  );

  // Mint tokens to CLI wallet
  console.log("Minting tokens to CLI wallet...");
  const MINT_AMOUNT = 10_000 * 1e9; // 10,000 tokens

  await mintTo(
    provider.connection,
    payer.payer,
    tokenA,
    cliAtaA.address,
    payer.publicKey,
    MINT_AMOUNT
  );

  await mintTo(
    provider.connection,
    payer.payer,
    tokenB,
    cliAtaB.address,
    payer.publicKey,
    MINT_AMOUNT
  );

  console.log("✅ Minted 10,000 of each token to CLI wallet\n");

  // Transfer to recipient if provided
  if (recipient) {
    console.log("🚀 Transferring tokens and SOL to recipient...\n");

    // Create token accounts for recipient
    console.log("Creating token accounts for recipient...");
    const recipientAtaA = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      tokenA,
      recipient
    );

    const recipientAtaB = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      tokenB,
      recipient
    );

    // Transfer tokens
    const TRANSFER_AMOUNT = 5_000 * 1e9; // 5,000 tokens
    console.log("Transferring 5,000 of each token...");

    await transfer(
      provider.connection,
      payer.payer,
      cliAtaA.address,
      recipientAtaA.address,
      payer.publicKey,
      TRANSFER_AMOUNT
    );
    console.log("✅ Transferred 5,000 Token A");

    await transfer(
      provider.connection,
      payer.payer,
      cliAtaB.address,
      recipientAtaB.address,
      payer.publicKey,
      TRANSFER_AMOUNT
    );
    console.log("✅ Transferred 5,000 Token B");

    // Transfer SOL
    console.log("\nTransferring 2 SOL to recipient...");
    const transferSolIx = SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: recipient,
      lamports: 2 * 1e9, // 2 SOL
    });

    const tx = new Transaction().add(transferSolIx);
    await sendAndConfirmTransaction(provider.connection, tx, [payer.payer]);
    console.log("✅ Transferred 2 SOL\n");
  }

  console.log("═══════════════════════════════════════════════");
  console.log("📋 COPY THESE ADDRESSES TO THE FRONTEND:");
  console.log("═══════════════════════════════════════════════");
  console.log("Token A Mint:", tokenA.toString());
  console.log("Token B Mint:", tokenB.toString());
  console.log("═══════════════════════════════════════════════\n");

  if (recipient) {
    console.log("🎉 Setup complete! Your recipient wallet now has:");
    console.log("   • 5,000 Token A");
    console.log("   • 5,000 Token B");
    console.log("   • 2 SOL for transaction fees\n");
    console.log("Next steps:");
    console.log("   1. Open Phantom wallet (make sure it's on Localhost)");
    console.log("   2. Paste the token addresses above in the frontend");
    console.log("   3. Initialize pool → Add liquidity → Swap!\n");
  } else {
    console.log("🎉 Setup complete! You can now:");
    console.log("   1. Paste these addresses in the frontend");
    console.log("   2. Initialize a pool");
    console.log("   3. Add liquidity and start swapping!\n");
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
