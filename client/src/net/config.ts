const configuredOrigin = import.meta.env.VITE_GAME_ORIGIN?.trim().replace(/\/+$/, '') || null;

export const isNativeApp =
  typeof location !== 'undefined' &&
  location.hostname === 'localhost' &&
  (location.protocol === 'https:' || location.protocol === 'capacitor:');

export function getPublicGameOrigin(): string | null {
  if (configuredOrigin) return configuredOrigin;
  return isNativeApp ? null : location.origin;
}

export function getGameWebSocketUrl(): string | null {
  const origin = getPublicGameOrigin();
  if (!origin) return null;

  const url = new URL('/ws', origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

let warned = false;

export function reportNativeConfigProblem() {
  if (warned || !isNativeApp) return;
  warned = true;
  console.error(
    'Jaipur Android build is missing VITE_GAME_ORIGIN. Create client/.env.mobile and set it to the public HTTPS URL of the live Cloudflare game.',
  );
}
