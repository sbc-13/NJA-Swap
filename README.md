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

**Setup:**
```bash
cd app
yarn install
cp ../target/idl/nja_swap.json public/idl/nja_swap.json
```

**Start development:**
```bash
# Terminal 1: Run validator with program
anchor localnet

# Terminal 2: Create test tokens
ANCHOR_WALLET=~/.config/solana/id.json ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 yarn setup-tokens

# Terminal 3: Start frontend
cd app && yarn dev
```

**Connect and test:**
1. Install Phantom wallet, switch to **Localhost** network
2. Copy the Token A and Token B mint addresses from the script output
3. Open http://localhost:3000
4. Connect wallet
5. Paste token addresses → Initialize Pool
6. Add liquidity (e.g., 100 tokens each)
7. Try swapping!

## Security

- ✅ Checked arithmetic (no overflows)
- ✅ Slippage protection via `min_amount_out`
- ✅ Minimum liquidity lock (1000 LP tokens)
- ✅ PDA-controlled vaults
- ✅ Event logging

## Alternative: Manual Token Creation

```bash
# Using spl-token CLI
spl-token create-token                    # Returns Token A address
spl-token create-token                    # Returns Token B address
spl-token create-account <TOKEN_A>
spl-token create-account <TOKEN_B>
spl-token mint <TOKEN_A> 10000
spl-token mint <TOKEN_B> 10000
```

## Troubleshooting

**Authority mismatch error?**
→ `pkill solana-test-validator && solana-test-validator --reset`

**Insufficient liquidity error?**
→ First deposit must satisfy `sqrt(amount_a × amount_b) > 1000`

**Transaction failed?**
→ Check network: `solana config get`
→ Airdrop: `solana airdrop 2`

**Script can't find wallet?**
→ Set `ANCHOR_WALLET` env var: `export ANCHOR_WALLET=~/.config/solana/id.json`

**ts-node not found?**
→ Run `yarn install` first to install dependencies

---

**Team NJA** · Solana Bootcamp 2025
