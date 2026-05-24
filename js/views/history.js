import { el, fmtDate, isoToday, confirmModal, withLoading, run, toast, formatMuscle } from "../ui.js";
import * as data from "../data.js";
import { CUSTOM_MESO_ID } from "../data.js";
import { drawChart } from "../chart.js";
import { epley1RM } from "../rp.js";
import { toDisplay, fromDisplay, unitLabel } from "../units.js";
import { renderSummary } from "./workout.js";

export async function render(container) {
  const [sessionsSrc, setsSrc, allMesos, cardioEntries] = await Promise.all([
    data.listSessions(),
    data.listSets(),
    data.listMesocycles(),
    data.listCardio(),
  ]);
  const sessions = [...sessionsSrc];
  const sets = [...setsSrc];

  const mesoById = {};
  for (const m of allMesos) mesoById[m.id] = m;

  let viewMode = "list";
  let calMonth = new Date().getMonth();
  let calYear = new Date().getFullYear();
  const expandedDates = new Set();
  let searchText = "";
  let filterGroup = "";
  let editingSetId = null;

  const root = el("div", {});
  container.append(root);

  function rerender() {
    root.replaceChildren();
    root.append(
      el("div", { class: "section-title" },
        el("h1", {}, "History"),
        el("div", { class: "row" },
          el("button", {
            class: "btn small" + (viewMode === "list" ? " primary" : ""),
            onclick: () => { viewMode = "list"; rerender(); },
          }, "List"),
          el("button", {
            class: "btn small" + (viewMode === "calendar" ? " primary" : ""),
            onclick: () => { viewMode = "calendar"; rerender(); },
          }, "Calendar"),
          el("button", {
            class: "btn small" + (viewMode === "charts" ? " primary" : ""),
            onclick: () => { viewMode = "charts"; rerender(); },
          }, "Charts"),
        ),
      ),
    );

    if (viewMode === "list") renderList();
    else if (viewMode === "calendar") renderCalendar();
    else if (viewMode === "charts") renderCharts();
  }

  // Open a past workout's summary (reuses the Train-view summary renderer).
  function openSummaryModal(mesoId, date) {
    const overlay = el("div", { class: "modal-overlay" });
    const body = el("div", {});
    overlay.append(el("div", { class: "modal-card" }, body));
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.append(overlay);
    renderSummary(body, mesoId, date, () => overlay.remove());
  }

  // -- Helpers for comparisons --

  function findPreviousTopSet(exercise, beforeDate) {
    const candidates = sets
      .filter((s) => s.exercise === exercise && s.date < beforeDate)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (!candidates.length) return null;
    const lastDate = candidates[0].date;
    const session = candidates.filter((s) => s.date === lastDate);
    return session.reduce((b, s) => (+s.weight > +b.weight ? s : b), session[0]);
  }

  function deltaEl(topSet, prevTop) {
    const wD = +topSet.weight - +prevTop.weight;
    const rD = +topSet.reps - +prevTop.reps;
    let text, cls;
    if (wD > 0) { text = `+${wD}`; cls = "delta-up"; }
    else if (wD < 0) { text = `${wD}`; cls = "delta-down"; }
    else if (rD > 0) { text = `+${rD} reps`; cls = "delta-up"; }
    else if (rD < 0) { text = `${rD} reps`; cls = "delta-down"; }
    else { text = "="; cls = "delta-same"; }
    return el("span", { class: `delta ${cls}` }, text);
  }

  // -- Expanded detail for a date --

  function buildDateDetail(dateSets, date, dateSessions) {
    const detail = el("div", { class: "history-detail" });

    const exerciseOrder = [];
    const byExercise = new Map();
    for (const s of dateSets) {
      if (!byExercise.has(s.exercise)) {
        byExercise.set(s.exercise, []);
        exerciseOrder.push(s.exercise);
      }
      byExercise.get(s.exercise).push(s);
    }

    for (const exercise of exerciseOrder) {
      const exSets = byExercise.get(exercise).sort((a, b) => +a.setNumber - +b.setNumber);
      const topSet = exSets.reduce((b, s) => (+s.weight > +b.weight ? s : b), exSets[0]);
      const prev = findPreviousTopSet(exercise, date);

      const exBlock = el("div", { class: "exercise-detail" });

      let comp = prev
        ? deltaEl(topSet, prev)
        : el("span", { class: "delta delta-new" }, "New");

      // PR highlighting
      const allPriorForEx = sets.filter((s) => s.exercise === exercise && s.date < date);
      const isPR = allPriorForEx.length > 0 && +topSet.weight > Math.max(...allPriorForEx.map((s) => +s.weight));
      if (isPR) comp = el("span", {}, comp, el("span", { class: "pill pr-badge" }, "PR"));

      exBlock.append(
        el("div", { class: "exercise-detail-head" },
          el("div", {},
            el("strong", {}, exercise),
            el("span", { class: "pill small", style: { marginLeft: "0.5rem" } }, formatMuscle(exSets[0].muscleGroup)),
          ),
          comp,
        ),
      );

      for (const s of exSets) {
        if (editingSetId === s.id) {
          const ed = { weight: toDisplay(s.weight), reps: s.reps, rir: s.rir };
          const saveBtn = el("button", { class: "btn small primary" }, "Save");
          const cancelBtn = el("button", { class: "btn small" }, "Cancel");
          cancelBtn.onclick = () => { editingSetId = null; rerender(); };
          saveBtn.onclick = withLoading(saveBtn, async () => {
            const weightLbs = fromDisplay(ed.weight);
            await run(data.updateSet(s.id, { weight: weightLbs, reps: ed.reps, rir: ed.rir }), { ok: "Updated" });
            Object.assign(s, { weight: weightLbs, reps: ed.reps, rir: ed.rir });
            editingSetId = null;
            rerender();
          });
          exBlock.append(
            el("div", { class: "set-detail editing" },
              el("input", { type: "number", inputmode: "decimal", step: "0.5", value: ed.weight, style: { width: "70px" }, oninput: (e) => (ed.weight = e.target.value) }),
              el("input", { type: "number", inputmode: "numeric", value: ed.reps, style: { width: "60px" }, oninput: (e) => (ed.reps = e.target.value) }),
              el("input", { type: "number", inputmode: "numeric", value: ed.rir, style: { width: "60px" }, oninput: (e) => (ed.rir = e.target.value) }),
              el("div", { class: "set-actions" }, saveBtn, cancelBtn),
            ),
          );
        } else {
          exBlock.append(
            el("div", { class: "set-detail" },
              el("span", { class: "muted" }, `${s.setNumber}`),
              el("span", {}, `${toDisplay(s.weight)} × ${s.reps}`),
              el("span", { class: "muted" }, `${s.rir} RIR`),
              el("div", { class: "set-actions" },
                el("button", { class: "btn small ghost", onclick: () => { editingSetId = s.id; rerender(); } }, "✏"),
                el("button", { class: "btn small danger ghost", onclick: () => {
                  confirmModal("Delete this set?", async () => {
                    await run(data.deleteSet(s.id), { ok: "Deleted" });
                    const idx = sets.indexOf(s);
                    if (idx >= 0) sets.splice(idx, 1);
                    rerender();
                  });
                } }, "×"),
              ),
            ),
          );
        }
      }

      if (prev) {
        exBlock.append(
          el("div", { class: "muted small", style: { marginTop: "0.2rem" } },
            `Top: ${toDisplay(topSet.weight)} × ${topSet.reps}  (prev ${toDisplay(prev.weight)} × ${prev.reps})`),
        );
      }

      detail.append(exBlock);
    }

    const vol = dateSets.reduce((sum, s) => sum + (+s.weight * +s.reps), 0);
    detail.append(
      el("div", { class: "volume-summary" },
        el("span", { class: "muted" }, "Total volume: "),
        el("strong", {}, `${toDisplay(vol).toLocaleString()} ${unitLabel()}`),
      ),
    );

    const summaryBtn = el("button", { class: "btn small", style: { marginTop: "0.5rem", marginRight: "0.5rem" } }, "View summary");
    summaryBtn.onclick = () => openSummaryModal(dateSets[0].mesoId, date);
    detail.append(summaryBtn);

    // Session delete button
    const sess = dateSessions ? dateSessions[0] : null;
    if (sess) {
      const delBtn = el("button", { class: "btn small danger ghost", style: { marginTop: "0.5rem" } }, "Delete session");
      delBtn.onclick = () => {
        confirmModal("Delete this workout and all its sets?", async () => {
          await run(data.deleteSession(sess.id), { ok: "Session deleted" });
          // Remove from local arrays
          const sIdx = sessions.findIndex((s) => s.id === sess.id);
          if (sIdx >= 0) sessions.splice(sIdx, 1);
          const toRemove = sets.filter((s) => s.date === sess.date && s.mesoId === sess.mesoId);
          for (const s of toRemove) { const i = sets.indexOf(s); if (i >= 0) sets.splice(i, 1); }
          rerender();
        });
      };
      detail.append(delBtn);
    }

    return detail;
  }

  // -- List view --

  function renderList() {
    const byDate = new Map();
    for (const s of sets) {
      if (!byDate.has(s.date)) byDate.set(s.date, []);
      byDate.get(s.date).push(s);
    }

    const sessionByDate = new Map();
    for (const s of sessions) {
      if (!sessionByDate.has(s.date)) sessionByDate.set(s.date, []);
      sessionByDate.get(s.date).push(s);
    }

    const cardioByDate = new Map();
    for (const c of cardioEntries) {
      if (!cardioByDate.has(c.date)) cardioByDate.set(c.date, []);
      cardioByDate.get(c.date).push(c);
    }

    const allDates = [...new Set([...byDate.keys(), ...sessionByDate.keys(), ...cardioByDate.keys()])]
      .sort((a, b) => b.localeCompare(a));

    // Filter bar
    const allGroups = [...new Set(sets.map((s) => s.muscleGroup))].sort();
    root.append(
      el("div", { class: "history-filters" },
        el("input", { type: "text", placeholder: "Search exercises…", value: searchText,
          oninput: (e) => { searchText = e.target.value; rerender(); } }),
        el("select", { onchange: (e) => { filterGroup = e.target.value; rerender(); } },
          el("option", { value: "" }, "All muscles"),
          ...allGroups.map((g) => el("option", { value: g, selected: filterGroup === g ? "" : null }, formatMuscle(g))),
        ),
      ),
    );

    // Apply search/filter
    const filteredDates = allDates.filter((date) => {
      const dateSets = byDate.get(date) || [];
      if (searchText) {
        const q = searchText.toLowerCase();
        if (!dateSets.some((s) => s.exercise.toLowerCase().includes(q))) return false;
      }
      if (filterGroup) {
        if (!dateSets.some((s) => s.muscleGroup === filterGroup)) return false;
      }
      return true;
    });

    if (!filteredDates.length) {
      root.append(el("p", { class: "muted" }, searchText || filterGroup ? "No matching workouts." : "No workouts logged yet."));
      return;
    }

    for (const date of filteredDates) {
      const dateSets = byDate.get(date) || [];
      const dateSessions = sessionByDate.get(date) || [];
      const dateCardio = cardioByDate.get(date) || [];
      const isExpanded = expandedDates.has(date);
      const expandable = dateSets.length > 0;

      const muscleMap = {};
      for (const s of dateSets) {
        muscleMap[s.muscleGroup] = (muscleMap[s.muscleGroup] || 0) + 1;
      }
      const muscles = Object.entries(muscleMap)
        .sort((a, b) => b[1] - a[1])
        .map(([g, n]) => `${formatMuscle(g)} (${n})`);

      const card = el("div", { class: "card history-card" + (isExpanded ? " expanded" : "") });

      // -- Header (clickable) --

      const header = el("div", { class: "history-card-header" });
      if (expandable) {
        header.style.cursor = "pointer";
        header.onclick = () => {
          if (expandedDates.has(date)) expandedDates.delete(date);
          else expandedDates.add(date);
          rerender();
        };
      }

      const meta = dateSessions[0];
      const timeStr = meta?.startTime && meta?.endTime
        ? `${meta.startTime} – ${meta.endTime}`
        : meta?.startTime ? `Started ${meta.startTime}` : "";

      header.append(
        el("div", { class: "card-row" },
          el("div", {},
            el("strong", {}, fmtDate(date)),
            timeStr && el("span", { class: "muted small", style: { marginLeft: "0.75rem" } }, timeStr),
          ),
          el("span", { class: "pill-row" },
            dateSets.length && el("span", { class: "pill" }, `${dateSets.length} sets`),
            meta?.totalRPE && el("span", { class: "pill" }, `RPE ${meta.totalRPE}`),
            meta?.leafStatus === "Yes" && el("span", { class: "pill leaf" }, "Leaf"),
            expandable && el("span", { class: "chevron" }, isExpanded ? "▾" : "▸"),
          ),
        ),
      );

      const infoParts = [];
      if (meta?.location) infoParts.push(meta.location);
      if (meta?.mesoId && meta.mesoId !== CUSTOM_MESO_ID) {
        const meso = mesoById[meta.mesoId];
        if (meso) infoParts.push(`${meso.name} · W${meta.week}`);
      } else if (dateSets.length && dateSets[0].mesoId === CUSTOM_MESO_ID) {
        infoParts.push("Custom workout");
      } else if (dateSets.length) {
        const meso = mesoById[dateSets[0].mesoId];
        if (meso) infoParts.push(`${meso.name} · W${dateSets[0].week}`);
      }
      if (infoParts.length) {
        header.append(el("div", { class: "muted small", style: { marginTop: "0.25rem" } }, infoParts.join(" · ")));
      }

      if (muscles.length) {
        header.append(
          el("div", { class: "history-muscles" },
            ...muscles.map((m) => el("span", { class: "pill small" }, m)),
          ),
        );
      }

      for (const c of dateCardio) {
        const parts = [c.cardioType];
        if (c.duration) parts.push(`${c.duration} min`);
        if (c.distance) parts.push(`${c.distance} km`);
        if (c.avgHeartRate) parts.push(`${c.avgHeartRate} bpm`);
        header.append(
          el("div", { class: "history-muscles", style: { marginTop: "0.35rem" } },
            el("span", { class: "pill small cardio-pill" }, "Cardio"),
            el("span", { class: "muted small" }, parts.join(" · ")),
          ),
        );
      }

      if (meta?.notes) {
        header.append(el("div", { class: "muted small", style: { marginTop: "0.4rem", fontStyle: "italic" } }, meta.notes));
      }

      card.append(header);

      // -- Expanded detail --

      if (isExpanded && dateSets.length) {
        card.append(buildDateDetail(dateSets, date, dateSessions));
      }

      root.append(card);
    }
  }

  // -- Calendar view --

  function renderCalendar() {
    const activeDates = new Set();
    for (const s of sets) activeDates.add(s.date);
    for (const s of sessions) activeDates.add(s.date);
    for (const c of cardioEntries) activeDates.add(c.date);

    const sessionByDate = {};
    for (const s of sessions) sessionByDate[s.date] = s;

    const setCountByDate = {};
    for (const s of sets) setCountByDate[s.date] = (setCountByDate[s.date] || 0) + 1;

    const cardioByDateCal = {};
    for (const c of cardioEntries) {
      if (!cardioByDateCal[c.date]) cardioByDateCal[c.date] = [];
      cardioByDateCal[c.date].push(c);
    }

    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];

    root.append(
      el("div", { class: "cal-nav" },
        el("button", { class: "btn small ghost", onclick: () => {
          calMonth--;
          if (calMonth < 0) { calMonth = 11; calYear--; }
          rerender();
        }}, "<"),
        el("strong", {}, `${monthNames[calMonth]} ${calYear}`),
        el("button", { class: "btn small ghost", onclick: () => {
          calMonth++;
          if (calMonth > 11) { calMonth = 0; calYear++; }
          rerender();
        }}, ">"),
      ),
    );

    const grid = el("div", { class: "cal-grid" });
    for (const d of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      grid.append(el("div", { class: "cal-header" }, d));
    }

    const firstDay = new Date(calYear, calMonth, 1);
    let startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const today = isoToday();

    for (let i = 0; i < startOffset; i++) {
      grid.append(el("div", { class: "cal-cell empty" }));
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const hasWorkout = activeDates.has(iso);
      const isToday = iso === today;
      const session = sessionByDate[iso];
      const setCount = setCountByDate[iso] || 0;
      const cardio = cardioByDateCal[iso];

      const classes = ["cal-cell"];
      if (hasWorkout) classes.push("has-workout");
      if (isToday) classes.push("today");

      const cell = el("div", { class: classes.join(" ") },
        el("span", { class: "cal-day" }, d),
      );

      if (hasWorkout) {
        const details = [];
        if (setCount) details.push(`${setCount} sets`);
        if (session?.totalRPE) details.push(`RPE ${session.totalRPE}`);
        if (session?.location) details.push(session.location);
        if (session?.leafStatus === "Yes") details.push("Leaf");
        if (cardio) {
          for (const c of cardio) {
            details.push(`${c.cardioType} ${c.duration}m`);
          }
        }
        if (details.length) {
          cell.append(el("div", { class: "cal-detail" }, details.join(" · ")));
        }
      }

      grid.append(cell);
    }

    root.append(grid);

    const monthPrefix = `${calYear}-${String(calMonth + 1).padStart(2, "0")}`;
    const monthDates = [...activeDates].filter((d) => d.startsWith(monthPrefix));
    const totalSets = monthDates.reduce((n, d) => n + (setCountByDate[d] || 0), 0);
    const cardioCount = cardioEntries.filter((c) => c.date.startsWith(monthPrefix)).length;

    root.append(
      el("div", { class: "card", style: { marginTop: "1rem" } },
        el("div", { class: "card-row" },
          el("div", {},
            el("strong", {}, `${monthDates.length} workout${monthDates.length !== 1 ? "s" : ""}`),
            el("span", { class: "muted", style: { marginLeft: "1rem" } }, `${totalSets} total sets`),
            cardioCount > 0 && el("span", { class: "muted", style: { marginLeft: "1rem" } }, `${cardioCount} cardio`),
          ),
        ),
      ),
    );
  }

  // -- Charts view --

  function renderCharts() {
    const exerciseNames = [...new Set(sets.map((s) => s.exercise))].sort();
    let selectedExercise = exerciseNames[0] || "";

    function renderChartsInner() {
      // Remove previous charts content (keep the filter bar from rerender)
      const existing = root.querySelector(".charts-content");
      if (existing) existing.remove();

      const content = el("div", { class: "charts-content" });

      content.append(
        el("div", { class: "field", style: { marginBottom: "1rem" } },
          el("label", {}, "Exercise"),
          el("select", { onchange: (e) => { selectedExercise = e.target.value; renderChartsInner(); } },
            ...exerciseNames.map((n) => el("option", { value: n, selected: n === selectedExercise ? "" : null }, n)),
          ),
        ),
      );

      if (selectedExercise) {
        const exSets = sets.filter((s) => s.exercise === selectedExercise).sort((a, b) => a.date.localeCompare(b.date));
        // Get top set per date
        const byDate = new Map();
        for (const s of exSets) {
          const existing = byDate.get(s.date);
          if (!existing || +s.weight > +existing.weight) byDate.set(s.date, s);
        }
        const dates = [...byDate.keys()];
        const points = dates.map((d, i) => ({ x: i, y: toDisplay(+byDate.get(d).weight) }));
        const labels = dates.map((d) => d.slice(5)); // MM-DD

        if (points.length > 1) {
          content.append(el("h3", {}, "Weight progression"));
          const canvas = el("canvas", { style: { width: "100%", height: "220px" } });
          content.append(el("div", { class: "chart-container" }, canvas));
          requestAnimationFrame(() => drawChart(canvas, [{ label: selectedExercise, points }], { xLabels: labels, yLabel: unitLabel() }));

          // e1RM chart
          const e1rmPoints = dates.map((d, i) => {
            const s = byDate.get(d);
            return { x: i, y: toDisplay(Math.round(epley1RM(+s.weight, +s.reps) * 10) / 10) };
          });
          content.append(el("h3", { style: { marginTop: "1rem" } }, "Estimated 1RM"));
          const canvas2 = el("canvas", { style: { width: "100%", height: "220px" } });
          content.append(el("div", { class: "chart-container" }, canvas2));
          requestAnimationFrame(() => drawChart(canvas2, [{ label: "e1RM", color: "#ffb547", points: e1rmPoints }], { xLabels: labels, yLabel: unitLabel() }));
        } else {
          content.append(el("p", { class: "muted" }, "Need more sessions to show charts."));
        }
      }

      root.append(content);
    }

    renderChartsInner();
  }

  rerender();
}
