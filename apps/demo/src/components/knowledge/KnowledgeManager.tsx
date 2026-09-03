"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { composePrompt, parsePrompt } from "../../knowledge/prompt";

interface ContextSummary {
  id: string;
  name: string;
  updated_at?: string;
}

interface Draft {
  id: string | null;
  name: string;
  openingText: string;
  instructions: string;
  knowledge: string;
}

const EMPTY_DRAFT: Draft = {
  id: null,
  name: "",
  openingText: "",
  instructions: "",
  knowledge: "",
};

const panel =
  "rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:border-white/30 placeholder-gray-500 transition-colors";
const button =
  "px-4 py-2 rounded-lg bg-white/10 text-white font-medium text-sm border border-white/20 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const KnowledgeManager = () => {
  const router = useRouter();

  const [contexts, setContexts] = useState<ContextSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [fallbackId, setFallbackId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [testQuestion, setTestQuestion] = useState("");
  const [testAnswer, setTestAnswer] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const loadContexts = useCallback(async () => {
    setLoadingList(true);
    try {
      const [listRes, activeRes] = await Promise.all([
        fetch("/api/contexts"),
        fetch("/api/active-context"),
      ]);

      const listBody = await listRes.json();
      if (!listRes.ok) {
        setError(listBody.error ?? "No se pudieron cargar los contextos");
      } else {
        setContexts(listBody.contexts ?? []);
      }

      const activeBody = await activeRes.json();
      setActiveId(activeBody.context_id ?? null);
      setFallbackId(activeBody.fallback_context_id ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadContexts();
  }, [loadContexts]);

  const openContext = async (id: string) => {
    setLoadingDraft(true);
    setError(null);
    setNotice(null);
    setTestAnswer(null);
    try {
      const res = await fetch(`/api/contexts/${id}`);
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "No se pudo abrir el contexto");
        return;
      }
      const { instructions, knowledge } = parsePrompt(
        body.context.prompt ?? "",
      );
      setDraft({
        id,
        name: body.context.name ?? "",
        openingText: body.context.opening_text ?? "",
        instructions,
        knowledge,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingDraft(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);

    const payload = {
      name: draft.name,
      opening_text: draft.openingText,
      prompt: composePrompt({
        instructions: draft.instructions,
        knowledge: draft.knowledge,
      }),
    };

    try {
      const res = await fetch(
        draft.id ? `/api/contexts/${draft.id}` : "/api/contexts",
        {
          method: draft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "No se pudo guardar");
        return;
      }

      const savedId: string = body.context?.id ?? draft.id;
      const wasCreating = !draft.id;
      setDraft((current) => ({ ...current, id: savedId }));
      setNotice(wasCreating ? "Contexto creado" : "Cambios guardados");
      await loadContexts();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const activate = async (id: string, name: string) => {
    setError(null);
    try {
      const res = await fetch("/api/active-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context_id: id, name }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "No se pudo activar");
        return;
      }
      setActiveId(id);
      setNotice(`"${name}" queda preseleccionado al iniciar sesion`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = async (id: string) => {
    const confirmed = window.confirm(
      "Se eliminara este contexto en LiveAvatar de forma permanente. Continuar?",
    );
    if (!confirmed) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/contexts/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "No se pudo eliminar");
        return;
      }
      if (draft.id === id) {
        setDraft(EMPTY_DRAFT);
      }
      setNotice("Contexto eliminado");
      await loadContexts();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const runTest = async () => {
    if (!testQuestion.trim()) {
      return;
    }
    setTesting(true);
    setTestAnswer(null);
    setError(null);
    try {
      const res = await fetch("/api/openai-chat-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: testQuestion,
          system_prompt: composePrompt({
            instructions: draft.instructions,
            knowledge: draft.knowledge,
          }),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "La prueba fallo");
        return;
      }
      setTestAnswer(body.response);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTesting(false);
    }
  };

  const promptLength = composePrompt({
    instructions: draft.instructions,
    knowledge: draft.knowledge,
  }).length;

  return (
    <div className="w-full max-w-6xl mx-auto p-6 flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Base de Conocimientos</h1>
          <p className="text-sm text-gray-400 mt-1">
            Define las instrucciones y la informacion que el avatar puede usar
            para responder.
          </p>
        </div>
        <button className={button} onClick={() => router.push("/")}>
          Volver al demo
        </button>
      </header>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
      {notice && (
        <div className="px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          {notice}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        <aside className="md:w-72 shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase tracking-wider">
              Contextos
            </span>
            <button
              className="text-xs text-gray-300 hover:text-white transition-colors"
              onClick={() => {
                setDraft(EMPTY_DRAFT);
                setNotice(null);
                setError(null);
                setTestAnswer(null);
              }}
            >
              + Nuevo
            </button>
          </div>

          {loadingList ? (
            <p className="text-sm text-gray-500">Cargando...</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {contexts.map((ctx) => (
                <li key={ctx.id}>
                  <button
                    onClick={() => openContext(ctx.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                      draft.id === ctx.id
                        ? "bg-white/15 border-white/30"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <span className="block truncate">{ctx.name}</span>
                    {activeId === ctx.id && (
                      <span className="text-[11px] text-emerald-400">
                        predeterminado
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!activeId && fallbackId && (
            <p className="text-[11px] text-gray-500 leading-relaxed border-t border-white/10 pt-3">
              Sin predeterminado. El selector de la pantalla de inicio arrancara
              en el contexto de secrets.ts ({fallbackId.slice(0, 8)}
              ...), y ahi puedes elegir otro para cada sesion.
            </p>
          )}
        </aside>

        <section className="flex-1 flex flex-col gap-4">
          {loadingDraft ? (
            <p className="text-sm text-gray-500">Abriendo contexto...</p>
          ) : (
            <>
              <div className="flex flex-col md:flex-row gap-4">
                <label className="flex-1 flex flex-col gap-1.5">
                  <span className="text-xs text-gray-400">Nombre</span>
                  <input
                    value={draft.name}
                    maxLength={64}
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
                    placeholder="Asesor de admision"
                    className={`px-3 py-2 text-sm ${panel}`}
                  />
                </label>
                <label className="flex-1 flex flex-col gap-1.5">
                  <span className="text-xs text-gray-400">Saludo inicial</span>
                  <input
                    value={draft.openingText}
                    onChange={(e) =>
                      setDraft({ ...draft, openingText: e.target.value })
                    }
                    placeholder="Hola, en que puedo ayudarte?"
                    className={`px-3 py-2 text-sm ${panel}`}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-gray-400">
                  Instrucciones: como debe comportarse, tono, limites
                </span>
                <textarea
                  value={draft.instructions}
                  onChange={(e) =>
                    setDraft({ ...draft, instructions: e.target.value })
                  }
                  rows={8}
                  placeholder="Actua como un asesor cercano. Responde en espanol, breve y conversacional..."
                  className={`px-3 py-2 text-sm font-mono leading-relaxed resize-y ${panel}`}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-gray-400">
                  Base de conocimientos: la informacion sobre la que puede
                  responder
                </span>
                <textarea
                  value={draft.knowledge}
                  onChange={(e) =>
                    setDraft({ ...draft, knowledge: e.target.value })
                  }
                  rows={14}
                  placeholder="Pega aqui tus datos: precios, horarios, carreras, politicas, preguntas frecuentes..."
                  className={`px-3 py-2 text-sm font-mono leading-relaxed resize-y ${panel}`}
                />
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <button className={button} onClick={save} disabled={saving}>
                  {saving
                    ? "Guardando..."
                    : draft.id
                      ? "Guardar cambios"
                      : "Crear contexto"}
                </button>
                {draft.id && activeId !== draft.id && (
                  <button
                    className={button}
                    onClick={() => activate(draft.id as string, draft.name)}
                  >
                    Marcar como predeterminado
                  </button>
                )}
                {draft.id && (
                  <button
                    onClick={() => remove(draft.id as string)}
                    className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 font-medium text-sm border border-red-500/20 hover:bg-red-500/20 transition-colors"
                  >
                    Eliminar
                  </button>
                )}
                <span className="text-xs text-gray-500 ml-auto">
                  {promptLength.toLocaleString()} caracteres
                </span>
              </div>

              <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
                <span className="text-xs text-gray-500 uppercase tracking-wider">
                  Probar sin gastar sesion
                </span>
                <p className="text-[11px] text-gray-500 -mt-1">
                  Usa OpenAI con este mismo prompt para revisar las respuestas
                  antes de conectar el avatar.
                </p>
                <div className="flex gap-2">
                  <input
                    value={testQuestion}
                    onChange={(e) => setTestQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        runTest();
                      }
                    }}
                    placeholder="Escribe una pregunta de prueba"
                    className={`flex-1 px-3 py-2 text-sm ${panel}`}
                  />
                  <button
                    className={button}
                    onClick={runTest}
                    disabled={testing || !testQuestion.trim()}
                  >
                    {testing ? "..." : "Probar"}
                  </button>
                </div>
                {testAnswer && (
                  <div className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-200 whitespace-pre-wrap">
                    {testAnswer}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};
