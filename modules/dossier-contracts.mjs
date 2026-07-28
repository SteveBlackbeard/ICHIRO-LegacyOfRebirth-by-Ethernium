export const dossierProtocolIds = Object.freeze([
  "00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
]);

const routeGraph = Object.freeze({
  S: Object.freeze(["A", "B"]),
  A: Object.freeze(["D", "C"]),
  B: Object.freeze(["C", "E"]),
  C: Object.freeze(["F"]),
  D: Object.freeze(["F"]),
  E: Object.freeze(["F"]),
  F: Object.freeze([]),
});
const compromisedRouteNodes = new Set(["A", "C"]);

export const dossierProtocolSolutions = Object.freeze({
  "00": Object.freeze([..."1011010010110110"].map(Number)),
  "01": Object.freeze({ gain: 0.64, phase: 180 }),
  "02": Object.freeze(["kai", "preserve", "accident"]),
  "03": Object.freeze([-18, 24, -7]),
  "04": Object.freeze(["count", "shake", "cloth", "steps", "blame"]),
  "05": Object.freeze([31, 67, 84]),
  "06": Object.freeze(["S", "B", "E", "F"]),
  "07": Object.freeze([true, false, true, false]),
  "08": Object.freeze([7, 2, 9]),
  "09": Object.freeze({ x: 62, y: 43 }),
  "10": Object.freeze([2, 0, 2, 1, 0]),
});

function closeTo(actual, expected, tolerance) {
  return Number.isFinite(Number(actual)) && Math.abs(Number(actual) - expected) <= tolerance;
}

function exactList(candidate, expected) {
  return Array.isArray(candidate)
    && candidate.length === expected.length
    && candidate.every((value, index) => value === expected[index]);
}

function validRoute(candidate) {
  if (!Array.isArray(candidate) || candidate[0] !== "S" || candidate.at(-1) !== "F") return false;
  if (candidate.some((node) => compromisedRouteNodes.has(node))) return false;
  return candidate.slice(1).every((node, index) => routeGraph[candidate[index]]?.includes(node));
}

export function validateDossierProtocol(id, candidate) {
  const solution = dossierProtocolSolutions[id];
  switch (id) {
    case "00":
    case "02":
    case "04":
    case "07":
    case "08":
    case "10":
      return exactList(candidate, solution);
    case "01":
      return closeTo(candidate?.gain, solution.gain, 0.04)
        && closeTo(candidate?.phase, solution.phase, 8);
    case "03":
      return Array.isArray(candidate)
        && candidate.length === solution.length
        && candidate.every((value, index) => closeTo(value, solution[index], 1));
    case "05":
      return Array.isArray(candidate)
        && candidate.length === solution.length
        && candidate.every((value, index) => closeTo(value, solution[index], 2));
    case "06":
      return validRoute(candidate);
    case "09":
      return Number.isFinite(Number(candidate?.x))
        && Number.isFinite(Number(candidate?.y))
        && Math.hypot(Number(candidate.x) - solution.x, Number(candidate.y) - solution.y) <= 4.5;
    default:
      return false;
  }
}
