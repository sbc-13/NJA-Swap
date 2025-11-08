
use anchor_lang::prelude::*;

/// Liquidity Pool Account
#[account]
pub struct Pool {
    /// PDA Account that controls the pool
    pub authority: Pubkey,

    /// Mint address of Token A (eg: SOL)
    pub token_a_mint: Pubkey,

    /// Mint address of Token B (eg: USDC)
    pub token_b_mint: Pubkey,

    /// Vault that stores Token A
    pub token_a_vault: Pubkey,

    /// Vault that stores Token B
    pub token_b_vault: Pubkey,

    /// LP Token Mint
    pub lp_token_mint: Pubkey,

    /// Reserves of Token A in the pool
    pub reserve_a: u64,

    /// Reserves of Token B in the pool
    pub reserve_b: u64,

    /// Fee in basis points (30 = 0.3%)
    pub fee_numerator: u64,

    /// Bump seed for the authority PDA
    pub authority_bump: u8,
}

impl Pool {
    /// Pool Account size in bytes
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
