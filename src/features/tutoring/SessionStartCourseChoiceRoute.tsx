import { useRef, useState, type ReactNode } from "react";
import { useIntl } from "react-intl";
import { ChevronRightIcon } from "@heroicons/react/20/solid";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import {
  listJoinedActiveCourses,
  type JoinedCourseBatch,
  type LearnCourse,
} from "../../platform/api/learnCourses";
import type { CourseId, EntryApiFailure } from "../../platform/api/entry";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import {
  isHiddenTutoringFailure,
  type ActiveTutoringSession,
} from "../../platform/api/tutoringSessions";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import { useRouteActivity } from "../../platform/ui/useRouteActivity";
import type { TutoringLinks, TutoringRouteProps } from "./TutoringRouteProps";

// Presentational bindings duplicated from features/courses/CourseListRoute.tsx
// (jscpd markers live here; a note at that site points here): the architecture
// rule bars a cross-feature import and the tutoring routes own their own
// authorization contract. Same recorded blueprints: Feedback > Empty States >
// Simple; Navigation > Pagination > Simple card footer; the shared secondary
// action button and last-checked line.
// jscpd:ignore-start
export const tutoringActionClass =
  "inline-flex min-h-6 items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

export function TutoringCheckedAt({ time }: { readonly time: number }) {
  const intl = useIntl();
  return (
    <p className="mt-2 text-sm text-gray-700">
      {intl.formatMessage(messages.invitationsLastChecked, {
        time: intl.formatTime(time, {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          timeZoneName: "short",
        }),
      })}
    </p>
  );
}

export function TutoringEmpty({
  text,
  action,
}: {
  readonly text: string;
  readonly action?: ReactNode;
}) {
  return (
    <div className="my-6 text-center">
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="mx-auto size-12 text-gray-400"
      >
        <path
          d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="mt-2 text-sm font-semibold text-gray-900">{text}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function TutoringPagination({
  page,
  busy,
  load,
}: {
  readonly page: {
    readonly offset: number;
    readonly previousOffset: number | null;
    readonly nextOffset: number | null;
  };
  readonly busy: boolean;
  readonly load: (offset: number) => void;
}) {
  const intl = useIntl();
  return (
    <nav
      aria-label={intl.formatMessage(messages.coursesPagination)}
      className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3 sm:px-6"
    >
      <p className="text-sm text-gray-700">
        {intl.formatMessage(messages.coursesPage, {
          page: Math.floor(page.offset / 25) + 1,
        })}
      </p>
      <div className="flex flex-wrap gap-3">
        {(
          [
            {
              offset: page.previousOffset,
              label: messages.invitationsPreviousPage,
            },
            { offset: page.nextOffset, label: messages.invitationsNextPage },
          ] as const
        ).map(({ offset, label }) => (
          <button
            key={label.id}
            type="button"
            disabled={busy || offset === null}
            onClick={() => {
              if (offset !== null) load(offset);
            }}
            className={tutoringActionClass}
          >
            {intl.formatMessage(label)}
          </button>
        ))}
      </div>
    </nav>
  );
}

export type TutoringCollectionActivity =
  | { readonly kind: "Idle" }
  | { readonly kind: "Loading" }
  | { readonly kind: "Failed"; readonly error: EntryApiFailure };

export function TutoringCollectionFeedback({
  state,
  retry,
}: {
  readonly state: TutoringCollectionActivity;
  readonly retry: () => void;
}) {
  const intl = useIntl();
  if (state.kind === "Loading")
    return (
      <p className="mt-3 text-sm text-gray-700">
        {intl.formatMessage(messages.routeLoading)}
      </p>
    );
  if (state.kind === "Idle") return null;
  return (
    <>
      <p className="mt-3 text-sm text-gray-700">
        {intl.formatMessage(messages.tutoringCheckFailed)}
      </p>
      <TechnicalErrorDisclosure error={state.error} />
      <button type="button" className={tutoringActionClass} onClick={retry}>
        {intl.formatMessage(messages.mfaCheckAgain)}
      </button>
    </>
  );
}
// jscpd:ignore-end

// One shared explicit-load owner for tutoring's paginated reads (course
// batches, material pages, transcript pages): guarded against overlap, fenced
// on unmount, hidden failures collapse to the host's neutral unavailable and
// every other failure is the fixed check-failed feedback with explicit retry.
export function useTutoringCollection(
  unavailable: (failure: EntryApiFailure | null) => void,
) {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const { readAuthenticated } = useSessionActions();
  const { state, stateRef, mounted, update } =
    useRouteActivity<TutoringCollectionActivity>({ kind: "Idle" });
  const load = async <T,>(
    read: (signal: AbortSignal) => Promise<T>,
    apply: (value: T) => void,
  ): Promise<void> => {
    if (stateRef.current.kind === "Loading") return;
    update({ kind: "Loading" });
    const result = await readAuthenticated(read);
    if (!mounted.current) return;
    if (result.kind === "completed") {
      apply(result.value);
      update({ kind: "Idle" });
      announce(intl.formatMessage(messages.learnCollectionUpdated), "polite");
    } else if (result.kind === "failed") {
      if (isHiddenTutoringFailure(result.failure)) unavailable(result.failure);
      else {
        update({ kind: "Failed", error: result.failure });
        announce(intl.formatMessage(messages.tutoringCheckFailed), "urgent");
      }
    }
  };
  return { state, load };
}

// The fixed tutoring exits: explicit Refresh re-admits through the session
// owner (never a dependent replay), the courses and home destinations come
// from the host's trusted link builders.
export function TutoringExits({
  links,
  refresh = false,
}: {
  readonly links: TutoringLinks;
  readonly refresh?: boolean;
}) {
  const intl = useIntl();
  const { checkRouteAdmission } = useSessionActions();
  return (
    <>
      {refresh ? (
        <button
          type="button"
          className={tutoringActionClass}
          onClick={() => void checkRouteAdmission()}
        >
          {intl.formatMessage(messages.invitationsRefresh)}
        </button>
      ) : null}
      <RouteDepartureLink to={links.courses} className={tutoringActionClass}>
        {intl.formatMessage(messages.learnCourses)}
      </RouteDepartureLink>
      <RouteDepartureLink to={links.home} className={tutoringActionClass}>
        {intl.formatMessage(messages.invitationsBackToHome)}
      </RouteDepartureLink>
    </>
  );
}

// The one-active-session truth on start routes: fixed copy naming the escaped
// course with one explicit Continue action; no start affordance is offered.
export function ResumeActiveSession({
  session,
  links,
}: {
  readonly session: ActiveTutoringSession;
  readonly links: TutoringLinks;
}) {
  const intl = useIntl();
  return (
    <>
      <p className="text-sm/6 font-semibold text-gray-900">
        {intl.formatMessage(messages.tutoringResumeActive, {
          course: session.courseName,
        })}
      </p>
      <p className="mt-2 text-sm/6 text-gray-700">
        {intl.formatMessage(messages.tutoringResumeHelp)}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <RouteDepartureLink
          to={links.workspace(session.id)}
          className={tutoringActionClass}
        >
          {intl.formatMessage(messages.tutoringContinueSession)}
        </RouteDepartureLink>
        <RouteDepartureLink to={links.courses} className={tutoringActionClass}>
          {intl.formatMessage(messages.learnCourses)}
        </RouteDepartureLink>
      </div>
    </>
  );
}

// Truthful not-accepting copy from server-authored student-safe blockers only.
export function NotAcceptingSession({
  course,
  links,
}: {
  readonly course: LearnCourse;
  readonly links: TutoringLinks;
}) {
  const intl = useIntl();
  const activeElsewhere = course.newSession.blockers.includes(
    "active_tutoring_session",
  );
  return (
    <>
      <p className="text-sm/6 text-gray-700">
        {intl.formatMessage(
          activeElsewhere
            ? messages.tutoringActiveSession
            : messages.learnNotAccepting,
        )}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {activeElsewhere ? (
          <RouteDepartureLink
            to={links.recovery}
            className={tutoringActionClass}
          >
            {intl.formatMessage(messages.tutoringResumeLink)}
          </RouteDepartureLink>
        ) : null}
        <RouteDepartureLink to={links.start} className={tutoringActionClass}>
          {intl.formatMessage(messages.tutoringStartHeading)}
        </RouteDepartureLink>
      </div>
    </>
  );
}

// Tailwind Plus: Application UI > Lists > Stacked Lists > With links,
// v4/react-light.jsx, library 2026-09-13-083323. MIA deltas: the course name is
// the canonical link (eligible courses only), eligibility status text replaces
// person metadata, no avatars/images/last-seen, authored names wrapped in bdi.
export default function SessionStartCourseChoiceRoute(
  props: TutoringRouteProps,
) {
  if (props.resource.kind !== "start-choice")
    throw new Error("Session start requires its admitted start choice.");
  if (props.resource.active !== null)
    return (
      <ResumeActiveSession
        session={props.resource.active}
        links={props.links}
      />
    );
  return (
    <CourseChoice
      ids={props.resource.ids}
      initial={props.resource.batch}
      links={props.links}
      unavailable={props.unavailable}
    />
  );
}

function CourseChoice({
  ids,
  initial,
  links,
  unavailable,
}: {
  readonly ids: readonly CourseId[];
  readonly initial: JoinedCourseBatch;
  readonly links: TutoringLinks;
  readonly unavailable: (failure: EntryApiFailure | null) => void;
}) {
  const intl = useIntl();
  const [batch, setBatch] = useState(initial);
  const [checkedAt, setCheckedAt] = useState(Date.now);
  const heading = useRef<HTMLHeadingElement>(null);
  const collection = useTutoringCollection(unavailable);
  const load = (offset: number) =>
    void collection.load(
      async (signal) => {
        const next = await listJoinedActiveCourses(ids, offset, signal);
        return {
          consumed: next.consumed,
          courses: [...batch.courses, ...next.courses],
        };
      },
      (value) => {
        setBatch(value);
        setCheckedAt(Date.now());
        heading.current?.focus();
      },
    );
  return (
    <>
      <h2
        ref={heading}
        tabIndex={-1}
        className="text-base font-semibold text-gray-900"
      >
        {intl.formatMessage(messages.tutoringChooseCourse)}
      </h2>
      <TutoringCheckedAt time={checkedAt} />
      <TutoringCollectionFeedback
        state={collection.state}
        retry={() => load(batch.consumed)}
      />
      {collection.state.kind === "Loading" ? null : batch.courses.length ===
        0 ? (
        <TutoringEmpty
          text={intl.formatMessage(
            batch.consumed < ids.length
              ? messages.learnBatchEmpty
              : messages.learnEmpty,
          )}
        />
      ) : (
        <ul role="list" className="mt-6 divide-y divide-gray-100">
          {batch.courses.map((course) => (
            <li
              key={course.id}
              className="relative flex justify-between gap-x-6 py-5"
            >
              <div className="flex min-w-0 gap-x-4">
                <div className="min-w-0 flex-auto">
                  <p className="text-sm/6 font-semibold text-gray-900">
                    {course.newSession.eligible ? (
                      <RouteDepartureLink
                        to={links.material(course.id)}
                        className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                      >
                        <span className="absolute inset-x-0 -top-px bottom-0" />
                        <bdi>{course.name}</bdi>
                      </RouteDepartureLink>
                    ) : (
                      <bdi>{course.name}</bdi>
                    )}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-2 text-xs/5 text-gray-500">
                    {course.newSession.eligible ? (
                      intl.formatMessage(messages.learnAccepting)
                    ) : course.newSession.blockers.includes(
                        "active_tutoring_session",
                      ) ? (
                      <>
                        {intl.formatMessage(messages.tutoringActiveSession)}
                        <RouteDepartureLink
                          to={links.recovery}
                          className="relative text-indigo-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                          {intl.formatMessage(messages.tutoringResumeLink)}
                        </RouteDepartureLink>
                      </>
                    ) : (
                      intl.formatMessage(messages.learnNotAccepting)
                    )}
                  </p>
                </div>
              </div>
              {course.newSession.eligible ? (
                <ChevronRightIcon
                  aria-hidden="true"
                  className="size-5 flex-none self-center text-gray-400"
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        {batch.consumed < ids.length ? (
          <button
            type="button"
            className={tutoringActionClass}
            disabled={collection.state.kind === "Loading"}
            onClick={() => load(batch.consumed)}
          >
            {intl.formatMessage(messages.learnMore)}
          </button>
        ) : null}
        <TutoringExits links={links} refresh />
      </div>
    </>
  );
}
