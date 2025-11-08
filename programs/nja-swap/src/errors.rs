use anchor_lang::prelude::*;

#[error_code]
pub enum DexError {
    #[msg("Math overflow occurred")]
    MathOverflow,
    #[msg("Invalid token pair - must be different")]
    InvalidTokenPair,
    #[msg("Swap amount cannot be zero")]
    InvalidAmount,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Insufficient liquidity in pool")]
    InsufficientLiquidity,
    #[msg("Fee cannot be greater than 100%")]
    InvalidFee,
}
