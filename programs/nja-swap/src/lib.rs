use anchor_lang::prelude::*;

declare_id!("5jNzyaz9Lt5mRKKLeqNUgRspjaJEZPQoYaG5DW7UsvQB");

#[program]
pub mod nja_swap {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
