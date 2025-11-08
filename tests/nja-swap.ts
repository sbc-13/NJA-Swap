import * as anchor from "@coral-xyz/anchor";
import {Program} from "@coral-xyz/anchor";
import {NjaSwap} from "../target/types/nja_swap";
import {PublicKey, Keypair, SystemProgram} from "@solana/web3.js";
import {
    TOKEN_PROGRAM_ID,
    createMint,
    createAccount,
    mintTo,
    getAccount,
} from "@solana/spl-token";
import {assert} from "chai";

describe("nja-swap", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.NjaSwap as Program<NjaSwap>;
    const payer = provider.wallet as anchor.Wallet;
    const user = Keypair.generate();
    let tokenAMint: PublicKey;
    let tokenBMint: PublicKey;
    let userTokenA: PublicKey;
    let userTokenB: PublicKey;
    let userLpToken: PublicKey;
    let pool: PublicKey;
    let poolAuthority: PublicKey;
    let tokenAVault: PublicKey;
    let tokenBVault: PublicKey;
    let lpTokenMint: PublicKey;

    before(async () => {
        console.log("🚀 Setting up test environment...\n");
        const airdropSig = await provider.connection.requestAirdrop(user.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
        await provider.connection.confirmTransaction(airdropSig);
        tokenAMint = await createMint(provider.connection, payer.payer, payer.publicKey, null, 9);
        tokenBMint = await createMint(provider.connection, payer.payer, payer.publicKey, null, 9);
        console.log("✅ Token A Mint:", tokenAMint.toString());
        console.log("✅ Token B Mint:", tokenBMint.toString());
        userTokenA = await createAccount(provider.connection, payer.payer, tokenAMint, user.publicKey);
        userTokenB = await createAccount(provider.connection, payer.payer, tokenBMint, user.publicKey);
        await mintTo(provider.connection, payer.payer, tokenAMint, userTokenA, payer.publicKey, 100_000 * 1e9);
        await mintTo(provider.connection, payer.payer, tokenBMint, userTokenB, payer.publicKey, 100_000 * 1e9);
        console.log("✅ User received 100,000 Token A");
        console.log("✅ User received 100,000 Token B\n");
        [pool] = PublicKey.findProgramAddressSync([Buffer.from("pool"), tokenAMint.toBuffer(), tokenBMint.toBuffer()], program.programId);
        [poolAuthority] = PublicKey.findProgramAddressSync([Buffer.from("pool_authority"), tokenAMint.toBuffer(), tokenBMint.toBuffer()], program.programId);
        [tokenAVault] = PublicKey.findProgramAddressSync([Buffer.from("token_a_vault"), tokenAMint.toBuffer(), tokenBMint.toBuffer()], program.programId);
        [tokenBVault] = PublicKey.findProgramAddressSync([Buffer.from("token_b_vault"), tokenAMint.toBuffer(), tokenBMint.toBuffer()], program.programId);
        [lpTokenMint] = PublicKey.findProgramAddressSync([Buffer.from("lp_token_mint"), tokenAMint.toBuffer(), tokenBMint.toBuffer()], program.programId);
        console.log("📍 Pool:", pool.toString());
        console.log("📍 Pool Authority:", poolAuthority.toString());
        console.log("📍 LP Token Mint:", lpTokenMint.toString() + "\n");
    });

    it("Initializes the pool", async () => {
        console.log("🔧 TEST 1: Initialize Pool\n");
        const tx = await program.methods.initializePool().accounts({
            pool, poolAuthority, tokenAMint, tokenBMint, tokenAVault, tokenBVault, lpTokenMint,
            payer: payer.publicKey, systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID, rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        }).rpc();
        console.log("✅ Pool initialized. TX:", tx);
        const poolAccount = await program.account.pool.fetch(pool);
        assert.equal(poolAccount.tokenAMint.toString(), tokenAMint.toString());
        assert.equal(poolAccount.tokenBMint.toString(), tokenBMint.toString());
        assert.equal(poolAccount.reserveA.toNumber(), 0);
        assert.equal(poolAccount.reserveB.toNumber(), 0);
        console.log("✅ Pool verified successfully\n");
    });

    it("Adds liquidity", async () => {
        console.log("🔧 TEST 2: Add Liquidity\n");
        userLpToken = await createAccount(provider.connection, payer.payer, lpTokenMint, user.publicKey);
        const amountA = new anchor.BN(10_000 * 1e9);
        const amountB = new anchor.BN(10_000 * 1e9);
        const tx = await program.methods.addLiquidity(amountA, amountB, new anchor.BN(0)).accounts({
            pool, poolAuthority, tokenAVault, tokenBVault, lpTokenMint,
            userTokenA, userTokenB, userLpToken, user: user.publicKey, tokenProgram: TOKEN_PROGRAM_ID,
        }).signers([user]).rpc();
        console.log("✅ Liquidity added. TX:", tx);
        const poolAccount = await program.account.pool.fetch(pool);
        console.log("💧 Reserve A:", poolAccount.reserveA.toNumber() / 1e9);
        console.log("💧 Reserve B:", poolAccount.reserveB.toNumber() / 1e9);
        console.log("✅ Liquidity added successfully\n");
    });

    it("Swap A→B", async () => {
        console.log("🔧 TEST 3: Swap Token A → Token B\n");
        const amountIn = new anchor.BN(1_000 * 1e9);
        const minAmountOut = new anchor.BN(900 * 1e9);
        const tx = await program.methods.swap(amountIn, minAmountOut, true).accounts({
            pool, poolAuthority, tokenAVault, tokenBVault,
            userTokenA, userTokenB, user: user.publicKey, tokenProgram: TOKEN_PROGRAM_ID,
        }).signers([user]).rpc();
        console.log("✅ Swap executed. TX:", tx, "\n");
    });

    it("Swap B→A", async () => {
        console.log("🔧 TEST 4: Swap Token B → Token A\n");
        const amountIn = new anchor.BN(500 * 1e9);
        const minAmountOut = new anchor.BN(400 * 1e9);
        const tx = await program.methods.swap(amountIn, minAmountOut, false).accounts({
            pool, poolAuthority, tokenAVault, tokenBVault,
            userTokenA, userTokenB, user: user.publicKey, tokenProgram: TOKEN_PROGRAM_ID,
        }).signers([user]).rpc();
        console.log("✅ Swap executed. TX:", tx, "\n");
    });

    it("Removes liquidity", async () => {
        console.log("🔧 TEST 5: Remove Liquidity\n");
        const lpTokenAccount = await getAccount(provider.connection, userLpToken);
        const lpTokenAmount = new anchor.BN(Number(lpTokenAccount.amount) / 2);
        const tx = await program.methods.removeLiquidity(lpTokenAmount, new anchor.BN(0), new anchor.BN(0)).accounts({
            pool, poolAuthority, tokenAVault, tokenBVault, lpTokenMint,
            userTokenA, userTokenB, userLpToken, user: user.publicKey, tokenProgram: TOKEN_PROGRAM_ID,
        }).signers([user]).rpc();
        console.log("✅ Liquidity removed. TX:", tx, "\n");
    });

    it("Fails to initialize pool with same token", async () => {
        console.log("🔧 TEST 6: Reject same token pair\n");
        const [badPool] = PublicKey.findProgramAddressSync(
            [Buffer.from("pool"), tokenAMint.toBuffer(), tokenAMint.toBuffer()],
            program.programId
        );
        const [badPoolAuthority] = PublicKey.findProgramAddressSync(
            [Buffer.from("pool_authority"), tokenAMint.toBuffer(), tokenAMint.toBuffer()],
            program.programId
        );
        const [badTokenAVault] = PublicKey.findProgramAddressSync(
            [Buffer.from("token_a_vault"), tokenAMint.toBuffer(), tokenAMint.toBuffer()],
            program.programId
        );
        const [badTokenBVault] = PublicKey.findProgramAddressSync(
            [Buffer.from("token_b_vault"), tokenAMint.toBuffer(), tokenAMint.toBuffer()],
            program.programId
        );
        const [badLpTokenMint] = PublicKey.findProgramAddressSync(
            [Buffer.from("lp_token_mint"), tokenAMint.toBuffer(), tokenAMint.toBuffer()],
            program.programId
        );

        try {
            await program.methods.initializePool().accounts({
                pool: badPool,
                poolAuthority: badPoolAuthority,
                tokenAMint: tokenAMint,
                tokenBMint: tokenAMint,
                tokenAVault: badTokenAVault,
                tokenBVault: badTokenBVault,
                lpTokenMint: badLpTokenMint,
                payer: payer.publicKey,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            }).rpc();
            assert.fail("Should have failed with InvalidTokenPair");
        } catch (err) {
            assert.include(err.toString(), "InvalidTokenPair");
            console.log("✅ Correctly rejected same token pair\n");
        }
    });

    it("Fails to add zero liquidity", async () => {
        console.log("🔧 TEST 7: Reject zero amounts\n");
        try {
            await program.methods.addLiquidity(new anchor.BN(0), new anchor.BN(1000), new anchor.BN(0))
                .accounts({
                    pool, poolAuthority, tokenAVault, tokenBVault, lpTokenMint,
                    userTokenA, userTokenB, userLpToken, user: user.publicKey, tokenProgram: TOKEN_PROGRAM_ID,
                }).signers([user]).rpc();
            assert.fail("Should have failed with InvalidAmount");
        } catch (err) {
            assert.include(err.toString(), "InvalidAmount");
            console.log("✅ Correctly rejected zero amount\n");
        }
    });

    it("Fails swap with slippage exceeded", async () => {
        console.log("🔧 TEST 8: Reject swap with excessive slippage\n");
        const amountIn = new anchor.BN(100 * 1e9);
        const minAmountOut = new anchor.BN(1_000_000 * 1e9); // Unrealistically high
        try {
            await program.methods.swap(amountIn, minAmountOut, true).accounts({
                pool, poolAuthority, tokenAVault, tokenBVault,
                userTokenA, userTokenB, user: user.publicKey, tokenProgram: TOKEN_PROGRAM_ID,
            }).signers([user]).rpc();
            assert.fail("Should have failed with SlippageExceeded");
        } catch (err) {
            assert.include(err.toString(), "SlippageExceeded");
            console.log("✅ Correctly rejected excessive slippage\n");
        }
    });

    it("Fails to swap zero amount", async () => {
        console.log("🔧 TEST 9: Reject zero swap amount\n");
        try {
            await program.methods.swap(new anchor.BN(0), new anchor.BN(0), true).accounts({
                pool, poolAuthority, tokenAVault, tokenBVault,
                userTokenA, userTokenB, user: user.publicKey, tokenProgram: TOKEN_PROGRAM_ID,
            }).signers([user]).rpc();
            assert.fail("Should have failed with InvalidAmount");
        } catch (err) {
            assert.include(err.toString(), "InvalidAmount");
            console.log("✅ Correctly rejected zero swap\n");
        }
    });

    it("Fails to remove zero liquidity", async () => {
        console.log("🔧 TEST 10: Reject zero liquidity removal\n");
        try {
            await program.methods.removeLiquidity(new anchor.BN(0), new anchor.BN(0), new anchor.BN(0))
                .accounts({
                    pool, poolAuthority, tokenAVault, tokenBVault, lpTokenMint,
                    userTokenA, userTokenB, userLpToken, user: user.publicKey, tokenProgram: TOKEN_PROGRAM_ID,
                }).signers([user]).rpc();
            assert.fail("Should have failed with InvalidAmount");
        } catch (err) {
            assert.include(err.toString(), "InvalidAmount");
            console.log("✅ Correctly rejected zero liquidity removal\n");
        }
    });

    it("Fails to remove liquidity with slippage exceeded", async () => {
        console.log("🔧 TEST 11: Reject liquidity removal with slippage\n");
        const lpTokenAccount = await getAccount(provider.connection, userLpToken);
        const lpTokenAmount = new anchor.BN(Number(lpTokenAccount.amount));
        const unrealisticMinA = new anchor.BN(1_000_000 * 1e9);
        const unrealisticMinB = new anchor.BN(1_000_000 * 1e9);

        try {
            await program.methods.removeLiquidity(lpTokenAmount, unrealisticMinA, unrealisticMinB)
                .accounts({
                    pool, poolAuthority, tokenAVault, tokenBVault, lpTokenMint,
                    userTokenA, userTokenB, userLpToken, user: user.publicKey, tokenProgram: TOKEN_PROGRAM_ID,
                }).signers([user]).rpc();
            assert.fail("Should have failed with SlippageExceeded");
        } catch (err) {
            assert.include(err.toString(), "SlippageExceeded");
            console.log("✅ Correctly rejected slippage on removal\n");
        }
    });

    it("Multiple sequential swaps A→B→A maintain invariant", async () => {
        console.log("🔧 TEST 12: Sequential swaps\n");

        const poolBefore = await program.account.pool.fetch(pool);
        const kBefore = poolBefore.reserveA.toNumber() * poolBefore.reserveB.toNumber();
        console.log("📊 K before swaps:", kBefore);

        // Swap A→B
        const amountIn1 = new anchor.BN(100 * 1e9);
        await program.methods.swap(amountIn1, new anchor.BN(0), true).accounts({
            pool, poolAuthority, tokenAVault, tokenBVault,
            userTokenA, userTokenB, user: user.publicKey, tokenProgram: TOKEN_PROGRAM_ID,
        }).signers([user]).rpc();

        // Swap B→A
        const amountIn2 = new anchor.BN(100 * 1e9);
        await program.methods.swap(amountIn2, new anchor.BN(0), false).accounts({
            pool, poolAuthority, tokenAVault, tokenBVault,
            userTokenA, userTokenB, user: user.publicKey, tokenProgram: TOKEN_PROGRAM_ID,
        }).signers([user]).rpc();

        const poolAfter = await program.account.pool.fetch(pool);
        const kAfter = poolAfter.reserveA.toNumber() * poolAfter.reserveB.toNumber();
        console.log("📊 K after swaps:", kAfter);

        // K should increase due to fees (0.3% per swap = 0.6% total)
        assert(kAfter >= kBefore, "K invariant should increase with fees");
        console.log("✅ Sequential swaps maintain invariant\n");
    });

    it("Add liquidity with proportional amounts", async () => {
        console.log("🔧 TEST 13: Add proportional liquidity\n");

        const poolBefore = await program.account.pool.fetch(pool);
        const ratioBefore = poolBefore.reserveA.toNumber() / poolBefore.reserveB.toNumber();
        console.log("📊 Ratio before:", ratioBefore);
        console.log("💧 Reserve A before:", poolBefore.reserveA.toNumber() / 1e9);
        console.log("💧 Reserve B before:", poolBefore.reserveB.toNumber() / 1e9);

        // Add liquidity proportional to current pool ratio
        const addAmount = 1_000 * 1e9;
        const amountA = new anchor.BN(addAmount);
        const amountB = new anchor.BN(Math.floor(addAmount / ratioBefore));

        console.log("📥 Adding Token A:", addAmount / 1e9);
        console.log("📥 Adding Token B:", amountB.toNumber() / 1e9);

        await program.methods.addLiquidity(amountA, amountB, new anchor.BN(0)).accounts({
            pool, poolAuthority, tokenAVault, tokenBVault, lpTokenMint,
            userTokenA, userTokenB, userLpToken, user: user.publicKey, tokenProgram: TOKEN_PROGRAM_ID,
        }).signers([user]).rpc();

        const poolAfter = await program.account.pool.fetch(pool);
        const ratioAfter = poolAfter.reserveA.toNumber() / poolAfter.reserveB.toNumber();
        console.log("📊 Ratio after:", ratioAfter);
        console.log("💧 Reserve A after:", poolAfter.reserveA.toNumber() / 1e9);
        console.log("💧 Reserve B after:", poolAfter.reserveB.toNumber() / 1e9);

        // When adding proportional liquidity, ratio should remain very stable
        const ratioChange = Math.abs(ratioAfter - ratioBefore) / ratioBefore;
        console.log("📊 Ratio change:", (ratioChange * 100).toFixed(4) + "%");
        assert(ratioChange < 0.01, `Pool ratio should remain stable (changed by ${(ratioChange * 100).toFixed(4)}%)`);
        console.log("✅ Proportional liquidity maintains ratio\n");
    });

    
});
