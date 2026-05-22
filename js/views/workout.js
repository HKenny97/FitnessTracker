import { el, isoToday, run, toast, withLoading, defaultSessionState, buildSessionMetaForm } from "../ui.js";
import * as data from "../data.js";
import { CUSTOM_MESO_ID } from "../data.js";
import { distributeSets, suggestWeight, MUSCLE_GROUPS } from "../rp.js";

export async function render(container) {
  const active = await data.getActiveMesocycle();
  let mode = active ? "meso" : "custom";

  const root = el("div", {});
  container.append(root);

  async function fullRender() {
    root.replaceChildren();

    root.append(
      el("div", { class: "section-title" },
        el("h1", {}, "Train"),
        el("div", { class: "row" },
          el("button", {
            class: "btn small" + (mode === "meso" ? " primary" : ""),
            onclick: () => { mode = "meso"; fullRender(); },
            disabled: !active ? true : null,
          }, "Mesocycle"),
          el("button", {
            class: "btn small" + (mode === "custom" ? " primary" : ""),
            onclick: () => { mode = "custom"; fullRender(); },
          }, "Custom"),
        ),
      ),
    );

    if (mode === "meso") {
      if (!active) {
        root.append(
          el("div", { class: "banner" },
            "No active mesocycle. ",
            el("a", { href: "#/meso/new" }, "Plan one"),
            " first, or switch to Custom mode.",
          ),
        );
        return;
      }
      await renderMesoMode(root, active);
    } else {
      await renderCustomMode(root);
    }
  }

  fullRender();
}

// ── Mesocycle mode ──

async function renderMesoMode(root, active) {
  const template = await data.getTemplate(active.id);
  const weeks = +active.weeks;

  const start = new Date(active.startDate);
  const daysIn = Math.floor((Date.now() - start.getTime()) / 86400000);
  const defaultWeek = Math.min(weeks, Math.max(1, Math.floor(daysIn / 7) + 1));

  let chosenWeek = defaultWeek;
  let chosenDay = template[0]?.index ?? 0;

  const session = defaultSessionState();

  async function loadExistingSession() {
    const existing = await data.getSession(active.id, chosenWeek, chosenDay, isoToday());
    if (existing) {
      session.startTime = existing.startTime || session.startTime;
      session.endTime = existing.endTime || "";
      session.location = existing.location || session.location;
      session.totalRPE = existing.totalRPE || "";
      session.leafStatus = existing.leafStatus || "No";
      session.notes = existing.notes || "";
    }
  }

  async function saveSessionMeta() {
    if (!session.endTime) {
      session.endTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    if (session.location) localStorage.setItem("rp.lastLocation", session.location);
    await run(
      data.saveSession({
        mesoId: active.id,
        week: chosenWeek,
        dayIndex: chosenDay,
        date: isoToday(),
        ...session,
      }),
      { ok: "Session saved" },
    );
  }

  const mesoRoot = el("div", {});
  root.append(mesoRoot);

  async function rerender() {
    await loadExistingSession();
    mesoRoot.replaceChildren();
    mesoRoot.append(
      el("div", { class: "muted", style: { marginBottom: "0.75rem" } }, active.name),
      el("section", { class: "card" },
        el("div", { class: "field-row" },
          el("div", { class: "field" },
            el("label", {}, "Week"),
            el("select", {
              onchange: (e) => { chosenWeek = +e.target.value; rerender(); },
            },
              ...Array.from({ length: weeks }, (_, i) =>
                el("option", {
                  value: i + 1, selected: chosenWeek === i + 1 ? "" : null,
                }, `Week ${i + 1}${i === weeks - 1 ? " (deload)" : ""}`),
              ),
            ),
          ),
          el("div", { class: "field" },
            el("label", {}, "Day"),
            el("select", {
              onchange: (e) => { chosenDay = +e.target.value; rerender(); },
            },
              ...template.map((d) =>
                el("option", { value: d.index, selected: chosenDay === d.index ? "" : null },
                  d.name)),
            ),
          ),
        ),
      ),
    );

    mesoRoot.append(buildSessionMetaForm(session, saveSessionMeta));

    const day = template.find((d) => d.index === chosenDay);
    if (!day) return;
    await renderSession(mesoRoot, active, chosenWeek, day);
  }

  rerender();
}

async function renderSession(container, meso, week, day) {
  const plan = await data.getWeekPlan(meso.id);
  const weekPlan = plan.filter((p) => p.week === week);

  const byGroup = {};
  for (const ex of day.exercises) {
    (byGroup[ex.muscleGroup] ||= []).push(ex);
  }
  const allDays = await data.getTemplate(meso.id);

  const dayShareForExercise = new Map();
  for (const [group, exs] of Object.entries(byGroup)) {
    const weeklyTarget = weekPlan.find((p) => p.muscleGroup === group)?.targetSets || 0;
    const totalAcrossWeek = allDays.reduce(
      (n, d) => n + d.exercises.filter((e) => e.muscleGroup === group).length,
      0,
    );
    const thisDayCount = exs.length;
    const thisDayShare = totalAcrossWeek
      ? Math.round((weeklyTarget * thisDayCount) / totalAcrossWeek)
      : exs.length * 3;
    const perEx = distributeSets(thisDayShare, exs.length);
    exs.forEach((e, i) => dayShareForExercise.set(e.exercise + "|" + e.index, perEx[i]));
  }

  const targetRIRForGroup = (g) =>
    weekPlan.find((p) => p.muscleGroup === g)?.targetRIR ?? 2;
  const isDeload = weekPlan.some((p) => p.isDeload);

  container.append(
    el("h2", { style: { marginTop: "1.2rem" } },
      day.name,
      isDeload && el("span", { class: "muted small" }, " · deload"),
    ),
  );

  for (const ex of day.exercises) {
    const setTarget = dayShareForExercise.get(ex.exercise + "|" + ex.index) || 0;
    const block = await renderExercise(meso, week, day, ex, setTarget, targetRIRForGroup(ex.muscleGroup));
    container.append(block);
  }
}

async function renderExercise(meso, week, day, ex, setTarget, targetRIR) {
  const [logged, prev] = await Promise.all([
    data.sessionSets(meso.id, week, day.index, ex.exercise),
    data.previousTopSet(meso.id, day.index, ex.exercise, week),
  ]);

  const suggested = prev
    ? suggestWeight(prev, Math.max(6, +prev.reps || 8), targetRIR)
    : null;

  const block = el("div", { class: "exercise-block" });
  block.append(
    el("div", { class: "exercise-head" },
      el("div", {},
        el("h3", {}, ex.exercise),
        el("div", { class: "exercise-meta" },
          el("span", { class: "pill" }, ex.muscleGroup),
          setTarget ? el("span", { class: "pill" }, `${setTarget} working sets`) : null,
          el("span", { class: "pill" }, `${targetRIR} RIR`),
        ),
      ),
    ),
  );

  if (prev) {
    block.append(
      el("div", { class: "muted small", style: { marginBottom: "0.5rem" } },
        `Last session: ${prev.weight} × ${prev.reps} @ ${prev.rir} RIR`,
        suggested ? ` · suggested ${suggested}` : "",
      ),
    );
  } else {
    block.append(
      el("div", { class: "muted small", style: { marginBottom: "0.5rem" } },
        "First time logging this exercise in this meso."),
    );
  }

  const setsContainer = el("div", {});
  block.append(setsContainer);

  const drafts = [];
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

    logged.forEach((s, i) => {
      setsContainer.append(
        el("div", { class: "set-row set-done" },
          el("div", { class: "idx" }, i + 1),
          el("div", {}, s.weight),
          el("div", {}, s.reps),
          el("div", {}, s.rir),
          el("span", { class: "muted small" }, "✓"),
        ),
      );
    });

    drafts.forEach((d, i) => {
      const setNo = logged.length + i + 1;
      const logBtn = el("button", { class: "btn small primary" }, "Log");
      logBtn.onclick = withLoading(logBtn, () => saveDraft(i));
      setsContainer.append(
        el("div", { class: "set-row" },
          el("div", { class: "idx" }, setNo),
          el("input", {
            type: "number", inputmode: "decimal", step: "0.5",
            placeholder: suggested || "wt",
            value: d.weight,
            oninput: (e) => (d.weight = e.target.value),
          }),
          el("input", {
            type: "number", inputmode: "numeric",
            placeholder: prev?.reps || "reps",
            value: d.reps,
            oninput: (e) => (d.reps = e.target.value),
          }),
          el("input", {
            type: "number", inputmode: "numeric", min: "0", max: "10",
            placeholder: targetRIR,
            value: d.rir,
            oninput: (e) => (d.rir = e.target.value),
          }),
          logBtn,
        ),
      );
    });

    const remaining = Math.max(0, setTarget - logged.length - drafts.length);
    setsContainer.append(
      el("div", { class: "row", style: { marginTop: "0.6rem", justifyContent: "space-between" } },
        el("button", { class: "btn small", onclick: addDraft }, "+ Add set"),
        el("span", { class: "muted small" },
          remaining > 0 ? `${remaining} target set${remaining === 1 ? "" : "s"} remaining` : "Target met",
        ),
      ),
    );
  }

  function addDraft() {
    drafts.push({
      weight: suggested || prev?.weight || "",
      reps: prev?.reps || "",
      rir: targetRIR,
    });
    renderSets();
  }

  async function saveDraft(idx) {
    const d = drafts[idx];
    if (!d.weight || !d.reps) return toast("Need weight and reps", "bad");
    const saved = await run(
      data.logSet({
        mesoId: meso.id,
        week,
        dayIndex: day.index,
        exercise: ex.exercise,
        muscleGroup: ex.muscleGroup,
        setNumber: logged.length + idx + 1,
        weight: +d.weight,
        reps: +d.reps,
        rir: +d.rir,
        date: isoToday(),
      }),
      { ok: "Set logged" },
    );
    logged.push(saved);
    drafts.splice(idx, 1);
    renderSets();
  }

  if (!logged.length) addDraft();
  else renderSets();

  return block;
}

// ── Custom mode ──

async function renderCustomMode(root) {
  const exerciseLib = await data.getFullExerciseLibrary();
  const exercises = [];
  let filterGroup = "";

  const session = defaultSessionState();

  async function saveSessionMeta() {
    if (!session.endTime) {
      session.endTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    if (session.location) localStorage.setItem("rp.lastLocation", session.location);
    await run(
      data.saveSession({
        mesoId: CUSTOM_MESO_ID,
        week: 0,
        dayIndex: 0,
        date: isoToday(),
        ...session,
      }),
      { ok: "Session saved" },
    );
  }

  const customRoot = el("div", {});
  root.append(customRoot);

  function rerender() {
    customRoot.replaceChildren();
    customRoot.append(
      el("p", { class: "muted" }, "Log sets for any exercise without a mesocycle plan."),
    );

    customRoot.append(buildSessionMetaForm(session, saveSessionMeta));

    const filteredLib = filterGroup
      ? exerciseLib.filter((e) => e.group === filterGroup)
      : exerciseLib;

    customRoot.append(
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
                el("option", { value: g, selected: filterGroup === g ? "" : null }, g)),
            ),
          ),
          el("div", { class: "field" },
            el("label", {}, "Exercise"),
            el("select", { id: "custom-exercise-select" },
              el("option", { value: "" }, "— pick —"),
              ...filteredLib.map((e) =>
                el("option", { value: e.name },
                  `${e.name}${e.equipment ? ` (${e.equipment})` : ""}`)),
            ),
          ),
          el("button", {
            class: "btn primary",
            onclick: () => {
              const sel = document.getElementById("custom-exercise-select");
              const name = sel.value;
              if (!name) return toast("Pick an exercise", "bad");
              const lib = exerciseLib.find((e) => e.name === name);
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
      customRoot.append(el("p", { class: "muted" }, "Add exercises above to start logging."));
      return;
    }

    for (const ex of exercises) {
      customRoot.append(buildCustomBlock(ex));
    }
  }

  function buildCustomBlock(ex) {
    const block = el("div", { class: "exercise-block" });
    block.append(
      el("div", { class: "exercise-head" },
        el("div", {},
          el("h3", {}, ex.exercise),
          el("div", { class: "exercise-meta" },
            el("span", { class: "pill" }, ex.muscleGroup),
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
          const logBtn = el("button", { class: "btn small primary" }, "Log");
          logBtn.onclick = withLoading(logBtn, async () => {
            if (!s.weight || !s.reps) return toast("Need weight and reps", "bad");
            await run(
              data.logSet({
                mesoId: CUSTOM_MESO_ID,
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
          });
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
              logBtn,
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
