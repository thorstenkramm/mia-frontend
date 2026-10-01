import type { RefObject } from "react";

// Pressed reveal toggle for one native password control. Switching the input type
// keeps the exact value, selection, and focus; the caller owns the type prop.
export function PasswordRevealButton({
  inputRef,
  revealed,
  enabled,
  label,
  onRevealedChange,
}: {
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly revealed: boolean;
  readonly enabled: boolean;
  readonly label: string;
  readonly onRevealedChange: (revealed: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={revealed}
      aria-disabled={!enabled}
      onClick={() => {
        const input = inputRef.current;
        if (!enabled || input === null) return;
        const { selectionStart, selectionEnd, selectionDirection } = input;
        input.type = revealed ? "password" : "text";
        input.setSelectionRange(
          selectionStart,
          selectionEnd,
          selectionDirection ?? undefined,
        );
        onRevealedChange(!revealed);
      }}
      className="mt-2 min-h-6 text-sm/6 font-semibold text-indigo-600 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      {label}
    </button>
  );
}
