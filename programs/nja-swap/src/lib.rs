use anchor_lang::prelude::*;

declare_id!("5jNzyaz9Lt5mRKKLeqNUgRspjaJEZPQoYaG5DW7UsvQB");

#[program]
pub mod nja_swap {
    use super::*;

    pub fn initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;

        require!(
            ctx.accounts.token_a_mint.key() != ctx.accounts.token_b_mint.key(),
            DexError::InvalidTokenMints
        );

        pool.authority = ctx.accounts.pool_authority.key();
        pool.token_a_mint = ctx.accounts.token_a_mint.key();
        pool.token_b_mint = ctx.accounts.token_b_mint.key();
        pool.token_a_vault = ctx.accounts.token_a_vault.key();
        pool.token_b_vault = ctx.accounts.token_b_vault.key();
        pool.lp_token_mint = ctx.accounts.lp_token_mint.key();
        pool.reserve_a = 0;
        pool.reserve_b = 0;
        pool.fee_numerator = 30; // Set a 0.3% fee
        pool.authority_bump = *ctx
            .bumps
            .get("pool_authority")
            .ok_or(DexError::MissingBump)?;

        msg!("Pool initialized successfully");

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
