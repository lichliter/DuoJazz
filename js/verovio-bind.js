/**
 * Bind Verovio's WASM callback before the app module graph evaluates.
 * Verovio 6.3 has no `calledRun`; if onRuntimeInitialized fires first, a later
 * hook never runs and the session paper stays empty.
 */
(function bindVerovioRuntime(vrv) {
  if (!vrv?.module || vrv.__duojazzBound) return;
  vrv.__duojazzBound = true;
  const prev = vrv.module.onRuntimeInitialized;
  vrv.module.onRuntimeInitialized = function onVerovioRuntimeInitialized() {
    if (typeof prev === "function") prev();
    vrv.__duojazzReady = true;
    if (typeof document !== "undefined") {
      document.dispatchEvent(new Event("verovio-ready"));
    }
  };
  if (typeof vrv.module._vrvToolkit_constructor === "function") {
    vrv.__duojazzReady = true;
  }
})(globalThis.verovio);

// Duration should move notes apart. engrave.js reads this when it builds options.
globalThis.DUOJAZZ_VEROVIO_SPACING = Object.freeze({
  spacingLinear: 0.7,
  spacingNonLinear: 0.35,
});
