const closingSheets = new WeakMap();

export function pointInsideRect(x, y, rect) {
  return Boolean(
    rect
    && x >= rect.left
    && x <= rect.right
    && y >= rect.top
    && y <= rect.bottom,
  );
}

export function activeModalDialog(doc = document) {
  if (!doc?.querySelectorAll) return null;
  let modals;
  try {
    modals = [...doc.querySelectorAll("dialog:modal")];
  } catch {
    modals = [...doc.querySelectorAll("dialog[open]")];
  }
  return modals.at(-1) ?? null;
}

export function findScrollableAncestor(target, dialog, deltaY, getStyle = (el) => getComputedStyle(el)) {
  let node = target?.nodeType === 3 ? target.parentElement : target;
  if (!node || !dialog || !dialog.contains(node)) return null;
  while (node && dialog.contains(node)) {
    const overflowY = getStyle(node)?.overflowY;
    const scrollable = overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
    const maxScroll = (node.scrollHeight ?? 0) - (node.clientHeight ?? 0);
    if (scrollable && maxScroll > 1) {
      const top = node.scrollTop ?? 0;
      if (deltaY === 0) return node;
      if (deltaY < 0 && top > 0) return node;
      if (deltaY > 0 && top < maxScroll - 1) return node;
    }
    if (node === dialog) break;
    node = node.parentElement;
  }
  return null;
}

export function shouldBlockModalScroll({
  dialog,
  target,
  clientX,
  clientY,
  deltaX = 0,
  deltaY = 0,
  isTouch = false,
  getStyle,
} = {}) {
  if (!dialog) return false;
  const el = target?.nodeType === 3 ? target.parentElement : target;
  if (typeof el?.closest === "function" && el.closest('input[type="range"]')) return false;
  if (
    target === dialog
    && Number.isFinite(clientX)
    && Number.isFinite(clientY)
    && !pointInsideRect(clientX, clientY, dialog.getBoundingClientRect?.())
  ) {
    return true;
  }
  if (!el || !dialog.contains(el)) return true;
  if (Math.abs(deltaX) > Math.abs(deltaY)) return false;
  if (!isTouch && deltaY === 0) return false;
  return !findScrollableAncestor(el, dialog, deltaY, getStyle);
}

// Keep the native modal open until its exit finishes, including on Safari.
// This preserves the backdrop, focus trap, and the normal close event.
export function closeSheet(dialog, returnValue = "") {
  if (!dialog?.open || closingSheets.has(dialog)) return;
  const shouldSlide = window.matchMedia("(max-width: 677px) and (prefers-reduced-motion: no-preference)").matches;
  if (!shouldSlide || !dialog.animate) {
    dialog.close(returnValue);
    return;
  }
  const animation = dialog.animate([
    { transform: getComputedStyle(dialog).transform },
    { transform: "translateY(100%)" },
  ], { duration: 200, easing: "cubic-bezier(.4, 0, 1, 1)", fill: "forwards" });
  closingSheets.set(dialog, animation);
  dialog.dataset.closing = "true";
  const cleanup = () => {
    closingSheets.delete(dialog);
    delete dialog.dataset.closing;
    dialog.removeEventListener("close", cleanup);
    animation.cancel();
  };
  // Signing out can close every dialog immediately; don't close a later reopen.
  dialog.addEventListener("close", cleanup, { once: true });
  const finish = () => {
    if (closingSheets.get(dialog) !== animation) return;
    cleanup();
    if (dialog.open) dialog.close(returnValue);
  };
  animation.finished.then(finish, finish);
}

export function initDialogInteractions() {
  // Native dialogs autofocus after touch too. Reserve outlines for keyboard use.
  document.addEventListener("pointerdown", () => {
    document.documentElement.dataset.inputMode = "pointer";
  }, true);
  document.addEventListener("keydown", event => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (
      event.key === "Tab"
      || event.key.startsWith("Arrow")
      || event.key === "Enter"
      || event.key === " "
      || event.key === "Home"
      || event.key === "End"
      || event.key === "PageUp"
      || event.key === "PageDown"
      || event.key === "Escape"
    ) {
      document.documentElement.dataset.inputMode = "keyboard";
    }
  }, true);

  let lastTouch = null;
  document.addEventListener("touchstart", event => {
    if (event.touches.length !== 1) {
      lastTouch = null;
      return;
    }
    const touch = event.touches[0];
    lastTouch = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });
  const clearTouch = () => { lastTouch = null; };
  document.addEventListener("touchend", clearTouch, { passive: true });
  document.addEventListener("touchcancel", clearTouch, { passive: true });

  document.addEventListener("touchmove", event => {
    const dialog = activeModalDialog();
    if (!dialog || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const dx = lastTouch ? touch.clientX - lastTouch.x : 0;
    const dy = lastTouch ? lastTouch.y - touch.clientY : 0;
    lastTouch = { x: touch.clientX, y: touch.clientY };
    if (shouldBlockModalScroll({
      dialog,
      target: event.target,
      clientX: touch.clientX,
      clientY: touch.clientY,
      deltaX: dx,
      deltaY: dy,
      isTouch: true,
    })) {
      event.preventDefault();
    }
  }, { passive: false });

  document.addEventListener("wheel", event => {
    const dialog = activeModalDialog();
    if (!dialog || event.ctrlKey) return;
    if (shouldBlockModalScroll({
      dialog,
      target: event.target,
      clientX: event.clientX,
      clientY: event.clientY,
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      isTouch: false,
    })) {
      event.preventDefault();
    }
  }, { passive: false });

  for (const dialog of document.querySelectorAll("dialog.form-sheet")) {
    dialog.addEventListener("cancel", event => {
      event.preventDefault();
      closeSheet(dialog);
    });
    dialog.addEventListener("click", event => {
      if (event.target !== dialog) return;
      if (!pointInsideRect(event.clientX, event.clientY, dialog.getBoundingClientRect())) closeSheet(dialog);
    });
    dialog.addEventListener("submit", event => {
      const method = event.submitter?.getAttribute("formmethod") ?? event.target.method;
      if (event.defaultPrevented || method !== "dialog") return;
      event.preventDefault();
      closeSheet(dialog, event.submitter?.value ?? "");
    });
  }
}
