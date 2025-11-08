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

**Requirements:** Rust, Solana CLI v1.18+, Anchor v0.30+, Node.js v18+

```bash
# Install and test
git clone <your-repo>
cd nja-swap
yarn install
anchor test
```

## Deployment

**Local Testing** (recommended)
```bash
anchor test  # Builds, runs validator, deploys, tests
```

**Manual Localhost**
```bash
solana-test-validator --reset     # Terminal 1
anchor build && anchor deploy     # Terminal 2
```

**Devnet**
```bash
solana config set --url https://api.devnet.solana.com
solana airdrop 2
anchor build && anchor deploy
```

## Run Frontend

```bash
cd app
yarn install
cp ../target/idl/nja_swap.json public/idl/nja_swap.json
yarn dev
```

**Connect wallet:**
1. Install Phantom
2. Switch to Localhost network
3. Airdrop SOL: `solana airdrop 5 <ADDRESS>`
4. Open http://localhost:3000

## Security

- ✅ Checked arithmetic (no overflows)
- ✅ Slippage protection via `min_amount_out`
- ✅ Minimum liquidity lock (1000 LP tokens)
- ✅ PDA-controlled vaults
- ✅ Event logging

## Troubleshooting

**Authority mismatch error?**
→ `pkill solana-test-validator && solana-test-validator --reset`

**Insufficient liquidity error?**
→ First deposit must satisfy `sqrt(amount_a × amount_b) > 1000`

**Transaction failed?**
→ Check network: `solana config get`
→ Airdrop: `solana airdrop 2`

---

**Team NJA** · Solana Bootcamp 2025
