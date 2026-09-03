import { NextRequest, NextResponse } from "next/server";
import {
  readActiveContext,
  withActiveContext,
} from "../../../src/knowledge/server";
import { CONTEXT_ID } from "../secrets";

export async function GET() {
  const active = await readActiveContext();
  return NextResponse.json({
    ...active,
    // Shown in the UI so it is obvious when sessions fall back to the default.
    fallback_context_id: CONTEXT_ID,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { context_id, name } = await request.json();
    const value = {
      context_id: context_id || null,
      name: name || null,
    };

    return withActiveContext(
      NextResponse.json({ ok: true, context_id: value.context_id }),
      value,
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
