export interface Toast { id: number; text: string; tone: 'error' | 'info' | 'good' }

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => <div key={t.id} className={`toast toast--${t.tone}`}>{t.text}</div>)}
    </div>
  );
}
