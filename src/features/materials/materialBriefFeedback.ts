import type { IntlShape } from "react-intl";
import type { BriefError } from "../../platform/api/materialBrief";
import { messages } from "../../platform/i18n/messages";

// Controlled editor and summary share the same localized field identity/reason.
export function briefErrorText(intl: IntlShape, error: BriefError): string {
  const labels = {
    summary: messages.materialSummary,
    subjects: messages.materialSubjects,
    learning_goals: messages.materialLearningGoals,
    sections: messages.materialSections,
    label: messages.materialSectionLabel,
    title: messages.materialSectionTitle,
    description: messages.materialSectionDescription,
    search_terms: messages.materialSearchTerms,
    warnings: messages.materialWarnings,
    educational_level: messages.materialLevel,
  };
  const field = error.field
    .split(".")
    .map((part) => {
      const label = Object.entries(labels).find(([key]) => key === part)?.[1];
      return label ? intl.formatMessage(label) : String(Number(part) + 1);
    })
    .join(" — ");
  const descriptor = {
    required: messages.materialRequired,
    minimum: messages.materialMinimumItems,
    maximum: messages.materialMaximum,
    items: messages.materialMaximumItems,
    encoded: messages.materialEncoded,
    sequence: messages.materialSequence,
  }[error.reason];
  return `${field}: ${intl.formatMessage(descriptor, { limit: error.limit })}`;
}
