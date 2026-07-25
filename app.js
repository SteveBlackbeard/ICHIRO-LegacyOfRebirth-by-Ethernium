import { files, initialUnlocked } from "./modules/archive-data.js";
import { createActivationFlow } from "./modules/activation-flow.js";
import { bindAppEvents } from "./modules/app-events.js?v=kpr-interdimensional-portal-222";
import { createArchiveUi } from "./modules/archive-ui.js?v=kpr-domain-core-229";
import { createArchiveProgression } from "./modules/archive-progression.js?v=kpr-domain-core-229";
import { createAudioSystem } from "./modules/audio.js?v=kpr-warp-curves-213";
import { createCursorSystem } from "./modules/cursor.js?v=kpr-mobile-touch-149";
import { els, getChosenSubmit } from "./modules/dom.js?v=kpr-mobile-touch-149";
import { createHackTerminal } from "./modules/hack-terminal.js";
import { createHudTelemetry } from "./modules/hud-telemetry.js?v=kpr-adaptive-runtime-116";
import { createInputMode } from "./modules/input-mode.js?v=kpr-mobile-touch-149";
import { createKpcoLogoRenderer } from "./modules/kpco-logo.js?v=kpr-lifecycle-core-230";
import { createNarrativeController } from "./modules/narrative.js";
import { createParticleSystem } from "./modules/particles.js?v=kpr-runtime-loop-budget-163";
import { createPerformanceController } from "./modules/performance.js?v=kpr-yatagarasu-budget-default-124";
import { createProfileHotzones } from "./modules/profile-hotzones.js";
import { createRuntimeLifecycle } from "./modules/runtime-lifecycle.js?v=kpr-lifecycle-core-230";
import { createRuntimePhaseDirector } from "./modules/runtime-phase.js?v=kpr-lifecycle-core-230";
import { createVisualQualityController } from "./modules/visual-quality.js?v=kpr-lifecycle-core-230";
import { startCinemaGrade } from "./modules/cinema-grade.js?v=kpr-cinema-direction-207";
import { createStoryMode } from "./modules/story-mode.js?v=kpr-domain-core-229";
import { initPortalGpu } from "./modules/portal-gpu.js?v=kpr-interdimensional-portal-222";
import { createPortalEnergyDirector } from "./modules/portal-energy.js?v=kpr-interdimensional-portal-222";
import { createQuantumVortexDirector } from "./modules/quantum-vortex-director.js?v=kpr-v247-quantum-vortex";
import {
  loadFullLore,
  renderArchiveLoreSegments as renderLoreSegments,
} from "./modules/lore.js";
import {
  loadState as loadInitialState,
  saveState as saveCurrentState,
} from "./modules/state.js?v=kpr-domain-core-229";
import { initLumen3D } from "./lumen-3d.js";
import { initSecretProtocol } from "./modules/secret-protocol.js?v=kpr-vnext-226";
import { initVisitCounter } from "./modules/visit-counter.js?v=kpr-vnext-226";

let state = loadState();
const archiveProgression = createArchiveProgression({
  files,
  getState: () => state,
  saveState: () => saveCurrentState(),
});
let authenticated = false;
let panelMotionStarted = false;
let pageVisible = document.visibilityState !== "hidden";
let postAuthSystemsLoaded = false;

const dotCanvas = els.dotCanvas;
const dotFrontCanvas = els.dotFrontCanvas;
const ichiroCanvas = els.ichiroCanvas;
const glitchBurst = els.glitchBurst;
const activationScreen = els.activationScreen;
const activationButton = els.activationButton;
const chosenForm = els.chosenForm;
const chosenInput = els.chosenInput;
const chosenSubmit = getChosenSubmit();
const hackIntro = els.hackIntro;
const hackRain = els.hackRain;
const ambientMusic = els.ambientMusic;
const uiClickSound = els.uiClickSound;
const activationCodecSound = els.activationCodecSound;
const hackSimSound = els.hackSimSound;
const jokerHoverSound = els.jokerHoverSound;
const cursorBubble = els.cursorBubble;
const pampCursor = els.pampCursor;
const ambientToggle = els.ambientToggle;
const loginScreen = els.loginScreen;
const loginFigure = els.loginFigure;
const archiveScreen = els.archiveScreen;
const archiveVideoStage = els.archiveVideoStage;
const archiveVideo = els.archiveVideo;
const archiveScrollCue = els.archiveScrollCue;
const archiveLoreSegments = els.archiveLoreSegments;
const archiveVideoLoreTabs = els.archiveVideoLoreTabs;
const phaseDirector = createRuntimePhaseDirector({
  body: document.body,
  archiveScreen,
  caseViewer: els.caseViewer,
  storyStage: document.querySelector("#story-stage"),
});
phaseDirector.start();
const runtimeLifecycle = createRuntimeLifecycle({ phaseDirector });
window.__kprRuntimePhaseDirector = phaseDirector;
window.__kprRuntimeLifecycle = runtimeLifecycle;
const inputModeSystem = createInputMode({
  scrollCue: archiveScrollCue,
  controlHint: els.controlHint,
});
runtimeLifecycle.register("input-mode", inputModeSystem);
const loginForm = els.loginForm;
const terminalOutput = els.terminalOutput;
const kpcoLogoVideo = els.kpcoLogoVideo;
const kpcoLogoCanvas = els.kpcoLogoCanvas;
const kpcoHackLogoCanvas = els.kpcoHackLogoCanvas;
const kpcoArchiveLogoCanvas = els.kpcoArchiveLogoCanvas;
const kpcoLogoSlot = els.kpcoLogoSlot;
const kpcoHackLogoSlot = els.kpcoHackLogoSlot;
const kpcoArchiveLogoSlot = els.kpcoArchiveLogoSlot;
const performanceController = createPerformanceController({
  archiveVideo,
  getPageVisible: () => pageVisible,
});
const getMotionQuality = () => performanceController.getMotionQuality();
const isAdaptivePerformance = () => performanceController.variants.perf === "adaptive";
runtimeLifecycle.register("performance", performanceController);
const visualQualityController = createVisualQualityController({
  getMotionQuality,
  getPageVisible: () => pageVisible,
  phaseDirector,
});
runtimeLifecycle.register("visual-quality", visualQualityController);
const getVisualQualityState = () => visualQualityController.getState();
const preloadMode = new URLSearchParams(window.location.search).get("preload") === "baseline" ? "baseline" : "smart";
document.documentElement.dataset.kprPreload = preloadMode;
if (preloadMode === "smart") {
  import("./modules/preload-director.js?v=kpr-smart-preload-default-126")
    .then(({ createPreloadDirector }) => createPreloadDirector({
      archiveVideo,
      variants: performanceController.variants,
      getPageVisible: () => pageVisible,
    }).start())
    .catch((error) => console.warn("KPR preload director failed", error));
}
if (new URLSearchParams(window.location.search).get("debug") === "perf") {
  import("./modules/performance-debug.js?v=kpr-lifecycle-core-230")
    .then(({ startPerformanceDebugPanel }) => startPerformanceDebugPanel({ getMotionQuality, getVisualQualityState }))
    .catch((error) => console.warn("KPR perf debug failed", error));
}
const kpcoLogoRenderer = createKpcoLogoRenderer({
  video: kpcoLogoVideo,
  accessCanvas: kpcoLogoCanvas,
  hackCanvas: kpcoHackLogoCanvas,
  archiveCanvas: kpcoArchiveLogoCanvas,
  accessSlot: kpcoLogoSlot,
  hackSlot: kpcoHackLogoSlot,
  archiveSlot: kpcoArchiveLogoSlot,
  getMotionQuality,
  getPageVisible: () => pageVisible,
  isAdaptivePerformance,
  getRuntimePhase: phaseDirector.current,
});
const particleSystem = createParticleSystem({
  dotCanvas,
  dotFrontCanvas,
  ichiroCanvas,
  getMotionQuality,
  getPageVisible: () => pageVisible,
  getAuthenticated: () => authenticated,
  seedHackRain,
});
const cursorSystem = createCursorSystem({
  cursorBubble,
  pampCursor,
  isTouchMode: inputModeSystem.isTouchMode,
});
const audioSystem = createAudioSystem({
  ambientMusic,
  uiClickSound,
  activationCodecSound,
  hackSimSound,
  jokerHoverSound,
  archiveVideo,
  archiveScreen,
  ambientToggle,
  showCursorBubble,
});
const activationFlow = createActivationFlow({
  glitchBurst,
  activationButton,
  chosenForm,
  chosenInput,
  chosenSubmit,
  hackIntro,
  startKpcoTerminalLogo,
  prepareAmbientMusic,
  tone,
  playHackSimulationCue,
  startCanvasLoop,
  startAmbientMusic,
  primeActivationCodecAudio,
  unlockActivationCodecHtmlAudio,
  playUiClick,
  playActivationCodec,
  showCursorBubble,
});
const archiveUi = createArchiveUi({
  files,
  initialActiveIndex: findFirstUnlockedIndex(),
  progression: archiveProgression,
  tone,
  setParticlePulse,
  loadFullLore,
  renderLoreSegments,
  stopNarrative,
  stopArchiveVideoExternalAudio,
  releaseArchiveVideoMediaHold,
  playArchiveVideoWithAudio,
  getArchiveVideoSilentPriming,
  pauseArchiveVideoPlayback,
  els,
});
const hudTelemetry = els.hudTelemetry;
const hudNode = els.hudNode;
const hudLat = els.hudLat;
const hudLon = els.hudLon;
const hudSpeed = els.hudSpeed;
const hudTrace = els.hudTrace;
const hudCompass = els.hudCompass;
const hudCompassNeedle = els.hudCompassNeedle;
const panelRing = els.panelRing;
const lockedHint = els.lockedHint;
const finalMessage = els.finalMessage;
const caseViewer = els.caseViewer;
const caseTitle = els.caseTitle;
const caseStatus = els.caseStatus;
const caseContent = els.caseContent;
const placeholderList = els.placeholderList;
const audioPlaceholder = els.audioPlaceholder;
const narrativeButton = els.narrativeButton;
const narrativeGlobal = els.narrativeGlobal;
const ichiroMemory = els.ichiroMemory;
const profileCharacter = els.profileCharacter;
const profileCharacterFront = els.profileCharacterFront;
const profileCharacterFrame = els.profileCharacterFrame;
const profileCharacterLabel = els.profileCharacterLabel;
const profileBoxes = els.profileBoxes;
const statRows = els.statRows;
const folderToggle = els.folderToggle;
const dossierPanelBrowser = els.dossierPanelBrowser;
const hudTelemetrySystem = createHudTelemetry({
  hudTelemetry,
  hudNode,
  hudLat,
  hudLon,
  hudSpeed,
  hudTrace,
  hudCompass,
  hudCompassNeedle,
  showContextualBubble,
  isAdaptivePerformance,
  isActive: () => document.visibilityState !== "hidden",
});
const hackTerminal = createHackTerminal({ hackRain });
const profileHotzones = createProfileHotzones({
  profileCharacter,
  profileCharacterFront,
  profileCharacterFrame,
  profileCharacterLabel,
  onLabelEnter: playJokerHoverCue,
});
const narrativeController = createNarrativeController({
  narrativeButton,
  narrativeGlobal,
  openNextFile: () => archiveUi.openNextNarrativeFile(),
});

function updateHudTelemetry() {
  hudTelemetrySystem.update();
}

function handleDeviceOrientation(event) {
  hudTelemetrySystem.handleDeviceOrientation(event);
}

function enableDeviceCompass() {
  hudTelemetrySystem.enableDeviceCompass();
}

function startHudTelemetry() {
  hudTelemetrySystem.start();
}

function seedHackRain() {
  hackTerminal.seedRain();
}

function triggerGlitch(duration = 820) {
  activationFlow.triggerGlitch(duration);
}

function setActivationLogoProgress(value) {
  activationFlow.setActivationLogoProgress(value);
}

function playActivationCodec() {
  audioSystem.playActivationCodec();
}

function unlockActivationCodecHtmlAudio() {
  audioSystem.unlockActivationCodecHtmlAudio();
}

function primeActivationCodecAudio() {
  audioSystem.primeActivationCodecAudio();
}

function playHackSimulationCue() {
  audioSystem.playHackSimulationCue();
}

function playJokerHoverCue(event) {
  audioSystem.playJokerHoverCue(event);
}

function isPampInteractiveTarget(target) {
  return cursorSystem.isPampInteractiveTarget(target);
}

function renderPampCursor() {
  cursorSystem.updatePampCursor({ clientX: window.innerWidth * 0.55, clientY: window.innerHeight * 0.52 });
}

function requestPampCursorFrame() {
  renderPampCursor();
}

function updatePampCursor(event) {
  cursorSystem.updatePampCursor(event);
}

function updateCursorBubblePosition(x, y) {
  cursorSystem.updateCursorBubblePosition(x, y);
}

function showCursorBubble(message, duration = 1900, event = null) {
  cursorSystem.showCursorBubble(message, duration, event);
}

function showContextualBubble(key, message, duration = 2400, event = null, cooldown = 3600) {
  cursorSystem.showContextualBubble(key, message, duration, event, cooldown);
}

function isPointerInArchiveSwordZone(event) {
  return archiveUi.isPointerInArchiveSwordZone(event);
}

function handleActivationWheel(event) {
  activationFlow.handleActivationWheel(event);
}

function launchHackProgram() {
  activationFlow.launchHackProgram();
}

function finishIntro() {
  activationFlow.finishIntro();
}

function startKpcoTerminalLogo() {
  kpcoLogoRenderer.start();
}
function prepareAmbientMusic() {
  audioSystem.prepareAmbientMusic();
}

function primeAmbientMusic() {
  audioSystem.primeAmbientMusic();
}

function startAmbientMusic() {
  audioSystem.startAmbientMusic();
}

function pauseAmbientMusic() {
  audioSystem.pauseAmbientMusic();
}

function resumeAmbientMusic() {
  audioSystem.resumeAmbientMusic();
}

function pauseAmbientForMedia() {
  audioSystem.pauseAmbientForMedia();
}
window.pauseAmbientForMedia = pauseAmbientForMedia;

function releaseArchiveVideoMediaHold() {
  audioSystem.releaseArchiveVideoMediaHold();
}
window.releaseArchiveVideoMediaHold = releaseArchiveVideoMediaHold;
window.pauseArchiveVideoPlayback = pauseArchiveVideoPlayback;
window.resumeArchiveVideoPlayback = resumeArchiveVideoPlayback;

function updateAmbientToggle() {
  audioSystem.updateAmbientToggle();
}

function toggleAmbientMusic() {
  audioSystem.toggleAmbientMusic();
}

function handleMediaPlay(event) {
  audioSystem.handleMediaPlay(event);
}

function handleMediaStop(event) {
  audioSystem.handleMediaStop(event);
}

function tone(type = "move") {
  audioSystem.tone(type);
}

function loadUiClickBuffer() {
  return audioSystem.loadUiClickBuffer();
}

function playUiClick() {
  audioSystem.playUiClick();
}

function prepareArchiveVideoAudio() {
  audioSystem.prepareArchiveVideoAudio();
}

function forceArchiveVideoAudible() {
  audioSystem.forceArchiveVideoAudible();
}

function sustainArchiveVideoAudio(duration = 2200) {
  audioSystem.sustainArchiveVideoAudio(duration);
}

function stopArchiveVideoExternalAudio() {
  audioSystem.stopArchiveVideoExternalAudio();
}

function primeArchiveVideoAudio() {
  audioSystem.primeArchiveVideoAudio();
}

function primeArchiveVideoAudioFromGesture() {
  audioSystem.primeArchiveVideoAudioFromGesture();
}

function playArchiveVideoWithAudio() {
  audioSystem.playArchiveVideoWithAudio();
}

function pauseArchiveVideoPlayback() {
  audioSystem.pauseArchiveVideoPlayback();
}

function resumeArchiveVideoPlayback() {
  audioSystem.resumeArchiveVideoPlayback();
}

function toggleArchiveVideoPlayback() {
  audioSystem.toggleArchiveVideoPlayback();
}

function getArchiveVideoSilentPriming() {
  return audioSystem.getArchiveVideoSilentPriming();
}

function wantsAmbientMusic() {
  return audioSystem.wantsAmbientMusic();
}

function loadState() {
  return loadInitialState(initialUnlocked);
}

function isUnlocked(id) {
  return archiveProgression.isUnlocked(id);
}

function findFirstUnlockedIndex() {
  return archiveProgression.findFirstUnlockedIndex();
}

function resizeCanvases() {
  particleSystem.resizeCanvases();
}

function startCanvasLoop() {
  particleSystem.startCanvasLoop();
}

function drawIchiro(now) {
  particleSystem.drawIchiro(now);
}

function setParticlePulse(value) {
  particleSystem.setPulse(value);
}

let terminalFeedTimer = 0;
let terminalFeedQueue = [];

function streamTerminalLines(lines, { reset = false, interval = 60 } = {}) {
  window.clearInterval(terminalFeedTimer);
  if (reset) terminalFeedQueue = [];
  let index = 0;
  terminalOutput.classList.add("is-streaming");
  const pushLine = () => {
    if (index >= lines.length) {
      window.clearInterval(terminalFeedTimer);
      return;
    }
    terminalFeedQueue.push(lines[index++]);
    terminalOutput.textContent = terminalFeedQueue.slice(-6).join("\n");
  };
  pushLine();
  terminalFeedTimer = window.setInterval(pushLine, interval);
}

function loadPostAuthSystems() {
  if (postAuthSystemsLoaded) return;
  postAuthSystemsLoaded = true;

  import("./modules/magnetic-ui.js?v=kpr-frugal-runtime-233")
    .then(({ initMagneticUI }) => {
      const controller = initMagneticUI();
      if (controller) {
        runtimeLifecycle.register("magnetic-ui", controller, {
          phases: ["character-profile", "dossier", "archive-video", "map", "story"],
        });
      }
    })
    .catch(e => console.warn("KPR magnetic-ui init failed", e));
  import("./modules/intercepted-transmission.js?v=kpr-v245-quantum-aperture")
    .then(({ initInterceptedTransmissions }) => initInterceptedTransmissions({ showCursorBubble }))
    .catch(e => console.warn("KPR intercepted-transmission init failed", e));
  import("./modules/parallax-depth.js?v=kpr-frugal-runtime-233")
    .then(({ initParallaxDepth }) => {
      const controller = initParallaxDepth();
      if (controller) {
        runtimeLifecycle.register("parallax-depth", controller, {
          phases: ["character-profile", "dossier", "archive-video", "map", "story"],
        });
      }
    })
    .catch(e => console.warn("KPR parallax-depth init failed", e));
  import("./modules/audio-reactivity.js?v=kpr-frugal-runtime-233")
    .then(({ initAudioReactivity }) => {
      const controller = initAudioReactivity();
      if (controller) {
        runtimeLifecycle.register("audio-reactivity", controller, {
          phases: ["character-profile", "dossier", "archive-video", "map", "story"],
        });
      }
    })
    .catch(e => console.warn("KPR audio-reactivity init failed", e));
}

function authenticate(event) {
  event.preventDefault();
  window.dispatchEvent(new CustomEvent("ichiro:auth-start"));
  primeArchiveVideoAudioFromGesture();
  resumeAmbientMusic();
  triggerGlitch(900);
  streamTerminalLines([
    "NEMETH Corp. ARCHIVE TERMINAL",
    "------------------------",
    "AUTHORIZED ACCESS REQUIRED",
    "",
    `USER: ${document.querySelector("#user-input").value || "UNKNOWN"}`,
    "PASSWORD: ********",
    "",
    "AUTHENTICATING...",
  ], { reset: true });

  tone("open");

  window.setTimeout(() => {
    streamTerminalLines(["IDENTITY VERIFIED", "ACCESS GRANTED", "", "WELCOME BACK"]);
    document.body.classList.add("authenticated");
    authenticated = true;
    setParticlePulse(1);
    startCanvasLoop();
    window.dispatchEvent(new CustomEvent("ichiro:auth"));

    loadPostAuthSystems();

  }, 520);

  window.setTimeout(() => {
    triggerGlitch(620);
    loginScreen.classList.add("hidden");
    archiveScreen.classList.remove("hidden");
    document.body.classList.add("archive-active");
    setArchiveFoldProgress(0);
    primeArchiveVideoAudio();
    renderRing();
    renderProgress();
    showCursorBubble("WE ARE IN!", 2300);
  }, 1150);
}

function rotate(direction) {
  archiveUi.rotate(direction);
}

function setArchiveFoldProgress(value) {
  archiveUi.setArchiveFoldProgress(value);
}

function handleArchiveWheel(event) {
  archiveUi.handleArchiveWheel(event);
}

function renderRing() {
  archiveUi.renderRing();
}

function animatePanels(time = 0) {
  archiveUi.animatePanels(time);
}

function openFile(file) {
  archiveUi.openFile(file);
}

async function renderArchiveLoreSegments() {
  await archiveUi.renderArchiveLoreSegments();
}
async function openMemoryInterface() {
  await archiveUi.openMemoryInterface();
}

function closeCase() {
  archiveUi.closeCase();
}

function renderProgress() {
  archiveUi.renderProgress();
}

function openNextNarrativeFile() {
  narrativeController.openNext();
}

function toggleNarrative() {
  narrativeController.toggle();
}

function stopNarrative() {
  narrativeController.stop();
}

function getStableProfileCharacterImageRect() {
  return profileHotzones.getStableImageRect();
}

function isPointerOnProfileCharacterLabel(event) {
  return profileHotzones.isLabel(event);
}

function isPointerOnProfileCharacterFrame(event) {
  return profileHotzones.isFrame(event);
}

function isPointerOnProfileCharacterArt(event) {
  return profileHotzones.isArt(event);
}

function isPointerOnProfileCharacterHotZone(event) {
  return profileHotzones.isHotZone(event);
}

function resetProfileCharacterMotion() {
  profileHotzones.reset();
}

bindAppEvents({
  activationFlow,
  activationScreen,
  loginForm,
  ambientToggle,
  narrativeButton,
  narrativeGlobal,
  ichiroMemory,
  audioPlaceholder,
  archiveVideo,
  archiveVideoStage,
  archiveScreen,
  ambientMusic,
  folderToggle,
  dossierPanelBrowser,
  loginScreen,
  loginFigure,
  profileHotzones,
  hudTelemetry,
  hudTelemetrySystem,
  hudCompass,
  statRows,
  profileBoxes,
  caseViewer,
  cursorSystem,
  isTouchMode: inputModeSystem.isTouchMode,
  archiveUi,
  updatePampCursor,
  updateCursorBubblePosition,
  isPointerInArchiveSwordZone,
  showContextualBubble,
  primeActivationCodecAudio,
  enableDeviceCompass,
  playUiClick,
  authenticate,
  primeArchiveVideoAudioFromGesture,
  resumeAudioContextFromGesture: () => audioSystem.resumeAudioContextFromGesture(),
  resumeAmbientMusic,
  toggleAmbientMusic,
  toggleNarrative,
  openMemoryInterface,
  tone,
  handleMediaPlay,
  handleMediaStop,
  stopArchiveVideoExternalAudio,
  toggleArchiveVideoPlayback,
  pauseAmbientForMedia,
  forceArchiveVideoAudible,
  sustainArchiveVideoAudio,
  playArchiveVideoWithAudio,
  updateAmbientToggle,
  primeAmbientMusic,
  wantsAmbientMusic,
  handleActivationWheel,
  handleArchiveWheel,
  rotate,
  launchHackProgram,
  finishIntro,
  closeCase,
  resizeCanvases,
  setPageVisible: (value) => {
    pageVisible = value;
  },
  startCanvasLoop,
});

document.body.classList.toggle("low-power", getMotionQuality() !== "high");
resizeCanvases();
renderRing();
renderProgress();
prepareAmbientMusic();
startKpcoTerminalLogo();
startHudTelemetry();
loadUiClickBuffer().catch(() => {
  // Button click sound will retry on the first real click.
});
window.setTimeout(() => {
  if (document.body.classList.contains("prelaunch")) {
    showCursorBubble("Hi! I'm PAMP.\nAre you in to hack Nemeth Corp.? Hehe!", 3600);
  }
}, 720);
startCanvasLoop();
const lumenStatsController = initLumen3D();
runtimeLifecycle.register("lumen-stats", lumenStatsController, { phases: ["character-profile"] });
startCinemaGrade();

// Story choices identify archive leads; only verified evidence protocols own access.
function recordArchiveLeadsFromStory(ids = []) {
  const fresh = archiveProgression.recordStoryLeads(ids);
  if (fresh.length) {
    renderRing();
    setParticlePulse(1.6);
  }
  return fresh;
}

createStoryMode({
  audioSystem,
  recordArchiveLeads: recordArchiveLeadsFromStory,
  showCursorBubble,
});
const portalEnergyDirector = createPortalEnergyDirector();
portalEnergyDirector.bind();
initPortalGpu();
const quantumVortexDirector = createQuantumVortexDirector();
quantumVortexDirector.bind();

// === CINEMA SOUND DIRECTOR v207 ===
// Traduce el progreso de transiciÃ³n existente a intensidad del drone sintetizado y
// dispara whooshes solo al cruzar umbrales de fase. Reutiliza el evento ya despachado;
// no aÃ±ade loops ni trabajo por frame fuera de la propia transiciÃ³n.
(function initCinemaSoundDirector() {
  let lastFold = 0;
  let lastVideo = 0;
  let lastMap = 0;
  const crossed = (prev, next, threshold) =>
    (prev < threshold && next >= threshold) || (prev >= threshold && next < threshold);
  document.addEventListener("kpr-archive-fold-progress", (event) => {
    const detail = event?.detail || {};
    const fold = Number(detail.fold || 0);
    const video = Number(detail.video || 0);
    const map = Number(detail.map || 0);
    audioSystem.setCinemaBedIntensity(Math.max(fold * 0.55, video * 0.85, map * 0.7));
    if (crossed(lastFold, fold, 0.12)) {
      audioSystem.playCinemaWhoosh(0.9);
    }
    if (crossed(lastVideo, video, 0.08)) {
      audioSystem.playCinemaWhoosh(1.15);
    }
    if (crossed(lastMap, map, 0.1)) {
      audioSystem.playCinemaWhoosh(0.75);
    }
    lastFold = fold;
    lastVideo = video;
    lastMap = map;
  });
})();

// === IMAGE HOVER DISPLACEMENT / PARALLAX ===
(function initImageHoverParallax() {
  let activeParallaxContainer = null;
  let activeParallaxTargets = [];

  function applyParallax(e, container, target, maxMove, scaleVal) {
    if (activeParallaxContainer && activeParallaxContainer !== container) {
      resetActiveParallax();
    }
    
    activeParallaxContainer = container;
    if (!activeParallaxTargets.includes(target)) {
      activeParallaxTargets.push(target);
      target.style.transition = "transform 100ms ease-out";
    }
    
    const rect = container.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    
    const pctX = (relX / rect.width) * 2 - 1;
    const pctY = (relY / rect.height) * 2 - 1;
    
    const moveX = pctX * maxMove;
    const moveY = pctY * maxMove;
    
    target.style.transform = `translate3d(${moveX.toFixed(1)}px, ${moveY.toFixed(1)}px, 0) scale(${scaleVal})`;
  }

  function applyLore3DParallax(e, container, target) {
    if (activeParallaxContainer && activeParallaxContainer !== container) {
      resetActiveParallax();
    }
    
    activeParallaxContainer = container;
    if (!activeParallaxTargets.includes(target)) {
      activeParallaxTargets.push(target);
      target.style.transition = "transform 100ms ease-out";
    }
    
    const rect = container.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    
    const pctX = (relX / rect.width) * 2 - 1;
    const pctY = (relY / rect.height) * 2 - 1;
    
    const moveX = -pctX * 16;
    const moveY = -pctY * 16;
    
    const rx = pctY * 14;
    const ry = -pctX * 14;
    
    target.style.transform = `scale(1.15) translate3d(${moveX.toFixed(1)}px, ${moveY.toFixed(1)}px, 0) rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg)`;
  }

  function resetActiveParallax() {
    if (activeParallaxTargets.length) {
      activeParallaxTargets.forEach(target => {
        target.style.transition = "transform 400ms ease-out";
        target.style.transform = "translate3d(0, 0, 0) scale(1)";
      });
      activeParallaxTargets = [];
    }
    activeParallaxContainer = null;
  }

  document.addEventListener("pointermove", (e) => {
    const card = e.target.closest(".panel-card");
    if (card) {
      const thumb = card.querySelector(".panel-card__thumb");
      if (thumb) {
        applyParallax(e, card, thumb, 8, 1.05);
        return;
      }
    }

    const videoBack = e.target.closest(".archive-video-back");
    if (videoBack) {
      const img = videoBack.querySelector("img");
      if (img) {
        applyParallax(e, videoBack, img, 10, 1.05);
        return;
      }
    }

    const loreMedia = e.target.closest(".archive-lore-media-slot");
    if (loreMedia) {
      const img = loreMedia.querySelector("img");
      if (img) {
        applyLore3DParallax(e, loreMedia, img);
        return;
      }
    }

    const existAudio = e.target.closest(".exist-audio-container");
    if (existAudio) {
      const canvas = existAudio.querySelector("canvas");
      if (canvas) {
        applyParallax(e, existAudio, canvas, 6, 1.02);
        return;
      }
    }

    const tabContent = e.target.closest(".lore-tab-content");
    if (tabContent) {
      const img = e.target.closest("img");
      if (img && tabContent.contains(img)) {
        applyLore3DParallax(e, img, img);
        return;
      }
    }
  });

  document.addEventListener("pointerleave", resetActiveParallax, true);
  document.addEventListener("pointerout", (e) => {
    if (activeParallaxContainer && !activeParallaxContainer.contains(e.relatedTarget)) {
      resetActiveParallax();
    }
  });
})();

/* === NEW EDEN MAP: 3D parallax tilt === */
(function initEdenMap() {
  const mapPanel = document.getElementById("eden-map-panel");
  if (!mapPanel) return;

  // 3D parallax tilt on pointer movement
  const mapImg = mapPanel.querySelector(".eden-map-img");
  mapPanel.addEventListener("pointermove", (e) => {
    const rect = mapPanel.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rx = (y - 0.5) * -12; // Tilt vertical: Â±6 degrees
    const ry = (x - 0.5) * 12;  // Tilt horizontal: Â±6 degrees
    mapPanel.style.setProperty("--eden-rx", `${rx.toFixed(2)}deg`);
    mapPanel.style.setProperty("--eden-ry", `${ry.toFixed(2)}deg`);

    // Subtle inner image parallax shift
    if (mapImg) {
      const shiftX = (x - 0.5) * -8;
      const shiftY = (y - 0.5) * -8;
      mapImg.style.transform = `translate(${shiftX.toFixed(1)}px, ${shiftY.toFixed(1)}px) scale(1.04)`;
    }
  });

  mapPanel.addEventListener("pointerleave", () => {
    mapPanel.style.setProperty("--eden-rx", "0deg");
    mapPanel.style.setProperty("--eden-ry", "0deg");
    if (mapImg) {
      mapImg.style.transform = "";
    }
  });
})();

/* === VIDEO & LORE 3D TILT ON HOVER === */
(function initVideoLoreTilt() {
  const videoFrame = document.querySelector(".archive-video-frame");
  if (videoFrame) {
    videoFrame.addEventListener("pointermove", (e) => {
      const rect = videoFrame.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rx = (y - 0.5) * -10; // Tilt vertical: Â±5 degrees
      const ry = (x - 0.5) * 10;  // Tilt horizontal: Â±5 degrees
      videoFrame.style.setProperty("--video-rx", `${rx.toFixed(2)}deg`);
      videoFrame.style.setProperty("--video-ry", `${ry.toFixed(2)}deg`);
    });
    videoFrame.addEventListener("pointerleave", () => {
      videoFrame.style.setProperty("--video-rx", "0deg");
      videoFrame.style.setProperty("--video-ry", "0deg");
    });
  }

  const loreTabs = document.getElementById("archive-video-lore-tabs");
  if (loreTabs) {
    loreTabs.addEventListener("pointermove", (e) => {
      const rect = loreTabs.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rx = (y - 0.5) * -10; // Tilt vertical: Â±5 degrees
      const ry = (x - 0.5) * 10;  // Tilt horizontal: Â±5 degrees
      loreTabs.style.setProperty("--lore-rx", `${rx.toFixed(2)}deg`);
      loreTabs.style.setProperty("--lore-ry", `${ry.toFixed(2)}deg`);
    });
    loreTabs.addEventListener("pointerleave", () => {
      loreTabs.style.setProperty("--lore-rx", "0deg");
      loreTabs.style.setProperty("--lore-ry", "0deg");
    });
  }
})();

/* === v.NEXT SECRET PROTOCOL (Konami + "ichiro" keyword) === */
initSecretProtocol(showCursorBubble);

/* === v.NEXT VISIT COUNTER === */
initVisitCounter();
