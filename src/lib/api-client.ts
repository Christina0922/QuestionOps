export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const json = (await response.json().catch(() => null)) as
    | { data: T }
    | { error: { message: string; code: string } }
    | null;

  if (!response.ok) {
    const message =
      json && "error" in json
        ? json.error.message
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  if (!json || !("data" in json)) {
    throw new Error("Invalid API response");
  }

  return json.data;
}
