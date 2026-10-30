import type { ReactNode } from 'react';
import { Drawer } from 'vaul';

const overlayClass = 'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm';

// max-w matches TableLayout so a desktop preview doesn't stretch the sheet
// across the monitor. noBodyStyles keeps vaul off document.body — the Mini App
// already locks overflow, and a position:fixed body fights the Telegram viewport.
const contentClass =
  'fixed bottom-0 left-0 right-0 z-50 mx-auto flex w-full max-w-[480px] max-h-[85vh] flex-col overflow-hidden rounded-t-[28px] border-t border-white/10 bg-[#0F121A]/95 p-6 shadow-[0_-12px_40px_rgba(0,0,0,0.8)] outline-none backdrop-blur-2xl';

interface GlassSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function GlassSheet({
  open,
  onOpenChange,
  header,
  children,
  footer,
}: GlassSheetProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground={false}
      noBodyStyles
      autoFocus={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className={overlayClass} />
        <Drawer.Content
          className={contentClass}
          style={{
            paddingBottom:
              'max(1.5rem, var(--tg-viewport-content-safe-area-inset-bottom, 0px))',
          }}
        >
          <div
            aria-hidden
            className="mx-auto mb-5 h-1 w-10 shrink-0 rounded-full bg-white/20"
          />
          {header ? <div className="shrink-0">{header}</div> : null}
          <div
            data-vaul-no-drag
            className="min-h-0 touch-pan-y overflow-y-auto overscroll-contain"
          >
            {children}
          </div>
          {footer ? (
            <div data-vaul-no-drag className="flex shrink-0 flex-col gap-2 pt-4">
              {footer}
            </div>
          ) : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
