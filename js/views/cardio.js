import { el, fmtDate, isoToday, run, toast, withLoading } from "../ui.js";
import * as data from "../data.js";
import { CARDIO_TYPES } from "../rp.js";

export async function render(container) {
  const state = {
    date: isoToday(),
    cardioType: CARDIO_TYPES[0],
    duration: "",
    distance: "",
    avgHeartRate: "",
    perceivedDifficulty: "",
    notes: "",
  };

  const root = el("div", {});
  container.append(root);

  async function fullRender() {
    const entries = await data.listCardio();
    root.replaceChildren();

    root.append(el("h1", {}, "Cardio"));

    const form = el("section", { class: "card" },
      el("h2", {}, "Log cardio session"),
      el("div", { class: "field-row" },
        el("div", { class: "field" },
          el("label", {}, "Type"),
          el("select", {
            onchange: (e) => (state.cardioType = e.target.value),
          },
            ...CARDIO_TYPES.map((t) =>
              el("option", { value: t, selected: state.cardioType === t ? "" : null }, t)),
          ),
        ),
        el("div", { class: "field" },
          el("label", {}, "Date"),
          el("input", {
            type: "date", value: state.date,
            oninput: (e) => (state.date = e.target.value),
          }),
        ),
      ),
      el("div", { class: "field-row three" },
        el("div", { class: "field" },
          el("label", {}, "Duration (min)"),
          el("input", {
            type: "number", inputmode: "numeric",
            placeholder: "30", value: state.duration,
            oninput: (e) => (state.duration = e.target.value),
          }),
        ),
        el("div", { class: "field" },
          el("label", {}, "Distance (km)"),
          el("input", {
            type: "number", inputmode: "decimal", step: "0.1",
            placeholder: "optional", value: state.distance,
            oninput: (e) => (state.distance = e.target.value),
          }),
        ),
        el("div", { class: "field" },
          el("label", {}, "Avg HR (bpm)"),
          el("input", {
            type: "number", inputmode: "numeric",
            placeholder: "optional", value: state.avgHeartRate,
            oninput: (e) => (state.avgHeartRate = e.target.value),
          }),
        ),
      ),
      el("div", { class: "field-row" },
        el("div", { class: "field" },
          el("label", {}, "Perceived difficulty"),
          el("select", {
            onchange: (e) => (state.perceivedDifficulty = e.target.value),
          },
            el("option", { value: "" }, "—"),
            ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) =>
              el("option", { value: n, selected: String(state.perceivedDifficulty) === String(n) ? "" : null }, String(n))),
          ),
        ),
        el("div", { class: "field" },
          el("label", {}, "Notes"),
          el("input", {
            type: "text", value: state.notes,
            placeholder: "Optional",
            oninput: (e) => (state.notes = e.target.value),
          }),
        ),
      ),
    );

    const logBtn = el("button", { class: "btn primary" }, "Log Session");
    logBtn.onclick = withLoading(logBtn, async () => {
      if (!state.duration) return toast("Duration is required", "bad");
      await run(data.logCardio(state), { ok: "Cardio logged" });
      state.duration = "";
      state.distance = "";
      state.avgHeartRate = "";
      state.perceivedDifficulty = "";
      state.notes = "";
      fullRender();
    });
    form.append(logBtn);
    root.append(form);

    if (entries.length) {
      root.append(el("h2", { style: { marginTop: "1.5rem" } }, "Recent sessions"));
      const recent = entries.slice().reverse().slice(0, 20);
      for (const c of recent) {
        const card = el("div", { class: "card history-card" });
        const parts = [];
        if (c.duration) parts.push(`${c.duration} min`);
        if (c.distance) parts.push(`${c.distance} km`);
        if (c.avgHeartRate) parts.push(`${c.avgHeartRate} bpm`);

        card.append(
          el("div", { class: "card-row" },
            el("div", {},
              el("strong", {}, fmtDate(c.date)),
              el("span", { class: "pill small cardio-pill", style: { marginLeft: "0.5rem" } }, c.cardioType),
            ),
            el("div", { class: "row" },
              el("span", { class: "muted small" }, parts.join(" · ")),
              el("button", {
                class: "btn small danger ghost",
                onclick: async () => {
                  if (!confirm("Delete this cardio entry?")) return;
                  await run(data.deleteCardioEntry(c.id), { ok: "Deleted" });
                  fullRender();
                },
              }, "×"),
            ),
          ),
        );

        if (c.perceivedDifficulty) {
          const pct = (+c.perceivedDifficulty / 10) * 100;
          card.append(
            el("div", { class: "cardio-stat", style: { marginTop: "0.35rem" } },
              el("span", { class: "muted small" }, `Difficulty: ${c.perceivedDifficulty}/10`),
              el("div", { class: "difficulty-bar" },
                el("div", { class: "difficulty-fill", style: { width: `${pct}%` } }),
              ),
            ),
          );
        }

        if (c.notes) {
          card.append(el("div", { class: "muted small", style: { marginTop: "0.3rem", fontStyle: "italic" } }, c.notes));
        }

        root.append(card);
      }
    }
  }

  fullRender();
}
