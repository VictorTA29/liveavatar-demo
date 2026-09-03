/**
 * Sandbox mode only ever accepts this avatar (Wayne). Any other id is
 * rejected by the API with "This avatar is not supported in sandbox mode",
 * so the UI warns about the combination before spending a request.
 *
 * https://docs.liveavatar.com/docs/sandbox-mode
 */
export const SANDBOX_AVATAR_ID = "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a";

export interface AvatarOption {
  id: string;
  name: string;
  preview_url: string | null;
  is_expired: boolean;
  default_voice_id: string | null;
}
