import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import type { EntryApiFailure } from "../api/entry";
import { SessionProvider } from "../session/SessionProvider";
import type { SessionController } from "../session/sessionController";

export type EntryError = EntryApiFailure;

const entryQueryOptions = {
  gcTime: 0,
  refetchOnMount: false,
  refetchOnReconnect: false,
  refetchOnWindowFocus: false,
  retry: false,
  staleTime: Number.POSITIVE_INFINITY,
} as const;

export function createEntryQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: entryQueryOptions },
  });
}

export type EntryQueryClient = QueryClient;

type EntryDataProviderProps = {
  children: ReactNode;
  queryClient?: QueryClient;
  sessionController?: SessionController;
  deferCapabilityGate?: boolean;
};

export function EntryDataProvider({
  children,
  queryClient: suppliedQueryClient,
  sessionController,
  deferCapabilityGate = false,
}: EntryDataProviderProps) {
  const [ownedQueryClient] = useState(createEntryQueryClient);
  const queryClient = suppliedQueryClient ?? ownedQueryClient;
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider
        deferCapabilityGate={deferCapabilityGate}
        {...(sessionController ? { controller: sessionController } : {})}
      >
        {children}
      </SessionProvider>
    </QueryClientProvider>
  );
}

export {
  useAuthenticationBootstrapState,
  useSessionActions,
} from "../session/SessionProvider";
export type { AuthenticationBootstrapState } from "../session/sessionController";
