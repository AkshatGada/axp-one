//! Pure immutable identities and transition predicates shared by processor/tests.
use crate::{
    codec::{Bytes32, Writer, ZERO},
    error::{checked_add, require, MarketError, Result},
    instruction::Fund,
    state::{Match, Series, Unit, MAX_GROSS},
};
use solana_program::{hash::hashv, pubkey::Pubkey, system_program};

pub fn hash(parts: &[&[u8]]) -> Bytes32 {
    hashv(parts).to_bytes()
}
pub fn domain(genesis: &Bytes32, program: &Pubkey, market: &Pubkey) -> Bytes32 {
    hash(&[b"AXP-MM-V2", genesis, program.as_ref(), market.as_ref()])
}
pub fn order_id(d: &Bytes32, actor: &Pubkey, nonce: &Bytes32) -> Bytes32 {
    hash(&[d, actor.as_ref(), nonce])
}
pub fn unit_id(series: &Pubkey, serial: u16) -> Bytes32 {
    hash(&[series.as_ref(), &serial.to_le_bytes()])
}
pub fn match_id(
    d: &Bytes32,
    buy: &Bytes32,
    sell: &Bytes32,
    unit: &Pubkey,
    cursor: u64,
    gross: u64,
    kind: u8,
) -> Bytes32 {
    hash(&[
        d,
        buy,
        sell,
        unit.as_ref(),
        &cursor.to_le_bytes(),
        &gross.to_le_bytes(),
        &[kind],
    ])
}
pub fn operation_id(d: &Bytes32, tag: u8, identity: &[u8]) -> Bytes32 {
    hash(&[d, &[tag], identity])
}
pub fn delivery_operation(d: &Bytes32, tag: u8, unit: &Pubkey, request_hash: &Bytes32) -> Bytes32 {
    hash(&[d, &[tag], unit.as_ref(), request_hash])
}
pub fn expiry_operation(d: &Bytes32, unit: &Pubkey, cursor: u64) -> Bytes32 {
    hash(&[d, &[8], unit.as_ref(), &cursor.to_le_bytes()])
}
pub fn series_terms(series: &Series) -> Bytes32 {
    let mut w = Writer::default();
    w.key(&series.issuer);
    w.bytes(&series.resource_hash);
    w.bytes(&series.version_hash);
    w.u8(series.format);
    w.u64(series.use_by_slot);
    w.u64(series.sponsored_price);
    w.u16(series.cap);
    w.u8(series.max_transfers);
    w.u8(series.transferable);
    w.u32(series.content_bytes);
    hash(&[&w.data])
}
pub fn fund_terms(instruction: &[u8], semantic_keys: &[Pubkey; 11]) -> Bytes32 {
    let mut w = Writer::default();
    w.bytes(instruction);
    for key in semantic_keys {
        w.key(key);
    }
    hash(&[&w.data])
}
pub fn delivery_request(
    d: &Bytes32,
    owner: &Pubkey,
    nonce: &Bytes32,
    unit: &Pubkey,
    cursor: u64,
    series: &Pubkey,
    resource_hash: &Bytes32,
) -> Vec<u8> {
    let mut w = Writer::default();
    w.bytes(b"AXPAUTH2");
    w.u8(5);
    w.bytes(d);
    w.key(owner);
    w.bytes(nonce);
    w.key(unit);
    w.u64(cursor);
    w.key(series);
    w.bytes(resource_hash);
    w.data
}
pub fn fee(gross: u64) -> Result<u64> {
    require(gross > 0 && gross <= MAX_GROSS, MarketError::InvalidInput)?;
    u64::try_from(
        (gross as u128)
            .checked_mul(100)
            .ok_or(MarketError::InvalidInput)?
            / 10_000,
    )
    .map_err(|_| MarketError::InvalidInput.into())
}
pub fn valid_transfer_policy(transferable: u8, maximum: u8) -> Result<()> {
    require(
        (transferable == 0 && maximum == 0) || (transferable == 1 && (1..=3).contains(&maximum)),
        MarketError::InvalidInput,
    )
}
/// A zero minimum never authorizes an otherwise forbidden secondary transition.
pub fn rights_after(series: &Series, unit: &Unit, kind: u8, minimum: u8) -> Result<(u8, u8)> {
    valid_transfer_policy(series.transferable, series.max_transfers)?;
    require(kind <= 2 && minimum <= 3, MarketError::InvalidInput)?;
    let count = match kind {
        0 | 2 => {
            require(
                unit.state == Unit::ISSUER_OPEN && unit.cursor == 0 && unit.transfer_count == 0,
                MarketError::Incompatible,
            )?;
            0
        }
        1 => {
            require(
                unit.state == Unit::FUNDED_OPEN
                    && unit.sponsored == 0
                    && series.transferable == 1
                    && unit.transfer_count < series.max_transfers,
                MarketError::Incompatible,
            )?;
            unit.transfer_count
                .checked_add(1)
                .ok_or(MarketError::InvalidInput)?
        }
        _ => return Err(MarketError::InvalidInput.into()),
    };
    let effective = if kind == 2 || series.transferable == 0 || unit.sponsored == 1 {
        0
    } else {
        series
            .max_transfers
            .checked_sub(count)
            .ok_or(MarketError::InvalidInput)?
    };
    require(kind != 2 || minimum == 0, MarketError::Incompatible)?;
    require(effective >= minimum, MarketError::Incompatible)?;
    Ok((count, effective))
}
pub fn valid_wallet_key(key: &Pubkey, program: &Pubkey) -> Result<()> {
    require(
        *key != Pubkey::default() && *key != system_program::id() && *key != *program,
        MarketError::InvalidAuth,
    )
}
/// Minimum is strict at every new economic deadline. Equality closes admission.
pub fn before(slot: u64, deadline: u64) -> Result<()> {
    require(slot < deadline, MarketError::Expired)
}
pub fn next_cursor(cursor: u64) -> Result<u64> {
    checked_add(cursor, 1)
}

pub fn validate_fund_bounds(
    p: &Fund,
    series: &Series,
    unit: &Unit,
    slot: u64,
) -> Result<(u8, u64)> {
    let (count, _) = rights_after(series, unit, p.funding_kind, p.min_remaining_after)?;
    require(p.expected_cursor == unit.cursor, MarketError::StaleCursor)?;
    let quoted_fee = fee(p.gross)?;
    require(
        p.buyer_limit <= MAX_GROSS
            && p.seller_limit <= MAX_GROSS
            && p.buyer_limit >= p.gross
            && p.gross >= p.seller_limit,
        MarketError::Incompatible,
    )?;
    before(slot, series.use_by_slot)?;
    before(slot, p.buyer_valid_until)?;
    before(slot, p.seller_valid_until)?;
    match p.funding_kind {
        0 => require(
            p.expected_refund_face == 0 && p.packet_hash == ZERO && p.campaign_id == ZERO,
            MarketError::Incompatible,
        )?,
        1 => require(
            unit.refund_face > 0
                && p.expected_refund_face == unit.refund_face
                && p.packet_hash == ZERO
                && p.campaign_id == ZERO,
            MarketError::Incompatible,
        )?,
        2 => require(
            p.expected_refund_face == 0
                && p.gross == series.sponsored_price
                && p.packet_hash != ZERO
                && p.campaign_id != ZERO,
            MarketError::Incompatible,
        )?,
        _ => return Err(MarketError::InvalidInput.into()),
    }
    Ok((count, quoted_fee))
}
pub fn refund_recipient(unit: &Unit) -> Result<Pubkey> {
    if unit.sponsored == 1 {
        require(
            unit.sponsor_refund_key != Pubkey::default(),
            MarketError::Incompatible,
        )?;
        Ok(unit.sponsor_refund_key)
    } else {
        Ok(unit.owner)
    }
}
pub fn validate_primary_claim(
    primary: &Match,
    unit: &Unit,
    unit_key: &Pubkey,
    series_key: &Pubkey,
    issuer: &Pubkey,
) -> Result<()> {
    require(
        primary.unit == *unit_key
            && primary.series == *series_key
            && primary.seller == *issuer
            && matches!(primary.trade_kind, 0 | 2)
            && primary.gross == unit.refund_face
            && primary.primary_claim_face == unit.refund_face
            && unit.refund_face > 0
            && primary.fee == fee(primary.gross)?
            && primary.expected_cursor == 0
            && primary.funded_cursor == 1,
        MarketError::Incompatible,
    )?;
    if unit.sponsored == 1 {
        require(
            primary.trade_kind == 2
                && primary.payer == unit.sponsor_refund_key
                && primary.beneficiary == unit.owner,
            MarketError::Incompatible,
        )
    } else {
        require(
            primary.trade_kind == 0 && unit.sponsor_refund_key == Pubkey::default(),
            MarketError::Incompatible,
        )
    }
}
