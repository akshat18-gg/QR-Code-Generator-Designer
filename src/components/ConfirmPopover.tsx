import { useEffect, useId, useRef, useState } from 'react';

interface ConfirmPopoverProps {
  label: string;
  question: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export function ConfirmPopover({ label, question, confirmLabel, onConfirm }: ConfirmPopoverProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) trigger.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    cancel.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!popover.current?.contains(target) && !trigger.current?.contains(target)) setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div className="confirm">
      <button
        ref={trigger}
        type="button"
        className="button button-quiet"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      {open && (
        <div
          ref={popover}
          id={id}
          className="confirm-popover"
          role="dialog"
          aria-labelledby={`${id}-question`}
        >
          <p id={`${id}-question`}>{question}</p>
          <div className="confirm-actions">
            <button
              type="button"
              className="button button-danger"
              onClick={() => {
                onConfirm();
                close(false);
              }}
            >
              {confirmLabel}
            </button>
            <button ref={cancel} type="button" className="button" onClick={() => close(true)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
