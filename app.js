const STORAGE_KEY = "tool-hub-jax.tools.v1";

const BUILT_IN_TOOLS = [
  {
    id: "builtin-toolboard",
    name: "Toolboard",
    description: "Your Perchance Toolboard app, right inside the hub.",
    url: "https://null.perchance.org/85q207r2n8#toolsGrid",
    category: "Apps",
    accent: "#facc15",
    builtIn: true,
  },
  {
    id: "builtin-clock",
    name: "Focus Clock",
    description: "A clean live clock and date for your desk.",
    url: "tools/clock.html",
    category: "Productivity",
    accent: "#5eead4",
    builtIn: true,
  },
  {
    id: "builtin-notes",
    name: "Quick Notes",
    description: "Jot something down; it stays in this browser.",
    url: "tools/notes.html",
    category: "Productivity",
    accent: "#818cf8",
    builtIn: true,
  },
  {
    id: "builtin-focus",
    name: "Focus Timer",
    description: "A simple countdown timer with quick presets.",
    url: "tools/focus.html",
    category: "Productivity",
    accent: "#f472b6",
    builtIn: true,
  },
];

const state = {
  customTools: [],
  category: "All",
  query: "",
  activeToolId: null,
  lastFocused: null,
};

const elements = {
  toolGrid: document.querySelector("#toolGrid"),
  emptyState: document.querySelector("#emptyState"),
  categoryFilters: document.querySelector("#categoryFilters"),
  searchInput: document.querySelector("#searchInput"),
  addToolButton: document.querySelector("#addToolButton"),
  statTools: document.querySelector("#statTools"),
  statCategories: document.querySelector("#statCategories"),
  statCustom: document.querySelector("#statCustom"),
  viewer: document.querySelector("#viewer"),
  viewerTitle: document.querySelector("#viewerTitle"),
  viewerUrl: document.querySelector("#viewerUrl"),
  viewerBadge: document.querySelector("#viewerBadge"),
  viewerExternal: document.querySelector("#viewerExternal"),
  viewerLoader: document.querySelector("#viewerLoader"),
  toolFrame: document.querySelector("#toolFrame"),
  closeViewerButton: document.querySelector("#closeViewerButton"),
  toolModal: document.querySelector("#toolModal"),
  toolForm: document.querySelector("#toolForm"),
  modalEyebrow: document.querySelector("#modalEyebrow"),
  modalTitle: document.querySelector("#modalTitle"),
  toolId: document.querySelector("#toolId"),
  toolName: document.querySelector("#toolName"),
  toolUrl: document.querySelector("#toolUrl"),
  toolDescription: document.querySelector("#toolDescription"),
  toolCategory: document.querySelector("#toolCategory"),
  toolAccent: document.querySelector("#toolAccent"),
  closeModalButton: document.querySelector("#closeModalButton"),
  cancelModalButton: document.querySelector("#cancelModalButton"),
  toast: document.querySelector("#toast"),
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[character];
  });
}

function getInitials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "TL";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (/^(https?:\/\/|\.?\/|tools\/)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function allTools() {
  return [...BUILT_IN_TOOLS, ...state.customTools];
}

function loadCustomTools() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return;
    state.customTools = saved
      .filter((tool) => tool && typeof tool.name === "string" && typeof tool.url === "string")
      .map((tool) => ({
        id: String(tool.id || `custom-${Date.now()}`),
        name: tool.name,
        description: String(tool.description || ""),
        url: tool.url,
        category: String(tool.category || "Other"),
        accent: String(tool.accent || "#5eead4"),
        builtIn: false,
      }));
  } catch {
    state.customTools = [];
  }
}

function saveCustomTools() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.customTools));
}

function renderStats() {
  const tools = allTools();
  const categories = new Set(tools.map((tool) => tool.category));
  elements.statTools.textContent = String(tools.length);
  elements.statCategories.textContent = String(categories.size);
  elements.statCustom.textContent = String(state.customTools.length);
}

function renderFilters() {
  const categories = ["All", ...new Set(allTools().map((tool) => tool.category))];
  elements.categoryFilters.innerHTML = categories
    .map(
      (category) =>
        `<button class="filter-chip${category === state.category ? " is-active" : ""}" type="button" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`
    )
    .join("");
}

function visibleTools() {
  const query = state.query.trim().toLowerCase();
  return allTools().filter((tool) => {
    const matchesCategory = state.category === "All" || tool.category === state.category;
    const haystack = `${tool.name} ${tool.description} ${tool.category}`.toLowerCase();
    return matchesCategory && (!query || haystack.includes(query));
  });
}

function toolCard(tool, index) {
  const deleteButton = tool.builtIn
    ? ""
    : `<button class="mini-button danger" type="button" data-delete-tool="${escapeHtml(tool.id)}" aria-label="Delete ${escapeHtml(tool.name)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" />
        </svg>
      </button>`;

  return `<article class="tool-card" role="button" tabindex="0" data-tool-id="${escapeHtml(tool.id)}" style="animation-delay:${Math.min(index * 45, 320)}ms">
    <div class="tool-card-actions">${deleteButton}</div>
    <div class="tool-card-top">
      <span class="tool-icon" style="background:${escapeHtml(tool.accent)}">${escapeHtml(getInitials(tool.name))}</span>
    </div>
    <div>
      <h3 class="tool-title">${escapeHtml(tool.name)}</h3>
      <p class="tool-description">${escapeHtml(tool.description || "No description yet.")}</p>
    </div>
    <div class="tool-meta">
      <span class="tool-category">${escapeHtml(tool.category)}</span>
      <span class="tool-open">Open →</span>
    </div>
  </article>`;
}

function renderTools() {
  const tools = visibleTools();
  elements.toolGrid.innerHTML = tools.map(toolCard).join("");
  elements.emptyState.hidden = tools.length > 0;
  elements.toolGrid.hidden = tools.length === 0;
}

function renderAll() {
  renderStats();
  renderFilters();
  renderTools();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    elements.toast.hidden = true;
  }, 2600);
}

function absoluteUrl(url) {
  try {
    return new URL(url, window.location.href).href;
  } catch {
    return url;
  }
}

function openViewer(tool) {
  state.activeToolId = tool.id;
  state.lastFocused = document.activeElement;
  elements.viewerTitle.textContent = tool.name;
  elements.viewerUrl.textContent = absoluteUrl(tool.url);
  elements.viewerBadge.textContent = getInitials(tool.name);
  elements.viewerBadge.style.background = tool.accent;
  elements.viewerExternal.href = tool.url;
  elements.viewerLoader.classList.remove("is-hidden");
  elements.toolFrame.src = tool.url;
  elements.viewer.hidden = false;
  elements.viewer.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
  elements.closeViewerButton.focus();
}

function closeViewer() {
  elements.viewer.hidden = true;
  elements.viewer.setAttribute("aria-hidden", "true");
  elements.toolFrame.src = "about:blank";
  state.activeToolId = null;
  document.body.classList.remove("no-scroll");
  if (state.lastFocused instanceof HTMLElement) state.lastFocused.focus();
}

function openModal(tool) {
  state.lastFocused = document.activeElement;
  elements.toolForm.reset();
  elements.toolId.value = "";
  elements.toolAccent.value = "#5eead4";

  if (tool && !tool.builtIn) {
    elements.modalEyebrow.textContent = "Edit tool";
    elements.modalTitle.textContent = "Edit tool";
    elements.toolId.value = tool.id;
    elements.toolName.value = tool.name;
    elements.toolUrl.value = tool.url;
    elements.toolDescription.value = tool.description;
    elements.toolCategory.value = tool.category;
    elements.toolAccent.value = tool.accent;
  } else {
    elements.modalEyebrow.textContent = "New tool";
    elements.modalTitle.textContent = "Add a tool";
  }

  elements.toolModal.hidden = false;
  elements.toolModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
  elements.toolName.focus();
}

function closeModal() {
  elements.toolModal.hidden = true;
  elements.toolModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
  if (state.lastFocused instanceof HTMLElement) state.lastFocused.focus();
}

function handleToolSubmit(event) {
  event.preventDefault();
  const name = elements.toolName.value.trim();
  const url = normalizeUrl(elements.toolUrl.value);
  if (!name || !url) return;

  const tool = {
    id: elements.toolId.value || `custom-${Date.now()}`,
    name,
    url,
    description: elements.toolDescription.value.trim(),
    category: elements.toolCategory.value,
    accent: elements.toolAccent.value,
    builtIn: false,
  };

  const existingIndex = state.customTools.findIndex((item) => item.id === tool.id);
  if (existingIndex >= 0) {
    state.customTools[existingIndex] = tool;
    showToast("Tool updated");
  } else {
    state.customTools.push(tool);
    showToast("Tool added");
  }

  saveCustomTools();
  renderAll();
  closeModal();
}

function deleteTool(id) {
  const tool = state.customTools.find((item) => item.id === id);
  if (!tool) return;
  if (!window.confirm(`Delete “${tool.name}” from your hub?`)) return;
  state.customTools = state.customTools.filter((item) => item.id !== id);
  saveCustomTools();
  renderAll();
  showToast("Tool deleted");
}

elements.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderTools();
});

elements.categoryFilters.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-category]");
  if (!chip) return;
  state.category = chip.dataset.category;
  renderAll();
});

elements.addToolButton.addEventListener("click", () => openModal());

elements.toolGrid.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-tool]");
  if (deleteButton) {
    event.stopPropagation();
    deleteTool(deleteButton.dataset.deleteTool);
    return;
  }

  const card = event.target.closest("[data-tool-id]");
  if (!card) return;
  const tool = allTools().find((item) => item.id === card.dataset.toolId);
  if (tool) openViewer(tool);
});

elements.toolGrid.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest("[data-tool-id]");
  if (!card) return;
  event.preventDefault();
  const tool = allTools().find((item) => item.id === card.dataset.toolId);
  if (tool) openViewer(tool);
});

elements.closeViewerButton.addEventListener("click", closeViewer);
elements.viewer.querySelector("[data-close-viewer]").addEventListener("click", closeViewer);

elements.toolFrame.addEventListener("load", () => {
  if (elements.toolFrame.src !== "about:blank") {
    elements.viewerLoader.classList.add("is-hidden");
  }
});

elements.closeModalButton.addEventListener("click", closeModal);
elements.cancelModalButton.addEventListener("click", closeModal);
elements.toolModal.querySelector("[data-close-modal]").addEventListener("click", closeModal);
elements.toolForm.addEventListener("submit", handleToolSubmit);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!elements.toolModal.hidden) {
    closeModal();
  } else if (!elements.viewer.hidden) {
    closeViewer();
  }
});

loadCustomTools();
renderAll();
