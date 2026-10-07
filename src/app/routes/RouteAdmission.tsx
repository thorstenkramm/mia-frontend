import { useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { useSessionActions } from "../../platform/data/EntryDataProvider";

// Immediately withholds a new location's protected tree. The session owner
// performs reads and supersession; this hook binds that cycle to Router entry.
export function useRouteAdmission(canonicalPath: string | null): boolean {
  const location = useLocation();
  const { checkRouteAdmission } = useSessionActions();
  const [entry, setEntry] = useState(location.key);
  const observed = useRef(location.key);
  const replacement = useRef<string | null>(null);
  const sameEntry = entry === location.key;
  const canonicalReplacement = replacement.current === location.pathname;
  useLayoutEffect(() => {
    if (observed.current === location.key) {
      if (
        sameEntry &&
        canonicalPath !== null &&
        canonicalPath !== location.pathname
      )
        replacement.current = canonicalPath;
      return;
    }
    observed.current = location.key;
    setEntry(location.key);
    const replaced = replacement.current === location.pathname;
    replacement.current = null;
    if (!replaced) void checkRouteAdmission();
  }, [
    location.key,
    location.pathname,
    canonicalPath,
    sameEntry,
    checkRouteAdmission,
  ]);
  return sameEntry || canonicalReplacement;
}
