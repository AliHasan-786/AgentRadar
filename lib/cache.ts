type Entry<T> = { value: T; expiresAt: number };

const memory = new Map<string, Entry<unknown>>();

export const CATALOG_TTL_MS = 24 * 60 * 60 * 1000;

export async function cacheGet<T>(key: string): Promise<T | null> {
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return hit.value as T;
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlMs: number = CATALOG_TTL_MS,
): Promise<void> {
  memory.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export async function cacheDelete(key: string): Promise<void> {
  memory.delete(key);
}

export function catalogCacheKey(hostname: string): string {
  return `catalog:${hostname}`;
}
