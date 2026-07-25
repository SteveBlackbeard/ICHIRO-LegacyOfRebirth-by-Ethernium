export function createHudTelemetry({
  hudTelemetry,
  hudNode,
  hudLat,
  hudLon,
  hudSpeed,
  hudTrace,
  hudCompass,
  hudCompassNeedle,
  showContextualBubble,
  isAdaptivePerformance = () => false,
  isActive = () => true,
}) {
  let timer = null;
  let deviceCompassRequested = false;
  const state = {
    lat: 35.6895,
    lon: 139.6917,
    heading: 315,
    realHeading: null,
    speed: 96,
    last: performance.now(),
    lastTextUpdate: 0,
    trace: 42,
  };

  function update() {
    if (!hudTelemetry || !hudLat || !hudLon || !hudSpeed || !hudCompassNeedle) {
      return;
    }
    if (isAdaptivePerformance() && !isActive()) {
      return;
    }

    const now = performance.now();
    const elapsedSeconds = Math.max(0.01, Math.min(1.4, (now - state.last) / 1000));
    state.last = now;

    const seconds = now / 1000;
    
    // Simulate a vehicle winding along a highway towards the Northwest (315 degrees)
    // with smooth curves (+/- 24 degrees) and high-frequency steering vibrations
    const simulatedHeading = (
      315 +
      Math.sin(seconds * 0.08) * 16 +
      Math.cos(seconds * 0.03) * 8 +
      Math.sin(seconds * 1.8) * 0.7
    + 360) % 360;
    
    const heading = state.realHeading ?? simulatedHeading;
    state.heading = heading;
    
    // Highway speeds (fluctuates between 85 km/h and 107 km/h around curves)
    state.speed = 96 + Math.sin(seconds * 0.28) * 8 + Math.cos(seconds * 0.72) * 3;

    const distanceKm = Math.max(0, state.speed) * (elapsedSeconds / 3600);
    const headingRad = heading * Math.PI / 180;
    const latRad = state.lat * Math.PI / 180;
    state.lat += (distanceKm * Math.cos(headingRad)) / 111.32;
    state.lon += (distanceKm * Math.sin(headingRad)) / (111.32 * Math.max(0.18, Math.cos(latRad)));

    // Numeric telemetry texts and compass dial update only at 720ms interval to prevent flicker (restoring backup logic)
    if (now - state.lastTextUpdate >= 720) {
      state.lastTextUpdate = now;
      state.trace = (state.trace + 1) % 997;
      if (hudNode) {
        const sectorNum = Math.floor(state.lat * 10) % 100;
        hudNode.textContent = `NW-${String(sectorNum).padStart(3, "0")}`;
      }
      hudLat.textContent = state.lat.toFixed(5);
      hudLon.textContent = state.lon.toFixed(5);
      hudSpeed.textContent = String(Math.round(state.speed)).padStart(3, "0");
      if (hudTrace) {
        hudTrace.textContent = `NE-${String(state.trace).padStart(3, "0")}`;
      }
      hudTelemetry.style.setProperty("--hud-heading", `${heading.toFixed(2)}deg`);
    }
  }

  function handleDeviceOrientation(event) {
    const heading = typeof event.webkitCompassHeading === "number"
      ? event.webkitCompassHeading
      : typeof event.alpha === "number"
        ? 360 - event.alpha
        : null;
    if (heading === null || Number.isNaN(heading)) {
      return;
    }
    state.realHeading = (heading + 360) % 360;
  }

  function enableDeviceCompass() {
    if (deviceCompassRequested || typeof DeviceOrientationEvent === "undefined") {
      return;
    }
    deviceCompassRequested = true;
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission()
        .then((permission) => {
          if (permission === "granted") {
            window.addEventListener("deviceorientation", handleDeviceOrientation, true);
          }
        })
        .catch(() => {});
      return;
    }
    window.addEventListener("deviceorientation", handleDeviceOrientation, true);
  }

  function start() {
    update();
    timer = window.setInterval(update, 80);
  }

  function showCoordinateBubble(event) {
    showContextualBubble?.("telemetry", "Where are we headed?", 2300, event);
  }

  function showCompassBubble(event) {
    showContextualBubble?.("compass", "Where are we headed?", 2300, event);
  }

  return {
    enableDeviceCompass,
    handleDeviceOrientation,
    showCompassBubble,
    showCoordinateBubble,
    start,
    update,
  };
}
