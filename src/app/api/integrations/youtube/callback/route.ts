import { NextResponse } from "next/server";
import { createApiHandler, getSearchParams } from "@/lib/api-handler";
import { ApiError } from "@/lib/api-error";
import { youTubeConnectionService } from "@/services/youtube/connection-service";

export const GET = createApiHandler(async ({ auth, request }) => {
  const params = getSearchParams(request);
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  try {
    const cookieNonce = request.headers
      .get("cookie")
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("youtube_oauth_nonce="))
      ?.split("=")[1];

    const state = params.get("state");
    if (state && cookieNonce) {
      const parsed = youTubeConnectionService.parseAndValidateState(state);
      if (parsed.nonce !== decodeURIComponent(cookieNonce)) {
        throw ApiError.badRequest("OAuth nonce mismatch");
      }
    }

    await youTubeConnectionService.handleCallback({
      code: params.get("code"),
      state,
      error: params.get("error"),
      auth,
    });

    const response = NextResponse.redirect(
      `${appUrl}/settings/integrations/youtube?connected=1`,
    );
    response.cookies.set("youtube_oauth_nonce", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "YouTube connection failed";
    const response = NextResponse.redirect(
      `${appUrl}/settings/integrations/youtube?error=${encodeURIComponent(message)}`,
    );
    response.cookies.set("youtube_oauth_nonce", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });
    return response;
  }
});
