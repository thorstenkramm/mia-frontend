// Tailwind Plus: Application UI > Forms > Sign-in and Registration > Simple card
// Library version: 2026-09-13-083323, v4 React light. The card's primary submit
// button; MIA keeps it focusable while unavailable and refuses activation instead.
import { useFormStatus } from "react-dom";

export function AuthSubmitButton({
  enabled,
  label,
}: {
  readonly enabled: boolean;
  readonly label: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-disabled={!enabled || pending}
      onClick={(event) => {
        if (!enabled || pending) event.preventDefault();
      }}
      className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      {label}
    </button>
  );
}
