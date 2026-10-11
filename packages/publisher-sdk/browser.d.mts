import type { Award, RenderObservation, ReceiptResult } from './index.mjs';
export function inspectPlacement(node: HTMLElement | null, award: Award): RenderObservation;
export function createSponsoredCard(options: { document: Document; award: Award; className?: string }): HTMLElement;
/** The untrusted JSON response is validated before it is cached or returned. */
export type RenderPost = (path: string, body: RenderObservation, deliveryToken: string) => Promise<unknown>;
export function createRenderAcknowledger(options: { post: RenderPost }): (input: { node: HTMLElement | null; award: Award; deliveryToken: string }) => Promise<ReceiptResult>;
