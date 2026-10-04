/**
 * ElevenLabs TTS for a Sensi summary.
 * Env: ELEVENLABS_API_KEY (required), optional ELEVENLABS_VOICE_ID.
 * Do not commit keys.
 */

type Body = {
  text?: string;
};

function apiKey(): string | null {
  return process.env.ELEVENLABS_API_KEY?.trim() || null;
}

function voiceId(): string {
  return process.env.ELEVENLABS_VOICE_ID?.trim() || "21m00Tcm4TlvDq8ikWAM";
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
          model_id: "eleven_multilingual_v2",
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
