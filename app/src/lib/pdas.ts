import { PublicKey } from "@solana/web3.js";

export function derivePdas(
  programId: PublicKey,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey
) {
  const [pool] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), tokenAMint.toBuffer(), tokenBMint.toBuffer()],
    programId
  );
  const [poolAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_authority"), pool.toBuffer()],
    programId
  );
  const [tokenAVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_a_vault"), pool.toBuffer()],
    programId
  );
  const [tokenBVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_b_vault"), pool.toBuffer()],
    programId
  );
  const [lpTokenMint] = PublicKey.findProgramAddressSync(
    [Buffer.from("lp_token_mint"), pool.toBuffer()],
    programId
  );
  return { pool, poolAuthority, tokenAVault, tokenBVault, lpTokenMint };
}
