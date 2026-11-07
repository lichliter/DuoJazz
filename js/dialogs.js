const closingSheets = new WeakMap();

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
    if (event.key === "Tab" || event.key.startsWith("Arrow")) {
      document.documentElement.dataset.inputMode = "keyboard";
    }
  }, true);

  for (const dialog of document.querySelectorAll("dialog.form-sheet")) {
    dialog.addEventListener("cancel", event => {
      event.preventDefault();
      closeSheet(dialog);
    });
    dialog.addEventListener("submit", event => {
      const method = event.submitter?.getAttribute("formmethod") ?? event.target.method;
      if (event.defaultPrevented || method !== "dialog") return;
      event.preventDefault();
      closeSheet(dialog, event.submitter?.value ?? "");
    });
  }
}
