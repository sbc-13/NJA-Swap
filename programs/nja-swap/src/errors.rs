use anchor_lang::prelude::*;

#[error_code]
pub enum DexError {
    #[msg("Math overflow occurred")]
    MathOverflow,
    #[msg("Invalid token pair - must be different")]
    InvalidTokenPair,
}
