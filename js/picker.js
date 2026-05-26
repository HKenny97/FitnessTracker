import { getAccessToken } from "./auth.js";

// Google Picker accelerator. Lets the user pick an existing spreadsheet from
// their Drive instead of pasting an ID. This is best-effort: the Picker API
// may not be enabled on the (shared demo) Cloud project and may require a
// developer key we don't have. Callers must treat a rejection as "unavailable"
// and fall back to the device-link / paste flow.

const PICKER_TIMEOUT_MS = 10000;
let pickerLibReady = false;

function loadPickerLib() {
  return new Promise((resolve, reject) => {
    if (pickerLibReady && window.google?.picker) return resolve();
    if (!window.gapi?.load) return reject(new Error("Google API not loaded"));
    const timer = setTimeout(() => reject(new Error("Picker load timed out")), PICKER_TIMEOUT_MS);
    window.gapi.load("picker", {
      callback: () => {
        clearTimeout(timer);
        if (window.google?.picker) {
          pickerLibReady = true;
          resolve();
        } else {
          reject(new Error("Picker library unavailable"));
        }
      },
      onerror: () => {
        clearTimeout(timer);
        reject(new Error("Picker library failed to load"));
      },
    });
  });
}

// Opens the Drive picker filtered to spreadsheets. Resolves with the selected
// spreadsheet ID, null if the user cancels, or rejects if the picker can't run.
export async function pickSpreadsheet() {
  const token = getAccessToken();
  if (!token) throw new Error("Not signed in");
  await loadPickerLib();

  const gp = window.google.picker;
  return new Promise((resolve, reject) => {
    try {
      const view = new gp.DocsView(gp.ViewId.SPREADSHEETS)
        .setIncludeFolders(false)
        .setSelectFolderEnabled(false)
        .setMode(gp.DocsViewMode.LIST);

      const picker = new gp.PickerBuilder()
        .setOAuthToken(token)
        .addView(view)
        .setTitle("Select your GamaTraining sheet")
        .setCallback((res) => {
          const action = res[gp.Response.ACTION];
          if (action === gp.Action.PICKED) {
            const doc = res[gp.Response.DOCUMENTS][0];
            resolve(doc[gp.Document.ID]);
          } else if (action === gp.Action.CANCEL) {
            resolve(null);
          }
        })
        .build();

      picker.setVisible(true);
    } catch (e) {
      reject(e);
    }
  });
}
