import { el, run, toast, withLoading, confirmModal, formatMuscle } from "../ui.js";
import { config, setClientId, setDisplayUnit, isUsingDemoClientId } from "../config.js";
import * as sheets from "../sheets.js";
import * as data from "../data.js";
import { MUSCLE_GROUPS, EQUIPMENT_TYPES } from "../rp.js";
import { seedDemoData, removeDemoData } from "../seed.js";

export async function render(container) {
  container.append(el("h1", {}, "Settings"));

  // Preferences.
  const unitBtn = (unit, label) => el("button", {
    class: "btn" + (config.displayUnit === unit ? " primary" : ""),
    onclick: () => {
      if (config.displayUnit === unit) return;
      setDisplayUnit(unit);
      toast("Units updated — reloading…", "ok");
      setTimeout(() => location.reload(), 400);
    },
  }, label);
  container.append(
    el("section", { class: "card" },
      el("h2", {}, "Preferences"),
      el("div", { class: "field" },
        el("label", {}, "Weight units"),
        el("p", { class: "muted small" }, "Weights are stored in pounds; this changes display and entry only."),
        el("div", { class: "row", style: { gap: "0.4rem" } }, unitBtn("lb", "Pounds (lb)"), unitBtn("kg", "Kilograms (kg)")),
      ),
    ),
  );

  // Google client ID.
  container.append(
    el("section", { class: "card" },
      el("h2", {}, "Google API"),
      el("p", { class: "muted small" },
        "Paste the OAuth Client ID from your Google Cloud project. See the README for setup."),
      isUsingDemoClientId()
        ? el("div", { class: "banner warn" },
            "Using the shared demo Client ID. For a private deployment, set your own — see the README.")
        : null,
      el("div", { class: "field" },
        el("label", {}, "OAuth Client ID"),
        el("input", {
          type: "text",
          id: "client-id-input",
          value: config.googleClientId,
          placeholder: "1234567890-abc.apps.googleusercontent.com",
        }),
      ),
      el("button", {
        class: "btn primary",
        onclick: () => {
          const v = document.getElementById("client-id-input").value.trim();
          setClientId(v);
          toast("Saved — reloading…", "ok");
          setTimeout(() => location.reload(), 500);
        },
      }, "Save & reload"),
    ),
  );

  // Spreadsheet.
  const sheetId = sheets.getSpreadsheetId();
  container.append(
    el("section", { class: "card" },
      el("h2", {}, "Data sheet"),
      sheetId
        ? el("div", {},
            el("p", {},
              "Currently using sheet ", el("code", {}, sheetId), ".",
            ),
            el("p", {},
              el("a", {
                href: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
                target: "_blank", rel: "noopener",
              }, "Open in Google Sheets"),
            ),
            el("div", { class: "row" },
              el("button", {
                class: "btn",
                onclick: async () => {
                  await run(sheets.ensureTabs(sheetId), { ok: "Schema verified" });
                  data.clearCaches();
                },
              }, "Verify schema"),
              el("button", {
                class: "btn danger ghost",
                onclick: () => {
                  confirmModal("Forget this sheet? Data stays in your Google account but the app will need a new sheet.", () => {
                    sheets.setSpreadsheetId("");
                    data.clearCaches();
                    location.hash = "#/settings";
                    location.reload();
                  });
                },
              }, "Forget"),
            ),
          )
        : el("div", {},
            el("p", { class: "muted" },
              "No sheet linked. Create a fresh workbook, or paste the ID of an existing one."),
            el("div", { class: "row" },
              el("button", {
                class: "btn primary",
                onclick: async () => {
                  const id = await run(sheets.createWorkbook(), { ok: "Workbook created" });
                  toast("Created — reloading…", "ok");
                  setTimeout(() => location.reload(), 600);
                  return id;
                },
              }, "Create new workbook"),
            ),
            el("div", { class: "field", style: { marginTop: "0.75rem" } },
              el("label", {}, "…or paste an existing spreadsheet ID"),
              el("div", { class: "row" },
                el("input", { type: "text", id: "existing-sheet-id", placeholder: "spreadsheet id" }),
                el("button", {
                  class: "btn",
                  onclick: async () => {
                    const id = document.getElementById("existing-sheet-id").value.trim();
                    if (!id) return toast("Paste an ID first", "bad");
                    await run(sheets.ensureTabs(id), { ok: "Linked" });
                    sheets.setSpreadsheetId(id);
                    setTimeout(() => location.reload(), 400);
                  },
                }, "Link"),
              ),
            ),
          ),
    ),
  );

  // Volume landmarks editor.
  if (sheetId) {
    const landmarks = await data.getLandmarks();
    const card = el("section", { class: "card" },
      el("h2", {}, "Volume landmarks"),
      el("p", { class: "muted small" },
        "Weekly working sets per muscle group. Defaults are pre-filled — adjust as you learn your own MEV and MRV."),
    );
    const table = el("table", { class: "meso-grid" });
    table.append(
      el("thead", {},
        el("tr", {},
          el("th", { style: { textAlign: "left" } }, "Muscle"),
          el("th", {}, "MV"), el("th", {}, "MEV"),
          el("th", {}, "MAV lo"), el("th", {}, "MAV hi"),
          el("th", {}, "MRV"), el("th", {}),
        ),
      ),
    );
    const body = el("tbody", {});
    table.append(body);
    for (const g of MUSCLE_GROUPS) {
      const lm = landmarks[g] || { MV: 0, MEV: 0, MAV_lo: 0, MAV_hi: 0, MRV: 0 };
      const row = el("tr", {});
      row.append(el("td", { class: "muscle" }, formatMuscle(g)));
      const fields = {};
      for (const k of ["MV", "MEV", "MAV_lo", "MAV_hi", "MRV"]) {
        const inp = el("input", { type: "number", value: lm[k], min: 0, style: { width: "70px" } });
        fields[k] = inp;
        row.append(el("td", {}, inp));
      }
      row.append(el("td", {},
        el("button", {
          class: "btn small",
          onclick: async () => {
            await run(
              data.saveLandmark(g, {
                MV: +fields.MV.value, MEV: +fields.MEV.value,
                MAV_lo: +fields.MAV_lo.value, MAV_hi: +fields.MAV_hi.value,
                MRV: +fields.MRV.value,
              }),
              { ok: "Saved" },
            );
          },
        }, "Save"),
      ));
      body.append(row);
    }
    card.append(table);
    container.append(card);

    // Custom exercises management.
    const customExCard = el("section", { class: "card" },
      el("h2", {}, "Custom exercises"),
      el("p", { class: "muted small" },
        "Add exercises not in the built-in library. They'll appear in all exercise pickers."),
    );

    const newEx = { name: "", group: MUSCLE_GROUPS[0], equipment: "" };
    const form = el("div", { class: "field-row three", style: { marginBottom: "0.75rem" } },
      el("div", { class: "field" },
        el("label", {}, "Name"),
        el("input", {
          type: "text", placeholder: "e.g. Pendlay Row",
          oninput: (e) => (newEx.name = e.target.value),
        }),
      ),
      el("div", { class: "field" },
        el("label", {}, "Muscle group"),
        el("select", { onchange: (e) => (newEx.group = e.target.value) },
          ...MUSCLE_GROUPS.map((g) => el("option", { value: g }, formatMuscle(g))),
        ),
      ),
      el("div", { class: "field" },
        el("label", {}, "Equipment"),
        el("select", { onchange: (e) => (newEx.equipment = e.target.value) },
          el("option", { value: "" }, "— optional —"),
          ...EQUIPMENT_TYPES.map((eq) => el("option", { value: eq }, eq)),
        ),
      ),
    );

    const addBtn = el("button", { class: "btn primary small" }, "Add exercise");
    addBtn.onclick = withLoading(addBtn, async () => {
      if (!newEx.name.trim()) return toast("Name is required", "bad");
      await run(data.addCustomExercise(newEx), { ok: "Exercise added" });
      newEx.name = "";
      await renderCustomList();
    });
    customExCard.append(form, addBtn);

    const customListContainer = el("div", {});
    customExCard.append(customListContainer);

    async function renderCustomList() {
      const customs = await data.listCustomExercises();
      customListContainer.replaceChildren();
      if (!customs.length) return;
      customListContainer.append(el("h3", { style: { marginTop: "1rem" } }, "Your exercises"));
      for (const c of customs) {
        const row = el("div", { class: "card-row", style: { padding: "0.4rem 0", borderBottom: "1px solid var(--line)" } },
          el("div", {},
            el("strong", {}, c.name),
            el("span", { class: "muted small", style: { marginLeft: "0.5rem" } },
              `${formatMuscle(c.group)}${c.equipment ? " · " + c.equipment : ""}`),
          ),
          el("button", {
            class: "btn small danger ghost",
            onclick: () => {
              confirmModal(`Delete "${c.name}"?`, async () => {
                await run(data.deleteCustomExercise(c.id), { ok: "Deleted" });
                await renderCustomList();
              });
            },
          }, "×"),
        );
        customListContainer.append(row);
      }
    }

    await renderCustomList();
    container.append(customExCard);

    // Demo data
    const demoCard = el("section", { class: "card" },
      el("h2", {}, "Demo data"),
      el("p", { class: "muted small" },
        "Inject a fully-logged 6-week PPL mesocycle (≈315 sets across 5 weeks), session feedback, and cardio so you can see the app with rich data. Any current active mesocycle is archived. Use \"Remove demo data\" to delete the \"Demo — Hypertrophy Block\" mesocycle and its sets, sessions, feedback, and demo cardio — your own data is left untouched."),
    );
    const demoStatus = el("span", { class: "muted small", style: { marginLeft: "0.6rem" } });
    const demoBtn = el("button", { class: "btn primary" }, "Inject demo data");
    demoBtn.onclick = () => {
      confirmModal(
        "Inject a demo mesocycle with ~315 logged sets, sessions, feedback, and cardio? Your current active mesocycle (if any) will be archived to 'completed'.",
        withLoading(demoBtn, async () => {
          try {
            const res = await seedDemoData((msg) => { demoStatus.textContent = msg; });
            demoStatus.textContent = "";
            toast(`Added ${res.sets} sets, ${res.sessions} sessions, ${res.cardio} cardio entries`, "ok");
            setTimeout(() => { location.hash = "#/"; location.reload(); }, 700);
          } catch (e) {
            console.error(e);
            demoStatus.textContent = "";
            toast(e?.result?.error?.message || e?.message || "Seeding failed", "bad");
          }
        }),
        { confirmLabel: "Inject", danger: false },
      );
    };

    const removeBtn = el("button", { class: "btn danger ghost" }, "Remove demo data");
    removeBtn.onclick = () => {
      confirmModal(
        "Remove the demo mesocycle and all of its sets, sessions, feedback, and demo cardio? Your own data is untouched.",
        withLoading(removeBtn, async () => {
          try {
            const res = await removeDemoData((msg) => { demoStatus.textContent = msg; });
            demoStatus.textContent = "";
            if (!res.mesos && !res.cardio && !res.feedback) {
              toast("No demo data found", "");
              return;
            }
            toast(`Removed demo data (${res.cardio} cardio entries too)`, "ok");
            setTimeout(() => { location.hash = "#/"; location.reload(); }, 700);
          } catch (e) {
            console.error(e);
            demoStatus.textContent = "";
            toast(e?.result?.error?.message || e?.message || "Removal failed", "bad");
          }
        }),
        { confirmLabel: "Remove" },
      );
    };

    demoCard.append(el("div", { class: "row", style: { alignItems: "center" } }, demoBtn, removeBtn, demoStatus));
    container.append(demoCard);

    // Data export
    const exportCard = el("section", { class: "card" },
      el("h2", {}, "Data export"),
      el("p", { class: "muted small" }, "Download all your data as a backup."),
    );
    const jsonBtn = el("button", { class: "btn" }, "Export JSON");
    jsonBtn.onclick = withLoading(jsonBtn, async () => {
      const d = await data.exportAllData();
      const blob = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "hkfit-export.json";
      a.click();
      URL.revokeObjectURL(a.href);
      toast("Downloaded", "ok");
    });
    const csvBtn = el("button", { class: "btn" }, "Export CSV");
    csvBtn.onclick = withLoading(csvBtn, async () => {
      const d = await data.exportAllData();
      const parts = [];
      for (const [tab, rows] of Object.entries(d)) {
        if (!rows.length) continue;
        const headers = Object.keys(rows[0]);
        const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))];
        parts.push(`--- ${tab} ---\n${lines.join("\n")}`);
      }
      const blob = new Blob([parts.join("\n\n")], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "hkfit-export.csv";
      a.click();
      URL.revokeObjectURL(a.href);
      toast("Downloaded", "ok");
    });
    exportCard.append(el("div", { class: "row" }, jsonBtn, csvBtn));
    container.append(exportCard);
  }
}
