/// <reference types="vite/client" />

declare const __MIA_BUILD_ID__: string;

declare module "virtual:mia-locale-recovery" {
  const copy: Record<
    import("./platform/i18n/locales").Locale,
    Record<
      | "route.unavailable"
      | "route.loadFailed"
      | "route.reload"
      | "entry.invitation.preview.tryAgain"
      | "entry.skipLink",
      string
    >
  >;
  export default copy;
}
