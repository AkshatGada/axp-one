import { keccak256, type Hex } from 'viem'
import { isTransferStatus, payments, stageForStatus, type TransferStatus } from '@/evidence'
import type { ChargeStage } from '../stages'

/** Gateway testnet transfer index. Public, read-only GET; no key and no wallet involved. */
const GATEWAY_TRANSFERS = 'https://gateway-api-testnet.circle.com/v1/x402/transfers/'

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface GatewayTransferView {
  id: string
  status: TransferStatus
  stage: ChargeStage
  amountBaseUnits: string
  /** keccak256 of the EIP-3009 nonce. The raw nonce is dropped before it reaches the UI. */
  nonceHash: Hex | null
  /** Gateway's reported onchain batch transaction, or null when none is reported. */
  txHash: Hex | null
  sendingNetwork: string
  createdAt: string
  updatedAt: string
  checkedAt: string
}

const isHash = (v: unknown): v is Hex => typeof v === 'string' && /^0x[0-9a-fA-F]{64}$/.test(v)
const str = (v: unknown) => (typeof v === 'string' ? v : '')

export async function fetchGatewayTransfer(id: string, signal?: AbortSignal): Promise<GatewayTransferView> {
  const trimmed = id.trim()
  if (!UUID.test(trimmed) || !payments.some(p => p.transferId === trimmed)) throw new Error('This viewer only checks its recorded transfers.')
  const res = await fetch(`${GATEWAY_TRANSFERS}${encodeURIComponent(trimmed)}`, { method: 'GET', signal, cache: 'no-store' })
  if (res.status === 404) throw new Error('Gateway has no transfer with that ID on testnet.')
  if (!res.ok) throw new Error(`Gateway status check failed (HTTP ${res.status}).`)
  const body = (await res.json()) as Record<string, unknown>
  if (!isTransferStatus(body.status)) throw new Error('Gateway returned an unrecognised transfer status.')
  return {
    id: str(body.id) || trimmed,
    status: body.status,
    stage: stageForStatus(body.status),
    amountBaseUnits: str(body.amount),
    nonceHash: isHash(body.nonce) ? keccak256(body.nonce) : null,
    txHash: isHash(body.txHash) ? body.txHash : null,
    sendingNetwork: str(body.sendingNetwork),
    createdAt: str(body.createdAt),
    updatedAt: str(body.updatedAt),
    checkedAt: new Date().toISOString(),
  }
}
