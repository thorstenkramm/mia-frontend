import { useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogDescription,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useIntl } from "react-intl";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import { tutoringActionClass } from "./SessionStartCourseChoiceRoute";
import type { TutoringRouteProps } from "./TutoringRouteProps";
import { useTutoringFinish } from "./useTutoringFinish";

export default function TutoringFinishRoute(props: TutoringRouteProps) {
  if (props.resource.kind !== "finish")
    throw new Error("Finish requires the admitted session.");
  return <FinishReview props={props} />;
}

// Tailwind Plus: Application UI > Overlays > Modal Dialogs > Simple alert,
// v4/react-light.jsx, library 2026-09-13-083323. MIA deltas: route heading
// receives normal route focus before the user opens the dialog, safe Cancel
// autofocus, confirmation stays disabled during ordered prevalidation, no
// transitions at reduced motion, accessible wrap at 320px. The modal never
// contains a transcript, server error body or untrusted model content.
function FinishReview({ props }: { readonly props: TutoringRouteProps }) {
  if (props.resource.kind !== "finish")
    throw new Error("Finish review requires its route.");
  const { session, work } = props.resource;
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const finish = useTutoringFinish(
    session,
    work,
    props.links.workspace(session.id),
    props.unavailable,
  );
  const eligible =
    session.state === "active" &&
    work?.sessionState === "active" &&
    work.state === "idle" &&
    work.generating === null &&
    work.queued === null &&
    work.actions.finish;
  const close = () => {
    if (finish.state.kind !== "Completing") setOpen(false);
  };
  const message =
    finish.state.kind === "Outcome unknown"
      ? messages.tutoringFinishUnknown
      : finish.state.kind === "State changed"
        ? messages.tutoringFinishChanged
        : finish.state.kind === "Check failed"
          ? messages.tutoringCheckFailed
          : finish.state.kind === "Completing"
            ? messages.tutoringFinishing
            : finish.state.kind === "Prevalidating"
              ? messages.tutoringChecking
              : messages.tutoringFinishConsequence;
  const needsCheck =
    finish.state.kind === "Outcome unknown" ||
    finish.state.kind === "State changed" ||
    finish.state.kind === "Check failed";
  return (
    <>
      <p className="text-sm/6 text-gray-700">
        {intl.formatMessage(
          eligible
            ? messages.tutoringFinishConsequence
            : messages.tutoringFinishUnavailable,
        )}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          className={tutoringActionClass}
          disabled={
            !eligible ||
            needsCheck ||
            finish.state.kind === "Prevalidating" ||
            finish.state.kind === "Completing"
          }
          onClick={() => {
            setOpen(true);
            void finish.refresh();
          }}
        >
          {intl.formatMessage(messages.tutoringFinishReview)}
        </button>
        {!open && needsCheck ? (
          <>
            <p className="w-full text-sm/6 text-gray-700">
              {intl.formatMessage(message)}
            </p>
            <button
              type="button"
              className={tutoringActionClass}
              onClick={() => void finish.refresh()}
            >
              {intl.formatMessage(messages.invitationsRefresh)}
            </button>
          </>
        ) : null}
        <RouteDepartureLink
          to={props.links.workspace(session.id)}
          className={tutoringActionClass}
        >
          {intl.formatMessage(messages.tutoringWorkspaceHeading)}
        </RouteDepartureLink>
      </div>
      <Dialog open={open} onClose={close} className="relative z-60">
        <DialogBackdrop className="fixed inset-0 bg-gray-500/75" />
        <div className="fixed inset-0 z-60 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            {/* jscpd:ignore-start — exact Tailwind Plus Simple alert presentation;
                materials owns distinct removal/finalization state and authorization. */}
            <DialogPanel className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left break-words shadow-xl sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:size-10">
                  <ExclamationTriangleIcon
                    aria-hidden="true"
                    className="size-6 text-red-600"
                  />
                </div>
                <div className="mt-3 min-w-0 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <DialogTitle
                    as="h2"
                    className="text-base font-semibold text-gray-900"
                  >
                    {intl.formatMessage(messages.tutoringFinishHeading)}
                  </DialogTitle>
                  <DialogDescription
                    as="p"
                    className="mt-2 text-sm text-gray-700"
                  >
                    {intl.formatMessage(message)}
                  </DialogDescription>
                </div>
              </div>
              {/* jscpd:ignore-end */}
              {(finish.state.kind === "Check failed" ||
                finish.state.kind === "Outcome unknown") &&
              finish.state.error !== null ? (
                <TechnicalErrorDisclosure error={finish.state.error} />
              ) : null}
              <div className="mt-5 flex flex-wrap gap-3 sm:mt-4 sm:flex-row-reverse">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  disabled={
                    finish.state.kind !== "Confirmable" || finish.unresolved
                  }
                  onClick={() => void finish.confirm()}
                >
                  {intl.formatMessage(messages.tutoringFinishConfirm)}
                </button>
                <button
                  type="button"
                  data-autofocus
                  className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring-1 inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  disabled={finish.state.kind === "Completing"}
                  onClick={close}
                >
                  {intl.formatMessage(messages.tutoringFinishCancel)}
                </button>
                {finish.state.kind === "Completing" ? (
                  <button
                    type="button"
                    className={tutoringActionClass}
                    onClick={finish.stopWaiting}
                  >
                    {intl.formatMessage(messages.lifecycleStopWaiting)}
                  </button>
                ) : null}
                {finish.state.kind === "Outcome unknown" ||
                finish.state.kind === "State changed" ||
                finish.state.kind === "Check failed" ? (
                  <button
                    type="button"
                    className={tutoringActionClass}
                    onClick={() => void finish.refresh()}
                  >
                    {intl.formatMessage(messages.invitationsRefresh)}
                  </button>
                ) : null}
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
