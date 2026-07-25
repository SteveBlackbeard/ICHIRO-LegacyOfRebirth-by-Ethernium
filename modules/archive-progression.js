function ensureList(state, key) {
  if (!Array.isArray(state[key])) state[key] = [];
  return state[key];
}

function addUnique(list, value) {
  if (list.includes(value)) return false;
  list.push(value);
  return true;
}

export function createArchiveProgression({ files, getState, saveState }) {
  const fileById = new Map(files.map((file) => [file.id, file]));

  function state() {
    const current = getState();
    ensureList(current, "unlocked");
    ensureList(current, "opened");
    ensureList(current, "protocols");
    ensureList(current, "leads");
    return current;
  }

  function isUnlocked(id) {
    return state().unlocked.includes(id);
  }

  function isOpened(id) {
    return state().opened.includes(id);
  }

  function isSolved(id) {
    return state().protocols.includes(id);
  }

  function recordOpen(id) {
    if (!fileById.has(id) || !isUnlocked(id)) return Object.freeze({ allowed: false, changed: false });
    const changed = addUnique(state().opened, id);
    if (changed) saveState();
    return Object.freeze({ allowed: true, changed });
  }

  function completeProtocol(file) {
    if (!file || !fileById.has(file.id) || !isUnlocked(file.id)) {
      return Object.freeze({ completed: false, newlyUnlocked: [] });
    }
    const current = state();
    if (!addUnique(current.protocols, file.id)) {
      return Object.freeze({ completed: false, newlyUnlocked: [] });
    }

    const newlyUnlocked = [];
    for (const id of file.unlocks || []) {
      if (fileById.has(id) && addUnique(current.unlocked, id)) newlyUnlocked.push(id);
    }
    saveState();
    return Object.freeze({ completed: true, newlyUnlocked: Object.freeze(newlyUnlocked) });
  }

  // Narrative choices may reveal leads, but never mutate dossier access.
  function recordStoryLeads(ids = []) {
    const leads = state().leads;
    const fresh = [];
    for (const id of ids) {
      if (fileById.has(id) && addUnique(leads, id)) fresh.push(id);
    }
    if (fresh.length) saveState();
    return Object.freeze(fresh);
  }

  function findFirstUnlockedIndex() {
    const index = files.findIndex((file) => isUnlocked(file.id));
    return index < 0 ? 0 : index;
  }

  function findNextInvestigable() {
    return files.find((file) => isUnlocked(file.id) && !isOpened(file.id)) || null;
  }

  function getProgress() {
    const current = state();
    return Object.freeze({
      solved: current.protocols.length,
      opened: current.opened.length,
      unlocked: current.unlocked.length,
      total: files.length,
      complete: current.protocols.length >= files.length,
    });
  }

  return Object.freeze({
    completeProtocol,
    findFirstUnlockedIndex,
    findNextInvestigable,
    getProgress,
    isOpened,
    isSolved,
    isUnlocked,
    recordOpen,
    recordStoryLeads,
  });
}
