import { ApiError } from "@/lib/api-error";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw ApiError.internal(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getMissingYouTubeEnv(): string[] {
  const required = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
    "TOKEN_ENCRYPTION_KEY",
    "APP_URL",
  ];
  return required.filter((key) => !process.env[key]);
}
