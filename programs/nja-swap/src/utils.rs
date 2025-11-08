use anchor_lang::prelude::*;
use crate::errors::DexError;

/// Fee denominator for calculating fees in basis points
const FEE_DEN: u128 = 10_000;

/// Calculates the amount of LP tokens to mint when liquidity is added.
pub fn calculate_lp_tokens(
    amount_a: u64,
    amount_b: u64,
    reserve_a: u64,
    reserve_b: u64,
    lp_supply: u64,
) -> Result<u64> {
    if lp_supply == 0 {
        // First time adding liquidity: sqrt(a * b)
        let product = (amount_a as u128)
            .checked_mul(amount_b as u128)
            .ok_or(DexError::MathOverflow)?;

        // simple approximation of square root
        Ok((product as f64).sqrt() as u64)
    } else {
        // Addition to existing liquidity. Maintain ratio.
        let lp_a = ((amount_a as u128)
            .checked_mul(lp_supply as u128)
            .ok_or(DexError::MathOverflow)?)
            .checked_div(reserve_a as u128)
            .ok_or(DexError::InvalidAmount)?;

        let lp_b = ((amount_b as u128)
            .checked_mul(lp_supply as u128)
            .ok_or(DexError::MathOverflow)?)
            .checked_div(reserve_b as u128)
            .ok_or(DexError::InvalidAmount)?;

        // Take the minimum to prevent exploits.
        Ok(std::cmp::min(lp_a, lp_b) as u64)
    }
}

/// Calculate the output of a swap using constant product formula.
/// Formula: (reserve_out * amount_in * (FEE_DEN - fee_bps)) / (reserve_in * FEE_DEN + amount_in * (FEE_DEN - fee_bps))
/// Where `fee_bps` is in basis points (e.g. 30 = 0.3%) and `FEE_DEN = 10_000`.
pub fn calculate_swap_amount(
    amount_in: u64,
    reserve_in: u64,
    reserve_out: u64,
    fee_bps: u64,
) -> Result<u64> {

    // ensure non zero amounts
    require!(amount_in > 0, DexError::InvalidAmount);
    require!(reserve_in > 0 && reserve_out > 0, DexError::InsufficientLiquidity);
    // fee cannot be more than 100%.
    require!(fee_bps as u128 <= FEE_DEN, DexError::InvalidFee);

    let fee_multiplier: u128 = FEE_DEN
        .checked_sub(fee_bps as u128)
        .ok_or(DexError::MathOverflow)?;

    // Apply configurable fee in bps
    let amount_in_with_fee = (amount_in as u128)
        .checked_mul(fee_multiplier)
        .ok_or(DexError::MathOverflow)?;

    let numerator = amount_in_with_fee
        .checked_mul(reserve_out as u128)
        .ok_or(DexError::MathOverflow)?;

    let denominator = (reserve_in as u128)
        .checked_mul(FEE_DEN)
        .ok_or(DexError::MathOverflow)?
        .checked_add(amount_in_with_fee)
        .ok_or(DexError::MathOverflow)?;

    let amount_out = numerator
        .checked_div(denominator)
        .ok_or(DexError::MathOverflow)?;

    Ok(amount_out as u64)
}
