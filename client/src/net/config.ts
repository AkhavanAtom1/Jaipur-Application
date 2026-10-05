const nativeMode = (() => {
  try {
    return new URLSearchParams(location.search).get('native') === '1';
  } catch {
    return false;
  }
})();

export const isNativeApp = nativeMode;

export function getPublicGameOrigin(): string | null {
  return typeof location !== 'undefined' ? location.origin : null;
}

export function getGameWebSocketUrl(): string | null {
  if (typeof location === 'undefined') return null;

  const url = new URL('/ws', location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

export function reportNativeConfigProblem() {
  // The Android build loads the live HTTPS game directly, so no mobile env
  // variable is required. Kept as a no-op for compatibility with the socket
  // client.
}
