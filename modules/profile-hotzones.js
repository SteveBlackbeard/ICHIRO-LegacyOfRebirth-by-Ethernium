export function createProfileHotzones({
  profileCharacter,
  profileCharacterFront,
  profileCharacterFrame,
  profileCharacterLabel,
  onLabelEnter,
}) {
  let alphaCanvas = null;
  let alphaContext = null;
  let hotUntil = 0;

  function ensureAlphaMap() {
    if (alphaContext || !profileCharacterFront?.complete || !profileCharacterFront.naturalWidth) {
      return alphaContext;
    }

    alphaCanvas = document.createElement("canvas");
    alphaCanvas.width = profileCharacterFront.naturalWidth;
    alphaCanvas.height = profileCharacterFront.naturalHeight;
    alphaContext = alphaCanvas.getContext("2d");
    alphaContext.drawImage(profileCharacterFront, 0, 0);
    return alphaContext;
  }

  function getUntransformedViewportRect(element) {
    if (!element) {
      return null;
    }

    let left = 0;
    let top = 0;
    let node = element;
    while (node) {
      left += node.offsetLeft || 0;
      top += node.offsetTop || 0;
      node = node.offsetParent;
    }

    return {
      left: left - window.scrollX,
      top: top - window.scrollY,
      width: element.offsetWidth,
      height: element.offsetHeight,
      right: left - window.scrollX + element.offsetWidth,
      bottom: top - window.scrollY + element.offsetHeight,
    };
  }

  function getStableImageRect() {
    if (!profileCharacter || !profileCharacterFront?.naturalWidth || !profileCharacterFront?.naturalHeight) {
      return null;
    }

    const hostRect = getUntransformedViewportRect(profileCharacter);
    if (!hostRect) {
      return null;
    }

    const style = getComputedStyle(profileCharacterFront);
    const height = parseFloat(style.height) || hostRect.height * 0.98;
    const width = height * (profileCharacterFront.naturalWidth / profileCharacterFront.naturalHeight);
    const leftOffset = parseFloat(style.left) || hostRect.width * 0.56;
    const bottomOffset = parseFloat(style.bottom) || 0;
    const centerX = hostRect.left + leftOffset;
    const bottom = hostRect.bottom - bottomOffset;
    const left = centerX - width / 2;
    const top = bottom - height;

    return {
      left,
      top,
      width,
      height,
      right: left + width,
      bottom,
    };
  }

  function isLabel(event) {
    if (!event || typeof event.clientX !== "number" || typeof event.clientY !== "number" || !profileCharacterLabel) {
      return false;
    }

    const rect = profileCharacterLabel.getBoundingClientRect();
    const pad = 6;
    return (
      event.clientX >= rect.left - pad &&
      event.clientX <= rect.right + pad &&
      event.clientY >= rect.top - pad &&
      event.clientY <= rect.bottom + pad
    );
  }

  function isFrame(event) {
    if (!event || typeof event.clientX !== "number" || typeof event.clientY !== "number" || !profileCharacterFrame) {
      return false;
    }

    const rect = profileCharacterFrame.getBoundingClientRect();
    const pad = 14;
    return (
      event.clientX >= rect.left - pad &&
      event.clientX <= rect.right + pad &&
      event.clientY >= rect.top - pad &&
      event.clientY <= rect.bottom + pad
    );
  }

  function isArt(event) {
    if (!event || typeof event.clientX !== "number" || typeof event.clientY !== "number") {
      return false;
    }

    const context = ensureAlphaMap();
    if (!context || !profileCharacterFront) {
      return false;
    }

    const rect = getStableImageRect();
    if (!rect) {
      return false;
    }

    if (
      event.clientX < rect.left - 8 ||
      event.clientX > rect.right + 8 ||
      event.clientY < rect.top - 8 ||
      event.clientY > rect.bottom + 8
    ) {
      return false;
    }

    const imageX = Math.max(0, Math.min(
      profileCharacterFront.naturalWidth - 1,
      Math.floor(((event.clientX - rect.left) / rect.width) * profileCharacterFront.naturalWidth),
    ));
    const imageY = Math.max(0, Math.min(
      profileCharacterFront.naturalHeight - 1,
      Math.floor(((event.clientY - rect.top) / rect.height) * profileCharacterFront.naturalHeight),
    ));
    const sample = context.getImageData(
      Math.max(0, imageX - 1),
      Math.max(0, imageY - 1),
      Math.min(3, profileCharacterFront.naturalWidth - Math.max(0, imageX - 1)),
      Math.min(3, profileCharacterFront.naturalHeight - Math.max(0, imageY - 1)),
    ).data;
    for (let index = 3; index < sample.length; index += 4) {
      if (sample[index] > 12) {
        return true;
      }
    }
    return false;
  }

  function isHotZone(event) {
    return isLabel(event) || isArt(event) || isFrame(event);
  }

  function reset() {
    if (!profileCharacter) {
      return;
    }
    profileCharacter.classList.remove("is-cursor-hot");
    profileCharacter.style.setProperty("--tilt-x", "0deg");
    profileCharacter.style.setProperty("--tilt-y", "0deg");
    profileCharacter.style.setProperty("--shine-x", "50%");
    profileCharacter.style.setProperty("--shine-y", "35%");
    profileCharacter.style.setProperty("--front-x", "0px");
    profileCharacter.style.setProperty("--front-y", "0px");
    profileCharacter.style.setProperty("--ghost-x", "-5px");
    profileCharacter.style.setProperty("--ghost-y", "0px");
  }

  function handlePointerMove(event) {
    if (!profileCharacter) {
      return;
    }
    const artHot = isArt(event);
    const frameHot = isFrame(event);
    const rawActionHot = artHot || frameHot || isLabel(event);
    if (rawActionHot) {
      hotUntil = performance.now() + 170;
    }
    const actionHot = rawActionHot || performance.now() < hotUntil;
    profileCharacter.classList.toggle("is-cursor-hot", actionHot);

    if (!actionHot) {
      reset();
      return;
    }

    const rect = artHot
      ? getStableImageRect() || profileCharacter.getBoundingClientRect()
      : profileCharacterFrame?.getBoundingClientRect() || profileCharacter.getBoundingClientRect();
    const x = Math.max(-0.5, Math.min(0.5, (event.clientX - rect.left) / rect.width - 0.5));
    const y = Math.max(-0.5, Math.min(0.5, (event.clientY - rect.top) / rect.height - 0.5));
    profileCharacter.style.setProperty("--tilt-x", `${(-y * 8).toFixed(2)}deg`);
    profileCharacter.style.setProperty("--tilt-y", `${(x * 12).toFixed(2)}deg`);
    profileCharacter.style.setProperty("--shine-x", `${((x + 0.5) * 100).toFixed(1)}%`);
    profileCharacter.style.setProperty("--shine-y", `${((y + 0.5) * 100).toFixed(1)}%`);
    profileCharacter.style.setProperty("--front-x", `${(x * 18).toFixed(2)}px`);
    profileCharacter.style.setProperty("--front-y", `${(y * 12).toFixed(2)}px`);
    profileCharacter.style.setProperty("--ghost-x", `${(-5 + x * 3).toFixed(2)}px`);
    profileCharacter.style.setProperty("--ghost-y", `${(y * 12).toFixed(2)}px`);
  }

  function bind() {
    profileCharacter?.addEventListener("pointermove", handlePointerMove);
    profileCharacter?.addEventListener("pointerleave", reset);
    if (typeof onLabelEnter === "function") {
      profileCharacterLabel?.addEventListener("pointerenter", onLabelEnter);
    }
  }

  return {
    bind,
    getStableImageRect,
    isArt,
    isFrame,
    isHotZone,
    isLabel,
    reset,
  };
}
