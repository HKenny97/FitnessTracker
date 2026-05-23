import { el, isoToday, run, toast, withLoading, defaultSessionState, buildSessionMetaForm, confirmModal, stat } from "../ui.js";
import * as data from "../data.js";
import { CUSTOM_MESO_ID } from "../data.js";
import { distributeSets, MUSCLE_GROUPS } from "../rp.js";
import { analyze, adaptiveSuggestWeight } from "../adaptive.js";

export async function render(container) {
  const active = await data.getActiveMesocycle();
  let mode = active ? "meso" : "custom";
  let summaryMode = false;

  const root = el("div", {});
  container.append(root);

  function onFinish() {
    summaryMode = true;
    fullRender();
  }

  async function fullRender() {
    root.replaceChildren();

    if (summaryMode) {
      const mesoId = mode === "meso" ? active.id : CUSTOM_MESO_ID;
      await renderSummary(root, mesoId, () => { summaryMode = false; fullRender(); });
      return;
    }

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
      await renderMesoMode(root, active, onFinish);
    } else {
      await renderCustomMode(root, onFinish);
    }
  }

  fullRender();
}

// ── Mesocycle mode ──

async function renderMesoMode(root, active, onFinish) {
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

    const finishBtn = el("button", { class: "btn primary finish-btn" }, "Finish Workout");
    finishBtn.onclick = withLoading(finishBtn, async () => {
      if (!session.endTime) {
        session.endTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
      }
      await saveSessionMeta();
      onFinish();
    });
    mesoRoot.append(finishBtn);
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
  const [logged, prev, history] = await Promise.all([
    data.sessionSets(meso.id, week, day.index, ex.exercise),
    data.previousTopSet(meso.id, day.index, ex.exercise, week),
    data.getExerciseHistory(ex.exercise),
  ]);

  const analysis = analyze(ex.exercise, history);
  const suggested = prev
    ? adaptiveSuggestWeight(prev, analysis.repRange.min, targetRIR, ex.exercise, history)
    : null;

  let editingSetId = null;

  const block = el("div", { class: "exercise-block" });
  block.append(
    el("div", { class: "exercise-head" },
      el("div", {},
        el("h3", {}, ex.exercise),
        el("div", { class: "exercise-meta" },
          el("span", { class: "pill" }, ex.muscleGroup),
          setTarget ? el("span", { class: "pill" }, `${setTarget} working sets`) : null,
          el("span", { class: "pill" }, `${analysis.repRange.label} reps`),
          el("span", { class: "pill" }, `${analysis.rest.label} rest`),
          el("span", { class: "pill" }, `${targetRIR} RIR`),
          analysis.confidence !== "new"
            ? el("span", { class: "pill" }, `↑ ${analysis.progression.label}/session`)
            : null,
        ),
      ),
    ),
  );

  if (analysis.fatigueWarning) {
    block.append(
      el("div", { class: "banner warning" }, `⚠️ ${analysis.fatigueWarning}`),
    );
  }

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
      if (editingSetId === s.id) {
        const ed = { weight: s.weight, reps: s.reps, rir: s.rir };
        const saveBtn = el("button", { class: "btn small primary" }, "Save");
        const cancelBtn = el("button", { class: "btn small" }, "Cancel");
        cancelBtn.onclick = () => { editingSetId = null; renderSets(); };
        saveBtn.onclick = withLoading(saveBtn, async () => {
          await run(data.updateSet(s.id, { weight: ed.weight, reps: ed.reps, rir: ed.rir }), { ok: "Updated" });
          s.weight = ed.weight; s.reps = ed.reps; s.rir = ed.rir;
          editingSetId = null;
          renderSets();
        });
        setsContainer.append(
          el("div", { class: "set-row editing" },
            el("div", { class: "idx" }, i + 1),
            el("input", { type: "number", inputmode: "decimal", step: "0.5", value: ed.weight, oninput: (e) => (ed.weight = e.target.value) }),
            el("input", { type: "number", inputmode: "numeric", value: ed.reps, oninput: (e) => (ed.reps = e.target.value) }),
            el("input", { type: "number", inputmode: "numeric", min: "0", max: "10", value: ed.rir, oninput: (e) => (ed.rir = e.target.value) }),
            el("div", { class: "set-actions" }, saveBtn, cancelBtn),
          ),
        );
      } else {
        setsContainer.append(
          el("div", { class: "set-row set-done" },
            el("div", { class: "idx" }, i + 1),
            el("div", {}, s.weight),
            el("div", {}, s.reps),
            el("div", {}, s.rir),
            el("div", { class: "set-actions" },
              el("button", { class: "btn small ghost", onclick: () => { editingSetId = s.id; renderSets(); } }, "✏"),
              el("button", { class: "btn small danger ghost", onclick: () => {
                confirmModal("Delete this set?", async () => {
                  await run(data.deleteSet(s.id), { ok: "Set deleted" });
                  logged.splice(i, 1);
                  renderSets();
                });
              } }, "×"),
            ),
          ),
        );
      }
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

async function renderCustomMode(root, onFinish) {
  const exerciseLib = await data.getFullExerciseLibrary();
  const exercises = [];
  let filterGroup = "";

  // Restore today's previously logged custom sets so the user can
  // continue where they left off after a page refresh or navigation.
  const todaySets = (await data.listSets())
    .filter((s) => s.mesoId === CUSTOM_MESO_ID && s.date === isoToday())
    .sort((a, b) => (+a.setNumber || 0) - (+b.setNumber || 0));
  const groupedByExercise = new Map();
  for (const s of todaySets) {
    if (!groupedByExercise.has(s.exercise)) groupedByExercise.set(s.exercise, []);
    groupedByExercise.get(s.exercise).push(s);
  }
  for (const [name, sets] of groupedByExercise) {
    exercises.push({
      exercise: name,
      muscleGroup: sets[0].muscleGroup || "",
      sets: sets.map((s) => ({
        id: s.id,
        weight: s.weight,
        reps: s.reps,
        rir: s.rir,
        saved: true,
      })),
    });
  }

  const session = defaultSessionState();

  // Restore existing session metadata for today's custom workout.
  const existingSession = await data.getSession(CUSTOM_MESO_ID, 0, 0, isoToday());
  if (existingSession) {
    session.startTime = existingSession.startTime || session.startTime;
    session.endTime = existingSession.endTime || "";
    session.location = existingSession.location || session.location;
    session.totalRPE = existingSession.totalRPE || "";
    session.leafStatus = existingSession.leafStatus || "No";
    session.notes = existingSession.notes || "";
  }

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

    const finishBtn = el("button", { class: "btn primary finish-btn" }, "Finish Workout");
    finishBtn.onclick = withLoading(finishBtn, async () => {
      if (!session.endTime) {
        session.endTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
      }
      await saveSessionMeta();
      onFinish();
    });
    customRoot.append(finishBtn);
  }

  function buildCustomBlock(ex) {
    let editingSetId = null;
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
        if (s.saved && editingSetId === s.id) {
          const ed = { weight: s.weight, reps: s.reps, rir: s.rir };
          const saveBtn = el("button", { class: "btn small primary" }, "Save");
          const cancelBtn = el("button", { class: "btn small" }, "Cancel");
          cancelBtn.onclick = () => { editingSetId = null; renderSets(); };
          saveBtn.onclick = withLoading(saveBtn, async () => {
            await run(data.updateSet(s.id, { weight: ed.weight, reps: ed.reps, rir: ed.rir }), { ok: "Updated" });
            s.weight = ed.weight; s.reps = ed.reps; s.rir = ed.rir;
            editingSetId = null;
            renderSets();
          });
          setsContainer.append(
            el("div", { class: "set-row editing" },
              el("div", { class: "idx" }, i + 1),
              el("input", { type: "number", inputmode: "decimal", step: "0.5", value: ed.weight, oninput: (e) => (ed.weight = e.target.value) }),
              el("input", { type: "number", inputmode: "numeric", value: ed.reps, oninput: (e) => (ed.reps = e.target.value) }),
              el("input", { type: "number", inputmode: "numeric", min: "0", max: "10", value: ed.rir, oninput: (e) => (ed.rir = e.target.value) }),
              el("div", { class: "set-actions" }, saveBtn, cancelBtn),
            ),
          );
        } else if (s.saved) {
          setsContainer.append(
            el("div", { class: "set-row set-done" },
              el("div", { class: "idx" }, i + 1),
              el("div", {}, s.weight),
              el("div", {}, s.reps),
              el("div", {}, s.rir),
              el("div", { class: "set-actions" },
                el("button", { class: "btn small ghost", onclick: () => { editingSetId = s.id; renderSets(); } }, "✏"),
                el("button", { class: "btn small danger ghost", onclick: () => {
                  confirmModal("Delete this set?", async () => {
                    await run(data.deleteSet(s.id), { ok: "Set deleted" });
                    ex.sets.splice(i, 1);
                    renderSets();
                  });
                } }, "×"),
              ),
            ),
          );
        } else {
          const logBtn = el("button", { class: "btn small primary" }, "Log");
          logBtn.onclick = withLoading(logBtn, async () => {
            if (!s.weight || !s.reps) return toast("Need weight and reps", "bad");
            const saved = await run(
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
            s.id = saved.id;
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

    if (!ex.sets.some((s) => !s.saved)) {
      ex.sets.push({ weight: "", reps: "", rir: "", saved: false });
    }
    renderSets();
    return block;
  }

  rerender();
}

// ── Workout summary ──

async function renderSummary(container, mesoId, onBack) {
  const today = isoToday();
  const allSets = await data.listSets();
  const todaySets = allSets.filter((s) => s.date === today && s.mesoId === mesoId);

  const allSessions = await data.listSessions();
  const session = allSessions.find((s) => s.date === today && s.mesoId === mesoId);

  if (!todaySets.length) {
    container.append(
      el("section", { class: "card workout-summary" },
        el("h2", {}, "No sets logged today"),
        el("button", { class: "btn", style: { marginTop: "1rem" }, onclick: onBack }, "Back to training"),
      ),
    );
    return;
  }

  // Duration
  let durationStr = "";
  if (session?.startTime && session?.endTime) {
    const [sh, sm] = session.startTime.split(":").map(Number);
    const [eh, em] = session.endTime.split(":").map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins > 0) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
  }

  // Group by exercise
  const byExercise = new Map();
  for (const s of todaySets) {
    if (!byExercise.has(s.exercise)) byExercise.set(s.exercise, []);
    byExercise.get(s.exercise).push(s);
  }

  // Muscles
  const muscleMap = {};
  for (const s of todaySets) {
    muscleMap[s.muscleGroup] = (muscleMap[s.muscleGroup] || 0) + 1;
  }

  // Volume
  const totalVolume = todaySets.reduce((sum, s) => sum + (+s.weight * +s.reps), 0);

  // Previous session volume
  const prevDates = [...new Set(
    allSets.filter((s) => s.mesoId === mesoId && s.date < today).map((s) => s.date),
  )].sort().reverse();
  let prevVolume = 0;
  if (prevDates.length) {
    prevVolume = allSets
      .filter((s) => s.mesoId === mesoId && s.date === prevDates[0])
      .reduce((sum, s) => sum + (+s.weight * +s.reps), 0);
  }

  // Per-exercise highlights
  const highlights = [];
  for (const [exercise, exSets] of byExercise) {
    const topSet = exSets.reduce((b, s) => (+s.weight > +b.weight ? s : b), exSets[0]);

    const prevExSets = allSets
      .filter((s) => s.exercise === exercise && s.date < today)
      .sort((a, b) => b.date.localeCompare(a.date));

    let comparison = null;
    if (prevExSets.length) {
      const prevDate = prevExSets[0].date;
      const prevSession = prevExSets.filter((s) => s.date === prevDate);
      const prevTop = prevSession.reduce((b, s) => (+s.weight > +b.weight ? s : b), prevSession[0]);
      comparison = {
        wDelta: +topSet.weight - +prevTop.weight,
        rDelta: +topSet.reps - +prevTop.reps,
        prevWeight: +prevTop.weight,
        prevReps: +prevTop.reps,
      };
    }

    highlights.push({
      exercise,
      muscleGroup: topSet.muscleGroup,
      sets: exSets.length,
      topWeight: +topSet.weight,
      topReps: +topSet.reps,
      comparison,
    });
  }

  // ── Render ──

  const summary = el("section", { class: "card workout-summary" });
  summary.append(el("h2", {}, "Workout Complete"));

  // Stats
  const statsRow = el("div", { class: "summary-stats" });
  if (durationStr) statsRow.append(stat(durationStr, "Duration"));
  statsRow.append(stat(String(todaySets.length), "Sets"));
  statsRow.append(stat(String(byExercise.size), "Exercises"));
  statsRow.append(stat(totalVolume.toLocaleString(), "Volume (lbs)"));
  summary.append(statsRow);

  // Volume comparison
  if (prevVolume > 0) {
    const volDelta = totalVolume - prevVolume;
    const volPct = Math.round((volDelta / prevVolume) * 100);
    const cls = volDelta > 0 ? "delta-up" : volDelta < 0 ? "delta-down" : "delta-same";
    summary.append(
      el("div", { class: `comparison ${cls}`, style: { textAlign: "center", marginBottom: "0.5rem" } },
        `${volDelta > 0 ? "+" : ""}${volDelta.toLocaleString()} lbs (${volDelta > 0 ? "+" : ""}${volPct}%) vs last session`,
      ),
    );
  }

  // Muscles
  const muscleEntries = Object.entries(muscleMap).sort((a, b) => b[1] - a[1]);
  summary.append(
    el("div", { class: "history-muscles", style: { justifyContent: "center", marginBottom: "0.75rem" } },
      ...muscleEntries.map(([g, n]) => el("span", { class: "pill small" }, `${g} (${n})`)),
    ),
  );

  // Exercise highlights
  summary.append(el("h3", { style: { marginTop: "1rem" } }, "Exercise highlights"));
  for (const h of highlights) {
    let deltaNode = null;
    if (h.comparison) {
      const { wDelta, rDelta } = h.comparison;
      let text, cls;
      if (wDelta > 0) { text = `+${wDelta}`; cls = "delta-up"; }
      else if (wDelta < 0) { text = `${wDelta}`; cls = "delta-down"; }
      else if (rDelta > 0) { text = `+${rDelta} reps`; cls = "delta-up"; }
      else if (rDelta < 0) { text = `${rDelta} reps`; cls = "delta-down"; }
      else { text = "="; cls = "delta-same"; }
      deltaNode = el("span", { class: `delta ${cls}` }, text);
    }

    summary.append(
      el("div", { class: "summary-exercise" },
        el("div", { class: "summary-exercise-head" },
          el("strong", {}, h.exercise),
          deltaNode,
        ),
        el("div", { class: "muted small" },
          `${h.sets} sets · Top: ${h.topWeight} × ${h.topReps}`,
          h.comparison ? ` (was ${h.comparison.prevWeight} × ${h.comparison.prevReps})` : " (new)",
        ),
      ),
    );
  }

  // Leaf
  if (session?.leafStatus === "Yes") {
    summary.append(
      el("div", { style: { marginTop: "0.75rem", textAlign: "center" } },
        el("span", { class: "pill leaf" }, "Leaf session")),
    );
  }

  // Back
  const backBtn = el("button", { class: "btn", style: { marginTop: "1.25rem" } }, "Back to training");
  backBtn.onclick = onBack;
  summary.append(backBtn);

  container.append(summary);
}

