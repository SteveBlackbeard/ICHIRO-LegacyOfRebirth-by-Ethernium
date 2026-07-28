const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableWithin(root) {
  return [...root.querySelectorAll(focusableSelector)].filter((element) => {
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && !element.closest("[aria-hidden='true']");
  });
}

export function createFocusManager() {
  const states = new WeakMap();

  function handleKeydown(event) {
    const dialog = event.currentTarget;
    const state = states.get(dialog);
    if (!state) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      state.onRequestClose?.();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = focusableWithin(dialog);
    if (!focusable.length) {
      event.preventDefault();
      dialog.focus({ preventScroll: true });
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  function activate(dialog, {
    initialFocus = null,
    onRequestClose = null,
    returnFocus = document.activeElement,
  } = {}) {
    if (!dialog) return;
    deactivate(dialog, { restore: false });
    states.set(dialog, {
      onRequestClose,
      returnFocus: typeof returnFocus === "function" || returnFocus instanceof HTMLElement
        ? returnFocus
        : null,
    });
    dialog.setAttribute("tabindex", "-1");
    dialog.addEventListener("keydown", handleKeydown);
    queueMicrotask(() => {
      const focusable = focusableWithin(dialog);
      const target = focusable.includes(initialFocus)
        ? initialFocus
        : focusable[0] || dialog;
      target.focus({ preventScroll: true });
    });
  }

  function deactivate(dialog, { restore = true } = {}) {
    if (!dialog) return;
    const state = states.get(dialog);
    dialog.removeEventListener("keydown", handleKeydown);
    states.delete(dialog);
    const returnTarget = typeof state?.returnFocus === "function"
      ? state.returnFocus()
      : state?.returnFocus;
    if (restore && returnTarget?.isConnected) {
      returnTarget.focus({ preventScroll: true });
    }
  }

  return Object.freeze({ activate, deactivate });
}
