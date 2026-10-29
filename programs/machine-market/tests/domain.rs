mod common;
use axp_machine_market_program::{
    codec::{FixedAccount, ZERO},
    domain::*,
    error::MarketError,
    instruction::{Action, Fund, Instruction},
    state::*,
};
use common::*;
use solana_program::program_error::ProgramError;

fn fund(kind: u8) -> Fund {
    Fund {
        match_id: [1; 32],
        expected_cursor: 0,
        buy_nonce: [2; 32],
        sell_nonce: [3; 32],
        buy_auth_hash: [4; 32],
        sell_auth_hash: [5; 32],
        gross: 10000,
        buyer_limit: 12000,
        seller_limit: 9000,
        buyer_valid_until: 99,
        seller_valid_until: 99,
        min_remaining_after: 0,
        funding_kind: kind,
        expected_refund_face: 0,
        packet_hash: ZERO,
        campaign_id: ZERO,
    }
}
fn error(error: MarketError) -> ProgramError {
    error.into()
}

#[test]
fn only_canonical_issuance_pairs_are_accepted() {
    for flag in 0..=3 {
        for maximum in 0..=5 {
            assert_eq!(
                valid_transfer_policy(flag, maximum).is_ok(),
                (flag == 0 && maximum == 0) || (flag == 1 && (1..=3).contains(&maximum))
            );
        }
    }
    let mut invalid = series();
    invalid.transferable = 0;
    invalid.max_transfers = 3;
    assert_eq!(invalid.encode(), Err(error(MarketError::InvalidInput)));
}
#[test]
fn consume_only_primary_cannot_promise_resale() {
    let mut s = series();
    s.transferable = 0;
    s.max_transfers = 0;
    assert_eq!(rights_after(&s, &unit(), 0, 0).unwrap(), (0, 0));
    assert_eq!(
        rights_after(&s, &unit(), 0, 1),
        Err(error(MarketError::Incompatible))
    );
    let mut u = unit();
    u.state = Unit::FUNDED_OPEN;
    u.cursor = 1;
    assert!(rights_after(&s, &u, 1, 0).is_err());
}
#[test]
fn every_primary_minimum_and_three_secondary_boundaries() {
    let s = series();
    let mut u = unit();
    for minimum in 0..=3 {
        assert_eq!(rights_after(&s, &u, 0, minimum).unwrap(), (0, 3));
    }
    u.state = Unit::FUNDED_OPEN;
    u.cursor = 1;
    for current in 0..3 {
        u.transfer_count = current;
        for minimum in 0..=3 {
            let result = rights_after(&s, &u, 1, minimum);
            assert_eq!(result.is_ok(), minimum <= 2 - current);
            if let Ok((count, remaining)) = result {
                assert_eq!((count, remaining), (current + 1, 2 - current));
            }
        }
    }
    u.transfer_count = 3;
    assert!(rights_after(&s, &u, 1, 0).is_err());
}
#[test]
fn sponsorship_overrides_series_rights_and_never_underflows() {
    let s = series();
    assert_eq!(rights_after(&s, &unit(), 2, 0).unwrap(), (0, 0));
    assert!(rights_after(&s, &unit(), 2, 1).is_err());
    let mut u = unit();
    u.state = Unit::FUNDED_OPEN;
    u.sponsored = 1;
    assert!(rights_after(&s, &u, 1, 0).is_err());
    u.sponsored = 0;
    u.transfer_count = u8::MAX;
    assert!(rights_after(&s, &u, 1, 0).is_err());
}
#[test]
fn funding_checks_exact_face_limits_and_each_deadline() {
    let s = series();
    let u = unit();
    let p = fund(0);
    assert_eq!(validate_fund_bounds(&p, &s, &u, 98).unwrap(), (0, 100));
    assert_eq!(
        validate_fund_bounds(&p, &s, &u, 99),
        Err(error(MarketError::Expired))
    );
    let mut mutation = p.clone();
    mutation.seller_valid_until = 98;
    assert!(validate_fund_bounds(&mutation, &s, &u, 98).is_err());
    mutation = p.clone();
    mutation.buyer_limit = 9999;
    assert!(validate_fund_bounds(&mutation, &s, &u, 1).is_err());
    mutation = p.clone();
    mutation.seller_limit = 10001;
    assert!(validate_fund_bounds(&mutation, &s, &u, 1).is_err());
    let mut held = u.clone();
    held.state = Unit::FUNDED_OPEN;
    held.cursor = 1;
    held.refund_face = 10000;
    mutation = fund(1);
    mutation.expected_cursor = 1;
    mutation.expected_refund_face = 6000;
    assert!(validate_fund_bounds(&mutation, &s, &held, 1).is_err());
    mutation.expected_refund_face = 10000;
    assert!(validate_fund_bounds(&mutation, &s, &held, 1).is_ok());
    mutation = fund(2);
    mutation.packet_hash = [1; 32];
    mutation.campaign_id = [2; 32];
    mutation.gross = 6000;
    assert!(validate_fund_bounds(&mutation, &s, &u, 1).is_err());
}
#[test]
fn precise_fee_arithmetic_and_conservation_selected_economics() {
    for (gross, expected) in [
        (1, 0),
        (99, 0),
        (100, 1),
        (10000, 100),
        (15000, 150),
        (8000, 80),
        (MAX_GROSS, 10000000),
    ] {
        assert_eq!(fee(gross).unwrap(), expected);
    }
    assert!(fee(0).is_err());
    assert!(fee(MAX_GROSS + 1).is_err());
    assert!(fee(u64::MAX).is_err());
    let p = 10000;
    let q1 = 15000;
    let q2 = 8000;
    let secondary_seller_cash = q1 - fee(q1).unwrap() + q2 - fee(q2).unwrap();
    let secondary_fees = fee(q1).unwrap() + fee(q2).unwrap();
    assert_eq!(p + q1 + q2, secondary_seller_cash + secondary_fees + p);
    assert_eq!((secondary_seller_cash, secondary_fees), (22770, 230));
    assert_eq!(p - fee(p).unwrap() + fee(p).unwrap(), p);
    assert_eq!((-(10000i64) + 14850 - 8000) + 10000, 6850); // A->B->A current-holder refund once.
}
#[test]
fn claim_recipient_follows_current_owner_not_historical_payer() {
    let m = market();
    let mut u = unit();
    u.owner = m.buyer_b;
    u.refund_face = 10000;
    assert_eq!(refund_recipient(&u).unwrap(), m.buyer_b);
    let p = primary();
    assert!(validate_primary_claim(&p, &u, &key(32), &key(31), &m.issuer).is_ok());
    let mut wrong = p.clone();
    wrong.primary_claim_face = 15000;
    assert!(validate_primary_claim(&wrong, &u, &key(32), &key(31), &m.issuer).is_err());
    u.sponsored = 1;
    u.sponsor_refund_key = m.sponsor;
    assert_eq!(refund_recipient(&u).unwrap(), m.sponsor);
}
#[test]
fn quoted_fee_is_immutable_but_unearned_on_refund() {
    let mut p = primary();
    assert_eq!(p.earned_fee(), 0);
    p.state = Match::PRIMARY_REFUNDED;
    assert_eq!((p.fee, p.earned_fee()), (100, 0));
    p.state = Match::PRIMARY_SETTLED;
    assert_eq!(p.earned_fee(), 100);
    p.state = Match::SECONDARY_SETTLED;
    assert_eq!(p.earned_fee(), 100);
}
#[test]
fn delivery_identity_binds_owner_cursor_and_exact_nonce() {
    let d = [9; 32];
    let nonce = [8; 32];
    let m = market();
    let s = series();
    let initial = delivery_request(
        &d,
        &m.buyer_a,
        &nonce,
        &key(32),
        1,
        &key(31),
        &s.resource_hash,
    );
    assert_eq!(initial.len(), 209);
    assert_eq!(&initial[0..9], b"AXPAUTH2\x05");
    let returned = delivery_request(
        &d,
        &m.buyer_a,
        &nonce,
        &key(32),
        3,
        &key(31),
        &s.resource_hash,
    );
    assert_ne!(hash(&[&initial]), hash(&[&returned]));
    assert_ne!(
        hash(&[&initial]),
        hash(&[&delivery_request(
            &d,
            &m.buyer_b,
            &nonce,
            &key(32),
            1,
            &key(31),
            &s.resource_hash
        )])
    );
}
#[test]
fn fund_hash_binds_every_instruction_byte_and_semantic_account_role() {
    let encoded = Instruction {
        operation_id: [7; 32],
        action: Action::Fund(fund(0)),
    }
    .encode()
    .unwrap();
    assert_eq!(encoded.len(), 316);
    let keys = std::array::from_fn(|i| key((i + 30) as u8));
    let expected = fund_terms(&encoded, &keys);
    for offset in 0..encoded.len() {
        let mut changed = encoded.clone();
        changed[offset] ^= 1;
        assert_ne!(fund_terms(&changed, &keys), expected);
    }
    for role in 0..keys.len() {
        let mut changed = keys;
        changed[role] = key(200);
        assert_ne!(fund_terms(&encoded, &changed), expected);
    }
}
#[test]
fn domain_and_strict_deadline_cursor_boundaries() {
    assert_ne!(
        domain(&[1; 32], &key(2), &key(3)),
        domain(&[1; 32], &key(2), &key(4))
    );
    assert!(before(9, 10).is_ok());
    assert!(before(10, 10).is_err());
    assert!(before(11, 10).is_err());
    assert_eq!(next_cursor(u64::MAX), Err(error(MarketError::InvalidInput)));
    assert_eq!(next_cursor(u64::MAX - 1).unwrap(), u64::MAX);
}
#[test]
fn exact_layouts_and_invalid_trailing_or_enum_bytes() {
    let values = [
        market().encode().unwrap(),
        series().encode().unwrap(),
        unit().encode().unwrap(),
        primary().encode().unwrap(),
        OrderUse {
            state: 1,
            market: key(30),
            actor: key(5),
            nonce: [1; 32],
            auth_hash: [2; 32],
            matched: key(33),
            consumed_slot: u64::MAX,
        }
        .encode()
        .unwrap(),
    ];
    assert_eq!(
        values.iter().map(Vec::len).collect::<Vec<_>>(),
        [393, 229, 383, 619, 178]
    );
    assert_eq!(&values[0][0..8], b"AXPMKT02");
    assert_eq!(&values[0][10..42], key(30).as_ref());
    let mut invalid = values[2].clone();
    invalid[9] = 6;
    assert!(Unit::decode(&invalid).is_err());
    invalid = values[2].clone();
    invalid.push(0);
    assert!(Unit::decode(&invalid).is_err());
    let mut instruction = Instruction {
        operation_id: [0; 32],
        action: Action::ExpireUnused {
            expected_cursor: u64::MAX,
        },
    }
    .encode()
    .unwrap();
    assert_eq!(instruction.len(), 42);
    instruction.push(0);
    assert!(Instruction::decode(&instruction).is_err());
}
