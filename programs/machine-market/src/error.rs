use solana_program::program_error::ProgramError;

/// Frozen W6 numeric order. Do not renumber.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum MarketError {
    InvalidInput = 1,
    InvalidAuth = 2,
    NonceConflict = 3,
    Incompatible = 4,
    InsufficientAvailable = 5,
    StaleCursor = 6,
    SelfTrade = 7,
    Expired = 8,
    PendingSettlement = 9,
    TerminalConflict = 10,
    AlreadyUsed = 11,
    Capacity = 12,
    RunMismatch = 13,
    PrefundedPdaUnsupported = 14,
    RecipientState = 15,
}
impl From<MarketError> for ProgramError {
    fn from(value: MarketError) -> Self {
        Self::Custom(value as u32)
    }
}
pub type Result<T> = core::result::Result<T, ProgramError>;
pub fn require(condition: bool, error: MarketError) -> Result<()> {
    if condition {
        Ok(())
    } else {
        Err(error.into())
    }
}
pub fn checked_add(a: u64, b: u64) -> Result<u64> {
    a.checked_add(b).ok_or(MarketError::InvalidInput.into())
}
