import test from "node:test";
import assert from "node:assert/strict";
import {
  TAB_IDS,
  DEFAULT_TAB,
  TAB_BAR_PHONE_PX,
  TAB_BAR_BREAKPOINT_PX,
  parseTabState,
  tabSearch,
  tabBarPlacement,
} from "./tabs.js";

test("tab routing reads ?tab=licks|charts|settings and optional ?tune=", () => {
  assert.deepEqual(TAB_IDS, ["licks", "charts", "settings"]);
  assert.equal(DEFAULT_TAB, "licks");
  assert.deepEqual(parseTabState(""), { tab: "licks", tune: null });
  assert.deepEqual(parseTabState("?tab=licks"), { tab: "licks", tune: null });
  assert.deepEqual(parseTabState("tab=charts"), { tab: "charts", tune: null });
  assert.deepEqual(parseTabState("?tab=charts&tune=recordame"), {
    tab: "charts",
    tune: "recordame",
  });
  assert.deepEqual(parseTabState("?tab=settings"), { tab: "settings", tune: null });
  assert.deepEqual(parseTabState("?tab=nope&tune=four"), { tab: "licks", tune: null });
  assert.equal(parseTabState("?tab=licks&tune=four").tune, null);
});

test("tab search writes tab and tune while keeping other query keys", () => {
  assert.equal(tabSearch({ tab: "licks" }), "?tab=licks");
  assert.equal(tabSearch({ tab: "charts", tune: "nutville" }), "?tab=charts&tune=nutville");
  assert.equal(
    tabSearch({ tab: "settings" }, "?screen=setup&tab=licks"),
    "?screen=setup&tab=settings",
  );
  assert.equal(
    tabSearch({ tab: "licks" }, "?tab=charts&tune=four&module=cmar"),
    "?tab=licks&module=cmar",
  );
});

test("iPad uses a top tab bar; iPhone uses a 49pt bottom bar", () => {
  assert.equal(TAB_BAR_PHONE_PX, 49);
  assert.equal(TAB_BAR_BREAKPOINT_PX, 768);
  assert.equal(tabBarPlacement(390), "bottom");
  assert.equal(tabBarPlacement(767), "bottom");
  assert.equal(tabBarPlacement(768), "top");
  assert.equal(tabBarPlacement(1024), "top");
});
