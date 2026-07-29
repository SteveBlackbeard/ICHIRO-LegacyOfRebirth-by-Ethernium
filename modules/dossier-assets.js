const KiB = 1024;
const MiB = 1024 * KiB;

const STATUS = Object.freeze({
  APPROVED: "approved",
  PENDING: "pending",
});

const NEW_COVER_BUDGET = 180 * KiB;
const NEW_EVIDENCE_BUDGET = 700 * KiB;
const NEW_MOTION_BUDGET = 2.5 * MiB;
const NEW_AUDIO_BUDGET = 1.5 * MiB;

function approvedAsset(id, src, maxBytes, alt, options = {}) {
  return Object.freeze({
    id,
    status: STATUS.APPROVED,
    src,
    maxBytes,
    alt,
    provenance: "project-owned",
    legacyApproved: Boolean(options.legacyApproved),
    mediaType: options.mediaType || "image",
  });
}

function pendingAsset(id, targetStem, alt, options = {}) {
  const mediaType = options.mediaType || "image";
  const maxBytes = options.maxBytes
    || (mediaType === "motion" ? NEW_MOTION_BUDGET : NEW_EVIDENCE_BUDGET);
  return Object.freeze({
    id,
    status: STATUS.PENDING,
    src: null,
    targetStem,
    allowedExtensions: options.allowedExtensions
      || (mediaType === "motion" ? ["webm", "mp4"] : ["avif", "webp", "png", "jpg"]),
    maxBytes,
    alt,
    provenance: "pending",
    mediaType,
  });
}

function approvedCover(id, src, maxBytes, alt, legacyApproved = false) {
  return approvedAsset(`${id}.cover`, src, maxBytes, alt, {
    legacyApproved,
  });
}

function pendingCover(id, fallbackSrc, alt) {
  return Object.freeze({
    ...pendingAsset(`${id}.cover`, `dossier-${id}-cover`, alt, {
      maxBytes: NEW_COVER_BUDGET,
      allowedExtensions: ["avif", "webp", "png", "jpg"],
    }),
    fallbackSrc,
  });
}

function pendingEvidence(id, index, alt, options = {}) {
  return pendingAsset(
    `${id}.evidence-${String(index + 1).padStart(2, "0")}`,
    `dossier-${id}-evidence-${String(index + 1).padStart(2, "0")}`,
    alt,
    options,
  );
}

function pendingAudio(id, label) {
  return pendingAsset(`${id}.audio`, `dossier-${id}-soundscape`, label, {
    mediaType: "audio",
    maxBytes: NEW_AUDIO_BUDGET,
    allowedExtensions: ["ogg", "mp3"],
  });
}

export const dossierAssetCatalog = Object.freeze({
  "00": Object.freeze({
    cover: approvedCover(
      "00",
      "assets/dossiers/dossier-00.png",
      192 * KiB,
      "Recovered archive manifest",
    ),
    evidence: Object.freeze([
      approvedAsset(
        "00.evidence-01",
        "assets/dossiers/dossier-00-content.png",
        4.5 * MiB,
        "Archive table and recovered manifest scan",
        { legacyApproved: true },
      ),
    ]),
    audio: pendingAudio("00", "Low archive hum and paper scan"),
  }),
  "01": Object.freeze({
    cover: approvedCover(
      "01",
      "assets/dossiers/dossier-01.jpg",
      512 * KiB,
      "KPCO containment record for Saikon",
      true,
    ),
    evidence: Object.freeze([
      approvedAsset(
        "01.evidence-01",
        "assets/dossiers/dossier-01-content-1.gif",
        10 * MiB,
        "Saikon body diagram with black vines",
        { legacyApproved: true, mediaType: "motion" },
      ),
      approvedAsset(
        "01.evidence-02",
        "assets/dossiers/dossier-01-content-2.png",
        9 * MiB,
        "Blurred containment cell photograph",
        { legacyApproved: true },
      ),
    ]),
    audio: pendingAudio("01", "Heart monitor, glass impact and distant scream"),
  }),
  "02": Object.freeze({
    cover: approvedCover(
      "02",
      "assets/dossiers/dossier-02.png",
      640 * KiB,
      "Damaged Nemeth internal extract",
      true,
    ),
    evidence: Object.freeze([
      approvedAsset(
        "02.evidence-01",
        "assets/dossiers/dossier-02-content.png",
        7 * MiB,
        "Nemeth corporate memorandum with redactions",
        { legacyApproved: true },
      ),
      pendingEvidence(
        "02",
        1,
        "Balance, sacrifice and necessity text corruption",
        { mediaType: "motion" },
      ),
    ]),
    audio: pendingAudio("02", "Printer, reactor hum and synthetic voice"),
  }),
  "03": Object.freeze({
    cover: pendingCover(
      "03",
      "assets/dossiers/dossier-03.svg",
      "Keigami KPCO personnel trace",
    ),
    evidence: Object.freeze([
      pendingEvidence("03", 0, "Keigami KPCO personnel ID portrait"),
      pendingEvidence("03", 1, "Corrupted signature mark"),
    ]),
    audio: pendingAudio("03", "Voice authorization, boot steps and radio click"),
  }),
  "04": Object.freeze({
    cover: pendingCover(
      "04",
      "assets/dossiers/dossier-04.svg",
      "Recovered child training memory",
    ),
    evidence: Object.freeze([
      pendingEvidence("04", 0, "Aira wrapping Hangyaku-sha's shaking hands"),
      pendingEvidence("04", 1, "Split ration tablet on a cold floor"),
    ]),
    audio: pendingAudio("04", "Bare feet, cloth wrap and distant footsteps"),
  }),
  "05": Object.freeze({
    cover: pendingCover(
      "05",
      "assets/dossiers/dossier-05.svg",
      "LUMEN signal remains",
    ),
    evidence: Object.freeze([
      pendingEvidence("05", 0, "LUMEN orange eye and corrupted waveform"),
      pendingEvidence("05", 1, "External speaker count: zero", {
        mediaType: "motion",
      }),
    ]),
    audio: pendingAudio("05", "Blackbeard voice, static and LUMEN pings"),
  }),
  "06": Object.freeze({
    cover: pendingCover(
      "06",
      "assets/dossiers/dossier-06.svg",
      "Burned Yatagarasu route log",
    ),
    evidence: Object.freeze([
      pendingEvidence("06", 0, "Burned Yatagarasu route map"),
      pendingEvidence("06", 1, "Chibi-Go route markers"),
    ]),
    audio: pendingAudio("06", "Radio whisper and drone chirps"),
  }),
  "07": Object.freeze({
    cover: pendingCover(
      "07",
      "assets/dossiers/dossier-07.svg",
      "Kira field statement",
    ),
    evidence: Object.freeze([
      pendingEvidence("07", 0, "Recorder on a table beside white flowers"),
      pendingEvidence("07", 1, "Damaged Kira scientist ID"),
    ]),
    audio: pendingAudio("07", "Kira testimony, rain and recorder hiss"),
  }),
  "08": Object.freeze({
    cover: pendingCover(
      "08",
      "assets/dossiers/dossier-08.svg",
      "Aira reconstruction log",
    ),
    evidence: Object.freeze([
      pendingEvidence("08", 0, "Aira surgical reconstruction scan"),
      pendingEvidence("08", 1, "Close the door margin text"),
    ]),
    audio: pendingAudio("08", "Surgical monitor, breathing mask and memory glitch"),
  }),
  "09": Object.freeze({
    cover: pendingCover(
      "09",
      "assets/dossiers/dossier-09.svg",
      "Final assault fragment",
    ),
    evidence: Object.freeze([
      pendingEvidence("09", 0, "Syntos final assault tactical map"),
      pendingEvidence(
        "09",
        1,
        "Yatagarasu, Fluxfire, Negara, KPCO, Aberrants and Chibi-Go alignment",
        { mediaType: "motion" },
      ),
    ]),
    audio: pendingAudio("09", "Alarms, radio commands, reactor hum and signal loss"),
  }),
  "10": Object.freeze({
    cover: pendingCover(
      "10",
      "assets/dossiers/dossier-10.svg",
      "Public rumor collection",
    ),
    evidence: Object.freeze([
      pendingEvidence("10", 0, "Public rumor collage wall"),
      pendingEvidence("10", 1, "Prisma wall inscription"),
      pendingEvidence("10", 2, "Boon ramen steam shape"),
      pendingEvidence("10", 3, "Syntos route charm"),
      pendingEvidence("10", 4, "Children's chalk chant"),
      pendingEvidence("10", 5, "Flowers without a grave"),
      pendingEvidence("10", 6, "Old factory wall"),
      pendingEvidence("10", 7, "Final scratched name: Ichiro"),
    ]),
    audio: pendingAudio(
      "10",
      "Child chant, tavern argument, market prayer and Chibi-Go chirps",
    ),
  }),
});

export const dossierAssetPolicy = Object.freeze({
  version: "v264",
  statuses: STATUS,
  newAssetBudgets: Object.freeze({
    cover: NEW_COVER_BUDGET,
    evidence: NEW_EVIDENCE_BUDGET,
    motion: NEW_MOTION_BUDGET,
    audio: NEW_AUDIO_BUDGET,
    activeDossier: 4 * MiB,
  }),
  runtimeStrategy: "load-on-open",
});

export function getDossierAssets(id) {
  return dossierAssetCatalog[String(id)] || null;
}

export function resolveDossierCover(id) {
  const cover = getDossierAssets(id)?.cover;
  return cover?.src || cover?.fallbackSrc || "";
}
