import {
  createContext,
  use,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { MfaEnrollment } from "./mfaEnrollment";
import { MaterialUpload } from "../transfer/materialUpload";
import {
  SessionController,
  type AuthenticatedAccess,
  type AuthenticatedMutationResult,
  type AuthenticatedReadResult,
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

type SessionContextValue = {
  readonly controller: SessionController;
  readonly mfaEnrollment: MfaEnrollment;
  readonly materialUpload: MaterialUpload;
};

const SessionContext = createContext<SessionContextValue | null>(null);

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
  const [mfaEnrollment] = useState(() => new MfaEnrollment(controller));
  const [materialUpload] = useState(() => new MaterialUpload(controller));
  useEffect(() => {
    // Abort transfer work before cache purge and protected UI notification.
    const unregisterTransfer = controller.registerSecurityTeardown(() =>
      materialUpload.destroy(),
    );
    const unregister = controller.registerSecurityTeardown(onSecurityTeardown);
    const unregisterMfa = controller.registerSecurityTeardown((scope) =>
      mfaEnrollment.observeTeardown(scope),
    );
    const shield = () => flushSync(() => controller.shield());
    const observe = () => flushSync(() => controller.observeLifecycle());
    // Only a page that may enter BFCache keeps masked MFA secrets.
    const pageHide = (event: PageTransitionEvent) =>
      flushSync(() => {
        materialUpload.destroy();
        if (!event.persisted) mfaEnrollment.destroy();
        controller.shield("lifecycle", true);
      });
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
      materialUpload.destroy();
      onSecurityTeardown();
      mfaEnrollment.destroy();
      unregisterMfa();
      unregisterTransfer();
      unregister();
    };
  }, [controller, materialUpload, mfaEnrollment, onSecurityTeardown]);

  return (
    <SessionContext value={{ controller, mfaEnrollment, materialUpload }}>
      {children}
    </SessionContext>
  );
}

function useSessionContext(): SessionContextValue {
  const context = use(SessionContext);
  if (context === null) {
    throw new Error("SessionProvider is required.");
  }
  return context;
}

function useSessionController(): SessionController {
  return useSessionContext().controller;
}

// The current tab's passed gate decisions; `null` unless authenticated.
export function useAuthenticatedAccess(): AuthenticatedAccess | null {
  const controller = useSessionController();
  return useSyncExternalStore(
    controller.subscribe,
    controller.getAuthenticatedAccess,
    controller.getAuthenticatedAccess,
  );
}

export function useMfaEnrollment(): MfaEnrollment {
  return useSessionContext().mfaEnrollment;
}

export function useMaterialUpload(): MaterialUpload {
  return useSessionContext().materialUpload;
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
  readonly checkRouteAdmission: () => Promise<void>;
  readonly markRevalidationNeeded: () => void;
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
  // A route-resource or dependent read; never refreshes idle expiry.
  readonly readAuthenticated: <T>(
    read: (signal: AbortSignal) => Promise<T>,
  ) => Promise<AuthenticatedReadResult<T>>;
  // One authenticated unsafe request, dispatched at most once, never replayed.
  readonly runAuthenticatedMutation: <T>(
    request: { send: ((csrf: string) => Promise<T>) | null },
    isCurrent: () => boolean,
  ) => Promise<AuthenticatedMutationResult<T>>;
} {
  const controller = useSessionController();
  return {
    readAuthenticated: (read) => controller.readAuthenticated(read),
    runAuthenticatedMutation: (request, isCurrent) =>
      controller.runAuthenticatedMutation(request, isCurrent),
    checkRouteAdmission: () => controller.checkRouteAdmission(),
    // The existing notification-only 1.8 lifecycle transition; feature
    // transport loss must not initiate authenticated discovery.
    markRevalidationNeeded: () => controller.observeLifecycle(),
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
