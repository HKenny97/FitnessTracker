import { el, formatMuscle } from "../ui.js";
import {
  EXERCISE_LIBRARY,
  MUSCLE_REGIONS,
  MUSCLE_GROUPS,
  EQUIPMENT_TYPES,
} from "../rp.js";
import { listCustomExercises } from "../data.js";

const STATE_KEY = "exercises:viewState";
const MUSCLE_INDEX = new Map(MUSCLE_GROUPS.map((g, i) => [g, i]));

function titleCase(s) {
  return (s || "").replace(/\b\w/g, (c) => c.toUpperCase());
}

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(s) {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch {}
}

export async function render(container) {
  // Pull custom exercises; tolerate failure (offline / not signed in).
  let customs = [];
  try { customs = await listCustomExercises(); } catch {}

  const builtInLower = new Set(EXERCISE_LIBRARY.map((e) => e.name.toLowerCase()));
  const entries = [
    ...EXERCISE_LIBRARY.map((e) => ({ ...e, _custom: false })),
    ...customs
      .filter((c) => c.name && !builtInLower.has(c.name.toLowerCase()))
      .map((c) => ({
        name: c.name,
        group: c.group,
        equipment: c.equipment || "",
        secondary: [],
        _custom: true,
      })),
  ];

  const persisted = loadState() || {};
  const state = {
    q: persisted.q || "",
    region: persisted.region || "",
    groups: new Set(persisted.groups || []),
    equipment: new Set(persisted.equipment || []),
    includeSecondary: persisted.includeSecondary !== false,
    sort: persisted.sort || "name",
  };
  const persist = () => saveState({
    q: state.q,
    region: state.region,
    groups: [...state.groups],
    equipment: [...state.equipment],
    includeSecondary: state.includeSecondary,
    sort: state.sort,
  });

  function matches(e) {
    if (state.q) {
      if (!e.name.toLowerCase().includes(state.q.toLowerCase())) return false;
    }
    if (state.equipment.size && !state.equipment.has((e.equipment || "").toLowerCase())) {
      return false;
    }
    if (state.groups.size) {
      const inPrimary = state.groups.has(e.group);
      const inSecondary =
        state.includeSecondary &&
        (e.secondary || []).some((s) => state.groups.has(s.group));
      if (!inPrimary && !inSecondary) return false;
    }
    return true;
  }

  function sortedMatches() {
    const list = entries.filter(matches);
    if (state.sort === "primary") {
      list.sort((a, b) => {
        const ai = MUSCLE_INDEX.has(a.group) ? MUSCLE_INDEX.get(a.group) : 999;
        const bi = MUSCLE_INDEX.has(b.group) ? MUSCLE_INDEX.get(b.group) : 999;
        return ai - bi || a.name.localeCompare(b.name);
      });
    } else if (state.sort === "equipment") {
      list.sort((a, b) =>
        (a.equipment || "").localeCompare(b.equipment || "") ||
        a.name.localeCompare(b.name),
      );
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }

  function rowFor(e) {
    const secondaryPills = (e.secondary || []).map((sec) =>
      el("span", { class: "secondary-pill" },
        `${formatMuscle(sec.group)} ${sec.fraction}`,
      ),
    );
    return el("a", {
      class: "picker-row exercise-row",
      href: `#/exercises/${encodeURIComponent(e.name)}`,
    },
      el("div", { class: "exercise-row-main" },
        el("span", { class: "picker-row-name" }, e.name),
        el("span", { class: "primary-pill" }, formatMuscle(e.group || "")),
        e.equipment ? el("span", { class: "equipment-pill" }, titleCase(e.equipment)) : null,
        e._custom ? el("span", { class: "custom-pill" }, "Custom") : null,
      ),
      secondaryPills.length
        ? el("div", { class: "exercise-row-secondary" }, ...secondaryPills)
        : null,
    );
  }

  const root = el("div", { class: "exercises-view" });
  container.append(root);

  function rerender() {
    root.replaceChildren();

    const sortSelect = el("select", {
      class: "exercises-sort",
      "aria-label": "Sort exercises",
      onchange: (e) => { state.sort = e.target.value; persist(); rerender(); },
    },
      el("option", { value: "name", selected: state.sort === "name" ? "" : null }, "Name (A→Z)"),
      el("option", { value: "primary", selected: state.sort === "primary" ? "" : null }, "Primary muscle"),
      el("option", { value: "equipment", selected: state.sort === "equipment" ? "" : null }, "Equipment"),
    );

    root.append(
      el("div", { class: "section-title" },
        el("h1", {}, "Exercises"),
        sortSelect,
      ),
    );

    const searchInput = el("input", {
      type: "text",
      class: "picker-search",
      placeholder: "Search exercises…",
      value: state.q,
      autocomplete: "off",
      oninput: (e) => { state.q = e.target.value; persist(); updateList(); },
    });
    root.append(searchInput);

    // Region (single-select)
    root.append(el("div", { class: "picker-filter-label" }, "Region"));
    const regionRow = el("div", { class: "chip-row" });
    for (const r of Object.keys(MUSCLE_REGIONS)) {
      const chip = el("button", {
        type: "button",
        class: "filter-chip" + (state.region === r ? " active" : ""),
        onclick: () => {
          state.region = state.region === r ? "" : r;
          if (state.region) {
            const allowed = new Set(MUSCLE_REGIONS[state.region]);
            for (const g of [...state.groups]) {
              if (!allowed.has(g)) state.groups.delete(g);
            }
          } else {
            state.groups.clear();
          }
          persist();
          rerender();
        },
      }, r);
      regionRow.append(chip);
    }
    root.append(regionRow);

    // Muscle (multi-select, only when region is set)
    if (state.region) {
      root.append(el("div", { class: "picker-filter-label" }, "Muscle"));
      const muscleRow = el("div", { class: "chip-row" });
      for (const m of MUSCLE_REGIONS[state.region]) {
        const chip = el("button", {
          type: "button",
          class: "filter-chip" + (state.groups.has(m) ? " active" : ""),
          onclick: () => {
            if (state.groups.has(m)) state.groups.delete(m);
            else state.groups.add(m);
            persist();
            rerender();
          },
        }, formatMuscle(m));
        muscleRow.append(chip);
      }
      root.append(muscleRow);

      root.append(
        el("label", { class: "exercises-toggle" },
          el("input", {
            type: "checkbox",
            checked: state.includeSecondary ? "" : null,
            onchange: (e) => {
              state.includeSecondary = e.target.checked;
              persist();
              rerender();
            },
          }),
          " Include exercises where the muscle is secondary",
        ),
      );
    }

    // Equipment (multi-select)
    root.append(el("div", { class: "picker-filter-label" }, "Equipment"));
    const eqRow = el("div", { class: "chip-row" });
    for (const v of EQUIPMENT_TYPES) {
      const chip = el("button", {
        type: "button",
        class: "filter-chip" + (state.equipment.has(v) ? " active" : ""),
        onclick: () => {
          if (state.equipment.has(v)) state.equipment.delete(v);
          else state.equipment.add(v);
          persist();
          rerender();
        },
      }, titleCase(v));
      eqRow.append(chip);
    }
    root.append(eqRow);

    // Clear all (only when something is active)
    const anyActive =
      state.q || state.region || state.groups.size || state.equipment.size;
    if (anyActive) {
      root.append(
        el("button", {
          type: "button",
          class: "btn small ghost exercises-clear",
          onclick: () => {
            state.q = "";
            state.region = "";
            state.groups.clear();
            state.equipment.clear();
            persist();
            rerender();
          },
        }, "Clear filters"),
      );
    }

    const count = el("div", { class: "picker-count" });
    const list = el("div", { class: "exercises-list" });
    root.append(count, list);

    function updateList() {
      const ms = sortedMatches();
      count.textContent = `${ms.length} exercise${ms.length === 1 ? "" : "s"}`;
      list.replaceChildren();
      if (!ms.length) {
        list.append(el("p", { class: "muted picker-empty" }, "No exercises match those filters."));
        return;
      }
      for (const e of ms) list.append(rowFor(e));
    }

    updateList();
  }

  rerender();
}
