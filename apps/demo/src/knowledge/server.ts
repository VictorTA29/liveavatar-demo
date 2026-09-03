import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export { liveAvatarFetch } from "../server/liveAvatarApi";

export interface ContextSummary {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContextDetail extends ContextSummary {
  prompt: string;
  opening_text: string;
}

export interface ActiveContext {
  context_id: string | null;
  name?: string | null;
}

/**
 * The context preselected in the knowledge module.
 *
 * Kept in a cookie rather than on disk: serverless hosts (Netlify, Vercel)
 * give each function a read-only filesystem, so writing a JSON file works in
 * local dev and then fails in production. The trade-off is that the default is
 * per-browser instead of shared, which is what a demo wants anyway — the
 * session picker still sends an explicit context on every start.
 */
const ACTIVE_CONTEXT_COOKIE = "liveavatar_active_context";

const EMPTY: ActiveContext = { context_id: null, name: null };

export const readActiveContext = async (): Promise<ActiveContext> => {
  try {
    const store = await cookies();
    const raw = store.get(ACTIVE_CONTEXT_COOKIE)?.value;
    if (!raw) {
      return EMPTY;
    }

    // Next encodes on set and decodes on get, so the value arrives as plain
    // JSON. Encoding it ourselves too would double-encode it.
    const parsed = JSON.parse(raw) as ActiveContext;
    return { context_id: parsed.context_id ?? null, name: parsed.name ?? null };
  } catch {
    // No cookie, or a malformed one, simply means "nothing selected yet".
    return EMPTY;
  }
};

/** Attaches the active-context cookie to a response. */
export const withActiveContext = <T extends NextResponse>(
  response: T,
  value: ActiveContext,
): T => {
  if (!value.context_id) {
    response.cookies.delete(ACTIVE_CONTEXT_COOKIE);
    return response;
  }

  response.cookies.set({
    name: ACTIVE_CONTEXT_COOKIE,
    value: JSON.stringify(value),
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
};
