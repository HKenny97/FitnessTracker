import { el, isoToday, run, toast, formatMuscle } from "../ui.js";
import * as data from "../data.js";
import { EXERCISE_LIBRARY, MUSCLE_GROUPS } from "../rp.js";

export async function render(container) {
  const exercises = [];
  let filterGroup = "";

  const session = {
    startTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
    endTime: "",
    location: localStorage.getItem("rp.lastLocation") || "",
    totalRPE: "",
    leafStatus: "No",
    notes: "",
  };

  async function saveSessionMeta() {
    if (!session.endTime) {
      session.endTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    if (session.location) localStorage.setItem("rp.lastLocation", session.location);
    await run(
      data.saveSession({
        mesoId: "_custom",
        week: 0,
        dayIndex: 0,
        date: isoToday(),
        ...session,
      }),
      { ok: "Session saved" },
    );
  }

  const root = el("div", {});
  container.append(root);

  function rerender() {
    root.replaceChildren();
    root.append(
      el("h1", {}, "Custom Workout"),
      el("p", { class: "muted" }, "Log sets for any exercise without a mesocycle plan."),
    );

    // Session metadata
    root.append(
      el("section", { class: "card session-meta" },
        el("h3", {}, "Session info"),
        el("div", { class: "field-row four" },
          el("div", { class: "field" },
            el("label", {}, "Start time"),
            el("input", {
              type: "time", value: session.startTime,
              oninput: (e) => (session.startTime = e.target.value),
            }),
          ),
          el("div", { class: "field" },
            el("label", {}, "End time"),
            el("input", {
              type: "time", value: session.endTime,
              placeholder: "auto on save",
              oninput: (e) => (session.endTime = e.target.value),
            }),
          ),
          el("div", { class: "field" },
            el("label", {}, "Location"),
            el("input", {
              type: "text", value: session.location,
              placeholder: "e.g. Home gym",
              oninput: (e) => (session.location = e.target.value),
            }),
          ),
          el("div", { class: "field" },
            el("label", {}, "Total RPE"),
            el("select", {
              onchange: (e) => (session.totalRPE = e.target.value),
            },
              el("option", { value: "" }, "—"),
              ...[1,2,3,4,5,6,7,8,9,10].map((n) =>
                el("option", { value: n, selected: String(session.totalRPE) === String(n) ? "" : null }, String(n))),
            ),
          ),
        ),
        el("div", { class: "field-row" },
          el("div", { class: "field" },
            el("label", {}, "Leaf status"),
            el("select", {
              onchange: (e) => (session.leafStatus = e.target.value),
            },
              el("option", { value: "No" }, "No"),
              el("option", { value: "Yes", selected: session.leafStatus === "Yes" ? "" : null }, "Yes"),
            ),
          ),
          el("div", { class: "field" },
            el("label", {}, "Session notes"),
            el("input", {
              type: "text", value: session.notes,
              placeholder: "Optional",
              oninput: (e) => (session.notes = e.target.value),
            }),
          ),
        ),
        el("button", { class: "btn primary small", onclick: saveSessionMeta }, "Save session info"),
      ),
    );

    // Exercise picker
    const filteredLib = filterGroup
      ? EXERCISE_LIBRARY.filter((e) => e.group === filterGroup)
      : EXERCISE_LIBRARY;

    root.append(
      el("section", { class: "card" },
        el("h3", {}, "Add exercise"),
        el("div", { class: "exercise-picker" },
          el("div", { class: "field" },
            el("label", {}, "Filter by muscle"),
            el("select", {
              onchange: (e) => { filterGroup = e.target.value; rerender(); },
            },
              el("option", { value: "" }, "All muscles"),
              ...MUSCLE_GROUPS.map((g) =>
                el("option", { value: g, selected: filterGroup === g ? "" : null }, formatMuscle(g))),
            ),
          ),
          el("div", { class: "field" },
            el("label", {}, "Exercise"),
            el("select", { id: "custom-exercise-select" },
              el("option", { value: "" }, "— pick —"),
              ...filteredLib.map((e) =>
                el("option", { value: e.name },
                  `${e.name} (${e.equipment})`)),
            ),
          ),
          el("button", {
            class: "btn primary",
            onclick: () => {
              const sel = document.getElementById("custom-exercise-select");
              const name = sel.value;
              if (!name) return toast("Pick an exercise", "bad");
              const lib = EXERCISE_LIBRARY.find((e) => e.name === name);
              if (exercises.some((e) => e.exercise === name)) return toast("Already added", "bad");
              exercises.push({
                exercise: name,
                muscleGroup: lib?.group || "",
                sets: [],
              });
              rerender();
            },
          }, "+ Add"),
        ),
      ),
    );

    if (!exercises.length) {
      root.append(el("p", { class: "muted" }, "Add exercises above to start logging."));
      return;
    }

    for (const ex of exercises) {
      root.append(buildExerciseBlock(ex));
    }
  }

  function buildExerciseBlock(ex) {
    const block = el("div", { class: "exercise-block" });
    block.append(
      el("div", { class: "exercise-head" },
        el("div", {},
          el("h3", {}, ex.exercise),
          el("div", { class: "exercise-meta" },
            el("span", { class: "pill" }, formatMuscle(ex.muscleGroup)),
          ),
        ),
        el("button", {
          class: "btn small danger ghost",
          onclick: () => {
            exercises.splice(exercises.indexOf(ex), 1);
            rerender();
          },
        }, "Remove"),
      ),
    );

    const setsContainer = el("div", {});
    block.append(setsContainer);

    function renderSets() {
      setsContainer.replaceChildren();

      setsContainer.append(
        el("div", { class: "set-row", style: { color: "var(--muted)", fontSize: "0.75rem" } },
          el("div", {}, "#"),
          el("div", {}, "Weight"),
          el("div", {}, "Reps"),
          el("div", {}, "RIR"),
          el("div", {}, ""),
        ),
      );

      ex.sets.forEach((s, i) => {
        if (s.saved) {
          setsContainer.append(
            el("div", { class: "set-row set-done" },
              el("div", { class: "idx" }, i + 1),
              el("div", {}, s.weight),
              el("div", {}, s.reps),
              el("div", {}, s.rir),
              el("span", { class: "muted small" }, "✓"),
            ),
          );
        } else {
          setsContainer.append(
            el("div", { class: "set-row" },
              el("div", { class: "idx" }, i + 1),
              el("input", {
                type: "number", inputmode: "decimal", step: "0.5",
                placeholder: "wt", value: s.weight,
                oninput: (e) => (s.weight = e.target.value),
              }),
              el("input", {
                type: "number", inputmode: "numeric",
                placeholder: "reps", value: s.reps,
                oninput: (e) => (s.reps = e.target.value),
              }),
              el("input", {
                type: "number", inputmode: "numeric", min: "0", max: "10",
                placeholder: "RIR", value: s.rir,
                oninput: (e) => (s.rir = e.target.value),
              }),
              el("button", {
                class: "btn small primary",
                onclick: async () => {
                  if (!s.weight || !s.reps) return toast("Need weight and reps", "bad");
                  await run(
                    data.logSet({
                      mesoId: "_custom",
                      week: 0,
                      dayIndex: 0,
                      exercise: ex.exercise,
                      muscleGroup: ex.muscleGroup,
                      setNumber: i + 1,
                      weight: +s.weight,
                      reps: +s.reps,
                      rir: +(s.rir || 0),
                      date: isoToday(),
                    }),
                    { ok: "Set logged" },
                  );
                  s.saved = true;
                  renderSets();
                },
              }, "Log"),
            ),
          );
        }
      });

      setsContainer.append(
        el("button", {
          class: "btn small", style: { marginTop: "0.6rem" },
          onclick: () => {
            const prev = ex.sets.filter((s) => s.saved).pop();
            ex.sets.push({
              weight: prev?.weight || "",
              reps: prev?.reps || "",
              rir: prev?.rir || "",
              saved: false,
            });
            renderSets();
          },
        }, "+ Add set"),
      );
    }

    ex.sets.push({ weight: "", reps: "", rir: "", saved: false });
    renderSets();
    return block;
  }

  rerender();
}
