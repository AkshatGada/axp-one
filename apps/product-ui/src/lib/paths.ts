// Base path for the static export (merged under /mvp in the single artifact). next/link adds it to links itself;
// raw URLs (fetch, download) must add it here.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL ?? "/";
export const asset = (p: string) => `${BASE_PATH}${p}`;
