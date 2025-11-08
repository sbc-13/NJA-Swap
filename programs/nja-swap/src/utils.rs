use anchor_lang::prelude::*;
use crate::errors::DexError;

/// Fee denominator for calculating fees in basis points
const FEE_DEN: u128 = 10_000;

/// Minimum liquidity locked forever on first deposit to prevent inflation attacks
pub const MINIMUM_LIQUIDITY: u64 = 1000;

/// Integer square root using Newton's method
/// Returns the largest integer x where x * x <= n
pub fn sqrt(n: u128) -> u128 {
    if n == 0 {
        return 0;
    }

    // Initial guess: start with n/2
    let mut x = n;
    let mut y = (x + 1) / 2;

    // Newton's method iteration
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }

    x
}

/// Calculates the amount of LP tokens to mint when liquidity is added.
///
/// # First Liquidity Addition (lp_supply == 0)
/// - LP tokens = sqrt(amount_a * amount_b) - MINIMUM_LIQUIDITY
/// - The MINIMUM_LIQUIDITY is permanently locked to prevent inflation attacks
/// - This ensures the first LP cannot manipulate the pool price by withdrawing almost all liquidity
///
/// # Subsequent Liquidity Additions
/// - LP tokens = min(amount_a * lp_supply / reserve_a, amount_b * lp_supply / reserve_b)
/// - Takes the minimum to maintain pool ratio and prevent exploits
/// - Users must provide amounts proportional to existing reserves
///
/// # Parameters
/// - `amount_a`: Amount of Token A being deposited
/// - `amount_b`: Amount of Token B being deposited
/// - `reserve_a`: Current reserve of Token A in pool
/// - `reserve_b`: Current reserve of Token B in pool
/// - `lp_supply`: Current total supply of LP tokens
///
/// # Returns
/// Amount of LP tokens to mint to the liquidity provider
///
/// # Errors
/// - `MathOverflow`: If calculations overflow u128
/// - `InsufficientLiquidity`: If initial liquidity is below MINIMUM_LIQUIDITY
pub fn calculate_lp_tokens(
    amount_a: u64,
    amount_b: u64,
    reserve_a: u64,
    reserve_b: u64,
    lp_supply: u64,
) -> Result<u64> {
    if lp_supply == 0 {
        // First time adding liquidity: sqrt(a * b) - MINIMUM_LIQUIDITY
        let product = (amount_a as u128)
            .checked_mul(amount_b as u128)
            .ok_or(DexError::MathOverflow)?;

        // Integer square root
        let liquidity = sqrt(product);

        // Ensure liquidity is greater than minimum
        require!(
            liquidity > MINIMUM_LIQUIDITY as u128,
            DexError::InsufficientLiquidity
        );

        // Subtract minimum liquidity (locked forever)
        Ok((liquidity - MINIMUM_LIQUIDITY as u128) as u64)
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

/// Calculate the output of a swap using constant product formula with fees.
///
/// # Constant Product Formula (x * y = k)
/// The AMM maintains the invariant that reserve_in * reserve_out = k (constant)
/// After a swap: (reserve_in + amount_in) * (reserve_out - amount_out) = k
///
/// # Formula with Fees
/// ```
/// amount_out = (reserve_out * amount_in * (FEE_DEN - fee_bps)) /
///              (reserve_in * FEE_DEN + amount_in * (FEE_DEN - fee_bps))
/// ```
/// Where:
/// - `fee_bps`: Fee in basis points (e.g., 30 = 0.3%)
/// - `FEE_DEN`: Fee denominator = 10,000
///
/// # Example
/// If you swap 100 tokens with a 0.3% fee:
/// - Fee: 100 * 30 / 10,000 = 0.3 tokens
/// - Amount after fee: 100 * 9,970 / 10,000 = 99.7 tokens
///
/// # Parameters
/// - `amount_in`: Amount of input token being swapped
/// - `reserve_in`: Current reserve of input token
/// - `reserve_out`: Current reserve of output token
/// - `fee_bps`: Trading fee in basis points
///
/// # Returns
/// Amount of output token to send to the user
///
/// # Errors
/// - `InvalidAmount`: If amount_in is zero
/// - `InsufficientLiquidity`: If either reserve is zero
/// - `InvalidFee`: If fee >= 100%
/// - `MathOverflow`: If calculations overflow u128
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
