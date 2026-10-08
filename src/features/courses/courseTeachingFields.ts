import type { CourseTeachingField } from "../../platform/api/courses";
import { messages } from "../../platform/i18n/messages";

// One descriptor per distinct persisted field; no activation policy here.
export const courseTeachingFields = {
  description: {
    slug: "details",
    label: messages.preparationDescription,
    heading: messages.preparationDetails,
    title: messages.preparationDetailsTitle,
    example: messages.preparationDescriptionExample,
    points: 4000,
    bytes: 16384,
  },
  curriculum: {
    slug: "curriculum",
    label: messages.preparationCurriculum,
    heading: messages.preparationCurriculum,
    title: messages.preparationCurriculumTitle,
    example: messages.preparationCurriculumExample,
    points: 16000,
    bytes: 65536,
  },
  learningGoals: {
    slug: "learning-goals",
    label: messages.preparationGoals,
    heading: messages.preparationGoals,
    title: messages.preparationGoalsTitle,
    example: messages.preparationGoalsExample,
    points: 16000,
    bytes: 65536,
  },
  instructions: {
    slug: "ai-instructions",
    label: messages.preparationInstructions,
    heading: messages.preparationInstructions,
    title: messages.preparationInstructionsTitle,
    example: messages.preparationInstructionsExample,
    points: 16000,
    bytes: 65536,
  },
  language: {
    slug: "language",
    label: messages.preparationLanguage,
    heading: messages.preparationLanguage,
    title: messages.preparationLanguageTitle,
    example: messages.preparationLanguageExample,
    points: null,
    bytes: null,
  },
} as const satisfies Record<
  CourseTeachingField,
  {
    readonly slug: string;
    readonly label: (typeof messages)[keyof typeof messages];
    readonly heading: (typeof messages)[keyof typeof messages];
    readonly title: (typeof messages)[keyof typeof messages];
    readonly example: (typeof messages)[keyof typeof messages];
    readonly points: number | null;
    readonly bytes: number | null;
  }
>;
export function courseTextCounts(value: string) {
  return {
    points: [...value].length,
    bytes: new TextEncoder().encode(value).length,
  };
}
export function teachingTextInvalid(
  field: CourseTeachingField,
  value: string,
): boolean {
  const bounds = courseTeachingFields[field];
  const count = courseTextCounts(value);
  return (
    (bounds.points !== null && count.points > bounds.points) ||
    (bounds.bytes !== null && count.bytes > bounds.bytes)
  );
}
