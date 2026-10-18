/** Prefix for plain URLs (assets, downloads) that next/link does not rewrite. */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const withBase = (path: string) => `${BASE}${path}`;
