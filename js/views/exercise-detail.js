import { el, formatMuscle, fmtDate } from "../ui.js";
import {
  lookupExercise,
  exerciseSecondary,
  EXERCISE_SUBSTITUTES,
} from "../rp.js";
import { listCustomExercises, listSets } from "../data.js";

function titleCase(s) {
  return (s || "").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function render(container, name) {
  const decoded = name || "";

  let ex = lookupExercise(decoded);
  let isCustom = false;
  if (!ex) {
    try {
      const customs = await listCustomExercises();
      const c = customs.find(
        (c) => (c.name || "").toLowerCase() === decoded.toLowerCase(),
      );
      if (c) {
        ex = {
          name: c.name,
          group: c.group,
          equipment: c.equipment || "",
          secondary: [],
        };
        isCustom = true;
      }
    } catch {}
  }

  const root = el("div", { class: "exercise-detail-view" });
  container.append(root);

  root.append(
    el("div", { class: "section-title" },
      el("a", { class: "btn small ghost", href: "#/exercises" }, "← Exercises"),
    ),
  );

  if (!ex) {
    root.append(
      el("div", { class: "card" },
        el("h2", {}, "Exercise not found"),
        el("p", { class: "muted" }, `"${decoded}" isn't in the library.`),
      ),
    );
    return;
  }

  root.append(
    el("div", { class: "card exercise-detail-hero" },
      el("h1", { class: "exercise-detail-name" }, ex.name),
      el("div", { class: "exercise-detail-meta" },
        el("span", { class: "primary-pill primary-pill-lg" }, formatMuscle(ex.group || "")),
        ex.equipment ? el("span", { class: "equipment-pill" }, titleCase(ex.equipment)) : null,
        isCustom ? el("span", { class: "custom-pill" }, "Custom") : null,
      ),
    ),
  );

  const sec = exerciseSecondary(ex.name);
  root.append(
    el("section", { class: "card" },
      el("h3", {}, "Secondary muscles"),
      sec.length
        ? el("ul", { class: "exercises-secondary-list" }, ...sec.map((s) =>
            el("li", { class: "exercises-secondary-row" },
              el("span", { class: "secondary-row-name" }, formatMuscle(s.group)),
              el("span", { class: "secondary-row-fraction" }, String(s.fraction)),
            ),
          ))
        : el("p", { class: "muted" }, isCustom
          ? "Custom exercises don't have secondary fractions defined."
          : "No secondary muscles credited."),
      sec.length ? el("p", { class: "muted small fraction-legend" },
        "Fraction = volume credit per set. 0.75+ = near-primary; 0.5 = major; 0.25 = moderate.",
      ) : null,
    ),
  );

  const subs = EXERCISE_SUBSTITUTES[ex.name] || [];
  if (subs.length) {
    root.append(
      el("section", { class: "card" },
        el("h3", {}, "Substitutes"),
        el("div", { class: "exercises-substitutes" }, ...subs.map((s) =>
          el("a", { class: "filter-chip", href: `#/exercises/${encodeURIComponent(s)}` }, s),
        )),
      ),
    );
  }

  // Recent personal sets, if any are logged.
  try {
    const all = await listSets();
    const mine = all
      .filter((s) => s.exercise === ex.name && s.setType !== "warmup")
      .sort((a, b) =>
        b.date.localeCompare(a.date) || (+b.setNumber || 0) - (+a.setNumber || 0),
      )
      .slice(0, 5);
    if (mine.length) {
      root.append(
        el("section", { class: "card" },
          el("h3", {}, "Recent sets"),
          el("ul", { class: "exercises-recent" }, ...mine.map((s) => {
            const rir = s.rir != null && s.rir !== "" ? ` · RIR ${s.rir}` : "";
            return el("li", {},
              el("span", { class: "muted small" }, fmtDate(s.date)),
              " ",
              `${s.weight} × ${s.reps}${rir}`,
            );
          })),
        ),
      );
    }
  } catch {
    // Skip silently if sets aren't available.
  }
}
