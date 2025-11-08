import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import type { NjaSwap } from "./idl";
import IDLJson from "../../public/idl/nja_swap.json";

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8899";
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "5jNzyaz9Lt5mRKKLeqNUgRspjaJEZPQoYaG5DW7UsvQB"
);

export function getConnection() {
  return new Connection(RPC_URL, "confirmed");
}

export function getProvider(wallet: any) {
  return new AnchorProvider(getConnection(), wallet, {});
}

export async function getProgram(wallet: any): Promise<Program<NjaSwap>> {
  const provider = getProvider(wallet);
  return new Program<NjaSwap>(IDLJson as NjaSwap, provider);
}
