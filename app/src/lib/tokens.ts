import { Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

export async function getOrCreateAtaIx(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey
): Promise<{ address: PublicKey; ix: import("@solana/web3.js").TransactionInstruction | null }> {
  const ata = await getAssociatedTokenAddress(mint, owner, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const info = await connection.getAccountInfo(ata);
  if (info) return { address: ata, ix: null };
  const ix = createAssociatedTokenAccountInstruction(owner, ata, owner, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  return { address: ata, ix };
}

export async function ensureAtas(
  connection: Connection,
  owner: PublicKey,
  mints: PublicKey[]
): Promise<{ ixs: import("@solana/web3.js").TransactionInstruction[]; atAs: PublicKey[] }> {
  const ixs: import("@solana/web3.js").TransactionInstruction[] = [];
  const atAs: PublicKey[] = [];
  for (const mint of mints) {
    const { address, ix } = await getOrCreateAtaIx(connection, owner, mint);
    if (ix) ixs.push(ix);
    atAs.push(address);
  }
  return { ixs, atAs };
}
