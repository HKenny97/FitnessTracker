import { el, isoToday, run, toast, withLoading, formatMuscle } from "../ui.js";
import * as data from "../data.js";
import { MUSCLE_REGIONS, WORKOUT_PRESETS, MUSCLE_REFERENCE } from "../rp.js";
import { WEEKDAYS, mondayOf, distributeWeeklyGoal, dailyVolume, weeklyGoalWarnings } from "../goals.js";
import { detectWorkoutType } from "../workout-name.js";
import { navigate } from "../router.js";

const shortMuscle = (g) => formatMuscle(String(g || "").replace(/^Shoulders \((.*)\)$/, "$1"));

export async function render(container) {
  const landmarks = await data.getLandmarks();
  const thisMonday = mondayOf(isoToday());

  // scope: "default" = recurring plan; "week" = override for the current week.
  let scope = "default";
  // weekday(0–6) -> { dayName, groups:Set, nameEdited }
  let days = new Map();

  async function loadScope() {
    const weekStart = scope === "week" ? thisMonday : "";
    const plan = await data.getEffectiveWeeklyPlan(weekStart);
    days = new Map();
    for (const d of plan) {
      days.set(d.weekday, { dayName: d.dayName, groups: new Set(d.groups), nameEdited: !!d.dayName });
    }
  }

  // Plan-day objects derived from state, sorted by weekday. dayName falls back to
  // the auto-detected split name when the user hasn't typed one.
  function planDays() {
    return [...days.entries()]
      .map(([weekday, v]) => {
        const groups = [...v.groups];
        return { weekday, dayName: v.dayName || detectWorkoutType(groups), groups };
      })
      .sort((a, b) => a.weekday - b.weekday);
  }

  function autoName(v) {
    if (v.nameEdited) return;
    v.dayName = detectWorkoutType([...v.groups]);
  }

  function rerender() {
    container.replaceChildren();

    container.append(
      el("div", { class: "section-title" },
        el("h1", {}, "Weekly Muscle Goals"),
        el("a", { class: "btn small ghost", href: "#/meso" }, "Done"),
      ),
      el("p", { class: "muted small" },
        "A light plan: choose your training days and the muscles on each. We split each muscle's weekly set target across its days using your volume landmarks."),
    );

    // Scope toggle.
    const scopeRow = el("div", { class: "chip-row", style: { marginBottom: "0.6rem" } });
    const mkScope = (id, label) => el("button", {
      type: "button",
      class: "filter-chip" + (scope === id ? " active" : ""),
      onclick: async () => { if (scope === id) return; scope = id; await loadScope(); rerender(); },
    }, label);
    scopeRow.append(mkScope("default", "Recurring plan"), mkScope("week", "This week only"));
    container.append(scopeRow);

    // Weekday picker.
    const dayRow = el("div", { class: "chip-row" });
    for (let wd = 0; wd < 7; wd++) {
      dayRow.append(el("button", {
        type: "button",
        class: "filter-chip" + (days.has(wd) ? " active" : ""),
        onclick: () => {
          if (days.has(wd)) days.delete(wd);
          else days.set(wd, { dayName: "", groups: new Set(), nameEdited: false });
          rerender();
        },
      }, WEEKDAYS[wd]));
    }
    container.append(el("div", { class: "card" },
      el("div", { class: "picker-filter-label" }, "Training days"),
      dayRow,
    ));

    if (!days.size) {
      container.append(el("p", { class: "muted" }, "Pick the weekdays you train to start building your plan."));
      return;
    }

    // Per-day cards.
    for (const wd of [...days.keys()].sort((a, b) => a - b)) {
      const v = days.get(wd);
      const card = el("div", { class: "day-card" });
      const nameInput = el("input", {
        type: "text",
        value: v.dayName,
        placeholder: detectWorkoutType([...v.groups]) || "Day name",
        style: { fontWeight: 700, fontSize: "1.05rem", maxWidth: "70%" },
        oninput: (e) => { v.dayName = e.target.value; v.nameEdited = e.target.value.trim().length > 0; },
      });
      card.append(el("div", { class: "day-card-head" },
        el("strong", {}, WEEKDAYS[wd] + " · "),
        nameInput,
      ));

      const presetRow = el("div", { class: "chip-row" });
      for (const [name, groups] of Object.entries(WORKOUT_PRESETS)) {
        presetRow.append(el("button", {
          type: "button", class: "filter-chip",
          onclick: () => { v.groups = new Set(groups); autoName(v); rerender(); },
        }, name));
      }
      card.append(el("div", { class: "picker-filter-label" }, "Presets"), presetRow);

      for (const [region, members] of Object.entries(MUSCLE_REGIONS)) {
        const row = el("div", { class: "chip-row" });
        for (const g of members) {
          row.append(el("button", {
            type: "button",
            class: "filter-chip" + (v.groups.has(g) ? " active" : ""),
            onclick: () => { v.groups.has(g) ? v.groups.delete(g) : v.groups.add(g); autoName(v); rerender(); },
          }, shortMuscle(g)));
        }
        card.append(el("div", { class: "picker-filter-label" }, region), row);
      }
      container.append(card);
    }

    const plan = planDays();

    // Distribution summary.
    const dist = distributeWeeklyGoal(plan, landmarks);
    const distCard = el("section", { class: "card" }, el("h3", {}, "Weekly distribution"));
    const muscles = Object.keys(dist).sort();
    if (!muscles.length) {
      distCard.append(el("p", { class: "muted small" }, "Add muscle groups to a day to see the split."));
    }
    for (const m of muscles) {
      const info = dist[m];
      const parts = Object.keys(info.perDay).map(Number).sort((a, b) => a - b)
        .map((wd) => `${WEEKDAYS[wd]} ${info.perDay[wd]}`);
      distCard.append(
        el("div", { class: "row", style: { justifyContent: "space-between", marginTop: "0.35rem" } },
          el("span", {}, el("strong", {}, formatMuscle(m)), el("span", { class: "muted small" }, ` ${info.target} sets`)),
          el("span", { class: "muted small" }, parts.join(" · ")),
        ),
      );
    }
    container.append(distCard);

    // Daily volume: per-day session prescription (muscles × sets, daily total).
    const daily = dailyVolume(plan, landmarks);
    if (daily.length) {
      const dailyCard = el("section", { class: "card" }, el("h3", {}, "Daily volume"));
      for (const d of daily) {
        const head = `${WEEKDAYS[d.weekday]}${d.dayName ? " · " + d.dayName : ""}`;
        const perMuscle = d.muscles.length
          ? d.muscles.map((m) => `${shortMuscle(m.muscle)} ${m.sets}`).join(" · ")
          : "—";
        dailyCard.append(
          el("div", { style: { marginTop: "0.5rem" } },
            el("div", { class: "row", style: { justifyContent: "space-between" } },
              el("strong", {}, head),
              el("span", { class: "muted small" }, `${d.totalSets} set${d.totalSets === 1 ? "" : "s"}`),
            ),
            el("div", { class: "muted small" }, perMuscle),
          ),
        );
      }
      container.append(dailyCard);
    }

    // Warnings.
    for (const w of weeklyGoalWarnings(plan, landmarks, MUSCLE_REFERENCE)) {
      container.append(el("div", { class: "banner " + (w.level === "ok" ? "ok" : "warn") }, w.msg));
    }

    // Actions.
    const saveBtn = el("button", { class: "btn primary", style: { flex: "1" } }, "Save plan");
    saveBtn.onclick = withLoading(saveBtn, async () => {
      const weekStart = scope === "week" ? thisMonday : "";
      await run(data.saveWeeklyPlan(plan, { weekStart }), { ok: "Weekly goals saved" });
      navigate("#/meso");
    });
    container.append(el("div", { class: "row", style: { gap: "0.6rem", marginTop: "1rem" } }, saveBtn));
  }

  await loadScope();
  rerender();
}
