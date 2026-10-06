import type { MfaState } from "../../platform/api/mfa";

// A profile MFA surface mounts only after its route-resource read succeeded.
export type MfaRouteProps = { readonly state: MfaState };
