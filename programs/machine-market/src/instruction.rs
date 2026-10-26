use crate::{
    codec::{Bytes32, Reader, Writer, WIRE_VERSION},
    error::{require, MarketError, Result},
};
use solana_program::pubkey::Pubkey;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Init {
    pub market_nonce: Bytes32,
    pub genesis: Bytes32,
    pub matcher: Pubkey,
    pub gateway: Pubkey,
    pub collector: Pubkey,
    pub issuer: Pubkey,
    pub buyer_a: Pubkey,
    pub buyer_b: Pubkey,
    pub sponsor: Pubkey,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IssueSeries {
    pub series_id: Bytes32,
    pub resource_hash: Bytes32,
    pub version_hash: Bytes32,
    pub format: u8,
    pub use_by_slot: u64,
    pub sponsored_price: u64,
    pub cap: u16,
    pub max_transfers: u8,
    pub transferable: u8,
    pub content_bytes: u32,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Fund {
    pub match_id: Bytes32,
    pub expected_cursor: u64,
    pub buy_nonce: Bytes32,
    pub sell_nonce: Bytes32,
    pub buy_auth_hash: Bytes32,
    pub sell_auth_hash: Bytes32,
    pub gross: u64,
    pub buyer_limit: u64,
    pub seller_limit: u64,
    pub buyer_valid_until: u64,
    pub seller_valid_until: u64,
    pub min_remaining_after: u8,
    pub funding_kind: u8,
    pub expected_refund_face: u64,
    pub packet_hash: Bytes32,
    pub campaign_id: Bytes32,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Action {
    Init(Init),
    IssueSeries(IssueSeries),
    RegisterUnit {
        series_id: Bytes32,
        serial: u16,
    },
    Fund(Fund),
    StartDelivery {
        expected_cursor: u64,
        request_nonce: Bytes32,
        request_hash: Bytes32,
    },
    FinalizeDelivery {
        expected_locked_cursor: u64,
        request_hash: Bytes32,
        response_hash: Bytes32,
    },
    RefundFailure {
        expected_locked_cursor: u64,
        request_hash: Bytes32,
    },
    TimeoutRefund {
        expected_locked_cursor: u64,
        request_hash: Bytes32,
    },
    ExpireUnused {
        expected_cursor: u64,
    },
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Instruction {
    pub operation_id: Bytes32,
    pub action: Action,
}
impl Action {
    pub fn tag(&self) -> u8 {
        match self {
            Self::Init(_) => 0,
            Self::IssueSeries(_) => 1,
            Self::RegisterUnit { .. } => 2,
            Self::Fund(_) => 3,
            Self::StartDelivery { .. } => 4,
            Self::FinalizeDelivery { .. } => 5,
            Self::RefundFailure { .. } => 6,
            Self::TimeoutRefund { .. } => 7,
            Self::ExpireUnused { .. } => 8,
        }
    }
}
impl Instruction {
    pub fn decode(data: &[u8]) -> Result<Self> {
        let mut r = Reader::new(data);
        let tag = r.u8()?;
        require(r.u8()? == WIRE_VERSION, MarketError::InvalidInput)?;
        let operation_id = r.bytes()?;
        let action = match tag {
            0 => Action::Init(Init {
                market_nonce: r.bytes()?,
                genesis: r.bytes()?,
                matcher: r.key()?,
                gateway: r.key()?,
                collector: r.key()?,
                issuer: r.key()?,
                buyer_a: r.key()?,
                buyer_b: r.key()?,
                sponsor: r.key()?,
            }),
            1 => Action::IssueSeries(IssueSeries {
                series_id: r.bytes()?,
                resource_hash: r.bytes()?,
                version_hash: r.bytes()?,
                format: r.u8()?,
                use_by_slot: r.u64()?,
                sponsored_price: r.u64()?,
                cap: r.u16()?,
                max_transfers: r.u8()?,
                transferable: r.u8()?,
                content_bytes: r.u32()?,
            }),
            2 => Action::RegisterUnit {
                series_id: r.bytes()?,
                serial: r.u16()?,
            },
            3 => Action::Fund(Fund {
                match_id: r.bytes()?,
                expected_cursor: r.u64()?,
                buy_nonce: r.bytes()?,
                sell_nonce: r.bytes()?,
                buy_auth_hash: r.bytes()?,
                sell_auth_hash: r.bytes()?,
                gross: r.u64()?,
                buyer_limit: r.u64()?,
                seller_limit: r.u64()?,
                buyer_valid_until: r.u64()?,
                seller_valid_until: r.u64()?,
                min_remaining_after: r.u8()?,
                funding_kind: r.u8()?,
                expected_refund_face: r.u64()?,
                packet_hash: r.bytes()?,
                campaign_id: r.bytes()?,
            }),
            4 => Action::StartDelivery {
                expected_cursor: r.u64()?,
                request_nonce: r.bytes()?,
                request_hash: r.bytes()?,
            },
            5 => Action::FinalizeDelivery {
                expected_locked_cursor: r.u64()?,
                request_hash: r.bytes()?,
                response_hash: r.bytes()?,
            },
            6 => Action::RefundFailure {
                expected_locked_cursor: r.u64()?,
                request_hash: r.bytes()?,
            },
            7 => Action::TimeoutRefund {
                expected_locked_cursor: r.u64()?,
                request_hash: r.bytes()?,
            },
            8 => Action::ExpireUnused {
                expected_cursor: r.u64()?,
            },
            _ => return Err(MarketError::InvalidInput.into()),
        };
        r.finish()?;
        let instruction = Self {
            operation_id,
            action,
        };
        instruction.validate_encoding()?;
        Ok(instruction)
    }
    pub fn validate_encoding(&self) -> Result<()> {
        match &self.action {
            Action::IssueSeries(p) => {
                crate::domain::valid_transfer_policy(p.transferable, p.max_transfers)?;
                require(
                    p.format <= 3 && p.cap > 0 && p.cap <= 64 && p.content_bytes <= 16_384,
                    MarketError::InvalidInput,
                )
            }
            Action::Fund(p) => require(
                p.funding_kind <= 2 && p.min_remaining_after <= 3,
                MarketError::InvalidInput,
            ),
            _ => Ok(()),
        }
    }
    pub fn encode(&self) -> Result<Vec<u8>> {
        self.validate_encoding()?;
        let mut w = Writer::default();
        w.u8(self.action.tag());
        w.u8(WIRE_VERSION);
        w.bytes(&self.operation_id);
        match &self.action {
            Action::Init(p) => {
                w.bytes(&p.market_nonce);
                w.bytes(&p.genesis);
                w.key(&p.matcher);
                w.key(&p.gateway);
                w.key(&p.collector);
                w.key(&p.issuer);
                w.key(&p.buyer_a);
                w.key(&p.buyer_b);
                w.key(&p.sponsor);
            }
            Action::IssueSeries(p) => {
                w.bytes(&p.series_id);
                w.bytes(&p.resource_hash);
                w.bytes(&p.version_hash);
                w.u8(p.format);
                w.u64(p.use_by_slot);
                w.u64(p.sponsored_price);
                w.u16(p.cap);
                w.u8(p.max_transfers);
                w.u8(p.transferable);
                w.u32(p.content_bytes);
            }
            Action::RegisterUnit { series_id, serial } => {
                w.bytes(series_id);
                w.u16(*serial);
            }
            Action::Fund(p) => {
                w.bytes(&p.match_id);
                w.u64(p.expected_cursor);
                w.bytes(&p.buy_nonce);
                w.bytes(&p.sell_nonce);
                w.bytes(&p.buy_auth_hash);
                w.bytes(&p.sell_auth_hash);
                w.u64(p.gross);
                w.u64(p.buyer_limit);
                w.u64(p.seller_limit);
                w.u64(p.buyer_valid_until);
                w.u64(p.seller_valid_until);
                w.u8(p.min_remaining_after);
                w.u8(p.funding_kind);
                w.u64(p.expected_refund_face);
                w.bytes(&p.packet_hash);
                w.bytes(&p.campaign_id);
            }
            Action::StartDelivery {
                expected_cursor,
                request_nonce,
                request_hash,
            } => {
                w.u64(*expected_cursor);
                w.bytes(request_nonce);
                w.bytes(request_hash);
            }
            Action::FinalizeDelivery {
                expected_locked_cursor,
                request_hash,
                response_hash,
            } => {
                w.u64(*expected_locked_cursor);
                w.bytes(request_hash);
                w.bytes(response_hash);
            }
            Action::RefundFailure {
                expected_locked_cursor,
                request_hash,
            }
            | Action::TimeoutRefund {
                expected_locked_cursor,
                request_hash,
            } => {
                w.u64(*expected_locked_cursor);
                w.bytes(request_hash);
            }
            Action::ExpireUnused { expected_cursor } => w.u64(*expected_cursor),
        }
        Ok(w.data)
    }
}
