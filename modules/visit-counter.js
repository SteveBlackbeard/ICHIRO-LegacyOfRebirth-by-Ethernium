// Visit Counter Module (v226)
// Tracks user visits in localStorage and displays a subtle badge.
// Also exposes the visit count for other modules to consume.

export function initVisitCounter() {
  const STORAGE_KEY = "kpr_visit_count";
  const FIRST_VISIT_KEY = "kpr_first_visit";
  
  let visitCount = 1;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    visitCount = stored ? parseInt(stored, 10) + 1 : 1;
    localStorage.setItem(STORAGE_KEY, String(visitCount));
    
    if (!localStorage.getItem(FIRST_VISIT_KEY)) {
      localStorage.setItem(FIRST_VISIT_KEY, new Date().toISOString());
    }
  } catch (e) {
    // localStorage may be blocked in private browsing
    console.warn("KPR visit counter: localStorage unavailable", e);
  }

  // Create and inject badge
  const badge = document.createElement("div");
  badge.className = "visit-counter-badge";
  badge.setAttribute("aria-hidden", "true");
  badge.textContent = `ACCESS #${String(visitCount).padStart(4, "0")}`;
  document.body.appendChild(badge);

  // Reveal badge after a short delay
  setTimeout(() => {
    badge.classList.add("is-visible");
  }, 2000);

  // Auto-hide after 6 seconds
  setTimeout(() => {
    badge.classList.remove("is-visible");
  }, 8000);

  return {
    getVisitCount: () => visitCount,
    getFirstVisit: () => {
      try {
        return localStorage.getItem(FIRST_VISIT_KEY) || null;
      } catch {
        return null;
      }
    },
    destroy() {
      badge.remove();
    },
  };
}
