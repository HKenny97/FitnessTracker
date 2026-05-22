import { config } from "./config.js";
import * as auth from "./auth.js";
import { route, dispatch, onRender, currentHash } from "./router.js";
import * as dashboard from "./views/dashboard.js";
import * as meso from "./views/meso.js";
import * as workout from "./views/workout.js";
import * as custom from "./views/custom.js";
import * as history from "./views/history.js";
import * as settings from "./views/settings.js";
import { el, clear, toast } from "./ui.js";

const view = document.getElementById("view");
const authSlot = document.getElementById("auth-slot");

function setActiveTab() {
  const hash = currentHash();
  const tab =
    hash.startsWith("#/meso") ? "meso" :
    hash.startsWith("#/workout") ? "workout" :
    hash.startsWith("#/custom") ? "custom" :
    hash.startsWith("#/history") ? "history" :
    hash.startsWith("#/settings") ? "settings" : "dashboard";
  for (const a of document.querySelectorAll(".tabs a")) {
    a.classList.toggle("active", a.dataset.route === tab);
  }
}

function renderAuth(state) {
  clear(authSlot);
  if (!config.googleClientId) {
    authSlot.append(
      el("a", { class: "auth-pill", href: "#/settings" },
        el("span", { class: "dot off" }), "Setup needed"),
    );
    return;
  }
  if (state.signedIn) {
    authSlot.append(
      el("span", { class: "auth-pill" },
        el("span", { class: "dot" }),
        state.email || "Signed in",
      ),
      el("button", { class: "btn small ghost", onclick: () => auth.signOut() }, "Sign out"),
    );
  } else {
    authSlot.append(
      el("button", { class: "btn primary small", onclick: () => auth.signIn() }, "Sign in"),
    );
  }
}

// Wire up routes. Each handler is wrapped to: clear the view, show loading,
// catch errors, and update active tab.
function wrap(fn) {
  return async (params) => {
    clear(view);
    setActiveTab();
    view.append(el("p", { class: "muted" }, "Loading…"));
    try {
      const state = auth.getState();
      const newView = document.createElement("div");
      await fn(newView, params, state);
      clear(view);
      view.append(newView);
    } catch (e) {
      console.error(e);
      clear(view);
      view.append(
        el("div", { class: "banner error" },
          e?.result?.error?.message || e?.message || "Something went wrong"),
      );
    }
  };
}

route("/", wrap(async (root, _p, state) => dashboard.render(root, state)));
route("/meso", wrap(async (root) => meso.renderList(root)));
route("/meso/new", wrap(async (root) => meso.renderNew(root)));
route("/meso/:id", wrap(async (root, p) => meso.renderDetail(root, p.id)));
route("/workout", wrap(async (root) => workout.render(root)));
route("/custom", wrap(async (root) => custom.render(root)));
route("/history", wrap(async (root) => history.render(root)));
route("/settings", wrap(async (root) => settings.render(root)));

onRender((handler, params) => handler(params));

// Hook the hero's sign-in button (delegated, since the hero is rendered
// inside the view container each time the dashboard mounts).
document.addEventListener("click", (e) => {
  if (e.target.id === "sign-in-btn") {
    e.preventDefault();
    auth.signIn();
  }
});

// Boot.
(async () => {
  await auth.init();
  auth.onAuthChange((state) => {
    renderAuth(state);
    dispatch();
  });
  if (!location.hash) location.hash = "#/";
  dispatch();
})();
