import { el, isoToday, run, toast, formatMuscle, defaultSessionState, buildSessionMetaForm } from "../ui.js";
import * as data from "../data.js";
import { CUSTOM_MESO_ID } from "../data.js";
import { EXERCISE_LIBRARY } from "../rp.js";
import { openExercisePicker } from "../exercise-picker.js";
import { renderSummary } from "./workout.js";
import { toDisplay, unitLabel } from "../units.js";

export async function render(container) {
  const exercises = [];
  const session = defaultSessionState();

  async function saveSessionMeta() {
    if (!session.endTime) {
      session.endTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    if (session.location) localStorage.setItem("gama.lastLocation", session.location);
    await run(
      data.saveSession({ mesoId: CUSTOM_MESO_ID, week: 0, dayIndex: 0, date: isoToday(), ...session }),
      { ok: "Session saved" },
    );
  }

  const root = el("div", {});
  container.append(root);

  // Live session tally (updated as sets are logged).
  const bandSets = el("div", { class: "v" }, "0");
  const bandEx = el("div", { class: "v" }, "0");
  const bandVol = el("div", { class: "v" }, "0");
  function updateBand() {
    let sets = 0, vol = 0;
    const exWithSets = new Set();
    for (const ex of exercises) {
      for (const s of ex.sets) {
        if (s.saved) { sets++; vol += (+s.weight || 0) * (+s.reps || 0); exWithSets.add(ex.exercise); }
      }
    }
    bandSets.textContent = String(sets);
    bandEx.textContent = String(exWithSets.size);
    bandVol.textContent = toDisplay(vol).toLocaleString();
  }

  function addExercise() {
    openExercisePicker({
      exerciseLib: EXERCISE_LIBRARY,
      exclude: exercises.map((e) => e.exercise),
      onPick: ({ name, group }) => {
        exercises.push({ exercise: name, muscleGroup: group || "", sets: [] });
        rerender();
      },
    });
  }

  async function finishWorkout() {
    const anySaved = exercises.some((ex) => ex.sets.some((s) => s.saved));
    if (!anySaved) return toast("Log at least one set first", "bad");
    await saveSessionMeta();
    root.replaceChildren();
    await renderSummary(root, CUSTOM_MESO_ID, isoToday(), () => {
      container.replaceChildren();
      render(container);
    });
  }

  function rerender() {
    root.replaceChildren();
    root.append(
      el("h1", {}, "Custom Workout"),
      el("p", { class: "muted" }, "Log sets for any exercise without a mesocycle plan."),
    );

    // Live tally band
    root.append(
      el("div", { class: "session-band" },
        el("div", {}, bandSets, el("div", { class: "l" }, "Sets logged")),
        el("div", {}, bandEx, el("div", { class: "l" }, "Exercises")),
        el("div", {}, bandVol, el("div", { class: "l" }, `Volume (${unitLabel()})`)),
      ),
    );
    updateBand();

    // Session metadata (shared form)
    root.append(buildSessionMetaForm(session, saveSessionMeta));

    // Add / finish actions
    root.append(
      el("div", { class: "row", style: { gap: "0.6rem", margin: "0 0 1rem" } },
        el("button", { class: "btn primary", style: { flex: "1", minWidth: "150px" }, onclick: addExercise }, "＋ Add exercise"),
        el("button", { class: "btn", style: { flex: "1", minWidth: "150px" }, onclick: finishWorkout }, "✓ Finish workout"),
      ),
    );

    if (!exercises.length) {
      root.append(
        el("div", { class: "empty-state" },
          el("div", { class: "es-icon" }, "🏋️"),
          el("p", {}, "Add an exercise to start logging sets."),
          el("button", { class: "btn primary", onclick: addExercise }, "＋ Add exercise"),
        ),
      );
      return;
    }

    const exGrid = el("div", { class: "ex-grid" });
    for (const ex of exercises) exGrid.append(buildExerciseBlock(ex));
    root.append(exGrid);
  }

  function buildExerciseBlock(ex) {
    const block = el("div", { class: "exercise-block" });
    block.append(
      el("div", { class: "exercise-head" },
        el("div", {},
          el("h3", {}, ex.exercise),
          el("div", { class: "exercise-meta" }, el("span", { class: "pill" }, formatMuscle(ex.muscleGroup))),
        ),
        el("button", {
          class: "btn small danger ghost",
          onclick: () => { exercises.splice(exercises.indexOf(ex), 1); rerender(); },
        }, "Remove"),
      ),
    );

    const setsContainer = el("div", {});
    block.append(setsContainer);

    function renderSets() {
      setsContainer.replaceChildren();
      setsContainer.append(
        el("div", { class: "set-row", style: { color: "var(--muted)", fontSize: "0.75rem" } },
          el("div", {}, "#"), el("div", {}, "Weight"), el("div", {}, "Reps"), el("div", {}, "RIR"), el("div", {}, ""),
        ),
      );

      ex.sets.forEach((s, i) => {
        if (s.saved) {
          setsContainer.append(
            el("div", { class: "set-row set-done" },
              el("div", { class: "idx" }, i + 1),
              el("div", {}, s.weight), el("div", {}, s.reps), el("div", {}, s.rir),
              el("span", { class: "muted small" }, "✓"),
            ),
          );
        } else {
          setsContainer.append(
            el("div", { class: "set-row" },
              el("div", { class: "idx" }, i + 1),
              el("input", { type: "number", inputmode: "decimal", step: "0.5", placeholder: "wt", value: s.weight, oninput: (e) => (s.weight = e.target.value) }),
              el("input", { type: "number", inputmode: "numeric", placeholder: "reps", value: s.reps, oninput: (e) => (s.reps = e.target.value) }),
              el("input", { type: "number", inputmode: "numeric", min: "0", max: "10", placeholder: "RIR", value: s.rir, oninput: (e) => (s.rir = e.target.value) }),
              el("button", {
                class: "btn small primary",
                onclick: async () => {
                  if (!s.weight || !s.reps) return toast("Need weight and reps", "bad");
                  await run(
                    data.logSet({
                      mesoId: CUSTOM_MESO_ID, week: 0, dayIndex: 0,
                      exercise: ex.exercise, muscleGroup: ex.muscleGroup,
                      setNumber: i + 1, weight: +s.weight, reps: +s.reps, rir: +(s.rir || 0),
                      date: isoToday(),
                    }),
                    { ok: "Set logged" },
                  );
                  s.saved = true;
                  renderSets();
                  updateBand();
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
            ex.sets.push({ weight: prev?.weight || "", reps: prev?.reps || "", rir: prev?.rir || "", saved: false });
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
