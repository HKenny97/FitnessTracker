import { el, fmtDate, isoToday } from "../ui.js";
import * as data from "../data.js";
import { CUSTOM_MESO_ID } from "../data.js";

export async function render(container) {
  const [sessions, sets, allMesos, cardioEntries] = await Promise.all([
    data.listSessions(),
    data.listSets(),
    data.listMesocycles(),
    data.listCardio(),
  ]);

  const mesoById = {};
  for (const m of allMesos) mesoById[m.id] = m;

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
    const byDate = new Map();
    for (const s of sets) {
      const key = s.date;
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key).push(s);
    }

    const sessionByDate = new Map();
    for (const s of sessions) {
      const key = s.date;
      if (!sessionByDate.has(key)) sessionByDate.set(key, []);
      sessionByDate.get(key).push(s);
    }

    const cardioByDate = new Map();
    for (const c of cardioEntries) {
      const key = c.date;
      if (!cardioByDate.has(key)) cardioByDate.set(key, []);
      cardioByDate.get(key).push(c);
    }

    const allDates = [...new Set([...byDate.keys(), ...sessionByDate.keys(), ...cardioByDate.keys()])]
      .sort((a, b) => b.localeCompare(a));

    if (!allDates.length) {
      root.append(el("p", { class: "muted" }, "No workouts logged yet."));
      return;
    }

    for (const date of allDates) {
      const dateSets = byDate.get(date) || [];
      const dateSessions = sessionByDate.get(date) || [];
      const dateCardio = cardioByDate.get(date) || [];

      const muscleMap = {};
      for (const s of dateSets) {
        muscleMap[s.muscleGroup] = (muscleMap[s.muscleGroup] || 0) + 1;
      }
      const muscles = Object.entries(muscleMap)
        .sort((a, b) => b[1] - a[1])
        .map(([g, n]) => `${g} (${n})`);

      const card = el("div", { class: "card history-card" });

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
        card.append(el("div", { class: "muted small", style: { marginTop: "0.25rem" } }, infoParts.join(" · ")));
      }

      if (muscles.length) {
        card.append(
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
        card.append(
          el("div", { class: "history-muscles", style: { marginTop: "0.35rem" } },
            el("span", { class: "pill small cardio-pill" }, "Cardio"),
            el("span", { class: "muted small" }, parts.join(" · ")),
          ),
        );
      }

      if (meta?.notes) {
        card.append(el("div", { class: "muted small", style: { marginTop: "0.4rem", fontStyle: "italic" } }, meta.notes));
      }

      root.append(card);
    }
  }

  function renderCalendar() {
    const activeDates = new Set();
    for (const s of sets) activeDates.add(s.date);
    for (const s of sessions) activeDates.add(s.date);
    for (const c of cardioEntries) activeDates.add(c.date);

    const sessionByDate = {};
    for (const s of sessions) sessionByDate[s.date] = s;

    const setCountByDate = {};
    for (const s of sets) setCountByDate[s.date] = (setCountByDate[s.date] || 0) + 1;

    const cardioByDate = {};
    for (const c of cardioEntries) {
      if (!cardioByDate[c.date]) cardioByDate[c.date] = [];
      cardioByDate[c.date].push(c);
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
      const cardio = cardioByDate[iso];

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

  rerender();
}
