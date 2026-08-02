/**
 * Shared Clerk readiness check for middleware + server auth.
 * Keep these in sync so we never call auth() without clerkMiddleware().
 */
export function isClerkConfigured(): boolean {
  return Boolean(
    process.env.CLERK_SECRET_KEY?.trim() &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim(),
  );
}

export function isDevAuthBypassEnabled(): boolean {
  return process.env.DEV_AUTH_BYPASS === "true";
}

/** Use local/demo auth instead of Clerk (no middleware protect, no auth()). */
export function shouldBypassClerkAuth(): boolean {
  return isDevAuthBypassEnabled() || !isClerkConfigured();
}
