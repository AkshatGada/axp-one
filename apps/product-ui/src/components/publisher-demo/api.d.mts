export function productRequest<T = unknown>(path: string, options?: { body?: unknown; csrf?: string; deliveryToken?: string; timeoutMs?: number; fetch?: typeof globalThis.fetch }): Promise<T>;
