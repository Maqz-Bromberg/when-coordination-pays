/** Prefix for plain URLs (assets, downloads) that next/link does not rewrite. */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const withBase = (path: string) => `${BASE}${path}`;

/** The Python code and tests, archived from the last commit by scripts/copy-data.mjs. */
export const PYTHON_ZIP = "/downloads/when-coordination-pays-python.zip";
