use anchor_lang::prelude::*;
use crate::errors::DexError;

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
