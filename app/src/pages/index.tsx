import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { BN } from "@coral-xyz/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getProgram, PROGRAM_ID } from "@/lib/anchor";
import { derivePdas } from "@/lib/pdas";
import { ensureAtas } from "@/lib/tokens";

const toPubkey = (s: string) => new PublicKey(s.trim());
const LAMPORTS_9 = 1_000_000_000;

export default function Home() {
  const wallet = useWallet();
  const [tokenA, setTokenA] = useState("");
  const [tokenB, setTokenB] = useState("");

  const mintsValid = useMemo(() => {
    try {
      if (!tokenA || !tokenB) return false;
      const a = toPubkey(tokenA); const b = toPubkey(tokenB);
      return a && b && a.toBase58() !== b.toBase58();
    } catch { return false; }
  }, [tokenA, tokenB]);

  const pdas = useMemo(() => {
    if (!mintsValid) return null;
    return derivePdas(PROGRAM_ID, toPubkey(tokenA), toPubkey(tokenB));
  }, [mintsValid, tokenA, tokenB]);

  const [poolData, setPoolData] = useState<any>(null);
  const [balances, setBalances] = useState<{ a: number; b: number; lp: number; sol: number } | null>(null);
  const [status, setStatus] = useState<string>("");

  // Load pool data when PDAs change
  const loadPool = useCallback(async () => {
    if (!pdas || !wallet.publicKey) return;
    try {
      const program = await getProgram(wallet);
      const pool = await program.account.pool.fetch(pdas.pool);
      setPoolData(pool);
      setStatus(`✅ Pool loaded successfully`);
    } catch (e: any) {
      setPoolData(null);
      if (e.message?.includes("Account does not exist")) {
        setStatus("⚠️ Pool not initialized yet");
      } else {
        console.error(e);
        setStatus(`❌ ${e?.message || e}`);
      }
    }
  }, [pdas, wallet]);

  // Load wallet balances
  const loadBalances = useCallback(async () => {
    if (!wallet.publicKey) return;

    try {
      const program = await getProgram(wallet);

      // Always get SOL balance
      const solBalance = await program.provider.connection.getBalance(wallet.publicKey);

      // If we have valid tokens, get token balances
      let tokenBalances = { a: 0, b: 0, lp: 0 };

      if (mintsValid && pdas) {
        try {
          const { getAccount } = await import("@solana/spl-token");
          const { atAs } = await ensureAtas(
            program.provider.connection,
            wallet.publicKey,
            [toPubkey(tokenA), toPubkey(tokenB), pdas.lpTokenMint]
          );

          const balancesArr = await Promise.all(
            atAs.map(async (ata) => {
              try {
                const account = await getAccount(program.provider.connection, ata);
                return Number(account.amount);
              } catch {
                return 0;
              }
            })
          );

          tokenBalances = {
            a: balancesArr[0] / LAMPORTS_9,
            b: balancesArr[1] / LAMPORTS_9,
            lp: balancesArr[2] / LAMPORTS_9,
          };
        } catch (e) {
          console.error("Failed to load token balances:", e);
        }
      }

      setBalances({
        ...tokenBalances,
        sol: solBalance / LAMPORTS_9,
      });
    } catch (e: any) {
      console.error("Failed to load balances:", e);
    }
  }, [wallet, mintsValid, pdas, tokenA, tokenB]);

  const run = useCallback(async (fn: () => Promise<string | void>) => {
    try {
      setStatus("⏳ Sending...");
      const sig = (await fn()) as string | undefined;
      setStatus(sig ? `✅ Tx: ${sig}` : "✅ Done");
    } catch (e: any) {
      console.error(e);
      setStatus(`❌ ${e?.message || e}`);
    }
  }, []);

  const onInit = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction) throw new Error("Connect a wallet");
    if (!mintsValid || !pdas) throw new Error("Enter valid token mint addresses");
    const program = await getProgram(wallet);

    const { SystemProgram, SYSVAR_RENT_PUBKEY } = await import("@solana/web3.js");

    const txBuilder = program.methods.initializePool().accounts({
      pool: pdas.pool,
      poolAuthority: pdas.poolAuthority,
      tokenAMint: toPubkey(tokenA),
      tokenBMint: toPubkey(tokenB),
      tokenAVault: pdas.tokenAVault,
      tokenBVault: pdas.tokenBVault,
      lpTokenMint: pdas.lpTokenMint,
      payer: wallet.publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    });

    const tx = await txBuilder.transaction();
    tx.feePayer = wallet.publicKey;
    const latest = await program.provider.connection.getLatestBlockhash();
    tx.recentBlockhash = latest.blockhash;

    const signed = await wallet.signTransaction!(tx);
    const sig = await program.provider.connection.sendRawTransaction(signed.serialize());
    await program.provider.connection.confirmTransaction(sig, "confirmed");
    return sig;
  }, [wallet, mintsValid, pdas, tokenA, tokenB]);

  const [amountA, setAmountA] = useState("100");
  const [amountB, setAmountB] = useState("100");

  const onAddLiquidity = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction) throw new Error("Connect a wallet");
    if (!mintsValid || !pdas) throw new Error("Enter valid token mint addresses");
    const program = await getProgram(wallet);

    // Ensure user has ATAs for A, B, LP
    const { ixs, atAs } = await ensureAtas(
      program.provider.connection,
      wallet.publicKey,
      [toPubkey(tokenA), toPubkey(tokenB), pdas.lpTokenMint]
    );
    const [userTokenA, userTokenB, userLpToken] = atAs;

    const txIx = await program.methods
      .addLiquidity(new BN(Math.floor(parseFloat(amountA) * LAMPORTS_9)), new BN(Math.floor(parseFloat(amountB) * LAMPORTS_9)), new BN(0))
      .accounts({
        pool: pdas.pool,
        poolAuthority: pdas.poolAuthority,
        tokenAVault: pdas.tokenAVault,
        tokenBVault: pdas.tokenBVault,
        lpTokenMint: pdas.lpTokenMint,
        userTokenA,
        userTokenB,
        userLpToken,
        user: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();

    const tx = new Transaction();
    for (const ix of ixs) tx.add(ix);
    tx.add(...txIx.instructions);

    tx.feePayer = wallet.publicKey;
    const latest = await program.provider.connection.getLatestBlockhash();
    tx.recentBlockhash = latest.blockhash;
    const signed = await wallet.signTransaction(tx);
    const sig = await program.provider.connection.sendRawTransaction(signed.serialize());
    await program.provider.connection.confirmTransaction(sig, "confirmed");
    return sig;
  }, [wallet, mintsValid, pdas, tokenA, tokenB, amountA, amountB]);

  const [swapIn, setSwapIn] = useState("10");
  const [swapDir, setSwapDir] = useState<"AtoB" | "BtoA">("AtoB");
  const [minOut, setMinOut] = useState("0");

  const onSwap = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction) throw new Error("Connect a wallet");
    if (!mintsValid || !pdas) throw new Error("Enter valid token mint addresses");
    const program = await getProgram(wallet);

    const { ixs, atAs } = await ensureAtas(
      program.provider.connection,
      wallet.publicKey,
      [toPubkey(tokenA), toPubkey(tokenB)]
    );
    const [userTokenA, userTokenB] = atAs;
    const isAToB = swapDir === "AtoB";

    const swapTx = await program.methods
      .swap(new BN(Math.floor(parseFloat(swapIn) * LAMPORTS_9)), new BN(Math.floor(parseFloat(minOut) * LAMPORTS_9)), isAToB)
      .accounts({
        pool: pdas.pool,
        poolAuthority: pdas.poolAuthority,
        tokenAVault: pdas.tokenAVault,
        tokenBVault: pdas.tokenBVault,
        userTokenA,
        userTokenB,
        user: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();

    const tx = new Transaction();
    for (const ix of ixs) tx.add(ix);
    tx.add(...swapTx.instructions);

    tx.feePayer = wallet.publicKey;
    const latest = await program.provider.connection.getLatestBlockhash();
    tx.recentBlockhash = latest.blockhash;

    const signed = await wallet.signTransaction!(tx);
    const sig = await program.provider.connection.sendRawTransaction(signed.serialize());
    await program.provider.connection.confirmTransaction(sig, "confirmed");
    return sig;
  }, [wallet, mintsValid, pdas, tokenA, tokenB, swapIn, swapDir, minOut]);

  const [lpAmount, setLpAmount] = useState("0");

  const onRemove = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction) throw new Error("Connect a wallet");
    if (!mintsValid || !pdas) throw new Error("Enter valid token mint addresses");
    const program = await getProgram(wallet);

    const { ixs, atAs } = await ensureAtas(
      program.provider.connection,
      wallet.publicKey,
      [pdas.lpTokenMint, toPubkey(tokenA), toPubkey(tokenB)]
    );
    const [userLpToken, userTokenA, userTokenB] = atAs;

    const removeTx = await program.methods
      .removeLiquidity(new BN(Math.floor(parseFloat(lpAmount) * LAMPORTS_9)), new BN(0), new BN(0))
      .accounts({
        pool: pdas.pool,
        poolAuthority: pdas.poolAuthority,
        tokenAVault: pdas.tokenAVault,
        tokenBVault: pdas.tokenBVault,
        lpTokenMint: pdas.lpTokenMint,
        userTokenA,
        userTokenB,
        userLpToken,
        user: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();

    const tx = new Transaction();
    for (const ix of ixs) tx.add(ix);
    tx.add(...removeTx.instructions);

    tx.feePayer = wallet.publicKey;
    const latest = await program.provider.connection.getLatestBlockhash();
    tx.recentBlockhash = latest.blockhash;

    const signed = await wallet.signTransaction!(tx);
    const sig = await program.provider.connection.sendRawTransaction(signed.serialize());
    await program.provider.connection.confirmTransaction(sig, "confirmed");
    return sig;
  }, [wallet, mintsValid, pdas, tokenA, tokenB, lpAmount]);

  // Auto-load balances when wallet connects or tokens change
  useEffect(() => {
    if (wallet.connected) {
      loadBalances();
    } else {
      setBalances(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.connected, mintsValid, tokenA, tokenB]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>NJA-Swap Frontend</h1>
          <p style={{ margin: "4px 0", fontSize: 12, color: "#666" }}>RPC: {process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8899"}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <WalletMultiButton />
          {balances && (
            <div style={{ marginTop: 8, padding: 8, background: "#f0f0f0", borderRadius: 4, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <b>💰 Balances:</b>
                <button
                  onClick={loadBalances}
                  style={{
                    marginLeft: 8,
                    padding: "2px 6px",
                    fontSize: 11,
                    cursor: "pointer",
                    border: "1px solid #ccc",
                    borderRadius: 3,
                    background: "white"
                  }}
                >
                  🔄
                </button>
              </div>
              <div>SOL: <b>{balances.sol.toFixed(4)}</b></div>
              {mintsValid && (
                <>
                  <div>Token A: <b>{balances.a.toFixed(2)}</b></div>
                  <div>Token B: <b>{balances.b.toFixed(2)}</b></div>
                  <div>LP: <b>{balances.lp.toFixed(2)}</b></div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <hr style={{ margin: "20px 0" }} />
      <h2>Pool Configuration</h2>
      <label>Token A Mint</label>
      <input value={tokenA} onChange={(e) => setTokenA(e.target.value)} placeholder="Token A mint address" style={{ width: "100%", marginBottom: 8 }} />
      <label>Token B Mint</label>
      <input value={tokenB} onChange={(e) => setTokenB(e.target.value)} placeholder="Token B mint address" style={{ width: "100%", marginBottom: 8 }} />

      {pdas && (
        <div style={{ fontSize: 12, background: "#f6f6f6", padding: 10, borderRadius: 6, marginTop: 10 }}>
          <div><b>Pool</b>: {pdas.pool.toBase58()}</div>
          <div><b>Authority</b>: {pdas.poolAuthority.toBase58()}</div>
          <div><b>Vault A</b>: {pdas.tokenAVault.toBase58()}</div>
          <div><b>Vault B</b>: {pdas.tokenBVault.toBase58()}</div>
          <div><b>LP Mint</b>: {pdas.lpTokenMint.toBase58()}</div>
          {poolData && poolData.reserveA && poolData.reserveB && poolData.lpSupply && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #ddd" }}>
              <div><b>Reserve A</b>: {(Number(poolData.reserveA.toString()) / LAMPORTS_9).toFixed(4)}</div>
              <div><b>Reserve B</b>: {(Number(poolData.reserveB.toString()) / LAMPORTS_9).toFixed(4)}</div>
              <div><b>LP Supply</b>: {(Number(poolData.lpSupply.toString()) / LAMPORTS_9).toFixed(4)}</div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button disabled={!mintsValid || !wallet.connected} onClick={() => run(onInit)}>
          Initialize Pool
        </button>
        <button disabled={!mintsValid || !wallet.connected} onClick={loadPool}>
          Load Pool Info
        </button>
      </div>

      <hr style={{ margin: "20px 0" }} />
      <h2>Add Liquidity</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <div>
          <label>Amount A</label>
          <input value={amountA} onChange={(e) => setAmountA(e.target.value)} />
        </div>
        <div>
          <label>Amount B</label>
          <input value={amountB} onChange={(e) => setAmountB(e.target.value)} />
        </div>
        <button disabled={!mintsValid || !wallet.connected} onClick={() => run(onAddLiquidity)}>Add</button>
      </div>

      <hr style={{ margin: "20px 0" }} />
      <h2>Swap</h2>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <select value={swapDir} onChange={(e) => setSwapDir(e.target.value as any)}>
          <option value="AtoB">A → B</option>
          <option value="BtoA">B → A</option>
        </select>
        <label>Amount In</label>
        <input value={swapIn} onChange={(e) => setSwapIn(e.target.value)} />
        <label>Min Out</label>
        <input value={minOut} onChange={(e) => setMinOut(e.target.value)} />
        <button disabled={!mintsValid || !wallet.connected} onClick={() => run(onSwap)}>Swap</button>
      </div>

      <hr style={{ margin: "20px 0" }} />
      <h2>Remove Liquidity</h2>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label>LP Amount</label>
        <input value={lpAmount} onChange={(e) => setLpAmount(e.target.value)} />
        <button disabled={!mintsValid || !wallet.connected} onClick={() => run(onRemove)}>Remove</button>
      </div>

      <div style={{ marginTop: 16, minHeight: 24 }}>{status}</div>

      <p style={{ marginTop: 24, fontSize: 12 }}>
        Tip: On localnet, you need existing token mints and to fund your wallet with test SOL. Use your existing test flow or a small minting script to create token A/B and mint balances to your wallet accounts.
      </p>
    </div>
  );
}
