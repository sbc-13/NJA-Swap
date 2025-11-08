# 🌊 NJA Swap

A lightweight AMM DEX on Solana. Swap tokens, provide liquidity, earn fees.

**Built by Team NJA** (Nouhalya · Joseph · Ankan) · Solana Bootcamp 2025

---

## Features

- Token swaps between any SPL token pair
- Provide liquidity → earn 0.3% fees
- Constant product formula (x × y = k)
- Secure: PDA vaults, slippage protection, overflow checks

## Architecture

**Program (Rust + Anchor)** - 4 instructions:
1. `initialize_pool` - Create new pool
2. `add_liquidity` - Deposit tokens, get LP tokens
3. `swap` - Trade with AMM pricing
4. `remove_liquidity` - Burn LP tokens, withdraw funds

**Frontend (React + TypeScript)**
- Wallet connection (Phantom/Backpack)
- Pool info and balances
- Swap and liquidity UI

---

## Quick Start

**Requirements:** Rust, Solana CLI v1.18+, Anchor v0.32+, Node.js v18+

```bash
git clone <your-repo>
cd nja-swap
yarn install
anchor test
```

## Run Frontend Locally

**Terminal 1 - Start validator:**
```bash
anchor localnet
```

**Terminal 2 - Setup test tokens:**
```bash
# Get your Phantom wallet address (Settings → Copy Address)
yarn setup-tokens <YOUR_PHANTOM_ADDRESS>
# Copy the Token A and Token B addresses printed
```

**Terminal 3 - Start frontend:**
```bash
cd app
yarn install
cp ../target/idl/nja_swap.json public/idl/nja_swap.json
yarn dev
```

**Browser - Use the DEX:**
1. Open Phantom → Switch to **Localhost** network
2. Connect wallet at http://localhost:8899
3. Paste Token A and Token B addresses
4. Click "Initialize Pool"
5. Click "Add" (default 100 tokens each)
6. Click "Swap" to trade!

**Note:** Balances update on load. Click 🔄 to refresh after transactions.

## Deployment Options

**Devnet:**
```bash
solana config set --url https://api.devnet.solana.com
solana airdrop 2
anchor build && anchor deploy
# Update app/src/lib/anchor.ts with new PROGRAM_ID
```

**Manual Localhost:**
```bash
solana-test-validator --reset
anchor build && anchor deploy
```

## Troubleshooting

**"Insufficient liquidity" on first deposit?**
→ Initial liquidity must satisfy `sqrt(amount_a × amount_b) > 1000`
→ Default 100/100 works fine

**"AccountNotInitialized" on swap?**
→ Add liquidity first - pool needs reserves to price swaps

**Frontend not loading balances?**
→ Make sure wallet is on Localhost network
→ Click 🔄 button next to balances

**IDL/Program mismatch errors?**
→ Rebuild: `anchor build`
→ Re-copy IDL: `cp target/idl/nja_swap.json app/public/idl/nja_swap.json`
→ Restart frontend

**Authority mismatch on deploy?**
→ `pkill solana-test-validator && solana-test-validator --reset`

## Security Features

- Checked arithmetic (overflow protection)
- Slippage protection (`min_amount_out`)
- Minimum liquidity lock (prevents inflation attacks)
- PDA-controlled vaults
- Event logging for all operations

---

**Team NJA** · Solana Bootcamp 2025
