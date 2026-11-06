import finalRaw from './final.json'
import snapshotRaw from './accepted-snapshot.json'
import { formatUnitsExact, formatUnitsFixed } from '@/onchain-money'
import { STAGE_FOR_TRANSFER_STATUS, type ChargeStage } from '../stages'

/** Final sanitized public export of the recorded AXP local execution. Read-only; nothing here is live. */
export const evidence = finalRaw

/**
 * Earlier acceptance snapshot (observed before the batch completed). Kept as historical evidence: at that time
 * both transfers were only `received` and no batch proof existed. It is not a current state.
 */
export const snapshot = snapshotRaw
export const snapshotPayments = snapshotRaw.channels[0].payments

export const channel = evidence.channels[0]
export const payments = channel.payments
export const operations = channel.nativeOperations

/** The single Arc batch transaction both transfers share, or undefined if the proofs disagree. */
export const batch = (() => {
  const proofs = payments.map((p) => p.batchProof)
  const first = proofs[0]
  if (!first || proofs.some((p) => p?.transactionHash !== first.transactionHash)) return undefined
  return first
})()

/** Fallback display calculation if an older Studio export redacted a numeric fee field. */
export const derivedDepositFeeAtto = (): string | undefined => {
  const approve = operations.find((o) => o.kind === 'approve')?.receipt.feeAttoUSD
  if (!approve || !isNumeric(approve)) return undefined
  return (BigInt(evidence.totals.nativeFeeAttoUSD) - BigInt(approve)).toString()
}

/** USDC base units (6 decimals) shown with three decimals, e.g. 2000 -> "0.002". */
export const usdc3 = (baseUnits: string) => formatUnitsFixed(BigInt(baseUnits), evidence.network.decimals, 3)

/** attoUSD (18 decimals) as a plain USD decimal string. */
export const attoToUsd = (atto: string) => formatUnitsExact(BigInt(atto), 18)

export const isNumeric = (v: string) => /^[0-9]+$/.test(v)

export const explorerTx = (hash: string) => `${evidence.network.explorer}/tx/${hash}`
export const explorerAddress = (address: string) => `${evidence.network.explorer}/address/${address}`

export const shorten = (value: string, head = 8, tail = 6) => (value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`)

export type TransferStatus = keyof typeof STAGE_FOR_TRANSFER_STATUS

export const isTransferStatus = (v: unknown): v is TransferStatus => typeof v === 'string' && v in STAGE_FOR_TRANSFER_STATUS

export const stageForStatus = (status: TransferStatus): ChargeStage => STAGE_FOR_TRANSFER_STATUS[status]

export interface StageMeta {
  label: string
  tone: 'accepted' | 'final' | 'bad' | 'progress'
  detail: string
}

/** Honest labels: only a Gateway status of `completed` is batch-finalized. */
export const STAGE_META: Partial<Record<ChargeStage, StageMeta>> = {
  accepted: { label: 'Accepted (offchain)', tone: 'accepted', detail: 'Gateway has the authorization. Not an onchain transaction and not batch finality.' },
  batched: { label: 'In a batch', tone: 'progress', detail: 'Gateway placed it in a batch. Not final.' },
  confirmed: { label: 'Batch confirmed', tone: 'progress', detail: 'Gateway confirmed the batch. Wait for completed.' },
  finalized: { label: 'Batch-finalized', tone: 'final', detail: 'Gateway transfer status completed.' },
  failed: { label: 'Failed', tone: 'bad', detail: 'Gateway reports the transfer failed.' },
}

export const TONE_CLASS: Record<StageMeta['tone'], string> = {
  accepted: 'text-[var(--accent)] border-[rgba(172,198,233,0.5)]',
  progress: 'text-[var(--warn)] border-[rgba(233,196,106,0.45)]',
  final: 'text-[var(--success)] border-[rgba(141,216,159,0.5)]',
  bad: 'text-[var(--danger)] border-[rgba(232,109,122,0.5)]',
}
