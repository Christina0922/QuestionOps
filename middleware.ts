import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { shouldBypassClerkAuth } from "@/lib/clerk-config";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

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
 * When bypassing, getAuthContext() must also skip auth() (see clerk-config).
 */
export default shouldBypassClerkAuth() ? passthroughMiddleware : clerkHandler;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
