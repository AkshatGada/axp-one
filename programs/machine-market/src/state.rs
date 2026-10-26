use crate::{
    codec::{Bytes32, FixedAccount, Reader, Writer},
    domain::valid_transfer_policy,
    error::{require, MarketError, Result},
};
use solana_program::pubkey::Pubkey;

pub const FEE_BPS: u16 = 100;
pub const MAX_TRANSFERS: u8 = 3;
pub const MAX_SERIES: u16 = 16;
pub const MAX_UNITS: u16 = 64;
pub const MAX_MATCHES: u16 = 256;
pub const LEASE_SLOTS: u64 = 150;
pub const MAX_GROSS: u64 = 1_000_000_000;

// The field order in each macro invocation is the complete W3 body order.
macro_rules! read_field {
    ($r:ident, Bytes32) => {
        $r.bytes()?
    };
    ($r:ident, Pubkey) => {
        $r.key()?
    };
    ($r:ident, u8) => {
        $r.u8()?
    };
    ($r:ident, u16) => {
        $r.u16()?
    };
    ($r:ident, u32) => {
        $r.u32()?
    };
    ($r:ident, u64) => {
        $r.u64()?
    };
}
macro_rules! write_field {
    ($w:ident, $v:expr, Bytes32) => {
        $w.bytes(&$v)
    };
    ($w:ident, $v:expr, Pubkey) => {
        $w.key(&$v)
    };
    ($w:ident, $v:expr, u8) => {
        $w.u8($v)
    };
    ($w:ident, $v:expr, u16) => {
        $w.u16($v)
    };
    ($w:ident, $v:expr, u32) => {
        $w.u32($v)
    };
    ($w:ident, $v:expr, u64) => {
        $w.u64($v)
    };
}
macro_rules! account {
    ($name:ident, $kind:expr, $len:expr, { $($field:ident: $ty:ident),* $(,)? }) => {
        #[derive(Clone, Debug, PartialEq, Eq)]
        pub struct $name { pub state: u8, pub market: Pubkey, $(pub $field: $ty),* }
        impl FixedAccount for $name {
            const KIND: u8 = $kind; const LEN: usize = $len;
            fn state(&self) -> u8 { self.state }
            fn market(&self) -> &Pubkey { &self.market }
            fn read_body(state: u8, market: Pubkey, r: &mut Reader<'_>) -> Result<Self> {
                Ok(Self {state, market, $($field: read_field!(r, $ty)),*})
            }
            fn write_body(&self, w: &mut Writer) { $(write_field!(w, self.$field, $ty);)* }
            fn validate(&self) -> Result<()> { self.validate_fields() }
        }
    }
}
account!(Market, 1, 393, {
    initializer: Pubkey, market_nonce: Bytes32, genesis: Bytes32,
    matcher: Pubkey, gateway: Pubkey, fee_collector: Pubkey, issuer: Pubkey,
    buyer_a: Pubkey, buyer_b: Pubkey, sponsor: Pubkey, fee_bps: u16,
    max_transfers: u8, max_series: u16, max_units: u16, max_matches: u16,
    issued_series: u16, issued_units: u16, funded_matches: u16,
    lease_slots: u64, max_gross: u64
});
impl Market {
    fn validate_fields(&self) -> Result<()> {
        require(
            self.state == 1
                && self.fee_bps == FEE_BPS
                && self.max_transfers == MAX_TRANSFERS
                && self.max_series == MAX_SERIES
                && self.max_units == MAX_UNITS
                && self.max_matches == MAX_MATCHES
                && self.lease_slots == LEASE_SLOTS
                && self.max_gross == MAX_GROSS
                && self.issued_series <= MAX_SERIES
                && self.issued_units <= MAX_UNITS
                && self.funded_matches <= MAX_MATCHES,
            MarketError::InvalidInput,
        )
    }
    pub fn is_buyer(&self, key: &Pubkey) -> bool {
        *key == self.buyer_a || *key == self.buyer_b
    }
}
account!(Series, 2, 229, {
    series_id: Bytes32, issuer: Pubkey, resource_hash: Bytes32, version_hash: Bytes32,
    terms_hash: Bytes32, format: u8, use_by_slot: u64, sponsored_price: u64,
    cap: u16, issued: u16, max_transfers: u8, transferable: u8, content_bytes: u32
});
impl Series {
    fn validate_fields(&self) -> Result<()> {
        require(
            self.state == 1
                && self.format <= 3
                && self.cap > 0
                && self.cap <= MAX_UNITS
                && self.issued <= self.cap
                && self.content_bytes <= 16_384,
            MarketError::InvalidInput,
        )?;
        valid_transfer_policy(self.transferable, self.max_transfers)
    }
}
account!(Unit, 3, 383, {
    series: Pubkey, unit_id: Bytes32, serial: u16, owner: Pubkey, cursor: u64,
    transfer_count: u8, sponsored: u8, primary_match: Pubkey, latest_match: Pubkey,
    refund_face: u64, sponsor_refund_key: Pubkey, request_hash: Bytes32,
    lock_start_cursor: u64, lock_start_slot: u64, lock_deadline_slot: u64,
    terminal_op_hash: Bytes32, response_hash: Bytes32, terminal_slot: u64, terminal_reason: u8
});
impl Unit {
    pub const ISSUER_OPEN: u8 = 0;
    pub const FUNDED_OPEN: u8 = 1;
    pub const DELIVERY_LOCKED: u8 = 2;
    pub const CONSUMED: u8 = 3;
    pub const REFUNDED: u8 = 4;
    pub const EXPIRED: u8 = 5;
    fn validate_fields(&self) -> Result<()> {
        require(
            self.state <= 5
                && self.transfer_count <= MAX_TRANSFERS
                && self.sponsored <= 1
                && self.terminal_reason <= 4,
            MarketError::InvalidInput,
        )
    }
    pub fn terminal(&self) -> bool {
        self.state >= Self::CONSUMED
    }
}
account!(Match, 4, 619, {
    match_id: Bytes32, unit: Pubkey, series: Pubkey, expected_cursor: u64, funded_cursor: u64,
    payer: Pubkey, beneficiary: Pubkey, seller: Pubkey, buy_nonce: Bytes32, sell_nonce: Bytes32,
    buy_auth_hash: Bytes32, sell_auth_hash: Bytes32, gross: u64, fee: u64, trade_kind: u8,
    packet_hash: Bytes32, campaign_id: Bytes32, fund_terms_hash: Bytes32, funded_slot: u64,
    terminal_op_hash: Bytes32, terminal_slot: u64, rent_reserve: u64,
    primary_claim_face: u64, terminal_recipient: Pubkey, previous_match: Pubkey
});
impl Match {
    pub const PRIMARY_ESCROWED: u8 = 1;
    pub const PRIMARY_SETTLED: u8 = 2;
    pub const PRIMARY_REFUNDED: u8 = 3;
    pub const SECONDARY_SETTLED: u8 = 4;
    fn validate_fields(&self) -> Result<()> {
        require(
            (1..=4).contains(&self.state) && self.trade_kind <= 2,
            MarketError::InvalidInput,
        )
    }
    pub fn earned_fee(&self) -> u64 {
        if self.state == Self::PRIMARY_SETTLED || self.state == Self::SECONDARY_SETTLED {
            self.fee
        } else {
            0
        }
    }
}
account!(OrderUse, 5, 178, {
    actor: Pubkey, nonce: Bytes32, auth_hash: Bytes32, matched: Pubkey, consumed_slot: u64
});
impl OrderUse {
    fn validate_fields(&self) -> Result<()> {
        require(self.state == 1, MarketError::InvalidInput)
    }
}
