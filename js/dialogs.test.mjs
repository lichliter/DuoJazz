import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { findScrollableAncestor, pointInsideRect, shouldBlockModalScroll } from "./dialogs.js";

function makeElement({
  overflowY = "visible",
  scrollHeight = 0,
  clientHeight = 0,
  scrollTop = 0,
  rect = { left: 0, right: 390, top: 100, bottom: 844 },
  parent = null,
  closestRange = false,
} = {}) {
  const el = {
    nodeType: 1,
    overflowY,
    scrollHeight,
    clientHeight,
    scrollTop,
    parentElement: parent,
    getBoundingClientRect: () => rect,
    closest: (selector) => (closestRange && selector === 'input[type="range"]' ? el : null),
    contains(other) {
      let cur = other;
      while (cur) {
        if (cur === this) return true;
        cur = cur.parentElement;
      }
      return false;
    },
  };
  return el;
}

const fakeStyle = (el) => ({ overflowY: el?.overflowY ?? "visible" });

test("pointInsideRect checks inclusive rectangle bounds", () => {
  const rect = { left: 20, right: 320, top: 100, bottom: 700 };
  assert.equal(pointInsideRect(150, 400, rect), true);
  assert.equal(pointInsideRect(20, 100, rect), true);
  assert.equal(pointInsideRect(10, 400, rect), false);
  assert.equal(pointInsideRect(150, 50, rect), false);
  assert.equal(pointInsideRect(150, 400, null), false);
});

test("shouldBlockModalScroll does not block when no modal is open", () => {
  const el = makeElement();
  assert.equal(shouldBlockModalScroll({ dialog: null, target: el, deltaY: 24, getStyle: fakeStyle }), false);
});

test("shouldBlockModalScroll blocks backdrop and outside touches/wheels even when dialog is scrollable", () => {
  const dialog = makeElement({
    overflowY: "auto",
    scrollHeight: 900,
    clientHeight: 500,
    scrollTop: 100,
    rect: { left: 40, right: 500, top: 120, bottom: 720 },
  });
  const outside = makeElement();

  assert.equal(shouldBlockModalScroll({
    dialog,
    target: dialog,
    clientX: 10,
    clientY: 200,
    deltaY: 40,
    isTouch: true,
    getStyle: fakeStyle,
  }), true);
  assert.equal(shouldBlockModalScroll({
    dialog,
    target: dialog,
    clientX: 200,
    clientY: 40,
    deltaY: -40,
    isTouch: false,
    getStyle: fakeStyle,
  }), true);
  assert.equal(shouldBlockModalScroll({
    dialog,
    target: outside,
    clientX: 10,
    clientY: 10,
    deltaY: 30,
    isTouch: true,
    getStyle: fakeStyle,
  }), true);
});

test("shouldBlockModalScroll blocks vertical scroll on non-scrollable modals while allowing horizontal swipe", () => {
  const dialog = makeElement({ overflowY: "auto", scrollHeight: 320, clientHeight: 320 });
  const header = makeElement({ parent: dialog });

  assert.equal(shouldBlockModalScroll({
    dialog,
    target: header,
    clientX: 100,
    clientY: 140,
    deltaX: 0,
    deltaY: 20,
    isTouch: true,
    getStyle: fakeStyle,
  }), true);
  assert.equal(shouldBlockModalScroll({
    dialog,
    target: header,
    clientX: 100,
    clientY: 140,
    deltaX: -24,
    deltaY: 4,
    isTouch: true,
    getStyle: fakeStyle,
  }), false);
});

test("findScrollableAncestor and shouldBlockModalScroll clamp scroll boundaries to avoid bleed", () => {
  const dialog = makeElement({ overflowY: "hidden", scrollHeight: 844, clientHeight: 844 });
  const list = makeElement({ overflowY: "auto", scrollHeight: 800, clientHeight: 400, scrollTop: 0, parent: dialog });
  const row = makeElement({ parent: list });
  const textNode = { nodeType: 3, parentElement: row };

  // At top boundary: allow down, block up
  assert.equal(findScrollableAncestor(textNode, dialog, 12, fakeStyle), list);
  assert.equal(shouldBlockModalScroll({ dialog, target: textNode, clientX: 100, clientY: 300, deltaY: 12, isTouch: true, getStyle: fakeStyle }), false);
  assert.equal(shouldBlockModalScroll({ dialog, target: textNode, clientX: 100, clientY: 300, deltaY: -12, isTouch: true, getStyle: fakeStyle }), true);

  // Mid-scroll: allow both directions
  list.scrollTop = 200;
  assert.equal(shouldBlockModalScroll({ dialog, target: row, clientX: 100, clientY: 300, deltaY: 12, isTouch: false, getStyle: fakeStyle }), false);
  assert.equal(shouldBlockModalScroll({ dialog, target: row, clientX: 100, clientY: 300, deltaY: -12, isTouch: false, getStyle: fakeStyle }), false);

  // At bottom boundary: allow up, block down
  list.scrollTop = 400;
  assert.equal(shouldBlockModalScroll({ dialog, target: row, clientX: 100, clientY: 300, deltaY: -12, isTouch: true, getStyle: fakeStyle }), false);
  assert.equal(shouldBlockModalScroll({ dialog, target: row, clientX: 100, clientY: 300, deltaY: 12, isTouch: true, getStyle: fakeStyle }), true);
});

test("shouldBlockModalScroll leaves range sliders interactive inside modals", () => {
  const dialog = makeElement({ overflowY: "hidden", scrollHeight: 400, clientHeight: 400 });
  const slider = makeElement({ parent: dialog, closestRange: true });
  assert.equal(shouldBlockModalScroll({
    dialog,
    target: slider,
    clientX: 100,
    clientY: 200,
    deltaY: 15,
    isTouch: true,
    getStyle: fakeStyle,
  }), false);
});

test("css/hig.css locks page and inner containers for any open modal dialog", async () => {
  const hig = await readFile(new URL("../css/hig.css", import.meta.url), "utf8");
  assert.doesNotMatch(hig, /:root:has\(#quick-view:modal\)/);
  assert.match(hig, /:root:has\(dialog:modal\)/);
  assert.match(hig, /html:has\(\.app-shell\[data-screen="home"\]\):has\(dialog:modal\)/);
  assert.match(hig, /\.form-sheet::backdrop\s*\{[^}]*touch-action:\s*none;/);
});
