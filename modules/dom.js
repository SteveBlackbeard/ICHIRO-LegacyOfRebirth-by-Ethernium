// Staged DOM map for the first safe app.js extraction.
// This file is not loaded by index.html yet.

export const els = {
  dotCanvas: document.querySelector("#cyber-dots"),
  dotFrontCanvas: document.querySelector("#cyber-dots-front"),
  ichiroCanvas: document.querySelector("#ichiro-particles"),
  glitchBurst: document.querySelector("#glitch-burst"),

  activationScreen: document.querySelector("#activation-screen"),
  activationButton: document.querySelector("#activation-button"),
  chosenForm: document.querySelector("#chosen-form"),
  chosenInput: document.querySelector("#chosen-input"),
  hackIntro: document.querySelector("#hack-intro"),
  hackRain: document.querySelector(".hack-rain"),

  ambientMusic: document.querySelector("#ambient-music"),
  uiClickSound: document.querySelector("#ui-click-sound"),
  activationCodecSound: document.querySelector("#activation-codec-sound"),
  hackSimSound: document.querySelector("#hack-sim-sound"),
  jokerHoverSound: document.querySelector("#joker-hover-sound"),
  ambientToggle: document.querySelector("#ambient-toggle"),

  cursorBubble: document.querySelector("#cursor-bubble"),
  pampCursor: document.querySelector("#pamp-cursor"),

  loginScreen: document.querySelector("#login-screen"),
  loginFigure: document.querySelector(".login-figure-left"),
  loginForm: document.querySelector("#login-form"),
  terminalOutput: document.querySelector("#terminal-output"),

  kpcoLogoVideo: document.querySelector("#kpco-logo-video"),
  kpcoLogoCanvas: document.querySelector("#kpco-logo-canvas"),
  kpcoHackLogoCanvas: document.querySelector("#kpco-hack-logo-canvas"),
  kpcoArchiveLogoCanvas: document.querySelector("#kpco-archive-logo-canvas"),
  kpcoLogoSlot: document.querySelector(".terminal-logo-slot"),
  kpcoHackLogoSlot: document.querySelector(".hack-logo-slot"),
  kpcoArchiveLogoSlot: document.querySelector(".hud-logo-slot"),

  archiveScreen: document.querySelector("#archive-screen"),
  archiveVideoStage: document.querySelector("#archive-video-stage"),
  archiveVideo: document.querySelector("#archive-video"),
  archiveScrollCue: document.querySelector(".archive-scroll-cue"),
  archiveLoreSegments: document.querySelector("#archive-lore-segments"),
  archiveVideoLoreTabs: document.querySelector("#archive-video-lore-tabs"),

  hudTelemetry: document.querySelector(".hud-telemetry"),
  hudNode: document.querySelector("#hud-node"),
  hudLat: document.querySelector("#hud-lat"),
  hudLon: document.querySelector("#hud-lon"),
  hudSpeed: document.querySelector("#hud-speed"),
  hudTrace: document.querySelector("#hud-trace"),
  hudCompass: document.querySelector(".hud-compass"),
  hudCompassNeedle: document.querySelector("#hud-compass-needle"),

  panelRing: document.querySelector("#panel-ring"),
  lockedHint: document.querySelector("#locked-hint"),
  finalMessage: document.querySelector("#final-message"),
  caseViewer: document.querySelector("#case-viewer"),
  caseTitle: document.querySelector("#case-title"),
  caseStatus: document.querySelector("#case-status"),
  caseContent: document.querySelector("#case-content"),
  placeholderList: document.querySelector("#placeholder-list"),
  audioPlaceholder: document.querySelector("#audio-placeholder"),
  narrativeButton: document.querySelector("#narrative-button"),
  narrativeGlobal: document.querySelector("#narrative-global"),
  ichiroMemory: document.querySelector("#ichiro-memory"),
  dossierSizeToggle: document.querySelector("#dossier-size-toggle"),
  dossierMediaExpandBtn: document.querySelector("#dossier-media-expand-btn"),
  controlHint: document.querySelector(".control-hint"),
  dossierPanelBrowser: document.querySelector(".dossier-panel-browser"),

  profileCharacter: document.querySelector(".profile-character"),
  profileCharacterFront: document.querySelector(".profile-character__front"),
  profileCharacterFrame: document.querySelector(".profile-character__frame"),
  profileCharacterLabel: document.querySelector(".profile-character__label"),
  profileBoxes: Array.from(document.querySelectorAll(".profile-box")),
  statRows: Array.from(document.querySelectorAll(".stat-row")),
};

export function getChosenSubmit() {
  return els.chosenForm?.querySelector("button") || null;
}
