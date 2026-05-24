import { el, isoToday, run, fmtDate, toast, withLoading, confirmModal } from "../ui.js";
import * as data from "../data.js";
import { MUSCLE_GROUPS, PROGRAM_TEMPLATES, EXERCISE_SUBSTITUTES, progressSets, progressRIR } from "../rp.js";
import { navigate } from "../router.js";
import { openExercisePicker } from "../exercise-picker.js";

// Template "type" is derived from the program name (templates carry no
// explicit category). Order is also the display order of the type chips.
const TEMPLATE_TYPE_ORDER = [
  "Full Body",
  "Push / Pull / Legs",
  "Upper / Lower",
  "Body-Part Split",
  "Powerbuilding / Strength",
  "Equipment-Focused",
  "Hybrid / Other",
];

function templateType(tpl) {
  const n = tpl.name.toLowerCase();
  if (/hammer strength only|cable-only|bodyweight only|dumbbell-only|machine-heavy/.test(n)) return "Equipment-Focused";
  if (/phul|phat|5\/3\/1|gzcl|texas method|novice linear|powerbuilding/.test(n)) return "Powerbuilding / Strength";
  if (/full body/.test(n)) return "Full Body";
  if (/upper \/ lower|upper emphasis|lower emphasis|torso \/ limbs/.test(n)) return "Upper / Lower";
  if (/push \/ pull \/ legs|\bppl\b|push \/ pull|legs \/ arms/.test(n)) return "Push / Pull / Legs";
  if (/bro split|arnold|chest & back|chest & triceps|chest & arms|shoulders & arms/.test(n)) return "Body-Part Split";
  return "Hybrid / Other";
}

// Training frequency (sessions per week). Prefer the canonical "(N-Day)" in the
// name — for A/B programs (e.g. "Novice Linear Progression (3-Day A/B)") the
// number of distinct day layouts (days.length) is fewer than the weekly
// frequency. Fall back to days.length when the name has no day token.
function templateDaysPerWeek(tpl) {
  const m = tpl.name.match(/(\d+)\s*-\s*day/i);
  return m ? +m[1] : tpl.days.length;
}

// Case/whitespace-insensitive substitute lookup, built once from the static
// table. Slot names are free text and the table keys are display-cased, so we
// normalize on both sides rather than rely on exact string equality.
const normalizeName = (s) => (s || "").trim().toLowerCase();
const SUBSTITUTES_BY_KEY = new Map(
  Object.entries(EXERCISE_SUBSTITUTES).map(([name, subs]) => [normalizeName(name), subs]),
);

function buildExerciseInput(exerciseLib, ex, onSelect) {
  const wrapper = el("div", { class: "exercise-picker-wrap" });
  const input = el("input", {
    type: "text",
    value: ex.exercise,
    placeholder: "Search exercises…",
    autocomplete: "off",
  });
  const dropdown = el("div", { class: "exercise-dropdown" });
  const browse = el("button", {
    type: "button",
    class: "btn small ghost picker-browse-btn",
    title: "Browse by equipment",
    onclick: () => openExercisePicker({
      exerciseLib,
      onPick: ({ name, group }) => {
        input.value = name;
        ex.exercise = name;
        onSelect(name, group);
        dropdown.classList.remove("open");
      },
    }),
  }, "Browse");
  wrapper.append(el("div", { class: "picker-input-row" }, input, browse), dropdown);

  // The exercise currently assigned to this slot, captured before the user
  // edits the box (typing overwrites ex.exercise). Used to surface this
  // exercise's acceptable substitutes when swapping it out. After a pick the
  // caller rerenders, so this is recaptured fresh for the newly chosen one.
  const original = ex.exercise;
  const originalKey = normalizeName(original);
  // Case-insensitive index of the library by name, so substitute resolution
  // and matches survive casing/whitespace drift between table and library.
  const libByName = new Map(exerciseLib.map((e) => [normalizeName(e.name), e]));
  // Flips true once the user edits the box. Until then we behave as if the
  // query were empty and surface the slot's substitutes up front.
  let touched = false;

  function search(query) {
    dropdown.replaceChildren();
    const fq = touched ? normalizeName(query) : "";

    const currentGroup = ex.muscleGroup || null;

    // Acceptable substitutes for the exercise in this slot, resolved against
    // the library case-insensitively and filtered by the typed query.
    const subNames = SUBSTITUTES_BY_KEY.get(originalKey) || [];
    const subSet = new Set(subNames.map(normalizeName));
    const subMatches = subNames
      .map((s) => libByName.get(normalizeName(s)))
      .filter(Boolean)
      .filter((e) => !fq || normalizeName(e.name).includes(fq));

    // Other exercises matching the typed query (only once something is typed).
    const nameMatches = fq
      ? exerciseLib.filter((e) => normalizeName(e.name).includes(fq) && !subSet.has(normalizeName(e.name)))
      : [];

    // Same-group suggestions: while typing, and on focus when the slot has no
    // substitute entry to fall back on (e.g. a free-text exercise name).
    const showGroup = currentGroup && (fq || (!touched && !subMatches.length));
    const groupMatches = showGroup
      ? exerciseLib
          .filter((e) => e.group === currentGroup
            && normalizeName(e.name) !== originalKey
            && !subSet.has(normalizeName(e.name))
            && (!fq || normalizeName(e.name).includes(fq))
            && !nameMatches.some((m) => m.name === e.name))
          .slice(0, 8)
      : [];

    if (!subMatches.length && !nameMatches.length && !groupMatches.length) {
      dropdown.classList.remove("open");
      return;
    }

    function addSection(label, items) {
      if (!items.length) return;
      dropdown.append(el("div", { class: "exercise-dropdown-label" }, label));
      for (const item of items) {
        const opt = el("div", { class: "exercise-dropdown-item" },
          el("span", {}, item.name),
          el("span", { class: "muted small" }, item.group),
        );
        opt.onmousedown = (e) => {
          e.preventDefault();
          input.value = item.name;
          onSelect(item.name, item.group);
          dropdown.classList.remove("open");
        };
        dropdown.append(opt);
      }
    }

    addSection(original ? `Substitutes for ${original}` : "Substitutes", subMatches.slice(0, 12));
    addSection("Matches", nameMatches.slice(0, 10));
    addSection(currentGroup || "Same group", groupMatches);
    dropdown.classList.add("open");
  }

  input.addEventListener("input", () => {
    touched = true;
    ex.exercise = input.value;
    search(input.value);
  });
  input.addEventListener("focus", () => search(input.value));
  input.addEventListener("blur", () => {
    setTimeout(() => dropdown.classList.remove("open"), 150);
  });

  return wrapper;
}

export async function renderList(container) {
  const mesos = await data.listMesocycles();
  container.append(
    el("div", { class: "section-title" },
      el("h1", {}, "Mesocycles"),
      el("a", { class: "btn primary", href: "#/meso/new" }, "+ New mesocycle"),
    ),
  );
  if (!mesos.length) {
    container.append(el("p", { class: "muted" }, "No mesocycles yet."));
    return;
  }
  for (const m of mesos.slice().reverse()) {
    container.append(
      el("a", { class: "card", href: `#/meso/${m.id}`, style: { display: "block" } },
        el("div", { class: "card-row" },
          el("div", {},
            el("strong", {}, m.name),
            el("div", { class: "muted small" },
              `${m.weeks} weeks · started ${fmtDate(m.startDate)} · ${m.status}`,
            ),
          ),
          el("span", { class: "muted" }, "›"),
        ),
      ),
    );
  }
}

// In-memory mesocycle being designed.
let dayCounter = 0;
const blankDay = () => ({
  name: "Day " + (++dayCounter),
  exercises: [],
});

export async function renderNew(container) {
  const [landmarks, exerciseLib] = await Promise.all([
    data.getLandmarks(),
    data.getFullExerciseLibrary(),
  ]);

  const state = {
    name: "Mesocycle " + new Date().toLocaleDateString(undefined, { month: "short", year: "numeric" }),
    startDate: isoToday(),
    weeks: 5,
    days: [
      { name: "Push", exercises: [
        { exercise: "Barbell Bench Press", muscleGroup: "Chest" },
        { exercise: "Overhead Press", muscleGroup: "Shoulders (side delts)" },
        { exercise: "Triceps Pushdown", muscleGroup: "Triceps" },
      ] },
      { name: "Pull", exercises: [
        { exercise: "Lat Pulldown", muscleGroup: "Back" },
        { exercise: "Cable Row", muscleGroup: "Back" },
        { exercise: "Barbell Curl", muscleGroup: "Biceps" },
      ] },
      { name: "Legs", exercises: [
        { exercise: "Back Squat", muscleGroup: "Quads" },
        { exercise: "Romanian Deadlift", muscleGroup: "Hamstrings" },
        { exercise: "Standing Calf Raise", muscleGroup: "Calves" },
      ] },
    ],
    notes: "",
  };

  // Template-picker filters (persist across rerenders). "" means "All".
  const tplFilter = { days: "", type: "" };

  function rerender() {
    container.replaceChildren();
    container.append(buildForm());
  }

  function applyTemplate(tpl) {
    state.days = tpl.days.map((d) => ({
      name: d.name,
      exercises: d.exercises.map((e) => ({ exercise: e.exercise, muscleGroup: e.muscleGroup })),
    }));
    state.name = tpl.name + " — " + new Date().toLocaleDateString(undefined, { month: "short", year: "numeric" });
    rerender();
  }

  function buildForm() {
    const wrap = el("div", {});
    wrap.append(el("h1", {}, "New mesocycle"));

    // Template picker
    const dayOptions = [...new Set(PROGRAM_TEMPLATES.map((t) => templateDaysPerWeek(t)))].sort((a, b) => a - b);
    const typeOptions = TEMPLATE_TYPE_ORDER.filter((t) =>
      PROGRAM_TEMPLATES.some((tpl) => templateType(tpl) === t));

    const grid = el("div", { class: "template-grid" });

    function renderTemplateGrid() {
      grid.replaceChildren();
      const matches = PROGRAM_TEMPLATES.filter((tpl) =>
        (!tplFilter.days || templateDaysPerWeek(tpl) === tplFilter.days) &&
        (!tplFilter.type || templateType(tpl) === tplFilter.type));
      if (!matches.length) {
        grid.append(el("p", { class: "muted small" }, "No templates match those filters."));
        return;
      }
      for (const tpl of matches) {
        grid.append(
          el("button", { class: "btn template-btn", onclick: () => applyTemplate(tpl) },
            el("strong", {}, tpl.name),
            el("span", { class: "muted small" }, `${templateDaysPerWeek(tpl)} days · ${templateType(tpl)}`),
          ),
        );
      }
    }

    function filterChipRow(key, options, formatter) {
      const row = el("div", { class: "chip-row" });
      const mkChip = (value, text) => {
        const chip = el("button", {
          type: "button",
          class: "filter-chip" + (tplFilter[key] === value ? " active" : ""),
          onclick: () => {
            tplFilter[key] = value;
            for (const c of row.children) {
              c.classList.toggle("active", c.dataset.value === String(value));
            }
            renderTemplateGrid();
          },
        }, text);
        chip.dataset.value = String(value);
        return chip;
      };
      row.append(mkChip("", "All"));
      for (const o of options) row.append(mkChip(o, formatter(o)));
      return row;
    }

    wrap.append(
      el("section", { class: "card" },
        el("h2", {}, "Start from a template"),
        el("p", { class: "muted small" }, "Pick a program to pre-fill days and exercises, or skip and build your own below."),
        el("div", { class: "picker-filter-label" }, "Days per week"),
        filterChipRow("days", dayOptions, (d) => `${d}-day`),
        el("div", { class: "picker-filter-label" }, "Type"),
        filterChipRow("type", typeOptions, (t) => t),
        grid,
      ),
    );
    renderTemplateGrid();

    wrap.append(
      el("div", { class: "card" },
        el("div", { class: "field" },
          el("label", {}, "Name"),
          el("input", {
            type: "text", value: state.name,
            oninput: (e) => (state.name = e.target.value),
          }),
        ),
        el("div", { class: "field-row" },
          el("div", { class: "field" },
            el("label", {}, "Start date"),
            el("input", {
              type: "date", value: state.startDate,
              oninput: (e) => (state.startDate = e.target.value),
            }),
          ),
          el("div", { class: "field" },
            el("label", {}, "Length (weeks, includes deload)"),
            el("select", {
              onchange: (e) => { state.weeks = +e.target.value; rerender(); },
            },
              ...[4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) =>
                el("option", { value: n, selected: state.weeks === n ? "" : null }, `${n} weeks`)),
            ),
          ),
        ),
        el("div", { class: "field" },
          el("label", {}, "Notes"),
          el("textarea", {
            rows: 2,
            oninput: (e) => (state.notes = e.target.value),
          }, state.notes),
        ),
      ),
    );

    wrap.append(el("div", { class: "section-title" }, el("h2", {}, "Training days")));
    state.days.forEach((day, di) => wrap.append(buildDay(day, di)));

    wrap.append(
      el("button", {
        class: "btn", style: { marginBottom: "1rem" },
        onclick: () => { state.days.push(blankDay()); rerender(); },
      }, "+ Add day"),
    );

    wrap.append(buildPreview());

    const createBtn = el("button", { class: "btn primary" }, "Create mesocycle");
    createBtn.onclick = withLoading(createBtn, save);
    wrap.append(
      el("div", { class: "row between", style: { marginTop: "1.5rem" } },
        el("a", { class: "btn ghost", href: "#/meso" }, "Cancel"),
        createBtn,
      ),
    );

    return wrap;
  }

  function buildDay(day, di) {
    const card = el("div", { class: "day-card" });
    card.append(
      el("div", { class: "day-card-head" },
        el("input", {
          type: "text", value: day.name,
          style: { fontWeight: 700, fontSize: "1.05rem", maxWidth: "60%" },
          oninput: (e) => (day.name = e.target.value),
        }),
        el("button", {
          class: "btn small danger ghost",
          onclick: () => { state.days.splice(di, 1); rerender(); },
        }, "Remove day"),
      ),
    );

    day.exercises.forEach((ex, ei) => {
      card.append(
        el("div", { class: "field-row exercise-edit-row", style: { marginTop: "0.5rem", alignItems: "end" } },
          el("div", {},
            el("label", {}, "Exercise"),
            buildExerciseInput(exerciseLib, ex, (name, group) => {
              ex.exercise = name;
              if (!ex.muscleGroup) ex.muscleGroup = group;
              rerender();
            }),
          ),
          el("div", {},
            el("label", {}, "Muscle group"),
            el("div", { class: "row" },
              el("select", {
                style: { flex: 1 },
                onchange: (e) => (ex.muscleGroup = e.target.value),
              },
                el("option", { value: "" }, "— select —"),
                ...MUSCLE_GROUPS.map((g) =>
                  el("option", { value: g, selected: ex.muscleGroup === g ? "" : null }, g)),
              ),
              el("button", {
                class: "btn icon",
                title: "Remove",
                onclick: () => { day.exercises.splice(ei, 1); rerender(); },
              }, "×"),
            ),
          ),
        ),
      );
    });

    card.append(
      el("button", {
        class: "btn small", style: { marginTop: "0.6rem" },
        onclick: () => {
          day.exercises.push({ exercise: "", muscleGroup: "" });
          rerender();
        },
      }, "+ Add exercise"),
    );

    return card;
  }

  function buildPreview() {
    // Aggregate muscle groups across all days; show weekly set progression.
    const groups = new Set();
    for (const d of state.days)
      for (const e of d.exercises)
        if (e.muscleGroup) groups.add(e.muscleGroup);
    if (!groups.size) return el("div", {});

    const rir = progressRIR(state.weeks);
    const rows = [...groups].sort().map((g) => {
      const lm = landmarks[g] || { MEV: 8, MRV: 22 };
      const sets = progressSets(lm.MEV, lm.MRV, state.weeks);
      return el("tr", {},
        el("td", { class: "muscle" }, g),
        ...sets.map((s, i) =>
          el("td", { class: i === state.weeks - 1 ? "deload" : "" }, s)),
      );
    });
    const weekHeaders = [];
    for (let i = 0; i < state.weeks; i++) {
      weekHeaders.push(
        el("th", {},
          `W${i + 1}`,
          el("div", { class: "muted small" }, i === state.weeks - 1 ? "deload" : `${rir[i]} RIR`),
        ),
      );
    }

    return el("section", { class: "card" },
      el("h3", {}, "Volume preview"),
      el("p", { class: "muted small" },
        "Working sets per muscle group per week. Based on your saved volume landmarks; tweak them in Settings."),
      el("table", { class: "meso-grid" },
        el("thead", {},
          el("tr", {}, el("th", { style: { textAlign: "left" } }, "Muscle"), ...weekHeaders),
        ),
        el("tbody", {}, ...rows),
      ),
    );
  }

  async function save() {
    if (!state.name.trim()) return toast("Name is required", "bad");
    if (!state.days.some((d) => d.exercises.some((e) => e.exercise && e.muscleGroup))) {
      return toast("Add at least one exercise", "bad");
    }
    // Strip incomplete exercises.
    const days = state.days.map((d) => ({
      name: d.name || "Day",
      exercises: d.exercises.filter((e) => e.exercise && e.muscleGroup),
    }));
    const id = await run(
      data.createMesocycle({
        name: state.name.trim(),
        startDate: state.startDate,
        weeks: state.weeks,
        days,
        notes: state.notes,
      }),
      { ok: "Mesocycle created" },
    );
    navigate(`#/meso/${id}`);
  }

  rerender();
}

export async function renderDetail(container, id) {
  const meso = await data.getMesocycle(id);
  if (!meso) {
    container.append(el("p", {}, "Mesocycle not found."));
    return;
  }
  const [template, plan, landmarks] = await Promise.all([
    data.getTemplate(id),
    data.getWeekPlan(id),
    data.getLandmarks(),
  ]);

  const actionBtns = [];
  if (meso.status !== "active") {
    const btn = el("button", { class: "btn" }, "Set active");
    btn.onclick = withLoading(btn, async () => {
      await run(data.setMesocycleStatus(id, "active"), { ok: "Set active" });
      navigate("#/");
    });
    actionBtns.push(btn);
  }
  if (meso.status !== "complete") {
    const btn = el("button", { class: "btn" }, "Mark complete");
    btn.onclick = withLoading(btn, async () => {
      await run(data.setMesocycleStatus(id, "complete"), { ok: "Marked complete" });
      navigate("#/meso");
    });
    actionBtns.push(btn);
  }
  const deleteBtn = el("button", { class: "btn danger ghost" }, "Delete");
  deleteBtn.onclick = () => {
    confirmModal("Delete this mesocycle and all its data? This cannot be undone.", async () => {
      await run(data.deleteMesocycle(id), { ok: "Mesocycle deleted" });
      navigate("#/meso");
    });
  };
  actionBtns.push(deleteBtn);

  const editBtn = el("button", { class: "btn" }, "Edit");
  editBtn.onclick = async () => {
    container.replaceChildren();
    await renderEdit(container, id);
  };
  actionBtns.push(editBtn);

  const dupBtn = el("button", { class: "btn" }, "Duplicate");
  dupBtn.onclick = withLoading(dupBtn, async () => {
    const newId = await run(data.duplicateMesocycle(id), { ok: "Duplicated" });
    if (newId) navigate(`#/meso/${newId}`);
  });
  actionBtns.push(dupBtn);

  container.append(
    el("div", { class: "section-title" },
      el("div", {},
        el("h1", {}, meso.name),
        el("div", { class: "muted" },
          `${meso.weeks} weeks · ${fmtDate(meso.startDate)} · ${meso.status}`,
        ),
      ),
      el("div", { class: "row" }, ...actionBtns),
    ),
  );

  // Volume plan table
  const weeks = +meso.weeks;
  const groups = [...new Set(plan.map((p) => p.muscleGroup))].sort();
  const head = el("thead", {},
    el("tr", {},
      el("th", { style: { textAlign: "left" } }, "Muscle"),
      ...Array.from({ length: weeks }, (_, i) =>
        el("th", {}, `W${i + 1}`)),
    ),
  );
  const body = el("tbody", {},
    ...groups.map((g) => {
      const row = el("tr", {}, el("td", { class: "muscle" }, g));
      for (let w = 1; w <= weeks; w++) {
        const p = plan.find((x) => x.muscleGroup === g && x.week === w);
        const cell = p
          ? `${p.targetSets} (${p.isDeload ? "deload" : p.targetRIR + " RIR"})`
          : "—";
        row.append(el("td", { class: p?.isDeload ? "deload" : "" }, cell));
      }
      return row;
    }),
  );
  container.append(
    el("section", { class: "card" },
      el("h2", {}, "Weekly volume plan"),
      el("p", { class: "muted small" },
        "Sets per muscle group per week. Numbers in parentheses are target RIR. Final week is a deload."),
      el("table", { class: "meso-grid" }, head, body),
    ),
  );

  // Day templates
  container.append(el("h2", { style: { marginTop: "1.5rem" } }, "Training days"));
  for (const d of template) {
    container.append(
      el("section", { class: "card" },
        el("h3", {}, d.name),
        el("ul", { style: { margin: 0, paddingLeft: "1.2rem" } },
          ...d.exercises.map((e) =>
            el("li", {},
              e.exercise,
              " · ",
              el("span", { class: "muted small" }, e.muscleGroup),
            ),
          ),
        ),
      ),
    );
  }
}

async function renderEdit(container, id) {
  const [meso, template, landmarks, exerciseLib] = await Promise.all([
    data.getMesocycle(id),
    data.getTemplate(id),
    data.getLandmarks(),
    data.getFullExerciseLibrary(),
  ]);
  if (!meso) { container.append(el("p", {}, "Not found.")); return; }

  const allSets = await data.listSets();
  const hasLoggedSets = allSets.some((s) => s.mesoId === id);

  const state = {
    name: meso.name,
    startDate: meso.startDate,
    weeks: +meso.weeks,
    notes: meso.notes || "",
    days: template.map((d) => ({
      name: d.name,
      exercises: d.exercises.map((e) => ({ exercise: e.exercise, muscleGroup: e.muscleGroup, notes: e.notes || "" })),
    })),
  };

  function rerender() {
    container.replaceChildren();
    container.append(buildEditForm());
  }

  function buildEditForm() {
    const wrap = el("div", {});
    wrap.append(el("h1", {}, "Edit mesocycle"));

    if (hasLoggedSets) {
      wrap.append(el("div", { class: "banner warn" }, "This mesocycle has logged sets. Editing the template won't change existing logged data."));
    }

    wrap.append(
      el("div", { class: "card" },
        el("div", { class: "field" },
          el("label", {}, "Name"),
          el("input", { type: "text", value: state.name, oninput: (e) => (state.name = e.target.value) }),
        ),
        el("div", { class: "field-row" },
          el("div", { class: "field" },
            el("label", {}, "Start date"),
            el("input", { type: "date", value: state.startDate, oninput: (e) => (state.startDate = e.target.value) }),
          ),
          el("div", { class: "field" },
            el("label", {}, "Weeks"),
            el("select", { onchange: (e) => { state.weeks = +e.target.value; rerender(); } },
              ...[4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) =>
                el("option", { value: n, selected: state.weeks === n ? "" : null }, `${n} weeks`)),
            ),
          ),
        ),
        el("div", { class: "field" },
          el("label", {}, "Notes"),
          el("textarea", { rows: 2, oninput: (e) => (state.notes = e.target.value) }, state.notes),
        ),
      ),
    );

    wrap.append(el("div", { class: "section-title" }, el("h2", {}, "Training days")));
    state.days.forEach((day, di) => {
      const card = el("div", { class: "day-card" });
      card.append(
        el("div", { class: "day-card-head" },
          el("input", { type: "text", value: day.name, style: { fontWeight: 700, fontSize: "1.05rem", maxWidth: "60%" }, oninput: (e) => (day.name = e.target.value) }),
          el("button", { class: "btn small danger ghost", onclick: () => { state.days.splice(di, 1); rerender(); } }, "Remove day"),
        ),
      );
      day.exercises.forEach((ex, ei) => {
        card.append(
          el("div", { class: "field-row exercise-edit-row", style: { marginTop: "0.5rem", alignItems: "end" } },
            el("div", {},
              el("label", {}, "Exercise"),
              buildExerciseInput(exerciseLib, ex, (name, group) => {
                ex.exercise = name;
                if (!ex.muscleGroup) ex.muscleGroup = group;
                rerender();
              }),
            ),
            el("div", {},
              el("label", {}, "Muscle group"),
              el("div", { class: "row" },
                el("select", { style: { flex: 1 }, onchange: (e) => (ex.muscleGroup = e.target.value) },
                  el("option", { value: "" }, "— select —"),
                  ...MUSCLE_GROUPS.map((g) => el("option", { value: g, selected: ex.muscleGroup === g ? "" : null }, g)),
                ),
                el("button", { class: "btn icon", title: "Remove", onclick: () => { day.exercises.splice(ei, 1); rerender(); } }, "×"),
              ),
            ),
          ),
        );
      });
      card.append(el("button", { class: "btn small", style: { marginTop: "0.6rem" }, onclick: () => { day.exercises.push({ exercise: "", muscleGroup: "" }); rerender(); } }, "+ Add exercise"));
      wrap.append(card);
    });

    wrap.append(el("button", { class: "btn", style: { marginBottom: "1rem" }, onclick: () => { state.days.push({ name: "New Day", exercises: [] }); rerender(); } }, "+ Add day"));

    const saveBtn = el("button", { class: "btn primary" }, "Save changes");
    saveBtn.onclick = withLoading(saveBtn, async () => {
      if (!state.name.trim()) return toast("Name is required", "bad");
      const days = state.days.map((d) => ({
        name: d.name || "Day",
        exercises: d.exercises.filter((e) => e.exercise && e.muscleGroup),
      }));
      await run(data.updateMesocycleInfo(id, { name: state.name.trim(), startDate: state.startDate, weeks: String(state.weeks), notes: state.notes }), {});
      await run(data.replaceTemplateDays(id, days), {});
      await run(data.replaceTemplateExercises(id, days), {});
      await run(data.recalculateWeekPlan(id, state.weeks, days), { ok: "Mesocycle updated" });
      navigate(`#/meso/${id}`);
    });
    wrap.append(
      el("div", { class: "row between", style: { marginTop: "1.5rem" } },
        el("button", { class: "btn ghost", onclick: () => navigate(`#/meso/${id}`) }, "Cancel"),
        saveBtn,
      ),
    );

    return wrap;
  }

  rerender();
}
