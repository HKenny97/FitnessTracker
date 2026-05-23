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

export const config = {
  // The OAuth 2.0 Client ID from the Google Cloud Console.
  googleClientId: localStorage.getItem("rp.clientId") || "820041666281-1vie5vuipkcbh48pp53t3gc7stb2jgip.apps.googleusercontent.com",

  // OAuth scopes. `drive.file` is narrow — the app can only see sheets it
  // creates or that the user explicitly opens through Google Picker.
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
  ].join(" "),

  // Sheet schema version. Bumped if we change tab layouts.
  schemaVersion: 1,

  // Name of the spreadsheet the app creates the first time you sign in.
  defaultSheetName: "GamaTraining Data",
};

// Allow runtime override from the Settings page.
export function setClientId(id) {
  localStorage.setItem("rp.clientId", id);
  config.googleClientId = id;
}
