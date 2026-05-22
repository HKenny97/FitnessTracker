import { el, fmtDate } from "../ui.js";
import * as data from "../data.js";

export async function render(container) {
  const [sessions, sets] = await Promise.all([
    data.listSessions(),
    data.listSets(),
  ]);

  let viewMode = "list";
  let calMonth = new Date().getMonth();
  let calYear = new Date().getFullYear();

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
        ),
      ),
    );

    if (viewMode === "list") renderList();
    else renderCalendar();
  }

  function renderList() {
    // Group sets by date to build session summaries even without explicit session records.
    const byDate = new Map();
    for (const s of sets) {
      const key = s.date;
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key).push(s);
    }

    // Merge session metadata where available.
    const sessionByDate = new Map();
    for (const s of sessions) {
      const key = s.date;
      if (!sessionByDate.has(key)) sessionByDate.set(key, []);
      sessionByDate.get(key).push(s);
    }

    // All unique dates, sorted newest first.
    const allDates = [...new Set([...byDate.keys(), ...sessionByDate.keys()])]
      .sort((a, b) => b.localeCompare(a));

    if (!allDates.length) {
      root.append(el("p", { class: "muted" }, "No workouts logged yet."));
      return;
    }

    for (const date of allDates) {
      const dateSets = byDate.get(date) || [];
      const dateSessions = sessionByDate.get(date) || [];

      // Summarize muscles hit and total sets.
      const muscleMap = {};
      for (const s of dateSets) {
        muscleMap[s.muscleGroup] = (muscleMap[s.muscleGroup] || 0) + 1;
      }
      const muscles = Object.entries(muscleMap)
        .sort((a, b) => b[1] - a[1])
        .map(([g, n]) => `${g} (${n})`);

      const card = el("div", { class: "card history-card" });

      // Header row
      const meta = dateSessions[0];
      const timeStr = meta?.startTime && meta?.endTime
        ? `${meta.startTime} – ${meta.endTime}`
        : meta?.startTime ? `Started ${meta.startTime}` : "";

      card.append(
        el("div", { class: "card-row" },
          el("div", {},
            el("strong", {}, fmtDate(date)),
            timeStr && el("span", { class: "muted small", style: { marginLeft: "0.75rem" } }, timeStr),
          ),
          el("span", { class: "pill-row" },
            dateSets.length && el("span", { class: "pill" }, `${dateSets.length} sets`),
            meta?.totalRPE && el("span", { class: "pill" }, `RPE ${meta.totalRPE}`),
            meta?.leafStatus === "Yes" && el("span", { class: "pill leaf" }, "Leaf"),
          ),
        ),
      );

      // Location + meso info
      const infoParts = [];
      if (meta?.location) infoParts.push(meta.location);
      if (meta?.mesoId && meta.mesoId !== "_custom") {
        const meso = await data.getMesocycle(meta.mesoId);
        if (meso) infoParts.push(`${meso.name} · W${meta.week}`);
      } else if (dateSets.length && dateSets[0].mesoId === "_custom") {
        infoParts.push("Custom workout");
      } else if (dateSets.length) {
        const meso = await data.getMesocycle(dateSets[0].mesoId);
        if (meso) infoParts.push(`${meso.name} · W${dateSets[0].week}`);
      }
      if (infoParts.length) {
        card.append(el("div", { class: "muted small", style: { marginTop: "0.25rem" } }, infoParts.join(" · ")));
      }

      // Muscles hit
      if (muscles.length) {
        card.append(
          el("div", { class: "history-muscles" },
            ...muscles.map((m) => el("span", { class: "pill small" }, m)),
          ),
        );
      }

      // Session notes
      if (meta?.notes) {
        card.append(el("div", { class: "muted small", style: { marginTop: "0.4rem", fontStyle: "italic" } }, meta.notes));
      }

      root.append(card);
    }
  }

  function renderCalendar() {
    // Collect all dates that have sets or sessions.
    const activeDates = new Set();
    for (const s of sets) activeDates.add(s.date);
    for (const s of sessions) activeDates.add(s.date);

    // Session metadata by date for tooltips.
    const sessionByDate = {};
    for (const s of sessions) sessionByDate[s.date] = s;

    // Set counts by date.
    const setCountByDate = {};
    for (const s of sets) setCountByDate[s.date] = (setCountByDate[s.date] || 0) + 1;

    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];

    // Nav
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

    // Build the grid.
    const grid = el("div", { class: "cal-grid" });

    // Day headers
    for (const d of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      grid.append(el("div", { class: "cal-header" }, d));
    }

    const firstDay = new Date(calYear, calMonth, 1);
    // Monday = 0, Sunday = 6
    let startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const today = new Date().toISOString().slice(0, 10);

    // Empty cells before the 1st.
    for (let i = 0; i < startOffset; i++) {
      grid.append(el("div", { class: "cal-cell empty" }));
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const hasWorkout = activeDates.has(iso);
      const isToday = iso === today;
      const session = sessionByDate[iso];
      const setCount = setCountByDate[iso] || 0;

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
        if (details.length) {
          cell.append(el("div", { class: "cal-detail" }, details.join(" · ")));
        }
      }

      grid.append(cell);
    }

    root.append(grid);

    // Stats summary for the month
    const monthDates = [...activeDates].filter((d) =>
      d.startsWith(`${calYear}-${String(calMonth + 1).padStart(2, "0")}`));
    const totalSets = monthDates.reduce((n, d) => n + (setCountByDate[d] || 0), 0);

    root.append(
      el("div", { class: "card", style: { marginTop: "1rem" } },
        el("div", { class: "card-row" },
          el("div", {},
            el("strong", {}, `${monthDates.length} workout${monthDates.length !== 1 ? "s" : ""}`),
            el("span", { class: "muted", style: { marginLeft: "1rem" } }, `${totalSets} total sets`),
          ),
        ),
      ),
    );
  }

  rerender();
}
