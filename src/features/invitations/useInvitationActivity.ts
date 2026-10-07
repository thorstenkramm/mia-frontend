import { useLayoutEffect, useRef, useState } from "react";

// Route-local activity bookkeeping shared by create/resend/revoke. A completion
// must inspect the latest transition synchronously (including Stop waiting),
// and may only settle while this route is mounted. The callers still own their
// distinct state machines, attempt identities, dispatch and reconciliation.
export function useInvitationActivity<State extends { readonly kind: string }>(
  initial: State,
) {
  const [state, setState] = useState(initial);
  const stateRef = useRef(state);
  const mounted = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const update = (next: State) => {
    stateRef.current = next;
    setState(next);
  };
  return { state, stateRef, mounted, update };
}
