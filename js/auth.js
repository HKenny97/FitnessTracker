import { config } from "./config.js";

let silentRestoreFailed = false;
let tokenClient = null;
let accessToken = null;
let tokenExpiresAt = 0;
let userEmail = null;
let gapiReady = false;
let gsiReady = false;
let refreshTimer = null;
let pendingRefresh = null;  // dedup concurrent ensureToken calls

const subscribers = new Set();

function notify() {
  for (const cb of subscribers) cb(getState());
}

function cacheToken() {
  localStorage.setItem("rp.token", JSON.stringify({
    accessToken,
    tokenExpiresAt,
    userEmail,
  }));
}

function restoreToken() {
  try {
    const raw = localStorage.getItem("rp.token");
    if (!raw) return false;
    const cached = JSON.parse(raw);
    if (!cached.accessToken || Date.now() >= cached.tokenExpiresAt) {
      localStorage.removeItem("rp.token");
      return false;
    }
    accessToken = cached.accessToken;
    tokenExpiresAt = cached.tokenExpiresAt;
    userEmail = cached.userEmail || null;
    return true;
  } catch {
    return false;
  }
}

function clearTokenCache() {
  localStorage.removeItem("rp.token");
}

// Schedule a proactive token refresh 5 minutes before expiry.
function scheduleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
  if (!tokenExpiresAt) return;
  const ms = tokenExpiresAt - Date.now() - 5 * 60 * 1000; // 5 min before
  if (ms <= 0) return;
  refreshTimer = setTimeout(() => {
    ensureToken().catch((e) => console.warn("Proactive refresh failed:", e));
  }, ms);
}

export function onAuthChange(cb) {
  subscribers.add(cb);
  cb(getState());
  return () => subscribers.delete(cb);
}

export function getState() {
  return {
    signedIn: !!accessToken && Date.now() < tokenExpiresAt,
    email: userEmail,
    token: accessToken,
    ready: gapiReady && gsiReady && !!config.googleClientId,
  };
}

export function getAccessToken() {
  if (!accessToken || Date.now() >= tokenExpiresAt) return null;
  return accessToken;
}

const LIBS_TIMEOUT_MS = 10000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

async function waitForLibs() {
  const libsLoaded = await new Promise((resolve) => {
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), LIBS_TIMEOUT_MS);
    const tick = () => {
      if (done) return;
      if (window.gapi && window.google?.accounts?.oauth2) {
        clearTimeout(timer);
        return finish(true);
      }
      setTimeout(tick, 50);
    };
    tick();
  });

  if (!libsLoaded) {
    console.warn("Google libraries failed to load — app will run signed-out.");
    return;
  }

  if (!gapiReady) {
    try {
      await new Promise((resolve) =>
        window.gapi.load("client", { callback: resolve, onerror: resolve }),
      );
      await withTimeout(
        window.gapi.client.init({
          discoveryDocs: [
            "https://sheets.googleapis.com/$discovery/rest?version=v4",
            "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
          ],
        }),
        LIBS_TIMEOUT_MS,
        "gapi.client.init",
      );
      gapiReady = true;
    } catch (e) {
      console.warn("gapi.client.init failed:", e);
      return;
    }
  }
  gsiReady = true;
}

export async function init() {
  await waitForLibs();
  if (!gsiReady || !window.google?.accounts?.oauth2) {
    notify();
    return;
  }
  if (!config.googleClientId) {
    notify();
    return;
  }

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: config.googleClientId,
    scope: config.scopes,
    hint: userEmail || "",
    callback: (resp) => {
      if (resp.error) {
        console.error("Token error", resp);
        notify();
        return;
      }
      accessToken = resp.access_token;
      tokenExpiresAt = Date.now() + (resp.expires_in - 60) * 1000;
      window.gapi.client.setToken({ access_token: accessToken });
      localStorage.setItem("rp.consentGiven", "1");
      scheduleRefresh();
      fetchUserInfo().then(() => {
        cacheToken();
        notify();
      });
    },
  });

  // Restore cached token — if valid, sign in silently with no popup.
  if (restoreToken()) {
    window.gapi.client.setToken({ access_token: accessToken });
    // Verify the token is still accepted by Google.
    try {
      const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (r.ok) {
        const info = await r.json();
        userEmail = info.email || userEmail;
        cacheToken();
        scheduleRefresh();
        notify();
        return;
      }
    } catch { /* fall through to normal flow */ }

    // Token invalid — try a silent refresh before giving up.
    accessToken = null;
    tokenExpiresAt = 0;
    clearTokenCache();
    window.gapi.client.setToken(null);

    if (localStorage.getItem("rp.consentGiven")) {
      try {
        await doSilentRefresh();
        // Success — we're signed in again.
        notify();
        return;
      } catch { /* silent refresh failed */ }
    }
    silentRestoreFailed = true;
  } else if (localStorage.getItem("rp.consentGiven")) {
    // No cached token at all, but user consented before — try silent refresh.
    try {
      await doSilentRefresh();
      notify();
      return;
    } catch { /* fall through */ }
    silentRestoreFailed = true;
  }

  notify();
}

async function fetchUserInfo() {
  try {
    const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (r.ok) {
      const data = await r.json();
      userEmail = data.email;
    }
  } catch {
    // best-effort
  }
}

export function didSilentRestoreFail() {
  const v = silentRestoreFailed;
  silentRestoreFailed = false;
  return v;
}

// Internal: request a new token silently (no consent prompt).
// Resolves on success, rejects if Google shows an error.
function doSilentRefresh() {
  return new Promise((resolve, reject) => {
    const prev = tokenClient.callback;
    tokenClient.callback = (resp) => {
      tokenClient.callback = prev;
      if (resp.error) {
        reject(new Error(resp.error));
        return;
      }
      accessToken = resp.access_token;
      tokenExpiresAt = Date.now() + (resp.expires_in - 60) * 1000;
      window.gapi.client.setToken({ access_token: accessToken });
      localStorage.setItem("rp.consentGiven", "1");
      scheduleRefresh();
      fetchUserInfo().then(() => {
        cacheToken();
        notify();
      });
      resolve();
    };
    tokenClient.requestAccessToken({ prompt: "", login_hint: userEmail || "" });
  });
}

export async function ensureToken() {
  // Still valid — nothing to do.
  if (accessToken && Date.now() < tokenExpiresAt - 60000) return;

  // No tokenClient means auth.init() hasn't run or no client ID.
  if (!tokenClient) return;

  // If user never consented, we can't silently refresh — they need to
  // click Sign In.  Throw so callers know auth is required.
  if (!localStorage.getItem("rp.consentGiven")) {
    throw new Error("Not signed in");
  }

  // Dedup: if a refresh is already in flight, piggyback on it.
  if (pendingRefresh) {
    await pendingRefresh;
    return;
  }

  pendingRefresh = doSilentRefresh()
    .catch((err) => {
      // Silent refresh failed — clear state so UI shows "Sign in".
      accessToken = null;
      tokenExpiresAt = 0;
      clearTokenCache();
      window.gapi.client.setToken(null);
      notify();
      throw err;
    })
    .finally(() => { pendingRefresh = null; });

  await pendingRefresh;
}

export function signIn() {
  if (!tokenClient) {
    alert(
      "Add your Google OAuth Client ID in Settings before signing in.\nSee the README for setup steps.",
    );
    return;
  }
  // After first consent, skip the permissions screen — just pick account.
  const hasConsented = localStorage.getItem("rp.consentGiven");
  tokenClient.requestAccessToken({
    prompt: hasConsented ? "" : "consent",
    login_hint: userEmail || "",
  });
}

export function signOut() {
  if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
  if (accessToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(accessToken, () => {});
  }
  accessToken = null;
  tokenExpiresAt = 0;
  userEmail = null;
  window.gapi?.client?.setToken(null);
  clearTokenCache();
  localStorage.removeItem("rp.consentGiven");
  notify();
}
