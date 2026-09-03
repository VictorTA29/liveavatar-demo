import { NextRequest } from "next/server";
import { API_KEY, API_URL, AVATAR_ID, IS_SANDBOX } from "../secrets";
import { SANDBOX_AVATAR_ID } from "../../../src/avatars/constants";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface StartLiteSessionRequestBody {
  avatarId?: string;
  isSandbox?: boolean;
}

export async function POST(request: NextRequest) {
  let session_token = "";
  let session_id = "";
  try {
    const body: StartLiteSessionRequestBody = await request
      .json()
      .catch(() => ({}));

    const requestedAvatar = body.avatarId?.trim();
    let avatarId = AVATAR_ID;
    if (requestedAvatar && requestedAvatar !== "default") {
      if (!UUID_PATTERN.test(requestedAvatar)) {
        return new Response(
          JSON.stringify({ error: "avatarId no es un identificador valido" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      avatarId = requestedAvatar;
    }

    const isSandbox =
      typeof body.isSandbox === "boolean" ? body.isSandbox : IS_SANDBOX;

    if (isSandbox && avatarId !== SANDBOX_AVATAR_ID) {
      return new Response(
        JSON.stringify({
          error:
            "En modo sandbox solo funciona el avatar Wayne. Desactiva sandbox para usar otro avatar (consume creditos).",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    console.log(
      `[start-lite-session] avatar_id=${avatarId} sandbox=${isSandbox}`,
    );

    const res = await fetch(`${API_URL}/v1/sessions/token`, {
      method: "POST",
      headers: {
        "X-API-KEY": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "LITE",
        avatar_id: avatarId,
        is_sandbox: isSandbox,
      }),
    });
    if (!res.ok) {
      const error = await res.json();
      if (error.error) {
        const resp = await res.json();
        const errorMessage =
          resp.data[0].message ?? "Failed to retrieve session token";
        return new Response(JSON.stringify({ error: errorMessage }), {
          status: res.status,
        });
      }

      return new Response(
        JSON.stringify({ error: "Failed to retrieve session token" }),
        {
          status: res.status,
        },
      );
    }
    const data = await res.json();
    console.log(data);

    session_token = data.data.session_token;
    session_id = data.data.session_id;
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
    });
  }

  if (!session_token) {
    return new Response(
      JSON.stringify({ error: "Failed to retrieve session token" }),
      {
        status: 500,
      },
    );
  }
  return new Response(JSON.stringify({ session_token, session_id }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
