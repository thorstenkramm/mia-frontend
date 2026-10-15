import {
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  UserGroupIcon,
} from "@heroicons/react/20/solid";
import clsx from "clsx";
import { useState, type ReactNode } from "react";
import { useIntl, type MessageDescriptor } from "react-intl";
import {
  canFirstActivate,
  type CoursePreparation,
  type CourseTeachingField,
} from "../../platform/api/courses";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import type { CourseRouteProps } from "./CourseRouteProps";
import { CourseCheckedAt, courseActionClass } from "./CourseListRoute";
import {
  CourseHubBlockers,
  CourseReadinessRefresh,
} from "./CourseReadinessChecklist";

export const readinessMessages = {
  inactive_incomplete: messages.preparationIncomplete,
  inactive_activatable: messages.preparationActivatable,
  active_accepting: messages.preparationAccepting,
  active_not_accepting: messages.preparationBlocked,
} as const;

// Tailwind Plus: Application UI > Headings > Page Headings > With meta and actions;
// Elements > Badges > Small pill with border. Library 2026-09-13-083323,
// v4/react-light.jsx. MIA: shell owns h1 and focus; admitted course identity
// alone reaches breadcrumb/meta; no sample menu, truncation, or extra request.
export function CourseHubHeader({
  courseName,
  hubPath,
  readinessPath,
  courseState,
  metaName,
  child,
  unavailable = false,
}: {
  readonly courseName?: string;
  readonly hubPath?: string;
  readonly readinessPath?: string;
  readonly courseState?: "inactive" | "active";
  readonly metaName?: string;
  readonly child?: "readiness" | "activation";
  readonly unavailable?: boolean;
}) {
  const intl = useIntl();
  const [checkedAt] = useState(Date.now);
  if (courseState !== undefined)
    return (
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {metaName === undefined ? null : (
          <bdi dir="auto" className="font-medium text-gray-900 wrap-anywhere">
            {metaName}
          </bdi>
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-700 inset-ring inset-ring-gray-500/30">
          <span aria-hidden="true">{courseState === "active" ? "●" : "○"}</span>
          {intl.formatMessage(
            courseState === "active"
              ? messages.preparationStatePillActive
              : messages.preparationStatePillInactive,
          )}
        </span>
        <CourseCheckedAt time={checkedAt} />
        <CourseReadinessRefresh />
      </div>
    );
  return (
    <nav
      aria-label={intl.formatMessage(messages.preparationBreadcrumbs)}
      className="mb-4 flex flex-wrap items-center gap-2 text-sm/6 text-gray-600"
    >
      <RouteDepartureLink
        to="/prepare/courses"
        className={clsx(
          "rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
          child !== undefined && "inline-flex min-h-6 items-center",
        )}
      >
        {intl.formatMessage(messages.coursesPrepareHeading)}
      </RouteDepartureLink>
      <span aria-hidden="true">›</span>
      {unavailable ? null : child === undefined ||
        hubPath === undefined ? null : (
        <>
          <RouteDepartureLink
            to={hubPath}
            className="inline-flex min-h-6 min-w-0 items-center rounded-sm wrap-anywhere focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <bdi dir="auto">{courseName}</bdi>
          </RouteDepartureLink>
          <span aria-hidden="true">›</span>
        </>
      )}
      {child === "activation" && !unavailable && readinessPath !== undefined ? (
        <>
          <RouteDepartureLink
            to={readinessPath}
            className="inline-flex min-h-6 items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            {intl.formatMessage(messages.courseReadinessHeading)}
          </RouteDepartureLink>
          <span aria-hidden="true">›</span>
        </>
      ) : null}
      <span
        aria-current="page"
        className="min-w-0 font-medium text-gray-900 wrap-anywhere"
      >
        {unavailable || child !== undefined ? (
          intl.formatMessage(
            child === "activation"
              ? messages.courseActivationHeading
              : child === "readiness"
                ? messages.courseReadinessHeading
                : messages.preparationHub,
          )
        ) : (
          <bdi dir="auto">{courseName}</bdi>
        )}
      </span>
    </nav>
  );
}

// Tailwind Plus: Application UI > Feedback > Alerts > With actions; Elements >
// Badges > Small pill with border. Library 2026-09-13-083323, v4/react-light.jsx.
// MIA: server-fact tone, h2 under the admitted shell h1, a single safe action.
export function CourseStatusPanel({
  tone,
  heading,
  body,
  blockerCount,
  activatedAt,
  actions,
}: {
  readonly tone: "green" | "indigo" | "gray" | "yellow";
  readonly heading: MessageDescriptor;
  readonly body: MessageDescriptor;
  readonly blockerCount: number;
  readonly activatedAt: number | null;
  readonly actions?: ReactNode;
}) {
  const intl = useIntl();
  const Icon =
    tone === "green"
      ? CheckCircleIcon
      : tone === "indigo"
        ? ArrowRightIcon
        : tone === "gray"
          ? InformationCircleIcon
          : ExclamationTriangleIcon;
  return (
    <section
      className={clsx(
        "rounded-md p-4",
        tone === "green" && "bg-green-50",
        tone === "indigo" && "bg-indigo-50",
        tone === "gray" && "bg-gray-50",
        tone === "yellow" && "bg-yellow-50",
      )}
    >
      <div className="flex gap-3">
        <Icon
          aria-hidden="true"
          className={clsx(
            "size-5 shrink-0",
            tone === "green" && "text-green-700",
            tone === "indigo" && "text-indigo-700",
            tone === "gray" && "text-gray-700",
            tone === "yellow" && "text-yellow-700",
          )}
        />
        <div className="min-w-0">
          <h2
            className={clsx(
              "text-base/7 font-semibold",
              tone === "green" && "text-green-800",
              tone === "indigo" && "text-indigo-900",
              tone === "gray" && "text-gray-900",
              tone === "yellow" && "text-yellow-900",
            )}
          >
            {intl.formatMessage(heading, { count: blockerCount })}
          </h2>
          <p className="mt-2 text-sm/6 text-gray-800">
            {intl.formatMessage(body, {
              count: blockerCount,
              activatedAt:
                activatedAt === null
                  ? ""
                  : intl.formatDate(activatedAt, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      timeZoneName: "short",
                    }),
            })}
          </p>
          {actions === undefined ? null : <div className="mt-4">{actions}</div>}
        </div>
      </div>
    </section>
  );
}

function CourseHubStatus({
  preparation,
  links,
}: {
  readonly preparation: CoursePreparation;
  readonly links: CourseRouteProps["links"];
}) {
  const intl = useIntl();
  const { state, blockers } = preparation.readiness;
  const previous =
    preparation.activatedAt !== null || preparation.deactivatedAt !== null;
  const ready = canFirstActivate(preparation);
  const tone =
    state === "active_accepting"
      ? "green"
      : ready
        ? "indigo"
        : state === "inactive_activatable" && previous
          ? "gray"
          : "yellow";
  const heading =
    state === "inactive_incomplete"
      ? messages.preparationPanelIncompleteHeading
      : ready
        ? messages.preparationPanelActivatableHeading
        : state === "inactive_activatable"
          ? messages.preparationPanelPreviousHeading
          : state === "active_accepting"
            ? messages.preparationPanelAcceptingHeading
            : messages.preparationPanelNotAcceptingHeading;
  const body =
    state === "inactive_incomplete"
      ? messages.preparationPanelIncompleteBody
      : ready
        ? messages.preparationPanelActivatableBody
        : state === "inactive_activatable"
          ? messages.preparationPanelPreviousBody
          : state === "active_accepting"
            ? messages.preparationPanelAcceptingBody
            : messages.preparationPanelNotAcceptingBody;
  return (
    <CourseStatusPanel
      tone={tone}
      heading={heading}
      body={body}
      blockerCount={blockers.length}
      activatedAt={preparation.activatedAt}
      actions={
        <RouteDepartureLink
          to={links.readiness(preparation.course.id)}
          className={
            ready
              ? courseActionClass
              : "inline-flex min-h-6 items-center rounded-sm text-sm font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          }
        >
          {intl.formatMessage(
            ready
              ? messages.preparationPanelActivatableAction
              : messages.preparationOpenReadiness,
          )}
        </RouteDepartureLink>
      }
    />
  );
}

// Tailwind Plus: Application UI > Data Display > Description Lists >
// Left-aligned with inline actions; Elements > Badges > Small pill with border.
// Library 2026-09-13-083323, v4/react-light.jsx. MIA: six admitted rows,
// escaped excerpts, server-only badges, stacked inline actions at narrow width.
function CourseSetup({
  preparation,
  links,
}: {
  readonly preparation: CoursePreparation;
  readonly links: CourseRouteProps["links"];
}) {
  const intl = useIntl();
  const { fields, course } = preparation;
  const blocked: ReadonlySet<string> = new Set(
    preparation.readiness.blockers.map((blocker) => blocker.id),
  );
  const badge =
    course.state === "active"
      ? messages.preparationBadgeBlocksSessions
      : messages.preparationBadgeBlocksActivation;
  const filled = (value: string | null): value is string =>
    value !== null && value.trim().length > 0;
  let languageName = fields.language;
  if (fields.language !== null) {
    try {
      languageName =
        new Intl.DisplayNames([intl.locale], { type: "language" }).of(
          fields.language,
        ) ?? fields.language;
    } catch {
      languageName = fields.language;
    }
  }
  const rows: readonly {
    key: string;
    label: (typeof messages)[keyof typeof messages];
    value: ReactNode;
    field?: CourseTeachingField;
    action?: (typeof messages)[keyof typeof messages];
    blocker?: string;
    optional?: boolean;
  }[] = [
    {
      key: "language",
      label: messages.preparationLanguage,
      value:
        fields.language === null ? (
          intl.formatMessage(messages.preparationSetupNotAdded)
        ) : (
          <>
            {languageName} (<bdi dir="ltr">{fields.language}</bdi>)
          </>
        ),
      field: "language",
      action: messages.preparationSetupEdit,
      blocker: "language",
    },
    {
      key: "goals",
      label: messages.preparationGoals,
      value: filled(fields.learningGoals)
        ? fields.learningGoals
        : intl.formatMessage(messages.preparationSetupNotWritten),
      field: "learningGoals",
      action: filled(fields.learningGoals)
        ? messages.preparationSetupEdit
        : messages.preparationSetupWrite,
      blocker: "learning_goals",
    },
    {
      key: "instructions",
      label: messages.preparationInstructions,
      value: filled(fields.instructions)
        ? fields.instructions
        : intl.formatMessage(messages.preparationSetupNotWritten),
      field: "instructions",
      action: filled(fields.instructions)
        ? messages.preparationSetupEdit
        : messages.preparationSetupWrite,
      blocker: "ai_tutor_instructions",
    },
    {
      key: "curriculum",
      label: messages.preparationCurriculum,
      value: filled(fields.curriculum)
        ? fields.curriculum
        : intl.formatMessage(messages.preparationSetupNotAdded),
      field: "curriculum",
      action: filled(fields.curriculum)
        ? messages.preparationSetupEdit
        : messages.preparationSetupAdd,
      optional: true,
    },
    {
      key: "details",
      label: messages.preparationSetupDetails,
      value: (
        <>
          <bdi dir="auto">{course.name}</bdi> ·{" "}
          {filled(fields.description)
            ? fields.description
            : intl.formatMessage(messages.preparationSetupNoDescription)}
        </>
      ),
      field: "description",
      action: messages.preparationSetupEdit,
    },
    {
      key: "supervisors",
      label: messages.preparationSetupSupervisorLabel,
      value: intl.formatMessage(messages.preparationSetupSupervisors, {
        count: course.supervisors.length,
      }),
    },
  ];
  return (
    <section className="mt-8" aria-labelledby="course-setup-heading">
      <h2
        id="course-setup-heading"
        className="text-base/7 font-semibold text-gray-900"
      >
        {intl.formatMessage(messages.preparationSetupHeading)}
      </h2>
      <p className="mt-1 text-sm/6 text-gray-700">
        {intl.formatMessage(messages.preparationSetupIntro)}
      </p>
      <div className="mt-6 border-t border-gray-100">
        <dl className="divide-y divide-gray-100">
          {rows.map((row) => (
            <div
              key={row.key}
              className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0"
            >
              <dt className="text-sm/6 font-medium text-gray-900">
                {intl.formatMessage(row.label)}{" "}
                {row.optional ? (
                  <span className="inline-flex items-center rounded-full bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-700 inset-ring inset-ring-gray-500/20">
                    {intl.formatMessage(messages.preparationBadgeOptional)}
                  </span>
                ) : null}
              </dt>
              <dd className="mt-1 flex min-w-0 flex-wrap items-start gap-3 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0">
                <span className="min-w-0 grow wrap-anywhere">
                  <span
                    className={clsx(
                      "whitespace-pre-line",
                      ["goals", "instructions", "curriculum"].includes(
                        row.key,
                      ) && "line-clamp-2",
                    )}
                    dir="auto"
                  >
                    {row.value}
                  </span>
                  {row.blocker && blocked.has(row.blocker) ? (
                    <span className="mt-1 inline-flex items-center rounded-full bg-yellow-50 px-1.5 py-0.5 text-xs font-medium text-yellow-800 inset-ring inset-ring-yellow-600/20">
                      {intl.formatMessage(badge)}
                    </span>
                  ) : null}
                </span>
                {row.field && row.action ? (
                  <RouteDepartureLink
                    to={links.preparation(course.id, row.field)}
                    className="inline-flex min-h-6 shrink-0 items-center rounded-sm font-medium text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    aria-label={intl.formatMessage(
                      messages.preparationSetupActionName,
                      {
                        action: intl.formatMessage(row.action),
                        field: intl.formatMessage(row.label),
                      },
                    )}
                  >
                    {intl.formatMessage(row.action)}
                  </RouteDepartureLink>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

// Tailwind Plus: Application UI > Lists > Grid Lists > Horizontal link cards;
// Elements > Badges > Small pill with border. Library 2026-09-13-083323,
// v4/react-light.jsx. MIA: one full-card router link, local icon, no avatars.
function CourseEntries({
  preparation,
  links,
}: {
  readonly preparation: CoursePreparation;
  readonly links: CourseRouteProps["links"];
}) {
  const intl = useIntl();
  const materialBlocked = preparation.readiness.blockers.some(
    (blocker) => blocker.id === "qualifying_material",
  );
  const badge =
    preparation.course.state === "active"
      ? messages.preparationBadgeBlocksSessions
      : messages.preparationBadgeBlocksActivation;
  return (
    <section className="mt-8" aria-labelledby="course-entries-heading">
      <h2
        id="course-entries-heading"
        className="text-base/7 font-semibold text-gray-900"
      >
        {intl.formatMessage(messages.preparationEntriesHeading)}
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(
          [
            {
              key: "materials",
              icon: DocumentTextIcon,
              title: messages.preparationEntriesMaterialsTitle,
              body: messages.preparationEntriesMaterialsBody,
              to: links.materials(preparation.course.id),
            },
            {
              key: "students",
              icon: UserGroupIcon,
              title: messages.preparationEntriesStudentsTitle,
              body:
                preparation.course.state === "active"
                  ? messages.preparationEntriesStudentsActive
                  : messages.preparationEntriesStudentsInactive,
              to: links.students(preparation.course.id),
            },
          ] as const
        ).map((entry) => (
          <RouteDepartureLink
            key={entry.key}
            to={entry.to}
            className="relative flex min-w-0 items-start gap-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-xs hover:border-gray-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <entry.icon
              aria-hidden="true"
              className="size-10 shrink-0 rounded-full bg-gray-100 p-2 text-gray-700"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-gray-900">
                {intl.formatMessage(entry.title)}
              </span>
              {entry.key === "materials" && materialBlocked ? (
                <span className="mt-1 inline-flex items-center rounded-full bg-yellow-50 px-1.5 py-0.5 text-xs font-medium text-yellow-800 inset-ring inset-ring-yellow-600/20">
                  {intl.formatMessage(badge)}
                </span>
              ) : null}
              <span className="mt-1 block text-sm text-gray-700 wrap-anywhere">
                {intl.formatMessage(entry.body)}
              </span>
            </span>
          </RouteDepartureLink>
        ))}
      </div>
    </section>
  );
}

export default function CoursePreparationRoute({
  resource,
  links,
}: CourseRouteProps) {
  if (resource.kind !== "preparation" || resource.field !== null)
    throw new Error("Hub requires its admitted preparation resource.");
  const { preparation } = resource;
  return (
    <>
      <CourseHubStatus preparation={preparation} links={links} />
      {preparation.readiness.blockers.length > 0 ? (
        <CourseHubBlockers preparation={preparation} links={links} />
      ) : null}
      <CourseSetup preparation={preparation} links={links} />
      <CourseEntries preparation={preparation} links={links} />
    </>
  );
}

// Story 7.2 still owns the existing readiness-review presentation.
export function CoursePreparationStatus({
  preparation,
}: {
  readonly preparation: CoursePreparation;
}) {
  const intl = useIntl();
  return (
    <>
      <h2 className="text-base/7 font-semibold text-gray-900 wrap-anywhere">
        <bdi>{preparation.course.name}</bdi>
      </h2>
      <p className="mt-2 text-sm/6 text-gray-700">
        {intl.formatMessage(readinessMessages[preparation.readiness.state])}
      </p>
    </>
  );
}
