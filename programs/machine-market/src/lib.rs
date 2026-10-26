//! Packet03 native settlement: primary escrow, immediately settled secondary rights.
//! Host tests are not validator/CPI/finality evidence.
#![allow(unexpected_cfgs)]
pub mod codec;
pub mod domain;
pub mod error;
pub mod instruction;
pub mod processor;
pub mod state;

#[cfg(not(feature = "no-entrypoint"))]
solana_program::entrypoint!(process_instruction);

pub use processor::process_instruction;
