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

const NEW_COVER_SOURCES = Object.freeze({
  "03": "assets/dossiers/dossier-03-cover.webp",
  "04": "assets/dossiers/dossier-04-cover.webp",
  "05": "assets/dossiers/dossier-05-cover.webp",
  "06": "assets/dossiers/dossier-06-cover.webp",
  "07": "assets/dossiers/dossier-07-cover.webp",
  "08": "assets/dossiers/dossier-08-cover.webp",
  "09": "assets/dossiers/dossier-09-cover.webp",
  "10": "assets/dossiers/dossier-10-cover.webp",
});

const NEW_EVIDENCE_SOURCES = Object.freeze({
  "03": Object.freeze([
    "assets/dossiers/dossier-03-evidence-01.webp",
    "assets/dossiers/dossier-03-evidence-02.webp",
  ]),
  "04": Object.freeze([
    "assets/dossiers/dossier-04-evidence-01.webp",
    "assets/dossiers/dossier-04-evidence-02.webp",
  ]),
  "05": Object.freeze([
    "assets/dossiers/dossier-05-evidence-01.webp",
  ]),
  "06": Object.freeze([
    "assets/dossiers/dossier-06-evidence-01.webp",
    "assets/dossiers/dossier-06-evidence-02.webp",
  ]),
  "07": Object.freeze([
    "assets/dossiers/dossier-07-evidence-01.webp",
    "assets/dossiers/dossier-07-evidence-02.webp",
  ]),
  "08": Object.freeze([
    "assets/dossiers/dossier-08-evidence-01.webp",
    "assets/dossiers/dossier-08-evidence-02.webp",
  ]),
  "09": Object.freeze([
    "assets/dossiers/dossier-09-evidence-01.webp",
  ]),
  "10": Object.freeze([
    "assets/dossiers/dossier-10-evidence-01.webp",
    "assets/dossiers/dossier-10-evidence-02.webp",
    "assets/dossiers/dossier-10-evidence-03.webp",
    "assets/dossiers/dossier-10-evidence-04.webp",
    "assets/dossiers/dossier-10-evidence-05.webp",
    "assets/dossiers/dossier-10-evidence-06.webp",
    "assets/dossiers/dossier-10-evidence-07.webp",
    "assets/dossiers/dossier-10-evidence-08.webp",
  ]),
});

const AUDIO_SOURCES = Object.freeze({
  "00": "assets/audio/dossiers/dossier-00-soundscape.ogg",
  "01": "assets/audio/dossiers/dossier-01-soundscape.ogg",
  "02": "assets/audio/dossiers/dossier-02-soundscape.ogg",
  "03": "assets/audio/dossiers/dossier-03-soundscape.ogg",
  "04": "assets/audio/dossiers/dossier-04-soundscape.ogg",
  "05": "assets/audio/dossiers/dossier-05-soundscape.ogg",
  "06": "assets/audio/dossiers/dossier-06-soundscape.ogg",
  "07": "assets/audio/dossiers/dossier-07-soundscape.ogg",
  "08": "assets/audio/dossiers/dossier-08-soundscape.ogg",
  "09": "assets/audio/dossiers/dossier-09-soundscape.ogg",
  "10": "assets/audio/dossiers/dossier-10-soundscape.ogg",
});

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

function approvedNewCover(id, alt) {
  return approvedCover(
    id,
    NEW_COVER_SOURCES[id],
    NEW_COVER_BUDGET,
    alt,
  );
}

function approvedEvidence(id, index, alt) {
  const suffix = String(index + 1).padStart(2, "0");
  return approvedAsset(
    `${id}.evidence-${suffix}`,
    NEW_EVIDENCE_SOURCES[id]?.[index],
    NEW_EVIDENCE_BUDGET,
    alt,
  );
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

function approvedAudio(id, label) {
  return approvedAsset(
    `${id}.audio`,
    AUDIO_SOURCES[id],
    128 * KiB,
    label,
    { mediaType: "audio" },
  );
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
    audio: approvedAudio("00", "Low archive hum and paper scan"),
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
    audio: approvedAudio("01", "Heart monitor, glass impact and distant scream"),
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
      approvedAsset(
        "02.evidence-02",
        "assets/dossiers/dossier-02-evidence-02.webm",
        320 * KiB,
        "Balance, sacrifice and necessity text corruption",
        { mediaType: "motion" },
      ),
    ]),
    audio: approvedAudio("02", "Printer, reactor hum and synthetic voice"),
  }),
  "03": Object.freeze({
    cover: approvedNewCover("03", "Keigami KPCO personnel trace"),
    evidence: Object.freeze([
      approvedEvidence("03", 0, "Keigami KPCO personnel ID portrait"),
      approvedEvidence("03", 1, "Corrupted signature mark"),
    ]),
    audio: approvedAudio("03", "Voice authorization, boot steps and radio click"),
  }),
  "04": Object.freeze({
    cover: approvedNewCover("04", "Recovered child training memory"),
    evidence: Object.freeze([
      approvedEvidence("04", 0, "Aira wrapping Hangyaku-sha's shaking hands"),
      approvedEvidence("04", 1, "Split ration tablet on a cold floor"),
    ]),
    audio: approvedAudio("04", "Bare feet, cloth wrap and distant footsteps"),
  }),
  "05": Object.freeze({
    cover: approvedNewCover("05", "LUMEN signal remains"),
    evidence: Object.freeze([
      approvedEvidence("05", 0, "LUMEN orange eye and corrupted waveform"),
      approvedAsset(
        "05.evidence-02",
        "assets/dossiers/dossier-05-evidence-02.webm",
        160 * KiB,
        "External speaker count: zero",
        { mediaType: "motion" },
      ),
    ]),
    audio: approvedAudio("05", "Blackbeard voice, static and LUMEN pings"),
  }),
  "06": Object.freeze({
    cover: approvedNewCover("06", "Burned Yatagarasu route log"),
    evidence: Object.freeze([
      approvedEvidence("06", 0, "Burned Yatagarasu route map"),
      approvedEvidence("06", 1, "Chibi-Go route markers"),
    ]),
    audio: approvedAudio("06", "Radio whisper and drone chirps"),
  }),
  "07": Object.freeze({
    cover: approvedNewCover("07", "Kira field statement"),
    evidence: Object.freeze([
      approvedEvidence("07", 0, "Recorder on a table beside white flowers"),
      approvedEvidence("07", 1, "Damaged Kira scientist ID"),
    ]),
    audio: approvedAudio("07", "Kira testimony, rain and recorder hiss"),
  }),
  "08": Object.freeze({
    cover: approvedNewCover("08", "Aira reconstruction log"),
    evidence: Object.freeze([
      approvedEvidence("08", 0, "Aira surgical reconstruction scan"),
      approvedEvidence("08", 1, "Close the door margin text"),
    ]),
    audio: approvedAudio("08", "Surgical monitor, breathing mask and memory glitch"),
  }),
  "09": Object.freeze({
    cover: approvedNewCover("09", "Final assault fragment"),
    evidence: Object.freeze([
      approvedEvidence("09", 0, "Syntos final assault tactical map"),
      approvedAsset(
        "09.evidence-02",
        "assets/dossiers/dossier-09-evidence-02.webm",
        160 * KiB,
        "Yatagarasu, Fluxfire, Negara, KPCO, Aberrants and Chibi-Go alignment",
        { mediaType: "motion" },
      ),
    ]),
    audio: approvedAudio("09", "Alarms, radio commands, reactor hum and signal loss"),
  }),
  "10": Object.freeze({
    cover: approvedNewCover("10", "Public rumor collection"),
    evidence: Object.freeze([
      approvedEvidence("10", 0, "Public rumor collage wall"),
      approvedEvidence("10", 1, "Prisma wall inscription"),
      approvedEvidence("10", 2, "Boon ramen steam shape"),
      approvedEvidence("10", 3, "Syntos route charm"),
      approvedEvidence("10", 4, "Children's chalk chant"),
      approvedEvidence("10", 5, "Flowers without a grave"),
      approvedEvidence("10", 6, "Old factory wall"),
      approvedEvidence("10", 7, "Final scratched name: Ichiro"),
    ]),
    audio: approvedAudio(
      "10",
      "Child chant, tavern argument, market prayer and Chibi-Go chirps",
    ),
  }),
});

export const dossierAssetPolicy = Object.freeze({
  version: "v267",
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
