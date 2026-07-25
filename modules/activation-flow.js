export function createActivationFlow({
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
}) {
  let introClickPrimed = false;
  let activationLogoProgress = 0;
  let activationArmed = false;
  let glitchTimer = null;
  let hackIntroTimer = null;
  let ambientStartTimer = null;

  function triggerGlitch(duration = 820) {
    if (!glitchBurst) {
      return;
    }

    window.clearTimeout(glitchTimer);
    document.body.classList.remove("is-glitching");
    glitchBurst.classList.remove("is-active");
    glitchBurst.replaceChildren();
    const lineCount = 9 + Math.floor(Math.random() * 8);
    for (let index = 0; index < lineCount; index += 1) {
      const line = document.createElement("span");
      line.style.setProperty("--x", `${Math.random() * 92}%`);
      line.style.setProperty("--y", `${8 + Math.random() * 84}%`);
      line.style.setProperty("--w", `${34 + Math.random() * 210}px`);
      line.style.setProperty("--h", `${1 + Math.random() * 2.2}px`);
      line.style.setProperty("--delay", `${Math.random() * 150}ms`);
      line.style.setProperty("--shift", `${(Math.random() - 0.5) * 24}px`);
      line.style.setProperty("--glitch-color", Math.random() > 0.58 ? "rgba(184, 242, 161, 0.68)" : "rgba(255, 255, 255, 0.52)");
      glitchBurst.append(line);
    }
    void glitchBurst.offsetWidth;
    document.body.classList.add("is-glitching");
    glitchBurst.classList.add("is-active");
    glitchTimer = window.setTimeout(() => {
      glitchBurst.classList.remove("is-active");
      document.body.classList.remove("is-glitching");
      glitchBurst.replaceChildren();
    }, duration);
  }

  function setActivationLogoProgress(value) {
    activationLogoProgress = Math.min(1, Math.max(0, value));
    window.__kprActivationLogoProgress = activationLogoProgress;
    document.body.classList.toggle("activation-backside", activationLogoProgress > 0.82);
    window.kprActivationLogo?.setProgress(activationLogoProgress);
    document.dispatchEvent(new CustomEvent("kpr-activation-logo-progress", {
      detail: activationLogoProgress,
    }));
  }

  function getChosenOnes() {
    try {
      return JSON.parse(localStorage.getItem("kprChosenOnes") || "[]");
    } catch {
      return [];
    }
  }

  function saveChosenOne(name) {
    const normalized = name.trim().replace(/\s+/g, " ").slice(0, 32);
    if (!normalized) {
      return;
    }

    const chosen = getChosenOnes();
    if (!chosen.some((entry) => entry.toLowerCase() === normalized.toLowerCase())) {
      chosen.push(normalized);
      localStorage.setItem("kprChosenOnes", JSON.stringify(chosen));
    }

    const markdown = `# THE CHOSEN ONES\n\n${chosen.map((entry) => `- ${entry}`).join("\n")}\n`;
    localStorage.setItem("kprChosenOnesMarkdown", markdown);
  }

  function submitChosenOne() {
    saveChosenOne(chosenInput?.value || "");
    if (chosenInput) {
      chosenInput.value = "";
      window.kprActivationLogo?.setChosenText?.("");
      chosenInput.blur();
    }
    tone("unlock");
  }

  let wheelDecayTimer = null;
  let wheelDecayInterval = null;

  function handleActivationWheel(event) {
    if (!document.body.classList.contains("prelaunch")) {
      return;
    }
    if (event.kprActivationWheelHandled) {
      return;
    }
    event.kprActivationWheelHandled = true;

    event.preventDefault();
    if (!activationArmed) {
      activationArmed = true;
      activationButton?.classList.add("is-armed");
      const activationText = activationButton?.querySelector(".activation-text");
      if (activationText) {
        activationText.textContent = "INITIALIZE HACK";
      }
      primeActivationCodecAudio();
    }

    const direction = event.deltaY > 0 ? 1 : -1;
    const amount = Math.min(0.24, Math.abs(event.deltaY) / 750);
    const previousProgress = activationLogoProgress;
    const nextProgress = Math.min(1, Math.max(0, activationLogoProgress + direction * Math.max(0.045, amount)));
    
    window.clearInterval(wheelDecayInterval);
    setActivationLogoProgress(nextProgress);

    if (Math.abs(nextProgress - previousProgress) > 0.01) {
      primeActivationCodecAudio();
      playActivationCodec();
    }

    // 10-second idle auto-return timer: if left turned on the backside, after 10s of no scroll interaction, it automatically flips back to 0
    window.clearTimeout(wheelDecayTimer);
    const idleDelay = activationLogoProgress > 0.82 ? 10000 : 800;
    wheelDecayTimer = window.setTimeout(() => {
      wheelDecayInterval = window.setInterval(() => {
        if (activationLogoProgress <= 0.008) {
          setActivationLogoProgress(0);
          window.clearInterval(wheelDecayInterval);
        } else {
          setActivationLogoProgress(activationLogoProgress * 0.88);
        }
      }, 16);
    }, idleDelay);
  }

  function launchHackProgram() {
    if (!document.body.classList.contains("prelaunch")) {
      return;
    }

    startKpcoTerminalLogo();
    prepareAmbientMusic();
    document.body.classList.remove("prelaunch");
    window.clearTimeout(hackIntroTimer);
    window.setTimeout(() => triggerGlitch(420), 180);
    hackIntroTimer = window.setTimeout(finishIntro, 3600);
    tone("open");
    window.setTimeout(playHackSimulationCue, 140);
  }

  function finishIntro() {
    if (!hackIntro || hackIntro.classList.contains("is-finished")) {
      return;
    }
    triggerGlitch(520);
    hackIntro.classList.add("is-finished");
    document.body.classList.add("terminal-revealing");
    document.body.classList.remove("intro-active");
    startCanvasLoop();
    startKpcoTerminalLogo();
    window.clearTimeout(ambientStartTimer);
    ambientStartTimer = window.setTimeout(startAmbientMusic, 160);
    window.setTimeout(() => {
      showCursorBubble("Hehe! We're inside. Now the password!", 3200);
    }, 560);
    window.setTimeout(() => document.body.classList.remove("terminal-revealing"), 1400);
    tone("move");
  }

  function bindActivationControls() {
    activationButton?.addEventListener("click", (event) => {
      if (activationArmed && event.detail > 0 && !event.target.closest(".activation-symbol")) {
        return;
      }
      const activationText = activationButton.querySelector(".activation-text");
      if (!activationArmed) {
        activationArmed = true;
        activationButton.classList.add("is-armed");
        if (activationText) {
          activationText.textContent = "INITIALIZE HACK";
        }
        primeActivationCodecAudio();
        unlockActivationCodecHtmlAudio();
        playUiClick();
        return;
      }
      activationButton.classList.add("is-engaged");
      if (activationText) {
        activationText.textContent = "INITIALIZE HACK";
      }
      playUiClick();
      showCursorBubble("Lets break those firewalls", 2400, event);
      window.setTimeout(launchHackProgram, 180);
    });

    chosenForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      submitChosenOne();
    });
    chosenForm?.addEventListener("pointerdown", (event) => {
      const rect = chosenForm.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const isSubmitZone = localX > rect.width * 0.74;
      event.preventDefault();
      if (isSubmitZone) {
        submitChosenOne();
      } else {
        chosenInput?.focus();
      }
    });
    chosenForm?.addEventListener("pointermove", (event) => {
      const rect = chosenForm.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      window.kprActivationLogo?.setSubmitHover?.(localX > rect.width * 0.74);
    });
    chosenForm?.addEventListener("pointerleave", () => {
      window.kprActivationLogo?.setSubmitHover?.(false);
    });
    chosenSubmit?.addEventListener("click", (event) => {
      event.preventDefault();
      submitChosenOne();
    });
    chosenInput?.addEventListener("input", () => {
      window.kprActivationLogo?.setChosenText?.(chosenInput.value || "");
    });

    hackIntro?.addEventListener("pointerdown", () => {
      introClickPrimed = true;
      prepareAmbientMusic();
    }, { once: true });
    hackIntro?.addEventListener("click", () => {
      if (introClickPrimed) {
        introClickPrimed = false;
        return;
      }
      finishIntro();
    });
  }

  return {
    bindActivationControls,
    finishIntro,
    handleActivationWheel,
    launchHackProgram,
    setActivationLogoProgress,
    submitChosenOne,
    triggerGlitch,
  };
}
