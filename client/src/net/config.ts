const isNativeFlag = typeof location !== 'undefined' &&
  new URLSearchParams(location.search).get('native') === '1';

export const isNativeApp = isNativeFlag;

export function getPublicGameOrigin(): string {
  return location.origin;
}

export function getGameWebSocketUrl(): string {
  const url = new URL('/ws', location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}
