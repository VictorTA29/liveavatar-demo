/**
 * Server-side configuration.
 *
 * Secrets come from the environment, never from this file: it is tracked by
 * git, so a committed key would be published with the code. Locally they live
 * in `.env.local` (gitignored); on Netlify they are set under
 * Site configuration > Environment variables.
 *
 * The non-secret values keep working defaults so the demo runs out of the box,
 * and every one of them can still be overridden per environment.
 *
 * This module must only ever be imported from server code (route handlers).
 */

const required = (name: string, value: string | undefined): string => {
  if (!value) {
    // Thrown when the route actually runs, not at build time, so a missing
    // optional key never breaks the whole deploy.
    console.error(
      `[secrets] Falta la variable de entorno ${name}. Configurala en .env.local o en Netlify.`,
    );
    return "";
  }
  return value;
};

export const API_KEY = required(
  "LIVEAVATAR_API_KEY",
  process.env.LIVEAVATAR_API_KEY,
);

export const API_URL =
  process.env.LIVEAVATAR_API_URL ?? "https://api.liveavatar.com";

export const AVATAR_ID =
  process.env.LIVEAVATAR_AVATAR_ID ?? "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a";

// When true, we will call everything in Sandbox mode.
// Useful for integration and development.
// Sandbox only accepts the Wayne avatar above, and consumes no credits.
export const IS_SANDBOX = process.env.LIVEAVATAR_IS_SANDBOX !== "false";

// FULL MODE Customizations
// Wayne's avatar voice and context
export const VOICE_ID =
  process.env.LIVEAVATAR_VOICE_ID ?? "c2527536-6d1f-4412-a643-53a3497dada9";
export const CONTEXT_ID =
  process.env.LIVEAVATAR_CONTEXT_ID ?? "5b9dba8a-aa31-11f0-a6ee-066a7fa2e369";
export const LANGUAGE = process.env.LIVEAVATAR_LANGUAGE ?? "es";

// LITE MODE Customizations
export const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY ?? "";
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
