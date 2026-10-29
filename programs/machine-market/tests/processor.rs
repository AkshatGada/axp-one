//! Host processor tests with explicit Clock/Rent stubs. No bank, validator, CPI,
//! transaction signature, real network fee or chain finality is exercised.
mod common;
use axp_machine_market_program::{
    codec::{FixedAccount, ZERO},
    domain,
    error::MarketError,
    instruction::{Action, Instruction},
    processor::{process_instruction, validate_metas},
    state::{Market, Match, Series, Unit},
};
use common::*;
use solana_program::{
    account_info::AccountInfo,
    clock::Clock,
    program_stubs::{set_syscall_stubs, SyscallStubs},
    pubkey::Pubkey,
    rent::Rent,
    system_program,
};
use std::sync::Mutex;
static SYSCALL_LOCK: Mutex<()> = Mutex::new(());
struct Sysvars {
    slot: u64,
}
impl SyscallStubs for Sysvars {
    fn sol_get_clock_sysvar(&self, address: *mut u8) -> u64 {
        // The program's Sysvar::get allocates this correctly aligned object.
        unsafe {
            std::ptr::write(
                address.cast::<Clock>(),
                Clock {
                    slot: self.slot,
                    ..Clock::default()
                },
            );
        }
        0
    }
    fn sol_get_rent_sysvar(&self, address: *mut u8) -> u64 {
        unsafe {
            std::ptr::write(address.cast::<Rent>(), Rent::default());
        }
        0
    }
}
struct Restore(Option<Box<dyn SyscallStubs>>);
impl Drop for Restore {
    fn drop(&mut self) {
        if let Some(previous) = self.0.take() {
            set_syscall_stubs(previous);
        }
    }
}
struct Account {
    key: Pubkey,
    owner: Pubkey,
    lamports: u64,
    data: Vec<u8>,
    signer: bool,
    writable: bool,
    executable: bool,
}
impl Account {
    fn wallet(key: Pubkey, signer: bool, writable: bool) -> Self {
        Self {
            key,
            owner: system_program::id(),
            lamports: 10_000_000,
            data: vec![],
            signer,
            writable,
            executable: false,
        }
    }
    fn state<T: FixedAccount>(
        key: Pubkey,
        program: Pubkey,
        value: &T,
        writable: bool,
        extra: u64,
    ) -> Self {
        Self {
            key,
            owner: program,
            lamports: Rent::default().minimum_balance(T::LEN) + extra,
            data: value.encode().unwrap(),
            signer: false,
            writable,
            executable: false,
        }
    }
    fn info(&mut self) -> AccountInfo<'_> {
        AccountInfo::new(
            &self.key,
            self.signer,
            self.writable,
            &mut self.lamports,
            &mut self.data,
            &self.owner,
            self.executable,
            0,
        )
    }
}
struct Fixture {
    program: Pubkey,
    m: Market,
    s: Series,
    u: Unit,
    p: Match,
    series_key: Pubkey,
    unit_key: Pubkey,
    primary_key: Pubkey,
}
impl Fixture {
    fn new() -> Self {
        let program = key(90);
        let mut m = market();
        m.market = Pubkey::find_program_address(
            &[b"axp-mkt-v2", m.initializer.as_ref(), &m.market_nonce],
            &program,
        )
        .0;
        let mut s = series();
        s.market = m.market;
        let series_key = Pubkey::find_program_address(
            &[b"axp-series-v2", m.market.as_ref(), &s.series_id],
            &program,
        )
        .0;
        let mut u = unit();
        u.market = m.market;
        u.series = series_key;
        u.unit_id = domain::unit_id(&series_key, 0);
        let unit_key = Pubkey::find_program_address(
            &[b"axp-unit-v2", m.market.as_ref(), &u.unit_id],
            &program,
        )
        .0;
        let mut p = primary();
        p.market = m.market;
        p.unit = unit_key;
        p.series = series_key;
        let primary_key = Pubkey::find_program_address(
            &[b"axp-match-v2", m.market.as_ref(), &p.match_id],
            &program,
        )
        .0;
        u.state = Unit::FUNDED_OPEN;
        u.owner = m.buyer_b;
        u.cursor = 2;
        u.transfer_count = 1;
        u.primary_match = primary_key;
        u.latest_match = key(91);
        u.refund_face = p.gross;
        Self {
            program,
            m,
            s,
            u,
            p,
            series_key,
            unit_key,
            primary_key,
        }
    }
    fn d(&self) -> [u8; 32] {
        domain::domain(&self.m.genesis, &self.program, &self.m.market)
    }
    fn lock(&mut self) {
        self.u.state = Unit::DELIVERY_LOCKED;
        self.u.lock_start_cursor = self.u.cursor;
        self.u.cursor += 1;
        self.u.lock_start_slot = 99;
        self.u.lock_deadline_slot = 249;
        self.u.request_hash = [55; 32];
    }
    fn terminal_accounts(&self, refund: bool) -> Vec<Account> {
        let mut result = vec![
            Account::wallet(self.m.gateway, true, true),
            Account::state(self.m.market, self.program, &self.m, false, 0),
            Account::state(self.series_key, self.program, &self.s, false, 0),
            Account::state(self.unit_key, self.program, &self.u, true, 0),
            Account::state(
                self.primary_key,
                self.program,
                &self.p,
                true,
                self.p.gross + 17,
            ),
            Account::wallet(
                if refund {
                    domain::refund_recipient(&self.u).unwrap()
                } else {
                    self.m.issuer
                },
                false,
                true,
            ),
        ];
        if !refund {
            result.push(Account::wallet(self.m.fee_collector, false, true));
        }
        result
    }
    fn start_accounts(&self) -> Vec<Account> {
        vec![
            Account::wallet(self.u.owner, true, true),
            Account::state(self.m.market, self.program, &self.m, false, 0),
            Account::state(self.series_key, self.program, &self.s, false, 0),
            Account::state(self.unit_key, self.program, &self.u, true, 0),
        ]
    }
}
fn execute(
    program: &Pubkey,
    accounts: &mut [Account],
    instruction: &Instruction,
    slot: u64,
) -> Result<(), solana_program::program_error::ProgramError> {
    let _lock = SYSCALL_LOCK.lock().unwrap();
    let _restore = Restore(Some(set_syscall_stubs(Box::new(Sysvars { slot }))));
    let infos = accounts.iter_mut().map(Account::info).collect::<Vec<_>>();
    process_instruction(program, &infos, &instruction.encode().unwrap())
}
fn snapshot(accounts: &[Account]) -> Vec<(u64, Vec<u8>)> {
    accounts
        .iter()
        .map(|a| (a.lamports, a.data.clone()))
        .collect()
}
fn terminal_instruction(f: &Fixture, tag: u8) -> Instruction {
    let expected = f.u.cursor;
    Instruction {
        operation_id: if tag == 8 {
            domain::expiry_operation(&f.d(), &f.unit_key, expected)
        } else {
            domain::delivery_operation(&f.d(), tag, &f.unit_key, &f.u.request_hash)
        },
        action: match tag {
            5 => Action::FinalizeDelivery {
                expected_locked_cursor: expected,
                request_hash: f.u.request_hash,
                response_hash: [56; 32],
            },
            6 => Action::RefundFailure {
                expected_locked_cursor: expected,
                request_hash: f.u.request_hash,
            },
            7 => Action::TimeoutRefund {
                expected_locked_cursor: expected,
                request_hash: f.u.request_hash,
            },
            8 => Action::ExpireUnused {
                expected_cursor: expected,
            },
            _ => unreachable!(),
        },
    }
}
#[test]
fn direct_owner_start_needs_no_matcher_and_recovers_after_deadline() {
    let f = Fixture::new();
    let nonce = [65; 32];
    let request = domain::hash(&[&domain::delivery_request(
        &f.d(),
        &f.u.owner,
        &nonce,
        &f.unit_key,
        f.u.cursor,
        &f.series_key,
        &f.s.resource_hash,
    )]);
    let instruction = Instruction {
        operation_id: domain::delivery_operation(&f.d(), 4, &f.unit_key, &request),
        action: Action::StartDelivery {
            expected_cursor: f.u.cursor,
            request_nonce: nonce,
            request_hash: request,
        },
    };
    let mut a = f.start_accounts();
    let balances = a.iter().map(|a| a.lamports).collect::<Vec<_>>();
    execute(&f.program, &mut a, &instruction, 99).unwrap();
    let locked = Unit::decode(&a[3].data).unwrap();
    assert_eq!(
        (
            locked.state,
            locked.cursor,
            locked.lock_start_cursor,
            locked.lock_deadline_slot
        ),
        (2, 3, 2, 249)
    );
    assert_eq!(a.iter().map(|a| a.lamports).collect::<Vec<_>>(), balances);
    let saved = snapshot(&a);
    execute(&f.program, &mut a, &instruction, 1000).unwrap();
    assert_eq!(snapshot(&a), saved);
}
#[test]
fn wrong_owner_wrong_signer_stale_cursor_and_useby_equality_have_no_effect() {
    for variation in 0..4 {
        let f = Fixture::new();
        let nonce = [65; 32];
        let cursor = if variation == 2 { 1 } else { f.u.cursor };
        let request = domain::hash(&[&domain::delivery_request(
            &f.d(),
            &f.u.owner,
            &nonce,
            &f.unit_key,
            cursor,
            &f.series_key,
            &f.s.resource_hash,
        )]);
        let instruction = Instruction {
            operation_id: domain::delivery_operation(&f.d(), 4, &f.unit_key, &request),
            action: Action::StartDelivery {
                expected_cursor: cursor,
                request_nonce: nonce,
                request_hash: request,
            },
        };
        let mut a = f.start_accounts();
        if variation == 0 {
            a[0].key = f.m.buyer_a;
        }
        if variation == 1 {
            a[0].signer = false;
        }
        let saved = snapshot(&a);
        assert!(execute(
            &f.program,
            &mut a,
            &instruction,
            if variation == 3 { 100 } else { 99 }
        )
        .is_err());
        assert_eq!(snapshot(&a), saved);
    }
}
#[test]
fn host_finalize_moves_only_primary_principal_and_replay_pays_nothing() {
    let mut f = Fixture::new();
    f.lock();
    let instruction = terminal_instruction(&f, 5);
    let mut a = f.terminal_accounts(false);
    let before = a.iter().map(|a| a.lamports).collect::<Vec<_>>();
    execute(&f.program, &mut a, &instruction, 248).unwrap();
    assert_eq!(a[4].lamports, before[4] - 10000);
    assert_eq!(a[5].lamports, before[5] + 9900);
    assert_eq!(a[6].lamports, before[6] + 100);
    assert_eq!(
        a[4].lamports,
        f.p.rent_reserve + 17,
        "unsolicited surplus is retained"
    );
    let consumed = Unit::decode(&a[3].data).unwrap();
    let primary = Match::decode(&a[4].data).unwrap();
    assert_eq!(
        (
            consumed.state,
            consumed.cursor,
            primary.state,
            primary.terminal_recipient
        ),
        (3, 4, 2, f.m.issuer)
    );
    assert_eq!(primary.fee, 100);
    let saved = snapshot(&a);
    execute(&f.program, &mut a, &instruction, 1000).unwrap();
    assert_eq!(snapshot(&a), saved);
}
#[test]
fn current_holder_refund_and_sponsor_refund_each_preserve_quoted_fee() {
    for sponsored in [false, true] {
        let mut f = Fixture::new();
        if sponsored {
            f.u.sponsored = 1;
            f.u.transfer_count = 0;
            f.u.owner = f.m.buyer_a;
            f.u.sponsor_refund_key = f.m.sponsor;
            f.p.trade_kind = 2;
            f.p.payer = f.m.sponsor;
            f.p.beneficiary = f.m.buyer_a;
        }
        f.lock();
        let instruction = terminal_instruction(&f, 6);
        let mut a = f.terminal_accounts(true);
        let before = a[5].lamports;
        execute(&f.program, &mut a, &instruction, 150).unwrap();
        assert_eq!(a[5].lamports, before + 10000);
        let receipt = Match::decode(&a[4].data).unwrap();
        assert_eq!(
            receipt.terminal_recipient,
            if sponsored { f.m.sponsor } else { f.m.buyer_b }
        );
        assert_eq!(
            (receipt.fee, receipt.earned_fee(), receipt.state),
            (100, 0, 3)
        );
        let saved = snapshot(&a);
        execute(&f.program, &mut a, &instruction, 1000).unwrap();
        assert_eq!(snapshot(&a), saved);
    }
}
#[test]
fn wrong_historical_refund_recipient_foreign_or_readonly_accounts_reject_before_effects() {
    for variation in 0..4 {
        let mut f = Fixture::new();
        f.lock();
        let instruction = terminal_instruction(&f, 6);
        let mut a = f.terminal_accounts(true);
        match variation {
            0 => a[5].key = f.m.buyer_a,
            1 => a[4].owner = key(222),
            2 => a[5].writable = false,
            3 => a[3].key = key(223),
            _ => unreachable!(),
        }
        let saved = snapshot(&a);
        assert!(execute(&f.program, &mut a, &instruction, 150).is_err());
        assert_eq!(snapshot(&a), saved);
    }
}
#[test]
fn finalization_timeout_and_expiry_boundaries_are_exact() {
    let mut f = Fixture::new();
    f.lock();
    let mut a = f.terminal_accounts(false);
    let saved = snapshot(&a);
    assert!(execute(&f.program, &mut a, &terminal_instruction(&f, 5), 249).is_err());
    assert_eq!(snapshot(&a), saved);
    let mut a = f.terminal_accounts(true);
    let saved = snapshot(&a);
    assert!(execute(&f.program, &mut a, &terminal_instruction(&f, 7), 248).is_err());
    assert_eq!(snapshot(&a), saved);
    execute(&f.program, &mut a, &terminal_instruction(&f, 7), 249).unwrap();
    assert_eq!(Unit::decode(&a[3].data).unwrap().terminal_reason, 3);
    let f = Fixture::new();
    let mut a = f.terminal_accounts(false);
    let saved = snapshot(&a);
    assert!(execute(&f.program, &mut a, &terminal_instruction(&f, 8), 99).is_err());
    assert_eq!(snapshot(&a), saved);
    execute(&f.program, &mut a, &terminal_instruction(&f, 8), 100).unwrap();
    assert_eq!(Unit::decode(&a[3].data).unwrap().state, Unit::EXPIRED);
}
#[test]
fn locked_unit_cannot_expire_and_sibling_terminal_actions_conflict() {
    let mut f = Fixture::new();
    f.lock();
    let mut a = f.terminal_accounts(false);
    let saved = snapshot(&a);
    assert!(execute(&f.program, &mut a, &terminal_instruction(&f, 8), 500).is_err());
    assert_eq!(snapshot(&a), saved);
    let mut a = f.terminal_accounts(true);
    execute(&f.program, &mut a, &terminal_instruction(&f, 6), 150).unwrap();
    let saved = snapshot(&a);
    assert_eq!(
        execute(&f.program, &mut a, &terminal_instruction(&f, 7), 500),
        Err(MarketError::TerminalConflict.into())
    );
    assert_eq!(snapshot(&a), saved);
}
#[test]
fn intentional_duplicate_wallet_roles_use_union_flags_but_state_aliases_do_not_gain_authority() {
    let mut wallet = Account::wallet(key(9), true, true);
    let info = wallet.info();
    assert!(validate_metas(
        &[info.clone(), info.clone()],
        &[(true, true), (true, false)]
    )
    .is_ok());
    assert!(validate_metas(&[info.clone()], &[(false, false)]).is_err());
    assert!(validate_metas(&[], &[(true, true)]).is_err());
}

fn fund_case(f: &Fixture, kind: u8, minimum: u8) -> (Vec<Account>, Instruction) {
    use axp_machine_market_program::instruction::Fund;
    let payer = if kind == 2 {
        f.m.sponsor
    } else if kind == 1 {
        f.m.buyer_b
    } else {
        f.m.buyer_a
    };
    let beneficiary = if kind == 1 { f.m.buyer_b } else { f.m.buyer_a };
    let seller = if kind == 1 { f.u.owner } else { f.m.issuer };
    let buy_nonce = [70; 32];
    let sell_nonce = [71; 32];
    let id = domain::match_id(
        &f.d(),
        &domain::order_id(&f.d(), &beneficiary, &buy_nonce),
        &domain::order_id(&f.d(), &seller, &sell_nonce),
        &f.unit_key,
        f.u.cursor,
        10000,
        kind,
    );
    let receipt =
        Pubkey::find_program_address(&[b"axp-match-v2", f.m.market.as_ref(), &id], &f.program).0;
    let buy_use = Pubkey::find_program_address(
        &[
            b"axp-order-v2",
            f.m.market.as_ref(),
            beneficiary.as_ref(),
            &buy_nonce,
        ],
        &f.program,
    )
    .0;
    let sell_use = Pubkey::find_program_address(
        &[
            b"axp-order-v2",
            f.m.market.as_ref(),
            seller.as_ref(),
            &sell_nonce,
        ],
        &f.program,
    )
    .0;
    let fresh = |key| Account {
        key,
        owner: system_program::id(),
        lamports: 0,
        data: vec![],
        signer: false,
        writable: true,
        executable: false,
    };
    let mut a = vec![
        Account::wallet(payer, true, true),
        Account::wallet(beneficiary, true, kind != 2),
        Account::wallet(seller, true, true),
        Account::wallet(f.m.matcher, true, true),
        Account::wallet(f.m.fee_collector, false, true),
        Account::state(f.m.market, f.program, &f.m, true, 0),
        Account::state(f.series_key, f.program, &f.s, false, 0),
        Account::state(f.unit_key, f.program, &f.u, true, 0),
        fresh(receipt),
        fresh(buy_use),
        fresh(sell_use),
        Account {
            key: system_program::id(),
            owner: key(255),
            lamports: 0,
            data: vec![],
            signer: false,
            writable: false,
            executable: true,
        },
    ];
    if kind == 1 {
        a.push(Account::state(
            f.primary_key,
            f.program,
            &f.p,
            false,
            f.p.gross,
        ));
    }
    let p = Fund {
        match_id: id,
        expected_cursor: f.u.cursor,
        buy_nonce,
        sell_nonce,
        buy_auth_hash: [72; 32],
        sell_auth_hash: [73; 32],
        gross: 10000,
        buyer_limit: 12000,
        seller_limit: 9000,
        buyer_valid_until: 100,
        seller_valid_until: 100,
        min_remaining_after: minimum,
        funding_kind: kind,
        expected_refund_face: if kind == 1 { f.u.refund_face } else { 0 },
        packet_hash: if kind == 2 { [74; 32] } else { ZERO },
        campaign_id: if kind == 2 { [75; 32] } else { ZERO },
    };
    (
        a,
        Instruction {
            operation_id: domain::operation_id(&f.d(), 3, &id),
            action: Action::Fund(p),
        },
    )
}
fn issuer_open_fixture() -> Fixture {
    let mut f = Fixture::new();
    f.u.state = Unit::ISSUER_OPEN;
    f.u.owner = f.m.issuer;
    f.u.cursor = 0;
    f.u.transfer_count = 0;
    f.u.primary_match = Pubkey::default();
    f.u.latest_match = Pubkey::default();
    f.u.refund_face = 0;
    f
}
#[test]
fn native_fund_refuses_impossible_primary_or_sponsored_minimum_before_pda_or_debit() {
    for sponsored in [false, true] {
        let mut f = issuer_open_fixture();
        if !sponsored {
            f.s.transferable = 0;
            f.s.max_transfers = 0;
            f.s.terms_hash = domain::series_terms(&f.s);
        }
        let (mut a, instruction) = fund_case(&f, if sponsored { 2 } else { 0 }, 1);
        let saved = snapshot(&a);
        assert_eq!(
            execute(&f.program, &mut a, &instruction, 50),
            Err(MarketError::Incompatible.into())
        );
        assert_eq!(snapshot(&a), saved);
        assert!(a[8].data.is_empty() && a[9].data.is_empty() && a[10].data.is_empty());
    }
}
#[test]
fn native_secondary_zero_minimum_does_not_enable_fourth_resale() {
    let mut f = Fixture::new();
    f.u.owner = f.m.buyer_a;
    f.u.transfer_count = 3;
    f.u.cursor = 4;
    let (mut a, instruction) = fund_case(&f, 1, 0);
    let saved = snapshot(&a);
    assert_eq!(
        execute(&f.program, &mut a, &instruction, 50),
        Err(MarketError::Incompatible.into())
    );
    assert_eq!(snapshot(&a), saved);
}
#[test]
fn canonical_filled_receipt_replays_after_later_owner_and_terminal_without_payment() {
    use axp_machine_market_program::state::OrderUse;
    let f = issuer_open_fixture();
    let (mut a, instruction) = fund_case(&f, 0, 0);
    let Action::Fund(p) = &instruction.action else {
        unreachable!()
    };
    let semantic = [
        a[5].key,
        a[6].key,
        a[7].key,
        a[0].key,
        a[1].key,
        a[2].key,
        a[3].key,
        a[4].key,
        a[9].key,
        a[10].key,
        Pubkey::default(),
    ];
    let mut receipt = f.p.clone();
    receipt.match_id = p.match_id;
    receipt.fund_terms_hash = domain::fund_terms(&instruction.encode().unwrap(), &semantic);
    receipt.buy_nonce = p.buy_nonce;
    receipt.sell_nonce = p.sell_nonce;
    receipt.buy_auth_hash = p.buy_auth_hash;
    receipt.sell_auth_hash = p.sell_auth_hash;
    receipt.state = Match::PRIMARY_SETTLED;
    receipt.terminal_op_hash = [99; 32];
    receipt.terminal_slot = 80;
    receipt.terminal_recipient = f.m.issuer;
    a[8] = Account::state(a[8].key, f.program, &receipt, true, 17);
    for (index, actor, nonce, auth) in [
        (9, f.m.buyer_a, p.buy_nonce, p.buy_auth_hash),
        (10, f.m.issuer, p.sell_nonce, p.sell_auth_hash),
    ] {
        a[index] = Account::state(
            a[index].key,
            f.program,
            &OrderUse {
                state: 1,
                market: f.m.market,
                actor,
                nonce,
                auth_hash: auth,
                matched: a[8].key,
                consumed_slot: 1,
            },
            true,
            0,
        );
    }
    let mut later = f.u.clone();
    later.state = Unit::CONSUMED;
    later.owner = f.m.buyer_b;
    later.cursor = 4;
    later.transfer_count = 1;
    later.primary_match = a[8].key;
    later.latest_match = key(94);
    later.refund_face = 10000;
    later.terminal_reason = 1;
    a[7] = Account::state(f.unit_key, f.program, &later, true, 0);
    let saved = snapshot(&a);
    execute(&f.program, &mut a, &instruction, 1000).unwrap();
    assert_eq!(snapshot(&a), saved);
    let mut altered = instruction.clone();
    if let Action::Fund(p) = &mut altered.action {
        p.buyer_limit += 1;
    }
    assert!(execute(&f.program, &mut a, &altered, 1000).is_err());
    assert_eq!(snapshot(&a), saved);
    let mut used = OrderUse::decode(&a[9].data).unwrap();
    used.auth_hash = [101; 32];
    a[9].data = used.encode().unwrap();
    assert_eq!(
        execute(&f.program, &mut a, &instruction, 1000),
        Err(MarketError::NonceConflict.into())
    );
}
