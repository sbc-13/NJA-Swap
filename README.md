# 🌊 NJA Swap — Mini DEX on Solana

A lightweight **Automated Market Maker (AMM)** built on **Solana** using **Rust + Anchor**, enabling users to:
- Swap tokens (e.g., SOL ↔ USDC)
- Provide liquidity and earn fees
- Withdraw liquidity anytime

> Built by **Team NJA** (Nouhalya · Joseph · Ankan)  
> Bootcamp: Solana Project Week (2025)

---

## 🚀 Overview

**NJA Swap** is a simplified decentralized exchange inspired by Uniswap and Raydium.  
It showcases how **AMMs**, **liquidity pools**, and **LP tokens** work on Solana while demonstrating PDAs, CPIs, and SPL Token Program integration.

### ✨ Key Features
- **Token Swaps** between two SPL tokens
- **Liquidity Provision** with LP token rewards
- **Constant Product Formula (x * y = k)** pricing
- **0.3% fee** distributed to liquidity providers
- **Fully deployable on Devnet**

---

## 🧠 Technical Architecture

### On-Chain Program (Rust + Anchor)
Implements four primary instructions:
1. **Initialize Pool** — Create a new liquidity pool (e.g., SOL/USDC)
2. **Add Liquidity** — Deposit token pair to receive LP tokens
3. **Swap Tokens** — Execute trades using AMM constant product formula
4. **Remove Liquidity** — Burn LP tokens to withdraw assets and fees

Each pool tracks:
- Token A and B reserves
- Total LP token supply
- Fee rate (0.3%)
- PDA authority for vault accounts

---

### Frontend (React + TypeScript)
A minimal web app enabling users to:
- Connect via **Phantom/Backpack Wallet**
- View pool info and balances
- Add or remove liquidity
- Swap tokens with live price updates

**Libraries:**
- `@solana/web3.js`
- `@solana/wallet-adapter-react`
- `@coral-xyz/anchor`

---

## 🧩 AMM Logic

Constant product formula ensures:
`x * y = k`

Example:
If pool has 100 SOL and 10,000 USDC → price = 1 SOL = 100 USDC.  
A 10 SOL swap changes the reserves and adjusts price dynamically (slippage).

No orderbook needed — math maintains the market balance automatically.

---

## 🧰 Development Setup

### Requirements
- Rust (latest stable)
- Solana CLI v1.18+
- Anchor CLI v0.30+
- Node.js v18+
- Phantom Wallet (for Devnet testing)

### Commands
```bash
# Build & deploy program
anchor build
anchor deploy

# Run local tests
anchor test

# Start frontend
cd frontend
npm install
npm run dev
```
---

## 🧪 Testing & Deployment
- Unit tests for each instruction
- Integration tests (pool creation → swap → withdrawal)
- Deployed on Solana Devnet
- End-to-end testing via web UI

---

## 🔒 Security Considerations
- Checked arithmetic (checked_mul, checked_div)
- Slippage protection (min_amount_out param)
- Proper signer and account ownership checks
- Rent-exempt accounts enforced

---

## 🧭 Known Limitations (v1)

To stay within the 8-day timeline:
- Two-token pools only (no multi-hop routing)
- No price oracles
- No governance or admin controls
- Basic UI (no charts or analytics)

---

## 📚 References
- Anchor Book￼
- Solana Cookbook￼
- SPL Token Program￼
- Raydium￼
- Orca Whirlpool￼

---

## 👥 Team NJA
- Nouhalya
- Joseph
- Ankan

---

## Demo
TODO

