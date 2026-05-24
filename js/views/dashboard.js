import { el, fmtDate, isoToday, run, toast, withLoading, stat } from "../ui.js";
import * as data from "../data.js";
import * as sheets from "../sheets.js";
import { drawChart, sparkline } from "../chart.js";
import { MUSCLE_GROUPS, getWorkoutModules } from "../rp.js";
import { GROWTH_STANDARDS, statusMeta, generateLandmarks, classifyVolume } from "../standards.js";
import { weeklyStats, monthlyStats, findGaps, rankModules, calibrateLandmarks } from "../insights.js";
import { openExercisePicker } from "../exercise-picker.js";

function startWorkout(exercises) {
  localStorage.setItem(
    "gama.pendingWorkout",
    JSON.stringify(exercises.map((e) => ({ exercise: e.exercise, muscleGroup: e.muscleGroup || "" }))),
  );
  location.hash = "#/workout";
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
  const [mesos, allSets, allSessions, cardioEntries, bodyWeights, profile] = await Promise.all([
    data.listMesocycles(),
    data.listSets(),
    data.listSessions(),
    data.listCardio(),
    data.listBodyWeights(),
    data.getProfile(),
  ]);
  let landmarks = await data.getLandmarks();
  const activeMeso = mesos.find((m) => m.status === "active") || null;
  const today = isoToday();

  // --- Auto-calibrate landmarks from training response ---
  // Guarded by a signature of the set data so it only runs (and writes) when
  // there's something new to learn from, never oscillating on plain reloads.
  let calibrationChanges = [];
  if (profile && allSets.length) {
    const latestDate = allSets.reduce((m, s) => (s.date > m ? s.date : m), "");
    const sig = `${allSets.length}:${latestDate}`;
    const lastSig = await data.getMeta("calibrationSig");
    if (sig !== lastSig) {
      const { landmarks: cal, changes } = calibrateLandmarks(landmarks, allSets, {});
      if (changes.length) {
        for (const g of new Set(changes.map((c) => c.group))) {
          await data.saveLandmark(g, cal[g]);
        }
        landmarks = cal;
        calibrationChanges = changes;
      }
      await data.setMeta("calibrationSig", sig);
    }
  }

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

  // --- First-run: generate volume landmarks from a quick profile ---
  if (!profile) {
    container.append(renderProfilePrompt());
  }

  // --- Notice when auto-calibration adjusted landmarks ---
  if (calibrationChanges.length) {
    container.append(renderCalibrationNotice(calibrationChanges));
  }

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

  // --- This week vs. optimal / This month / Suggestions ---
  const weekly = weeklyStats(allSets, landmarks);
  const monthly = monthlyStats(allSets, landmarks);
  const gaps = findGaps(weekly, landmarks);
  const exerciseLib = await data.getFullExerciseLibrary();

  container.append(renderWeeklyCard(weekly));
  container.append(renderMonthlyCard(monthly));
  container.append(renderSuggestionsCard(gaps, landmarks, exerciseLib));

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
              el("span", {}, entry.cardioType || "Cardio"),
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

// ── New muscle-growth coaching cards ──────────────────────────────

function statusPill(status) {
  const m = statusMeta(status);
  return el("span", {
    class: "pill",
    style: { background: m.color, color: "#0b0d12", fontWeight: "600" },
  }, m.label);
}

// Order so muscles needing attention surface first.
const STATUS_RANK = {
  "below-MEV": 0, "under-MV": 1, "over-MRV": 2, "near-MRV": 3, "maintenance": 4, "productive": 5,
};

function renderProfilePrompt() {
  const card = el("section", { class: "card" },
    el("h2", {}, "Set up your volume targets"),
    el("p", { class: "muted small" },
      "Tell us your training experience and we'll generate evidence-based weekly set " +
      "targets (MEV/MAV/MRV) per muscle group. They auto-adjust as you log workouts."),
  );
  const prof = { experienceLevel: "intermediate", sex: "" };
  card.append(
    el("div", { class: "field-row three" },
      el("div", { class: "field" },
        el("label", {}, "Experience"),
        el("select", { onchange: (e) => (prof.experienceLevel = e.target.value) },
          el("option", { value: "beginner" }, "Beginner (< 1 yr)"),
          el("option", { value: "intermediate", selected: "" }, "Intermediate (1–3 yr)"),
          el("option", { value: "advanced" }, "Advanced (3+ yr)"),
        ),
      ),
      el("div", { class: "field" },
        el("label", {}, "Sex (optional)"),
        el("select", { onchange: (e) => (prof.sex = e.target.value) },
          el("option", { value: "" }, "—"),
          el("option", { value: "male" }, "Male"),
          el("option", { value: "female" }, "Female"),
        ),
      ),
    ),
  );
  const btn = el("button", { class: "btn primary" }, "Generate my targets");
  btn.onclick = withLoading(btn, async () => {
    await run(data.replaceLandmarks(generateLandmarks(prof)), { ok: "Targets generated" });
    await data.saveProfile(prof);
    location.reload();
  });
  card.append(btn);
  return card;
}

function renderCalibrationNotice(changes) {
  const card = el("section", { class: "card" }, el("h3", {}, "Targets auto-adjusted"));
  for (const c of changes) {
    card.append(
      el("div", { class: "muted small" },
        `${c.group} ${c.field} ${c.from} → ${c.to} (${c.reason})`),
    );
  }
  return card;
}

function renderWeeklyCard(weekly) {
  const card = el("section", { class: "card" },
    el("h3", {}, "This week vs. optimal"),
    el("div", { class: "muted small" }, `${fmtDate(weekly.weekStart)} – ${fmtDate(weekly.weekEnd)}`),
  );
  const entries = Object.entries(weekly.groups);
  if (!entries.length) {
    card.append(el("p", { class: "muted", style: { marginTop: "0.5rem" } }, "No sets logged this week yet."));
    return card;
  }
  entries.sort((a, b) =>
    (STATUS_RANK[a[1].status] ?? 9) - (STATUS_RANK[b[1].status] ?? 9) || b[1].sets - a[1].sets);

  const rows = entries.map(([g, s]) => {
    const band = s.landmark;
    const target = band ? `${band.MEV}–${band.MAV_hi}` : "—";
    return el("tr", {},
      el("td", { class: "muscle" }, g),
      el("td", {}, `${s.sets}`, el("span", { class: "muted small" }, ` / ${target}`)),
      el("td", {}, `${s.frequency}/${GROWTH_STANDARDS.frequencyTarget}`),
      el("td", {}, s.repRangePct == null ? "—" : `${s.repRangePct}%`),
      el("td", {}, s.rirInWindowPct == null ? "—" : `${s.rirInWindowPct}%`),
      el("td", {}, statusPill(s.status)),
    );
  });

  card.append(
    el("table", { class: "meso-grid" },
      el("thead", {},
        el("tr", {},
          el("th", { style: { textAlign: "left" } }, "Muscle"),
          el("th", {}, "Sets / target"),
          el("th", {}, "Freq"),
          el("th", {}, "Reps 6–15"),
          el("th", {}, "Effort ≤3 RIR"),
          el("th", {}, "Status"),
        ),
      ),
      el("tbody", {}, ...rows),
    ),
  );
  return card;
}

function renderMonthlyCard(monthly) {
  const card = el("section", { class: "card" },
    el("h3", {}, "This month"),
    el("div", { class: "muted small" }, `${fmtDate(monthly.windowStart)} – ${fmtDate(monthly.windowEnd)}`),
  );

  if (monthly.deloadDue) {
    card.append(
      el("div", { class: "banner warn", style: { marginTop: "0.5rem" } },
        `You've trained ${monthly.consecutiveWeeks} weeks straight — a deload week may help you recover and grow.`),
    );
  }

  card.append(
    el("div", { class: "summary-stats", style: { marginTop: "0.5rem" } },
      stat(String(monthly.totalSessions), "Sessions"),
      stat(`${monthly.consecutiveWeeks} wk`, "Training streak"),
    ),
  );

  const entries = Object.entries(monthly.groups)
    .sort((a, b) => b[1].totalSets - a[1].totalSets)
    .slice(0, 10);
  if (!entries.length) {
    card.append(el("p", { class: "muted" }, "Log some workouts to see monthly trends."));
    return card;
  }

  for (const [g, m] of entries) {
    const arrow = m.trend > 0 ? "▲" : m.trend < 0 ? "▼" : "—";
    const arrowColor = m.trend > 0 ? "var(--ok)" : m.trend < 0 ? "var(--bad, #e5484d)" : "var(--muted)";
    const cvs = el("canvas", { style: { width: "80px", height: "24px" } });
    const pts = m.series.map((w, i) => ({ x: i, y: w.count }));
    requestAnimationFrame(() => sparkline(cvs, pts, "#ffb547"));
    card.append(
      el("div", { class: "growth-trend-row" },
        el("span", { class: "muscle-dist-label" }, g),
        el("span", { class: "sparkline-cell" }, cvs),
        el("span", { style: { color: arrowColor, fontWeight: "600", textAlign: "center" } }, arrow),
        el("span", { class: "muted small", style: { textAlign: "right" } },
          `${m.totalSets} sets · ${m.avgFrequency.toFixed(1)}×/wk`),
      ),
    );
  }
  return card;
}

function renderSuggestionsCard(gaps, landmarks, exerciseLib) {
  const modules = getWorkoutModules();
  const card = el("section", { class: "card" }, el("h3", {}, "Suggested for you"));

  if (gaps.length) {
    const pills = el("div", { class: "muscle-pills" });
    for (const gp of gaps.slice(0, 6)) {
      const bits = [];
      if (gp.volumeGap > 0) bits.push(`${gp.sets}/${gp.targetSets} sets`);
      if (gp.freqGap > 0) bits.push(`${gp.frequency}×/wk`);
      pills.append(el("span", { class: "pill" }, `${gp.group}: ${bits.join(", ")}`));
    }
    card.append(
      el("p", { class: "muted small" }, "These muscles are behind your weekly targets:"),
      pills,
    );
  } else {
    card.append(el("p", { class: "muted small" }, "You're on track with your weekly targets — nice work."));
  }

  // Focus selector + module suggestions.
  const focusSel = el("select", {},
    el("option", { value: "__auto__" }, "Auto (lagging groups)"),
    ...MUSCLE_GROUPS.map((g) => el("option", { value: g }, g)),
  );
  const suggestions = el("div", {});

  function targetGroups() {
    if (focusSel.value === "__auto__") {
      return gaps.length ? gaps.map((g) => g.group) : [];
    }
    return [focusSel.value];
  }

  function renderSuggestions() {
    suggestions.replaceChildren();
    const targets = targetGroups();
    if (!targets.length) {
      suggestions.append(el("p", { class: "muted small" }, "Pick a focus muscle to see suggested workouts."));
      return;
    }
    const ranked = rankModules(modules, targets).slice(0, 3);
    if (!ranked.length) {
      suggestions.append(el("p", { class: "muted small" }, "No matching modules found."));
      return;
    }
    for (const r of ranked) {
      const covered = Object.entries(r.module.groups)
        .filter(([g]) => targets.includes(g))
        .map(([g, n]) => `${g} (${n})`)
        .join(", ");
      const useBtn = el("button", { class: "btn small primary" }, "Use");
      useBtn.onclick = () => startWorkout(r.module.exercises);
      suggestions.append(
        el("div", { class: "card-row", style: { padding: "0.4rem 0", borderBottom: "1px solid var(--line)" } },
          el("div", {},
            el("strong", {}, r.module.label),
            el("div", { class: "muted small" }, `Targets: ${covered}`),
          ),
          useBtn,
        ),
      );
    }
  }

  focusSel.onchange = renderSuggestions;
  renderSuggestions();

  const buildBtn = el("button", { class: "btn", style: { marginTop: "0.5rem" } }, "Build a workout");
  buildBtn.onclick = () => openBuildModal({ landmarks, exerciseLib, modules, focusGroups: targetGroups() });

  card.append(
    el("div", { class: "field", style: { marginTop: "0.75rem" } },
      el("label", {}, "Focus"),
      focusSel,
    ),
    suggestions,
    buildBtn,
  );
  return card;
}

function openBuildModal({ landmarks, exerciseLib, modules, focusGroups }) {
  const picked = [];
  const overlay = el("div", { class: "modal-overlay" });
  const body = el("div", {});

  function add(exercise, muscleGroup) {
    if (picked.some((p) => p.exercise === exercise)) return;
    picked.push({ exercise, muscleGroup: muscleGroup || "" });
    rerender();
  }

  function rerender() {
    body.replaceChildren();

    // Suggested modules (ranked toward the focus groups, else just the first few).
    const ranked = (focusGroups && focusGroups.length ? rankModules(modules, focusGroups) : modules.map((m) => ({ module: m }))).slice(0, 4);
    const chips = el("div", { class: "muscle-pills" });
    for (const r of ranked) {
      const chip = el("button", { class: "btn small" }, `+ ${r.module.dayName}`);
      chip.title = r.module.label;
      chip.onclick = () => { for (const e of r.module.exercises) add(e.exercise, e.muscleGroup); };
      chips.append(chip);
    }

    // Picked exercises.
    const list = el("div", {});
    if (!picked.length) {
      list.append(el("p", { class: "muted small" }, "No exercises yet. Add a module or individual exercises."));
    } else {
      for (const p of picked) {
        const rm = el("button", { class: "btn small danger ghost" }, "×");
        rm.onclick = () => { picked.splice(picked.indexOf(p), 1); rerender(); };
        list.append(
          el("div", { class: "card-row", style: { padding: "0.25rem 0" } },
            el("span", {}, p.exercise, el("span", { class: "muted small" }, ` · ${p.muscleGroup || "—"}`)),
            rm,
          ),
        );
      }
    }

    // Live preview: estimated sets per group (~3 sets/exercise) vs target band.
    const byGroup = {};
    for (const p of picked) byGroup[p.muscleGroup || "Other"] = (byGroup[p.muscleGroup || "Other"] || 0) + 1;
    const preview = el("div", {});
    for (const [g, n] of Object.entries(byGroup)) {
      const est = n * 3;
      const band = landmarks[g];
      const status = band ? classifyVolume(est, band) : "below-MEV";
      preview.append(
        el("div", { class: "card-row", style: { padding: "0.2rem 0" } },
          el("span", { class: "muscle" }, g),
          el("span", { class: "muted small" },
            band ? `~${est} sets (target ${band.MEV}–${band.MAV_hi})` : `~${est} sets`),
          statusPill(status),
        ),
      );
    }

    const addExBtn = el("button", { class: "btn small" }, "+ Add exercise");
    addExBtn.onclick = () => openExercisePicker({
      exerciseLib,
      exclude: picked.map((p) => p.exercise),
      onPick: ({ name, group }) => add(name, group),
    });

    const startBtn = el("button", { class: "btn primary", disabled: picked.length ? null : true }, "Start workout");
    startBtn.onclick = () => { overlay.remove(); startWorkout(picked); };
    const cancel = el("button", { class: "btn" }, "Cancel");
    cancel.onclick = () => overlay.remove();

    body.append(
      el("h3", {}, "Build a workout"),
      el("p", { class: "muted small" }, "Add modules from your programs or pick exercises, then start logging."),
      chips,
      el("div", { style: { margin: "0.5rem 0" } }, addExBtn),
      list,
      picked.length ? el("h4", { class: "muted small", style: { marginTop: "0.75rem" } }, "Estimated volume") : null,
      preview,
      el("div", { class: "btn-row", style: { marginTop: "0.75rem" } }, cancel, startBtn),
    );
  }

  rerender();
  overlay.append(el("div", { class: "modal-card", style: { maxWidth: "520px" } }, body));
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  document.body.append(overlay);
}
