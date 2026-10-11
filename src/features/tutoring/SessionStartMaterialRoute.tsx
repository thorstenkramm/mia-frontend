import { useRef, useState } from "react";
import { useIntl } from "react-intl";
import {
  listApprovedCourseMaterialMetadata,
  type LearnCourse,
  type LearnMaterialPage,
} from "../../platform/api/learnCourses";
import type { EntryApiFailure } from "../../platform/api/entry";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import {
  NotAcceptingSession,
  ResumeActiveSession,
  TutoringCheckedAt,
  TutoringCollectionFeedback,
  TutoringExits,
  TutoringPagination,
  tutoringActionClass,
  useTutoringCollection,
} from "./SessionStartCourseChoiceRoute";
import type { TutoringLinks } from "./TutoringRouteProps";
import type { TutoringRouteProps } from "./TutoringRouteProps";

// The material choice admits exactly one course (ordered gate) and renders
// the BCG-002 resume presentation or the not-accepting truth instead of the
// choice when the host's discovery or eligibility says so. Story 6.2 (D1/D2):
// the primary action is Continue to the intent route carrying the single
// optional selection in location state; session creation no longer happens
// on this route.
export default function SessionStartMaterialRoute(props: TutoringRouteProps) {
  if (props.resource.kind !== "material-choice")
    throw new Error("Material choice requires its admitted course resource.");
  if (props.resource.active !== null)
    return (
      <ResumeActiveSession
        session={props.resource.active}
        links={props.links}
      />
    );
  if (props.resource.page === null)
    return (
      <NotAcceptingSession course={props.resource.course} links={props.links} />
    );
  return (
    <MaterialChoice
      course={props.resource.course}
      initial={props.resource.page}
      links={props.links}
      unavailable={props.unavailable}
    />
  );
}

// Tailwind Plus: Application UI > Forms > Radio Groups > Simple list,
// v4/react-light.jsx, library 2026-09-13-083323. MIA deltas (D6): localized
// fieldset/legend, an explicit default "No material" option, per-option name
// plus kind/format description, opaque radio ids/values only, controlled
// selection that survives pagination, and the Continue handoff to the intent
// route as the one primary action. Metadata labels mirror the Learn surface's
// server-parsed kind/format maps; the cross-feature import is barred by the
// architecture rule, so the maps are jscpd-marked here and a note at
// features/courses/LearnCourseSurface.tsx points here.
// jscpd:ignore-start
const kindMessages = {
  "text-book": messages.materialTextBook,
  exam: messages.materialExam,
  worksheet: messages.materialWorksheet,
  website: messages.materialWebsite,
  youtube: messages.materialYoutube,
} as const;
const formatMessages = {
  pdf: messages.materialPdf,
  jpeg: messages.materialJpeg,
  png: messages.materialPng,
  text: messages.materialText,
  markdown: messages.materialMarkdown,
  docx: messages.materialDocx,
  link: messages.materialLink,
} as const;
// jscpd:ignore-end
const radioClass =
  "relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden";
const continueClass =
  "inline-flex min-h-6 items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

function MaterialChoice({
  course,
  initial,
  links,
  unavailable,
}: {
  readonly course: LearnCourse;
  readonly initial: LearnMaterialPage;
  readonly links: TutoringLinks;
  readonly unavailable: (failure: EntryApiFailure | null) => void;
}) {
  const intl = useIntl();
  const [page, setPage] = useState(initial);
  const [checkedAt, setCheckedAt] = useState(Date.now);
  // The single optional selection is component state, so explicit pagination
  // never drops it; the Continue handoff carries it as location state (D2).
  const [selection, setSelection] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const collection = useTutoringCollection(unavailable);
  // The paginated-load callback rhymes with SessionStartCourseChoiceRoute's
  // course-page loader; the routes are separate surfaces with separate
  // admission contracts, so the jscpd marker lives here and a note there
  // points here.
  // jscpd:ignore-start
  const load = (offset: number) =>
    void collection.load(
      (signal) => listApprovedCourseMaterialMetadata(course.id, offset, signal),
      (value) => {
        setPage(value);
        setCheckedAt(Date.now());
        heading.current?.focus();
      },
    );
  // jscpd:ignore-end
  return (
    <>
      <h2
        ref={heading}
        tabIndex={-1}
        className="text-base font-semibold text-gray-900"
      >
        {intl.formatMessage(messages.tutoringMaterialHeading)}
      </h2>
      <p className="mt-2 text-sm/6 text-gray-700 wrap-anywhere">
        <bdi>{course.name}</bdi>
      </p>
      <TutoringCheckedAt time={checkedAt} />
      <fieldset className="mt-6">
        <legend className="text-sm/6 font-semibold text-gray-900">
          {intl.formatMessage(messages.tutoringMaterialLegend)}
        </legend>
        <p className="mt-1 text-sm/6 text-gray-600">
          {intl.formatMessage(messages.tutoringMaterialHelp)}
        </p>
        <div className="mt-6 space-y-6">
          <div className="flex items-center">
            <input
              id="material-none"
              name="material"
              type="radio"
              value=""
              checked={selection === ""}
              onChange={() => setSelection("")}
              className={radioClass}
            />
            <label
              htmlFor="material-none"
              className="ml-3 block text-sm/6 font-medium text-gray-900"
            >
              {intl.formatMessage(messages.tutoringNoMaterial)}
            </label>
          </div>
          {collection.state.kind === "Loading"
            ? null
            : page.items.map((item) => (
                <div key={item.id} className="flex items-center">
                  <input
                    id={`material-${item.id}`}
                    name="material"
                    type="radio"
                    value={item.id}
                    checked={selection === item.id}
                    onChange={() => setSelection(item.id)}
                    className={radioClass}
                  />
                  <label
                    htmlFor={`material-${item.id}`}
                    className="ml-3 block text-sm/6 font-medium text-gray-900"
                  >
                    <span className="wrap-anywhere">
                      <bdi>{item.name}</bdi>
                    </span>
                    <span className="block font-normal wrap-anywhere text-gray-500">
                      {intl.formatMessage(kindMessages[item.kind])} ·{" "}
                      {intl.formatMessage(formatMessages[item.format])}
                    </span>
                  </label>
                </div>
              ))}
        </div>
      </fieldset>
      <TutoringCollectionFeedback
        state={collection.state}
        retry={() => load(page.offset)}
      />
      <TutoringPagination
        page={page}
        busy={collection.state.kind === "Loading"}
        load={load}
      />
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <RouteDepartureLink
          to={links.intent(course.id)}
          state={{ material: selection === "" ? null : selection }}
          className={continueClass}
        >
          {intl.formatMessage(messages.tutoringMaterialContinue)}
        </RouteDepartureLink>
        <RouteDepartureLink to={links.start} className={tutoringActionClass}>
          {intl.formatMessage(messages.tutoringChooseCourse)}
        </RouteDepartureLink>
        <TutoringExits links={links} refresh />
      </div>
    </>
  );
}
