export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, "BAD_REQUEST", message, details);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Not found") {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(message: string, details?: unknown) {
    return new ApiError(409, "CONFLICT", message, details);
  }

  static validation(message: string, details?: unknown) {
    return new ApiError(422, "VALIDATION_ERROR", message, details);
  }

  static internal(message = "Internal server error") {
    return new ApiError(500, "INTERNAL_ERROR", message);
  }

  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.code,
        ...(this.details !== undefined ? { details: this.details } : {}),
      },
    };
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
