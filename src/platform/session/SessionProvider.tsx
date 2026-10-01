import {
  createContext,
  use,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  SessionController,
  type AuthenticationBootstrapState,
  type MfaRoute,
} from "./sessionController";

const SessionContext = createContext<SessionController | null>(null);

export function SessionProvider({
  children,
  controller: suppliedController,
}: {
  readonly children: ReactNode;
  readonly controller?: SessionController;
}) {
  const [ownedController] = useState(() => new SessionController());
  const controller = suppliedController ?? ownedController;
  useEffect(() => {
    controller.start();
    return () => controller.stop();
  }, [controller]);

  return <SessionContext value={controller}>{children}</SessionContext>;
}

function useSessionController(): SessionController {
  const controller = use(SessionContext);
  if (controller === null) {
    throw new Error("SessionProvider is required.");
  }
  return controller;
}

export function useAuthenticationBootstrapState(): AuthenticationBootstrapState {
  const controller = useSessionController();
  return useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
}

export function useSessionActions(): {
  readonly beginRestrictedLogout: () => void;
  readonly retryRestrictedLogout: () => void;
  readonly refreshLogoutStatus: () => void;
  readonly login: (username: string, password: string) => Promise<void>;
  readonly recheckLogin: () => Promise<void>;
  readonly selectMfaRoute: (route: MfaRoute) => void;
  readonly submitMfa: (route: MfaRoute, code: string) => Promise<void>;
  readonly recheckMfa: () => Promise<void>;
  readonly submitPasswordChange: (
    password: string,
    passwordConfirmation: string,
  ) => Promise<void>;
  readonly recheckPasswordChange: () => Promise<void>;
} {
  const controller = useSessionController();
  return {
    beginRestrictedLogout: () => controller.beginRestrictedLogout(),
    retryRestrictedLogout: () => controller.retryRestrictedLogout(),
    refreshLogoutStatus: () => controller.refreshLogoutStatus(),
    login: (username, password) => controller.login(username, password),
    recheckLogin: () => controller.recheckLogin(),
    selectMfaRoute: (route) => controller.selectMfaRoute(route),
    submitMfa: (route, code) => controller.submitMfa(route, code),
    recheckMfa: () => controller.recheckMfa(),
    submitPasswordChange: (password, passwordConfirmation) =>
      controller.submitPasswordChange(password, passwordConfirmation),
    recheckPasswordChange: () => controller.recheckPasswordChange(),
  };
}
