// User-supplied configuration.
// 1. Create a Google Cloud project: https://console.cloud.google.com/
// 2. Enable the Google Sheets API and the Google Drive API.
// 3. Create an OAuth 2.0 Client ID (Web application).
//    Authorized JavaScript origins: your GitHub Pages origin, e.g.
//      https://<your-github-username>.github.io
//    (For local testing add http://localhost:8000 too.)
// 4. Paste the Client ID below.
//
// No client secret is needed — this is a public single-page app using the
// Google Identity Services token flow.

// Shared demo OAuth Client ID. Used only as a convenience fallback so the app
// works out of the box; anyone running their own deployment should set their
// own Client ID in Settings (Settings nudges you when this default is active).
export const DEMO_CLIENT_ID = "820041666281-1vie5vuipkcbh48pp53t3gc7stb2jgip.apps.googleusercontent.com";

export const config = {
  // The OAuth 2.0 Client ID from the Google Cloud Console.
  googleClientId: localStorage.getItem("rp.clientId") || DEMO_CLIENT_ID,

  // OAuth scopes. `drive.file` is narrow — the app can only see sheets it
  // creates or that the user explicitly opens through Google Picker.
  // `openid email profile` let the app read the signed-in user's email for
  // display (the /userinfo endpoint requires them).
  scopes: [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
  ].join(" "),

  // Sheet schema version. Bumped if we change tab layouts.
  schemaVersion: 1,

  // Name of the spreadsheet the app creates the first time you sign in.
  defaultSheetName: "GamaTraining Data",

  // Display unit for weights, "lb" or "kg". Weights are always STORED in lbs;
  // this only controls display/input conversion.
  displayUnit: localStorage.getItem("rp.displayUnit") === "kg" ? "kg" : "lb",

  // Rest timer: auto-starts after logging a working set. Sound plays on expiry.
  restTimerEnabled: localStorage.getItem("gama.restTimer") !== "off",
  restTimerSound: localStorage.getItem("gama.restSound") !== "off",

  // When on, weekly volume recommendations are applied automatically on entering
  // a workout instead of waiting for the user to accept them. Default off.
  autoApplyVolume: localStorage.getItem("gama.autoApplyVolume") === "on",
};

// Allow runtime override from the Settings page.
export function setClientId(id) {
  localStorage.setItem("rp.clientId", id);
  config.googleClientId = id;
}

// True when the app is running on the bundled shared demo Client ID rather than
// the user's own. Settings surfaces a nudge in this case.
export function isUsingDemoClientId() {
  return config.googleClientId === DEMO_CLIENT_ID;
}

export function setDisplayUnit(unit) {
  const u = unit === "kg" ? "kg" : "lb";
  localStorage.setItem("rp.displayUnit", u);
  config.displayUnit = u;
}

export function setRestTimerEnabled(on) {
  localStorage.setItem("gama.restTimer", on ? "on" : "off");
  config.restTimerEnabled = !!on;
}

export function setRestTimerSound(on) {
  localStorage.setItem("gama.restSound", on ? "on" : "off");
  config.restTimerSound = !!on;
}

export function setAutoApplyVolume(on) {
  localStorage.setItem("gama.autoApplyVolume", on ? "on" : "off");
  config.autoApplyVolume = !!on;
}
