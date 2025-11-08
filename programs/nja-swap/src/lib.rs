use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, MintTo, Token, TokenAccount, Transfer};

pub mod errors;
pub mod state;
pub mod utils;

use errors::*;
use state::*;
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
        pool.authority_bump = ctx.bumps.pool_authority;
        msg!("Pool initialized successfully");
        Ok(())
    }

    pub fn add_liquidity(
        ctx: Context<Add>,
        amount_a: u64,
        amount_b: u64,
        min_lp_tokens: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        // ensure amounts are non zero
        require!(amount_a > 0 && amount_b > 0, DexError::InvalidAmount);

        let lp_supply = ctx.accounts.lp_token_mint.supply;
        let lp_tokens = calculate_lp_tokens(
            amount_a,
            amount_b,
            pool.reserve_a,
            pool.reserve_b,
            lp_supply,
        )?;
        // ensure user gets minimum lp token or fail
        require!(lp_tokens >= min_lp_tokens, DexError::SlippageExceeded);

        // transfer tokens to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_a.to_account_info(),
                    to: ctx.accounts.token_a_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount_a,
        )?;
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_b.to_account_info(),
                    to: ctx.accounts.token_b_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount_b,
        )?;

        // mint lp tokens to the user account
        let pool_key = pool.key();
        let authority_seeds = &[b"pool_authority", pool_key.as_ref(), &[pool.authority_bump]];
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.lp_token_mint.to_account_info(),
                    to: ctx.accounts.user_lp_token.to_account_info(),
                    authority: ctx.accounts.pool_authority.to_account_info(),
                },
                &[authority_seeds],
            ),
            lp_tokens,
        )?;

        // update reserves
        pool.reserve_a = pool
            .reserve_a
            .checked_add(amount_a)
            .ok_or(DexError::MathOverflow)?;
        pool.reserve_b = pool
            .reserve_b
            .checked_add(amount_b)
            .ok_or(DexError::MathOverflow)?;

        // success!
        msg!(
            "Liquidity added: {} Token A, {} Token B, {} LP tokens",
            amount_a,
            amount_b,
            lp_tokens
        );
        Ok(())
    }

    /// Swap `amount_in` -> `min_amount_out`.
    ///
    /// May mint more than `min_amount_out`, but never less.
    /// Param `is_a_to_b` should be set to true if `amount_in` is `pool.reserve_a`, else false.
    pub fn swap(
        ctx: Context<Swap>,
        amount_in: u64,
        min_amount_out: u64,
        is_a_to_b: bool,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        // input amount cannot be zero.
        require!(amount_in > 0, DexError::InvalidAmount);

        // calculate the swap amount
        let (reserve_in, reserve_out) = if is_a_to_b {
            (pool.reserve_a, pool.reserve_b)
        } else {
            (pool.reserve_b, pool.reserve_a)
        };
        let amount_out =
            calculate_swap_amount(amount_in, reserve_in, reserve_out, pool.fee_numerator)?;

        // ensure user can get `min_amount_out` or fail.
        require!(amount_out >= min_amount_out, DexError::SlippageExceeded);
        // ensure amount received is non-zero.
        require!(amount_out > 0, DexError::InvalidAmount);

        // transfer `amount_in` to vault, `min_amount_out` to user.
        let pool_key = pool.key();
        let authority_seeds = &[b"pool_authority", pool_key.as_ref(), &[pool.authority_bump]];
        if is_a_to_b {
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.user_token_a.to_account_info(),
                        to: ctx.accounts.token_a_vault.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                amount_in,
            )?;
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.token_b_vault.to_account_info(),
                        to: ctx.accounts.user_token_b.to_account_info(),
                        authority: ctx.accounts.pool_authority.to_account_info(),
                    },
                    &[authority_seeds],
                ),
                amount_out,
            )?;
            pool.reserve_a = pool
                .reserve_a
                .checked_add(amount_in)
                .ok_or(DexError::MathOverflow)?;
            pool.reserve_b = pool
                .reserve_b
                .checked_sub(amount_out)
                .ok_or(DexError::MathOverflow)?;
        } else {
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.user_token_b.to_account_info(),
                        to: ctx.accounts.token_b_vault.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                amount_in,
            )?;
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.token_a_vault.to_account_info(),
                        to: ctx.accounts.user_token_a.to_account_info(),
                        authority: ctx.accounts.pool_authority.to_account_info(),
                    },
                    &[authority_seeds],
                ),
                amount_out,
            )?;
            pool.reserve_b = pool
                .reserve_b
                .checked_add(amount_in)
                .ok_or(DexError::MathOverflow)?;
            pool.reserve_a = pool
                .reserve_a
                .checked_sub(amount_out)
                .ok_or(DexError::MathOverflow)?;
        }

        // success!
        msg!("Swap executed: {} in -> {} out", amount_in, amount_out);
        Ok(())
    }

    pub fn remove_liquidity(
        ctx: Context<Remove>,
        lp_token_amount: u64,
        min_amount_a: u64,
        min_amount_b: u64,
    ) -> Result<()> {
        todo!()
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    /// Creating an account for the liquidity pool
    #[account(init, payer = payer, space = Pool::LEN, seeds = [b"pool", token_a_mint.key().as_ref(), token_b_mint.key().as_ref()], bump)]
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
pub struct Add<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    /// CHECK: PDA authority controlled by program
    #[account(seeds = [b"pool_authority", pool.key().as_ref()], bump = pool.authority_bump)]
    pub pool_authority: UncheckedAccount<'info>,
    #[account(mut, address = pool.token_a_vault)]
    pub token_a_vault: Account<'info, TokenAccount>,
    #[account(mut, address = pool.token_b_vault)]
    pub token_b_vault: Account<'info, TokenAccount>,
    #[account(mut, address = pool.lp_token_mint)]
    pub lp_token_mint: Account<'info, Mint>,
    #[account(mut, constraint = user_token_a.mint == pool.token_a_mint)]
    pub user_token_a: Account<'info, TokenAccount>,
    #[account(mut, constraint = user_token_b.mint == pool.token_b_mint)]
    pub user_token_b: Account<'info, TokenAccount>,
    #[account(mut, constraint = user_lp_token.mint == pool.lp_token_mint)]
    pub user_lp_token: Account<'info, TokenAccount>,
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    /// CHECK: PDA authority controlled by program
    #[account(seeds = [b"pool_authority", pool.key().as_ref()], bump = pool.authority_bump)]
    pub pool_authority: UncheckedAccount<'info>,
    #[account(mut, address = pool.token_a_vault)]
    pub token_a_vault: Account<'info, TokenAccount>,
    #[account(mut, address = pool.token_b_vault)]
    pub token_b_vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = user_token_a.mint == pool.token_a_mint)]
    pub user_token_a: Account<'info, TokenAccount>,
    #[account(mut, constraint = user_token_b.mint == pool.token_b_mint)]
    pub user_token_b: Account<'info, TokenAccount>,
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Remove {}
