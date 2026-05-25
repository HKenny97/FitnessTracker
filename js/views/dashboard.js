import { el, fmtDate, isoToday, stat, formatMuscle } from "../ui.js";
import * as data from "../data.js";
import * as sheets from "../sheets.js";
import { drawChart, sparkline } from "../chart.js";
import { toDisplay, unitLabel, dbVolumeFactor } from "../units.js";

const DIST_COLORS = ["#39b54a", "#4da6ff", "#ffb547", "#c97bff", "#ff5a1f", "#36c4b7", "#f06292", "#9ccc65"];

function formatVolume(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function secHead(icon, title) {
  return el("div", { class: "sec-head" }, el("span", { class: "ic" }, icon), el("h3", {}, title));
}

// Inline SVG progress ring. pct is 0..1.
function progressRing(pct, centerTop, centerBottom) {
  const r = 29, c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, pct)));
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "progress-ring");
  svg.setAttribute("width", "68"); svg.setAttribute("height", "68");
  svg.setAttribute("viewBox", "0 0 68 68");
  svg.innerHTML = `
    <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#39b54a"/><stop offset="1" stop-color="#7b4fbf"/></linearGradient></defs>
    <circle cx="34" cy="34" r="${r}" fill="none" stroke="#232a33" stroke-width="7"/>
    <circle cx="34" cy="34" r="${r}" fill="none" stroke="url(#ringGrad)" stroke-width="7" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}" transform="rotate(-90 34 34)"/>
    <text x="34" y="32" text-anchor="middle" fill="#e8ecf1" font-size="15" font-weight="800">${centerTop}</text>
    <text x="34" y="45" text-anchor="middle" fill="#8a95a3" font-size="8">${centerBottom}</text>`;
  return svg;
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
  const [mesos, allSets, allSessions, cardioEntries, eqMap] = await Promise.all([
    data.listMesocycles(),
    data.listSets(),
    data.listSessions(),
    data.listCardio(),
    data.getEquipmentMap(),
  ]);
  const activeMeso = mesos.find((m) => m.status === "active") || null;
  const today = isoToday();
  // Dumbbell sets count both implements toward tonnage.
  const setVol = (s) => (+s.weight || 0) * (+s.reps || 0) * dbVolumeFactor(s.exercise, eqMap.get((s.exercise || "").toLowerCase()));

  // --- Quick stats ---
  const thisMonth = today.slice(0, 7);
  const monthSessions = new Set(allSessions.filter((s) => s.date.startsWith(thisMonth)).map((s) => s.date));
  const monthSets = allSets.filter((s) => s.date.startsWith(thisMonth)).length;

  // Streak: consecutive days with workouts going backwards from today.
  const workoutDates = new Set([...allSessions.map((s) => s.date), ...allSets.map((s) => s.date)]);
  let streak = 0;
  let d = new Date();
  while (true) {
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    if (workoutDates.has(iso)) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }

  // --- Hero stat band ---
  container.append(
    el("section", { class: "hero" },
      el("div", { class: "hero-greet" }, `${greeting()} — `,
        el("b", {}, activeMeso ? activeMeso.name : "ready to train"), "."),
      el("div", { class: "hero-stats" },
        el("div", { class: "hstat" },
          el("div", { class: "v" + (streak > 0 ? " flame" : "") }, streak > 0 ? `${streak} 🔥` : "—"),
          el("div", { class: "l" }, "Day streak")),
        el("div", { class: "hstat" },
          el("div", { class: "v" }, String(monthSessions.size)),
          el("div", { class: "l" }, "Workouts / mo")),
        el("div", { class: "hstat" },
          el("div", { class: "v" }, String(monthSets)),
          el("div", { class: "l" }, "Sets / mo")),
      ),
    ),
  );

  // --- Quick actions ---
  container.append(
    el("div", { class: "row", style: { gap: "0.6rem", marginBottom: "1.2rem", flexWrap: "wrap" } },
      el("a", { class: "btn primary", href: "#/workout", style: { flex: "1", minWidth: "160px" } }, "▶ Start Workout"),
      el("a", { class: "btn", href: "#/cardio" }, "＋ Log Cardio"),
    ),
  );

  // --- Active meso summary with sparklines ---
  if (activeMeso) {
    const start = new Date(activeMeso.startDate);
    const days = Math.floor((Date.now() - start.getTime()) / 86400000);
    const week = Math.min(+activeMeso.weeks, Math.max(1, Math.floor(days / 7) + 1));
    const isDeload = week === +activeMeso.weeks;
    const showSparklines = week >= 2;

    const weekVol = await data.weeklyVolume(activeMeso.id, week);
    const plan = await data.getEffectiveWeekPlan(activeMeso.id);
    const planThisWeek = plan.filter((p) => p.week === week);

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
        el("td", { class: "muscle" }, formatMuscle(p.muscleGroup)),
        el("td", {}, `${done} / ${p.targetSets}`),
        el("td", {}, el("span", { class: "rir-pill" }, `${p.targetRIR} RIR`)),
        el("td", {},
          el("div", {
            style: { background: "var(--panel-2)", borderRadius: "999px", overflow: "hidden", height: "8px", minWidth: "60px" },
          },
            el("div", {
              style: {
                background:
                  done >= p.targetSets ? "var(--ok)" :
                  done >= p.targetSets * 0.5 ? "var(--warn)" : "var(--accent)",
                width: pct + "%", height: "100%",
              },
            }),
          ),
        ),
      ];
      if (showSparklines) {
        const cvs = el("canvas", { style: { width: "80px", height: "24px" } });
        cells.push(el("td", { class: "sparkline-cell" }, cvs));
        requestAnimationFrame(() => sparkline(cvs, sparkData[p.muscleGroup] || [], "#39b54a"));
      }
      return el("tr", {}, ...cells);
    });

    container.append(
      el("section", { class: "card meso-accent" },
        el("div", { class: "meso-top" },
          el("div", {},
            el("h2", { style: { marginBottom: "0.2rem" } }, activeMeso.name),
            el("div", { class: "muted small" },
              `Started ${fmtDate(activeMeso.startDate)}`,
              isDeload ? el("span", { class: "badge", style: { marginLeft: "0.5rem" } }, "Deload")
                       : el("span", { class: "badge", style: { marginLeft: "0.5rem" } }, "Accumulation"),
            ),
          ),
          progressRing(week / +activeMeso.weeks, String(`${week}/${activeMeso.weeks}`), "WEEK"),
        ),
        el("table", { class: "meso-grid", style: { marginTop: "0.9rem" } },
          el("thead", {},
            el("tr", {},
              el("th", { style: { textAlign: "left" } }, "Muscle"),
              el("th", {}, "Sets done"),
              el("th", {}, "Target"),
              el("th", {}, "Progress"),
              ...(showSparklines ? [el("th", {}, "Trend")] : []),
            ),
          ),
          el("tbody", {}, ...volumeRows),
        ),
        el("a", { class: "btn primary", href: "#/workout", style: { marginTop: "1rem", width: "100%" } }, "Train this session"),
      ),
    );
  } else {
    container.append(
      el("div", { class: "empty-state" },
        el("div", { class: "es-icon" }, "🗓️"),
        el("p", {}, "No active mesocycle yet. Plan a block to auto-progress your volume."),
        el("a", { class: "btn primary", href: "#/meso/new" }, "Plan a mesocycle"),
      ),
    );
  }

  // --- Section grid ---
  const grid = el("div", { class: "dash-grid" });

  // Recent Activity
  if (allSets.length) {
    const setsByDate = {};
    for (const s of allSets) {
      if (!setsByDate[s.date]) setsByDate[s.date] = [];
      setsByDate[s.date].push(s);
    }
    const recentDates = Object.keys(setsByDate).sort((a, b) => b.localeCompare(a)).slice(0, 5);
    if (recentDates.length) {
      const section = el("section", { class: "card recent-activity" }, secHead("🕑", "Recent activity"));
      for (const date of recentDates) {
        const sets = setsByDate[date];
        const mgCount = {};
        for (const s of sets) {
          const mg = s.muscleGroup || "Other";
          mgCount[mg] = (mgCount[mg] || 0) + 1;
        }
        const muscleGroups = Object.entries(mgCount).sort((a, b) => b[1] - a[1]).map(([mg]) => mg);
        const totalVol = sets.reduce((sum, s) => sum + setVol(s), 0);

        const pills = el("div", { class: "muscle-pills" });
        for (const mg of muscleGroups) pills.append(el("span", { class: "pill" }, formatMuscle(mg)));

        section.append(
          el("div", { class: "activity-card" },
            el("div", { class: "activity-header" },
              el("span", { class: "activity-date" }, fmtDate(date)),
              el("span", { class: "muted small" }, `${sets.length} sets`),
              totalVol > 0
                ? el("span", { class: "muted small" }, `${toDisplay(totalVol).toLocaleString()} ${unitLabel()}`)
                : null,
            ),
            pills,
          ),
        );
      }
      grid.append(section);
    }
  }

  // Cardio
  if (cardioEntries.length) {
    const monthPrefix = today.slice(0, 7);
    const thisMonthCardio = cardioEntries.filter((c) => c.date && c.date.startsWith(monthPrefix));
    const totalMinutes = thisMonthCardio.reduce((sum, c) => sum + (+c.duration || 0), 0);
    const lastThree = cardioEntries.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 3);

    const section = el("section", { class: "card" },
      secHead("🏃", "Cardio"),
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
              el("span", { class: "muted small" }, `${entry.duration || "?"} min · ${entry.date ? fmtDate(entry.date) : "—"}`),
            ),
          ),
        );
      }
    }
    grid.append(section);
  }

  // Recent PRs
  const recentPRs = await data.getRecentPRs(5);
  if (recentPRs.length) {
    const prCard = el("section", { class: "card" }, secHead("🏆", "Recent PRs"));
    for (const pr of recentPRs) {
      prCard.append(
        el("div", { class: "card-row", style: { padding: "0.35rem 0", borderBottom: "1px solid var(--line)" } },
          el("div", {},
            el("strong", {}, pr.exercise),
            el("span", { class: "muted small", style: { marginLeft: "0.5rem" } }, `${toDisplay(pr.weight)} × ${pr.reps}`),
          ),
          el("div", {},
            el("span", { class: "pill pr-badge" }, pr.type === "weight" ? "Weight PR" : "e1RM PR"),
            el("span", { class: "muted small", style: { marginLeft: "0.5rem" } }, fmtDate(pr.date)),
          ),
        ),
      );
    }
    grid.append(prCard);
  }

  // All-Time Stats (full width)
  if (allSets.length) {
    const uniqueDates = new Set(allSets.map((s) => s.date));
    const totalVolume = allSets.reduce((sum, s) => sum + setVol(s), 0);
    const uniqueExercises = new Set(allSets.map((s) => s.exercise));
    grid.append(
      el("section", { class: "card span2" },
        secHead("⭐", "All-time"),
        el("div", { class: "summary-stats", style: { marginBottom: "0" } },
          stat(String(uniqueDates.size), "Workouts"),
          stat(formatVolume(toDisplay(totalVolume)) + " " + unitLabel(), "Total volume"),
          stat(String(uniqueExercises.size), "Exercises"),
          stat(String(recentPRs.length), "Recent PRs"),
        ),
      ),
    );
  }

  // Muscle Group Distribution (colored)
  if (allSets.length) {
    const mgCounts = {};
    for (const s of allSets) {
      const mg = s.muscleGroup || "Other";
      mgCounts[mg] = (mgCounts[mg] || 0) + 1;
    }
    const sorted = Object.entries(mgCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maxCount = sorted[0]?.[1] || 1;
    const section = el("section", { class: "card" }, secHead("🧩", "Muscle distribution"));
    sorted.forEach(([mg, count], i) => {
      const pct = Math.round((count / maxCount) * 100);
      section.append(
        el("div", { class: "muscle-dist-row" },
          el("span", { class: "muscle-dist-label" }, formatMuscle(mg)),
          el("div", { class: "muscle-dist-bar" },
            el("div", { class: "muscle-dist-fill", style: { width: pct + "%", background: DIST_COLORS[i % DIST_COLORS.length] } }),
          ),
          el("span", { class: "muted small", style: { textAlign: "right" } }, String(count)),
        ),
      );
    });
    grid.append(section);
  }

  // Workout frequency chart (full width)
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
    grid.append(
      el("section", { class: "card span2" },
        secHead("📊", "Workout frequency"),
        el("div", { class: "chart-container" }, canvas),
      ),
    );
    requestAnimationFrame(() => drawChart(canvas, [{ label: "Workouts", color: "#39b54a", points: freqData }], { type: "bar", xLabels: freqLabels, yLabel: "days" }));
  }

  if (grid.children.length) container.append(grid);

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
