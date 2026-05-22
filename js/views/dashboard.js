import { el, fmtDate, isoToday, run, toast, withLoading } from "../ui.js";
import * as data from "../data.js";
import * as sheets from "../sheets.js";
import { drawChart, sparkline } from "../chart.js";

function stat(value, label) {
  return el("div", { class: "summary-stat" },
    el("div", { class: "summary-stat-value" }, value),
    el("div", { class: "summary-stat-label" }, label),
  );
}

function formatVolume(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export async function render(container, { signedIn }) {
  if (!signedIn) {
    const tpl = document.getElementById("tpl-signed-out");
    container.append(tpl.content.cloneNode(true));
    return;
  }

  if (!sheets.getSpreadsheetId()) {
    container.append(
      el("div", { class: "banner" },
        "No data sheet linked yet. ",
        el("a", { href: "#/settings" }, "Open settings"),
        " to create or pick one.",
      ),
    );
    return;
  }

  // --- Load all data upfront ---
  const [mesos, activeMeso, allSets, allSessions, cardioEntries, bodyWeights] = await Promise.all([
    data.listMesocycles(),
    data.getActiveMesocycle(),
    data.listSets(),
    data.listSessions(),
    data.listCardio(),
    data.listBodyWeights(),
  ]);
  const today = isoToday();

  // --- Quick stats row ---
  const thisMonth = today.slice(0, 7);
  const monthSessions = new Set(allSessions.filter((s) => s.date.startsWith(thisMonth)).map((s) => s.date));
  const monthSets = allSets.filter((s) => s.date.startsWith(thisMonth)).length;

  // Streak: count consecutive days with workouts going backwards from today
  const workoutDates = new Set([...allSessions.map((s) => s.date), ...allSets.map((s) => s.date)]);
  let streak = 0;
  let d = new Date();
  while (true) {
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    if (workoutDates.has(iso)) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }

  const latestBW = bodyWeights.length ? bodyWeights.sort((a, b) => b.date.localeCompare(a.date))[0] : null;

  container.append(
    el("div", { class: "summary-stats" },
      stat(String(monthSessions.size), "Workouts this month"),
      stat(String(monthSets), "Sets this month"),
      stat(streak > 0 ? `${streak} day${streak !== 1 ? "s" : ""}` : "—", "Current streak"),
      stat(latestBW ? `${latestBW.weight} ${latestBW.unit}` : "—", "Body weight"),
    ),
  );

  // --- Quick actions row ---
  container.append(
    el("div", { class: "row", style: { gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" } },
      el("a", { class: "btn primary", href: "#/workout" }, "Start Workout"),
      el("a", { class: "btn", href: "#/cardio" }, "Log Cardio"),
      el("button", { class: "btn", id: "bw-toggle" }, "Log Weight"),
    ),
  );

  // --- Inline body weight form ---
  const bwForm = el("div", { class: "bw-widget", style: { display: "none" } });
  const bwState = { date: today, weight: "", unit: "lbs", notes: "" };
  const bwSaveBtn = el("button", { class: "btn primary small" }, "Save");
  bwSaveBtn.onclick = withLoading(bwSaveBtn, async () => {
    if (!bwState.weight) return toast("Enter weight", "bad");
    await run(data.logBodyWeight(bwState), { ok: "Weight logged" });
    bwState.weight = ""; bwState.notes = "";
    bwForm.style.display = "none";
    // Refresh
    location.hash = "#/";
  });
  bwForm.append(
    el("div", { class: "field-row" },
      el("div", { class: "field" },
        el("label", {}, "Weight"),
        el("input", { type: "number", inputmode: "decimal", step: "0.1", placeholder: "e.g. 175", oninput: (e) => (bwState.weight = e.target.value) }),
      ),
      el("div", { class: "field" },
        el("label", {}, "Unit"),
        el("select", { onchange: (e) => (bwState.unit = e.target.value) },
          el("option", { value: "lbs" }, "lbs"),
          el("option", { value: "kg" }, "kg"),
        ),
      ),
      el("div", { class: "field" },
        el("label", {}, "Date"),
        el("input", { type: "date", value: bwState.date, oninput: (e) => (bwState.date = e.target.value) }),
      ),
    ),
    el("div", { class: "field-row" },
      el("div", { class: "field" },
        el("label", {}, "Notes"),
        el("input", { type: "text", placeholder: "Optional", oninput: (e) => (bwState.notes = e.target.value) }),
      ),
    ),
    bwSaveBtn,
  );
  container.append(bwForm);
  container.querySelector("#bw-toggle").onclick = () => {
    bwForm.style.display = bwForm.style.display === "none" ? "" : "none";
  };

  // --- Active meso summary (Enhancement 1: with sparklines) ---
  if (activeMeso) {
    const start = new Date(activeMeso.startDate);
    const days = Math.floor((Date.now() - start.getTime()) / 86400000);
    const week = Math.min(+activeMeso.weeks, Math.max(1, Math.floor(days / 7) + 1));
    const isDeload = week === +activeMeso.weeks;
    const showSparklines = week >= 2;

    const weekVol = await data.weeklyVolume(activeMeso.id, week);
    const plan = await data.getWeekPlan(activeMeso.id);
    const planThisWeek = plan.filter((p) => p.week === week);

    // Pre-compute sparkline data per muscle group (sets per week across meso)
    const sparkData = {};
    if (showSparklines) {
      const mesoSets = allSets.filter((s) => s.mesoId === activeMeso.id);
      for (const p of planThisWeek) {
        const pts = [];
        for (let w = 1; w <= week; w++) {
          const weekStart = new Date(start);
          weekStart.setDate(weekStart.getDate() + (w - 1) * 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          const wStart = weekStart.toISOString().slice(0, 10);
          const wEnd = weekEnd.toISOString().slice(0, 10);
          const count = mesoSets.filter(
            (s) => s.muscleGroup === p.muscleGroup && s.date >= wStart && s.date <= wEnd,
          ).length;
          pts.push({ x: w, y: count });
        }
        sparkData[p.muscleGroup] = pts;
      }
    }

    const volumeRows = planThisWeek.map((p) => {
      const done = weekVol[p.muscleGroup] || 0;
      const pct = Math.min(100, Math.round((done / Math.max(1, p.targetSets)) * 100));
      const cells = [
        el("td", { class: "muscle" }, p.muscleGroup),
        el("td", {}, `${done} / ${p.targetSets}`),
        el("td", {}, `${p.targetRIR} RIR`),
        el("td", {},
          el("div", {
            style: {
              background: "var(--panel-2)",
              borderRadius: "999px",
              overflow: "hidden",
              height: "8px",
            },
          },
            el("div", {
              style: {
                background:
                  done >= p.targetSets ? "var(--ok)" :
                  done >= p.targetSets * 0.5 ? "var(--warn)" : "var(--accent)",
                width: pct + "%",
                height: "100%",
              },
            }),
          ),
        ),
      ];
      if (showSparklines) {
        const cvs = el("canvas", { style: { width: "80px", height: "24px" } });
        cells.push(el("td", { class: "sparkline-cell" }, cvs));
        requestAnimationFrame(() => sparkline(cvs, sparkData[p.muscleGroup] || [], "#ffb547"));
      }
      return el("tr", {}, ...cells);
    });

    container.append(
      el("section", { class: "card" },
        el("div", { class: "card-row" },
          el("div", {},
            el("h2", {}, activeMeso.name),
            el("div", { class: "muted small" },
              `Week ${week} of ${activeMeso.weeks}` + (isDeload ? " · deload" : "") +
              ` · started ${fmtDate(activeMeso.startDate)}`,
            ),
          ),
          el("a", { class: "btn primary", href: "#/workout" }, "Train"),
        ),
        el("h3", { style: { marginTop: "1rem" } }, "Volume this week"),
        el("table", { class: "meso-grid" },
          el("thead", {},
            el("tr", {},
              el("th", { style: { textAlign: "left" } }, "Muscle"),
              el("th", {}, "Sets done"),
              el("th", {}, "Target RIR"),
              el("th", {}, "Progress"),
              ...(showSparklines ? [el("th", {}, "Trend")] : []),
            ),
          ),
          el("tbody", {}, ...volumeRows),
        ),
      ),
    );
  } else {
    container.append(
      el("div", { class: "banner ok" },
        "No active mesocycle. ",
        el("a", { href: "#/meso/new" }, "Plan one now"),
        ".",
      ),
    );
  }

  // --- Enhancement 2: Recent Activity (last 5 workouts) ---
  if (allSets.length) {
    const setsByDate = {};
    for (const s of allSets) {
      if (!setsByDate[s.date]) setsByDate[s.date] = [];
      setsByDate[s.date].push(s);
    }
    const recentDates = Object.keys(setsByDate).sort((a, b) => b.localeCompare(a)).slice(0, 5);
    if (recentDates.length) {
      const section = el("section", { class: "card recent-activity" },
        el("h3", {}, "Recent Activity"),
      );
      for (const date of recentDates) {
        const sets = setsByDate[date];
        const setCount = sets.length;
        // Muscle groups sorted by count
        const mgCount = {};
        for (const s of sets) {
          const mg = s.muscleGroup || "Other";
          mgCount[mg] = (mgCount[mg] || 0) + 1;
        }
        const muscleGroups = Object.entries(mgCount).sort((a, b) => b[1] - a[1]).map(([mg]) => mg);
        // Total volume
        const totalVol = sets.reduce((sum, s) => sum + (+s.weight || 0) * (+s.reps || 0), 0);

        const pills = el("div", { class: "muscle-pills" });
        for (const mg of muscleGroups) {
          pills.append(el("span", { class: "pill" }, mg));
        }

        section.append(
          el("div", { class: "activity-card" },
            el("div", { class: "activity-header" },
              el("span", { class: "activity-date" }, fmtDate(date)),
              el("span", { class: "muted small" }, `${setCount} sets`),
              totalVol > 0
                ? el("span", { class: "muted small" }, `${totalVol.toLocaleString()} lbs`)
                : null,
            ),
            pills,
          ),
        );
      }
      container.append(section);
    }
  }

  // --- Enhancement 3: Cardio Summary ---
  if (cardioEntries.length) {
    const monthPrefix = today.slice(0, 7);
    const thisMonthCardio = cardioEntries.filter((c) => c.date && c.date.startsWith(monthPrefix));
    const totalMinutes = thisMonthCardio.reduce((sum, c) => sum + (+c.duration || 0), 0);
    const lastThree = cardioEntries.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 3);

    const section = el("section", { class: "card" },
      el("h3", {}, "Cardio"),
      el("div", { class: "cardio-summary-stats" },
        stat(String(thisMonthCardio.length), "Sessions this month"),
        stat(totalMinutes > 0 ? `${totalMinutes} min` : "—", "Minutes this month"),
      ),
    );

    if (lastThree.length) {
      section.append(el("h4", { class: "small muted", style: { marginTop: "0.5rem", marginBottom: "0.25rem" } }, "Recent"));
      for (const entry of lastThree) {
        section.append(
          el("div", { class: "cardio-entry" },
            el("div", { class: "card-row" },
              el("span", {}, entry.type || "Cardio"),
              el("span", { class: "muted small" },
                `${entry.duration || "?"} min · ${entry.date ? fmtDate(entry.date) : "—"}`,
              ),
            ),
          ),
        );
      }
    }
    container.append(section);
  }

  // --- Body weight trend chart ---
  if (bodyWeights.length > 1) {
    const sorted = bodyWeights.slice().sort((a, b) => a.date.localeCompare(b.date));
    const pts = sorted.map((bw, i) => ({ x: i, y: +bw.weight }));
    const labels = sorted.map((bw) => bw.date.slice(5));
    const canvas = el("canvas", { style: { width: "100%", height: "200px" } });
    container.append(
      el("section", { class: "card" },
        el("h3", {}, "Body weight trend"),
        el("div", { class: "chart-container" }, canvas),
      ),
    );
    requestAnimationFrame(() => drawChart(canvas, [{ label: "Weight", color: "#36c46b", points: pts }], { xLabels: labels, yLabel: bodyWeights[0].unit || "lbs" }));
  }

  // --- Recent PRs ---
  const recentPRs = await data.getRecentPRs(5);
  if (recentPRs.length) {
    const prCard = el("section", { class: "card" },
      el("h3", {}, "Recent PRs"),
    );
    for (const pr of recentPRs) {
      prCard.append(
        el("div", { class: "card-row", style: { padding: "0.3rem 0", borderBottom: "1px solid var(--line)" } },
          el("div", {},
            el("strong", {}, pr.exercise),
            el("span", { class: "muted small", style: { marginLeft: "0.5rem" } }, `${pr.weight} × ${pr.reps}`),
          ),
          el("div", {},
            el("span", { class: "pill pr-badge" }, pr.type === "weight" ? "Weight PR" : "e1RM PR"),
            el("span", { class: "muted small", style: { marginLeft: "0.5rem" } }, fmtDate(pr.date)),
          ),
        ),
      );
    }
    container.append(prCard);
  }

  // --- Enhancement 4: All-Time Stats ---
  if (allSets.length) {
    const uniqueDates = new Set(allSets.map((s) => s.date));
    const totalVolume = allSets.reduce((sum, s) => sum + (+s.weight || 0) * (+s.reps || 0), 0);
    const uniqueExercises = new Set(allSets.map((s) => s.exercise));

    container.append(
      el("section", { class: "card" },
        el("h3", {}, "All-Time Stats"),
        el("div", { class: "summary-stats", style: { marginBottom: "0" } },
          stat(String(uniqueDates.size), "Total workouts"),
          stat(formatVolume(totalVolume) + " lbs", "Total volume"),
          stat(String(uniqueExercises.size), "Unique exercises"),
        ),
      ),
    );
  }

  // --- Enhancement 5: Muscle Group Distribution ---
  if (allSets.length) {
    const mgCounts = {};
    for (const s of allSets) {
      const mg = s.muscleGroup || "Other";
      mgCounts[mg] = (mgCounts[mg] || 0) + 1;
    }
    const sorted = Object.entries(mgCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maxCount = sorted[0]?.[1] || 1;

    const section = el("section", { class: "card" },
      el("h3", {}, "Muscle Group Distribution"),
    );
    for (const [mg, count] of sorted) {
      const pct = Math.round((count / maxCount) * 100);
      section.append(
        el("div", { class: "muscle-dist-row" },
          el("span", { class: "muscle-dist-label" }, mg),
          el("div", { class: "muscle-dist-bar" },
            el("div", { class: "muscle-dist-fill", style: { width: pct + "%" } }),
          ),
          el("span", { class: "muted small", style: { textAlign: "right" } }, String(count)),
        ),
      );
    }
    container.append(section);
  }

  // --- Workout frequency chart (last 8 weeks) ---
  const now = new Date();
  const freqData = [];
  const freqLabels = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (i * 7 + weekStart.getDay()));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const startIso = weekStart.toISOString().slice(0, 10);
    const endIso = weekEnd.toISOString().slice(0, 10);
    const count = new Set(allSessions.filter((s) => s.date >= startIso && s.date <= endIso).map((s) => s.date)).size;
    freqData.push({ x: 7 - i, y: count });
    freqLabels.push(startIso.slice(5));
  }
  if (freqData.some((p) => p.y > 0)) {
    const canvas = el("canvas", { style: { width: "100%", height: "180px" } });
    container.append(
      el("section", { class: "card" },
        el("h3", {}, "Workout frequency"),
        el("div", { class: "chart-container" }, canvas),
      ),
    );
    requestAnimationFrame(() => drawChart(canvas, [{ label: "Workouts", color: "#ff5a1f", points: freqData }], { type: "bar", xLabels: freqLabels, yLabel: "days" }));
  }

  // --- All mesos list ---
  container.append(
    el("div", { class: "section-title" },
      el("h2", {}, "Mesocycles"),
      el("a", { class: "btn small", href: "#/meso/new" }, "+ New"),
    ),
  );

  if (!mesos.length) {
    container.append(el("p", { class: "muted" }, "You haven't planned a mesocycle yet."));
  } else {
    for (const m of mesos.slice().reverse()) {
      container.append(
        el("a", { class: "card", href: `#/meso/${m.id}`, style: { display: "block" } },
          el("div", { class: "card-row" },
            el("div", {},
              el("strong", {}, m.name),
              el("div", { class: "muted small" },
                `${m.weeks} weeks · ${fmtDate(m.startDate)} · ${m.status}`,
              ),
            ),
            el("span", { class: "muted" }, "›"),
          ),
        ),
      );
    }
  }
}
