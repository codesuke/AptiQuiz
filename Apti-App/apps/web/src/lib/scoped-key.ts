/**
 * Returns the idempotency key stored for `scope`, creating it on first use. Retries in the
 * same scope reuse the key, so the Game Server returns the first result instead of acting twice.
 */
export function keyForScope(
  keys: Map<string, string>,
  scope: string,
  createKey: () => string,
): string {
  const existing = keys.get(scope);
  if (existing !== undefined) return existing;

  const key = createKey();
  keys.set(scope, key);
  return key;
}
