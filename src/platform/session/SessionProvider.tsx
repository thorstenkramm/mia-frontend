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
  type PublicMutationResult,
} from "./sessionController";
import type { PasswordResetToken } from "../api/entry";

const SessionContext = createContext<SessionController | null>(null);

export function SessionProvider({
  children,
  controller: suppliedController,
  deferCapabilityGate = false,
}: {
  readonly children: ReactNode;
  readonly controller?: SessionController;
  readonly deferCapabilityGate?: boolean;
}) {
  const [ownedController] = useState(
    () => new SessionController({ deferCapabilityGate }),
  );
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
  readonly beginResetLinkLogout: () => boolean;
  readonly continueDeferredAccess: () => Promise<void>;
  readonly requestPasswordRecovery: (
    username: string,
    isCurrent: () => boolean,
  ) => Promise<PublicMutationResult>;
  readonly resetPassword: (
    token: PasswordResetToken,
    password: string,
    passwordConfirmation: string,
    isCurrent: () => boolean,
    signal: AbortSignal,
  ) => Promise<PublicMutationResult>;
} {
  const controller = useSessionController();
  return {
    beginResetLinkLogout: () => controller.beginResetLinkLogout(),
    continueDeferredAccess: () => controller.continueDeferredAccess(),
    requestPasswordRecovery: (username, isCurrent) =>
      controller.requestPasswordRecovery(username, isCurrent),
    resetPassword: (token, password, passwordConfirmation, isCurrent, signal) =>
      controller.resetPassword(
        token,
        password,
        passwordConfirmation,
        isCurrent,
        signal,
      ),
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
