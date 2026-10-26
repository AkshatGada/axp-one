/** Lead-invoked finite local acceptance. Import/--help performs no external effect. */
import { readFileSync, writeFileSync, openSync, closeSync, fsyncSync, statfsSync, realpathSync } from 'node:fs';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical } from '../../packages/contracts/index.mjs';
import { canonicalBase64, decodeInstruction, decimal, publicKeyBytes, ZERO_KEY } from '../../packages/machine-market/native/codec.mjs';
import { domainHash, operationId, sha256 } from '../../packages/machine-market/native/domain.mjs';
import { localEndpoint } from '../../packages/machine-market/native/rpc.mjs';
import { PACKET_SHA256, LIMITS, UNITS, SERIES, REQUIRED_PROOFS, validateSchedule, hash, scheduleIdentity, budgetUsage, stableIdentity } from './phase2-acceptance-schedule.mjs';
import { openAcceptanceJournal, containedPath } from './phase2-acceptance-journal.mjs';
import { assertPublicEvidence, summarizeAcceptance } from './phase2-acceptance-evidence.mjs';
import { createAcceptanceSponsorship } from './phase2-acceptance-sponsor.mjs';
import { createAcceptanceCrashController } from './phase2-acceptance-crash.mjs';
import { createConcreteAcceptancePlan } from './phase2-acceptance-plan.mjs';
import { createScenarioRuntime, captureNativeEvidence } from './phase2-acceptance-runtime.mjs';
export { validateSchedule, UNITS, SERIES, LIMITS, REQUIRED_PROOFS };
const root = fileURLToPath(new URL('../../', import.meta.url));
const packet = join(root, 'docs/machine-market/architecture/review-packets/v2-review-2026-10-26-03');
import { DEFAULT_PROOFS, verifyDefaultCases } from './phase2-acceptance-verification.mjs';
function demand(condition, code) {
    if (!condition)
        throw Error(code);
}
export function validateRunConfiguration(config) {
    demand(config?.schema === 'axp.market.acceptance.run.v1' && config.packetSha256 === PACKET_SHA256, 'RUN_CONFIG');
    demand(typeof config.runId === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(config.runId), 'RUN_IDENTITY');
    localEndpoint(config.endpoint);
    localEndpoint(config.serviceOrigin);
    domainHash(config.run);
    demand(typeof config.programSha256 === 'string' && /^[a-f0-9]{64}$/.test(config.programSha256), 'PROGRAM_IDENTITY');
    for (const role of ['initializer', 'matcher', 'gateway', 'collector', 'issuer', 'buyerA', 'buyerB', 'sponsor'])
        publicKeyBytes(config.run[role]);
    demand(Array.isArray(config.bootstrapAttempts) && config.bootstrapAttempts.length >= 13 && config.bootstrapAttempts.length <= 19 && config.bootstrapAttempts.every(row => typeof row.id === 'string' && row.state === 'Signed' && row.status === 'finalized-success' && typeof row.signature === 'string'), 'BOOTSTRAP_NOT_FINALIZED');
    demand(Array.isArray(config.units) && config.units.length === 8 && new Set(config.units.map(row => row.address)).size === 8, 'RUN_UNITS');
    demand(Array.isArray(config.series) && config.series.length === 4, 'RUN_SERIES');
    for (const expected of SERIES) {
        const actual = config.series.find(row => row.id === expected.id);
        demand(actual && actual.cap === expected.cap && actual.transferable === expected.transferable && actual.maxTransfers === expected.maxTransfers, 'RUN_SERIES');
        publicKeyBytes(actual.address);
        decimal(actual.useBySlot);
        demand(/^[a-f0-9]{64}$/.test(actual.resourceHash), 'RESOURCE_HASH');
    }
    decimal(config.readValidUntilSlot);
    for (const expected of UNITS) {
        const actual = config.units.find(row => row.id === expected.id);
        demand(actual && actual.series === expected.series, 'RUN_UNIT_BINDING');
    }
    return config;
}
function verifyPacket() {
    const manifestBytes = readFileSync(join(packet, 'MANIFEST_V2.json'));
    demand(hash(manifestBytes) === PACKET_SHA256, 'PACKET_CHANGED');
    const manifest = JSON.parse(manifestBytes);
    for (const row of [...manifest.documents, manifest.handoff, manifest.exact_diff, manifest.preservation_record, ...manifest.review_inputs])
        demand(hash(readFileSync(join(root, row.path))) === row.sha256, 'PACKET_CHANGED');
}
function publicRun(config) {
    return {
        runId: config.runId,
        genesis: config.run.genesis,
        program: config.run.program,
        market: config.run.market,
        programSha256: config.programSha256,
        scheduleHash: scheduleIdentity(),
        asset: 'LOCAL_SOL',
        authority: 'single-local-validator'
    };
}
/** Run only with the lead's verified, current native service/context. */
export async function runAcceptance({ configPath, context, resume = false, recoverStaleLock = false, execute = false } = {}) {
    demand(execute === true, 'EXPLICIT_EXECUTION_REQUIRED');
    verifyPacket();
    demand(context?.store?.native && context.rpc && context.service && context.observer, 'LEAD_CONTEXT_REQUIRED');
    configPath = containedPath(join(root, 'local-state/machine-market'), configPath);
    const config = validateRunConfiguration(JSON.parse(readFileSync(configPath, 'utf8')));
    context.signers ??= context.acceptanceProbeSigners ?? context.nativeSigners;
    demand(context.signers, 'OPAQUE_NATIVE_PROBE_HANDLES_REQUIRED');
    const privateRoot = realpathSync(config.privateRoot), canonicalPrivate = realpathSync(join(root, 'local-state/machine-market'));
    demand(privateRoot === canonicalPrivate || relative(canonicalPrivate, privateRoot) && !relative(canonicalPrivate, privateRoot).startsWith('..') && !isAbsolute(relative(canonicalPrivate, privateRoot)), 'PRIVATE_PATH_REQUIRED');
    containedPath(privateRoot, configPath);
    const identity = publicRun(config);
    const verified = await context.rpc.inspectRun();
    demand(verified.genesis === config.run.genesis && verified.program === config.run.program && verified.market === config.run.market && verified.representation.programHash === config.programSha256, 'RUN_IDENTITY_MISMATCH');
    const disk = statfsSync(root, { bigint: true });
    demand(disk.bavail * disk.bsize >= 40000000000n, 'DISK_FLOOR');
    demand(context.launcher?.stop && context.launcher?.start && context.launcher?.waitExit, 'PROCESS_LAUNCHER_REQUIRED');
    const journal = openAcceptanceJournal({
        path: config.journalPath,
        privateRoot,
        identity,
        resume,
        recoverStaleLock,
        bootstrapAttempts: config.bootstrapAttempts ?? []
    });
    let concrete;
    try {
        context.sponsorship = createAcceptanceSponsorship({ config, signAuthorization: context.signAuthorization });
        context.crashController = createAcceptanceCrashController({
            launcher: context.launcher,
            config,
            markerDirectory: config.privateRoot,
            baseContext: context
        });
        const runtime = createScenarioRuntime({
            config,
            context,
            journal,
            resume
        });
        concrete = createConcreteAcceptancePlan({
            config,
            context,
            journal,
            runtime
        });
        if (journal.snapshot().stopped) {
            demand(resume, 'EXPLICIT_RESUME_REQUIRED');
            journal.clearStopForExactRecovery();
        }
        await concrete.beforeFunding();
        for (const definition of UNITS) {
            if (definition.id === 'U3') {
                demand(context.sponsorship?.campaignEnvelope && context.sponsorship?.consentEnvelope && context.sponsorship?.issuerEnvelope, 'SPONSOR_FIXTURE_REQUIRED');
                await runtime.step('U3:campaign', { kind: 'sponsor-mandate', authorizationHash: hash(context.sponsorship.campaignEnvelope.authorization) }, async () => {
                    const response = await runtime.http('/campaigns', context.sponsorship.campaignEnvelope);
                    return { evidence: [response.evidence], proofs: [] };
                });
                const binding = config.units.find(row => row.id === 'U3'), sponsor = context.sponsorship;
                await runtime.step('U3:sponsor', {
                    kind: 'sponsored-primary',
                    unit: binding.address,
                    consentHash: hash(sponsor.consentEnvelope.authorization),
                    issuerHash: hash(sponsor.issuerEnvelope.authorization)
                }, async () => {
                    const response = await concrete.sponsorFirst();
                    const captured = await runtime.settle(sponsor.operationId, { allowInitialExecution: true });
                    const unit = await runtime.unit('U3');
                    demand(unit.sponsored === 1 && unit.transferCount === 0 && unit.owner === config.run.buyerA && unit.refundFace === '10000', 'SPONSOR_TRANSFER_POLICY');
                    return { evidence: [response.evidence, captured.evidence], operationIds: [sponsor.operationId], proofs: [] };
                }, { operations: [sponsor.operationId], trade: true });
                await concrete.afterSponsor();
            }
            else
                for (let index = 0; index < definition.prices.length; index++) {
                    const handled = await concrete.beforeTrade(definition.id, index);
                    if (handled)
                        continue;
                    const actualSeller = definition.id === 'U6' && index === 1 ? ((await runtime.unit('U6')).owner === config.run.buyerA ? 'buyerA' : 'buyerB') : definition.path[index];
                    const actualBuyer = definition.id === 'U6' && index === 1 ? (actualSeller === 'buyerA' ? 'buyerB' : 'buyerA') : definition.path[index + 1];
                    const tradeResult = await runtime.trade(definition.id, index, actualSeller, actualBuyer, definition.prices[index], { incomingAsk: definition.id === 'U1' && index === 0 });
                    await concrete.afterTrade(definition.id, index, tradeResult);
                }
        }
        // Fund every timing right before waiting for its shared Series expiry. Complete
        // each gateway lease immediately; never start all leases then drain serially.
        const terminalOrder = ['U0', 'U1', 'U2', 'U3', 'U6', 'U7', 'U5', 'U4'];
        for (const label of terminalOrder) {
            const definition = UNITS.find(row => row.id === label);
            await concrete.beforeStart(definition.id);
            if (definition.id !== 'U4' && (await runtime.unit(definition.id)).state === 'FundedOpen')
                await runtime.start(definition.id);
            await concrete.afterStart(definition.id);
            await concrete.beforeTerminal(definition.id);
            if (['failure', 'sponsor-failure'].includes(definition.terminal)) {
                demand(typeof (context.acceptanceRepository ?? context.repository)?.makePublisherUnavailable === 'function', 'SOURCE_FAILURE_CONTROL_REQUIRED');
                await (context.acceptanceRepository ?? context.repository).makePublisherUnavailable({ unit: (await runtime.unit(definition.id)).address });
                try {
                    await runtime.process(definition.id, { failure: true });
                }
                finally {
                    demand(typeof (context.acceptanceRepository ?? context.repository)?.restorePublisher === 'function', 'SOURCE_RESTORE_CONTROL_REQUIRED');
                    await (context.acceptanceRepository ?? context.repository).restorePublisher({ unit: (await runtime.unit(definition.id)).address });
                }
            }
            else if (definition.terminal === 'expiry')
                await runtime.explicitTerminal(definition.id, 'ExpireUnused');
            else if (definition.terminal === 'timeout') {
                await runtime.explicitTerminal(definition.id, 'TimeoutRefund');
                await runtime.expectNoBytes(definition.id);
            }
            else {
                await runtime.process(definition.id);
                if (definition.id !== 'U7')
                    await runtime.read(definition.id);
            }
            await concrete.afterTerminal(definition.id);
            // All proofs above come from actual native transport or actual HTTP responses.
        }
        if (concrete.finish)
            await concrete.finish();
        await runtime.read('U0', { afterUseBy: true });
        await runtime.read('U7', { afterUseBy: true });
        const rows = Object.values(journal.snapshot().steps);
        const allEvidence = rows.flatMap(row => row.result?.evidence ?? []);
        demand((await context.store.native.listUnresolved()).length === 0, 'UNRESOLVED_NATIVE_OUTCOMES');
        // Default-case assertions are checked by this source's exact native verifier,
        // using stored native receipts/deltas, not counters or successful HTTP alone.
        const checked = await verifyDefaultCases({ config, context, journal: journal.snapshot() });
        demand(canonical([...checked.proofIds].sort()) === canonical([...DEFAULT_PROOFS].sort()) && checked.assertions.length > 0, 'DEFAULT_PROOF_COVERAGE');
        const defaultId = 'default:verified';
        journal.prepare(defaultId, { kind: 'native-schedule-verification', scheduleHash: scheduleIdentity() });
        journal.complete(defaultId, { evidence: [], proofs: checked.proofs });
        const snapshot = journal.snapshot(), result = summarizeAcceptance({
            identity,
            steps: Object.values(snapshot.steps),
            requiredProofs: REQUIRED_PROOFS,
            budget: budgetUsage(snapshot.attempts, snapshot.successfulTradeIds.length)
        });
        result.evidence = Object.values(snapshot.steps).map(row => ({ stepId: row.id, items: row.result?.evidence ?? [] }));
        result.evidenceHash = hash(result);
        assertPublicEvidence(result);
        if (config.publicOutput) {
            const output = containedPath(join(root, 'artifacts/machine-market/phase2'), config.publicOutput);
            const bytes = Buffer.from(canonical(result));
            demand(bytes.length <= 4 * 1024 * 1024, 'PUBLIC_ARTIFACT_CAP');
            const fd = openSync(output, 'w', 0o644);
            try {
                writeFileSync(fd, bytes);
                fsyncSync(fd);
            }
            finally {
                closeSync(fd);
            }
        }
        return result;
    }
    catch (error) {
        if (!journal.snapshot().stopped)
            journal.stop('ACCEPTANCE_NEEDS_REVIEW', []);
        throw error;
    }
    finally {
        concrete?.close();
        journal.close();
    }
}
const help = 'Usage: import {runAcceptance} from phase2-acceptance.mjs in the lead runner.\nPass {configPath, context, execute:true, resume?}. The lead owns all context/service/fixture setup.\n--help is read-only. There is no validator/bootstrap/reset/signing shortcut in this CLI.\n';
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    if (process.argv.length === 3 && process.argv[2] === '--help')
        process.stdout.write(help);
    else {
        process.stderr.write(help);
        process.exitCode = 2;
    }
}
