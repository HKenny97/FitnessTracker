import { el, isoToday, run, fmtDate, toast } from "../ui.js";
import * as data from "../data.js";
import { EXERCISE_LIBRARY, MUSCLE_GROUPS, PROGRAM_TEMPLATES, progressSets, progressRIR } from "../rp.js";
import { navigate } from "../router.js";

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
const blankDay = () => ({
  name: "Day " + (Math.random().toString(36).slice(2, 4)),
  exercises: [],
});

export async function renderNew(container) {
  const landmarks = await data.getLandmarks();

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
    wrap.append(
      el("section", { class: "card" },
        el("h2", {}, "Start from a template"),
        el("p", { class: "muted small" }, "Pick a program to pre-fill days and exercises, or skip and build your own below."),
        el("div", { class: "template-grid" },
          ...PROGRAM_TEMPLATES.map((tpl) =>
            el("button", {
              class: "btn template-btn",
              onclick: () => applyTemplate(tpl),
            },
              el("strong", {}, tpl.name),
              el("span", { class: "muted small" }, `${tpl.days.length} days`),
            ),
          ),
        ),
      ),
    );

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
              ...[4, 5, 6, 7].map((n) =>
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

    wrap.append(
      el("div", { class: "row between", style: { marginTop: "1.5rem" } },
        el("a", { class: "btn ghost", href: "#/meso" }, "Cancel"),
        el("button", { class: "btn primary", onclick: save }, "Create mesocycle"),
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
        el("div", { class: "field-row", style: { marginTop: "0.5rem", alignItems: "end" } },
          el("div", {},
            el("label", {}, "Exercise"),
            el("input", {
              type: "text", value: ex.exercise, list: "exercise-list",
              oninput: (e) => {
                ex.exercise = e.target.value;
                const match = EXERCISE_LIBRARY.find(
                  (lib) => lib.name.toLowerCase() === e.target.value.toLowerCase(),
                );
                if (match && !ex.muscleGroup) ex.muscleGroup = match.group;
              },
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

  // Datalist for exercise autocomplete.
  if (!document.getElementById("exercise-list")) {
    const dl = el("datalist", { id: "exercise-list" },
      ...EXERCISE_LIBRARY.map((x) => el("option", { value: x.name })),
    );
    document.body.append(dl);
  }
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

  container.append(
    el("div", { class: "section-title" },
      el("div", {},
        el("h1", {}, meso.name),
        el("div", { class: "muted" },
          `${meso.weeks} weeks · ${fmtDate(meso.startDate)} · ${meso.status}`,
        ),
      ),
      el("div", { class: "row" },
        meso.status !== "active" && el("button", {
          class: "btn",
          onclick: async () => {
            await run(data.setMesocycleStatus(id, "active"), { ok: "Set active" });
            navigate("#/");
          },
        }, "Set active"),
        meso.status !== "complete" && el("button", {
          class: "btn",
          onclick: async () => {
            await run(data.setMesocycleStatus(id, "complete"), { ok: "Marked complete" });
            navigate("#/meso");
          },
        }, "Mark complete"),
      ),
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
