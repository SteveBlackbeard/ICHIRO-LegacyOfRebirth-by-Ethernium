export function createAudioSystem({
  ambientMusic,
  uiClickSound,
  activationCodecSound,
  hackSimSound,
  jokerHoverSound,
  archiveVideo,
  archiveScreen,
  ambientToggle,
  showCursorBubble,
}) {
  let audioCtx = null;
  let audioCompressor = null;

  function getAudioDestination(ctx) {
    if (!audioCompressor) {
      audioCompressor = ctx.createDynamicsCompressor();
      audioCompressor.threshold.setValueAtTime(-12, ctx.currentTime);
      audioCompressor.knee.setValueAtTime(30, ctx.currentTime);
      audioCompressor.ratio.setValueAtTime(4, ctx.currentTime);
      audioCompressor.attack.setValueAtTime(0.003, ctx.currentTime);
      audioCompressor.release.setValueAtTime(0.08, ctx.currentTime);
      audioCompressor.connect(ctx.destination);
    }
    return audioCompressor;
  }

  let ambientMusicWanted = false;
  let ambientMusicPrimed = false;
  let ambientMusicPrepared = false;
  let ambientMutedByUser = false;
  let mediaPlaybackCount = 0;
  let archiveVideoMediaHeld = false;
  let ambientBuffer = null;
  let ambientSource = null;
  let ambientGain = null;
  let ambientLoadPromise = null;
  let uiClickBuffer = null;
  let uiClickLoadPromise = null;
  let activationCodecBuffer = null;
  let activationCodecLoadPromise = null;
  let uiClickPoolIndex = 0;
  let activationCodecHtmlUnlocked = false;
  let activationCodecLastPlayed = 0;
  let activationCodecPending = false;
  let jokerHoverLastPlayed = 0;
  let archiveVideoAudioPrimed = false;
  let archiveVideoSilentPriming = false;
  let archiveVideoAudibleUntil = 0;
  let archiveVideoAudibleLoopActive = false;
  let archiveVideoAudioBuffer = null;
  let archiveVideoAudioLoadPromise = null;
  let archiveVideoAudioSource = null;
  let archiveVideoAudioGain = null;

  const uiClickPool = uiClickSound
    ? Array.from({ length: 5 }, () => {
        const sound = new Audio(uiClickSound.src);
        sound.preload = "auto";
        sound.volume = 0.9;
        sound.load();
        return sound;
      })
    : [];
  const activationCodecPool = activationCodecSound
    ? Array.from({ length: 3 }, () => {
        const sound = new Audio(activationCodecSound.src);
        sound.preload = "auto";
        sound.volume = 0.86;
        sound.load();
        return sound;
      })
    : [];
  let activationCodecPoolIndex = 0;
  const ACTIVATION_CODEC_COOLDOWN = 900;
  const ACTUAL_ACTIVATION_CODEC_COOLDOWN = 5000;
  const hackSimPool = hackSimSound
    ? Array.from({ length: 2 }, () => {
        const sound = new Audio(hackSimSound.src);
        sound.preload = "auto";
        sound.volume = 0.78;
        sound.load();
        return sound;
      })
    : [];
  let hackSimPoolIndex = 0;
  const jokerHoverPool = jokerHoverSound
    ? Array.from({ length: 2 }, () => {
        const sound = new Audio(jokerHoverSound.src);
        sound.preload = "auto";
        sound.volume = 0.86;
        sound.load();
        return sound;
      })
    : [];
  let jokerHoverPoolIndex = 0;

  function playPooledSound(pool, getIndex, setIndex, volume = 0.8, startAt = 0) {
    if (!pool.length) {
      return Promise.resolve(false);
    }

    const index = getIndex();
    const sound = pool[index] || pool[0];
    setIndex((index + 1) % pool.length);
    try {
      sound.pause();
      sound.currentTime = startAt;
      sound.volume = volume;
      return sound.play().then(() => true).catch(() => false);
    } catch {
      return Promise.resolve(false);
    }
  }

  function playActivationCodec() {
    if (!activationCodecPool.length) {
      return;
    }

    const now = performance.now();
    if (now - activationCodecLastPlayed < ACTUAL_ACTIVATION_CODEC_COOLDOWN) {
      return;
    }

    const fallbackPool = () => {
      void playPooledSound(activationCodecPool, () => activationCodecPoolIndex, (value) => {
        activationCodecPoolIndex = value;
      }, 0.96).then((played) => {
        if (played) {
          activationCodecLastPlayed = performance.now();
          activationCodecPending = false;
        } else {
          activationCodecPending = true;
        }
      });
    };

    if (activationCodecSound) {
      try {
        activationCodecSound.pause();
        activationCodecSound.muted = false;
        activationCodecSound.volume = 0.96;
        activationCodecSound.currentTime = 0;
        const playPromise = activationCodecSound.play?.();
        if (playPromise?.then) {
          playPromise
            .then(() => {
              activationCodecLastPlayed = performance.now();
              activationCodecPending = false;
            })
            .catch(() => {
              fallbackPool();
            });
          return;
        }
      } catch {
        // Fall back to the pooled audio path below.
      }
    }

    fallbackPool();

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx || !activationCodecSound) {
      return;
    }

    audioCtx ||= new Ctx();

    const playBuffer = (buffer) => {
      const source = audioCtx.createBufferSource();
      const gain = audioCtx.createGain();
      source.buffer = buffer;
      gain.gain.value = 0.96;
      source.connect(gain);
      gain.connect(getAudioDestination(audioCtx));
      source.start(0);
      activationCodecLastPlayed = performance.now();
      activationCodecPending = false;
      return true;
    };

    if (activationCodecBuffer && audioCtx.state === "running") {
      playBuffer(activationCodecBuffer);
      return;
    }

    activationCodecLoadPromise ||= fetch(activationCodecSound.src)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => audioCtx.decodeAudioData(arrayBuffer))
      .then((buffer) => {
        activationCodecBuffer = buffer;
        return buffer;
      });

    activationCodecLoadPromise
      .then((buffer) => {
        if (audioCtx.state === "suspended") {
          return audioCtx.resume().then(() => buffer);
        }
        return buffer;
      })
      .then((buffer) => {
        const playedRecently = performance.now() - activationCodecLastPlayed < ACTUAL_ACTIVATION_CODEC_COOLDOWN;
        if (playedRecently && !activationCodecPending) {
          return;
        }
        playBuffer(buffer);
      })
      .catch(() => {
        activationCodecPending = true;
      });
  }

  function unlockActivationCodecHtmlAudio() {
    if (!activationCodecSound || activationCodecHtmlUnlocked) {
      return;
    }
    try {
      activationCodecSound.pause();
      activationCodecSound.currentTime = 0;
      activationCodecSound.volume = 0;
      activationCodecSound.muted = true;
      const playPromise = activationCodecSound.play?.();
      if (playPromise?.then) {
        playPromise
          .then(() => {
            activationCodecSound.pause();
            activationCodecSound.currentTime = 0;
            activationCodecSound.muted = false;
            activationCodecSound.volume = 0.96;
            activationCodecHtmlUnlocked = true;
          })
          .catch(() => {
            activationCodecSound.muted = false;
            activationCodecSound.volume = 0.96;
          });
      }
    } catch {
      activationCodecSound.muted = false;
      activationCodecSound.volume = 0.96;
    }
  }

  function primeActivationCodecAudio() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx || !activationCodecSound) {
      return;
    }

    audioCtx ||= new Ctx();
    activationCodecLoadPromise ||= fetch(activationCodecSound.src)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => audioCtx.decodeAudioData(arrayBuffer))
      .then((buffer) => {
        activationCodecBuffer = buffer;
        return buffer;
      });

    const resumePromise = audioCtx.state === "suspended"
      ? audioCtx.resume().catch(() => null)
      : Promise.resolve();

    resumePromise
      .then(() => activationCodecLoadPromise)
      .then((buffer) => {
        if (!activationCodecPending || audioCtx.state !== "running") {
          return;
        }
        const now = performance.now();
        if (now - activationCodecLastPlayed < ACTUAL_ACTIVATION_CODEC_COOLDOWN) {
          activationCodecPending = false;
          return;
        }
        const source = audioCtx.createBufferSource();
        const gain = audioCtx.createGain();
        source.buffer = buffer;
        gain.gain.value = 0.96;
        source.connect(gain);
        gain.connect(getAudioDestination(audioCtx));
        source.start(0);
        activationCodecLastPlayed = performance.now();
        activationCodecPending = false;
      })
      .catch(() => {});
  }

  function playHackSimulationCue() {
    playPooledSound(hackSimPool, () => hackSimPoolIndex, (value) => {
      hackSimPoolIndex = value;
    }, 0.78, 1.5);
  }

  function playJokerHoverCue(event) {
    const now = performance.now();
    if (now - jokerHoverLastPlayed < 10000) {
      return;
    }
    jokerHoverLastPlayed = now;
    showCursorBubble("Oooh! Looking cool, joker!", 2300, event);
    playPooledSound(jokerHoverPool, () => jokerHoverPoolIndex, (value) => {
      jokerHoverPoolIndex = value;
    }, 0.86).then((played) => {
      if (!played) {
        jokerHoverLastPlayed = 0;
      }
    });
  }

  function prepareAmbientMusic() {
    if (!ambientMusic || ambientMusicPrepared || ambientMusicWanted) {
      return;
    }

    loadAmbientBuffer();
    ambientMusic.volume = 0.6;
    ambientMusic.muted = true;
    ambientMusic.play()
      .then(() => {
        ambientMusicPrepared = true;
      })
      .catch(() => {
        ambientMusic.muted = false;
      });
  }

  function primeAmbientMusic() {
    if (!ambientMusic || ambientMusicPrimed || ambientMusicWanted || ambientMusicPrepared) {
      return;
    }

    ambientMusic.volume = 0.6;
    loadAmbientBuffer();
    ambientMusic.muted = true;
    ambientMusic.play()
      .then(() => {
        ambientMusic.pause();
        ambientMusic.currentTime = 0;
        ambientMusic.muted = false;
        ambientMusicPrimed = true;
      })
      .catch(() => {
        ambientMusic.muted = false;
      });
  }

  function startAmbientMusic() {
    if (!ambientMusic) {
      return;
    }

    ambientMusicWanted = true;
    ambientMusic.volume = 0.6;
    ambientMusic.currentTime = 0;
    ambientMusic.muted = ambientMutedByUser;
    if (ambientMutedByUser || mediaPlaybackCount > 0) {
      updateAmbientToggle();
      return;
    }

    startAmbientWebAudio(true)
      .then(() => {
        ambientMusic.pause();
        updateAmbientToggle();
      })
      .catch(() => {
        ambientMusic.play().then(updateAmbientToggle).catch(() => {
          updateAmbientToggle();
        });
      });
  }

  function pauseAmbientMusic() {
    stopAmbientWebAudio();
    if (ambientMusic && !ambientMusic.paused) {
      ambientMusic.pause();
    }
    updateAmbientToggle();
  }

  function resumeAmbientMusic() {
    if (!ambientMusic || !ambientMusicWanted || mediaPlaybackCount > 0) {
      return;
    }
    ambientMusic.volume = 0.6;
    ambientMusic.muted = ambientMutedByUser;
    startAmbientWebAudio(false)
      .then(() => {
        ambientMusic.pause();
        updateAmbientToggle();
      })
      .catch(() => {
        ambientMusic.play().then(updateAmbientToggle).catch(updateAmbientToggle);
      });
  }

  function pauseAmbientForMedia() {
    if (!archiveVideoMediaHeld) {
      archiveVideoMediaHeld = true;
      mediaPlaybackCount += 1;
    }
    pauseAmbientMusic();
  }

  function releaseArchiveVideoMediaHold() {
    if (!archiveVideoMediaHeld) {
      return;
    }
    archiveVideoMediaHeld = false;
    mediaPlaybackCount = Math.max(0, mediaPlaybackCount - 1);
    resumeAmbientMusic();
  }

  function updateAmbientToggle() {
    if (!ambientToggle || !ambientMusic) {
      return;
    }
    const soundOn = (!!ambientSource || !ambientMusic.paused) && !ambientMutedByUser && !ambientMusic.muted;
    ambientToggle.classList.toggle("is-on", soundOn);
    ambientToggle.setAttribute("aria-pressed", String(soundOn));
    ambientToggle.setAttribute("aria-label", soundOn ? "Desactivar sonido" : "Activar sonido");
  }

  async function loadAmbientBuffer() {
    if (ambientBuffer) {
      return ambientBuffer;
    }
    if (ambientLoadPromise) {
      return ambientLoadPromise;
    }

    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        throw new Error("Web Audio unavailable");
      }
      audioCtx ||= new Ctx();
      ambientLoadPromise = fetch("assets/audio/under-the-water.mp3")
        .then((response) => response.arrayBuffer())
        .then((arrayBuffer) => audioCtx.decodeAudioData(arrayBuffer))
        .then((buffer) => {
          ambientBuffer = buffer;
          return buffer;
        });
      return ambientLoadPromise;
    } catch (error) {
      ambientLoadPromise = null;
      throw error;
    }
  }

  // Root cause fix (v213): the context is created at page load (suspended). A
  // resume() outside a user gesture can stay pending FOREVER in Chrome, which
  // silently stalled the ambient start chain until a tab focus change resumed it.
  // This resumes the context inside real gestures so decode/start never stall.
  function resumeAudioContextFromGesture() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      return;
    }
    audioCtx ||= new Ctx();
    if (audioCtx.state === "suspended") {
      audioCtx.resume().then(() => {
        if (ambientMusicWanted && !ambientMutedByUser && !ambientSource && mediaPlaybackCount === 0) {
          startAmbientWebAudio(false)
            .then(() => {
              if (ambientMusic && !ambientMusic.paused) {
                ambientMusic.pause();
              }
              updateAmbientToggle();
            })
            .catch(() => {});
        }
      }).catch(() => {});
    }
  }

  async function startAmbientWebAudio(fromStart = false) {
    if (ambientMutedByUser || mediaPlaybackCount > 0) {
      return;
    }

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      throw new Error("Web Audio unavailable");
    }
    audioCtx ||= new Ctx();
    if (audioCtx.state === "suspended") {
      // Never await a possibly-forever-pending resume: race it against a short
      // timeout and fall back to the HTML element path if the context stays blocked.
      await Promise.race([
        audioCtx.resume(),
        new Promise((resolve) => window.setTimeout(resolve, 350)),
      ]);
      if (audioCtx.state !== "running") {
        throw new Error("AudioContext blocked outside user gesture");
      }
    }
    const buffer = await loadAmbientBuffer();

    if (ambientSource) {
      return;
    }

    ambientGain ||= audioCtx.createGain();
    ambientGain.gain.value = 0.6;
    ambientGain.connect(getAudioDestination(audioCtx));

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(ambientGain);
    source.onended = () => {
      if (ambientSource === source) {
        ambientSource = null;
        updateAmbientToggle();
      }
    };
    ambientSource = source;
    source.start(0, fromStart ? 0 : 0);
  }

  function stopAmbientWebAudio() {
    if (!ambientSource) {
      return;
    }
    const source = ambientSource;
    ambientSource = null;
    try {
      source.stop();
    } catch {}
  }

  function toggleAmbientMusic() {
    if (!ambientMusic) {
      return;
    }

    ambientMusicWanted = true;
    ambientMusic.volume = 0.6;

    if (!ambientSource && (ambientMusic.paused || ambientMusic.muted)) {
      ambientMutedByUser = false;
      ambientMusic.muted = false;
      if (!ambientMusic.currentTime || ambientMusic.currentTime < 0.05) {
        ambientMusic.currentTime = 0;
      }
      startAmbientWebAudio(false)
        .then(() => {
          ambientMusic.pause();
          updateAmbientToggle();
        })
        .catch(() => {
          ambientMusic.play().then(updateAmbientToggle).catch(updateAmbientToggle);
        });
      return;
    }

    ambientMutedByUser = true;
    ambientMusic.muted = true;
    ambientMusic.pause();
    stopAmbientWebAudio();
    updateAmbientToggle();
  }

  function isExternalMedia(target) {
    // v213 root-cause fix: muted media must never duck the ambient music. The
    // KPCO logo chroma-key video (muted, looping since the terminal screen) was
    // counted here, holding mediaPlaybackCount above zero permanently — so the
    // music could only start when the browser paused the muted video in a hidden
    // tab, which is exactly the inverted symptom the user reported. The archive
    // video's audible path holds ambient through pauseAmbientForMedia/release
    // explicitly, so excluding muted elements is safe.
    return target instanceof HTMLMediaElement && target !== ambientMusic && !target.muted;
  }

  function handleMediaPlay(event) {
    if (!isExternalMedia(event.target)) {
      return;
    }
    if (event.target.dataset?.priming === "true") {
      return;
    }
    if (event.target === archiveVideo && archiveVideoMediaHeld) {
      pauseAmbientMusic();
      return;
    }
    mediaPlaybackCount += 1;
    pauseAmbientMusic();
    applyCinemaBedGain();
  }

  function handleMediaStop(event) {
    if (!isExternalMedia(event.target)) {
      return;
    }
    if (event.target.dataset?.priming === "true") {
      return;
    }
    if (event.target === archiveVideo && archiveVideoMediaHeld) {
      releaseArchiveVideoMediaHold();
      return;
    }
    mediaPlaybackCount = Math.max(0, mediaPlaybackCount - 1);
    resumeAmbientMusic();
    applyCinemaBedGain();
  }

  async function loadUiClickBuffer() {
    if (uiClickBuffer) {
      return uiClickBuffer;
    }
    if (uiClickLoadPromise) {
      return uiClickLoadPromise;
    }

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      throw new Error("Web Audio unavailable");
    }
    audioCtx ||= new Ctx();
    uiClickLoadPromise = fetch("assets/audio/menu-click.mp3")
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => audioCtx.decodeAudioData(arrayBuffer))
      .then((buffer) => {
        uiClickBuffer = buffer;
        return buffer;
      });
    return uiClickLoadPromise;
  }

  function playUiClick() {
    const fallback = () => {
      try {
        const click = uiClickPool[uiClickPoolIndex] || new Audio("assets/audio/menu-click.mp3");
        uiClickPoolIndex = (uiClickPoolIndex + 1) % Math.max(uiClickPool.length, 1);
        click.volume = 0.9;
        click.currentTime = 0;
        click.play().catch(() => {});
      } catch {}
    };

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      fallback();
      return;
    }

    audioCtx ||= new Ctx();
    const playBuffer = (buffer) => {
      const source = audioCtx.createBufferSource();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.9;
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(getAudioDestination(audioCtx));
      source.start(0);
      return Promise.resolve();
    };

    if (uiClickBuffer && audioCtx.state === "running") {
      playBuffer(uiClickBuffer).catch(fallback);
      return;
    }

    fallback();
    loadUiClickBuffer()
      .then((buffer) => {
        if (audioCtx.state === "suspended") {
          return audioCtx.resume().then(() => buffer);
        }
        return buffer;
      })
      .catch(() => null);
  }

  function prepareArchiveVideoAudio() {
    if (!archiveVideo) {
      return;
    }
    archiveVideo.removeAttribute("muted");
    archiveVideo.defaultMuted = false;
    archiveVideo.muted = false;
    archiveVideo.volume = 1;
    archiveVideo.preload = "auto";
  }

  function forceArchiveVideoAudible() {
    if (!archiveVideo) {
      return;
    }
    archiveVideo.removeAttribute("muted");
    archiveVideo.defaultMuted = false;
    if (archiveVideo.muted) {
      archiveVideo.muted = false;
    }
    if (archiveVideo.volume < 0.98) {
      archiveVideo.volume = 1;
    }
  }

  function sustainArchiveVideoAudio(duration = 2200) {
    if (!archiveVideo) {
      return;
    }
    archiveVideoAudibleUntil = Math.max(archiveVideoAudibleUntil, performance.now() + duration);
    if (archiveVideoAudibleLoopActive) {
      return;
    }
    archiveVideoAudibleLoopActive = true;
    const tick = () => {
      if (!archiveVideo || performance.now() > archiveVideoAudibleUntil || archiveVideo.dataset.forceAudio !== "true") {
        archiveVideoAudibleLoopActive = false;
        return;
      }
      forceArchiveVideoAudible();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  async function loadArchiveVideoAudioBuffer() {
    if (!archiveVideo) {
      throw new Error("Archive video unavailable");
    }
    if (archiveVideoAudioBuffer) {
      return archiveVideoAudioBuffer;
    }
    if (archiveVideoAudioLoadPromise) {
      return archiveVideoAudioLoadPromise;
    }

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      throw new Error("Web Audio unavailable");
    }
    audioCtx ||= new Ctx();
    const sourceUrl = archiveVideo.currentSrc || archiveVideo.src;
    archiveVideoAudioLoadPromise = fetch(sourceUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Archive video audio fetch failed: ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => audioCtx.decodeAudioData(arrayBuffer))
      .then((buffer) => {
        archiveVideoAudioBuffer = buffer;
        return buffer;
      })
      .catch((error) => {
        archiveVideoAudioLoadPromise = null;
        throw error;
      });
    return archiveVideoAudioLoadPromise;
  }

  function preloadArchiveVideoExternalAudio() {
    loadArchiveVideoAudioBuffer().catch(() => {});
  }

  function stopArchiveVideoExternalAudio() {
    if (!archiveVideoAudioSource) {
      return;
    }
    const source = archiveVideoAudioSource;
    archiveVideoAudioSource = null;
    try {
      source.stop();
    } catch {}
  }

  async function startArchiveVideoExternalAudio(offset = 0) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      throw new Error("Web Audio unavailable");
    }
    audioCtx ||= new Ctx();
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }
    const buffer = await loadArchiveVideoAudioBuffer();

    stopArchiveVideoExternalAudio();
    if (!archiveVideoAudioGain) {
      archiveVideoAudioGain = audioCtx.createGain();
      archiveVideoAudioGain.connect(getAudioDestination(audioCtx));
    }
    archiveVideoAudioGain.gain.value = 1;

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(archiveVideoAudioGain);
    source.onended = () => {
      if (archiveVideoAudioSource === source) {
        archiveVideoAudioSource = null;
      }
    };
    archiveVideoAudioSource = source;
    const safeOffset = Math.min(Math.max(0, offset), Math.max(0, buffer.duration - 0.05));
    source.start(0, safeOffset);
    pauseAmbientForMedia();
  }

  function primeArchiveVideoAudio() {
    if (!archiveVideo || archiveVideoAudioPrimed) {
      return;
    }

    preloadArchiveVideoExternalAudio();
    archiveVideo.dataset.priming = "true";
    archiveVideo.muted = true;
    archiveVideo.defaultMuted = true;
    archiveVideo.volume = 0;
    archiveVideo.playbackRate = 0.08;
    archiveVideo.preload = "auto";
    archiveVideo.currentTime = 0;
    archiveVideo.play?.()
      .then(() => {
        archiveVideoAudioPrimed = true;
        archiveVideoSilentPriming = true;
      })
      .catch(() => {
        archiveVideo.muted = false;
        archiveVideo.defaultMuted = false;
        archiveVideo.volume = 1;
        archiveVideoSilentPriming = false;
        delete archiveVideo.dataset.priming;
      });
  }

  function primeArchiveVideoAudioFromGesture() {
    preloadArchiveVideoExternalAudio();
    if (!archiveVideoAudioPrimed) {
      primeArchiveVideoAudio();
      return;
    }
    archiveVideoSilentPriming = false;
  }

  function playArchiveVideoWithAudio() {
    if (!archiveVideo) {
      return;
    }
    pauseAmbientForMedia();
    archiveScreen.classList.remove("archive-video-audio-blocked");
    delete archiveVideo.dataset.priming;
    archiveVideo.dataset.externalAudio = "true";
    archiveVideo.dataset.userRequestedAudio = "true";
    delete archiveVideo.dataset.forceAudio;
    const wasSilentlyPrimed = archiveVideoSilentPriming;
    archiveVideoSilentPriming = false;
    archiveVideoAudioPrimed = false;
    archiveVideo.playbackRate = 1;
    archiveVideo.muted = true;
    archiveVideo.defaultMuted = true;
    archiveVideo.volume = 0;
    if (wasSilentlyPrimed && !archiveVideo.paused) {
      startArchiveVideoExternalAudio(archiveVideo.currentTime || 0)
        .then(() => {
          archiveScreen.classList.remove("archive-video-audio-blocked");
        })
        .catch(() => {
          archiveScreen.classList.add("archive-video-audio-blocked");
        });
      return;
    }
    try {
      archiveVideo.pause?.();
      archiveVideo.currentTime = 0;
    } catch {}
    archiveVideo.play?.()
      .then(() => startArchiveVideoExternalAudio(0))
      .then(() => {
        archiveScreen.classList.remove("archive-video-audio-blocked");
      })
      .catch(() => {
        archiveScreen.classList.add("archive-video-audio-blocked");
      });
  }

  function pauseArchiveVideoPlayback() {
    if (!archiveVideo) {
      return;
    }
    stopArchiveVideoExternalAudio();
    archiveVideo.pause?.();
    releaseArchiveVideoMediaHold();
  }

  function resumeArchiveVideoPlayback() {
    if (!archiveVideo) {
      return;
    }
    archiveScreen.classList.remove("archive-video-audio-blocked");
    archiveVideo.dataset.externalAudio = "true";
    archiveVideo.dataset.userRequestedAudio = "true";
    delete archiveVideo.dataset.forceAudio;
    archiveVideo.muted = true;
    archiveVideo.defaultMuted = true;
    archiveVideo.volume = 0;
    archiveVideo.playbackRate = 1;
    archiveVideo.play?.()
      .then(() => startArchiveVideoExternalAudio(archiveVideo.currentTime || 0))
      .then(() => {
        archiveScreen.classList.remove("archive-video-audio-blocked");
      })
      .catch(() => {
        archiveScreen.classList.add("archive-video-audio-blocked");
      });
  }

  function toggleArchiveVideoPlayback() {
    if (!archiveVideo || !archiveScreen.classList.contains("archive-video-active")) {
      return;
    }
    if (archiveVideo.paused || archiveVideo.ended) {
      if (archiveVideo.ended) {
        archiveVideo.currentTime = 0;
      }
      resumeArchiveVideoPlayback();
    } else {
      pauseArchiveVideoPlayback();
    }
  }

  // === CINEMA SOUND BED v207: drone reactivo + whoosh sintetizados ===
  // Cero assets nuevos: dos osciladores + ruido rosa procedural de un polo, ruteados por el
  // compresor de dinámica existente. El easing lo hace el audio thread (setTargetAtTime),
  // sin RAF ni trabajo en el main thread. El bed solo existe tras el arming de audio.
  let cinemaBedGain = null;
  let cinemaBedFilter = null;
  let cinemaBedSubGain = null;
  let cinemaNoiseBuffer = null;
  let cinemaBedIntensity = 0;
  let cinemaLastWhooshAt = 0;

  function getCinemaNoiseBuffer(ctx) {
    if (!cinemaNoiseBuffer) {
      const length = Math.floor(ctx.sampleRate * 1.2);
      cinemaNoiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = cinemaNoiseBuffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.045 * white) / 1.045;
        data[i] = lastOut * 3.2;
      }
    }
    return cinemaNoiseBuffer;
  }

  function ensureCinemaBed() {
    if (!audioCtx || audioCtx.state !== "running") {
      return false;
    }
    if (cinemaBedGain) {
      return true;
    }
    cinemaBedGain = audioCtx.createGain();
    cinemaBedGain.gain.value = 0;
    cinemaBedFilter = audioCtx.createBiquadFilter();
    cinemaBedFilter.type = "lowpass";
    cinemaBedFilter.frequency.value = 140;
    cinemaBedFilter.Q.value = 0.7;
    const oscA = audioCtx.createOscillator();
    oscA.type = "sine";
    oscA.frequency.value = 54;
    const oscB = audioCtx.createOscillator();
    oscB.type = "sine";
    oscB.frequency.value = 81.4;
    cinemaBedSubGain = audioCtx.createGain();
    cinemaBedSubGain.gain.value = 0.34;
    oscA.connect(cinemaBedFilter);
    oscB.connect(cinemaBedSubGain);
    cinemaBedSubGain.connect(cinemaBedFilter);
    cinemaBedFilter.connect(cinemaBedGain);
    cinemaBedGain.connect(getAudioDestination(audioCtx));
    oscA.start();
    oscB.start();
    return true;
  }

  function applyCinemaBedGain() {
    if (!cinemaBedGain) {
      return;
    }
    const ducked = mediaPlaybackCount > 0 || archiveVideoMediaHeld
      ? cinemaBedIntensity * 0.35
      : cinemaBedIntensity;
    const t = audioCtx.currentTime;
    cinemaBedGain.gain.setTargetAtTime(ducked * 0.085, t, 0.35);
    cinemaBedFilter.frequency.setTargetAtTime(140 + ducked * 320, t, 0.5);
  }

  function setCinemaBedIntensity(value) {
    cinemaBedIntensity = Math.max(0, Math.min(1, Number(value) || 0));
    if (!ensureCinemaBed()) {
      return;
    }
    applyCinemaBedGain();
  }

  function playCinemaWhoosh(strength = 1) {
    if (!audioCtx || audioCtx.state !== "running") {
      return;
    }
    const now = performance.now();
    if (now - cinemaLastWhooshAt < 380) {
      return;
    }
    cinemaLastWhooshAt = now;
    const s = Math.max(0.4, Math.min(1.4, Number(strength) || 1));
    const t = audioCtx.currentTime;
    const source = audioCtx.createBufferSource();
    source.buffer = getCinemaNoiseBuffer(audioCtx);
    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.1;
    filter.frequency.setValueAtTime(240, t);
    filter.frequency.exponentialRampToValueAtTime(1500 * s, t + 0.42);
    filter.frequency.exponentialRampToValueAtTime(320, t + 0.85);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.09 * s, t + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
    // A short pressure wave gives the transition mass without requiring a
    // large authored sample. It stays inside the existing dynamics chain.
    const sub = audioCtx.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(68 + s * 9, t);
    sub.frequency.exponentialRampToValueAtTime(34, t + 0.72);
    const subGain = audioCtx.createGain();
    subGain.gain.setValueAtTime(0.0001, t);
    subGain.gain.exponentialRampToValueAtTime(0.022 * s, t + 0.07);
    subGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.74);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(getAudioDestination(audioCtx));
    sub.connect(subGain);
    subGain.connect(getAudioDestination(audioCtx));
    source.onended = () => {
      try {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
        sub.disconnect();
        subGain.disconnect();
      } catch {}
    };
    source.start(t);
    sub.start(t);
    sub.stop(t + 0.76);
    source.stop(t + 0.9);
  }

  function tone() {
    // Replaced by authored UI audio assets.
  }

  // Fix: el AudioContext queda suspended en Chrome/Edge cuando la tab pierde el foco.
  // Al recuperar visibilidad, intentamos reanudar el contexto y la música ambient.
  function handleVisibilityResume() {
    if (document.visibilityState !== "visible") return;
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") {
      audioCtx.resume().then(() => {
        // Si la música era deseada pero no estaba sonando, intentar reanudarla
        if (ambientMusicWanted && !ambientMutedByUser && !ambientSource && mediaPlaybackCount === 0) {
          startAmbientWebAudio(false)
            .then(() => { updateAmbientToggle(); })
            .catch(() => {});
        }
      }).catch(() => {});
    } else if (audioCtx.state === "running") {
      if (ambientMusicWanted && !ambientMutedByUser && !ambientSource && mediaPlaybackCount === 0) {
        startAmbientWebAudio(false)
          .then(() => { updateAmbientToggle(); })
          .catch(() => {});
      }
    }
  }

  document.addEventListener("visibilitychange", handleVisibilityResume);
  window.addEventListener("focus", handleVisibilityResume);

  function getArchiveVideoSilentPriming() {
    return archiveVideoSilentPriming;
  }

  function wantsAmbientMusic() {
    return ambientMusicWanted;
  }

  return {
    forceArchiveVideoAudible,
    getArchiveVideoSilentPriming,
    handleMediaPlay,
    handleMediaStop,
    loadUiClickBuffer,
    pauseAmbientForMedia,
    pauseAmbientMusic,
    pauseArchiveVideoPlayback,
    playActivationCodec,
    playArchiveVideoWithAudio,
    playCinemaWhoosh,
    playHackSimulationCue,
    playJokerHoverCue,
    playUiClick,
    setCinemaBedIntensity,
    prepareAmbientMusic,
    prepareArchiveVideoAudio,
    primeActivationCodecAudio,
    primeAmbientMusic,
    primeArchiveVideoAudio,
    primeArchiveVideoAudioFromGesture,
    releaseArchiveVideoMediaHold,
    resumeAudioContextFromGesture,
    resumeAmbientMusic,
    resumeArchiveVideoPlayback,
    startAmbientMusic,
    stopArchiveVideoExternalAudio,
    sustainArchiveVideoAudio,
    toggleAmbientMusic,
    toggleArchiveVideoPlayback,
    tone,
    unlockActivationCodecHtmlAudio,
    updateAmbientToggle,
    wantsAmbientMusic,
  };
}
