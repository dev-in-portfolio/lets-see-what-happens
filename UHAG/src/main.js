import "./style.css";

const apiBase = import.meta.env.VITE_API_BASE || "";
const AUTO_LOAD_LIMIT_BYTES = 12 * 1024 * 1024;

const state = {
  collections: [],
  activeCollectionId: null,
  activeImageId: null,
  page: "landing",
  activeStateFilter: "all",
  viewerRotation: 0,
  zoom: 1,
  imageUrlCache: new Map(),
  viewerMessage: "",
  isSavingRotation: false,
  isLoadingAsset: false,
  pendingViewerImageId: null,
};

const app = document.querySelector("#app");
app.innerHTML = `
  <div class="site-shell">
    <header class="site-header">
      <button id="brand-home" class="brand-button" type="button">
        <span class="archive-stamp">Archive</span>
        <span class="brand-title">Urban Hippie Art</span>
      </button>
      <nav class="site-nav" aria-label="Primary">
        <button id="nav-home" class="nav-link" type="button">Home</button>
        <button id="nav-collections" class="nav-link" type="button">Collections</button>
        <button id="nav-about" class="nav-link" type="button">Archive Note</button>
      </nav>
    </header>
    <main id="page-root" class="page-root"></main>
  </div>

  <dialog id="viewer" class="viewer">
    <div class="viewer-shell">
      <header class="viewer-header">
        <div>
          <p class="eyebrow">Viewer</p>
          <h3 id="viewer-title">Untitled fragment</h3>
        </div>
        <button id="close-viewer" class="icon-button" type="button" aria-label="Close viewer">Close</button>
      </header>
      <div class="viewer-stage-wrap">
        <div class="viewer-stage">
          <img id="viewer-image" alt="" />
          <div id="viewer-empty" class="viewer-empty">Image URL unavailable. Connect Backblaze credentials and request a signed URL.</div>
        </div>
      </div>
      <section class="viewer-controls">
        <div class="control-group">
          <button id="load-original" class="pill-action" type="button">Load original</button>
          <button id="rotate-left" class="pill-action" type="button">Rotate left</button>
          <button id="rotate-right" class="pill-action" type="button">Rotate right</button>
          <button id="save-rotation" class="pill-action pill-action-strong" type="button">Save preferred view</button>
        </div>
        <label class="zoom-control" for="zoom-range">
          Zoom
          <input id="zoom-range" type="range" min="1" max="2.5" step="0.05" value="1" />
        </label>
      </section>
      <p id="viewer-message" class="viewer-message"></p>
      <section id="viewer-meta" class="viewer-meta"></section>
    </div>
  </dialog>
`;

const elements = {
  pageRoot: document.querySelector("#page-root"),
  brandHome: document.querySelector("#brand-home"),
  navHome: document.querySelector("#nav-home"),
  navCollections: document.querySelector("#nav-collections"),
  navAbout: document.querySelector("#nav-about"),
  viewer: document.querySelector("#viewer"),
  viewerTitle: document.querySelector("#viewer-title"),
  viewerImage: document.querySelector("#viewer-image"),
  viewerEmpty: document.querySelector("#viewer-empty"),
  viewerMeta: document.querySelector("#viewer-meta"),
  viewerMessage: document.querySelector("#viewer-message"),
  zoomRange: document.querySelector("#zoom-range"),
  resurfaceButton: document.querySelector("#resurface-button"),
  refreshButton: document.querySelector("#refresh-button"),
  closeViewer: document.querySelector("#close-viewer"),
  loadOriginal: document.querySelector("#load-original"),
  rotateLeft: document.querySelector("#rotate-left"),
  rotateRight: document.querySelector("#rotate-right"),
  saveRotation: document.querySelector("#save-rotation"),
};

const vibeStatements = [
  "The only guarantee with art is that it will be forgotten.",
  "If you like it, great. If not, I don't care.",
  "It is a showcase for me so I can remember when my mind is gone.",
];

const dateLabel = (image) => {
  if (image.dateExact) return image.dateExact;
  if (image.dateApprox) return image.dateApprox;
  if (image.dateUnknown) return "date unknown";
  return "date uncertain";
};

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "size unknown";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatUploadDate = (timestamp) => {
  if (!timestamp) return "upload date unknown";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
};

const getCollectionById = (id) => state.collections.find((collection) => collection.id === id);

const getActiveCollection = () => getCollectionById(state.activeCollectionId);

const getStateOptions = (items) => {
  const counts = new Map();
  for (const item of items) {
    counts.set(item.survivalState, (counts.get(item.survivalState) || 0) + 1);
  }
  return [{ id: "all", label: "all", count: items.length }].concat(
    [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([id, count]) => ({ id, label: id, count })),
  );
};

const getImageById = (id) => {
  for (const collection of state.collections) {
    const image = collection.items.find((item) => item.id === id);
    if (image) return image;
  }
  return null;
};

const getAssetUrl = async (imageId) => {
  const cached = state.imageUrlCache.get(imageId);
  if (cached && cached.expiresAt > Date.now() + 15_000) {
    return cached.url;
  }

  const response = await fetch(`${apiBase}/api/assets/${encodeURIComponent(imageId)}/url`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Unable to request a signed URL.");
  }
  const expiresAt = Number(payload.expiresAt) || Date.now() + 4 * 60 * 1000;
  state.imageUrlCache.set(imageId, { url: payload.url, expiresAt });
  return payload.url;
};

const loadViewerAsset = async (imageId) => {
  const image = getImageById(imageId);
  if (!image) return;

  state.pendingViewerImageId = null;
  state.isLoadingAsset = true;
  elements.loadOriginal.disabled = true;
  setViewerMessage(`Loading original file (${formatBytes(image.contentLength)}).`);

  try {
    const url = await getAssetUrl(imageId);
    elements.viewerImage.src = url;
    elements.viewerEmpty.hidden = true;
    setViewerMessage(`Original loaded. ${formatBytes(image.contentLength)} file.`);
  } catch (error) {
    elements.viewerImage.removeAttribute("src");
    elements.viewerEmpty.hidden = false;
    setViewerMessage(error.message);
  } finally {
    state.isLoadingAsset = false;
    elements.loadOriginal.disabled = false;
  }
};

const navigate = (page, collectionId = null) => {
  state.page = page;
  if (collectionId) {
    state.activeCollectionId = collectionId;
  }
  renderPage();
};

const renderCollections = () => {
  const totalImages = state.collections.reduce((sum, collection) => sum + collection.items.length, 0);
  return `
    <span class="meta-chip">${state.collections.length} collections</span>
    <span class="meta-chip">${totalImages} surviving records</span>
    <span class="meta-chip meta-chip-warning">rotation is viewer-controlled</span>
  `;
};

const renderCollectionList = () =>
  state.collections
    .map(
      (collection) => `
        <button class="collection-link ${collection.id === state.activeCollectionId ? "is-active" : ""}" type="button" data-collection-id="${collection.id}">
          <span class="collection-link-name">${collection.name}</span>
          <span class="collection-link-count">${collection.items.length}</span>
        </button>
      `,
    )
    .join("");

const renderCollectionMeta = (collection) => {
  const filteredItems = getVisibleItems(collection);
  return [
    `<span class="meta-chip">${filteredItems.length} visible of ${collection.items.length}</span>`,
    `<span class="meta-chip meta-chip-warning">${collection.incompleteNote}</span>`,
  ].join("");
};

const getVisibleItems = (collection) => {
  return collection.items.filter((image) => {
    const matchesState = state.activeStateFilter === "all" || image.survivalState === state.activeStateFilter;
    return matchesState;
  });
};

const renderStateFilters = (collection) => {
  const options = getStateOptions(collection.items);
  return options
    .map(
      (option) => `
        <button class="state-filter ${option.id === state.activeStateFilter ? "is-active" : ""}" type="button" data-state-filter="${option.id}">
          <span>${option.label}</span>
          <span>${option.count}</span>
        </button>
      `,
    )
    .join("");
};

const renderGrid = () => {
  const collection = getActiveCollection();
  if (!collection) {
    return `<p class="empty-state">No collection selected.</p>`;
  }

  const visibleItems = getVisibleItems(collection);
  if (!visibleItems.length) {
    return `<p class="empty-state">No records match this search and filter combination.</p>`;
  }

  return visibleItems
    .map(
      (image, index) => `
        <article class="image-card" style="--tone:#283346; --tilt:0deg">
          <button class="image-hit" type="button" data-image-id="${image.id}" aria-label="Open ${image.title}">
            <div class="image-surrogate">
              <img class="image-preview" src="${apiBase}/api/assets/${encodeURIComponent(image.id)}/preview" alt="" loading="lazy" decoding="async" />
            </div>
          </button>
        </article>
      `,
    )
    .join("");
};

const renderLanding = () => `
  <section class="landing-grid">
    <section class="hero-panel panel">
      <div class="hero-copy">
        <div class="logo-lockup">
          <div class="logo-frame">
            <img class="logo-image" src="/logo.png" alt="Urban Hippie Art logo" width="1024" height="1024" loading="eager" decoding="async" />
          </div>
        </div>
      </div>
      <div class="hero-actions">
        <button class="pill-action pill-action-strong" type="button" data-nav-page="collections">Enter the archive</button>
        <button class="pill-action" type="button" data-nav-page="about">Read the note</button>
        <button class="pill-action pill-action-muted" type="button" data-action="resurface">Resurface something</button>
      </div>
      <div class="archive-stats">${renderCollections()}</div>
    </section>
    <section class="featured-panel panel">
      <p class="eyebrow">Entry points</p>
      <div class="featured-list">
        <button class="featured-collection" type="button" data-nav-page="collections">
          <span>All collections</span>
          <span>${state.collections.length}</span>
        </button>
        <button class="featured-collection" type="button" data-action="resurface">
          <span>Random resurfacing</span>
          <span>1</span>
        </button>
      </div>
    </section>
  </section>
`;

const renderCollectionsPage = () => `
  <section class="collections-page">
    <section class="collections-sidebar panel">
      <div class="sidebar-header">
        <p class="eyebrow">Archive index</p>
        <span class="meta-chip">${state.collections.length}</span>
      </div>
      <nav id="collection-list" class="collection-list" aria-label="Collections">${renderCollectionList()}</nav>
      <section class="absence-block">
        <p class="eyebrow">Absence</p>
        <p id="absence-note">${getActiveCollection()?.incompleteNote || "Unknown images, lost originals, and damaged copies remain visible instead of being cleaned away."}</p>
      </section>
    </section>
    <section class="collection-page-main panel">
      <header class="gallery-header">
        <div>
          <p class="eyebrow">Current drawer</p>
          <h2 id="collection-title">${getActiveCollection()?.name || "Loading archive"}</h2>
        </div>
        <p id="collection-description" class="collection-description">${getActiveCollection()?.description || "Pulling the surviving records."}</p>
      </header>
      <div id="collection-meta" class="collection-meta">${getActiveCollection() ? renderCollectionMeta(getActiveCollection()) : ""}</div>
      <div id="image-grid" class="image-grid" aria-live="polite">${renderGrid()}</div>
    </section>
  </section>
`;

const renderAboutPage = () => `
  <section class="about-page panel">
    <header class="about-hero">
      <p class="eyebrow">Archive note</p>
      <h2>This archive is built to outlast memory.</h2>
      <p class="about-lead">Urban Hippie Art is not a polished museum catalog. It is a recovery space for work that survived through loss, compression, screenshots, exports, and incomplete records.</p>
    </header>
    <blockquote class="about-quote">
      <p>${vibeStatements[0]}</p>
      <p>${vibeStatements[1]}</p>
      <p>${vibeStatements[2]}</p>
    </blockquote>
    <div class="about-grid">
      <article class="about-card">
        <h3>Why this exists</h3>
        <p>This is not the complete archive. It is what remained, what was remembered in time to be captured, and what did not get lost to time.</p>
        <p>The archive keeps screenshots, exports, damaged copies, and uncertain fragments because their survival path is part of the work.</p>
      </article>
      <article class="about-card">
        <h3>How to read it</h3>
        <p>Not complete. Not final. Not arranged to impress. Some of these images are here because of screenshots of screenshots of screenshots. Some are here because they survived when others did not.</p>
        <p>Rotate the work if you need to. The right angle is not guaranteed.</p>
      </article>
      <article class="about-card">
        <h3>Preservation rules</h3>
        <p>Missing dates stay missing. Uncertain provenance stays marked uncertain. This archive does not erase damage to pretend a cleaner story.</p>
        <p>What you see is the record as it survived, not as it was meant to survive.</p>
      </article>
    </div>
  </section>
`;

const syncNavState = () => {
  elements.navHome.classList.toggle("is-active", state.page === "landing");
  elements.navCollections.classList.toggle("is-active", state.page === "collections");
  elements.navAbout.classList.toggle("is-active", state.page === "about");
};

const bindPageEvents = () => {
  const collectionList = document.querySelector("#collection-list");
  const imageGrid = document.querySelector("#image-grid");
  const navPageButtons = document.querySelectorAll("[data-nav-page]");
  const resurfaceButtons = document.querySelectorAll("[data-action='resurface']");
  const previewImages = document.querySelectorAll(".image-preview");

  collectionList?.addEventListener("click", (event) => {
    const target = event.target.closest("[data-collection-id]");
    if (!target) return;
    state.activeCollectionId = target.dataset.collectionId;
    renderPage();
  });

  imageGrid?.addEventListener("click", (event) => {
    const target = event.target.closest("[data-image-id]");
    if (!target) return;
    openViewer(target.dataset.imageId);
  });

  navPageButtons.forEach((button) =>
    button.addEventListener("click", () => {
      navigate(button.dataset.navPage);
    }),
  );

  resurfaceButtons.forEach((button) =>
    button.addEventListener("click", () => {
      resurfaceRandom();
    }),
  );

  previewImages.forEach((image) => {
    image.addEventListener(
      "error",
      () => {
        image.closest(".image-surrogate")?.classList.add("is-error");
      },
      { once: true },
    );
  });
};

const renderPage = () => {
  if (state.page === "landing") {
    elements.pageRoot.innerHTML = renderLanding();
  } else if (state.page === "about") {
    elements.pageRoot.innerHTML = renderAboutPage();
  } else {
    elements.pageRoot.innerHTML = renderCollectionsPage();
  }
  syncNavState();
  bindPageEvents();
};

const setViewerMessage = (message) => {
  state.viewerMessage = message;
  elements.viewerMessage.textContent = message;
};

const applyViewerTransform = () => {
  elements.viewerImage.style.transform = `rotate(${state.viewerRotation}deg) scale(${state.zoom})`;
};

const renderViewerMeta = (image) => {
  const relatedLabels = image.relatedImageIds
    .map((id) => getImageById(id))
    .filter(Boolean)
    .map((item) => item.title)
    .join(", ");

  elements.viewerMeta.innerHTML = `
    <div class="viewer-meta-block">
      <p class="eyebrow">Archive record</p>
      <p>${dateLabel(image)}</p>
    </div>
    <div class="viewer-meta-block">
      <p class="eyebrow">Provenance</p>
      <p>${image.provenanceNote}</p>
    </div>
    <div class="viewer-meta-block">
      <p class="eyebrow">Notes</p>
      <p>${image.notes || "No note recorded."}</p>
    </div>
    <div class="viewer-meta-block">
      <p class="eyebrow">Source file</p>
      <p>${image.sourceFileName || "Unknown file name"}</p>
    </div>
    <div class="viewer-meta-block">
      <p class="eyebrow">File details</p>
      <p>${formatBytes(image.contentLength)} • uploaded ${formatUploadDate(image.uploadTimestamp)}</p>
    </div>
    <div class="viewer-meta-block">
      <p class="eyebrow">Related fragments</p>
      <p>${relatedLabels || "None recorded."}</p>
    </div>
  `;
};

const openViewer = async (imageId) => {
  const image = getImageById(imageId);
  if (!image) return;

  state.activeImageId = imageId;
  state.viewerRotation = image.preferredRotation;
  state.zoom = 1;
  state.isLoadingAsset = true;

  elements.zoomRange.value = "1";
  elements.viewerTitle.textContent = image.title;
  elements.viewerImage.alt = `${image.title}, ${image.provenanceNote}`;
  elements.viewerImage.removeAttribute("src");
  elements.viewerEmpty.hidden = true;
  elements.loadOriginal.hidden = false;
  elements.loadOriginal.disabled = false;
  renderViewerMeta(image);
  applyViewerTransform();

  if (!elements.viewer.open) {
    elements.viewer.showModal();
  }

  if ((image.contentLength || 0) > AUTO_LOAD_LIMIT_BYTES) {
    state.pendingViewerImageId = imageId;
    elements.viewerEmpty.hidden = false;
    elements.viewerEmpty.textContent = `This original is ${formatBytes(image.contentLength)}. Load it when you want it.`;
    setViewerMessage("Large original held back to keep the archive responsive.");
    return;
  }

  elements.viewerEmpty.textContent = "Image URL unavailable. Connect Backblaze credentials and request a signed URL.";
  await loadViewerAsset(imageId);
  applyViewerTransform();
};

const closeViewer = () => {
  state.activeImageId = null;
  elements.viewer.close();
};

const rotate = (delta) => {
  state.viewerRotation = (state.viewerRotation + delta + 360) % 360;
  applyViewerTransform();
  setViewerMessage(`Viewing at ${state.viewerRotation} degrees.`);
};

const saveRotation = async () => {
  const image = getImageById(state.activeImageId);
  if (!image || state.isSavingRotation) return;

  state.isSavingRotation = true;
  setViewerMessage("Saving preferred orientation to metadata.");
  try {
    const response = await fetch(`${apiBase}/api/images/${encodeURIComponent(image.id)}/rotation`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ preferredRotation: state.viewerRotation }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Unable to save rotation.");
    }

    const updated = payload.image;
    for (const collection of state.collections) {
      const index = collection.items.findIndex((item) => item.id === updated.id);
      if (index !== -1) {
        collection.items[index] = updated;
      }
    }
    renderPage();
    renderViewerMeta(updated);
    setViewerMessage("Preferred orientation saved.");
  } catch (error) {
    setViewerMessage(error.message);
  } finally {
    state.isSavingRotation = false;
  }
};

const resurfaceRandom = () => {
  const pool = state.collections.flatMap((collection) => getVisibleItems(collection));
  if (!pool.length) return;
  const randomImage = pool[Math.floor(Math.random() * pool.length)];
  openViewer(randomImage.id);
};

const loadArchive = async () => {
  elements.pageRoot.innerHTML = `<section class="loading-page panel"><p class="eyebrow">Loading</p><p>Pulling the surviving records.</p></section>`;
  try {
    const response = await fetch(`${apiBase}/api/collections`);
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "Unable to load archive metadata.");
    }
    const payload = await response.json();

    state.collections = payload.collections;
    state.activeCollectionId = state.activeCollectionId || payload.collections[0]?.id || null;
    renderPage();
  } catch (error) {
    elements.pageRoot.innerHTML = `<section class="loading-page panel"><p class="eyebrow">Unavailable</p><p>${error.message}</p></section>`;
  }
};

elements.brandHome.addEventListener("click", () => navigate("landing"));
elements.navHome.addEventListener("click", () => navigate("landing"));
elements.navCollections.addEventListener("click", () => navigate("collections"));
elements.navAbout.addEventListener("click", () => navigate("about"));
elements.closeViewer.addEventListener("click", closeViewer);
elements.loadOriginal.addEventListener("click", () => {
  if (!state.pendingViewerImageId) return;
  loadViewerAsset(state.pendingViewerImageId);
});
elements.rotateLeft.addEventListener("click", () => rotate(-90));
elements.rotateRight.addEventListener("click", () => rotate(90));
elements.saveRotation.addEventListener("click", saveRotation);
elements.zoomRange.addEventListener("input", () => {
  state.zoom = Number(elements.zoomRange.value);
  applyViewerTransform();
});
elements.viewer.addEventListener("close", () => {
  setViewerMessage("");
  elements.viewerImage.removeAttribute("src");
  elements.viewerEmpty.hidden = true;
  state.pendingViewerImageId = null;
});

window.addEventListener("keydown", (event) => {
  if (!elements.viewer.open) return;
  if (event.key === "Escape") {
    closeViewer();
  }
  if (event.key === "ArrowLeft") rotate(-90);
  if (event.key === "ArrowRight") rotate(90);
});

loadArchive();
