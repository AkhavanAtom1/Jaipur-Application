import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

/**
 * FLIP card/token movement. Every element tagged `data-flip="<id>"` is tracked.
 * When the game version changes:
 *  - ids that moved glide from their old spot to the new one,
 *  - ids that appeared fly in from an anchor (deck, opponent hand...),
 *  - ids that vanished leave a ghost that flies to an anchor (discard, opponent...).
 * Anchors are elements tagged `data-anchor="<name>"`.
 */
export type FlipDir = 'enter' | 'exit';
export type AnchorResolver = (id: string, dir: FlipDir, kind: string) => string | null;

interface Snap { rect: DOMRect; html: string; kind: string }

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function useFlip(root: RefObject<HTMLElement | null>, version: number, resetKey: string, resolve: AnchorResolver) {
  const snaps = useRef(new Map<string, Snap>());
  const lastVersion = useRef(version);
  const lastReset = useRef(resetKey);
  const resolver = useRef(resolve);
  resolver.current = resolve;

  const snapshot = (animatingSkip: boolean) => {
    const el = root.current;
    if (!el) return;
    const next = new Map<string, Snap>();
    el.querySelectorAll<HTMLElement>('[data-flip]').forEach((node) => {
      const id = node.dataset.flip!;
      const prev = snaps.current.get(id);
      if (animatingSkip && prev && node.getAnimations().length) { next.set(id, prev); return; }
      next.set(id, { rect: node.getBoundingClientRect(), html: node.outerHTML, kind: node.dataset.kind ?? '' });
    });
    snaps.current = next;
  };

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const changed = version !== lastVersion.current;
    const reset = resetKey !== lastReset.current;
    lastVersion.current = version;
    lastReset.current = resetKey;
    if (!changed || reset || reduced()) { snapshot(true); return; }

    const prev = snaps.current;
    const seen = new Set<string>();
    const anchorRect = (name: string | null) => {
      if (!name) return null;
      const a = el.querySelector<HTMLElement>(`[data-anchor="${name}"]`);
      return a ? a.getBoundingClientRect() : null;
    };
    const fresh = new Map<string, Snap>();

    el.querySelectorAll<HTMLElement>('[data-flip]').forEach((node, i) => {
      const id = node.dataset.flip!;
      seen.add(id);
      const rect = node.getBoundingClientRect();
      fresh.set(id, { rect, html: node.outerHTML, kind: node.dataset.kind ?? '' });
      const old = prev.get(id);
      if (old) {
        const dx = old.rect.left - rect.left;
        const dy = old.rect.top - rect.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        const sx = old.rect.width / (rect.width || 1);
        node.animate(
          [{ transform: `translate(${dx}px, ${dy}px) scale(${sx})`, transformOrigin: 'top left' }, { transform: 'translate(0,0) scale(1)', transformOrigin: 'top left' }],
          { duration: 560, easing: EASE, composite: 'add' as CompositeOperation },
        );
      } else {
        const from = anchorRect(resolver.current(id, 'enter', node.dataset.kind ?? ''));
        if (from) {
          const dx = from.left + from.width / 2 - (rect.left + rect.width / 2);
          const dy = from.top + from.height / 2 - (rect.top + rect.height / 2);
          node.animate(
            [{ transform: `translate(${dx}px, ${dy}px) scale(0.6)`, opacity: 0.2 }, { transform: 'none', opacity: 1 }],
            { duration: 620, delay: (i % 5) * 40, easing: EASE, fill: 'backwards' },
          );
        } else {
          node.animate([{ opacity: 0, transform: 'translateY(8px) scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: EASE });
        }
      }
    });

    prev.forEach((snap, id) => {
      if (seen.has(id)) return;
      const to = anchorRect(resolver.current(id, 'exit', snap.kind));
      if (!to) return;
      const ghost = document.createElement('div');
      ghost.className = 'flip-ghost';
      Object.assign(ghost.style, {
        position: 'fixed', left: `${snap.rect.left}px`, top: `${snap.rect.top}px`,
        width: `${snap.rect.width}px`, height: `${snap.rect.height}px`, pointerEvents: 'none', zIndex: '60',
      });
      ghost.innerHTML = snap.html;
      const child = ghost.firstElementChild as HTMLElement | null;
      if (child) { child.style.width = '100%'; child.style.height = '100%'; child.style.margin = '0'; child.removeAttribute('data-flip'); }
      document.body.appendChild(ghost);
      const dx = to.left + to.width / 2 - (snap.rect.left + snap.rect.width / 2);
      const dy = to.top + to.height / 2 - (snap.rect.top + snap.rect.height / 2);
      const anim = ghost.animate(
        [{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(0.55)`, opacity: 0 }],
        { duration: 640, easing: EASE, fill: 'forwards' },
      );
      anim.onfinish = () => ghost.remove();
    });

    snaps.current = fresh;
  });

  // Keep snapshots honest when layout shifts for reasons other than game state.
  useEffect(() => {
    const onShift = () => snapshot(true);
    window.addEventListener('resize', onShift);
    window.addEventListener('scroll', onShift, true);
    return () => { window.removeEventListener('resize', onShift); window.removeEventListener('scroll', onShift, true); };
  }, []);
}
