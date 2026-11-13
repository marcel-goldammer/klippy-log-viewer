/*
 * Klippy log viewer: embeds /klippy-log.html into Mainsail's content area,
 * reachable under the address /klippy-log.
 *
 * Loaded by one <script> line that the Rinkhals app adds to Mainsail's index.html.
 * Mainsail has no plugin API, so this relies on a few things in its page:
 *   - the sidebar link from .theme/navi.json   (a[href$="klippy-log.html"], rewritten to /klippy-log)
 *   - the sidebar itself                       (nav.v-navigation-drawer)
 *   - the content area, whose padding leaves room for sidebar and top bar (main.v-main)
 *   - Mainsail's router, reached through the root element (#app.__vue__.$router);
 *     /klippy-log is no Mainsail page, so Mainsail shows an empty content area
 *     there and marks none of its own menu entries as active
 * The address decides what is shown: the log is open exactly while the path is
 * /klippy-log. If one of the above is missing, the click is not intercepted
 * and the link opens the standalone page.
 */
(function () {
  "use strict";

  var PAGE = "/klippy-log.html";
  var ROUTE = "/klippy-log";
  var LINK = 'a[href*="klippy-log"]';               // the sidebar entry, before and after adopt()
  var FALLBACK_LINK = 'a[href$="klippy-log.html"]'; // as written in navi.json
  var OPEN_CLASS = "klog-open";

  var frame = null;

  // The log entry looks active only while the log is open. Mainsail's own
  // click and focus states would otherwise leave it highlighted.
  var entry = ".v-navigation-drawer " + LINK;
  var style = document.createElement("style");
  style.textContent =
    "#klog-frame{position:fixed;border:0;z-index:4;background:#121212}" +
    entry + "::before{opacity:0!important}" +
    entry + ":hover::before{opacity:.08!important}" +
    "body." + OPEN_CLASS + " " + entry + "::before{opacity:.24!important}" +
    "body." + OPEN_CLASS + " " + entry + "{border-right:4px solid var(--v-primary-base)!important}";
  document.head.appendChild(style);

  function main() { return document.querySelector("main.v-main"); }
  function onRoute() { return location.pathname.replace(/\/+$/, "") === ROUTE; }

  function router() {
    var app = document.getElementById("app");
    return app && app.__vue__ && app.__vue__.$router;
  }

  // Point the sidebar entry at /klippy-log, so hovering and "open in new tab"
  // show the address inside Mainsail. navi.json keeps the standalone page as
  // target, which is what the entry opens when this script is not loaded.
  function adopt() {
    var links = document.querySelectorAll(".v-navigation-drawer " + FALLBACK_LINK);
    for (var i = 0; i < links.length; i++) links[i].setAttribute("href", ROUTE);
  }

  // Mainsail sets the content area's padding as an inline style and animates
  // changes (collapsing the sidebar). The inline value is the final one, the
  // computed value lags behind during the animation, so prefer the inline value.
  function place() {
    var m = main();
    if (!frame || !m) return;
    var cs = getComputedStyle(m);
    var top = m.style.paddingTop || cs.paddingTop;
    var right = m.style.paddingRight || cs.paddingRight;
    var bottom = m.style.paddingBottom || cs.paddingBottom;
    var left = m.style.paddingLeft || cs.paddingLeft;
    frame.style.top = top;
    frame.style.left = left;
    frame.style.width = "calc(100% - " + left + " - " + right + ")";
    frame.style.height = "calc(100% - " + top + " - " + bottom + ")";
  }
  var paddingObserver = new MutationObserver(place);

  // Make what is shown match the address.
  function sync() {
    adopt();
    if (onRoute() && !frame && main()) {
      frame = document.createElement("iframe");
      frame.id = "klog-frame";
      frame.src = PAGE;
      frame.title = "Klippy Log";
      document.body.appendChild(frame);
      document.body.classList.add(OPEN_CLASS);
      place();
      paddingObserver.observe(main(), { attributes: true, attributeFilter: ["style"] });
    } else if (!onRoute() && frame) {
      paddingObserver.disconnect();
      frame.remove();
      frame = null;
      document.body.classList.remove(OPEN_CLASS);
    }
  }

  // Capture phase, so the click is handled before Mainsail sees it.
  document.addEventListener("click", function (e) {
    if (!e.target || !e.target.closest) return;
    var link = e.target.closest(LINK);
    if (!link || !link.closest(".v-navigation-drawer")) return;
    adopt();
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // new tab/window as usual
    var r = router();
    if (!r || !main()) return; // unknown page structure: let the link navigate
    e.preventDefault();
    e.stopPropagation();
    link.blur();
    if (!onRoute()) r.push(ROUTE).catch(function () {});
  }, true);

  // Before the browser shows the link target: the entry may have been rendered
  // (or re-rendered by Mainsail) since the last address change.
  document.addEventListener("mouseover", function (e) {
    if (e.target && e.target.closest && e.target.closest(FALLBACK_LINK)) adopt();
  }, true);

  // Every address change, whoever causes it: Mainsail's router or back/forward.
  // Hooked at the history API because this script runs before Mainsail has
  // created its router.
  ["pushState", "replaceState"].forEach(function (name) {
    var original = history[name];
    history[name] = function () {
      var result = original.apply(this, arguments);
      sync();
      return result;
    };
  });
  window.addEventListener("popstate", sync);

  // Opened or reloaded directly at /klippy-log: Mainsail builds its page only
  // after connecting to the printer, so wait for the content area to appear.
  if (onRoute() && !main()) {
    var boot = new MutationObserver(function () {
      if (!main()) return;
      boot.disconnect();
      sync();
    });
    boot.observe(document.documentElement, { childList: true, subtree: true });
  } else {
    sync();
  }
})();
