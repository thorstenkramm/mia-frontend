// The synchronous pre-application bootstrap shared by the fragment-token links
// (password reset and invitation). It reads the fragment once and removes the
// complete fragment before React, the router, or any request can observe it.

// Exactly one canonical lowercase UUID v4 token; anything else is unusable.
const tokenFragment =
  /^#token=([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/u;

// On any of `strippedPaths`, removes the complete fragment. Returns the token
// only for an exact token fragment on `tokenPath`; otherwise `null`.
export function captureFragmentToken(
  location: Location,
  history: History,
  tokenPath: string,
  strippedPaths: readonly string[],
): string | null {
  if (!strippedPaths.includes(location.pathname)) return null;
  const fragment = location.hash;
  if (fragment !== "")
    history.replaceState(
      history.state,
      "",
      `${location.pathname}${location.search}`,
    );
  if (location.pathname !== tokenPath) return null;
  return tokenFragment.exec(fragment)?.[1] ?? null;
}

// A fragment added to an already running link page (a same-document navigation,
// such as pasting the link into this tab) never reaches the bootstrap. Reloading
// hands it to the single synchronous capture instead of leaving it in the URL.
// In-page navigation to an element of this document is not link ingestion and
// never reloads, so it cannot discard the flow.
export function reloadOnLateFragment(
  target: Window,
  paths: readonly string[],
): () => void {
  const reload = () => {
    const { hash, pathname } = target.location;
    if (!paths.includes(pathname) || hash === "") return;
    if (target.document.getElementById(decodeFragment(hash.slice(1))) !== null)
      return;
    target.location.reload();
  };
  target.addEventListener("hashchange", reload);
  return () => target.removeEventListener("hashchange", reload);
}

function decodeFragment(fragment: string): string {
  try {
    return decodeURIComponent(fragment);
  } catch {
    // A malformed escape cannot name an element of this document.
    return fragment;
  }
}
