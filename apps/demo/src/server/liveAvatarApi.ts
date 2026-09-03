import { API_KEY, API_URL } from "../../app/api/secrets";

/**
 * Calls the LiveAvatar REST API and normalises its envelope
 * ({ code, data, message }) into either data or a thrown error.
 *
 * Accepts an absolute URL too, so paginated endpoints can be followed
 * straight from the `next` field they return.
 */
export const liveAvatarFetch = async (
  endpoint: string,
  init: RequestInit = {},
): Promise<unknown> => {
  const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      "X-API-KEY": API_KEY,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text();
  let payload: { data?: unknown; message?: string; error?: string } = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    // Non-JSON bodies only ever show up on errors; surface the raw text.
    if (!res.ok) {
      throw new Error(text || `Request failed with status ${res.status}`);
    }
  }

  if (!res.ok) {
    // Validation errors arrive as data: [{ loc, message }].
    const data = payload.data;
    if (Array.isArray(data) && data[0]?.message) {
      throw new Error(data[0].message);
    }
    throw new Error(
      payload.message ||
        payload.error ||
        `Request failed with status ${res.status}`,
    );
  }

  return payload.data;
};
