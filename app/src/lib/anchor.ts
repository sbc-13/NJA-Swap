import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8899";
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "HazKKeRzso2bAryAMipJ741gA3oGU9wJmDFwHCt29gqJ"
);

// Try to fetch IDL from a public URL or from /idl/nja_swap.json under the frontend public folder.
// Place the actual IDL at app/public/idl/nja_swap.json (copy from ../../target/idl/nja_swap.json)
export async function loadIdl(): Promise<Idl> {
  const customUrl = process.env.NEXT_PUBLIC_IDL_URL;
  const url = customUrl || "/idl/nja_swap.json";
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to load IDL from ${url}. Did you copy target/idl/nja_swap.json to app/public/idl/nja_swap.json?`
    );
  }
  return (await res.json()) as Idl;
}

export function getConnection() {
  return new Connection(RPC_URL, "confirmed");
}

export function getProvider(wallet: any) {
  return new AnchorProvider(getConnection(), wallet, {});
}

export async function getProgram(wallet: any): Promise<Program> {
  const idl = await loadIdl();
  return new Program(idl, PROGRAM_ID, getProvider(wallet));
}
