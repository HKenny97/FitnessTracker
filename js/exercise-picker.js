import { el } from "./ui.js";
import { EQUIPMENT_TYPES, MUSCLE_REGIONS } from "./rp.js";

function titleCase(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Bottom-sheet exercise picker. Shows a search box plus equipment and muscle
// filter chips that live-filter a tappable list. onPick is called with
// { name, group, equipment } and the sheet closes.
// When `includeCardio` is set, a Strength/Cardio category toggle appears; in the
// Cardio category the list shows `cardioTypes` and onPick gets
// { name, group:"", equipment:"", cardio:true, cardioType } instead.
export function openExercisePicker({ exerciseLib, exclude = [], onPick, includeCardio = false, cardioTypes = [] }) {
  const excludeSet = new Set(exclude);
  const state = { q: "", equipment: "", region: "", group: "", cat: "strength" };

  const overlay = el("div", { class: "picker-overlay" });
  const close = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) close(); };

  const search = el("input", {
    type: "text",
    class: "picker-search",
    placeholder: "Search exercises…",
    autocomplete: "off",
  });
  search.addEventListener("input", () => { state.q = search.value; renderList(); });

  const count = el("div", { class: "picker-count" });
  const list = el("div", { class: "picker-list" });

  function chipRow(values, key, onChange) {
    const row = el("div", { class: "chip-row" });
    for (const v of values) {
      const chip = el("button", {
        type: "button",
        class: "filter-chip",
        onclick: () => {
          state[key] = state[key] === v ? "" : v;
          for (const c of row.children) {
            c.classList.toggle("active", c.dataset.value === state[key] && !!state[key]);
          }
          if (onChange) onChange();
          renderList();
        },
      }, titleCase(v));
      chip.dataset.value = v;
      row.append(chip);
    }
    return row;
  }

  // Sub-row of muscles for the selected region; empty until a region is picked.
  const muscleRow = el("div", {});
  function rebuildMuscleRow() {
    muscleRow.replaceChildren();
    if (!state.region) return;
    muscleRow.append(
      el("div", { class: "picker-filter-label" }, "Muscle"),
      chipRow(MUSCLE_REGIONS[state.region], "group"),
    );
  }

  function renderList() {
    const q = state.q.toLowerCase().trim();
    if (state.cat === "cardio") {
      const types = cardioTypes.filter((t) => !q || t.toLowerCase().includes(q));
      count.textContent = `${types.length} type${types.length === 1 ? "" : "s"}`;
      list.replaceChildren();
      for (const t of types) {
        const row = el("div", { class: "picker-row" },
          el("span", { class: "picker-row-name" }, t),
          el("span", { class: "equipment-pill" }, "Cardio"),
        );
        row.onclick = () => { onPick({ name: t, group: "", equipment: "", cardio: true, cardioType: t }); close(); };
        list.append(row);
      }
      if (!types.length) list.append(el("p", { class: "muted picker-empty" }, "No cardio types match."));
      return;
    }
    const matches = exerciseLib.filter((e) => {
      if (excludeSet.has(e.name)) return false;
      if (state.equipment && e.equipment !== state.equipment) return false;
      if (state.group) {
        if (e.group !== state.group) return false;
      } else if (state.region && !MUSCLE_REGIONS[state.region].includes(e.group)) {
        return false;
      }
      if (q && !e.name.toLowerCase().includes(q)) return false;
      return true;
    });
    count.textContent = `${matches.length} exercise${matches.length === 1 ? "" : "s"}`;
    list.replaceChildren();
    if (!matches.length) {
      list.append(el("p", { class: "muted picker-empty" }, "No exercises match those filters."));
      return;
    }
    for (const e of matches) {
      const row = el("div", { class: "picker-row" },
        el("span", { class: "picker-row-name" }, e.name),
        e.equipment ? el("span", { class: "equipment-pill" }, titleCase(e.equipment)) : null,
      );
      row.onclick = () => {
        onPick({ name: e.name, group: e.group, equipment: e.equipment || "" });
        close();
      };
      list.append(row);
    }
  }

  // Strength-only filters, grouped so they can be hidden in the Cardio category.
  const strengthFilters = el("div", {},
    el("div", { class: "picker-filter-label" }, "Region"),
    chipRow(Object.keys(MUSCLE_REGIONS), "region", () => { state.group = ""; rebuildMuscleRow(); }),
    muscleRow,
    el("div", { class: "picker-filter-label" }, "Equipment"),
    chipRow(EQUIPMENT_TYPES, "equipment"),
  );

  // Optional Strength/Cardio category toggle.
  let categoryRow = null;
  if (includeCardio) {
    const row = el("div", { class: "chip-row" });
    const mk = (key, label) => {
      const chip = el("button", { type: "button", class: "filter-chip" + (state.cat === key ? " active" : ""), onclick: () => {
        state.cat = key;
        for (const c of row.children) c.classList.toggle("active", c.dataset.value === key);
        strengthFilters.style.display = key === "cardio" ? "none" : "";
        search.placeholder = key === "cardio" ? "Search cardio…" : "Search exercises…";
        renderList();
      } }, label);
      chip.dataset.value = key;
      return chip;
    };
    row.append(mk("strength", "Strength"), mk("cardio", "Cardio"));
    categoryRow = el("div", {}, el("div", { class: "picker-filter-label" }, "Category"), row);
  }

  const sheet = el("div", { class: "picker-sheet" },
    el("div", { class: "picker-head" },
      el("strong", {}, "Add to workout"),
      el("button", { type: "button", class: "btn icon", title: "Close", onclick: close }, "×"),
    ),
    search,
    categoryRow,
    strengthFilters,
    count,
    list,
  );

  overlay.append(sheet);
  document.body.append(overlay);
  renderList();
  // Intentionally do NOT autofocus the search box: on mobile that pops up the
  // keyboard and hides the equipment/muscle filter chips. The user taps the
  // search field when they actually want to type.
}
