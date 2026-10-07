import { LogoutRecovery } from "./LogoutRecovery";

// Keep the route entry lazy; recovery itself must remain usable if this chunk
// is unavailable. Both normal rendering and the eager fallback use one owner.
export default function LogoutEntryRoute() {
  return <LogoutRecovery />;
}
