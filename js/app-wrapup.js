import { fillMusicLabel } from "./engrave.js";
import { lessonPassedKeys } from "./medals.js";
import { lessonById, moduleForLesson } from "./registry.js";
import { currentKeyId, isPracticeLesson, lessonVinylTier, wrapupCopy } from "./session.js";

const TIER_RANK = { black: 0, bronze: 1, silver: 2, gold: 3 };

/** Compute the current vinyl tier for any active session (sequence, timed, or key-based). */
export function sessionVinylTier(session, mastery) {
  if (!session) return "black";
  if (session.sequence) {
    const passed = session.sequence.filter((item) => (
      mastery?.lessons?.[item.lessonId]?.passedKeys?.includes(item.keyId)
    )).length;
    if (passed >= session.sequence.length && session.sequence.length > 0) return "gold";
    return passed > 0 ? "bronze" : "black";
  }
  const lesson = lessonById(session.lessonId);
  const passed = lessonPassedKeys(mastery, lesson.id);
  if (lesson.chartTimed) return passed.includes(currentKeyId(session)) ? "gold" : "black";
  return lessonVinylTier(lesson, passed.length);
}

function sleeveNumber(lesson, session, module) {
  if (lesson.chartTimed) return "03";
  if (session.sequence) return lesson.kind === "learn" ? "01" : "02";
  if (isPracticeLesson(lesson)) return "Integrate";
  const gradedIndex = module.lessons.filter((item) => !isPracticeLesson(item)).findIndex((item) => item.id === lesson.id);
  return String(Math.max(0, gradedIndex) + 1).padStart(2, "0");
}

function sleeveCoverTitle(lesson, session) {
  if (lesson.chartTimed) return "Master";
  if (session.sequence) return lesson.kind === "learn" ? "Learn" : "Practice";
  if (lesson.kind === "learn") return "Learn";
  if (lesson.kind === "master") return "Master";
  return lesson.coverTitle;
}

/** Create the lesson summary (wrap-up) screen renderer. */
export function createWrapupView({
  els,
  getSession,
  getWrapupBanner,
  shownMastery,
  getNextLesson,
}) {
  function renderWrapup() {
    const session = getSession();
    const wrapupBanner = getWrapupBanner();
    const copy = wrapupCopy(session);
    const lesson = lessonById(session.lessonId);
    const module = moduleForLesson(lesson.id);
    els.shell.dataset.sleeve = lesson.sleeve;

    if (els.wrapupKicker) els.wrapupKicker.textContent = copy.kicker;
    if (els.wrapupHeading) els.wrapupHeading.textContent = copy.heading;
    if (els.wrapupDetail) fillMusicLabel(els.wrapupDetail, copy.detail);

    if (els.wrapupSleeve) {
      const tier = sessionVinylTier(session, shownMastery());
      const upgraded = Boolean(wrapupBanner?.upgraded)
        || (session.startVinylTier != null && TIER_RANK[tier] > TIER_RANK[session.startVinylTier]);
      els.wrapupSleeve.hidden = false;
      els.wrapupSleeve.dataset.sleeve = lesson.sleeve;
      els.wrapupSleeve.classList.toggle("is-upgrade", upgraded);
      const wrapVinyl = els.wrapupSleeve.querySelector(".vinyl");
      if (wrapVinyl) wrapVinyl.dataset.tier = tier;
    }
    if (els.wrapupSleeveNum) {
      els.wrapupSleeveNum.textContent = sleeveNumber(lesson, session, module);
    }
    if (els.wrapupSleeveTitle) {
      els.wrapupSleeveTitle.textContent = sleeveCoverTitle(lesson, session);
    }

    const grade = copy.grade ?? { percent: null, label: "", perfect: false, segments: null };
    if (els.wrapupGrade) {
      els.wrapupGrade.dataset.perfect = String(Boolean(grade.perfect));
      els.wrapupGrade.dataset.zero = String(grade.percent === 0);
    }
    if (els.wrapupGradeScore) {
      els.wrapupGradeScore.textContent = grade.percent === null ? "—" : `${grade.percent}%`;
    }
    if (els.wrapupGradeDetail) {
      els.wrapupGradeDetail.textContent = grade.label;
    }
    if (els.wrapupGradeBar) {
      if (Array.isArray(grade.segments) && grade.segments.length) {
        els.wrapupGradeBar.hidden = false;
        els.wrapupGradeBar.dataset.kind = "segments";
        els.wrapupGradeBar.replaceChildren(
          ...grade.segments.map((state) => {
            const seg = document.createElement("span");
            seg.className = "wrapup-seg";
            seg.dataset.state = state;
            return seg;
          }),
        );
      } else if (grade.percent !== null) {
        els.wrapupGradeBar.hidden = false;
        els.wrapupGradeBar.dataset.kind = "meter";
        const fill = document.createElement("span");
        fill.className = "wrapup-meter-fill";
        fill.style.width = `${Math.max(0, Math.min(100, grade.percent))}%`;
        els.wrapupGradeBar.replaceChildren(fill);
      } else {
        els.wrapupGradeBar.hidden = true;
        delete els.wrapupGradeBar.dataset.kind;
        els.wrapupGradeBar.replaceChildren();
      }
    }

    const missed = copy.missed ?? [];
    const hasMissed = missed.length > 0;
    if (els.wrapupMissed) els.wrapupMissed.hidden = !hasMissed;
    if (els.wrapupMissedTitle) els.wrapupMissedTitle.textContent = copy.missedTitle ?? "";
    if (els.wrapupMissedCount) els.wrapupMissedCount.textContent = hasMissed ? String(missed.length) : "";
    if (els.resultList) {
      if (hasMissed) {
        const statuses = new Set(missed.map((item) => item.status));
        const showStatusTag = statuses.size > 1 || statuses.has("peeked") || Boolean(lesson.chartTimed);
        els.resultList.replaceChildren(
          ...missed.map((item) => {
            const li = document.createElement("li");
            li.dataset.status = item.status;
            const dot = document.createElement("span");
            dot.className = "missed-dot";
            dot.setAttribute("aria-hidden", "true");
            const key = document.createElement("span");
            key.className = "missed-key";
            fillMusicLabel(key, item.label);
            li.append(dot, key);
            if (showStatusTag || item.detail) {
              const tag = document.createElement("span");
              tag.className = "missed-tag";
              tag.textContent = item.detail && !lesson.chartTimed ? item.detail : item.statusLabel;
              li.append(tag);
            }
            return li;
          }),
        );
      } else {
        els.resultList.replaceChildren();
      }
    }

    const next = getNextLesson ? getNextLesson(session) : null;
    if (els.wrapupNext) {
      els.wrapupNext.hidden = !next;
      if (next) fillMusicLabel(els.wrapupNext, next.label);
    }
    if (els.wrapupClose) {
      els.wrapupClose.hidden = false;
    }
  }

  return { renderWrapup };
}
