//! Native Solana processor. All account creation and cash effects execute atomically
//! under the runtime; pure tests alone do not prove CPI or transaction atomicity.
use crate::{
    codec::{Bytes32, FixedAccount, ZERO},
    domain,
    error::{checked_add, require, MarketError, Result},
    instruction::{Action, Fund, Init, Instruction, IssueSeries},
    state::{
        Market, Match, OrderUse, Series, Unit, FEE_BPS, LEASE_SLOTS, MAX_GROSS, MAX_MATCHES,
        MAX_SERIES, MAX_TRANSFERS, MAX_UNITS,
    },
};
use solana_program::{
    account_info::AccountInfo,
    clock::Clock,
    program::{invoke, invoke_signed},
    pubkey::Pubkey,
    rent::Rent,
    system_instruction, system_program,
    sysvar::Sysvar,
};

const MARKET_SEED: &[u8] = b"axp-mkt-v2";
const SERIES_SEED: &[u8] = b"axp-series-v2";
const UNIT_SEED: &[u8] = b"axp-unit-v2";
const MATCH_SEED: &[u8] = b"axp-match-v2";
const ORDER_SEED: &[u8] = b"axp-order-v2";

// SBF has a per-function 4096-byte stack limit. Preserve the dispatcher/handler
// boundary under release LTO instead of folding handler account structs into the
// dispatcher's decoded-instruction frame. This changes no instruction semantics.
#[inline(never)]
pub fn process_instruction(
    program: &Pubkey,
    accounts: &[AccountInfo<'_>],
    data: &[u8],
) -> Result<()> {
    let instruction = Instruction::decode(data)?;
    match &instruction.action {
        Action::Init(p) => initialize(program, accounts, instruction.operation_id, p),
        Action::IssueSeries(p) => issue(program, accounts, instruction.operation_id, p),
        Action::RegisterUnit { series_id, serial } => register(
            program,
            accounts,
            instruction.operation_id,
            series_id,
            *serial,
        ),
        Action::Fund(p) => fund(program, accounts, instruction.operation_id, p, data),
        Action::StartDelivery {
            expected_cursor,
            request_nonce,
            request_hash,
        } => start(
            program,
            accounts,
            instruction.operation_id,
            *expected_cursor,
            request_nonce,
            request_hash,
        ),
        Action::FinalizeDelivery {
            expected_locked_cursor,
            request_hash,
            response_hash,
        } => terminal(
            program,
            accounts,
            5,
            instruction.operation_id,
            *expected_locked_cursor,
            request_hash,
            response_hash,
        ),
        Action::RefundFailure {
            expected_locked_cursor,
            request_hash,
        } => terminal(
            program,
            accounts,
            6,
            instruction.operation_id,
            *expected_locked_cursor,
            request_hash,
            &ZERO,
        ),
        Action::TimeoutRefund {
            expected_locked_cursor,
            request_hash,
        } => terminal(
            program,
            accounts,
            7,
            instruction.operation_id,
            *expected_locked_cursor,
            request_hash,
            &ZERO,
        ),
        Action::ExpireUnused { expected_cursor } => terminal(
            program,
            accounts,
            8,
            instruction.operation_id,
            *expected_cursor,
            &ZERO,
            &ZERO,
        ),
    }
}

/// Required roles are unioned by key because payer=beneficiary and a terminal
/// caller=recipient are intentional aliases. State accounts must remain distinct.
pub fn validate_metas(accounts: &[AccountInfo<'_>], roles: &[(bool, bool)]) -> Result<()> {
    require(accounts.len() == roles.len(), MarketError::InvalidInput)?;
    for info in accounts {
        let signer = accounts
            .iter()
            .enumerate()
            .any(|(j, other)| other.key == info.key && roles[j].0);
        let writable = accounts
            .iter()
            .enumerate()
            .any(|(j, other)| other.key == info.key && roles[j].1);
        require(
            info.is_signer == signer && info.is_writable == writable,
            MarketError::InvalidAuth,
        )?;
        require(
            !info.executable || *info.key == system_program::id(),
            MarketError::InvalidAuth,
        )?;
    }
    Ok(())
}
fn system(info: &AccountInfo<'_>) -> Result<()> {
    require(
        *info.key == system_program::id() && info.executable,
        MarketError::InvalidAuth,
    )
}
fn wallet(
    info: &AccountInfo<'_>,
    program: &Pubkey,
    rent: &Rent,
    require_reserve: bool,
) -> Result<()> {
    domain::valid_wallet_key(info.key, program)?;
    require(
        *info.owner == system_program::id() && info.data_is_empty() && !info.executable,
        MarketError::RecipientState,
    )?;
    if require_reserve {
        require(
            info.lamports() >= rent.minimum_balance(0),
            MarketError::RecipientState,
        )?;
    }
    Ok(())
}
fn can_debit(info: &AccountInfo<'_>, amount: u64, rent: &Rent) -> Result<()> {
    let remaining = info
        .lamports()
        .checked_sub(amount)
        .ok_or(MarketError::InsufficientAvailable)?;
    require(
        remaining >= rent.minimum_balance(0),
        MarketError::InsufficientAvailable,
    )
}
fn key(info: &AccountInfo<'_>, expected: &Pubkey) -> Result<()> {
    require(info.key == expected, MarketError::InvalidAuth)
}
fn pda(info: &AccountInfo<'_>, program: &Pubkey, seeds: &[&[u8]]) -> Result<u8> {
    let (expected, bump) = Pubkey::find_program_address(seeds, program);
    key(info, &expected)?;
    Ok(bump)
}
fn fresh(info: &AccountInfo<'_>) -> Result<()> {
    require(
        *info.owner == system_program::id() && info.data_is_empty() && !info.executable,
        MarketError::InvalidAuth,
    )?;
    require(info.lamports() == 0, MarketError::PrefundedPdaUnsupported)
}
fn read<T: FixedAccount>(info: &AccountInfo<'_>, program: &Pubkey, market: &Pubkey) -> Result<T> {
    require(
        info.owner == program && !info.executable,
        MarketError::InvalidAuth,
    )?;
    let value = T::decode(&info.try_borrow_data()?)?;
    require(value.market() == market, MarketError::RunMismatch)?;
    Ok(value)
}
fn write<T: FixedAccount>(info: &AccountInfo<'_>, value: &T) -> Result<()> {
    require(info.is_writable, MarketError::InvalidAuth)?;
    let encoded = value.encode()?;
    require(info.data_len() == encoded.len(), MarketError::InvalidInput)?;
    info.try_borrow_mut_data()?.copy_from_slice(&encoded);
    Ok(())
}
fn distinct_state(accounts: &[AccountInfo<'_>], indices: &[usize], program: &Pubkey) -> Result<()> {
    for (position, i) in indices.iter().enumerate() {
        require(
            *accounts[*i].key != system_program::id() && accounts[*i].key != program,
            MarketError::InvalidAuth,
        )?;
        for j in indices.iter().skip(position + 1) {
            require(
                accounts[*i].key != accounts[*j].key,
                MarketError::InvalidAuth,
            )?;
        }
        for (j, wallet) in accounts.iter().enumerate() {
            if !indices.contains(&j) {
                require(accounts[*i].key != wallet.key, MarketError::InvalidAuth)?;
            }
        }
    }
    Ok(())
}
fn state_not_wallet(info: &AccountInfo<'_>, m: &Market) -> Result<()> {
    let roles = [
        m.initializer,
        m.matcher,
        m.gateway,
        m.fee_collector,
        m.issuer,
        m.buyer_a,
        m.buyer_b,
        m.sponsor,
    ];
    require(!roles.contains(info.key), MarketError::InvalidAuth)
}
fn validate_roles(m: &Market, program: &Pubkey) -> Result<()> {
    let trading = [m.issuer, m.buyer_a, m.buyer_b, m.sponsor];
    let operating = [m.initializer, m.matcher, m.gateway];
    for (i, actor) in trading.iter().enumerate() {
        domain::valid_wallet_key(actor, program)?;
        for other in trading.iter().skip(i + 1) {
            require(actor != other, MarketError::InvalidAuth)?;
        }
        require(
            !operating.contains(actor) && *actor != m.fee_collector && *actor != m.market,
            MarketError::InvalidAuth,
        )?;
    }
    for actor in operating {
        domain::valid_wallet_key(&actor, program)?;
        require(actor != m.market, MarketError::InvalidAuth)?;
    }
    domain::valid_wallet_key(&m.fee_collector, program)?;
    require(
        !operating.contains(&m.fee_collector) && m.fee_collector != m.market,
        MarketError::InvalidAuth,
    )
}
fn market(info: &AccountInfo<'_>, program: &Pubkey) -> Result<Market> {
    let m: Market = read(info, program, info.key)?;
    pda(
        info,
        program,
        &[MARKET_SEED, m.initializer.as_ref(), &m.market_nonce],
    )?;
    validate_roles(&m, program)?;
    Ok(m)
}
fn series(info: &AccountInfo<'_>, program: &Pubkey, m: &Market) -> Result<Series> {
    state_not_wallet(info, m)?;
    let s: Series = read(info, program, &m.market)?;
    pda(
        info,
        program,
        &[SERIES_SEED, m.market.as_ref(), &s.series_id],
    )?;
    require(
        s.issuer == m.issuer && s.terms_hash == domain::series_terms(&s),
        MarketError::Incompatible,
    )?;
    Ok(s)
}
fn unit(
    info: &AccountInfo<'_>,
    program: &Pubkey,
    m: &Market,
    s: &Series,
    series_key: &Pubkey,
) -> Result<Unit> {
    state_not_wallet(info, m)?;
    let u: Unit = read(info, program, &m.market)?;
    pda(info, program, &[UNIT_SEED, m.market.as_ref(), &u.unit_id])?;
    require(
        u.series == *series_key
            && u.unit_id == domain::unit_id(series_key, u.serial)
            && u.serial < s.issued
            && u.serial < s.cap,
        MarketError::Incompatible,
    )?;
    require(
        u.transfer_count <= s.max_transfers && (u.sponsored == 0 || u.transfer_count == 0),
        MarketError::Incompatible,
    )?;
    if u.state == Unit::ISSUER_OPEN {
        require(
            u.owner == s.issuer
                && u.cursor == 0
                && u.transfer_count == 0
                && u.sponsored == 0
                && u.primary_match == Pubkey::default()
                && u.latest_match == Pubkey::default()
                && u.refund_face == 0,
            MarketError::Incompatible,
        )?;
    } else {
        require(
            m.is_buyer(&u.owner)
                && u.primary_match != Pubkey::default()
                && u.latest_match != Pubkey::default()
                && u.refund_face > 0
                && u.refund_face <= MAX_GROSS,
            MarketError::Incompatible,
        )?;
    }
    Ok(u)
}
fn matched(info: &AccountInfo<'_>, program: &Pubkey, market: &Pubkey) -> Result<Match> {
    let receipt: Match = read(info, program, market)?;
    pda(
        info,
        program,
        &[MATCH_SEED, market.as_ref(), &receipt.match_id],
    )?;
    require(
        (receipt.trade_kind == 1) == (receipt.state == Match::SECONDARY_SETTLED),
        MarketError::Incompatible,
    )?;
    Ok(receipt)
}
fn operation(actual: &Bytes32, expected: Bytes32) -> Result<()> {
    require(*actual == expected, MarketError::InvalidInput)
}

fn create<'a, T: FixedAccount>(
    payer: &AccountInfo<'a>,
    target: &AccountInfo<'a>,
    system_account: &AccountInfo<'a>,
    program: &Pubkey,
    rent: &Rent,
    seeds: &[&[u8]],
    value: &T,
) -> Result<u64> {
    let bump = pda(target, program, seeds)?;
    fresh(target)?;
    let lamports = rent.minimum_balance(T::LEN);
    let bump_seed = [bump];
    let mut signing_seeds = seeds.to_vec();
    signing_seeds.push(&bump_seed);
    invoke_signed(
        &system_instruction::create_account(
            payer.key,
            target.key,
            lamports,
            T::LEN as u64,
            program,
        ),
        &[payer.clone(), target.clone(), system_account.clone()],
        &[&signing_seeds],
    )?;
    require(
        target.owner == program && target.data_len() == T::LEN,
        MarketError::InvalidAuth,
    )?;
    write(target, value)?;
    Ok(lamports)
}
fn transfer<'a>(
    payer: &AccountInfo<'a>,
    recipient: &AccountInfo<'a>,
    system_account: &AccountInfo<'a>,
    amount: u64,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    invoke(
        &system_instruction::transfer(payer.key, recipient.key, amount),
        &[payer.clone(), recipient.clone(), system_account.clone()],
    )
}

#[inline(never)]
fn initialize(program: &Pubkey, a: &[AccountInfo<'_>], op: Bytes32, p: &Init) -> Result<()> {
    validate_metas(a, &[(true, true), (false, true), (false, false)])?;
    system(&a[2])?;
    distinct_state(a, &[1], program)?;
    pda(
        &a[1],
        program,
        &[MARKET_SEED, a[0].key.as_ref(), &p.market_nonce],
    )?;
    let m = Market {
        state: 1,
        market: *a[1].key,
        initializer: *a[0].key,
        market_nonce: p.market_nonce,
        genesis: p.genesis,
        matcher: p.matcher,
        gateway: p.gateway,
        fee_collector: p.collector,
        issuer: p.issuer,
        buyer_a: p.buyer_a,
        buyer_b: p.buyer_b,
        sponsor: p.sponsor,
        fee_bps: FEE_BPS,
        max_transfers: MAX_TRANSFERS,
        max_series: MAX_SERIES,
        max_units: MAX_UNITS,
        max_matches: MAX_MATCHES,
        issued_series: 0,
        issued_units: 0,
        funded_matches: 0,
        lease_slots: LEASE_SLOTS,
        max_gross: MAX_GROSS,
    };
    validate_roles(&m, program)?;
    let d = domain::domain(&m.genesis, program, a[1].key);
    operation(&op, domain::operation_id(&d, 0, &p.market_nonce))?;
    if a[1].owner == program {
        let mut existing = market(&a[1], program)?;
        existing.issued_series = 0;
        existing.issued_units = 0;
        existing.funded_matches = 0;
        return require(existing == m, MarketError::Incompatible);
    }
    let rent = Rent::get()?;
    wallet(&a[0], program, &rent, true)?;
    can_debit(&a[0], rent.minimum_balance(Market::LEN), &rent)?;
    create(
        &a[0],
        &a[1],
        &a[2],
        program,
        &rent,
        &[MARKET_SEED, a[0].key.as_ref(), &p.market_nonce],
        &m,
    )?;
    Ok(())
}
#[inline(never)]
fn issue(program: &Pubkey, a: &[AccountInfo<'_>], op: Bytes32, p: &IssueSeries) -> Result<()> {
    validate_metas(
        a,
        &[
            (true, false),
            (true, true),
            (false, true),
            (false, true),
            (false, false),
        ],
    )?;
    system(&a[4])?;
    distinct_state(a, &[2, 3], program)?;
    let mut m = market(&a[2], program)?;
    for info in &a[3..a.len() - 1] {
        state_not_wallet(info, &m)?;
    }
    key(&a[0], &m.issuer)?;
    key(&a[1], &m.matcher)?;
    let d = domain::domain(&m.genesis, program, a[2].key);
    operation(&op, domain::operation_id(&d, 1, &p.series_id))?;
    pda(
        &a[3],
        program,
        &[SERIES_SEED, a[2].key.as_ref(), &p.series_id],
    )?;
    let mut s = Series {
        state: 1,
        market: m.market,
        series_id: p.series_id,
        issuer: m.issuer,
        resource_hash: p.resource_hash,
        version_hash: p.version_hash,
        terms_hash: ZERO,
        format: p.format,
        use_by_slot: p.use_by_slot,
        sponsored_price: p.sponsored_price,
        cap: p.cap,
        issued: 0,
        max_transfers: p.max_transfers,
        transferable: p.transferable,
        content_bytes: p.content_bytes,
    };
    s.validate()?;
    s.terms_hash = domain::series_terms(&s);
    if a[3].owner == program {
        let mut existing = series(&a[3], program, &m)?;
        existing.issued = 0;
        return require(existing == s, MarketError::Incompatible);
    }
    domain::before(Clock::get()?.slot, s.use_by_slot)?;
    require(m.issued_series < MAX_SERIES, MarketError::Capacity)?;
    fresh(&a[3])?;
    let rent = Rent::get()?;
    wallet(&a[0], program, &rent, true)?;
    wallet(&a[1], program, &rent, true)?;
    can_debit(&a[1], rent.minimum_balance(Series::LEN), &rent)?;
    create(
        &a[1],
        &a[3],
        &a[4],
        program,
        &rent,
        &[SERIES_SEED, a[2].key.as_ref(), &p.series_id],
        &s,
    )?;
    m.issued_series = m
        .issued_series
        .checked_add(1)
        .ok_or(MarketError::Capacity)?;
    write(&a[2], &m)
}
#[inline(never)]
fn register(
    program: &Pubkey,
    a: &[AccountInfo<'_>],
    op: Bytes32,
    series_id: &Bytes32,
    serial: u16,
) -> Result<()> {
    validate_metas(
        a,
        &[
            (true, false),
            (true, true),
            (false, true),
            (false, true),
            (false, true),
            (false, false),
        ],
    )?;
    system(&a[5])?;
    distinct_state(a, &[2, 3, 4], program)?;
    let mut m = market(&a[2], program)?;
    for info in &a[3..a.len() - 1] {
        state_not_wallet(info, &m)?;
    }
    key(&a[0], &m.issuer)?;
    key(&a[1], &m.matcher)?;
    let mut s = series(&a[3], program, &m)?;
    require(s.series_id == *series_id, MarketError::Incompatible)?;
    let id = domain::unit_id(a[3].key, serial);
    pda(&a[4], program, &[UNIT_SEED, a[2].key.as_ref(), &id])?;
    let d = domain::domain(&m.genesis, program, a[2].key);
    operation(&op, domain::operation_id(&d, 2, &id))?;
    if a[4].owner == program {
        let existing = unit(&a[4], program, &m, &s, a[3].key)?;
        return require(
            existing.unit_id == id && existing.serial == serial,
            MarketError::Incompatible,
        );
    }
    domain::before(Clock::get()?.slot, s.use_by_slot)?;
    require(
        serial == s.issued && serial < s.cap,
        MarketError::Incompatible,
    )?;
    require(m.issued_units < MAX_UNITS, MarketError::Capacity)?;
    fresh(&a[4])?;
    let rent = Rent::get()?;
    wallet(&a[0], program, &rent, true)?;
    wallet(&a[1], program, &rent, true)?;
    can_debit(&a[1], rent.minimum_balance(Unit::LEN), &rent)?;
    let u = Unit {
        state: Unit::ISSUER_OPEN,
        market: m.market,
        series: *a[3].key,
        unit_id: id,
        serial,
        owner: s.issuer,
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
    };
    create(
        &a[1],
        &a[4],
        &a[5],
        program,
        &rent,
        &[UNIT_SEED, a[2].key.as_ref(), &id],
        &u,
    )?;
    s.issued = s.issued.checked_add(1).ok_or(MarketError::Capacity)?;
    m.issued_units = m.issued_units.checked_add(1).ok_or(MarketError::Capacity)?;
    write(&a[3], &s)?;
    write(&a[2], &m)
}

fn order_use(
    info: &AccountInfo<'_>,
    program: &Pubkey,
    market: &Pubkey,
    actor: &Pubkey,
    nonce: &Bytes32,
    auth: &Bytes32,
    match_key: &Pubkey,
) -> Result<()> {
    pda(
        info,
        program,
        &[ORDER_SEED, market.as_ref(), actor.as_ref(), nonce],
    )?;
    let used: OrderUse = read(info, program, market)?;
    require(
        used.actor == *actor
            && used.nonce == *nonce
            && used.auth_hash == *auth
            && used.matched == *match_key,
        MarketError::NonceConflict,
    )
}
#[inline(never)]
fn fund(
    program: &Pubkey,
    a: &[AccountInfo<'_>],
    op: Bytes32,
    p: &Fund,
    instruction_bytes: &[u8],
) -> Result<()> {
    let mut roles = vec![
        (true, true),
        (true, false),
        (true, true),
        (true, true),
        (false, true),
        (false, true),
        (false, false),
        (false, true),
        (false, true),
        (false, true),
        (false, true),
        (false, false),
    ];
    if p.funding_kind == 1 {
        roles.push((false, false));
    }
    validate_metas(a, &roles)?;
    system(&a[11])?;
    let mut state_indices = vec![5, 6, 7, 8, 9, 10];
    if p.funding_kind == 1 {
        state_indices.push(12);
    }
    distinct_state(a, &state_indices, program)?;
    let mut m = market(&a[5], program)?;
    for index in &state_indices {
        state_not_wallet(&a[*index], &m)?;
    }
    key(&a[3], &m.matcher)?;
    key(&a[4], &m.fee_collector)?;
    require(m.is_buyer(a[1].key), MarketError::InvalidAuth)?;
    let s = series(&a[6], program, &m)?;
    let mut u = unit(&a[7], program, &m, &s, a[6].key)?;
    let d = domain::domain(&m.genesis, program, a[5].key);
    operation(&op, domain::operation_id(&d, 3, &p.match_id))?;
    let expected_id = domain::match_id(
        &d,
        &domain::order_id(&d, a[1].key, &p.buy_nonce),
        &domain::order_id(&d, a[2].key, &p.sell_nonce),
        a[7].key,
        p.expected_cursor,
        p.gross,
        p.funding_kind,
    );
    require(p.match_id == expected_id, MarketError::InvalidInput)?;
    pda(
        &a[8],
        program,
        &[MATCH_SEED, a[5].key.as_ref(), &p.match_id],
    )?;
    pda(
        &a[9],
        program,
        &[
            ORDER_SEED,
            a[5].key.as_ref(),
            a[1].key.as_ref(),
            &p.buy_nonce,
        ],
    )?;
    pda(
        &a[10],
        program,
        &[
            ORDER_SEED,
            a[5].key.as_ref(),
            a[2].key.as_ref(),
            &p.sell_nonce,
        ],
    )?;
    let primary_key = if p.funding_kind == 1 {
        *a[12].key
    } else {
        Pubkey::default()
    };
    let terms = domain::fund_terms(
        instruction_bytes,
        &[
            *a[5].key,
            *a[6].key,
            *a[7].key,
            *a[0].key,
            *a[1].key,
            *a[2].key,
            *a[3].key,
            *a[4].key,
            *a[9].key,
            *a[10].key,
            primary_key,
        ],
    );

    // A committed immutable receipt wins before today's owner, cursor or deadline.
    // It still requires the original signers and both permanently consumed orders.
    if a[8].owner == program {
        let existing = matched(&a[8], program, &m.market)?;
        require(
            existing.fund_terms_hash == terms
                && existing.match_id == p.match_id
                && existing.unit == *a[7].key
                && existing.series == *a[6].key
                && existing.payer == *a[0].key
                && existing.beneficiary == *a[1].key
                && existing.seller == *a[2].key,
            MarketError::Incompatible,
        )?;
        order_use(
            &a[9],
            program,
            &m.market,
            a[1].key,
            &p.buy_nonce,
            &p.buy_auth_hash,
            a[8].key,
        )?;
        order_use(
            &a[10],
            program,
            &m.market,
            a[2].key,
            &p.sell_nonce,
            &p.sell_auth_hash,
            a[8].key,
        )?;
        if p.funding_kind == 1 {
            let primary = matched(&a[12], program, &m.market)?;
            key(&a[12], &u.primary_match)?;
            domain::validate_primary_claim(&primary, &u, a[7].key, a[6].key, &s.issuer)?;
        }
        return Ok(());
    }
    // A used nullifier is a permanent refusal, not a fresh account to overwrite.
    if a[9].owner == program || a[10].owner == program {
        return Err(MarketError::AlreadyUsed.into());
    }
    fresh(&a[8])?;
    fresh(&a[9])?;
    fresh(&a[10])?;
    require(m.funded_matches < MAX_MATCHES, MarketError::Capacity)?;
    let slot = Clock::get()?.slot;
    let (count_after, quoted_fee) = domain::validate_fund_bounds(p, &s, &u, slot)?;
    require(
        a[0].key != a[2].key && a[1].key != a[2].key,
        MarketError::SelfTrade,
    )?;
    if p.funding_kind == 2 {
        key(&a[0], &m.sponsor)?;
        require(
            a[0].key != a[1].key && a[2].key == &m.issuer,
            MarketError::InvalidAuth,
        )?;
    } else {
        require(
            a[0].key == a[1].key && m.is_buyer(a[0].key),
            MarketError::InvalidAuth,
        )?;
    }
    if p.funding_kind == 1 {
        key(&a[2], &u.owner)?;
        require(m.is_buyer(a[2].key), MarketError::InvalidAuth)?;
        key(&a[12], &u.primary_match)?;
        let primary = matched(&a[12], program, &m.market)?;
        domain::validate_primary_claim(&primary, &u, a[7].key, a[6].key, &s.issuer)?;
        require(
            primary.state == Match::PRIMARY_ESCROWED,
            MarketError::Incompatible,
        )?;
        require(
            a[12].lamports() >= checked_add(primary.rent_reserve, primary.gross)?,
            MarketError::InsufficientAvailable,
        )?;
        require(
            a[8].key != &u.latest_match && a[8].key != &u.primary_match,
            MarketError::Incompatible,
        )?;
    } else {
        key(&a[2], &m.issuer)?;
    }
    let rent = Rent::get()?;
    for info in &a[0..5] {
        wallet(info, program, &rent, true)?;
    }
    can_debit(&a[0], p.gross, &rent)?;
    let receipt_rent = rent.minimum_balance(Match::LEN);
    let total_rent = checked_add(
        receipt_rent,
        rent.minimum_balance(OrderUse::LEN)
            .checked_mul(2)
            .ok_or(MarketError::InvalidInput)?,
    )?;
    can_debit(&a[3], total_rent, &rent)?;
    let funded_cursor = domain::next_cursor(u.cursor)?;
    let primary_face = if p.funding_kind == 1 {
        u.refund_face
    } else {
        p.gross
    };
    let previous = if p.funding_kind == 1 {
        u.latest_match
    } else {
        Pubkey::default()
    };
    let receipt = Match {
        state: if p.funding_kind == 1 {
            Match::SECONDARY_SETTLED
        } else {
            Match::PRIMARY_ESCROWED
        },
        market: m.market,
        match_id: p.match_id,
        unit: *a[7].key,
        series: *a[6].key,
        expected_cursor: p.expected_cursor,
        funded_cursor,
        payer: *a[0].key,
        beneficiary: *a[1].key,
        seller: *a[2].key,
        buy_nonce: p.buy_nonce,
        sell_nonce: p.sell_nonce,
        buy_auth_hash: p.buy_auth_hash,
        sell_auth_hash: p.sell_auth_hash,
        gross: p.gross,
        fee: quoted_fee,
        trade_kind: p.funding_kind,
        packet_hash: p.packet_hash,
        campaign_id: p.campaign_id,
        fund_terms_hash: terms,
        funded_slot: slot,
        terminal_op_hash: if p.funding_kind == 1 { op } else { ZERO },
        terminal_slot: if p.funding_kind == 1 { slot } else { 0 },
        rent_reserve: receipt_rent,
        primary_claim_face: primary_face,
        terminal_recipient: if p.funding_kind == 1 {
            *a[2].key
        } else {
            Pubkey::default()
        },
        previous_match: previous,
    };
    let buy_use = OrderUse {
        state: 1,
        market: m.market,
        actor: *a[1].key,
        nonce: p.buy_nonce,
        auth_hash: p.buy_auth_hash,
        matched: *a[8].key,
        consumed_slot: slot,
    };
    let sell_use = OrderUse {
        state: 1,
        market: m.market,
        actor: *a[2].key,
        nonce: p.sell_nonce,
        auth_hash: p.sell_auth_hash,
        matched: *a[8].key,
        consumed_slot: slot,
    };
    create(
        &a[3],
        &a[8],
        &a[11],
        program,
        &rent,
        &[MATCH_SEED, a[5].key.as_ref(), &p.match_id],
        &receipt,
    )?;
    create(
        &a[3],
        &a[9],
        &a[11],
        program,
        &rent,
        &[
            ORDER_SEED,
            a[5].key.as_ref(),
            a[1].key.as_ref(),
            &p.buy_nonce,
        ],
        &buy_use,
    )?;
    create(
        &a[3],
        &a[10],
        &a[11],
        program,
        &rent,
        &[
            ORDER_SEED,
            a[5].key.as_ref(),
            a[2].key.as_ref(),
            &p.sell_nonce,
        ],
        &sell_use,
    )?;
    if p.funding_kind == 1 {
        transfer(
            &a[0],
            &a[2],
            &a[11],
            p.gross
                .checked_sub(quoted_fee)
                .ok_or(MarketError::InvalidInput)?,
        )?;
        transfer(&a[0], &a[4], &a[11], quoted_fee)?;
    } else {
        transfer(&a[0], &a[8], &a[11], p.gross)?;
    }
    if p.funding_kind != 1 {
        u.primary_match = *a[8].key;
        u.refund_face = p.gross;
        u.sponsored = u8::from(p.funding_kind == 2);
        u.sponsor_refund_key = if p.funding_kind == 2 {
            *a[0].key
        } else {
            Pubkey::default()
        };
    }
    u.owner = *a[1].key;
    u.cursor = funded_cursor;
    u.transfer_count = count_after;
    u.latest_match = *a[8].key;
    u.state = Unit::FUNDED_OPEN;
    m.funded_matches = m
        .funded_matches
        .checked_add(1)
        .ok_or(MarketError::Capacity)?;
    write(&a[7], &u)?;
    write(&a[5], &m)
}

#[inline(never)]
fn start(
    program: &Pubkey,
    a: &[AccountInfo<'_>],
    op: Bytes32,
    expected: u64,
    nonce: &Bytes32,
    request: &Bytes32,
) -> Result<()> {
    validate_metas(
        a,
        &[(true, true), (false, false), (false, false), (false, true)],
    )?;
    distinct_state(a, &[1, 2, 3], program)?;
    let m = market(&a[1], program)?;
    for info in &a[2..=3] {
        state_not_wallet(info, &m)?;
    }
    let s = series(&a[2], program, &m)?;
    let mut u = unit(&a[3], program, &m, &s, a[2].key)?;
    key(&a[0], &u.owner)?;
    require(m.is_buyer(a[0].key), MarketError::InvalidAuth)?;
    let d = domain::domain(&m.genesis, program, a[1].key);
    let exact_request = domain::hash(&[&domain::delivery_request(
        &d,
        &u.owner,
        nonce,
        a[3].key,
        expected,
        a[2].key,
        &s.resource_hash,
    )]);
    require(*request == exact_request, MarketError::InvalidAuth)?;
    operation(&op, domain::delivery_operation(&d, 4, a[3].key, request))?;
    // Recover the original lock/terminal even after useBy or the lease. Ownership
    // and the exact pre-start cursor still precede replay, including A->B->A.
    if matches!(
        u.state,
        Unit::DELIVERY_LOCKED | Unit::CONSUMED | Unit::REFUNDED
    ) && u.lock_start_cursor == expected
        && u.request_hash == *request
    {
        return Ok(());
    }
    require(!u.terminal(), MarketError::TerminalConflict)?;
    require(u.state == Unit::FUNDED_OPEN, MarketError::PendingSettlement)?;
    require(u.cursor == expected, MarketError::StaleCursor)?;
    let slot = Clock::get()?.slot;
    domain::before(slot, s.use_by_slot)?;
    let rent = Rent::get()?;
    wallet(&a[0], program, &rent, true)?;
    u.lock_start_cursor = u.cursor;
    u.cursor = domain::next_cursor(u.cursor)?;
    u.lock_start_slot = slot;
    u.lock_deadline_slot = checked_add(slot, LEASE_SLOTS)?;
    u.request_hash = *request;
    u.state = Unit::DELIVERY_LOCKED;
    write(&a[3], &u)
}

/// Program-owned escrow debit, never a System transfer out of the PDA. Compute all
/// destination balances before mutating, preserve stored rent/surplus and conserve.
fn distribute(
    primary_info: &AccountInfo<'_>,
    primary: &Match,
    recipients: &[(&AccountInfo<'_>, u64)],
) -> Result<()> {
    let sum = recipients
        .iter()
        .try_fold(0u64, |total, (_, amount)| checked_add(total, *amount))?;
    require(sum == primary.gross, MarketError::InvalidInput)?;
    let remaining = primary_info
        .lamports()
        .checked_sub(sum)
        .ok_or(MarketError::InsufficientAvailable)?;
    require(
        remaining >= primary.rent_reserve,
        MarketError::InsufficientAvailable,
    )?;
    for (i, (info, _)) in recipients.iter().enumerate() {
        require(info.key != primary_info.key, MarketError::InvalidAuth)?;
        for (other, _) in recipients.iter().skip(i + 1) {
            require(info.key != other.key, MarketError::InvalidAuth)?;
        }
    }
    let balances: Vec<u64> = recipients
        .iter()
        .map(|(info, amount)| checked_add(info.lamports(), *amount))
        .collect::<Result<_>>()?;
    **primary_info.try_borrow_mut_lamports()? = remaining;
    for ((info, _), balance) in recipients.iter().zip(balances) {
        **info.try_borrow_mut_lamports()? = balance;
    }
    Ok(())
}
#[inline(never)]
fn terminal(
    program: &Pubkey,
    a: &[AccountInfo<'_>],
    tag: u8,
    op: Bytes32,
    expected: u64,
    request: &Bytes32,
    response: &Bytes32,
) -> Result<()> {
    let payout = tag == 5 || tag == 8;
    let mut roles = vec![
        (true, true),
        (false, false),
        (false, false),
        (false, true),
        (false, true),
        (false, true),
    ];
    if payout {
        roles.push((false, true));
    }
    validate_metas(a, &roles)?;
    distinct_state(a, &[1, 2, 3, 4], program)?;
    let m = market(&a[1], program)?;
    for info in &a[2..=3] {
        state_not_wallet(info, &m)?;
    }
    let s = series(&a[2], program, &m)?;
    let mut u = unit(&a[3], program, &m, &s, a[2].key)?;
    state_not_wallet(&a[4], &m)?;
    key(&a[4], &u.primary_match)?;
    let mut primary = matched(&a[4], program, &m.market)?;
    domain::validate_primary_claim(&primary, &u, a[3].key, a[2].key, &s.issuer)?;
    if tag == 5 || tag == 6 {
        key(&a[0], &m.gateway)?;
    }
    if payout {
        key(&a[5], &s.issuer)?;
        key(&a[6], &m.fee_collector)?;
    } else {
        key(&a[5], &domain::refund_recipient(&u)?)?;
    }
    let d = domain::domain(&m.genesis, program, a[1].key);
    operation(
        &op,
        if tag == 8 {
            domain::expiry_operation(&d, a[3].key, expected)
        } else {
            domain::delivery_operation(&d, tag, a[3].key, request)
        },
    )?;
    let reason = match tag {
        5 => 1,
        6 => 2,
        7 => 3,
        8 => 4,
        _ => return Err(MarketError::InvalidInput.into()),
    };
    if u.terminal() {
        require(
            u.terminal_op_hash == op
                && primary.terminal_op_hash == op
                && u.terminal_reason == reason
                && primary.terminal_slot == u.terminal_slot
                && primary.terminal_recipient == *a[5].key
                && u.response_hash == *response
                && u.state
                    == if tag == 5 {
                        Unit::CONSUMED
                    } else if tag == 8 {
                        Unit::EXPIRED
                    } else {
                        Unit::REFUNDED
                    },
            MarketError::TerminalConflict,
        )?;
        if tag == 8 {
            require(
                u.cursor == domain::next_cursor(expected)? && u.state == Unit::EXPIRED,
                MarketError::StaleCursor,
            )?;
        } else {
            require(
                u.request_hash == *request
                    && domain::next_cursor(u.lock_start_cursor)? == expected
                    && u.cursor == domain::next_cursor(expected)?,
                MarketError::StaleCursor,
            )?;
        }
        require(
            primary.state
                == if payout {
                    Match::PRIMARY_SETTLED
                } else {
                    Match::PRIMARY_REFUNDED
                },
            MarketError::TerminalConflict,
        )?;
        return Ok(());
    }
    require(
        primary.state == Match::PRIMARY_ESCROWED,
        MarketError::TerminalConflict,
    )?;
    require(u.cursor == expected, MarketError::StaleCursor)?;
    let slot = Clock::get()?.slot;
    if tag == 8 {
        require(u.state == Unit::FUNDED_OPEN, MarketError::PendingSettlement)?;
        require(slot >= s.use_by_slot, MarketError::Incompatible)?;
    } else {
        require(
            u.state == Unit::DELIVERY_LOCKED
                && u.request_hash == *request
                && domain::next_cursor(u.lock_start_cursor)? == expected,
            MarketError::PendingSettlement,
        )?;
        if tag == 5 {
            domain::before(slot, u.lock_deadline_slot)?;
            require(*response != ZERO, MarketError::InvalidInput)?;
        }
        if tag == 7 {
            require(slot >= u.lock_deadline_slot, MarketError::Incompatible)?;
        }
    }
    let rent = Rent::get()?;
    wallet(&a[0], program, &rent, true)?;
    for info in &a[5..] {
        wallet(info, program, &rent, true)?;
    }
    require(
        primary.rent_reserve >= rent.minimum_balance(Match::LEN),
        MarketError::RecipientState,
    )?;
    // Advance/check all arithmetic before moving principal. Runtime atomicity also
    // rolls back any later account-write failure; no receipts are ever closed.
    let next = domain::next_cursor(u.cursor)?;
    if payout {
        distribute(
            &a[4],
            &primary,
            &[
                (
                    &a[5],
                    primary
                        .gross
                        .checked_sub(primary.fee)
                        .ok_or(MarketError::InvalidInput)?,
                ),
                (&a[6], primary.fee),
            ],
        )?;
    } else {
        distribute(&a[4], &primary, &[(&a[5], primary.gross)])?;
    }
    primary.state = if payout {
        Match::PRIMARY_SETTLED
    } else {
        Match::PRIMARY_REFUNDED
    };
    primary.terminal_op_hash = op;
    primary.terminal_slot = slot;
    primary.terminal_recipient = *a[5].key;
    u.cursor = next;
    u.state = if tag == 5 {
        Unit::CONSUMED
    } else if tag == 8 {
        Unit::EXPIRED
    } else {
        Unit::REFUNDED
    };
    u.terminal_op_hash = op;
    u.terminal_slot = slot;
    u.terminal_reason = reason;
    u.response_hash = *response;
    write(&a[4], &primary)?;
    write(&a[3], &u)
}
