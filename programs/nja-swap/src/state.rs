use anchor_lang::prelude::*;

/// Liquidity Pool Account
///
/// This struct represents a constant product AMM pool (x * y = k).
/// The pool maintains reserves of two different SPL tokens and allows users to:
/// - Add liquidity (receive LP tokens)
/// - Remove liquidity (burn LP tokens)
/// - Swap tokens using the constant product formula
///
/// # Security Features
/// - Minimum liquidity requirement prevents price manipulation
/// - Slippage protection via min/max parameters
/// - Overflow-checked math operations
/// - PDA-controlled token vaults
#[account]
pub struct Pool {
    /// PDA Account that controls the pool vaults and LP mint
    /// Derived from [b"pool_authority", token_a_mint, token_b_mint]
    pub authority: Pubkey,

    /// Mint address of Token A (e.g., SOL, USDC)
    pub token_a_mint: Pubkey,

    /// Mint address of Token B (e.g., BONK, RAY)
    pub token_b_mint: Pubkey,

    /// Token account that stores Token A reserves
    /// Authority: pool authority PDA
    pub token_a_vault: Pubkey,

    /// Token account that stores Token B reserves
    /// Authority: pool authority PDA
    pub token_b_vault: Pubkey,

    /// Mint for LP (Liquidity Provider) tokens
    /// LP tokens represent proportional ownership of pool reserves
    /// Authority: pool authority PDA
    pub lp_token_mint: Pubkey,

    /// Current reserves of Token A in the pool
    /// Updated on every swap/add/remove liquidity operation
    pub reserve_a: u64,

    /// Current reserves of Token B in the pool
    /// Updated on every swap/add/remove liquidity operation
    pub reserve_b: u64,

    /// Trading fee in basis points (e.g., 30 = 0.3%)
    /// Fee is deducted from input amount during swaps
    /// Denominator is 10,000 (defined in utils.rs)
    pub fee_numerator: u64,

    /// Bump seed for the authority PDA
    /// Used for signing CPIs from the pool authority
    pub authority_bump: u8,
}

impl Pool {
    /// Pool Account size in bytes
    /// Total: 233 bytes
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // token_a_mint
        32 + // token_b_mint
        32 + // token_a_vault
        32 + // token_b_vault
        32 + // lp_token_mint
        8 +  // reserve_a
        8 +  // reserve_b
        8 +  // fee_numerator
        1;   // authority_bump
}
