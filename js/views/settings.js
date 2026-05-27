import { el, run, toast, withLoading, confirmModal, formatMuscle } from "../ui.js";
import { config, setClientId, setDisplayUnit, setRestTimerEnabled, setRestTimerSound, setAutoApplyVolume, isUsingDemoClientId } from "../config.js";
import * as sheets from "../sheets.js";
import * as data from "../data.js";
import { MUSCLE_GROUPS, EQUIPMENT_TYPES } from "../rp.js";
import { seedDemoData, removeDemoData } from "../seed.js";

// A device-link URL points another device at the same workbook. The /link/:id
// route (app.js) confirms before switching this device's stored sheet ID.
function deviceLinkUrl(id) {
  return `${location.origin}${location.pathname}#/link/${id}`;
}

// Pull a spreadsheet ID out of a scanned/typed value: a #/link/<id> device
// link, a full Google Sheets URL, or a bare ID. Returns null if none matches.
function extractSheetId(text) {
  const s = (text || "").trim();
  let m = s.match(/#\/link\/([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  m = s.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{20,}$/.test(s)) return s;
  return null;
}

// Receiver flow: scan the QR shown by another device (or paste its link/ID),
// then hand off to the #/link/<id> confirmation view. Pairs with showLinkModal
// (the sender). Needs no Google setup beyond the existing spreadsheets scope.
function showScanModal() {
  const overlay = el("div", { class: "modal-overlay" });
  const video = el("video", { playsinline: "", muted: "", style: { width: "100%", borderRadius: "8px", background: "#000" } });
  video.muted = true;
  const canvas = document.createElement("canvas");
  const hint = el("p", { class: "muted small" }, "Point your camera at the QR code on your other device.");

  const input = el("input", { type: "text", placeholder: "…or paste the link or sheet ID", style: { width: "100%" } });
  const linkBtn = el("button", { class: "btn small primary" }, "Link");
  const doneBtn = el("button", { class: "btn small" }, "Cancel");

  let stream = null;
  let rafId = 0;
  let finished = false;

  function cleanup() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    if (stream) { for (const t of stream.getTracks()) t.stop(); stream = null; }
  }
  function close() { cleanup(); overlay.remove(); }
  function accept(id) {
    if (finished) return;
    finished = true;
    cleanup();
    overlay.remove();
    location.hash = `#/link/${id}`;
  }
  function submitText() {
    const id = extractSheetId(input.value);
    if (!id) return toast("Couldn't read a sheet link", "bad");
    accept(id);
  }
  linkBtn.onclick = submitText;
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") submitText(); });
  doneBtn.onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };

  function scanLoop() {
    if (finished) return;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = window.jsQR ? window.jsQR(img.data, img.width, img.height) : null;
      if (result && result.data) {
        const id = extractSheetId(result.data);
        if (id) return accept(id);
      }
    }
    rafId = requestAnimationFrame(scanLoop);
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia || !window.jsQR) {
      video.style.display = "none";
      hint.textContent = "Camera scanning isn't available here — paste the link or sheet ID below.";
      return;
    }
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      video.srcObject = stream;
      await video.play();
      rafId = requestAnimationFrame(scanLoop);
    } catch (e) {
      console.error("Camera unavailable:", e);
      video.style.display = "none";
      hint.textContent = "Couldn't open the camera — paste the link or sheet ID below.";
    }
  }

  overlay.append(
    el("div", { class: "modal-card" },
      el("h2", {}, "Scan or enter from another device"),
      hint,
      video,
      el("div", { class: "field", style: { marginTop: "0.75rem" } },
        el("div", { class: "row" }, input, linkBtn),
      ),
      el("div", { class: "btn-row" }, doneBtn),
    ),
  );
  document.body.append(overlay);
  startCamera();
}

// Modal showing a copyable device-link plus a scannable QR code for it.
function showLinkModal(sheetId) {
  const url = deviceLinkUrl(sheetId);
  const overlay = el("div", { class: "modal-overlay" });

  const qrBox = el("div", { style: { textAlign: "center", margin: "0.75rem 0" } });
  try {
    const qr = window.qrcode(0, "M");
    qr.addData(url);
    qr.make();
    qrBox.innerHTML = qr.createSvgTag({ cellSize: 5, margin: 2 });
  } catch (e) {
    console.error("QR render failed:", e);
    qrBox.append(el("p", { class: "muted small" }, "(QR code unavailable — use the link below)"));
  }

  const urlField = el("input", {
    type: "text", readonly: "readonly", value: url,
    onclick: (e) => e.target.select(),
    style: { width: "100%" },
  });
  const copyBtn = el("button", { class: "btn small primary" }, "Copy link");
  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied", "ok");
    } catch {
      urlField.select();
      toast("Press Ctrl/Cmd-C to copy", "warn");
    }
  };
  const doneBtn = el("button", { class: "btn small" }, "Done");
  doneBtn.onclick = () => overlay.remove();

  overlay.append(
    el("div", { class: "modal-card" },
      el("h2", {}, "Link another device"),
      el("p", { class: "muted small" },
        "On your other device, open this link (or scan the code) to point it at this same sheet."),
      qrBox,
      urlField,
      el("div", { class: "btn-row" }, doneBtn, copyBtn),
    ),
  );
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  document.body.append(overlay);
}

// Confirmation view for the #/link/:id deep link.
export async function renderLink(container, id) {
  container.append(el("h1", {}, "Link this device"));
  const current = sheets.getSpreadsheetId();
  const card = el("section", { class: "card" },
    el("p", {}, "Point this browser at the shared data sheet:"),
    el("p", {}, el("code", {}, id)),
    current && current !== id
      ? el("p", { class: "muted small" },
          "This replaces the sheet this device currently uses. Your other sheet stays in Google Drive.")
      : null,
  );
  const linkBtn = el("button", { class: "btn primary" }, "Link this device");
  linkBtn.onclick = () => {
    sheets.setSpreadsheetId(id);
    location.hash = "#/settings";
    location.reload();
  };
  const cancelBtn = el("button", { class: "btn ghost" }, "Cancel");
  cancelBtn.onclick = () => { location.hash = "#/"; };
  card.append(el("div", { class: "row" }, linkBtn, cancelBtn));
  container.append(card);
}

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
  // On/off toggle that flips a config flag in place (no reload).
  const toggle = (getOn, setOn) => {
    const render = (btn) => {
      const on = getOn();
      btn.textContent = on ? "On" : "Off";
      btn.className = "btn" + (on ? " primary" : "");
    };
    const btn = el("button", {});
    btn.onclick = () => { setOn(!getOn()); render(btn); };
    render(btn);
    return btn;
  };
  container.append(
    el("section", { class: "card" },
      el("h2", {}, "Preferences"),
      el("div", { class: "field" },
        el("label", {}, "Weight units"),
        el("p", { class: "muted small" }, "Weights are stored in pounds; this changes display and entry only."),
        el("div", { class: "row", style: { gap: "0.4rem" } }, unitBtn("lb", "Pounds (lb)"), unitBtn("kg", "Kilograms (kg)")),
      ),
      el("div", { class: "field" },
        el("label", {}, "Rest timer"),
        el("p", { class: "muted small" }, "Auto-starts a countdown after you log a working set."),
        el("div", { class: "row", style: { gap: "0.4rem", alignItems: "center" } },
          toggle(() => config.restTimerEnabled, setRestTimerEnabled),
          el("span", { class: "muted small" }, "Sound"),
          toggle(() => config.restTimerSound, setRestTimerSound),
        ),
      ),
      el("div", { class: "field" },
        el("label", {}, "Auto-apply volume adjustments"),
        el("p", { class: "muted small" }, "Apply the weekly volume recommendations automatically when you start a workout, instead of accepting them yourself."),
        toggle(() => config.autoApplyVolume, setAutoApplyVolume),
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
            el("p", { class: "muted small", style: { marginTop: "0.75rem" } },
              "Using this app on another device? Link it to this sheet so both stay in sync."),
            el("div", { class: "row" },
              el("button", {
                class: "btn primary",
                onclick: () => showLinkModal(sheetId),
              }, "Link another device"),
              el("button", {
                class: "btn",
                onclick: () => showScanModal(),
              }, "Switch sheet (scan or enter)"),
            ),
            el("div", { class: "row", style: { marginTop: "0.75rem" } },
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
              "No sheet linked. Create a fresh workbook, or link to an existing one from another device by scanning its QR or entering its ID."),
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
              el("button", {
                class: "btn",
                onclick: () => showScanModal(),
              }, "Scan or enter from another device"),
            ),
          ),
    ),
  );

  // Training profile — questionnaire that auto-personalizes volume landmarks.
  if (sheetId) {
    const prof = await data.getTrainingProfile();
    const summary = prof
      ? `${prof.experience ? prof.experience[0].toUpperCase() + prof.experience.slice(1) : "Intermediate"}`
        + ` · ${(prof.prioritize || []).length} prioritized · ${(prof.careful || []).length} protected`
      : "Not set up yet — answer a few questions to tailor your volume targets.";
    container.append(
      el("section", { class: "card" },
        el("h2", {}, "Training profile"),
        el("p", { class: "muted small" }, summary),
        el("a", { class: "btn", href: "#/profile" }, prof ? "Edit training profile" : "Set up training profile"),
      ),
    );
  }

  // Volume landmarks editor.
  if (sheetId) {
    const landmarks = await data.getLandmarks();

    // Current-week performed working sets per muscle, so the editable landmarks
    // visibly relate to live volume (warm-ups already excluded by weeklyVolume).
    const activeMeso = await data.getActiveMesocycle();
    let weekVol = {};
    if (activeMeso) {
      const start = new Date(activeMeso.startDate);
      const daysIn = Math.floor((Date.now() - start.getTime()) / 86400000);
      const curWeek = Math.min(+activeMeso.weeks, Math.max(1, Math.floor(daysIn / 7) + 1));
      weekVol = await data.weeklyVolume(activeMeso.id, curWeek);
    }

    const card = el("section", { class: "card" },
      el("h2", {}, "Volume landmarks"),
      el("p", { class: "muted small" },
        "Weekly working sets per muscle group. Defaults are pre-filled — adjust as you learn your own MEV and MRV."
        + (activeMeso ? " “Now” is this week's logged working sets for the active mesocycle." : "")),
    );
    const table = el("table", { class: "meso-grid" });
    table.append(
      el("thead", {},
        el("tr", {},
          el("th", { style: { textAlign: "left" } }, "Muscle"),
          el("th", {}, "MV"), el("th", {}, "MEV"),
          el("th", {}, "MAV lo"), el("th", {}, "MAV hi"),
          el("th", {}, "MRV"),
          ...(activeMeso ? [el("th", {}, "Now")] : []),
          el("th", {}),
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
      if (activeMeso) {
        const v = weekVol[g];
        const total = v ? v.direct + v.indirect : 0;
        row.append(el("td", { class: "muted" }, total % 1 ? total.toFixed(1) : String(total)));
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
