/** Top-level DuoJazz tabs: Licks, Charts, Settings. */

export const TAB_IDS = ["licks", "charts", "settings"];
export const DEFAULT_TAB = "licks";
export const TAB_BAR_PHONE_PX = 49;
export const TAB_BAR_BREAKPOINT_PX = 768;

export function isTabId(value) {
  return TAB_IDS.includes(value);
}

export function parseTabState(search = "") {
  const params = new URLSearchParams(String(search).replace(/^\?/, ""));
  const tab = isTabId(params.get("tab")) ? params.get("tab") : DEFAULT_TAB;
  const tune = tab === "charts" ? (params.get("tune") || null) : null;
  return { tab, tune };
}

/** Keep unrelated query keys (screen, lesson, demo) when switching tabs. */
export function tabSearch(state, currentSearch = "") {
  const next = new URLSearchParams(String(currentSearch).replace(/^\?/, ""));
  const tab = isTabId(state?.tab) ? state.tab : DEFAULT_TAB;
  next.set("tab", tab);
  if (tab === "charts" && state?.tune) next.set("tune", state.tune);
  else next.delete("tune");
  const qs = next.toString();
  return qs ? `?${qs}` : "";
}

export function tabBarPlacement(width) {
  return width >= TAB_BAR_BREAKPOINT_PX ? "top" : "bottom";
}
