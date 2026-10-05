/**
 * ElevenLabs TTS for Sensi voice replies.
 *
 * Env (never commit keys):
 *   ELEVENLABS_API_KEY          — required
 *   ELEVENLABS_VOICE_ID         — default: Charlotte (warm conversational)
 *   ELEVENLABS_MODEL_ID         — default: eleven_multilingual_v2
 *   ELEVENLABS_STABILITY        — 0–1, default 0.38 (lower = more natural variation)
 *   ELEVENLABS_SIMILARITY_BOOST — 0–1, default 0.78
 *   ELEVENLABS_STYLE            — 0–1, default 0.32 (gentle expressiveness)
 *   ELEVENLABS_SPEED            — 0.7–1.2, default 0.94 (slightly slower for clarity)
 */

type Body = {
  text?: string;
};

/** Charlotte — soft, conversational; warmer than the old Rachel default. */
const DEFAULT_VOICE_ID = "XB0fDUnXU5powFXDhCwa";
const DEFAULT_MODEL_ID = "eleven_multilingual_v2";

function apiKey(): string | null {
  return process.env.ELEVENLABS_API_KEY?.trim() || null;
}

function voiceId(): string {
  return process.env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_VOICE_ID;
}

function modelId(): string {
  return process.env.ELEVENLABS_MODEL_ID?.trim() || DEFAULT_MODEL_ID;
}

function clamp01(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function envFloat(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  return clamp01(Number(raw), fallback);
}

function envSpeed(fallback: number): number {
  const raw = process.env.ELEVENLABS_SPEED?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1.2, Math.max(0.7, n));
}

export async function POST(req: Request) {
  const key = apiKey();
  if (!key) {
    return Response.json(
      {
        error:
          "ElevenLabs API key missing. Set ELEVENLABS_API_KEY in apps/web/.env.local (never commit keys).",
      },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 2000) {
    return Response.json({ error: "Provide summary text (max 2000 characters)." }, { status: 400 });
  }

  const voiceSettings = {
    stability: envFloat("ELEVENLABS_STABILITY", 0.38),
    similarity_boost: envFloat("ELEVENLABS_SIMILARITY_BOOST", 0.78),
    style: envFloat("ELEVENLABS_STYLE", 0.32),
    use_speaker_boost: true,
    speed: envSpeed(0.94),
  };

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId())}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": key,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: modelId(),
          voice_settings: voiceSettings,
        }),
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("ElevenLabs TTS failed", res.status, detail.slice(0, 200));
      return Response.json(
        { error: "ElevenLabs could not speak this summary. Check ELEVENLABS_API_KEY." },
        { status: 502 },
      );
    }

    const audio = await res.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("ElevenLabs TTS error", error);
    return Response.json({ error: "Could not reach ElevenLabs." }, { status: 502 });
  }
}
