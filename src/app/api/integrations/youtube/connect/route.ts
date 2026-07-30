import { NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-handler";
import { youTubeConnectionService } from "@/services/youtube/connection-service";

export const GET = createApiHandler(async ({ auth }) => {
  const result = youTubeConnectionService.createConnectState(auth, true);

  if (result.mode === "mock") {
    await youTubeConnectionService.completeMockConnect(auth);
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${appUrl}/settings/integrations/youtube?connected=1&mock=1`,
    );
  }

  const response = NextResponse.redirect(result.url);
  response.cookies.set("youtube_oauth_nonce", result.nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
});
