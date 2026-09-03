import { liveAvatarFetch } from "../../../src/server/liveAvatarApi";
import {
  AvatarOption,
  SANDBOX_AVATAR_ID,
} from "../../../src/avatars/constants";
import { AVATAR_ID, IS_SANDBOX } from "../secrets";

interface ApiAvatar {
  id: string;
  name: string;
  preview_url?: string | null;
  is_expired?: boolean;
  default_voice?: { id?: string } | null;
}

interface Page {
  results?: ApiAvatar[];
  next?: string | null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const toOption = (avatar: ApiAvatar): AvatarOption => ({
  id: avatar.id,
  name: avatar.name,
  preview_url: avatar.preview_url ?? null,
  is_expired: avatar.is_expired === true,
  default_voice_id: avatar.default_voice?.id ?? null,
});

/**
 * Walks every page of a paginated avatar endpoint. The public catalogue is
 * ~83 avatars across pages of 20, so a single request would truncate it.
 */
const fetchAllPages = async (endpoint: string): Promise<AvatarOption[]> => {
  const collected: AvatarOption[] = [];
  let url: string | null = endpoint;
  // Hard stop so a malformed `next` chain cannot loop forever.
  let guard = 0;

  while (url && guard < 25) {
    const page = (await liveAvatarFetch(url)) as Page;
    collected.push(...(page?.results ?? []).map(toOption));
    url = page?.next ?? null;
    guard += 1;
  }

  return collected;
};

export async function GET() {
  try {
    const [mine, publicAvatars] = await Promise.all([
      fetchAllPages("/v1/avatars"),
      fetchAllPages("/v1/avatars/public"),
    ]);

    return json({
      mine,
      public: publicAvatars,
      default_avatar_id: AVATAR_ID,
      default_is_sandbox: IS_SANDBOX,
      sandbox_avatar_id: SANDBOX_AVATAR_ID,
    });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
}
