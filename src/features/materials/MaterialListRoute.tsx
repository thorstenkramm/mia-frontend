import { useRef, useState } from "react";
import { useIntl } from "react-intl";
import {
  isHiddenMaterialFailure,
  listMaterials,
} from "../../platform/api/materials";
import type { EntryApiFailure } from "../../platform/api/entry";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import { useRouteActivity } from "../../platform/ui/useRouteActivity";
import {
  materialActionClass,
  materialLabels,
  type MaterialRouteProps,
} from "./MaterialRouteProps";

// Tailwind Plus: Application UI > Lists > Stacked Lists > Narrow with actions;
// Navigation > Pagination > Card footer with page buttons. 2026-09-13-083323,
// v4/react-light.jsx. MIA: no avatars/truncation, authoritative scope labels,
// private rows without actions, server links only; no invented totals/page numbers.
export default function MaterialListRoute({
  resource,
  courseId,
  links,
  unavailable,
}: MaterialRouteProps) {
  const intl = useIntl();
  const { readAuthenticated, checkRouteAdmission } = useSessionActions();
  const { mounted } = useRouteActivity({ kind: "Collection" });
  const heading = useRef<HTMLHeadingElement>(null);
  const [page, setPage] = useState(
    resource.kind === "list" ? resource.page : null,
  );
  const [load, setLoad] = useState<"Idle" | "Reading">("Idle");
  const [error, setError] = useState<EntryApiFailure | null>(null);
  if (page === null)
    throw new Error("Materials require an admitted collection.");
  async function changePage(offset: number) {
    if (load === "Reading") return;
    setLoad("Reading");
    setError(null);
    const result = await readAuthenticated((signal) =>
      listMaterials(courseId, offset, signal),
    );
    if (!mounted.current) return;
    if (result.kind === "failed") {
      if (isHiddenMaterialFailure(result.failure)) {
        unavailable(result.failure);
        return;
      }
      setError(result.failure);
    } else if (result.kind === "completed") {
      setPage(result.value);
      heading.current?.focus();
    }
    setLoad("Idle");
  }
  return (
    <>
      <RouteDepartureLink to={links.create} className={materialActionClass}>
        {intl.formatMessage(messages.materialCreate)}
      </RouteDepartureLink>
      <h2
        ref={heading}
        tabIndex={-1}
        className="mt-6 text-base/7 font-semibold text-gray-900"
      >
        {intl.formatMessage(messages.materialsHeading)}
      </h2>
      {page.items.length === 0 ? (
        <p className="mt-3 text-sm/6 text-gray-700">
          {intl.formatMessage(messages.materialEmpty)}
        </p>
      ) : null}
      <ul className="divide-y divide-gray-100">
        {page.items.map((material) => (
          <li
            key={material.id}
            className="flex flex-col justify-between gap-4 py-5 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-auto">
              <p className="text-sm/6 font-semibold text-gray-900 wrap-anywhere">
                <bdi>{material.name}</bdi>
              </p>
              <p className="mt-1 text-sm/6 text-gray-700">
                {intl.formatMessage(materialLabels[material.scope])} ·{" "}
                {intl.formatMessage(materialLabels[material.state])} ·{" "}
                {intl.formatMessage(materialLabels[material.format])}
              </p>
              <p className="text-sm/6 text-gray-700">
                {intl.formatMessage(
                  material.approved
                    ? messages.materialApproved
                    : messages.materialUnapproved,
                )}
              </p>
            </div>
            {material.scope === "course-wide" ? (
              <RouteDepartureLink
                className={materialActionClass}
                to={links.detail(material.id)}
              >
                {intl.formatMessage(messages.materialDetail)}
              </RouteDepartureLink>
            ) : null}
          </li>
        ))}
      </ul>
      <nav
        aria-label={intl.formatMessage(messages.coursesPagination)}
        className="mt-6 flex flex-wrap gap-3 border-t border-gray-200 py-3"
      >
        {page.previousOffset === null ? null : (
          <button
            type="button"
            className={materialActionClass}
            disabled={load === "Reading"}
            onClick={() => void changePage(page.previousOffset ?? 0)}
          >
            {intl.formatMessage(messages.invitationsPreviousPage)}
          </button>
        )}
        {page.nextOffset === null ? null : (
          <button
            type="button"
            className={materialActionClass}
            disabled={load === "Reading"}
            onClick={() => void changePage(page.nextOffset ?? 0)}
          >
            {intl.formatMessage(messages.invitationsNextPage)}
          </button>
        )}
        <button
          type="button"
          className={materialActionClass}
          onClick={() => void checkRouteAdmission()}
        >
          {intl.formatMessage(messages.invitationsRefresh)}
        </button>
      </nav>
      {error === null ? null : (
        <>
          <p>{intl.formatMessage(messages.materialError)}</p>
          <TechnicalErrorDisclosure error={error} />
        </>
      )}
    </>
  );
}
