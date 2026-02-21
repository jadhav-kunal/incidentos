import { env, isDemoMode } from "../../config/env";
import { logger } from "../utils/logger";
import path from "path";
import fs from "fs";

// Pre-generated demo audio fallback path
const DEMO_AUDIO_PATH = path.join(__dirname, "../../../public/demo-audio.mp3");
const DEMO_AUDIO_URL = "/audio/demo-audio.mp3";

async function generateWithMiniMax(text: string): Promise<Buffer> {
  logger.info("Generating audio with MiniMax Speech-2.6");

  const response = await fetch(
    `https://api.minimaxi.chat/v1/t2a_v2?GroupId=${env.MINIMAX_GROUP_ID}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.MINIMAX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "speech-02-hd",
        text,
        stream: false,
        voice_setting: {
          voice_id: "male-qn-qingse",
          speed: 1.0,
          vol: 1.0,
          pitch: 0,
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: "mp3",
        },
      }),
    }
  );

  if (!response.ok) throw new Error(`MiniMax TTS error: ${response.status}`);
  const data = await response.json() as { data?: { audio: string } };

  // MiniMax returns base64 audio
  const audioHex = data.data?.audio;
  if (!audioHex) throw new Error("No audio data in MiniMax response");

  return Buffer.from(audioHex, "hex");
}

async function generateWithElevenLabs(text: string): Promise<Buffer> {
  logger.info("Generating audio with ElevenLabs");

  const response = await fetch(
    "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
    {
      method: "POST",
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!response.ok) throw new Error(`ElevenLabs error: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

export async function generateAudio(
  text: string,
  incidentId: string
): Promise<string> {
  if (isDemoMode()) {
    logger.demo("Audio generation — returning demo audio URL");
    await new Promise((r) => setTimeout(r, 500));
    return DEMO_AUDIO_URL;
  }

  const outputDir = path.join(__dirname, "../../../public/audio");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const filename = `incident-${incidentId}-${Date.now()}.mp3`;
  const outputPath = path.join(outputDir, filename);

  // Try MiniMax first, then ElevenLabs, then demo fallback
  let audioBuffer: Buffer | null = null;

  try {
    audioBuffer = await generateWithMiniMax(text);
    logger.success("Audio generated via MiniMax");
  } catch (err) {
    logger.warn("MiniMax TTS failed, trying ElevenLabs", err);
    try {
      audioBuffer = await generateWithElevenLabs(text);
      logger.success("Audio generated via ElevenLabs");
    } catch (err2) {
      logger.warn("ElevenLabs also failed, using demo audio", err2);
      return DEMO_AUDIO_URL;
    }
  }

  if (audioBuffer) {
    fs.writeFileSync(outputPath, audioBuffer);
    return `/audio/${filename}`;
  }

  return DEMO_AUDIO_URL;
}