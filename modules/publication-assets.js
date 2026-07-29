const KiB = 1024;
const MiB = 1024 * KiB;

function approved(id, src, maxBytes, alt, mediaType = "image") {
  return Object.freeze({
    id,
    status: "approved",
    src,
    maxBytes,
    alt,
    mediaType,
    provenance: "project-owned",
  });
}

function pending(id, targetStem, maxBytes, alt, mediaType, allowedExtensions) {
  return Object.freeze({
    id,
    status: "pending",
    src: null,
    targetStem,
    maxBytes,
    alt,
    mediaType,
    allowedExtensions,
    provenance: "pending",
  });
}

export const publicationAssetCatalog = Object.freeze({
  site: Object.freeze({
    favicon: approved(
      "publication.favicon",
      "assets/brand/kpr-logo-symbol.png",
      64 * KiB,
      "KPR symbol",
    ),
    shareImage: approved(
      "publication.share-image",
      "assets/brand/hack-activation-logo.png",
      2 * MiB,
      "ICHIRO Legacy of Rebirth activation seal",
    ),
  }),
  archiveVideo: Object.freeze({
    poster: pending(
      "publication.archive-video-poster",
      "designation-silent-sentinel-poster",
      500 * KiB,
      "Recovered Memory Feed poster frame",
      "image",
      ["avif", "webp", "jpg", "png"],
    ),
    captions: pending(
      "publication.archive-video-captions",
      "designation-silent-sentinel-en",
      128 * KiB,
      "English captions for the Recovered Memory Feed",
      "captions",
      ["vtt"],
    ),
  }),
  linkMarks: Object.freeze({
    x: pending(
      "publication.link-mark-x",
      "link-mark-x",
      48 * KiB,
      "Shine Time on X",
      "image",
      ["svg", "webp", "png"],
    ),
    pinterest: pending(
      "publication.link-mark-pinterest",
      "link-mark-pinterest",
      48 * KiB,
      "Pinterest moodboard",
      "image",
      ["svg", "webp", "png"],
    ),
    newEden: pending(
      "publication.link-mark-new-eden",
      "link-mark-new-eden",
      96 * KiB,
      "New Eden database hub",
      "image",
      ["svg", "webp", "png"],
    ),
  }),
});

function installLinkMark(root, key, asset) {
  if (!asset?.src) return;
  const slot = root.querySelector(`[data-publication-asset="${key}"]`);
  if (!slot) return;
  const image = document.createElement("img");
  image.src = asset.src;
  image.alt = "";
  image.decoding = "async";
  image.loading = "lazy";
  image.style.width = "100%";
  image.style.height = "100%";
  image.style.display = "block";
  image.style.objectFit = "cover";
  slot.replaceChildren(image);
  slot.classList.add("has-final-asset");
}

export function applyPublicationAssets(root = document) {
  const video = root.querySelector("#archive-video");
  const { poster, captions } = publicationAssetCatalog.archiveVideo;
  if (video && poster.src) {
    video.poster = poster.src;
  }
  if (video && captions.src && !video.querySelector("track[data-kpr-final-captions]")) {
    const track = document.createElement("track");
    track.kind = "captions";
    track.srclang = "en";
    track.label = "English";
    track.src = captions.src;
    track.default = true;
    track.dataset.kprFinalCaptions = "true";
    video.append(track);
  }

  for (const [key, asset] of Object.entries(publicationAssetCatalog.linkMarks)) {
    installLinkMark(root, key, asset);
  }
}
