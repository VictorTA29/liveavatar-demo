import { NextRequest, NextResponse } from "next/server";
import {
  liveAvatarFetch,
  readActiveContext,
  withActiveContext,
} from "../../../../src/knowledge/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  try {
    const data = await liveAvatarFetch(`/v1/contexts/${id}`);
    return NextResponse.json({ context: data });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  try {
    const { name, prompt, opening_text } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 },
      );
    }
    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "Agrega instrucciones o base de conocimientos" },
        { status: 400 },
      );
    }

    // The API rejects partial bodies: name, prompt and opening_text are all
    // required on PATCH.
    const data = await liveAvatarFetch(`/v1/contexts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        id,
        name: name.trim(),
        prompt,
        opening_text: opening_text?.trim() || "Hola, en que puedo ayudarte?",
      }),
    });

    const response = NextResponse.json({ context: data });

    // Keep the stored label in sync if this is the preselected context.
    const active = await readActiveContext();
    if (active.context_id === id) {
      return withActiveContext(response, {
        context_id: id,
        name: name.trim(),
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  try {
    await liveAvatarFetch(`/v1/contexts/${id}`, { method: "DELETE" });

    const response = NextResponse.json({ ok: true });

    // Never leave sessions pointing at a context that no longer exists.
    const active = await readActiveContext();
    if (active.context_id === id) {
      return withActiveContext(response, { context_id: null, name: null });
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
