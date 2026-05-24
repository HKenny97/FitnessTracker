import { el } from "./ui.js";
import { EQUIPMENT_TYPES, MUSCLE_GROUPS } from "./rp.js";

function titleCase(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Bottom-sheet exercise picker. Shows a search box plus equipment and muscle
// filter chips that live-filter a tappable list. onPick is called with
// { name, group, equipment } and the sheet closes.
export function openExercisePicker({ exerciseLib, exclude = [], onPick }) {
  const excludeSet = new Set(exclude);
  const state = { q: "", equipment: "", group: "" };

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

  function chipRow(values, key) {
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
          renderList();
        },
      }, titleCase(v));
      chip.dataset.value = v;
      row.append(chip);
    }
    return row;
  }

  function renderList() {
    const q = state.q.toLowerCase().trim();
    const matches = exerciseLib.filter((e) => {
      if (excludeSet.has(e.name)) return false;
      if (state.equipment && e.equipment !== state.equipment) return false;
      if (state.group && e.group !== state.group) return false;
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

  const sheet = el("div", { class: "picker-sheet" },
    el("div", { class: "picker-head" },
      el("strong", {}, "Add exercise"),
      el("button", { type: "button", class: "btn icon", title: "Close", onclick: close }, "×"),
    ),
    search,
    el("div", { class: "picker-filter-label" }, "Equipment"),
    chipRow(EQUIPMENT_TYPES, "equipment"),
    el("div", { class: "picker-filter-label" }, "Muscle"),
    chipRow(MUSCLE_GROUPS, "group"),
    count,
    list,
  );

  overlay.append(sheet);
  document.body.append(overlay);
  renderList();
  search.focus();
}
