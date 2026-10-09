import { useIntl } from "react-intl";
import type { MaterialBrief } from "../../platform/api/materialBrief";
import { ModelMarkdown } from "../../platform/markdown/ModelMarkdown";
import { UserText } from "../../platform/markdown/UserText";
import { messages } from "../../platform/i18n/messages";

// Tailwind Plus: Application UI > Data Display > Description Lists > Left-aligned
// with inline actions, 2026-09-13-083323, v4/react-light.jsx. MIA: native h2/h3
// context, every persisted field, nullable state, escaped labels, AD-6 narratives.
export function MaterialBriefPreview({
  brief,
  label,
}: {
  brief: MaterialBrief;
  label: string;
}) {
  const intl = useIntl();
  const list = (values: readonly string[] | null) =>
    values === null ? (
      <p>{intl.formatMessage(messages.materialAbsent)}</p>
    ) : (
      <ul className="list-inside list-disc">
        {values.map((value, index) => (
          <li key={index}>
            <UserText text={value} />
          </li>
        ))}
      </ul>
    );
  return (
    <section
      className="mt-6 min-w-0 space-y-4 wrap-anywhere"
      aria-label={label}
    >
      <h2 className="text-base/7 font-semibold text-gray-900">{label}</h2>
      <h3 className="font-semibold">
        {intl.formatMessage(messages.materialSummary)}
      </h3>
      <ModelMarkdown
        text={brief.summary}
        context={intl.formatMessage(messages.materialSummary)}
      />
      <dl className="divide-y divide-gray-100 border-t border-gray-100">
        {(
          [
            [messages.materialSubjects, brief.subjects],
            [messages.materialLearningGoals, brief.learning_goals],
            [messages.materialWarnings, brief.warnings],
          ] as const
        ).map(([descriptor, values]) => (
          <div key={descriptor.id} className="py-6">
            <dt className="text-sm/6 font-medium text-gray-900">
              {intl.formatMessage(descriptor)}
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700">{list(values)}</dd>
          </div>
        ))}
        <div className="py-6">
          <dt className="text-sm/6 font-medium text-gray-900">
            {intl.formatMessage(messages.materialLevel)}
          </dt>
          <dd>
            {brief.educational_level === null ? (
              intl.formatMessage(messages.materialAbsent)
            ) : (
              <UserText text={brief.educational_level} />
            )}
          </dd>
        </div>
      </dl>
      <h3 className="font-semibold">
        {intl.formatMessage(messages.materialSections)}
      </h3>
      {brief.sections === null ? (
        <p>{intl.formatMessage(messages.materialAbsent)}</p>
      ) : (
        brief.sections.map((section) => (
          <section
            key={section.sequence}
            className="space-y-3 border-b border-gray-100 py-6"
          >
            <h3 className="font-semibold">
              {section.sequence} — <UserText text={section.title} />
            </h3>
            <dl>
              <dt>{intl.formatMessage(messages.materialSectionLabel)}</dt>
              <dd>
                {section.label === null ? (
                  intl.formatMessage(messages.materialAbsent)
                ) : (
                  <UserText text={section.label} />
                )}
              </dd>
            </dl>
            <ModelMarkdown
              text={section.description}
              context={`${intl.formatMessage(messages.materialSections)} ${section.sequence}`}
            />
            <dl>
              <dt>{intl.formatMessage(messages.materialSearchTerms)}</dt>
              <dd>{list(section.search_terms)}</dd>
            </dl>
          </section>
        ))
      )}
    </section>
  );
}
