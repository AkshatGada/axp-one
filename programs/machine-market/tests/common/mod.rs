#![allow(dead_code)]
use axp_machine_market_program::{
    codec::{FixedAccount, ZERO},
    domain,
    state::*,
};
use solana_program::{pubkey::Pubkey, rent::Rent};
pub fn key(n: u8) -> Pubkey {
    Pubkey::new_from_array([n; 32])
}
pub fn market() -> Market {
    Market {
        state: 1,
        market: key(30),
        initializer: key(1),
        market_nonce: [11; 32],
        genesis: [12; 32],
        matcher: key(2),
        gateway: key(2),
        fee_collector: key(3),
        issuer: key(4),
        buyer_a: key(5),
        buyer_b: key(6),
        sponsor: key(7),
        fee_bps: FEE_BPS,
        max_transfers: MAX_TRANSFERS,
        max_series: MAX_SERIES,
        max_units: MAX_UNITS,
        max_matches: MAX_MATCHES,
        issued_series: 1,
        issued_units: 1,
        funded_matches: 1,
        lease_slots: LEASE_SLOTS,
        max_gross: MAX_GROSS,
    }
}
pub fn series() -> Series {
    let m = market();
    let mut s = Series {
        state: 1,
        market: m.market,
        series_id: [21; 32],
        issuer: m.issuer,
        resource_hash: [22; 32],
        version_hash: [23; 32],
        terms_hash: ZERO,
        format: 0,
        use_by_slot: 100,
        sponsored_price: 10000,
        cap: 12,
        issued: 1,
        max_transfers: 3,
        transferable: 1,
        content_bytes: 128,
    };
    s.terms_hash = domain::series_terms(&s);
    s
}
pub fn unit() -> Unit {
    let m = market();
    Unit {
        state: Unit::ISSUER_OPEN,
        market: m.market,
        series: key(31),
        unit_id: [24; 32],
        serial: 0,
        owner: m.issuer,
        cursor: 0,
        transfer_count: 0,
        sponsored: 0,
        primary_match: Pubkey::default(),
        latest_match: Pubkey::default(),
        refund_face: 0,
        sponsor_refund_key: Pubkey::default(),
        request_hash: ZERO,
        lock_start_cursor: 0,
        lock_start_slot: 0,
        lock_deadline_slot: 0,
        terminal_op_hash: ZERO,
        response_hash: ZERO,
        terminal_slot: 0,
        terminal_reason: 0,
    }
}
pub fn primary() -> Match {
    let m = market();
    Match {
        state: Match::PRIMARY_ESCROWED,
        market: m.market,
        match_id: [25; 32],
        unit: key(32),
        series: key(31),
        expected_cursor: 0,
        funded_cursor: 1,
        payer: m.buyer_a,
        beneficiary: m.buyer_a,
        seller: m.issuer,
        buy_nonce: [26; 32],
        sell_nonce: [27; 32],
        buy_auth_hash: [28; 32],
        sell_auth_hash: [29; 32],
        gross: 10000,
        fee: 100,
        trade_kind: 0,
        packet_hash: ZERO,
        campaign_id: ZERO,
        fund_terms_hash: [30; 32],
        funded_slot: 1,
        terminal_op_hash: ZERO,
        terminal_slot: 0,
        rent_reserve: Rent::default().minimum_balance(Match::LEN),
        primary_claim_face: 10000,
        terminal_recipient: Pubkey::default(),
        previous_match: Pubkey::default(),
    }
}
