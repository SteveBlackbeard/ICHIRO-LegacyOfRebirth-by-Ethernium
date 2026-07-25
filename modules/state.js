export const STORAGE_KEY = "legacy-rebirth-archive-progress";

export function loadState(initialUnlocked) {
  return {
    unlocked: [...initialUnlocked],
    opened: [],
    protocols: [],
    leads: [],
  };
}

export function saveState() {
  // Demo mode: do not persist progress between browsers or reloads.
}

export function isUnlocked(state, id) {
  return state.unlocked.includes(id);
}

export function isOpened(state, id) {
  return state.opened.includes(id);
}

export function findFirstUnlockedIndex(files, state) {
  const index = files.findIndex((file) => isUnlocked(state, file.id));
  return index < 0 ? 0 : index;
}




