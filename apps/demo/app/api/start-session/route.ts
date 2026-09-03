import { NextRequest } from "next/server";
import {
  API_KEY,
  API_URL,
  AVATAR_ID,
  VOICE_ID,
  LANGUAGE,
  IS_SANDBOX,
  CONTEXT_ID,
} from "../secrets";
import { readActiveContext } from "../../../src/knowledge/server";
import { SANDBOX_AVATAR_ID } from "../../../src/avatars/constants";

interface StartFullModeSessionRequestBody {
  pushToTalk?: boolean;
  /**
   * Context to use for this session only. Overrides the default saved in the
   * knowledge module. Send "default" to force the secrets.ts context.
   */
  contextId?: string;
  /** Avatar for this session only. "default" forces the secrets.ts avatar. */
  avatarId?: string;
  /** Voice for this session. Omitted means the avatar's own default voice. */
  voiceId?: string;
  /** Sandbox for this session only. Omitted means the secrets.ts setting. */
  isSandbox?: boolean;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const badRequest = (message: string) =>
  new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });

export async function POST(request: NextRequest) {
  let session_token = "";
  let session_id = "";
  try {
    const body: StartFullModeSessionRequestBody = await request
      .json()
      .catch(() => ({}));
    const pushToTalk = body.pushToTalk === true;

    // Precedence: the context chosen for this session, then the default saved
    // in the knowledge module, then the demo context in secrets.ts.
    const requested = body.contextId?.trim();
    let contextId: string;
    let origin: string;

    if (requested && requested !== "default") {
      if (!UUID_PATTERN.test(requested)) {
        return badRequest("contextId no es un identificador valido");
      }
      contextId = requested;
      origin = "elegido para esta sesion";
    } else if (requested === "default") {
      contextId = CONTEXT_ID;
      origin = "forzado al de secrets.ts";
    } else {
      const active = await readActiveContext();
      contextId = active.context_id ?? CONTEXT_ID;
      origin = active.context_id
        ? `predeterminado del modulo: ${active.name ?? "sin nombre"}`
        : "fallback de secrets.ts";
    }

    // Avatar for this session, falling back to the demo one in secrets.ts.
    const requestedAvatar = body.avatarId?.trim();
    let avatarId = AVATAR_ID;
    if (requestedAvatar && requestedAvatar !== "default") {
      if (!UUID_PATTERN.test(requestedAvatar)) {
        return badRequest("avatarId no es un identificador valido");
      }
      avatarId = requestedAvatar;
    }

    const requestedVoice = body.voiceId?.trim();
    if (requestedVoice && !UUID_PATTERN.test(requestedVoice)) {
      return badRequest("voiceId no es un identificador valido");
    }
    // Only fall back to the demo voice when the demo avatar is in play; other
    // avatars sound wrong with it, so let the API pick their own default.
    const voiceId =
      requestedVoice || (avatarId === AVATAR_ID ? VOICE_ID : undefined);

    const isSandbox =
      typeof body.isSandbox === "boolean" ? body.isSandbox : IS_SANDBOX;

    // Sandbox accepts a single avatar; catching it here gives a clearer
    // message than the API's own and costs no round trip.
    if (isSandbox && avatarId !== SANDBOX_AVATAR_ID) {
      return badRequest(
        "En modo sandbox solo funciona el avatar Wayne. Desactiva sandbox para usar otro avatar (consume creditos).",
      );
    }

    console.log(
      `[start-session] context_id=${contextId} (${origin}) ` +
        `avatar_id=${avatarId} sandbox=${isSandbox} voice_id=${voiceId ?? "(default del avatar)"}`,
    );

    const res = await fetch(`${API_URL}/v1/sessions/token`, {
      method: "POST",
      headers: {
        "X-API-KEY": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "FULL",
        avatar_id: avatarId,
        avatar_persona: {
          ...(voiceId && { voice_id: voiceId }),
          context_id: contextId,
          language: LANGUAGE,
        },
        ...(pushToTalk && { interactivity_type: "PUSH_TO_TALK" }),
        is_sandbox: isSandbox,
      }),
    });

    if (!res.ok) {
      // Check if response is JSON before parsing
      const contentType = res.headers.get("content-type");
      let errorMessage = "Failed to retrieve session token";

      if (contentType && contentType.includes("application/json")) {
        try {
          const resp = await res.json();
          if (resp.data && resp.data.length > 0) {
            errorMessage = resp.data[0].message;
          } else if (resp.error) {
            errorMessage = resp.error;
          } else if (resp.message) {
            errorMessage = resp.message;
          }
        } catch (e) {
          console.error("Failed to parse error response:", e);
        }
      } else {
        // If it's not JSON, try to get the text
        const text = await res.text();
        console.log("Error response (text):", text);
        errorMessage = text || errorMessage;
      }

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: res.status,
      });
    }

    const data = await res.json();

    session_token = data.data.session_token;
    session_id = data.data.session_id;
  } catch (error) {
    console.error("Error retrieving session token:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
    });
  }

  if (!session_token) {
    return new Response("Failed to retrieve session token", {
      status: 500,
    });
  }
  return new Response(JSON.stringify({ session_token, session_id }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
