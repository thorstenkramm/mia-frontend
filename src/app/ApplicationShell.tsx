import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild,
} from "@headlessui/react";
import {
  Bars3Icon,
  HomeIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useIntl } from "react-intl";
import { Link, useLocation, useNavigate } from "react-router";
import {
  useAuthenticatedAccess,
  useSessionActions,
} from "../platform/data/EntryDataProvider";
import { messages } from "../platform/i18n/messages";
import {
  RouteDepartureProvider,
  useRouteDeparture,
  type RouteDeparture,
} from "../platform/ui/routeDeparture";
import { entryRoutes } from "./routes/entryRoutes";
import {
  BuildIdentifier,
  BypassLink,
  useRouteHeadingFocus,
} from "./routes/routeFrame";

type MessageDescriptor = (typeof messages)[keyof typeof messages];
type ShellLink = {
  readonly to: string;
  readonly label: MessageDescriptor;
  readonly icon: typeof HomeIcon;
};
type ShellGroup = {
  readonly label: MessageDescriptor;
  readonly links: readonly ShellLink[];
};

const homeLink: ShellLink = {
  to: entryRoutes.home.path,
  label: messages.shellHomeLink,
  icon: HomeIcon,
};

// Only implemented destinations whose capability and scope the current gate
// decision grants. Learn, Prepare, Mentor, and Administer join as their
// features land; an empty group is never shown.
function authorizedGroups(ownProfileView: boolean): readonly ShellGroup[] {
  const groups: ShellGroup[] = [
    {
      label: messages.shellProfileSecurityGroup,
      links: ownProfileView
        ? [
            {
              to: entryRoutes.mfaOverview.path,
              label: messages.shellMfaLink,
              icon: ShieldCheckIcon,
            },
          ]
        : [],
    },
  ];
  return groups.filter((group) => group.links.length > 0);
}

// Tailwind Plus: Application UI > Application Shells > Sidebar Layouts > Simple sidebar,
// v4/react-light.jsx. Library version: 2026-09-13-083323. MIA deltas: the remote logo
// becomes the product name as text; no avatar, cached name, or notification control;
// the bottom profile entry and the mobile avatar become Sign out; the mobile top bar is
// not sticky so it never obscures focus at high zoom and names the product, not the
// page; "Your teams" becomes one labelled list per authorized capability group without
// initials, its label darkened to gray-500 for text contrast; links are router links
// with a forced-colors current cue; transitions stop under reduced motion. The route
// heading follows Application UI > Headings > Page Headings > With actions without
// actions or truncation, so long translations wrap.
export function ApplicationShell({
  titleMessage,
  headingMessage,
  departureFallback,
  children,
}: {
  readonly titleMessage: MessageDescriptor;
  readonly headingMessage: MessageDescriptor;
  // Answers shell departures until the route content registers its own guard.
  readonly departureFallback?: () => RouteDeparture;
  readonly children: ReactNode;
}) {
  const intl = useIntl();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const headingRef = useRouteHeadingFocus(headingMessage.id);
  // Work deferred until the drawer has closed and its focus restoration ran.
  const afterDrawerClose = useRef<(() => void) | null>(null);
  const closeDrawer = (after?: () => void) => {
    afterDrawerClose.current = after ?? null;
    setNavigationOpen(false);
  };

  return (
    <RouteDepartureProvider fallback={departureFallback ?? null}>
      <title>{intl.formatMessage(titleMessage)}</title>
      <BypassLink target={mainRef} />
      <div className="min-h-screen bg-white">
        <Dialog
          open={navigationOpen}
          onClose={setNavigationOpen}
          className="relative z-50 lg:hidden"
          aria-label={intl.formatMessage(messages.shellNavigationLabel)}
        >
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0 motion-reduce:transition-none"
          />
          <div className="fixed inset-0 flex">
            <DialogPanel
              transition
              className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full motion-reduce:transition-none"
            >
              <TransitionChild>
                <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0 motion-reduce:duration-0">
                  <button
                    type="button"
                    onClick={() => setNavigationOpen(false)}
                    className="-m-2.5 p-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <span className="sr-only">
                      {intl.formatMessage(messages.shellCloseNavigation)}
                    </span>
                    <XMarkIcon
                      aria-hidden="true"
                      className="size-6 text-white"
                    />
                  </button>
                </div>
              </TransitionChild>
              <div className="relative flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-2">
                <ProductName />
                <ShellNavigation onNavigate={closeDrawer} />
                <DrawerClosed pending={afterDrawerClose} />
              </div>
            </DialogPanel>
          </div>
        </Dialog>

        {/* MIA delta: the persistent sidebar and top bar form the banner landmark. */}
        <header>
          {/* Static sidebar for desktop */}
          <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
            <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6">
              <ProductName />
              <ShellNavigation signOut />
            </div>
          </div>

          <div className="flex items-center gap-x-6 bg-white px-4 py-4 shadow-xs sm:px-6 lg:hidden">
            <button
              type="button"
              onClick={() => setNavigationOpen(true)}
              className="-m-2.5 p-2.5 text-gray-700 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 lg:hidden"
            >
              <span className="sr-only">
                {intl.formatMessage(messages.shellOpenNavigation)}
              </span>
              <Bars3Icon aria-hidden="true" className="size-6" />
            </button>
            <div className="flex-1 text-sm/6 font-semibold text-gray-900">
              {intl.formatMessage(messages.shellProductName)}
            </div>
            <SignOutButton className="-m-1.5 rounded-md p-1.5 text-sm/6 font-semibold text-gray-900 hover:bg-gray-50" />
          </div>
        </header>

        <main
          ref={mainRef}
          id="main-content"
          tabIndex={-1}
          className="py-10 lg:pl-72"
        >
          <div className="break-words px-4 sm:px-6 lg:px-8">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl/7 font-bold text-gray-900 sm:text-3xl sm:tracking-tight"
            >
              {intl.formatMessage(headingMessage)}
            </h1>
            <div className="mt-6 max-w-lg">{children}</div>
            <BuildIdentifier className="mt-10 break-all text-sm/6 text-gray-500" />
          </div>
        </main>
      </div>
    </RouteDepartureProvider>
  );
}

// Runs deferred work once the drawer panel unmounts. A macrotask follows the
// dialog's own focus restoration, so a refused departure can still move focus
// to the control that resolves it.
function DrawerClosed({
  pending,
}: {
  readonly pending: RefObject<(() => void) | null>;
}) {
  useEffect(
    () => () => {
      const after = pending.current;
      pending.current = null;
      if (after !== null) window.setTimeout(after, 0);
    },
    [pending],
  );
  return null;
}

function ProductName() {
  const intl = useIntl();
  return (
    <div className="flex h-16 shrink-0 items-center text-base font-semibold text-gray-900">
      {intl.formatMessage(messages.shellProductName)}
    </div>
  );
}

function SignOutButton({ className }: { readonly className: string }) {
  const intl = useIntl();
  const { beginAuthenticatedLogout } = useSessionActions();
  return (
    <button
      type="button"
      onClick={beginAuthenticatedLogout}
      className={clsx(
        className,
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
      )}
    >
      {intl.formatMessage(messages.logoutButton)}
    </button>
  );
}

// One navigation list rendered by both the desktop sidebar and the mobile drawer.
function ShellNavigation({
  onNavigate,
  signOut = false,
}: {
  // Closes the drawer; `after` runs once it has gone.
  readonly onNavigate?: (after?: () => void) => void;
  readonly signOut?: boolean;
}) {
  const intl = useIntl();
  const groupIdPrefix = useId();
  const access = useAuthenticatedAccess();
  const groups = authorizedGroups(access?.ownProfileView === true);

  return (
    <nav
      aria-label={intl.formatMessage(messages.shellNavigationLabel)}
      className="flex flex-1 flex-col"
    >
      <ul role="list" className="flex flex-1 flex-col gap-y-7">
        <li>
          <ul role="list" className="-mx-2 space-y-1">
            <li>
              <ShellNavigationLink
                link={homeLink}
                {...(onNavigate ? { onNavigate } : {})}
              />
            </li>
          </ul>
        </li>
        {groups.map((group, index) => {
          const labelId = `${groupIdPrefix}-group-${index}`;
          return (
            <li key={group.label.id}>
              <div
                id={labelId}
                className="text-xs/6 font-semibold text-gray-500"
              >
                {intl.formatMessage(group.label)}
              </div>
              <ul
                role="list"
                aria-labelledby={labelId}
                className="-mx-2 mt-2 space-y-1"
              >
                {group.links.map((link) => (
                  <li key={link.to}>
                    <ShellNavigationLink
                      link={link}
                      {...(onNavigate ? { onNavigate } : {})}
                    />
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
        {signOut ? (
          <li className="-mx-6 mt-auto">
            <SignOutButton className="flex w-full items-center gap-x-4 px-6 py-3 text-left text-sm/6 font-semibold text-gray-900 hover:bg-gray-50" />
          </li>
        ) : null}
      </ul>
    </nav>
  );
}

function ShellNavigationLink({
  link,
  onNavigate,
}: {
  readonly link: ShellLink;
  readonly onNavigate?: (after?: () => void) => void;
}) {
  const intl = useIntl();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const departure = useRouteDeparture();
  const current = pathname === link.to;
  const Icon = link.icon;
  return (
    <Link
      to={link.to}
      aria-current={current ? "page" : undefined}
      onClick={(event) => {
        // The mounted route decides whether this departure may happen.
        const decision = departure();
        if (decision.kind === "refuse") {
          event.preventDefault();
          if (onNavigate) onNavigate(decision.explain);
          else decision.explain();
          return;
        }
        onNavigate?.();
        if (!decision.replace && decision.release === undefined) return;
        event.preventDefault();
        navigate(link.to, { replace: decision.replace });
        decision.release?.();
      }}
      className={clsx(
        current
          ? "bg-gray-50 text-indigo-600 forced-colors:underline"
          : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600",
        "group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
      )}
    >
      <Icon
        aria-hidden="true"
        className={clsx(
          current
            ? "text-indigo-600"
            : "text-gray-400 group-hover:text-indigo-600",
          "size-6 shrink-0",
        )}
      />
      {intl.formatMessage(link.label)}
    </Link>
  );
}
