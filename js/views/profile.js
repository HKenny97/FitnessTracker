import { el, run, toast, withLoading, formatMuscle } from "../ui.js";
import * as data from "../data.js";
import { MUSCLE_GROUPS, MUSCLE_REGIONS } from "../rp.js";
import { EXPERIENCE_LEVELS, computeLandmarks } from "../profile.js";

const FIELDS = ["MV", "MEV", "MAV_lo", "MAV_hi", "MRV"];
const FIELD_LABEL = { MV: "MV", MEV: "MEV", MAV_lo: "MAV lo", MAV_hi: "MAV hi", MRV: "MRV" };
const shortMuscle = (g) => formatMuscle(String(g || "").replace(/^Shoulders \((.*)\)$/, "$1"));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export async function render(container) {
  const stored = await data.getTrainingProfile();
  const profile = {
    experience: (stored && EXPERIENCE_LEVELS.includes(stored.experience)) ? stored.experience : "intermediate",
    prioritize: new Set((stored && stored.prioritize) || []),
    careful: new Set((stored && stored.careful) || []),
  };
  // Live copy of the user's stored landmarks; updated in place as suggestions
  // are accepted so the "current" column stays accurate without a re-fetch.
  const current = await data.getLandmarks();

  const profileObj = () => ({
    experience: profile.experience,
    prioritize: [...profile.prioritize],
    careful: [...profile.careful],
  });

  function rerender() {
    container.replaceChildren();

    container.append(
      el("div", { class: "section-title" },
        el("h1", {}, "Training profile"),
        el("a", { class: "btn small ghost", href: "#/settings" }, "Done"),
      ),
      el("p", { class: "muted small" },
        "We start from research-based volume landmarks and scale them to you. Pick your experience and the muscles you want to grow or protect, then review the suggested weekly set targets below."),
    );

    // Experience.
    const expCard = el("section", { class: "card" }, el("h3", {}, "Experience level"));
    const expRow = el("div", { class: "chip-row" });
    for (const lvl of EXPERIENCE_LEVELS) {
      expRow.append(el("button", {
        type: "button",
        class: "filter-chip" + (profile.experience === lvl ? " active" : ""),
        onclick: () => { profile.experience = lvl; rerender(); },
      }, cap(lvl)));
    }
    expCard.append(expRow);
    container.append(expCard);

    // Per-muscle emphasis. Prioritize and careful are mutually exclusive in the
    // UI; if both were somehow set, computeLandmarks lets careful win anyway.
    const muscleCard = (title, set, other, hint) => {
      const card = el("section", { class: "card" }, el("h3", {}, title),
        el("p", { class: "muted small" }, hint));
      for (const [region, members] of Object.entries(MUSCLE_REGIONS)) {
        const row = el("div", { class: "chip-row" });
        for (const g of members) {
          row.append(el("button", {
            type: "button",
            class: "filter-chip" + (set.has(g) ? " active" : ""),
            onclick: () => {
              if (set.has(g)) set.delete(g);
              else { set.add(g); other.delete(g); }
              rerender();
            },
          }, shortMuscle(g)));
        }
        card.append(el("div", { class: "picker-filter-label" }, region), row);
      }
      return card;
    };
    container.append(muscleCard("Prioritize / grow", profile.prioritize, profile.careful,
      "Higher volume targets — pushed toward the top of the productive range."));
    container.append(muscleCard("Be careful with / protect", profile.careful, profile.prioritize,
      "Capped low (near maintenance) to protect a tweaky or recovering muscle."));

    const saveBtn = el("button", { class: "btn primary", style: { flex: "1" } }, "Save profile");
    saveBtn.onclick = withLoading(saveBtn, async () => {
      await run(data.saveTrainingProfile(profileObj()), { ok: "Profile saved" });
    });
    container.append(el("div", { class: "row", style: { gap: "0.6rem", marginTop: "0.5rem" } }, saveBtn));

    // ── Suggested landmarks ──
    const suggested = computeLandmarks(profileObj());
    const changed = (g) => FIELDS.some((k) => (current[g] || {})[k] !== suggested[g][k]);
    const changedGroups = MUSCLE_GROUPS.filter((g) => suggested[g] && changed(g));

    const sugCard = el("section", { class: "card" },
      el("div", { class: "row", style: { justifyContent: "space-between", alignItems: "center" } },
        el("h3", { style: { margin: 0 } }, "Suggested weekly sets"),
        el("span", { class: "muted small" }, `${changedGroups.length} change${changedGroups.length === 1 ? "" : "s"}`),
      ),
      el("p", { class: "muted small" }, "Sets per muscle per week. Accept to write to your volume landmarks; you can still fine-tune them in Settings."),
    );

    const acceptOne = async (g) => {
      await run(data.saveLandmark(g, suggested[g]), { ok: `${formatMuscle(g)} updated` });
      current[g] = { ...suggested[g] };
      rerender();
    };

    if (changedGroups.length) {
      const allBtn = el("button", { class: "btn small primary" }, "Accept all");
      allBtn.onclick = withLoading(allBtn, async () => {
        await run(Promise.all(changedGroups.map((g) => data.saveLandmark(g, suggested[g]))), { ok: "Landmarks updated" });
        for (const g of changedGroups) current[g] = { ...suggested[g] };
        rerender();
      });
      sugCard.append(el("div", { class: "row", style: { marginBottom: "0.5rem" } }, allBtn));
    }

    const table = el("table", { class: "meso-grid" },
      el("thead", {}, el("tr", {},
        el("th", { style: { textAlign: "left" } }, "Muscle"),
        ...FIELDS.map((k) => el("th", {}, FIELD_LABEL[k])),
        el("th", {}, ""),
      )),
    );
    const tbody = el("tbody", {});
    for (const g of MUSCLE_GROUPS) {
      if (!suggested[g]) continue;
      const cur = current[g] || {};
      const sug = suggested[g];
      const isChanged = changed(g);
      const cells = [el("td", { class: "muscle" }, formatMuscle(g))];
      for (const k of FIELDS) {
        const diff = cur[k] !== sug[k];
        cells.push(el("td", { style: diff ? { color: "var(--gama-green)", fontWeight: "700" } : {} },
          diff ? `${cur[k] ?? 0}→${sug[k]}` : String(sug[k])));
      }
      const accept = el("button", { class: "btn small" + (isChanged ? "" : " ghost"), disabled: isChanged ? null : true },
        isChanged ? "Accept" : "✓");
      if (isChanged) accept.onclick = withLoading(accept, () => acceptOne(g));
      cells.push(el("td", {}, accept));
      tbody.append(el("tr", {}, ...cells));
    }
    table.append(tbody);
    sugCard.append(table);
    container.append(sugCard);
  }

  rerender();
}
