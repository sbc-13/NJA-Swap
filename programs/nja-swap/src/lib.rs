use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, MintTo, Transfer, Burn};

pub mod state;
pub mod errors;
pub mod utils;

use state::*;
use errors::*;
use utils::*;



declare_id!("5jNzyaz9Lt5mRKKLeqNUgRspjaJEZPQoYaG5DW7UsvQB");

#[program]
pub mod nja_swap {
    use super::*;

    pub fn initialize_pool(ctx: Context<Initialize>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;

        require!(
            ctx.accounts.token_a_mint.key() != ctx.accounts.token_b_mint.key(),
            DexError::InvalidTokenPair
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

    pub fn add_liquidity(ctx: Context<Add>, amount_a: u64, amount_b: u64, min_lp_tokens: u64) -> Result<()> {
        todo!()
    }

    pub fn swap(ctx: Context<Swap>, amount_in: u64, min_amount_out: u64) -> Result<()> {
        todo!()
    }

    pub fn remove_liquidity(ctx: Context<Remove>, lp_token_amount: u64, min_amount_a: u64, min_amount_b: u64) -> Result<()> {
        todo!()
    }


}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = payer, space = 200)]
    pub pool: Account<'info, Pool>,
    /// CHECK: PDA authority controlled by program
    #[account(seeds = [b"pool_authority", pool.key().as_ref()], bump)]
    pub pool_authority: UncheckedAccount<'info>,
    pub token_a_mint: Account<'info, Mint>,
    pub token_b_mint: Account<'info, Mint>,
    #[account(init, payer = payer, token::mint = token_a_mint, token::authority = pool_authority, seeds = [b"token_a_vault", pool.key().as_ref()], bump)]
    pub token_a_vault: Account<'info, TokenAccount>,
    #[account(init, payer = payer, token::mint = token_b_mint, token::authority = pool_authority, seeds = [b"token_b_vault", pool.key().as_ref()], bump)]
    pub token_b_vault: Account<'info, TokenAccount>,
    #[account(init, payer = payer, mint::decimals = 9, mint::authority = pool_authority, seeds = [b"lp_token_mint", pool.key().as_ref()], bump)]
    pub lp_token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Add {}

#[derive(Accounts)]
pub struct Swap<> {}

#[derive(Accounts)]
pub struct Remove {}

