import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = join(root, "assets", "audio", "dossiers");
const sampleRate = 44_100;
const durationSeconds = 12;
const frameCount = sampleRate * durationSeconds;
const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";

const presets = [
  { id: "00", seed: 101, hum: 55, pulse: 1320, air: 0.16, rate: 5, pan: -0.25 },
  { id: "01", seed: 211, hum: 48, pulse: 880, air: 0.11, rate: 8, pan: 0.18 },
  { id: "02", seed: 307, hum: 62, pulse: 1760, air: 0.13, rate: 6, pan: -0.12 },
  { id: "03", seed: 401, hum: 73, pulse: 2140, air: 0.09, rate: 4, pan: 0.28 },
  { id: "04", seed: 503, hum: 44, pulse: 620, air: 0.08, rate: 3, pan: -0.3 },
  { id: "05", seed: 601, hum: 57, pulse: 2380, air: 0.18, rate: 9, pan: 0.2 },
  { id: "06", seed: 701, hum: 68, pulse: 1580, air: 0.12, rate: 7, pan: -0.18 },
  { id: "07", seed: 809, hum: 50, pulse: 1040, air: 0.2, rate: 5, pan: 0.32 },
  { id: "08", seed: 907, hum: 64, pulse: 1960, air: 0.1, rate: 10, pan: -0.22 },
  { id: "09", seed: 1009, hum: 46, pulse: 1460, air: 0.17, rate: 12, pan: 0.15 },
  { id: "10", seed: 1103, hum: 59, pulse: 920, air: 0.15, rate: 6, pan: -0.1 },
];

function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xffffffff;
  };
}

function periodicPulse(time, center, width) {
  const wrapped = ((time - center + durationSeconds / 2) % durationSeconds)
    - durationSeconds / 2;
  return Math.exp(-(wrapped * wrapped) / (2 * width * width));
}

function renderPreset(preset) {
  const random = makeRandom(preset.seed);
  const partials = Array.from({ length: 22 }, (_, index) => ({
    cycles: 7 + Math.floor(random() * 150) + index * 3,
    phase: random() * Math.PI * 2,
    gain: (0.018 + random() * 0.025) / Math.sqrt(index + 1),
  }));
  const eventTimes = Array.from(
    { length: preset.rate },
    (_, index) => ((index + 0.35 + random() * 0.3) / preset.rate) * durationSeconds,
  );
  const left = new Float32Array(frameCount);
  const right = new Float32Array(frameCount);
  let peak = 0;

  for (let frame = 0; frame < frameCount; frame += 1) {
    const time = frame / sampleRate;
    const phase = time / durationSeconds;
    const hum = (
      Math.sin(Math.PI * 2 * preset.hum * time)
      + 0.42 * Math.sin(Math.PI * 2 * preset.hum * 2 * time + 0.37)
      + 0.18 * Math.sin(Math.PI * 2 * preset.hum * 3 * time + 1.1)
    ) * 0.18;
    let textureLeft = 0;
    let textureRight = 0;
    partials.forEach((partial, index) => {
      const angle = Math.PI * 2 * partial.cycles * phase + partial.phase;
      textureLeft += Math.sin(angle) * partial.gain;
      textureRight += Math.sin(angle + 0.17 + index * 0.013) * partial.gain;
    });

    let signals = 0;
    eventTimes.forEach((eventTime, index) => {
      const envelope = periodicPulse(time, eventTime, 0.055 + (index % 3) * 0.018);
      const frequency = preset.pulse * (1 + (index % 4) * 0.125);
      signals += Math.sin(Math.PI * 2 * frequency * time) * envelope * 0.2;
    });

    const drift = Math.sin(Math.PI * 2 * phase * 3 + preset.seed) * 0.035;
    const leftGain = 1 - Math.max(0, preset.pan);
    const rightGain = 1 + Math.min(0, preset.pan);
    left[frame] = hum * leftGain + textureLeft * preset.air + signals * 0.88 + drift;
    right[frame] = hum * rightGain + textureRight * preset.air + signals + drift * 0.8;
    peak = Math.max(peak, Math.abs(left[frame]), Math.abs(right[frame]));
  }

  const scale = peak > 0 ? 0.5 / peak : 1;
  const pcm = Buffer.alloc(frameCount * 4);
  for (let frame = 0; frame < frameCount; frame += 1) {
    pcm.writeInt16LE(Math.round(left[frame] * scale * 32767), frame * 4);
    pcm.writeInt16LE(Math.round(right[frame] * scale * 32767), frame * 4 + 2);
  }
  return pcm;
}

function wavBuffer(pcm) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

mkdirSync(outputDir, { recursive: true });
const temporaryDir = join(tmpdir(), `ichiro-dossier-audio-${process.pid}`);
mkdirSync(temporaryDir, { recursive: true });

try {
  for (const preset of presets) {
    const wavPath = join(temporaryDir, `dossier-${preset.id}.wav`);
    const outputPath = join(outputDir, `dossier-${preset.id}-soundscape.ogg`);
    writeFileSync(wavPath, wavBuffer(renderPreset(preset)));
    const result = spawnSync(
      ffmpeg,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        wavPath,
        "-c:a",
        "libvorbis",
        "-q:a",
        "4",
        "-metadata",
        `title=ICHIRO Dossier ${preset.id} Soundscape`,
        outputPath,
      ],
      { stdio: "inherit" },
    );
    if (result.status !== 0) {
      throw new Error(`ffmpeg failed for dossier ${preset.id}`);
    }
    console.log(`[OK] ${outputPath}`);
  }
} finally {
  rmSync(temporaryDir, { recursive: true, force: true });
}
