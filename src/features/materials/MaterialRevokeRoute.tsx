import type { MaterialRouteProps } from "./MaterialRouteProps";
import { MaterialApprovalSurface } from "./MaterialApprovalRoute";
// Tailwind Plus Simple alert, 2026-09-13-083323, v4/react-light.jsx. The shared
// action surface preserves revoke-specific consequences and definitive truth.
export default function MaterialRevokeRoute(props: MaterialRouteProps) {
  return <MaterialApprovalSurface {...props} mode="revoke" />;
}
