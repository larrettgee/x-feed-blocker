const DEFAULTS = {
  enabled: true,
  home: true,
  explore: true,
  sidebar: true,
  discoverMore: true,
};

// Headings X uses to start the recommended-posts block under a post.
const DISCOVER_HEADINGS = ["discover more", "more posts", "more tweets", "related posts"];

let settings = { ...DEFAULTS };
const root = document.documentElement;

function pageFor(path) {
  if (path === "/home" || path === "/") return "home";
  if (path.startsWith("/explore")) return "explore";
  if (/^\/[^/]+\/status\/\d+/.test(path)) return "status";
  return "other";
}

function on(key) {
  return settings.enabled && settings[key] ? "on" : "off";
}

function applyAttributes() {
  root.dataset.xfbPage = pageFor(location.pathname);
  root.dataset.xfbHome = on("home");
  root.dataset.xfbExplore = on("explore");
  root.dataset.xfbSidebar = on("sidebar");
}

function updateNotice() {
  const page = root.dataset.xfbPage;
  const blocked =
    (page === "home" && root.dataset.xfbHome === "on") ||
    (page === "explore" && root.dataset.xfbExplore === "on");
  let notice = document.getElementById("xfb-notice");

  if (!blocked) {
    notice?.remove();
    return;
  }
  const section = document.querySelector('[data-testid="primaryColumn"] section[role="region"]');
  if (!section) return;
  if (notice && notice.previousElementSibling === section) return;

  notice?.remove();
  notice = document.createElement("div");
  notice.id = "xfb-notice";
  notice.innerHTML =
    "<strong>Feed blocked</strong>" +
    '<a href="/notifications">Notifications</a>' +
    '<a href="/messages">Messages</a>' +
    '<a href="/compose/post">New post</a>';
  section.after(notice);
}

function updateDiscoverMore() {
  const active = settings.enabled && settings.discoverMore && root.dataset.xfbPage === "status";
  if (!active) {
    document.querySelectorAll("[data-xfb-hidden]").forEach((el) => el.removeAttribute("data-xfb-hidden"));
    return;
  }
  const timeline = document.querySelector('[data-testid="primaryColumn"] section[role="region"]');
  if (!timeline) return;

  const cells = timeline.querySelectorAll('[data-testid="cellInnerDiv"]');
  let hiding = false;
  for (const cell of cells) {
    if (!hiding) {
      const heading = cell.querySelector('h2, [role="heading"]');
      const text = heading?.textContent.trim().toLowerCase();
      if (text && DISCOVER_HEADINGS.includes(text)) hiding = true;
    }
    if (hiding) cell.setAttribute("data-xfb-hidden", "");
    else cell.removeAttribute("data-xfb-hidden");
  }
}

const NEWS_HEADING = "today's news";
const SIDEBAR_KEEP = 'form[role="search"], [data-testid="SearchBox_Search_Input"], nav[aria-label="Footer"]';

function normalize(text) {
  return text.trim().toLowerCase().replace(/[\u2018\u2019]/g, "'");
}

// Climb from the heading to its bordered card, stopping before the sidebar itself.
function findModule(heading, sidebar) {
  for (let el = heading; el && el.parentElement !== sidebar; el = el.parentElement) {
    const style = getComputedStyle(el);
    if (parseFloat(style.borderTopLeftRadius) >= 8 && parseFloat(style.borderTopWidth) > 0) return el;
    if (el.parentElement.querySelector(SIDEBAR_KEEP)) return el;
  }
  return null;
}

function updateSidebar() {
  const marked = document.querySelectorAll("[data-xfb-sidebar-hidden]");
  const sidebar = document.querySelector('[data-testid="sidebarColumn"]');
  const heading =
    root.dataset.xfbSidebar === "on" && sidebar
      ? [...sidebar.querySelectorAll('h2, [role="heading"], span')].find(
          (el) => normalize(el.textContent) === NEWS_HEADING
        )
      : null;
  const module = heading && findModule(heading, sidebar);

  marked.forEach((el) => el.removeAttribute("data-xfb-sidebar-hidden"));
  if (!module) {
    delete root.dataset.xfbNews;
    return;
  }
  root.dataset.xfbNews = "found";

  // Hide every sibling along the path from the news card up to the sidebar,
  // except whatever holds the search box or footer.
  for (let el = module; el !== sidebar; el = el.parentElement) {
    for (const sibling of el.parentElement.children) {
      if (sibling === el || sibling.matches(SIDEBAR_KEEP) || sibling.querySelector(SIDEBAR_KEEP)) continue;
      sibling.setAttribute("data-xfb-sidebar-hidden", "");
    }
  }
}

// The floating "↑ [avatars] posted" pill that jumps to new posts in the (hidden) feed.
function updateNewPostsPill() {
  document.querySelectorAll("[data-xfb-pill-hidden]").forEach((el) => el.removeAttribute("data-xfb-pill-hidden"));
  if (root.dataset.xfbPage !== "home" || root.dataset.xfbHome !== "on") return;

  const column = document.querySelector('[data-testid="primaryColumn"]');
  if (!column) return;
  const candidates = [
    ...column.querySelectorAll('[aria-label^="New posts"], [data-testid="pillLabel"]'),
    ...[...column.querySelectorAll('[role="button"]')].filter((el) => normalize(el.textContent).endsWith("posted")),
  ];
  for (const el of candidates) {
    (el.closest('[role="button"]') || el).setAttribute("data-xfb-pill-hidden", "");
  }
}

function refresh() {
  applyAttributes();
  if (!document.body) return;
  updateNotice();
  updateDiscoverMore();
  updateSidebar();
  updateNewPostsPill();
}

// X is a single-page app; content scripts can't see its history calls, so poll the path
// and also react to DOM changes (cheaply, batched per frame).
let lastPath = location.pathname;
setInterval(() => {
  if (location.pathname !== lastPath) {
    lastPath = location.pathname;
    refresh();
  }
}, 250);

let scheduled = false;
new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    refresh();
  });
}).observe(root, { childList: true, subtree: true });

chrome.storage.sync.get(DEFAULTS, (stored) => {
  settings = stored;
  refresh();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  for (const [key, { newValue }] of Object.entries(changes)) settings[key] = newValue;
  refresh();
});

applyAttributes();
