import { Component, Suspense, type ReactNode } from "react";
import { useIntl } from "react-intl";
import { messages } from "../../platform/i18n/messages";
import { RouteRecoveryPanel } from "../../platform/ui/RouteRecoveryPanel";

class RouteErrorBoundary extends Component<
  { readonly fallback: ReactNode; readonly children: ReactNode },
  { readonly failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError(): { readonly failed: boolean } {
    // Never retain the arbitrary exception, props, stack or import URL.
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function RouteRecoveryBoundary({
  children,
  canReload = true,
  actions,
  recovery,
}: {
  readonly children: ReactNode;
  readonly canReload?: boolean;
  readonly actions?: ReactNode;
  readonly recovery?: ReactNode;
}) {
  const intl = useIntl();
  return (
    <RouteErrorBoundary
      fallback={
        recovery ?? (
          <RouteRecoveryPanel
            heading={intl.formatMessage(messages.routeUnavailable)}
            actions={
              <>
                {canReload ? (
                  <button
                    type="button"
                    className="rounded-md px-2 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
                    onClick={() => window.location.reload()}
                  >
                    {intl.formatMessage(messages.routeReload)}
                  </button>
                ) : null}
                {actions}
              </>
            }
          >
            <p>
              {intl.formatMessage(
                canReload
                  ? messages.routeLoadFailed
                  : messages.routeCodesLoadFailed,
              )}
            </p>
          </RouteRecoveryPanel>
        )
      }
    >
      <Suspense
        fallback={
          <p className="mt-6 text-sm/6 text-gray-600">
            {intl.formatMessage(messages.routeLoading)}
          </p>
        }
      >
        {children}
      </Suspense>
    </RouteErrorBoundary>
  );
}
