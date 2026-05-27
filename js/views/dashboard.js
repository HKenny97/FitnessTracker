import { el, fmtDate, isoToday, stat, formatMuscle } from "../ui.js";
import * as data from "../data.js";
import * as sheets from "../sheets.js";
import { drawChart, sparkline } from "../chart.js";
import { toDisplay, unitLabel, dbVolumeFactor } from "../units.js";
import { buildVolumeSuggestionCard } from "./workout.js";
import {
  analyze, sessionBestE1RMs, e1rmTrend, performanceVsNormal, sessionVerdict, fatigueCheck,
} from "../adaptive.js";
import { exerciseSecondary, MUSCLE_REFERENCE } from "../rp.js";
import { sessionZone } from "../suggest.js";
import { mondayOf, weekdayIndex, distributeWeeklyGoal, weeklyGoalWarnings, WEEKDAYS } from "../goals.js";

const DIST_COLORS = ["#39b54a", "#4da6ff", "#ffb547", "#c97bff", "#ff5a1f", "#36c4b7", "#f06292", "#9ccc65"];
const TAB_LS_KEY = "gama.dashTab";

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

function secHead(icon, title, sub) {
  return el("div", { class: "sec-head" },
    el("span", { class: "ic" }, icon),
    el("h3", {}, title),
    sub ? el("span", { class: "muted small", style: { marginLeft: "auto" } }, sub) : null,
  );
}

function emptyState(icon, msg, href, cta) {
  return el("div", { class: "empty-state" },
    el("div", { class: "es-icon" }, icon),
    el("p", {}, msg),
    href ? el("a", { class: "btn primary", href }, cta) : null,
  );
}

// label / bar / value row, reusing the muscle-distribution visual language.
function metricRow(label, value, pct, color) {
  return el("div", { class: "muscle-dist-row" },
    el("span", { class: "muscle-dist-label" }, label),
    el("div", { class: "muscle-dist-bar" },
      el("div", { class: "muscle-dist-fill", style: { width: Math.max(0, Math.min(100, pct)) + "%", background: color } }),
    ),
    el("span", { class: "muted small", style: { textAlign: "right" } }, value),
  );
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

// Sunday-aligned week ranges, oldest→newest, ending with the current week.
function lastNWeeks(n) {
  const now = new Date();
  const weeks = [];
  for (let i = n - 1; i >= 0; i--) {
    const ws = new Date(now);
    ws.setDate(ws.getDate() - (i * 7 + ws.getDay()));
    const we = new Date(ws);
    we.setDate(we.getDate() + 6);
    weeks.push({
      start: ws.toISOString().slice(0, 10),
      end: we.toISOString().slice(0, 10),
      label: ws.toISOString().slice(5, 10),
    });
  }
  return weeks;
}

// Map a weekly working-set count to an RP volume zone + color.
function volumeZone(sets, lm) {
  if (!sets) return { label: "—", color: "var(--panel-2)" };
  if (!lm || !lm.MRV) return { label: `${sets}`, color: "#39b54a" };
  if (lm.MEV && sets < lm.MEV) return { label: "under", color: "#3a6ea5" };
  if (sets >= lm.MRV) return { label: "over", color: "#ff5a1f" };
  if (lm.MAV_hi && sets >= lm.MAV_hi) return { label: "high", color: "#f6b73c" };
  return { label: "good", color: "#39b54a" };
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

  // Pull fresh on every homepage open so edits made elsewhere (other device,
  // direct sheet edits) are reflected, not just locally-invalidated writes.
  data.clearCaches();

  // --- Load all data upfront (shared by every tab) ---
  const [mesos, allSets, allSessions, cardioEntries, eqMap, landmarks] = await Promise.all([
    data.listMesocycles(),
    data.listSets(),
    data.listSessions(),
    data.listCardio(),
    data.getEquipmentMap(),
    data.getLandmarks(),
  ]);
  const activeMeso = mesos.find((m) => m.status === "active") || null;
  const today = isoToday();
  // Dumbbell sets count both implements toward tonnage.
  const setVol = (s) => (+s.weight || 0) * (+s.reps || 0) * dbVolumeFactor(s.exercise, eqMap.get((s.exercise || "").toLowerCase()));
  const workingSets = allSets.filter((s) => s.setType !== "warmup");
  // Per-exercise warm-up-free history, chronological (mirrors data.getExerciseHistory).
  const historyFor = (ex) => workingSets
    .filter((s) => s.exercise === ex)
    .sort((a, b) => a.date.localeCompare(b.date) || (+a.setNumber || 0) - (+b.setNumber || 0));

  // Active-meso derived state + dependent loads, resolved once.
  let week = 0, isDeload = false, effPlan = [], weekVol = {}, feedback = [], template = [];
  if (activeMeso) {
    const start = new Date(activeMeso.startDate);
    const days = Math.floor((Date.now() - start.getTime()) / 86400000);
    week = Math.min(+activeMeso.weeks, Math.max(1, Math.floor(days / 7) + 1));
    isDeload = week === +activeMeso.weeks;
    [effPlan, weekVol, feedback, template] = await Promise.all([
      data.getEffectiveWeekPlan(activeMeso.id),
      data.weeklyVolume(activeMeso.id, week),
      data.getSessionFeedback(activeMeso.id),
      data.getTemplate(activeMeso.id),
    ]);
  }
  const [recentPRs, allPRs, personalRecords] = await Promise.all([
    data.getRecentPRs(5),
    data.getRecentPRs(999),
    data.getPersonalRecords(),
  ]);

  // Weekly Muscle Goals ("light meso") for the current calendar week.
  const weekStartIso = mondayOf(today);
  const weekEndDate = new Date(weekStartIso + "T00:00:00");
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEndIso = weekEndDate.toISOString().slice(0, 10);
  const weeklyPlan = await data.getEffectiveWeeklyPlan(weekStartIso);
  const trainingProfile = await data.getTrainingProfile();

  // --- Quick stats ---
  const thisMonth = today.slice(0, 7);
  const monthSessions = new Set(allSessions.filter((s) => s.date.startsWith(thisMonth)).map((s) => s.date));
  const monthSets = allSets.filter((s) => s.date.startsWith(thisMonth)).length;

  // Streak: consecutive days with workouts going backwards from today.
  const workoutDates = new Set([...allSessions.map((s) => s.date), ...allSets.map((s) => s.date)]);
  let streak = 0;
  let d = new Date();
  while (true) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (workoutDates.has(iso)) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }

  // --- Hero stat band (always visible) ---
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

  // --- Quick actions (always visible) ---
  container.append(
    el("div", { class: "row", style: { gap: "0.6rem", marginBottom: "1rem", flexWrap: "wrap" } },
      el("a", { class: "btn primary", href: "#/workout", style: { flex: "1", minWidth: "160px" } }, "▶ Start Workout"),
    ),
  );

  // First-run nudge: personalize volume landmarks via the training profile.
  if (!trainingProfile) {
    container.append(
      el("a", { class: "card", href: "#/profile", style: { display: "block", borderColor: "var(--gama-green)" } },
        el("div", { class: "card-row" },
          el("div", {},
            el("strong", {}, "Personalize your volume targets"),
            el("div", { class: "muted small" }, "Answer a few questions to tailor your weekly set targets to your experience and goals."),
          ),
          el("span", { class: "muted" }, "›"),
        ),
      ),
    );
  }

  // ── Tabbed analytics ──────────────────────────────────────────
  const TABS = [
    { id: "overview", label: "Overview", render: renderOverviewTab },
    { id: "progress", label: "Progress", render: renderProgressTab },
    { id: "volume", label: "Volume & Recovery", render: renderVolumeTab },
    { id: "consistency", label: "Consistency", render: renderConsistencyTab },
  ];
  const stored = localStorage.getItem(TAB_LS_KEY);
  let activeTab = TABS.some((t) => t.id === stored) ? stored : "overview";

  const tabBar = el("div", {});
  const tabBody = el("div", { class: "dash-tab-body" });
  container.append(tabBar, tabBody);

  function renderTabs() {
    tabBar.replaceChildren(
      el("div", { class: "chip-row dash-tabs" },
        ...TABS.map((t) => el("button", {
          type: "button",
          class: "filter-chip" + (t.id === activeTab ? " active" : ""),
          onclick: () => {
            if (t.id === activeTab) return;
            activeTab = t.id;
            localStorage.setItem(TAB_LS_KEY, t.id);
            renderTabs();
          },
        }, t.label)),
      ),
    );
    tabBody.replaceChildren();
    TABS.find((t) => t.id === activeTab).render(tabBody);
  }

  // ── Tab 1: Overview ──
  function renderOverviewTab(body) {
    // Active mesocycle headline: this-week volume vs target, with landmark zones.
    if (activeMeso) {
      const planThisWeek = effPlan.filter((p) => p.week === week);
      const showSparklines = week >= 2;
      const sparkData = {};
      if (showSparklines) {
        const start = new Date(activeMeso.startDate);
        const mesoSets = workingSets.filter((s) => s.mesoId === activeMeso.id);
        for (const p of planThisWeek) {
          const pts = [];
          for (let w = 1; w <= week; w++) {
            const ws = new Date(start); ws.setDate(ws.getDate() + (w - 1) * 7);
            const we = new Date(ws); we.setDate(we.getDate() + 6);
            const a = ws.toISOString().slice(0, 10), b = we.toISOString().slice(0, 10);
            pts.push({ x: w, y: mesoSets.filter((s) => s.muscleGroup === p.muscleGroup && s.date >= a && s.date <= b).length });
          }
          sparkData[p.muscleGroup] = pts;
        }
      }

      const volumeRows = planThisWeek.map((p) => {
        const vol = weekVol[p.muscleGroup];
        const direct = vol ? vol.direct : 0;
        const indirect = vol ? vol.indirect : 0;
        const total = direct + indirect;
        const pct = Math.min(100, Math.round((total / Math.max(1, p.targetSets)) * 100));
        const directPct = Math.min(100, Math.round((direct / Math.max(1, p.targetSets)) * 100));
        const zone = volumeZone(total, landmarks[p.muscleGroup]);
        const volLabel = indirect > 0
          ? `${direct} + ${Math.round(indirect * 10) / 10} / ${p.targetSets}`
          : `${direct} / ${p.targetSets}`;
        const barColor = total >= p.targetSets ? "var(--ok)" : total >= p.targetSets * 0.5 ? "var(--warn)" : "var(--accent)";
        const cells = [
          el("td", { class: "muscle" }, formatMuscle(p.muscleGroup)),
          el("td", {}, volLabel),
          el("td", {}, el("span", { class: "zone-pill", style: { background: zone.color } }, zone.label)),
          el("td", {}, el("span", { class: "rir-pill" }, `${p.targetRIR} RIR`)),
          el("td", {},
            el("div", { style: { background: "var(--panel-2)", borderRadius: "999px", overflow: "hidden", height: "8px", minWidth: "60px", position: "relative" } },
              el("div", { style: { background: barColor, width: directPct + "%", height: "100%", position: "absolute", left: "0", top: "0" } }),
              indirect > 0 ? el("div", { style: { background: barColor, opacity: "0.35", width: pct + "%", height: "100%", position: "absolute", left: "0", top: "0" } }) : null,
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

      // Deload ETA + muscles that have hit MRV.
      const weeksLeft = +activeMeso.weeks - week;
      const overMRV = planThisWeek.filter((p) => {
        const lm = landmarks[p.muscleGroup];
        const v = weekVol[p.muscleGroup];
        return lm && lm.MRV && v && (v.direct + v.indirect) >= lm.MRV;
      }).map((p) => formatMuscle(p.muscleGroup));
      const deloadMsg = isDeload
        ? "Deload week — recover and resensitize."
        : weeksLeft <= 1 ? "Deload next week." : `Deload in ${weeksLeft} weeks.`;

      body.append(
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
            progressRing(week / +activeMeso.weeks, `${week}/${activeMeso.weeks}`, "WEEK"),
          ),
          el("table", { class: "meso-grid", style: { marginTop: "0.9rem" } },
            el("thead", {},
              el("tr", {},
                el("th", { style: { textAlign: "left" } }, "Muscle"),
                el("th", {}, "Sets"),
                el("th", {}, "Zone"),
                el("th", {}, "Target"),
                el("th", {}, "Progress"),
                ...(showSparklines ? [el("th", {}, "Trend")] : []),
              ),
            ),
            el("tbody", {}, ...volumeRows),
          ),
          el("div", { class: "muted small", style: { marginTop: "0.75rem" } },
            `📆 ${deloadMsg}`,
            overMRV.length ? ` ${overMRV.join(", ")} at/over MRV — hold or reduce volume.` : "",
          ),
          el("a", { class: "btn primary", href: "#/workout", style: { marginTop: "0.85rem", width: "100%" } }, "Train this session"),
          el("a", { class: "muted small", href: "#/insights", style: { display: "block", marginTop: "0.5rem", textAlign: "center" } }, "Why these numbers?"),
        ),
      );

      // Volume suggestions from last week's feedback (shared card), refreshes in place.
      const suggWrap = el("div", {});
      body.append(suggWrap);
      const refreshSuggestions = async () => {
        const items = await data.getVolumeSuggestions(activeMeso.id, week);
        const card = buildVolumeSuggestionCard(items, { mesoId: activeMeso.id, week, onChange: refreshSuggestions });
        suggWrap.replaceChildren(...(card ? [card] : []));
      };
      refreshSuggestions();
    } else {
      body.append(
        el("div", { class: "empty-state" },
          el("div", { class: "es-icon" }, "🗓️"),
          el("p", {}, "No active mesocycle yet. Plan a block to auto-progress your volume."),
          el("a", { class: "btn primary", href: "#/meso/new" }, "Plan a mesocycle"),
        ),
      );
    }

    // ── Weekly Muscle Goals ("light meso") ──
    if (weeklyPlan.length) {
      const todayWd = weekdayIndex(today);
      const dist = distributeWeeklyGoal(weeklyPlan, landmarks);

      // Sets logged this calendar week, direct + fractional secondary credit.
      const logged = {};
      const ensure = (g) => (logged[g] ||= { direct: 0, indirect: 0 });
      for (const s of workingSets) {
        if (s.date < weekStartIso || s.date > weekEndIso) continue;
        if (s.muscleGroup) ensure(s.muscleGroup).direct += 1;
        for (const sec of exerciseSecondary(s.exercise)) ensure(sec.group).indirect += sec.fraction;
      }

      const card = el("section", { class: "card" },
        el("div", { class: "row", style: { justifyContent: "space-between", alignItems: "center" } },
          el("h2", { style: { margin: 0 } }, "Weekly Muscle Goals"),
          el("a", { class: "btn small ghost", href: "#/plan/weekly" }, "Edit"),
        ),
      );

      // Day schedule with today highlighted.
      const sched = el("div", { class: "chip-row", style: { marginTop: "0.5rem" } });
      for (const d of weeklyPlan) {
        const label = `${WEEKDAYS[d.weekday]}${d.dayName ? " · " + d.dayName : ""}`;
        sched.append(el("span", {
          class: "filter-chip" + (d.weekday === todayWd ? " active" : ""),
          style: { cursor: "default" },
        }, label));
      }
      card.append(sched);

      // Per-muscle weekly progress vs target.
      const muscles = Object.keys(dist).sort();
      for (const m of muscles) {
        const target = dist[m].target;
        const v = logged[m] || { direct: 0, indirect: 0 };
        const total = v.direct + v.indirect;
        const zone = sessionZone(total, [Math.max(1, Math.round(target * 0.85)), target]);
        const color = zone === "under" ? "var(--warn)" : zone === "over" ? "var(--ok)" : "var(--ok)";
        const pct = Math.min(100, Math.round((total / Math.max(1, target)) * 100));
        const setsLabel = v.indirect > 0
          ? `${v.direct} + ${Math.round(v.indirect * 10) / 10} / ${target}`
          : `${v.direct} / ${target}`;
        card.append(
          el("div", { style: { marginTop: "0.5rem" } },
            el("div", { class: "row", style: { justifyContent: "space-between" } },
              el("strong", {}, formatMuscle(m)),
              el("span", { class: "muted small" }, setsLabel),
            ),
            el("div", { style: { height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden", marginTop: "0.2rem" } },
              el("div", { style: { width: pct + "%", height: "100%", background: color } }),
            ),
          ),
        );
      }

      for (const w of weeklyGoalWarnings(weeklyPlan, landmarks, MUSCLE_REFERENCE)) {
        if (w.level !== "warn") continue;
        card.append(el("div", { class: "banner warn", style: { marginTop: "0.6rem", marginBottom: 0 } }, w.msg));
      }

      body.append(card);
    }

    const grid = el("div", { class: "dash-grid" });

    // Last-session verdict.
    if (workingSets.length) {
      const lastDate = workingSets.reduce((m, s) => (s.date > m ? s.date : m), workingSets[0].date);
      const byExToday = {};
      for (const s of workingSets) if (s.date === lastDate) (byExToday[s.exercise] ||= []).push(s);
      const results = Object.entries(byExToday).map(([ex, todaySets]) => {
        const prior = workingSets.filter((s) => s.exercise === ex && s.date < lastDate);
        return performanceVsNormal(prior, todaySets);
      });
      const verdict = sessionVerdict(results);
      if (verdict) {
        const cls = verdict.level === "above" ? "ok" : verdict.level === "below" ? "warn" : "";
        grid.append(
          el("section", { class: "card" },
            secHead("🎯", "Last session", fmtDate(lastDate)),
            el("div", { class: "row", style: { alignItems: "center", gap: "0.6rem" } },
              el("span", { class: "zone-pill", style: { background: cls === "ok" ? "var(--ok)" : cls === "warn" ? "var(--warn)" : "var(--panel-2)" } },
                verdict.deltaPct > 0 ? `+${verdict.deltaPct}%` : `${verdict.deltaPct}%`),
              el("span", {}, verdict.text),
            ),
          ),
        );
      }
    }

    // Recent activity.
    if (workingSets.length) {
      const setsByDate = {};
      for (const s of allSets) (setsByDate[s.date] ||= []).push(s);
      const recentDates = Object.keys(setsByDate).sort((a, b) => b.localeCompare(a)).slice(0, 5);
      const section = el("section", { class: "card recent-activity" }, secHead("🕑", "Recent activity"));
      for (const date of recentDates) {
        const sets = setsByDate[date];
        const mgCount = {};
        for (const s of sets) mgCount[s.muscleGroup || "Other"] = (mgCount[s.muscleGroup || "Other"] || 0) + 1;
        const muscleGroups = Object.entries(mgCount).sort((a, b) => b[1] - a[1]).map(([mg]) => mg);
        const totalVol = sets.reduce((sum, s) => sum + setVol(s), 0);
        const pills = el("div", { class: "muscle-pills" });
        for (const mg of muscleGroups) pills.append(el("span", { class: "pill" }, formatMuscle(mg)));
        section.append(
          el("div", { class: "activity-card" },
            el("div", { class: "activity-header" },
              el("span", { class: "activity-date" }, fmtDate(date)),
              el("span", { class: "muted small" }, `${sets.length} sets`),
              totalVol > 0 ? el("span", { class: "muted small" }, `${toDisplay(totalVol).toLocaleString()} ${unitLabel()}`) : null,
            ),
            pills,
          ),
        );
      }
      grid.append(section);
    }

    if (grid.children.length) body.append(grid);
    else if (!activeMeso) body.append(emptyState("📊", "Log a workout to start seeing insights.", "#/workout", "Start a workout"));
  }

  // ── Tab 2: Progress ──
  function renderProgressTab(body) {
    if (!workingSets.length) {
      body.append(emptyState("📈", "Log a few workouts and your strength trends will show up here.", "#/workout", "Start a workout"));
      return;
    }

    const exCount = {};
    for (const s of workingSets) exCount[s.exercise] = (exCount[s.exercise] || 0) + 1;
    const topExercises = Object.keys(exCount).sort((a, b) => exCount[b] - exCount[a]);

    const grid = el("div", { class: "dash-grid" });

    // Key-lift e1RM trends.
    const trendCard = el("section", { class: "card span2" }, secHead("📈", "Strength trends", "est. 1RM"));
    let trendRows = 0;
    for (const ex of topExercises) {
      if (trendRows >= 6) break;
      const bests = sessionBestE1RMs(historyFor(ex));
      if (bests.length < 2) continue;
      trendRows++;
      const trend = e1rmTrend(bests);
      const arrow = trend === "rising" ? "↗" : trend === "falling" ? "↘" : "→";
      const arrowColor = trend === "rising" ? "var(--ok)" : trend === "falling" ? "var(--warn)" : "var(--muted)";
      const cur = bests[bests.length - 1];
      const cvs = el("canvas", { style: { width: "100%", height: "34px" } });
      trendCard.append(
        el("div", { class: "trend-row" },
          el("span", { class: "trend-name" }, ex),
          el("div", { class: "trend-spark" }, cvs),
          el("span", { class: "muted small", style: { whiteSpace: "nowrap" } },
            `${toDisplay(Math.round(cur))} ${unitLabel()} `,
            el("span", { style: { color: arrowColor, fontWeight: "700" } }, arrow)),
        ),
      );
      requestAnimationFrame(() => sparkline(cvs, bests.map((y, i) => ({ x: i, y })), trend === "falling" ? "#f6b73c" : "#39b54a"));
    }
    if (trendRows) grid.append(trendCard);

    // Stalled / regressing lifts.
    const stalled = [];
    for (const ex of topExercises.slice(0, 15)) {
      const a = analyze(ex, historyFor(ex));
      if (a.fatigueWarning) stalled.push({ ex, msg: a.fatigueWarning });
    }
    if (stalled.length) {
      const card = el("section", { class: "card" }, secHead("⚠️", "Needs attention"));
      for (const s of stalled.slice(0, 6)) {
        card.append(
          el("div", { style: { padding: "0.4rem 0", borderBottom: "1px solid var(--line)" } },
            el("strong", {}, s.ex),
            el("div", { class: "muted small" }, s.msg),
          ),
        );
      }
      grid.append(card);
    }

    // PR cadence (last 6 months).
    if (allPRs.length) {
      const months = [];
      const base = new Date();
      for (let i = 5; i >= 0; i--) {
        const m = new Date(base.getFullYear(), base.getMonth() - i, 1);
        months.push(m.toISOString().slice(0, 7));
      }
      const counts = Object.fromEntries(months.map((m) => [m, 0]));
      for (const pr of allPRs) {
        const mk = (pr.date || "").slice(0, 7);
        if (mk in counts) counts[mk]++;
      }
      const cvs = el("canvas", { style: { width: "100%", height: "160px" } });
      grid.append(
        el("section", { class: "card" }, secHead("🏆", "PRs per month"),
          el("div", { class: "chart-container" }, cvs)),
      );
      requestAnimationFrame(() => drawChart(cvs,
        [{ label: "PRs", color: "#c97bff", points: months.map((m, i) => ({ x: i, y: counts[m] })) }],
        { type: "bar", xLabels: months.map((m) => m.slice(2)), yLabel: "PRs" }));
    }

    // Estimated 1RM leaderboard.
    const e1Entries = Object.entries(personalRecords)
      .filter(([, v]) => v.max1RM > 0)
      .sort((a, b) => b[1].max1RM - a[1].max1RM)
      .slice(0, 8);
    if (e1Entries.length) {
      const card = el("section", { class: "card" }, secHead("💪", "Top estimated 1RMs"));
      for (const [ex, v] of e1Entries) {
        card.append(
          el("div", { class: "card-row", style: { padding: "0.3rem 0", borderBottom: "1px solid var(--line)" } },
            el("span", {}, ex),
            el("span", { class: "muted small" }, `${toDisplay(v.max1RM)} ${unitLabel()}${v.max1RMDate ? " · " + fmtDate(v.max1RMDate) : ""}`),
          ),
        );
      }
      grid.append(card);
    }

    // Recent PRs.
    if (recentPRs.length) {
      const prCard = el("section", { class: "card" }, secHead("✨", "Recent PRs"));
      for (const pr of recentPRs) {
        prCard.append(
          el("div", { class: "card-row", style: { padding: "0.35rem 0", borderBottom: "1px solid var(--line)" } },
            el("div", {},
              el("strong", {}, pr.exercise),
              el("span", { class: "muted small", style: { marginLeft: "0.5rem" } }, `${toDisplay(pr.weight)} × ${pr.reps}`)),
            el("div", {},
              el("span", { class: "pill pr-badge" }, pr.type === "weight" ? "Weight PR" : "e1RM PR"),
              el("span", { class: "muted small", style: { marginLeft: "0.5rem" } }, fmtDate(pr.date))),
          ),
        );
      }
      grid.append(prCard);
    }

    // All-time totals.
    const uniqueDates = new Set(allSets.map((s) => s.date));
    const totalVolume = allSets.reduce((sum, s) => sum + setVol(s), 0);
    const uniqueExercises = new Set(allSets.map((s) => s.exercise));
    grid.append(
      el("section", { class: "card span2" }, secHead("⭐", "All-time"),
        el("div", { class: "summary-stats", style: { marginBottom: "0" } },
          stat(String(uniqueDates.size), "Workouts"),
          stat(formatVolume(toDisplay(totalVolume)) + " " + unitLabel(), "Total volume"),
          stat(String(uniqueExercises.size), "Exercises"),
          stat(String(allPRs.length), "Lifetime PRs"),
        ),
      ),
    );

    body.append(grid);
  }

  // ── Tab 3: Volume & Recovery ──
  function renderVolumeTab(body) {
    if (!workingSets.length) {
      body.append(emptyState("🧩", "Volume and recovery insights appear once you've logged some sets.", "#/workout", "Start a workout"));
      return;
    }

    const grid = el("div", { class: "dash-grid" });
    const weeks = lastNWeeks(8);

    // 8-week volume-vs-landmark heatmap.
    const setCountByMuscleWeek = {}; // mg -> [w0..w7]
    let muscleTotals = {};
    const ensureHeat = (g) => (setCountByMuscleWeek[g] ||= Array(8).fill(0));
    for (const s of workingSets) {
      const mg = s.muscleGroup;
      if (!mg) continue;
      const wi = weeks.findIndex((w) => s.date >= w.start && s.date <= w.end);
      if (wi < 0) continue;
      ensureHeat(mg)[wi]++;
      muscleTotals[mg] = (muscleTotals[mg] || 0) + 1;
      for (const sec of exerciseSecondary(s.exercise)) {
        ensureHeat(sec.group)[wi] += sec.fraction;
        muscleTotals[sec.group] = (muscleTotals[sec.group] || 0) + sec.fraction;
      }
    }
    const heatMuscles = Object.keys(setCountByMuscleWeek)
      .sort((a, b) => muscleTotals[b] - muscleTotals[a])
      .slice(0, 12);
    if (heatMuscles.length) {
      const map = el("div", { class: "vol-heatmap" });
      map.append(el("div", { class: "vh-label muted small" }, ""));
      for (const w of weeks) map.append(el("div", { class: "vh-head muted small" }, w.label.slice(3)));
      for (const mg of heatMuscles) {
        map.append(el("div", { class: "vh-label" }, formatMuscle(mg)));
        setCountByMuscleWeek[mg].forEach((n, i) => {
          const zone = volumeZone(n, landmarks[mg]);
          const display = n ? (n % 1 ? n.toFixed(1) : String(n)) : "";
          map.append(el("div", {
            class: "vh-cell",
            title: `${formatMuscle(mg)} · week of ${weeks[i].start}: ${n % 1 ? n.toFixed(1) : n} sets (${zone.label})`,
            style: { background: zone.color },
          }, display));
        });
      }
      grid.append(
        el("section", { class: "card span2" },
          secHead("🔥", "Weekly volume by muscle", "last 8 weeks"),
          map,
          el("div", { class: "vh-legend muted small" },
            el("span", {}, el("i", { style: { background: "#3a6ea5" } }), "under MEV"),
            el("span", {}, el("i", { style: { background: "#39b54a" } }), "productive"),
            el("span", {}, el("i", { style: { background: "#f6b73c" } }), "high"),
            el("span", {}, el("i", { style: { background: "#ff5a1f" } }), "over MRV"),
          ),
        ),
      );
    }

    // Muscle imbalance ratios (trailing 4 weeks).
    const cutoff = weeks[4].start; // start of the 5th-from-last week → last 4 weeks
    const recent = workingSets.filter((s) => s.date >= cutoff);
    const sumGroups = (names) => {
      let total = 0;
      for (const s of recent) {
        if (names.includes(s.muscleGroup)) total += 1;
        for (const sec of exerciseSecondary(s.exercise)) {
          if (names.includes(sec.group)) total += sec.fraction;
        }
      }
      return Math.round(total * 10) / 10;
    };
    const push = sumGroups(["Chest", "Shoulders (front delts)", "Shoulders (side delts)", "Triceps"]);
    const pull = sumGroups(["Back", "Traps", "Shoulders (rear delts)", "Biceps", "Forearms"]);
    const quad = sumGroups(["Quads"]);
    const ham = sumGroups(["Hamstrings"]);
    const ratioRow = (label, a, b, aLbl, bLbl) => {
      if (!a && !b) return null;
      const ratio = b ? a / b : Infinity;
      const balanced = ratio >= 0.8 && ratio <= 1.25;
      const pct = a + b ? (a / (a + b)) * 100 : 50;
      return el("div", { style: { marginBottom: "0.6rem" } },
        el("div", { class: "row", style: { justifyContent: "space-between" } },
          el("strong", {}, label),
          el("span", { class: "zone-pill", style: { background: balanced ? "var(--ok)" : "var(--warn)" } }, balanced ? "balanced" : "check"),
        ),
        el("div", { class: "row", style: { justifyContent: "space-between" } },
          el("span", { class: "muted small" }, `${aLbl} ${a}`),
          el("span", { class: "muted small" }, `${bLbl} ${b}`),
        ),
        el("div", { class: "muscle-dist-bar" }, el("div", { class: "muscle-dist-fill", style: { width: pct + "%", background: "#4da6ff" } })),
      );
    };
    const ratios = [
      ratioRow("Push / Pull", push, pull, "Push", "Pull"),
      ratioRow("Quads / Hamstrings", quad, ham, "Quad", "Ham"),
    ].filter(Boolean);
    if (ratios.length) {
      grid.append(el("section", { class: "card" }, secHead("⚖️", "Muscle balance", "last 4 weeks"), ...ratios));
    }

    // Muscle distribution (all-time).
    const mgCounts = {};
    for (const s of allSets) {
      mgCounts[s.muscleGroup || "Other"] = (mgCounts[s.muscleGroup || "Other"] || 0) + 1;
      for (const sec of exerciseSecondary(s.exercise)) {
        mgCounts[sec.group] = (mgCounts[sec.group] || 0) + sec.fraction;
      }
    }
    const sorted = Object.entries(mgCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maxCount = sorted[0]?.[1] || 1;
    const distSection = el("section", { class: "card" }, secHead("🧩", "Muscle distribution", "all-time"));
    sorted.forEach(([mg, count], i) => {
      const display = count % 1 ? count.toFixed(1) : String(count);
      distSection.append(metricRow(formatMuscle(mg), display, Math.round((count / maxCount) * 100), DIST_COLORS[i % DIST_COLORS.length]));
    });
    grid.append(distSection);

    // RIR accuracy vs plan (active meso).
    if (activeMeso) {
      const mesoSets = workingSets.filter((s) => s.mesoId === activeMeso.id);
      const planMuscles = [...new Set(effPlan.map((p) => p.muscleGroup))];
      const warnings = [];
      for (const mg of planMuscles) {
        const w = fatigueCheck(mg, mesoSets, effPlan);
        if (w) warnings.push(...w);
      }
      const card = el("section", { class: "card span2" }, secHead("🎚️", "Effort & volume vs plan"));
      if (warnings.length) {
        for (const w of warnings.slice(0, 8)) card.append(el("div", { class: "muted small", style: { padding: "0.25rem 0" } }, `• ${w}`));
      } else {
        card.append(el("p", { class: "muted small" }, "On track — effort (RIR) and completed sets are matching the plan."));
      }
      grid.append(card);
    }

    // Recovery trend from session feedback.
    if (activeMeso && feedback.length) {
      const card = el("section", { class: "card span2" }, secHead("🛌", "Recovery", "soreness / joints, by muscle"));
      const fbWeeks = [...new Set(feedback.map((f) => f.week))].sort((a, b) => a - b);
      const lastW = fbWeeks[fbWeeks.length - 1], prevW = fbWeeks[fbWeeks.length - 2];
      const muscles = [...new Set(feedback.map((f) => f.muscleGroup))];
      const avgFor = (mg, w, key) => {
        const rows = feedback.filter((f) => f.muscleGroup === mg && f.week === w);
        if (!rows.length) return null;
        return rows.reduce((s, f) => s + (f[key] || 0), 0) / rows.length;
      };
      let flagged = 0;
      for (const mg of muscles) {
        const sore = avgFor(mg, lastW, "soreness");
        const joint = avgFor(mg, lastW, "jointPain");
        if (sore == null) continue;
        const prevSore = prevW != null ? avgFor(mg, prevW, "soreness") : null;
        const rising = prevSore != null && sore - prevSore >= 0.5;
        const concern = sore >= 2 || (joint != null && joint >= 1) || rising;
        if (concern) flagged++;
        card.append(
          el("div", { class: "row", style: { justifyContent: "space-between", padding: "0.2rem 0" } },
            el("span", {}, formatMuscle(mg)),
            el("span", { class: "muted small" },
              `soreness ${sore.toFixed(1)}/3${rising ? " ↑" : ""}${joint != null && joint >= 1 ? ` · joints ${joint.toFixed(1)}` : ""}`,
              concern ? el("span", { class: "zone-pill", style: { background: "var(--warn)", marginLeft: "0.4rem" } }, "watch") : null,
            ),
          ),
        );
      }
      if (!flagged) card.append(el("p", { class: "muted small" }, "Recovery looks good — no muscles flagging high soreness or joint pain."));
      grid.append(card);
    }

    body.append(grid);
  }

  // ── Tab 4: Consistency ──
  function renderConsistencyTab(body) {
    const grid = el("div", { class: "dash-grid" });
    const weeks = lastNWeeks(8);

    // Adherence + set completion per meso-week (active meso).
    if (activeMeso && template.length) {
      const plannedDays = template.length;
      const card = el("section", { class: "card span2" }, secHead("✅", "Adherence", activeMeso.name));
      let totalActual = 0, totalPlanned = 0;
      for (let w = 1; w <= week; w++) {
        const sessionDays = new Set(allSessions.filter((s) => s.mesoId === activeMeso.id && +s.week === w).map((s) => s.date));
        const actual = sessionDays.size;
        totalActual += actual; totalPlanned += plannedDays;
        const targetSets = effPlan.filter((p) => p.week === w).reduce((n, p) => n + p.targetSets, 0);
        const doneSets = workingSets.filter((s) => s.mesoId === activeMeso.id && +s.week === w).length;
        const setPct = targetSets ? Math.round((doneSets / targetSets) * 100) : 0;
        const color = setPct >= 90 ? "var(--ok)" : setPct >= 70 ? "var(--warn)" : "#ff5a1f";
        card.append(metricRow(`Week ${w}`, `${actual}/${plannedDays} days · ${doneSets}/${targetSets} sets`, setPct, color));
      }
      const adherencePct = totalPlanned ? Math.round((totalActual / totalPlanned) * 100) : 0;
      card.append(el("div", { class: "muted small", style: { marginTop: "0.5rem" } }, `Overall session adherence: ${adherencePct}% (${totalActual}/${totalPlanned} planned days).`));
      grid.append(card);
    }

    // Workout frequency (8 weeks).
    const freqData = weeks.map((w, i) => ({ x: i, y: new Set(allSessions.filter((s) => s.date >= w.start && s.date <= w.end).map((s) => s.date)).size }));
    if (freqData.some((p) => p.y > 0)) {
      const cvs = el("canvas", { style: { width: "100%", height: "170px" } });
      grid.append(el("section", { class: "card span2" }, secHead("📊", "Workout frequency", "last 8 weeks"),
        el("div", { class: "chart-container" }, cvs)));
      requestAnimationFrame(() => drawChart(cvs,
        [{ label: "Workouts", color: "#39b54a", points: freqData }],
        { type: "bar", xLabels: weeks.map((w) => w.label), yLabel: "days" }));
    }

    // Weekly tonnage trend (8 weeks).
    const tonData = weeks.map((w, i) => ({
      x: i,
      y: Math.round(toDisplay(workingSets.filter((s) => s.date >= w.start && s.date <= w.end).reduce((sum, s) => sum + setVol(s), 0))),
    }));
    if (tonData.some((p) => p.y > 0)) {
      const cvs = el("canvas", { style: { width: "100%", height: "170px" } });
      grid.append(el("section", { class: "card span2" }, secHead("🏋️", "Weekly tonnage", unitLabel()),
        el("div", { class: "chart-container" }, cvs)));
      requestAnimationFrame(() => drawChart(cvs,
        [{ label: `Volume (${unitLabel()})`, color: "#4da6ff", points: tonData }],
        { type: "line", xLabels: weeks.map((w) => w.label) }));
    }

    // 12-week training calendar.
    const calWeeks = lastNWeeks(12);
    const cal = el("div", { class: "dot-cal" });
    for (const w of calWeeks) {
      const col = el("div", { class: "cal-week" });
      for (let i = 0; i < 7; i++) {
        const dt = new Date(w.start); dt.setDate(dt.getDate() + i);
        const iso = dt.toISOString().slice(0, 10);
        const on = workoutDates.has(iso);
        col.append(el("span", { class: "cal-dot" + (on ? " on" : ""), title: iso + (on ? " · trained" : "") }));
      }
      cal.append(col);
    }
    grid.append(el("section", { class: "card span2" }, secHead("📅", "Training days", "last 12 weeks"), cal));

    // Cardio.
    if (cardioEntries.length) {
      const thisMonthCardio = cardioEntries.filter((c) => c.date && c.date.startsWith(thisMonth));
      const totalMinutes = thisMonthCardio.reduce((sum, c) => sum + (+c.duration || 0), 0);
      const lastThree = cardioEntries.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 3);
      const section = el("section", { class: "card" }, secHead("🏃", "Cardio"),
        el("div", { class: "cardio-summary-stats" },
          stat(String(thisMonthCardio.length), "Sessions this month"),
          stat(totalMinutes > 0 ? `${totalMinutes} min` : "—", "Minutes this month"),
        ),
      );
      if (lastThree.length) {
        section.append(el("h4", { class: "small muted", style: { marginTop: "0.5rem", marginBottom: "0.25rem" } }, "Recent"));
        for (const entry of lastThree) {
          section.append(el("div", { class: "cardio-entry" },
            el("div", { class: "card-row" },
              el("span", {}, entry.cardioType || "Cardio"),
              el("span", { class: "muted small" }, `${entry.duration || "?"} min · ${entry.date ? fmtDate(entry.date) : "—"}`)),
          ));
        }
      }
      grid.append(section);
    }

    if (grid.children.length) body.append(grid);
    else body.append(emptyState("📅", "Track a few sessions to see consistency trends.", "#/workout", "Start a workout"));
  }

  renderTabs();

  // --- All mesos list (always visible) ---
  container.append(
    el("div", { class: "section-title", style: { marginTop: "1.5rem" } },
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
              el("div", { class: "muted small" }, `${m.weeks} weeks · ${fmtDate(m.startDate)} · ${m.status}`),
            ),
            el("span", { class: "muted" }, "›"),
          ),
        ),
      );
    }
  }
}
