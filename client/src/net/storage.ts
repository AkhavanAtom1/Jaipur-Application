/** Storage that never throws (private browsing, sandboxed iframes...). */
function safe(kind: 'local' | 'session') {
  const store = (): Storage | null => {
    try { return kind === 'local' ? window.localStorage : window.sessionStorage; } catch { return null; }
  };
  return {
    get(key: string): string | null { try { return store()?.getItem(key) ?? null; } catch { return null; } },
    set(key: string, value: string) { try { store()?.setItem(key, value); } catch { /* ignore */ } },
    remove(key: string) { try { store()?.removeItem(key); } catch { /* ignore */ } },
  };
}
export const local = safe('local');
export const session = safe('session');
