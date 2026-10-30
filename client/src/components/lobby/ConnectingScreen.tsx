interface ConnectingScreenProps {
  title?: string;
  detail?: string | null;
  onRetry?: () => void;
}

export function ConnectingScreen({
  title = 'Подключение к столу...',
  detail,
  onRetry,
}: ConnectingScreenProps) {
  return (
    <main className="mx-auto flex h-[100dvh] w-full max-w-[480px] items-center justify-center p-6">
      <section className="glass-card flex w-full flex-col items-center gap-4 px-6 py-8 text-center">
        {detail ? (
          <span className="h-2 w-2 rounded-full bg-[#E5534B] shadow-[0_0_8px_rgba(229,83,75,0.7)]" />
        ) : (
          <span className="loader-ring" aria-hidden="true" />
        )}
        <p className="text-sm font-semibold tracking-tight text-white">{title}</p>
        {detail ? (
          <p className="text-xs leading-relaxed text-[#F3C7C4]">{detail}</p>
        ) : (
          <p className="text-xs text-white/40">Ждём ответ сервера</p>
        )}
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="touch-feedback mt-1 h-10 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-xs font-semibold text-white"
          >
            Повторить
          </button>
        ) : null}
      </section>
    </main>
  );
}
