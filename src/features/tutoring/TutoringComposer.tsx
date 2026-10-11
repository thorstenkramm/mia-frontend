import { useState, type FormEvent, type RefObject } from "react";
import { useFormStatus } from "react-dom";
import { useIntl } from "react-intl";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { messages } from "../../platform/i18n/messages";
import { AuthSubmitButton } from "../../platform/ui/AuthSubmitButton";

// D8: client-side bounds mirror the documented StudentMessageContent contract
// (1–8,000 Unicode code points, at most 32 KiB UTF-8). Bytes are preserved
// exactly — never trimmed or normalized — and the server remains the arbiter
// (422 tutoring_invalid).
export function messageContentError(
  content: string,
): "required" | "bounds" | null {
  const points = [...content].length;
  if (points === 0) return "required";
  if (points > 8000 || new TextEncoder().encode(content).length > 32768)
    return "bounds";
  return null;
}

// Tailwind Plus: Application UI > Forms > Textareas > With underline and
// actions, v4/react-light.jsx, library 2026-09-13-083323. MIA deltas: the
// avatar image, attach action and mood Listbox are dropped; the underline
// textarea keeps an sr-only localized label plus the documented-bounds help;
// the trailing submit button carries the visible localized Send/Queue
// message/Start session label and follows machine-5/machine-2 enablement
// through the aria-disabled pattern; Enter keeps native newline behavior, so
// IME composition never submits — the visible button is the only submission
// action. The `card` variant uses the existing AuthSubmitButton binding
// (Simple card) for the intent route's one primary begin action.
export function TutoringComposer({
  draft,
  locked,
  submitLabel,
  submitEnabled,
  onDraft,
  action,
  guardSubmit,
  inputRef,
  card = false,
  submitHidden = false,
}: {
  readonly draft: string;
  // The bound text of an unsettled attempt is locked; the draft is retained.
  readonly locked: boolean;
  readonly submitLabel: string;
  readonly submitEnabled: boolean;
  readonly onDraft: (value: string) => void;
  readonly action: (formData: FormData) => void;
  readonly guardSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly inputRef: RefObject<HTMLTextAreaElement | null>;
  readonly card?: boolean;
  // Outcome unknown: the bound text stays locked and visible, but the submit
  // action is gone — only explicit Reconcile/Retry/Abandon remain.
  readonly submitHidden?: boolean;
}) {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const [validation, setValidation] = useState<"required" | "bounds" | null>(
    null,
  );
  return (
    <form
      action={action}
      onSubmit={(event) => {
        // Local corrective validation never dispatches; only exact in-bounds
        // bytes reach the attempt owner.
        const content = new FormData(event.currentTarget).get("message");
        const error =
          typeof content === "string" ? messageContentError(content) : null;
        if (error !== null) {
          event.preventDefault();
          setValidation(error);
          announce(
            intl.formatMessage(
              error === "required"
                ? messages.tutoringMessageRequired
                : messages.tutoringMessageTooLong,
            ),
            "urgent",
          );
          inputRef.current?.focus();
          return;
        }
        setValidation(null);
        guardSubmit(event);
      }}
      className="mt-4"
    >
      <div className="border-b border-gray-200 pb-px focus-within:border-b-2 focus-within:border-indigo-600 focus-within:pb-0">
        <label htmlFor="tutoring-message" className="sr-only">
          {intl.formatMessage(messages.tutoringComposerLabel)}
        </label>
        <textarea
          ref={inputRef}
          id="tutoring-message"
          name="message"
          rows={3}
          value={draft}
          disabled={locked}
          aria-invalid={validation !== null ? true : undefined}
          aria-describedby={
            validation === null
              ? "tutoring-message-bounds"
              : "tutoring-message-bounds tutoring-message-error"
          }
          onChange={(event) => {
            onDraft(event.target.value);
            if (validation !== null) setValidation(null);
          }}
          className="block w-full resize-none text-base text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:text-gray-500 sm:text-sm/6"
        />
      </div>
      <p id="tutoring-message-bounds" className="mt-2 text-sm/6 text-gray-600">
        {intl.formatMessage(messages.tutoringMessageBounds)}
      </p>
      {validation === null ? null : (
        <p id="tutoring-message-error" className="mt-2 text-sm/6 text-red-700">
          {intl.formatMessage(
            validation === "required"
              ? messages.tutoringMessageRequired
              : messages.tutoringMessageTooLong,
          )}
        </p>
      )}
      <div className={card ? "pt-2" : "flex justify-end pt-2"}>
        {submitHidden ? null : card ? (
          <AuthSubmitButton
            enabled={submitEnabled && !locked}
            label={submitLabel}
          />
        ) : (
          <ComposerSubmit
            enabled={submitEnabled && !locked}
            label={submitLabel}
          />
        )}
      </div>
    </form>
  );
}

// The blueprint's trailing submit with MIA's focusable aria-disabled refusal.
// It rhymes with the platform AuthSubmitButton (the Simple card binding): the
// blueprint bindings are recorded separately and the composer owns its own
// styling, so the jscpd marker lives here and a note there points here.
// jscpd:ignore-start
function ComposerSubmit({
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
      className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 aria-disabled:opacity-50"
    >
      {label}
    </button>
  );
}
// jscpd:ignore-end
