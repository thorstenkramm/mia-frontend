import {
  createContext,
  use,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import {
  SessionController,
  type AuthenticationBootstrapState,
  type MfaRoute,
  type PublicMutationResult,
} from "./sessionController";
import type {
  InvitationAcceptanceFields,
  InvitationRole,
  InvitationToken,
  PasswordResetToken,
} from "../api/entry";

const SessionContext = createContext<SessionController | null>(null);

export function SessionProvider({
  children,
  controller: suppliedController,
  deferCapabilityGate = false,
  onSecurityTeardown,
}: {
  readonly children: ReactNode;
  readonly controller?: SessionController;
  readonly deferCapabilityGate?: boolean;
  readonly onSecurityTeardown: () => void;
}) {
  const [ownedController] = useState(
    () => new SessionController({ deferCapabilityGate }),
  );
  const controller = suppliedController ?? ownedController;
  useEffect(() => {
    const unregister = controller.registerSecurityTeardown(onSecurityTeardown);
    const shield = () => flushSync(() => controller.shield());
    const observe = () => flushSync(() => controller.observeLifecycle());
    const pageHide = () =>
      flushSync(() => controller.shield("lifecycle", true));
    const pageShow = (event: PageTransitionEvent) => {
      if (event.persisted) shield();
    };
    window.addEventListener("pagehide", pageHide);
    window.addEventListener("pageshow", pageShow);
    window.addEventListener("focus", observe);
    window.addEventListener("online", observe);
    document.addEventListener("visibilitychange", observe);
    // Network Information is optional (not available in every supported browser).
    const connection =
      "connection" in navigator && navigator.connection instanceof EventTarget
        ? navigator.connection
        : null;
    connection?.addEventListener("change", observe);
    controller.start();
    return () => {
      window.removeEventListener("pagehide", pageHide);
      window.removeEventListener("pageshow", pageShow);
      window.removeEventListener("focus", observe);
      window.removeEventListener("online", observe);
      document.removeEventListener("visibilitychange", observe);
      connection?.removeEventListener("change", observe);
      controller.stop();
      onSecurityTeardown();
      unregister();
    };
  }, [controller, onSecurityTeardown]);

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
  readonly stopLifecycleWaiting: () => void;
  readonly continueWorking: () => Promise<void>;
  readonly refreshSession: () => Promise<void>;
  readonly beginAuthenticatedLogout: () => void;
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
  readonly beginLinkLogout: () => boolean;
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
  readonly previewInvitation: (
    token: InvitationToken,
    isCurrent: () => boolean,
    signal: AbortSignal,
  ) => Promise<PublicMutationResult<InvitationRole>>;
  readonly acceptInvitation: (
    token: InvitationToken,
    fields: InvitationAcceptanceFields,
    isCurrent: () => boolean,
    signal: AbortSignal,
  ) => Promise<PublicMutationResult>;
} {
  const controller = useSessionController();
  return {
    stopLifecycleWaiting: () => controller.stopLifecycleWaiting(),
    continueWorking: () => controller.continueWorking(),
    refreshSession: () => controller.refreshSession(),
    beginAuthenticatedLogout: () => controller.beginAuthenticatedLogout(),
    previewInvitation: (token, isCurrent, signal) =>
      controller.previewInvitation(token, isCurrent, signal),
    acceptInvitation: (token, fields, isCurrent, signal) =>
      controller.acceptInvitation(token, fields, isCurrent, signal),
    beginLinkLogout: () => controller.beginLinkLogout(),
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
