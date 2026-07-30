import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAuthContext } from "@/lib/auth";
import { ApiError, isApiError } from "@/lib/api-error";
import type { AuthContext } from "@/types";

type HandlerContext = {
  auth: AuthContext;
  params: Record<string, string>;
  request: Request;
};

type RouteHandler = (ctx: HandlerContext) => Promise<unknown> | unknown;

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function jsonError(error: ApiError) {
  return NextResponse.json(error.toJSON(), { status: error.status });
}

function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;

  if (error instanceof ZodError) {
    return ApiError.validation("Validation failed", error.flatten());
  }

  console.error("[api]", error);
  return ApiError.internal(
    error instanceof Error ? error.message : "Internal server error",
  );
}

export function createApiHandler(handler: RouteHandler) {
  return async (
    request: Request,
    context?: { params?: Promise<Record<string, string>> | Record<string, string> },
  ) => {
    try {
      const auth = await getAuthContext();
      const rawParams = context?.params;
      const params = rawParams
        ? rawParams instanceof Promise
          ? await rawParams
          : rawParams
        : {};

      const result = await handler({ auth, params, request });

      if (result instanceof NextResponse) {
        return result;
      }

      return jsonOk(result);
    } catch (error) {
      return jsonError(toApiError(error));
    }
  };
}

export async function parseJsonBody<T>(
  request: Request,
  schema: { parse: (data: unknown) => T },
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw ApiError.badRequest("Invalid JSON body");
  }
  return schema.parse(body);
}

export function getSearchParams(request: Request) {
  return new URL(request.url).searchParams;
}
