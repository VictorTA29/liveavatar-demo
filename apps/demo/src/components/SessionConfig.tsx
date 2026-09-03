"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarOption, SANDBOX_AVATAR_ID } from "../avatars/constants";

interface ContextOption {
  id: string;
  name: string;
}

/** What the session routes need, already resolved from the UI selections. */
export interface ResolvedSessionConfig {
  contextId: string;
  avatarId: string;
  voiceId?: string;
  isSandbox: boolean;
  /** Set when the selection cannot start; the parent disables its buttons. */
  warning: string | null;
}

const field =
  "w-full px-4 py-2.5 rounded-lg bg-white/5 text-white text-sm border border-white/10 focus:outline-none focus:border-white/30 placeholder-gray-500 transition-colors disabled:opacity-50";

export const SessionConfig = ({
  onChange,
}: {
  onChange: (config: ResolvedSessionConfig) => void;
}) => {
  const router = useRouter();

  const [contexts, setContexts] = useState<ContextOption[]>([]);
  const [myAvatars, setMyAvatars] = useState<AvatarOption[]>([]);
  const [publicAvatars, setPublicAvatars] = useState<AvatarOption[]>([]);
  const [defaultAvatarId, setDefaultAvatarId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [contextId, setContextId] = useState("default");
  const [avatarChoice, setAvatarChoice] = useState("default");
  const [manualAvatarId, setManualAvatarId] = useState("");
  const [isSandbox, setIsSandbox] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [ctxRes, activeRes, avatarRes] = await Promise.all([
          fetch("/api/contexts"),
          fetch("/api/active-context"),
          fetch("/api/avatars"),
        ]);
        const ctxBody = await ctxRes.json();
        const activeBody = await activeRes.json();
        const avatarBody = await avatarRes.json();
        if (cancelled) {
          return;
        }

        if (ctxRes.ok) {
          setContexts(ctxBody.contexts ?? []);
        }
        if (activeBody.context_id) {
          setContextId(activeBody.context_id);
        }
        if (avatarRes.ok) {
          setMyAvatars(avatarBody.mine ?? []);
          setPublicAvatars(avatarBody.public ?? []);
          setDefaultAvatarId(avatarBody.default_avatar_id ?? null);
          setIsSandbox(avatarBody.default_is_sandbox !== false);
        } else {
          setLoadError(
            avatarBody.error ?? "No se pudieron cargar los avatares",
          );
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError((e as Error).message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const allAvatars = [...myAvatars, ...publicAvatars];
  const selected =
    avatarChoice === "default" || avatarChoice === "manual"
      ? null
      : (allAvatars.find((a) => a.id === avatarChoice) ?? null);

  const resolvedAvatarId =
    avatarChoice === "manual"
      ? manualAvatarId.trim()
      : avatarChoice === "default"
        ? (defaultAvatarId ?? "default")
        : avatarChoice;

  // Report the resolved selection upward. Depends on primitives only, so it
  // does not re-fire on every render.
  useEffect(() => {
    let warning: string | null = null;

    if (avatarChoice === "manual" && !manualAvatarId.trim()) {
      warning = "Escribe el ID del avatar.";
    } else if (isSandbox && resolvedAvatarId !== SANDBOX_AVATAR_ID) {
      warning =
        "En sandbox solo funciona el avatar Wayne. Desactiva sandbox para usar este avatar (consume creditos).";
    } else if (selected?.is_expired) {
      warning = `El avatar "${selected.name}" esta expirado y la API lo rechazara.`;
    }

    onChange({
      contextId,
      avatarId: avatarChoice === "default" ? "default" : resolvedAvatarId,
      voiceId: selected?.default_voice_id ?? undefined,
      isSandbox,
      warning,
    });
  }, [
    onChange,
    contextId,
    avatarChoice,
    manualAvatarId,
    isSandbox,
    resolvedAvatarId,
    selected,
  ]);

  const renderAvatarOptions = (list: AvatarOption[]) =>
    list.map((avatar) => (
      <option key={avatar.id} value={avatar.id}>
        {avatar.name}
        {avatar.id === SANDBOX_AVATAR_ID ? " (sandbox)" : ""}
        {avatar.is_expired ? " — expirado" : ""}
      </option>
    ));

  return (
    <div className="w-full flex flex-col gap-4">
      {loadError && (
        <div className="px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
          {loadError}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="avatar-picker" className="text-xs text-gray-400">
          Avatar
        </label>
        <select
          id="avatar-picker"
          value={avatarChoice}
          onChange={(e) => setAvatarChoice(e.target.value)}
          disabled={loading}
          className={field}
        >
          <option value="default">
            {loading
              ? "Cargando avatares..."
              : "Predeterminado del demo (secrets.ts)"}
          </option>
          {myAvatars.length > 0 && (
            <optgroup label="Mis avatares">
              {renderAvatarOptions(myAvatars)}
            </optgroup>
          )}
          {publicAvatars.length > 0 && (
            <optgroup label={`Publicos (${publicAvatars.length})`}>
              {renderAvatarOptions(publicAvatars)}
            </optgroup>
          )}
          <option value="manual">Introducir un ID manualmente...</option>
        </select>

        {avatarChoice === "manual" && (
          <input
            value={manualAvatarId}
            onChange={(e) => setManualAvatarId(e.target.value)}
            placeholder="dd73ea75-1218-4ef3-92ce-606d5f7fbc0a"
            className={`${field} font-mono text-xs`}
          />
        )}

        {selected?.preview_url && (
          <div className="flex items-center gap-3 mt-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.preview_url}
              alt={selected.name}
              className="w-14 h-14 rounded-lg object-cover border border-white/10"
            />
            <span className="text-xs text-gray-500 font-mono break-all">
              {selected.id}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="context-picker"
          className="text-xs text-gray-400 flex items-center justify-between"
        >
          <span>Contexto del avatar (solo Full Mode)</span>
          <button
            onClick={() => router.push("/knowledge")}
            className="text-gray-500 hover:text-white transition-colors"
          >
            editar
          </button>
        </label>
        <select
          id="context-picker"
          value={contextId}
          onChange={(e) => setContextId(e.target.value)}
          disabled={loading}
          className={field}
        >
          <option value="default">
            {loading
              ? "Cargando contextos..."
              : "Predeterminado del demo (secrets.ts)"}
          </option>
          {contexts.map((ctx) => (
            <option key={ctx.id} value={ctx.id}>
              {ctx.name}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={isSandbox}
          onChange={(e) => setIsSandbox(e.target.checked)}
          className="mt-0.5 accent-white"
        />
        <span className="text-xs text-gray-400 leading-relaxed">
          Modo sandbox
          <span className="block text-gray-500">
            Gratis, pero solo admite el avatar Wayne. Desactivalo para usar
            cualquier otro avatar: esas sesiones consumen creditos.
          </span>
        </span>
      </label>
    </div>
  );
};
