import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

const bypass = process.env.DEV_AUTH_BYPASS === "true";
const clerkConfigured = Boolean(
  process.env.CLERK_SECRET_KEY?.trim() &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim(),
);

const clerkHandler = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

function passthroughMiddleware() {
  return NextResponse.next();
}

/**
 * Avoid MIDDLEWARE_INVOCATION_FAILED on Vercel when Clerk env vars are missing.
 * Production should set Clerk keys; local/demo can use DEV_AUTH_BYPASS=true.
 */
export default bypass || !clerkConfigured ? passthroughMiddleware : clerkHandler;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
