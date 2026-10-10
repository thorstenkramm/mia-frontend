import { useRef, useState } from "react";
import { useIntl } from "react-intl";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import {
  isHiddenLearnFailure,
  listApprovedCourseMaterialMetadata,
  listJoinedActiveCourses,
} from "../../platform/api/learnCourses";
import type { EntryApiFailure } from "../../platform/api/entry";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import { useRouteActivity } from "../../platform/ui/useRouteActivity";
import {
  CourseCheckedAt,
  CourseCollectionFeedback,
  CourseEmpty,
  CoursePagination,
  courseActionClass,
} from "./CourseListRoute";
import type {
  LearnCourseResource,
  LearnCourseRouteProps,
} from "./LearnCourseRouteProps";

// Tailwind Plus: Application UI > Lists > Tables > Simple; Data Display >
// Description Lists > Left-aligned. Library 2026-09-13-083323, v4/react-light.jsx.
// MIA: route owns h1; metadata only, wrapped/isolated authored names; no sample
// personal fields, attachment/download, edit or tutoring controls. Established
// CourseEmpty/Pagination/actions keep their recorded exact blueprint bindings.
export default function LearnCourseSurface(props: LearnCourseRouteProps) {
  const intl = useIntl();
  const { checkRouteAdmission } = useSessionActions();
  const { resource, links } = props;
  const [checkedAt] = useState(Date.now);
  return (
    <>
      {resource.kind === "list" ? null : (
        <>
          <div>
            <div className="px-4 sm:px-0">
              <h2 className="text-base/7 font-semibold text-gray-900">
                {intl.formatMessage(messages.learnCourse)}
              </h2>
              <CourseCheckedAt time={checkedAt} />
            </div>
            <div className="mt-6 border-t border-gray-100">
              <dl className="divide-y divide-gray-100">
                <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                  <dt className="text-sm/6 font-medium text-gray-900">
                    {intl.formatMessage(messages.coursesName)}
                  </dt>
                  <dd className="mt-1 text-sm/6 text-gray-700 wrap-anywhere sm:col-span-2 sm:mt-0">
                    <bdi>{resource.course.name}</bdi>
                  </dd>
                </div>
                <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                  <dt className="text-sm/6 font-medium text-gray-900">
                    {intl.formatMessage(messages.coursesState)}
                  </dt>
                  <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0">
                    {intl.formatMessage(messages.coursesActive)}
                  </dd>
                </div>
                <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                  <dt className="text-sm/6 font-medium text-gray-900">
                    {intl.formatMessage(messages.learnAcceptance)}
                  </dt>
                  <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0">
                    {intl.formatMessage(
                      resource.course.accepting
                        ? messages.learnAccepting
                        : messages.learnNotAccepting,
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <RouteDepartureLink
              to={
                resource.kind === "detail"
                  ? links.materials(resource.course.id)
                  : links.detail(resource.course.id)
              }
              className={courseActionClass}
            >
              {intl.formatMessage(
                resource.kind === "detail"
                  ? messages.learnMaterials
                  : messages.learnCourse,
              )}
            </RouteDepartureLink>
            <RouteDepartureLink to={links.list} className={courseActionClass}>
              {intl.formatMessage(messages.learnCourses)}
            </RouteDepartureLink>
          </div>
        </>
      )}
      <LearnCollection {...props} />
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          className={courseActionClass}
          onClick={() => void checkRouteAdmission()}
        >
          {intl.formatMessage(messages.invitationsRefresh)}
        </button>
        <RouteDepartureLink to="/" className={courseActionClass}>
          {intl.formatMessage(messages.invitationsBackToHome)}
        </RouteDepartureLink>
      </div>
    </>
  );
}

function LearnCollection({
  resource,
  links,
  unavailable,
}: LearnCourseRouteProps) {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const { readAuthenticated } = useSessionActions();
  const [collection, setCollection] = useState(resource);
  // Collection reads update only their receipt time, never the separately
  // checked course readiness above. Material rows cannot refresh course truth.
  const [checkedAt, setCheckedAt] = useState(Date.now);
  const heading = useRef<HTMLHeadingElement>(null);
  const { state, stateRef, mounted, update } = useRouteActivity<
    | { readonly kind: "Idle" | "Loading" }
    | { readonly kind: "Failed"; readonly error: EntryApiFailure }
  >({ kind: "Idle" });
  const load = async (offset: number) => {
    if (stateRef.current.kind === "Loading") return;
    update({ kind: "Loading" });
    const result = await readAuthenticated<LearnCourseResource>(
      async (signal) => {
        if (collection.kind === "list") {
          const batch = await listJoinedActiveCourses(
            collection.ids,
            offset,
            signal,
          );
          return {
            ...collection,
            batch: {
              ...batch,
              courses: [...collection.batch.courses, ...batch.courses],
            },
          };
        }
        return {
          ...collection,
          page: await listApprovedCourseMaterialMetadata(
            collection.course.id,
            offset,
            signal,
          ),
        };
      },
    );
    if (!mounted.current) return;
    if (result.kind === "completed") {
      setCollection(result.value);
      setCheckedAt(Date.now());
      update({ kind: "Idle" });
      heading.current?.focus();
      announce(intl.formatMessage(messages.learnCollectionUpdated), "polite");
    } else if (result.kind === "failed") {
      if (isHiddenLearnFailure(result.failure)) unavailable(result.failure);
      else {
        update({ kind: "Failed", error: result.failure });
        announce(intl.formatMessage(messages.coursesCheckFailed), "urgent");
      }
    }
  };
  const isList = collection.kind === "list";
  const rows = isList ? collection.batch.courses : collection.page.items;
  const label = isList ? messages.learnCourses : messages.learnMaterials;
  return (
    <>
      <h2
        ref={heading}
        tabIndex={-1}
        className="mt-6 text-base font-semibold text-gray-900"
      >
        {intl.formatMessage(label)}
      </h2>
      <CourseCheckedAt time={checkedAt} />
      <CourseCollectionFeedback
        state={state}
        retry={() =>
          void load(isList ? collection.batch.consumed : collection.page.offset)
        }
      />
      {state.kind === "Loading" ? null : rows.length === 0 ? (
        <CourseEmpty
          text={intl.formatMessage(
            isList
              ? collection.batch.consumed < collection.ids.length
                ? messages.learnBatchEmpty
                : messages.learnEmpty
              : messages.learnMaterialsEmpty,
          )}
        />
      ) : (
        <div className="mt-8 flow-root">
          <div
            className="overflow-x-auto"
            role="region"
            aria-label={intl.formatMessage(label)}
            tabIndex={0}
          >
            <div className="inline-block min-w-full py-2 align-middle">
              <table className="relative min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pr-3 text-left text-sm font-semibold text-gray-900"
                    >
                      {intl.formatMessage(messages.coursesName)}
                    </th>
                    {isList ? (
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                      >
                        {intl.formatMessage(messages.coursesState)}
                      </th>
                    ) : (
                      <>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          {intl.formatMessage(messages.materialKind)}
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          {intl.formatMessage(messages.materialFormat)}
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {collection.kind === "list"
                    ? collection.batch.courses.map((course) => (
                        <tr key={course.id}>
                          <td className="py-4 pr-3 text-sm font-medium text-gray-900 wrap-anywhere">
                            <RouteDepartureLink
                              to={links.detail(course.id)}
                              className="inline-flex min-h-6 items-center text-indigo-600 hover:text-indigo-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                            >
                              <bdi>{course.name}</bdi>
                            </RouteDepartureLink>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-700">
                            {intl.formatMessage(messages.coursesActive)}
                          </td>
                        </tr>
                      ))
                    : collection.page.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-4 pr-3 text-sm font-medium text-gray-900 wrap-anywhere">
                            <bdi>{item.name}</bdi>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-700 wrap-anywhere">
                            {intl.formatMessage(kindMessages[item.kind])}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-700 wrap-anywhere">
                            {intl.formatMessage(formatMessages[item.format])}
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {collection.kind === "list" ? (
        collection.batch.consumed < collection.ids.length ? (
          <button
            type="button"
            className={courseActionClass}
            disabled={state.kind === "Loading"}
            onClick={() => void load(collection.batch.consumed)}
          >
            {intl.formatMessage(messages.learnMore)}
          </button>
        ) : null
      ) : (
        <CoursePagination
          page={collection.page}
          busy={state.kind === "Loading"}
          load={(offset) => void load(offset)}
        />
      )}
    </>
  );
}
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
