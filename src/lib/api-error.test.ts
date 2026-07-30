import { describe, expect, it } from "vitest";
import { ApiError, isApiError } from "@/lib/api-error";

describe("ApiError", () => {
  it("creates typed HTTP errors", () => {
    const error = ApiError.notFound("Missing");
    expect(error.status).toBe(404);
    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).toBe("Missing");
    expect(isApiError(error)).toBe(true);
  });

  it("serializes to API error body", () => {
    const error = ApiError.validation("Invalid", { field: "title" });
    expect(error.toJSON()).toEqual({
      error: {
        message: "Invalid",
        code: "VALIDATION_ERROR",
        details: { field: "title" },
      },
    });
  });

  it("detects non-api errors", () => {
    expect(isApiError(new Error("nope"))).toBe(false);
  });
});
