import type { CourseId, EntryApiFailure } from "../../platform/api/entry";
import type {
  Material,
  MaterialFile,
  MaterialId,
  MaterialPage,
  MaterialJobPage,
} from "../../platform/api/materials";
import { messages } from "../../platform/i18n/messages";

export type MaterialResource =
  | { readonly kind: "list"; readonly page: MaterialPage }
  | { readonly kind: "create" }
  | { readonly kind: "detail"; readonly material: Material }
  | {
      readonly kind: "brief" | "approval" | "revoke";
      readonly material: Material;
    }
  | {
      readonly kind: "processing";
      readonly material: Material;
      readonly files: readonly MaterialFile[];
      readonly jobs: MaterialJobPage;
    }
  | {
      readonly kind: "files";
      readonly material: Material;
      readonly files: readonly MaterialFile[];
    };
export type MaterialRouteProps = {
  readonly courseId: CourseId;
  readonly resource: MaterialResource;
  readonly links: {
    readonly parent: string;
    readonly list: string;
    readonly create: string;
    readonly detail: (id: MaterialId) => string;
    readonly files: (id: MaterialId) => string;
    readonly processing: (id: MaterialId) => string;
    readonly brief: (id: MaterialId) => string;
    readonly approval: (id: MaterialId) => string;
    readonly revoke: (id: MaterialId) => string;
  };
  readonly unavailable: (failure: EntryApiFailure | null) => void;
};
export const materialActionClass =
  "min-h-6 rounded-md bg-white px-3 py-2 text-sm font-semibold text-indigo-600 hover:text-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";
export const materialLabels = {
  "text-book": messages.materialTextBook,
  exam: messages.materialExam,
  worksheet: messages.materialWorksheet,
  website: messages.materialWebsite,
  youtube: messages.materialYoutube,
  pdf: messages.materialPdf,
  jpeg: messages.materialJpeg,
  png: messages.materialPng,
  text: messages.materialText,
  markdown: messages.materialMarkdown,
  docx: messages.materialDocx,
  link: messages.materialLink,
  "course-wide": messages.materialCourseWide,
  "student-private": messages.materialPrivate,
  draft: messages.materialDraft,
  processing: messages.materialProcessing,
  ready: messages.materialReady,
  failed: messages.materialFailed,
  processed: messages.materialProcessed,
  Selected: messages.materialSelected,
  Queued: messages.materialQueued,
  Uploading: messages.materialUploading,
  Verifying: messages.materialVerifying,
  Uploaded: messages.materialUploaded,
  Rejected: messages.materialRejected,
  "Outcome unknown": messages.materialUnknown,
  "Unknown abandonable": messages.materialUnknownAbandonable,
} as const;
