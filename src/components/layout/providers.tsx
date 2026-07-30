"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { Toaster } from "sonner";
import { ClerkProvider } from "@clerk/nextjs";
import { I18nProvider } from "@/i18n";

const bypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true";

function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <I18nProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryClientProvider client={client}>
          {children}
          <Toaster richColors closeButton position="top-right" />
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  if (bypass || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <AppProviders>{children}</AppProviders>;
  }

  return (
    <ClerkProvider>
      <AppProviders>{children}</AppProviders>
    </ClerkProvider>
  );
}
