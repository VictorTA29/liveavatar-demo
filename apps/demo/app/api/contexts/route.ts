import { NextRequest } from "next/server";
import { ContextSummary, liveAvatarFetch } from "../../../src/knowledge/server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function GET() {
  try {
    const data = (await liveAvatarFetch("/v1/contexts")) as {
      results?: ContextSummary[];
    };
    return json({ contexts: data?.results ?? [] });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, prompt, opening_text } = await request.json();

    if (!name?.trim()) {
      return json({ error: "El nombre es obligatorio" }, 400);
    }
    if (!prompt?.trim()) {
      return json(
        { error: "Agrega instrucciones o base de conocimientos" },
        400,
      );
    }

    const data = await liveAvatarFetch("/v1/contexts", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        prompt,
        opening_text: opening_text?.trim() || "Hola, en que puedo ayudarte?",
      }),
    });

    return json({ context: data });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
}
