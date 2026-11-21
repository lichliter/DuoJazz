import { fillMusicLabel } from "./engrave.js";
import { displayMedal, lessonPassedKeys, moduleMastery } from "./medals.js";
import { lessonById, moduleForLesson } from "./registry.js";
import { lessonVinylTier, wrapupCopy, wrapupNextModule } from "./session.js";

function resultLabel(row) {
  return row.summary ?? (row.outcome === "completed" ? "Completed" : row.outcome);
}

/** Create the session wrap-up summary and medal renderer. */
export function createWrapupView({
  els,
  getSession,
  getWrapupBanner,
  shownMastery,
  isTimedChart,
}) {
  function renderWrapup() {
    const session = getSession();
    const wrapupBanner = getWrapupBanner();
    const copy = wrapupCopy(session);
    const lesson = lessonById(session.lessonId);
    els.shell.dataset.sleeve = lesson.sleeve;
    if (els.wrapupKicker) els.wrapupKicker.textContent = copy.kicker;
    fillMusicLabel(els.wrapupHeading, copy.heading);
    els.wrapupDetail.textContent = copy.detail;
    if (els.wrapupSleeve) {
      els.wrapupSleeve.hidden = false;
      els.wrapupSleeve.dataset.sleeve = lesson.sleeve;
      els.wrapupSleeve.classList.toggle("is-upgrade", Boolean(wrapupBanner?.upgraded));
      const wrapVinyl = els.wrapupSleeve.querySelector(".vinyl");
      if (wrapVinyl) {
        wrapVinyl.dataset.tier = session.sequence
          ? (session.sequence.every((item) => shownMastery().lessons[item.lessonId]?.passedKeys.includes(item.keyId)) ? "gold" : "black")
          : lessonVinylTier(lesson, lessonPassedKeys(shownMastery(), lesson.id).length);
      }
    }
    if (els.wrapupSleeveNum) {
      const module = moduleForLesson(lesson.id);
      els.wrapupSleeveNum.textContent = lesson.chartTimed
        ? "03"
        : session.sequence
          ? (lesson.kind === "learn" ? "01" : "02")
          : String(module.lessons.findIndex((item) => item.id === lesson.id) + 1).padStart(2, "0");
    }
    if (els.wrapupSleeveTitle) els.wrapupSleeveTitle.textContent = lesson.coverTitle;
    els.resultList.replaceChildren(
      ...copy.results.map((row) => {
        const item = document.createElement("li");
        const label = document.createElement("span");
        label.textContent = row.label;
        const outcome = document.createElement("span");
        outcome.className = "outcome";
        outcome.textContent = resultLabel(row);
        item.append(label, outcome);
        return item;
      }),
    );
    const moduleStats = moduleMastery(shownMastery(), moduleForLesson(lesson.id).id);
    const count = moduleStats.masteredKeys.length;
    document.getElementById("wrapup-medal-panel").hidden = Boolean(session.sequence || isTimedChart());
    if (els.wrapupMedalMark) {
      els.wrapupMedalMark.hidden = Boolean(session.sequence || isTimedChart());
      els.wrapupMedalMark.textContent = wrapupBanner?.upgraded
        ? `Medal up · ${displayMedal(moduleStats.medal)}`
        : (count ? displayMedal(moduleStats.medal) : "Medal");
    }
    if (els.wrapupMedal) {
      els.wrapupMedal.hidden = Boolean(session.sequence || isTimedChart());
      els.wrapupMedal.textContent = wrapupBanner?.upgraded
        ? `${displayMedal(moduleStats.medal)} unlocked`
        : (count ? `${count} of 12 keys mastered` : "No medal yet for this module");
    }
    els.nextKey.hidden = !copy.nextKeyLabel;
    if (copy.nextKeyLabel) fillMusicLabel(els.nextKey, copy.nextKeyLabel);
    const nextModule = wrapupNextModule(session);
    if (els.nextModule) {
      els.nextModule.hidden = !nextModule;
      if (nextModule) els.nextModule.textContent = nextModule.label;
    }
  }

  return { renderWrapup };
}
