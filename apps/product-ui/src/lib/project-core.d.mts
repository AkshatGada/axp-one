import type { ProductRun } from "../data/types.ts";
export const PROJECTION_VERSION: string;
export const DEVNET_GENESIS: string;
export type CheckFn = (name: string, ok: boolean, detail?: string) => void;
export function project(
  input: { runBytes: Uint8Array | string; manifestBytes: Uint8Array | string; chainCheck?: unknown; paths?: { run: string; manifest: string } },
  ctx?: { check?: CheckFn; sha256Hex?: (bytes: Uint8Array) => string },
): { projection: ProductRun; removed: Array<{ field: string; count: number }> };
export function structuralChecks(p: ProductRun, check: CheckFn, raw?: unknown): void;
export function scanForbidden(text: string): string[];
export function longNumericArrays(value: unknown): string[];
export const FORBIDDEN: string[];
