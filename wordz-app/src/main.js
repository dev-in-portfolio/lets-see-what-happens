import Quill from "quill";
import "quill/dist/quill.snow.css";
import "./style.css";

const STORAGE_KEY = "wordz.documents.v1";
const ACTIVE_ID_KEY = "wordz.activeDocument.v1";
const LAYOUT_KEY = "wordz.layout.v1";
const MINIMAL_MODE_KEY = "wordz.minimalMode.v1";
const PREVIEW_MODE_KEY = "wordz.previewMode.v1";
const BACKUPS_KEY = "wordz.backups.v1";
const EDITOR_PREFS_KEY = "wordz.editorPrefs.v1";
const HISTORY_KEY = "wordz.history.v1";
const SUGGESTIONS_KEY = "wordz.suggestions.v1";
const COMMENTS_KEY = "wordz.comments.v1";
const CUSTOM_STYLES_KEY = "wordz.customStyles.v1";
const CUSTOM_TEMPLATES_KEY = "wordz.customTemplates.v1";
const AUTOSAVE_MS = 1000;
const SNAPSHOT_MIN_INTERVAL_MS = 10000;
const MAX_SNAPSHOTS = 25;
const MAX_SUGGESTIONS = 200;

const TEMPLATE_PRESETS = {
  blank: { title: "Untitled document", html: "<p><br></p>" },
  letter: {
    title: "Formal Letter",
    html: "<p>[Your Name]</p><p>[Address]</p><p>[City, State ZIP]</p><p><br></p><p>[Date]</p><p><br></p><p>[Recipient Name]</p><p>[Recipient Address]</p><p><br></p><p>Dear [Recipient],</p><p><br></p><p>[Body paragraph one.]</p><p><br></p><p>[Body paragraph two.]</p><p><br></p><p>Sincerely,</p><p>[Your Name]</p>",
  },
  report: {
    title: "Report",
    html: "<h1>Report Title</h1><p><strong>Author:</strong> [Name]</p><p><strong>Date:</strong> [Date]</p><h2>Executive Summary</h2><p>[Summary text]</p><h2>Findings</h2><p>[Findings text]</p><h2>Conclusion</h2><p>[Conclusion text]</p>",
  },
  notes: {
    title: "Meeting Notes",
    html: "<h1>Meeting Notes</h1><p><strong>Date:</strong> [Date]</p><p><strong>Attendees:</strong> [Names]</p><h2>Agenda</h2><ul><li>[Item one]</li><li>[Item two]</li></ul><h2>Decisions</h2><ul><li>[Decision]</li></ul><h2>Actions</h2><ul><li>[Owner] - [Task] - [Due]</li></ul>",
  },
};

const FONT_FAMILIES = {
  source_sans: { label: "Source Sans", css: '"Source Sans 3","Segoe UI",sans-serif' },
  arial: { label: "Arial", css: "Arial,Helvetica,sans-serif" },
  helvetica: { label: "Helvetica", css: '"Helvetica Neue",Helvetica,Arial,sans-serif' },
  verdana: { label: "Verdana", css: "Verdana,Geneva,sans-serif" },
  tahoma: { label: "Tahoma", css: "Tahoma,Geneva,sans-serif" },
  trebuchet: { label: "Trebuchet MS", css: '"Trebuchet MS",Helvetica,sans-serif' },
  gill_sans: { label: "Gill Sans", css: '"Gill Sans","Gill Sans MT",Calibri,sans-serif' },
  avenir: { label: "Avenir", css: "Avenir,Montserrat,Helvetica,sans-serif" },
  futura: { label: "Futura", css: "Futura,Trebuchet MS,sans-serif" },
  optima: { label: "Optima", css: "Optima,Candara,sans-serif" },
  georgia: { label: "Georgia", css: "Georgia,serif" },
  cambria: { label: "Cambria", css: "Cambria,Georgia,serif" },
  merriweather: { label: "Merriweather", css: '"Merriweather",Georgia,serif' },
  palatino: { label: "Palatino", css: '"Palatino Linotype","Book Antiqua",Palatino,serif' },
  garamond: { label: "Garamond", css: 'Garamond,"Times New Roman",serif' },
  baskerville: { label: "Baskerville", css: 'Baskerville,"Times New Roman",serif' },
  didot: { label: "Didot", css: 'Didot,"Bodoni MT","Times New Roman",serif' },
  bookman: { label: "Bookman", css: '"Bookman Old Style",Bookman,serif' },
  system_sans: { label: "System Sans", css: "system-ui,-apple-system,BlinkMacSystemFont,sans-serif" },
  times: { label: "Times", css: '"Times New Roman",Times,serif' },
  courier: { label: "Courier", css: '"Courier New",Courier,monospace' },
  consolas: { label: "Consolas", css: "Consolas,Monaco,monospace" },
  menlo: { label: "Menlo", css: "Menlo,Monaco,Consolas,monospace" },
  monaco: { label: "Monaco", css: "Monaco,Consolas,monospace" },
  lucida_console: { label: "Lucida Console", css: '"Lucida Console","Courier New",monospace' },
};

const TYPO_THEMES = {
  classic: { label: "Classic", fontFamily: "georgia", lineSpacing: "1.25", baseFontSize: "12" },
  modern: { label: "Modern", fontFamily: "source_sans", lineSpacing: "1.20", baseFontSize: "12" },
  editorial: { label: "Editorial", fontFamily: "merriweather", lineSpacing: "1.35", baseFontSize: "13" },
  manuscript: { label: "Manuscript", fontFamily: "times", lineSpacing: "1.60", baseFontSize: "12" },
  coding: { label: "Coding", fontFamily: "courier", lineSpacing: "1.30", baseFontSize: "12" },
  business: { label: "Business", fontFamily: "cambria", lineSpacing: "1.20", baseFontSize: "11" },
  modern_clean: { label: "Modern Clean", fontFamily: "helvetica", lineSpacing: "1.15", baseFontSize: "12" },
  bookish: { label: "Bookish", fontFamily: "palatino", lineSpacing: "1.40", baseFontSize: "13" },
};

const PAGE_PRESETS = {
  letter: {
    label: "Letter",
    width: "8.5in",
    minHeight: "11in",
    widthPx: 816,
    heightPx: 1056,
  },
  a4: {
    label: "A4",
    width: "210mm",
    minHeight: "297mm",
    widthPx: 794,
    heightPx: 1123,
  },
};

const isValidMargin = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0.25 && n <= 3;
};
const isValidLineSpacing = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 3;
};
const marginCssToPx = (value) => Math.round((parseFloat(value) || 1) * 96);
const marginCssToPt = (value) => (parseFloat(value) || 1) * 72;

const normalizeMargin = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "compact") return "0.70";
  if (trimmed === "normal") return "1.00";
  if (trimmed === "wide") return "1.25";
  if (trimmed.endsWith("in")) {
    const raw = trimmed.replace("in", "").trim();
    return isValidMargin(raw) ? Number(raw).toFixed(2) : null;
  }
  return isValidMargin(trimmed) ? Number(trimmed).toFixed(2) : null;
};

const normalizeLineSpacing = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return isValidLineSpacing(trimmed) ? Number(trimmed).toFixed(2) : null;
};

const normalizeHexColor = (value, fallback = "#1f2a30") => {
  const trimmed = String(value || "").trim();
  return /^#(?:[0-9a-fA-F]{6})$/.test(trimmed) ? trimmed.toLowerCase() : fallback;
};

const hexToRgb = (value) => {
  const normalized = normalizeHexColor(value).slice(1);
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
};

const resolveDocxRunDefaults = () => ({
  color: normalizeHexColor(layoutState.fontColor).slice(1).toUpperCase(),
  size: Math.round((parseFloat(layoutState.baseFontSize) || 12) * 2),
  font: FONT_FAMILIES[layoutState.fontFamily]?.label || "Arial",
});

const HEADER_SPACE_PX = 36;
const FOOTER_SPACE_PX = 36;

const app = document.querySelector("#app");
app.innerHTML = `
  <main class="shell">
    <aside class="docs-panel">
      <div class="brand">
        <p class="eyebrow">Offline editor</p>
        <h1>Wordz</h1>
        <p class="tagline">Write anywhere. No paywalls.</p>
      </div>
      <header class="docs-header">
        <span class="docs-count" id="docs-count">0 documents</span>
        <button id="new-doc" class="button">New</button>
      </header>
      <ul id="docs-list" class="docs-list"></ul>
    </aside>

    <section class="editor-panel">
      <header class="editor-header">
        <input id="doc-title" class="title-input" placeholder="Untitled document" />
        <div class="meta-group">
          <div class="meta-chip" id="word-count">0 words</div>
          <div class="meta-chip" id="page-count">1 page</div>
          <div class="meta-chip" id="save-state">Saved</div>
        </div>
      </header>

      <nav id="menu-strip" class="menu-strip" aria-label="Editor menus">
        <button class="menu-toggle is-active" type="button" data-menu="all">All</button>
        <button class="menu-toggle" type="button" data-menu="file">File</button>
        <button class="menu-toggle" type="button" data-menu="edit">Edit</button>
        <button class="menu-toggle" type="button" data-menu="layout">Layout</button>
        <button class="menu-toggle" type="button" data-menu="review">Review</button>
        <button class="menu-toggle" type="button" data-menu="insert">Insert</button>
        <button class="menu-toggle" type="button" data-menu="styles">Styles</button>
        <button class="menu-toggle" type="button" data-menu="sync">Sync</button>
        <button id="menu-collapse-toggle" class="menu-toggle menu-collapse" type="button" aria-pressed="false">Collapse</button>
      </nav>

      <div class="command-bar">
        <button id="open-file" class="action">Open</button>
        <button id="save-file" class="action">Save</button>
        <button id="export-pdf" class="action">PDF</button>
        <button id="export-docx" class="action">DOCX</button>
        <button id="print-doc" class="action">Print</button>
        <button id="toggle-minimal" class="action action-minimal">Minimal</button>
        <button id="toggle-page-view" class="action action-page">Page View</button>
        <button id="toggle-find" class="action action-find">Find</button>
        <button id="restore-backup" class="action action-backup">Restore</button>
        <button id="undo-doc" class="action">Undo</button>
        <button id="redo-doc" class="action">Redo</button>
        <button id="toggle-suggest" class="action action-suggest">Suggest</button>
        <button id="toggle-versions" class="action action-version">Versions</button>
        <button id="toggle-comments" class="action action-comment">Comments</button>
        <button id="add-comment" class="action action-comment">Add Comment</button>
        <button id="insert-table" class="action action-insert">Table</button>
        <button id="insert-image" class="action action-insert">Image</button>
        <button id="sync-export" class="action action-sync">Sync Out</button>
        <button id="sync-import" class="action action-sync">Sync In</button>
        <button id="toggle-style-manager" class="action action-template">Styles</button>
        <button id="toggle-template-manager" class="action action-template">Templates</button>

        <label class="layout-control">Page
          <select id="page-size">
            <option value="letter">Letter</option>
            <option value="a4">A4</option>
          </select>
        </label>

        <label class="layout-control">Margins
          <input id="page-margin" class="layout-input" type="number" step="0.05" min="0.25" max="3.00" value="1.00" />
        </label>

        <label class="layout-control">Line
          <input id="line-spacing" class="layout-input" type="number" step="0.05" min="1.00" max="3.00" value="1.25" />
        </label>

        <input id="header-text" class="layout-input" placeholder="Header" maxlength="80" />
        <input id="footer-text" class="layout-input" placeholder="Footer" maxlength="80" />

        <label class="layout-control layout-check">
          <input id="page-numbers" type="checkbox" checked />
          Numbers
        </label>

        <label class="layout-control layout-check">
          <input id="spellcheck-toggle" type="checkbox" checked />
          Spellcheck
        </label>

        <label class="layout-control">Template
          <select id="template-select">
            <option value="blank">Blank</option>
            <option value="letter">Letter</option>
            <option value="report">Report</option>
            <option value="notes">Notes</option>
          </select>
        </label>

        <button id="apply-template" class="action action-template">Use Template</button>

        <label class="layout-control">Style
          <select id="style-select">
            <option value="normal">Normal</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="quote">Quote</option>
            <option value="code">Code</option>
          </select>
        </label>

        <button id="apply-style" class="action action-template">Apply Style</button>

        <label class="layout-control">Font
          <select id="font-family-select">
            <option value="source_sans">Source Sans</option>
            <option value="arial">Arial</option>
            <option value="helvetica">Helvetica</option>
            <option value="verdana">Verdana</option>
            <option value="tahoma">Tahoma</option>
            <option value="trebuchet">Trebuchet MS</option>
            <option value="gill_sans">Gill Sans</option>
            <option value="avenir">Avenir</option>
            <option value="futura">Futura</option>
            <option value="optima">Optima</option>
            <option value="georgia">Georgia</option>
            <option value="cambria">Cambria</option>
            <option value="merriweather">Merriweather</option>
            <option value="palatino">Palatino</option>
            <option value="garamond">Garamond</option>
            <option value="baskerville">Baskerville</option>
            <option value="didot">Didot</option>
            <option value="bookman">Bookman</option>
            <option value="system_sans">System Sans</option>
            <option value="times">Times</option>
            <option value="courier">Courier</option>
            <option value="consolas">Consolas</option>
            <option value="menlo">Menlo</option>
            <option value="monaco">Monaco</option>
            <option value="lucida_console">Lucida Console</option>
          </select>
        </label>

        <label class="layout-control">Color
          <input id="font-color" class="layout-input layout-color" type="color" value="#1f2a30" />
        </label>

        <label class="layout-control">Size
          <input id="base-font-size" class="layout-input layout-size" type="number" step="1" min="9" max="24" value="12" />
        </label>

        <label class="layout-control">Theme
          <select id="typography-theme-select">
            <option value="classic">Classic</option>
            <option value="modern">Modern</option>
            <option value="editorial">Editorial</option>
            <option value="manuscript">Manuscript</option>
            <option value="coding">Coding</option>
            <option value="business">Business</option>
            <option value="modern_clean">Modern Clean</option>
            <option value="bookish">Bookish</option>
          </select>
        </label>

        <button id="apply-typography-theme" class="action action-template">Apply Theme</button>
      </div>

      <section id="find-panel" class="find-panel" hidden>
        <input id="find-input" class="find-input" placeholder="Find text" />
        <input id="replace-input" class="find-input" placeholder="Replace with" />
        <button id="find-prev" class="action action-find-sub">Prev</button>
        <button id="find-next" class="action action-find-sub">Next</button>
        <button id="replace-one" class="action action-find-sub">Replace</button>
        <button id="replace-all" class="action action-find-sub">Replace All</button>
        <span id="find-meta" class="find-meta">0 matches</span>
        <button id="find-close" class="action action-find-sub">Close</button>
      </section>

      <section id="versions-panel" class="versions-panel" hidden>
        <div class="versions-header">
          <strong>Snapshots</strong>
          <button id="versions-close" class="action action-find-sub">Close</button>
        </div>
        <div id="versions-list" class="versions-list"></div>
      </section>

      <section id="diff-modal" class="diff-modal" hidden>
        <div class="diff-card">
          <header class="versions-header">
            <strong>Snapshot Diff Preview</strong>
            <button id="diff-close" class="action action-find-sub">Close</button>
          </header>
          <div id="diff-meta" class="diff-meta"></div>
          <div class="diff-grid">
            <article>
              <h4>Current</h4>
              <pre id="diff-current" class="diff-text"></pre>
            </article>
            <article>
              <h4>Snapshot</h4>
              <pre id="diff-snapshot" class="diff-text"></pre>
            </article>
          </div>
          <div class="diff-actions">
            <button id="diff-restore" class="action action-version">Restore This Snapshot</button>
          </div>
        </div>
      </section>

      <section id="suggestions-panel" class="suggestions-panel" hidden>
        <div class="versions-header">
          <strong>Suggestions Log</strong>
          <div class="version-actions">
            <button id="suggestions-accept-all" class="action action-find-sub">Accept All</button>
            <button id="suggestions-reject-all" class="action action-find-sub">Reject All</button>
          </div>
          <button id="suggestions-close" class="action action-find-sub">Close</button>
        </div>
        <div id="suggestions-list" class="versions-list"></div>
      </section>

      <section id="comments-panel" class="comments-panel" hidden>
        <div class="versions-header">
          <strong>Comments</strong>
          <button id="comments-close" class="action action-find-sub">Close</button>
        </div>
        <div id="comments-list" class="versions-list"></div>
      </section>

      <section id="style-manager-panel" class="comments-panel" hidden>
        <div class="versions-header">
          <strong>Style Manager</strong>
          <div class="version-actions">
            <button id="save-style" class="action action-find-sub">Save Current</button>
          </div>
          <button id="style-manager-close" class="action action-find-sub">Close</button>
        </div>
        <div id="style-manager-list" class="versions-list"></div>
      </section>

      <section id="template-manager-panel" class="comments-panel" hidden>
        <div class="versions-header">
          <strong>Template Manager</strong>
          <div class="version-actions">
            <button id="save-template" class="action action-find-sub">Save Current</button>
          </div>
          <button id="template-manager-close" class="action action-find-sub">Close</button>
        </div>
        <div id="template-manager-list" class="versions-list"></div>
      </section>

      <input id="file-picker" type="file" accept=".wordz,.json,.txt,.html,.htm,.docx" hidden />
      <input id="image-picker" type="file" accept="image/*" hidden />
      <input id="sync-picker" type="file" accept=".wordzsync,.wordzsync.enc,.json,.enc" hidden />

      <div id="toolbar">
        <span class="ql-formats">
          <select class="ql-header">
            <option value="1"></option>
            <option value="2"></option>
            <option selected></option>
          </select>
          <select class="ql-size">
            <option value="10pt">10</option>
            <option value="11pt">11</option>
            <option value="12pt" selected>12</option>
            <option value="14pt">14</option>
            <option value="16pt">16</option>
            <option value="18pt">18</option>
            <option value="24pt">24</option>
            <option value="32pt">32</option>
          </select>
        </span>
        <span class="ql-formats">
          <button class="ql-bold" title="Bold"></button>
          <button class="ql-italic" title="Italic"></button>
          <button class="ql-underline" title="Underline"></button>
          <button class="ql-strike" title="Strikethrough"></button>
          <button class="ql-link" title="Add link"></button>
          <button id="unlink-format" type="button" aria-label="Remove link">Unlink</button>
        </span>
        <span class="ql-formats">
          <select class="ql-color" title="Text color"></select>
          <select class="ql-background" title="Highlight color"></select>
          <button class="ql-clean" title="Clear formatting"></button>
        </span>
        <span class="ql-formats">
          <button class="ql-list" value="ordered" title="Numbered list"></button>
          <button class="ql-list" value="bullet" title="Bullet list"></button>
          <button class="ql-indent" value="-1" title="Outdent"></button>
          <button class="ql-indent" value="+1" title="Indent"></button>
          <button class="ql-align" value="" title="Align left"></button>
          <button class="ql-align" value="center" title="Align center"></button>
          <button class="ql-align" value="right" title="Align right"></button>
          <button class="ql-align" value="justify" title="Justify"></button>
        </span>
      </div>

      <div id="editor-shell">
        <div id="editor"></div>
      </div>
      <div id="page-preview" class="page-preview"></div>
    </section>
  </main>
`;

const docsListEl = document.querySelector("#docs-list");
const titleEl = document.querySelector("#doc-title");
const saveStateEl = document.querySelector("#save-state");
const wordCountEl = document.querySelector("#word-count");
const pageCountEl = document.querySelector("#page-count");
const docsCountEl = document.querySelector("#docs-count");
const commandBarEl = document.querySelector(".command-bar");
const menuStripEl = document.querySelector("#menu-strip");
const menuCollapseToggleEl = document.querySelector("#menu-collapse-toggle");
const newDocButton = document.querySelector("#new-doc");
const openFileButton = document.querySelector("#open-file");
const saveFileButton = document.querySelector("#save-file");
const exportPdfButton = document.querySelector("#export-pdf");
const exportDocxButton = document.querySelector("#export-docx");
const printDocButton = document.querySelector("#print-doc");
const toggleMinimalButton = document.querySelector("#toggle-minimal");
const togglePageViewButton = document.querySelector("#toggle-page-view");
const toggleFindButton = document.querySelector("#toggle-find");
const restoreBackupButton = document.querySelector("#restore-backup");
const undoDocButton = document.querySelector("#undo-doc");
const redoDocButton = document.querySelector("#redo-doc");
const toggleSuggestButton = document.querySelector("#toggle-suggest");
const toggleVersionsButton = document.querySelector("#toggle-versions");
const toggleCommentsButton = document.querySelector("#toggle-comments");
const addCommentButton = document.querySelector("#add-comment");
const toggleStyleManagerButton = document.querySelector("#toggle-style-manager");
const toggleTemplateManagerButton = document.querySelector("#toggle-template-manager");
const insertTableButton = document.querySelector("#insert-table");
const insertImageButton = document.querySelector("#insert-image");
const syncExportButton = document.querySelector("#sync-export");
const syncImportButton = document.querySelector("#sync-import");
const applyTemplateButton = document.querySelector("#apply-template");
const applyStyleButton = document.querySelector("#apply-style");
const filePickerEl = document.querySelector("#file-picker");
const imagePickerEl = document.querySelector("#image-picker");
const syncPickerEl = document.querySelector("#sync-picker");
const pageSizeEl = document.querySelector("#page-size");
const pageMarginEl = document.querySelector("#page-margin");
const lineSpacingEl = document.querySelector("#line-spacing");
const headerTextEl = document.querySelector("#header-text");
const footerTextEl = document.querySelector("#footer-text");
const pageNumbersEl = document.querySelector("#page-numbers");
const spellcheckToggleEl = document.querySelector("#spellcheck-toggle");
const templateSelectEl = document.querySelector("#template-select");
const styleSelectEl = document.querySelector("#style-select");
const fontFamilySelectEl = document.querySelector("#font-family-select");
const fontColorEl = document.querySelector("#font-color");
const baseFontSizeEl = document.querySelector("#base-font-size");
const typographyThemeSelectEl = document.querySelector("#typography-theme-select");
const applyTypographyThemeEl = document.querySelector("#apply-typography-theme");
const unlinkFormatEl = document.querySelector("#unlink-format");
const pagePreviewEl = document.querySelector("#page-preview");
const findPanelEl = document.querySelector("#find-panel");
const findInputEl = document.querySelector("#find-input");
const replaceInputEl = document.querySelector("#replace-input");
const findPrevEl = document.querySelector("#find-prev");
const findNextEl = document.querySelector("#find-next");
const replaceOneEl = document.querySelector("#replace-one");
const replaceAllEl = document.querySelector("#replace-all");
const findMetaEl = document.querySelector("#find-meta");
const findCloseEl = document.querySelector("#find-close");
const versionsPanelEl = document.querySelector("#versions-panel");
const versionsListEl = document.querySelector("#versions-list");
const versionsCloseEl = document.querySelector("#versions-close");
const suggestionsPanelEl = document.querySelector("#suggestions-panel");
const suggestionsListEl = document.querySelector("#suggestions-list");
const suggestionsCloseEl = document.querySelector("#suggestions-close");
const suggestionsAcceptAllEl = document.querySelector("#suggestions-accept-all");
const suggestionsRejectAllEl = document.querySelector("#suggestions-reject-all");
const diffModalEl = document.querySelector("#diff-modal");
const diffCloseEl = document.querySelector("#diff-close");
const diffMetaEl = document.querySelector("#diff-meta");
const diffCurrentEl = document.querySelector("#diff-current");
const diffSnapshotEl = document.querySelector("#diff-snapshot");
const diffRestoreEl = document.querySelector("#diff-restore");
const commentsPanelEl = document.querySelector("#comments-panel");
const commentsListEl = document.querySelector("#comments-list");
const commentsCloseEl = document.querySelector("#comments-close");
const styleManagerPanelEl = document.querySelector("#style-manager-panel");
const styleManagerCloseEl = document.querySelector("#style-manager-close");
const styleManagerListEl = document.querySelector("#style-manager-list");
const saveStyleEl = document.querySelector("#save-style");
const templateManagerPanelEl = document.querySelector("#template-manager-panel");
const templateManagerCloseEl = document.querySelector("#template-manager-close");
const templateManagerListEl = document.querySelector("#template-manager-list");
const saveTemplateEl = document.querySelector("#save-template");

const FONT_SIZE_OPTIONS = ["10pt", "11pt", "12pt", "14pt", "16pt", "18pt", "24pt", "32pt"];

const SizeStyle = Quill.import("attributors/style/size");
SizeStyle.whitelist = FONT_SIZE_OPTIONS;
Quill.register(SizeStyle, true);

const quill = new Quill("#editor", {
  theme: "snow",
  modules: {
    toolbar: "#toolbar",
  },
});

const defaultDoc = () => {
  const now = Date.now();
  return {
    id: `doc-${now}`,
    title: "Untitled document",
    content: "",
    createdAt: now,
    updatedAt: now,
  };
};

const loadDocs = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [defaultDoc()];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : [defaultDoc()];
  } catch {
    return [defaultDoc()];
  }
};

const loadLayout = () => {
  const fallback = {
    pageSize: "letter",
    margin: "1.00",
    lineSpacing: "1.25",
    fontFamily: "source_sans",
    fontColor: "#1f2a30",
    typographyTheme: "classic",
    baseFontSize: "12",
    headerText: "",
    footerText: "",
    showPageNumbers: true,
  };

  try {
    const parsed = JSON.parse(localStorage.getItem(LAYOUT_KEY) || "");
    if (!parsed) return fallback;
    const parsedMargin = normalizeMargin(parsed.margin);
    const parsedLine = normalizeLineSpacing(parsed.lineSpacing);
    return {
      pageSize: PAGE_PRESETS[parsed.pageSize] ? parsed.pageSize : fallback.pageSize,
      margin: parsedMargin || fallback.margin,
      lineSpacing: parsedLine || fallback.lineSpacing,
      fontFamily: FONT_FAMILIES[parsed.fontFamily] ? parsed.fontFamily : fallback.fontFamily,
      fontColor: normalizeHexColor(parsed.fontColor, fallback.fontColor),
      typographyTheme: TYPO_THEMES[parsed.typographyTheme] ? parsed.typographyTheme : fallback.typographyTheme,
      baseFontSize:
        Number.isFinite(Number(parsed.baseFontSize)) && Number(parsed.baseFontSize) >= 9 && Number(parsed.baseFontSize) <= 24
          ? String(Number(parsed.baseFontSize))
          : fallback.baseFontSize,
      headerText: typeof parsed.headerText === "string" ? parsed.headerText : fallback.headerText,
      footerText: typeof parsed.footerText === "string" ? parsed.footerText : fallback.footerText,
      showPageNumbers:
        typeof parsed.showPageNumbers === "boolean" ? parsed.showPageNumbers : fallback.showPageNumbers,
    };
  } catch {
    return fallback;
  }
};

const loadBackups = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(BACKUPS_KEY) || "");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const loadEditorPrefs = () => {
  const fallback = { spellcheck: true, suggestMode: false };
  try {
    const parsed = JSON.parse(localStorage.getItem(EDITOR_PREFS_KEY) || "");
    if (!parsed) return fallback;
    return {
      spellcheck: typeof parsed.spellcheck === "boolean" ? parsed.spellcheck : fallback.spellcheck,
      suggestMode: typeof parsed.suggestMode === "boolean" ? parsed.suggestMode : fallback.suggestMode,
    };
  } catch {
    return fallback;
  }
};

const loadHistory = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const loadSuggestions = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SUGGESTIONS_KEY) || "");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const loadComments = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(COMMENTS_KEY) || "");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const loadCustomStyles = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_STYLES_KEY) || "");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const loadCustomTemplates = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_TEMPLATES_KEY) || "");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

let docs = loadDocs();
let activeId = localStorage.getItem(ACTIVE_ID_KEY) || docs[0].id;
let layoutState = loadLayout();
let backups = loadBackups();
let editorPrefs = loadEditorPrefs();
let historyState = loadHistory();
let suggestions = loadSuggestions();
let comments = loadComments();
let customStyles = loadCustomStyles();
let customTemplates = loadCustomTemplates();
let minimalMode = localStorage.getItem(MINIMAL_MODE_KEY) === "1";
let previewMode = localStorage.getItem(PREVIEW_MODE_KEY) === "1";
let autosaveTimer;
let previewTimer;
let historyCommitTimer;
let findPanelOpen = false;
let versionsPanelOpen = false;
let suggestionsPanelOpen = false;
let commentsPanelOpen = false;
let styleManagerOpen = false;
let templateManagerOpen = false;
let activeMenu = "all";
let commandBarCollapsed = false;
let activeDiffSnapshotId = null;
let findMatches = [];
let findCursor = -1;
let lastSnapshotAt = 0;
let lastSnapshotHash = "";
let pdfModulePromise;
let mammothModulePromise;
let docxModulePromise;
let applyingHistory = false;
let applyingSuggestionAction = false;

const persistDocs = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  localStorage.setItem(ACTIVE_ID_KEY, activeId);
};

const persistLayout = () => {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(layoutState));
};

const persistBackups = () => {
  localStorage.setItem(BACKUPS_KEY, JSON.stringify(backups));
};

const persistEditorPrefs = () => {
  localStorage.setItem(EDITOR_PREFS_KEY, JSON.stringify(editorPrefs));
};

const persistHistory = () => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(historyState));
};

const persistSuggestions = () => {
  localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(suggestions));
};

const persistComments = () => {
  localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
};

const persistCustomStyles = () => {
  localStorage.setItem(CUSTOM_STYLES_KEY, JSON.stringify(customStyles));
};

const persistCustomTemplates = () => {
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(customTemplates));
};

const activeDoc = () => docs.find((d) => d.id === activeId) || docs[0];

const setStatus = (label) => {
  saveStateEl.textContent = label;
};

const setActionBusy = (button, busyLabel, fn) => async () => {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = busyLabel;
  try {
    await fn();
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
};

const ensurePdfModule = async () => {
  if (!pdfModulePromise) {
    pdfModulePromise = import("jspdf");
  }
  return pdfModulePromise;
};

const ensureMammothModule = async () => {
  if (!mammothModulePromise) {
    mammothModulePromise = import("mammoth/mammoth.browser");
  }
  return mammothModulePromise;
};

const ensureDocxModule = async () => {
  if (!docxModulePromise) {
    docxModulePromise = import("docx");
  }
  return docxModulePromise;
};

const resolvePdfFontFamily = () => {
  const key = layoutState.fontFamily;
  if (["courier", "consolas", "menlo", "monaco", "lucida_console"].includes(key)) return "courier";
  if (["times", "georgia", "cambria", "merriweather", "palatino", "garamond", "baskerville", "didot", "bookman"].includes(key)) return "times";
  return "helvetica";
};

const applyLayout = () => {
  const page = PAGE_PRESETS[layoutState.pageSize];
  document.documentElement.style.setProperty("--page-width", page.width);
  document.documentElement.style.setProperty("--page-min-height", page.minHeight);
  document.documentElement.style.setProperty("--page-margin", `${layoutState.margin}in`);
  document.documentElement.style.setProperty("--editor-line-height", layoutState.lineSpacing);
  document.documentElement.style.setProperty("--doc-font-family", FONT_FAMILIES[layoutState.fontFamily]?.css || FONT_FAMILIES.source_sans.css);
  document.documentElement.style.setProperty("--doc-base-font-size", `${layoutState.baseFontSize || "12"}pt`);
  document.documentElement.style.setProperty("--doc-font-color", normalizeHexColor(layoutState.fontColor));

  pageSizeEl.value = layoutState.pageSize;
  pageMarginEl.value = layoutState.margin;
  lineSpacingEl.value = layoutState.lineSpacing;
  fontFamilySelectEl.value = layoutState.fontFamily;
  fontColorEl.value = normalizeHexColor(layoutState.fontColor);
  baseFontSizeEl.value = layoutState.baseFontSize || "12";
  typographyThemeSelectEl.value = layoutState.typographyTheme;
  headerTextEl.value = layoutState.headerText;
  footerTextEl.value = layoutState.footerText;
  pageNumbersEl.checked = layoutState.showPageNumbers;
};

const applyMinimalMode = () => {
  document.body.classList.toggle("minimal-mode", minimalMode);
  toggleMinimalButton.textContent = minimalMode ? "Full" : "Minimal";
  toggleMinimalButton.setAttribute("aria-pressed", minimalMode ? "true" : "false");
  localStorage.setItem(MINIMAL_MODE_KEY, minimalMode ? "1" : "0");
};

const applyPreviewMode = () => {
  document.body.classList.toggle("preview-mode", previewMode);
  togglePageViewButton.textContent = previewMode ? "Edit View" : "Page View";
  togglePageViewButton.setAttribute("aria-pressed", previewMode ? "true" : "false");
  localStorage.setItem(PREVIEW_MODE_KEY, previewMode ? "1" : "0");
  quill.enable(!previewMode);
  if (previewMode) {
    renderPagePreview();
  }
};

const applySpellcheck = () => {
  quill.root.setAttribute("spellcheck", editorPrefs.spellcheck ? "true" : "false");
  spellcheckToggleEl.checked = editorPrefs.spellcheck;
  updateSuggestModeUI();
};

const setupCommandMenus = () => {
  if (!commandBarEl) return;

  const groups = {
    file: [openFileButton, saveFileButton, exportPdfButton, exportDocxButton, printDocButton],
    edit: [toggleMinimalButton, togglePageViewButton, toggleFindButton, restoreBackupButton, undoDocButton, redoDocButton],
    layout: [pageSizeEl?.closest("label"), pageMarginEl?.closest("label"), lineSpacingEl?.closest("label"), headerTextEl, footerTextEl, pageNumbersEl?.closest("label"), spellcheckToggleEl?.closest("label")],
    review: [toggleSuggestButton, toggleVersionsButton, toggleCommentsButton, addCommentButton],
    insert: [insertTableButton, insertImageButton],
    styles: [toggleStyleManagerButton, toggleTemplateManagerButton, templateSelectEl?.closest("label"), applyTemplateButton, styleSelectEl?.closest("label"), applyStyleButton, fontFamilySelectEl?.closest("label"), fontColorEl?.closest("label"), baseFontSizeEl?.closest("label"), typographyThemeSelectEl?.closest("label"), applyTypographyThemeEl],
    sync: [syncExportButton, syncImportButton],
  };

  const wrappers = {};
  Object.keys(groups).forEach((key) => {
    const wrap = document.createElement("div");
    wrap.className = "menu-group";
    wrap.dataset.menuGroup = key;
    wrappers[key] = wrap;
    commandBarEl.appendChild(wrap);
  });

  Object.entries(groups).forEach(([key, nodes]) => {
    nodes
      .filter((node) => node instanceof HTMLElement)
      .forEach((node) => {
        wrappers[key].appendChild(node);
      });
  });
};

const applyMenuVisibility = () => {
  commandBarEl.classList.toggle("is-collapsed", commandBarCollapsed);
  menuCollapseToggleEl.textContent = commandBarCollapsed ? "Expand" : "Collapse";
  menuCollapseToggleEl.setAttribute("aria-pressed", commandBarCollapsed ? "true" : "false");

  const toggles = Array.from(menuStripEl.querySelectorAll(".menu-toggle[data-menu]"));
  toggles.forEach((toggle) => {
    const isActive = toggle.dataset.menu === activeMenu;
    toggle.classList.toggle("is-active", isActive);
    toggle.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  const groups = Array.from(commandBarEl.querySelectorAll(".menu-group"));
  groups.forEach((group) => {
    const groupId = group.getAttribute("data-menu-group");
    group.hidden = activeMenu !== "all" && groupId !== activeMenu;
  });
};

const createSnapshot = (reason = "auto") => {
  const doc = activeDoc();
  const now = Date.now();
  const snapshotContent = JSON.stringify(quill.getContents());
  const snapshotHash = `${doc.id}:${snapshotContent}:${layoutState.pageSize}:${layoutState.margin}:${layoutState.lineSpacing}:${layoutState.headerText}:${layoutState.footerText}:${layoutState.showPageNumbers}`;

  if (snapshotHash === lastSnapshotHash) return;
  if (reason !== "manual" && now - lastSnapshotAt < SNAPSHOT_MIN_INTERVAL_MS) return;

  lastSnapshotHash = snapshotHash;
  lastSnapshotAt = now;

  backups.push({
    id: `snap-${now}`,
    docId: doc.id,
    title: titleEl.value.trim() || doc.title || "Untitled document",
    content: snapshotContent,
    layout: { ...layoutState },
    savedAt: now,
    reason,
  });

  if (backups.length > MAX_SNAPSHOTS) {
    backups = backups.slice(backups.length - MAX_SNAPSHOTS);
  }
  persistBackups();
  if (versionsPanelOpen) {
    renderVersionsPanel();
  }
};

const restoreLatestSnapshot = () => {
  const doc = activeDoc();
  const candidates = backups
    .filter((entry) => entry.docId === doc.id)
    .sort((a, b) => b.savedAt - a.savedAt);

  if (!candidates.length) {
    setStatus("No backup found");
    return;
  }

  const snap = candidates[0];
  try {
    doc.title = snap.title || doc.title;
    doc.content = snap.content;
    doc.updatedAt = Date.now();
    layoutState = { ...layoutState, ...snap.layout };
    persistLayout();
    applyLayout();
    persistDocs();
    loadActiveDoc();
    pushHistoryState("restore");
    renderVersionsPanel();
    setStatus("Backup restored");
  } catch {
    setStatus("Backup restore failed");
  }
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const refreshFindMatches = () => {
  const needle = findInputEl.value;
  const hay = quill.getText();
  findMatches = [];
  findCursor = -1;

  if (!needle) {
    findMetaEl.textContent = "0 matches";
    return;
  }

  const regex = new RegExp(escapeRegExp(needle), "gi");
  let match;
  while ((match = regex.exec(hay))) {
    findMatches.push({ index: match.index, length: match[0].length });
    if (match.index === regex.lastIndex) regex.lastIndex += 1;
  }
  findMetaEl.textContent = `${findMatches.length} ${findMatches.length === 1 ? "match" : "matches"}`;
};

const focusFindMatch = (direction = 1) => {
  if (!findMatches.length) {
    setStatus("No matches");
    return;
  }
  if (findCursor < 0) {
    findCursor = direction > 0 ? 0 : findMatches.length - 1;
  } else {
    findCursor = (findCursor + direction + findMatches.length) % findMatches.length;
  }

  const item = findMatches[findCursor];
  quill.setSelection(item.index, item.length, "user");
  quill.focus();
  findMetaEl.textContent = `${findCursor + 1}/${findMatches.length}`;
};

const replaceCurrentMatch = () => {
  if (!findMatches.length) {
    setStatus("No matches");
    return;
  }
  if (findCursor < 0) {
    focusFindMatch(1);
  }
  const item = findMatches[findCursor];
  const replacement = replaceInputEl.value;
  quill.deleteText(item.index, item.length, "user");
  quill.insertText(item.index, replacement, "user");
  refreshFindMatches();
  if (findMatches.length) {
    findCursor = Math.min(findCursor, findMatches.length - 1);
    const next = findMatches[findCursor];
    quill.setSelection(next.index, next.length, "user");
  }
  createSnapshot("manual");
  setStatus("Replaced");
};

const replaceAllMatches = () => {
  const needle = findInputEl.value;
  if (!needle) {
    setStatus("Enter find text");
    return;
  }

  const replacement = replaceInputEl.value;
  const current = quill.getText();
  const regex = new RegExp(escapeRegExp(needle), "gi");
  const nextText = current.replace(regex, replacement);
  if (nextText === current) {
    setStatus("No matches");
    return;
  }

  quill.setText(nextText, "user");
  refreshFindMatches();
  schedulePreviewRender();
  createSnapshot("manual");
  setStatus("Replaced all");
};

const toggleFindPanel = (open = !findPanelOpen) => {
  findPanelOpen = open;
  findPanelEl.hidden = !findPanelOpen;
  toggleFindButton.textContent = findPanelOpen ? "Hide Find" : "Find";
  toggleFindButton.setAttribute("aria-pressed", findPanelOpen ? "true" : "false");

  if (findPanelOpen) {
    findInputEl.focus();
    findInputEl.select();
    refreshFindMatches();
  }
};

const historyBucket = (docId) => {
  if (!historyState[docId]) {
    historyState[docId] = { stack: [], cursor: -1 };
  }
  return historyState[docId];
};

const pushHistoryState = (reason = "edit") => {
  const doc = activeDoc();
  const bucket = historyBucket(doc.id);
  const content = JSON.stringify(quill.getContents());
  const title = titleEl.value.trim() || doc.title || "Untitled document";

  if (bucket.cursor >= 0 && bucket.stack[bucket.cursor]?.content === content && bucket.stack[bucket.cursor]?.title === title) {
    return;
  }

  if (bucket.cursor < bucket.stack.length - 1) {
    bucket.stack = bucket.stack.slice(0, bucket.cursor + 1);
  }

  bucket.stack.push({
    content,
    title,
    layout: { ...layoutState },
    ts: Date.now(),
    reason,
  });

  if (bucket.stack.length > 120) {
    bucket.stack = bucket.stack.slice(bucket.stack.length - 120);
  }
  bucket.cursor = bucket.stack.length - 1;
  persistHistory();
};

const applyHistoryEntry = (entry) => {
  applyingHistory = true;
  try {
    const doc = activeDoc();
    doc.title = entry.title || doc.title;
    doc.content = entry.content || doc.content;
    doc.updatedAt = Date.now();
    titleEl.value = doc.title;
    quill.setContents(JSON.parse(doc.content));
    if (entry.layout) {
      layoutState = { ...layoutState, ...entry.layout };
      applyLayout();
      persistLayout();
    }
    persistDocs();
    renderDocs();
    schedulePreviewRender();
  } finally {
    applyingHistory = false;
  }
};

const stepHistory = (direction) => {
  const doc = activeDoc();
  const bucket = historyBucket(doc.id);
  if (!bucket.stack.length) {
    setStatus("No history");
    return;
  }
  const nextCursor = Math.max(0, Math.min(bucket.stack.length - 1, bucket.cursor + direction));
  if (nextCursor === bucket.cursor) {
    setStatus(direction < 0 ? "Oldest change reached" : "Latest change reached");
    return;
  }
  bucket.cursor = nextCursor;
  persistHistory();
  applyHistoryEntry(bucket.stack[bucket.cursor]);
  updateWordCount();
  setStatus(direction < 0 ? "Undo" : "Redo");
};

const updateSuggestModeUI = () => {
  toggleSuggestButton.textContent = editorPrefs.suggestMode ? "Suggest On" : "Suggest";
  toggleSuggestButton.setAttribute("aria-pressed", editorPrefs.suggestMode ? "true" : "false");
};

const pushSuggestion = (entry) => {
  const now = Date.now();
  const docId = activeDoc().id;
  const base = {
    id: `sg-${now}-${Math.random().toString(36).slice(2, 8)}`,
    docId,
    title: titleEl.value.trim() || activeDoc().title || "Untitled document",
    ts: now,
    status: "pending",
    ...entry,
  };

  const prev = suggestions[suggestions.length - 1];
  const canMerge =
    prev &&
    prev.status === "pending" &&
    prev.docId === docId &&
    prev.type === base.type &&
    now - prev.ts < 1500;

  if (canMerge && base.type === "insert") {
    const prevLen = prev.length || (prev.text ? prev.text.length : 0);
    if ((base.index || 0) === (prev.index || 0) + prevLen) {
      prev.text = `${prev.text || ""}${base.text || ""}`;
      prev.length = (prev.text || "").length;
      prev.preview = (prev.text || "").replace(/\s+/g, " ").trim().slice(0, 80) || "(whitespace)";
      prev.ts = now;
      persistSuggestions();
      return;
    }
  }

  if (canMerge && base.type === "delete") {
    if ((base.index || 0) === (prev.index || 0)) {
      prev.text = `${prev.text || ""}${base.text || ""}`;
      prev.length = (prev.length || 0) + (base.length || 0);
      prev.preview =
        (prev.text || "").replace(/\s+/g, " ").trim().slice(0, 80) ||
        `${prev.length} character${prev.length === 1 ? "" : "s"} deleted`;
      prev.ts = now;
      persistSuggestions();
      return;
    }
  }

  suggestions.push(base);
  if (suggestions.length > MAX_SUGGESTIONS) {
    suggestions = suggestions.slice(suggestions.length - MAX_SUGGESTIONS);
  }
  persistSuggestions();
};

const plainTextFromDelta = (delta) =>
  (delta?.ops || [])
    .map((op) => (typeof op.insert === "string" ? op.insert : " "))
    .join("");

const anchorContext = (index, length, sourceText = quill.getText()) => {
  const safeIndex = Math.max(0, index || 0);
  const safeLength = Math.max(0, length || 0);
  return {
    before: sourceText.slice(Math.max(0, safeIndex - 18), safeIndex),
    after: sourceText.slice(safeIndex + safeLength, safeIndex + safeLength + 18),
  };
};

const findBestIndexForText = (text, preferredIndex) => {
  if (!text) return preferredIndex;
  const docText = quill.getText();
  const safeIndex = Math.max(0, Math.min(preferredIndex, docText.length));
  if (docText.slice(safeIndex, safeIndex + text.length) === text) {
    return safeIndex;
  }

  const windowStart = Math.max(0, safeIndex - 80);
  const windowEnd = Math.min(docText.length, safeIndex + 240);
  const nearby = docText.slice(windowStart, windowEnd);
  const hit = nearby.indexOf(text);
  if (hit >= 0) {
    return windowStart + hit;
  }

  const global = docText.indexOf(text);
  return global >= 0 ? global : -1;
};

const resolveAnchoredIndex = (entry) => {
  const text = entry.text || "";
  const preferred = findBestIndexForText(text, entry.index || 0);
  if (preferred >= 0 && (entry.before || entry.after)) {
    const docText = quill.getText();
    const ctx = anchorContext(preferred, text.length, docText);
    if ((!entry.before || ctx.before.endsWith(entry.before)) && (!entry.after || ctx.after.startsWith(entry.after))) {
      return preferred;
    }
  }

  if (!text) return preferred;
  const docText = quill.getText();
  let idx = -1;
  let bestIndex = preferred;
  let best = -1;
  while (true) {
    idx = docText.indexOf(text, idx + 1);
    if (idx < 0) break;
    const ctx = anchorContext(idx, text.length, docText);
    let score = 0;
    if (entry.before && ctx.before.endsWith(entry.before)) score += 2;
    if (entry.after && ctx.after.startsWith(entry.after)) score += 2;
    score -= Math.abs((entry.index || 0) - idx) / 500;
    if (score > best) {
      best = score;
      bestIndex = idx;
    }
  }
  return typeof bestIndex === "number" ? bestIndex : preferred;
};

const resolveDeleteInsertionIndex = (entry) => {
  const docText = quill.getText();
  const before = entry.before || "";
  const after = entry.after || "";
  if (before || after) {
    const start = Math.max(0, (entry.index || 0) - 120);
    const end = Math.min(docText.length, (entry.index || 0) + 240);
    const windowText = docText.slice(start, end);
    for (let i = 0; i <= windowText.length; i++) {
      const left = windowText.slice(Math.max(0, i - before.length), i);
      const right = windowText.slice(i, i + after.length);
      if ((!before || left.endsWith(before)) && (!after || right.startsWith(after))) {
        return start + i;
      }
    }
  }
  return Math.max(0, Math.min(entry.index || 0, quill.getLength() - 1));
};

const applySuggestionDecision = (id, decision) => {
  const entry = suggestions.find((item) => item.id === id);
  if (!entry || entry.status !== "pending") return;

  applyingSuggestionAction = true;
  try {
    if (decision === "accept") {
      if (entry.type === "insert") {
        const idx = resolveAnchoredIndex(entry);
        if (idx >= 0 && (entry.text || "").length) {
          quill.formatText(idx, entry.text.length, { background: false }, "silent");
        }
      }
      entry.status = "accepted";
      entry.resolvedAt = Date.now();
      entry.decision = "accept";
      persistSuggestions();
      renderSuggestionsPanel();
      setStatus("Suggestion accepted");
      createSnapshot("manual");
      pushHistoryState("suggestion-accept");
      return;
    }

    if (entry.type === "insert") {
      const idx = resolveAnchoredIndex(entry);
      if (idx >= 0 && (entry.text || "").length) {
        quill.deleteText(idx, entry.text.length, "user");
      }
    } else if (entry.type === "delete") {
      const idx = resolveDeleteInsertionIndex(entry);
      if (entry.text) {
        quill.insertText(idx, entry.text, "user");
      }
    }

    entry.status = "rejected";
    entry.resolvedAt = Date.now();
    entry.decision = "reject";
    persistSuggestions();
    renderSuggestionsPanel();
    setStatus("Suggestion rejected");
    createSnapshot("manual");
    pushHistoryState("suggestion-reject");
  } finally {
    applyingSuggestionAction = false;
  }
};

const applyAllSuggestions = (decision) => {
  const pending = suggestions
    .filter((entry) => entry.docId === activeDoc().id && entry.status === "pending")
    .sort((a, b) => a.ts - b.ts);
  if (!pending.length) {
    setStatus("No pending suggestions");
    return;
  }

  for (const entry of pending) {
    applySuggestionDecision(entry.id, decision);
  }
  setStatus(decision === "accept" ? "All suggestions accepted" : "All suggestions rejected");
};

const formatTime = (ts) =>
  new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const renderVersionsPanel = () => {
  const doc = activeDoc();
  const list = backups
    .filter((entry) => entry.docId === doc.id)
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, 30);

  versionsListEl.innerHTML = "";
  if (!list.length) {
    versionsListEl.innerHTML = `<p class="panel-empty">No snapshots yet.</p>`;
    return;
  }

  for (const entry of list) {
    const item = document.createElement("article");
    item.className = "version-item";
    const previewText = (() => {
      try {
        const delta = JSON.parse(entry.content);
        const text = (delta?.ops || [])
          .map((op) => (typeof op.insert === "string" ? op.insert : " "))
          .join("")
          .replace(/\s+/g, " ")
          .trim();
        return text.slice(0, 140) || "(empty)";
      } catch {
        return "(preview unavailable)";
      }
    })();

    item.innerHTML = `
      <div class="version-head">
        <strong>${entry.title || "Untitled"}</strong>
        <span>${formatTime(entry.savedAt)}</span>
      </div>
      <p>${previewText}</p>
      <div class="version-actions">
        <button class="action action-find-sub" data-version-diff="${entry.id}">Diff</button>
        <button class="action action-find-sub" data-version-restore="${entry.id}">Restore</button>
      </div>
    `;
    versionsListEl.appendChild(item);
  }
};

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const extractDeltaText = (content) => {
  try {
    const delta = JSON.parse(content);
    return (delta?.ops || [])
      .map((op) => (typeof op.insert === "string" ? op.insert : " "))
      .join("")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return "";
  }
};

const buildDiffMarkup = (left, right) => {
  const a = left || "";
  const b = right || "";
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) {
    prefix += 1;
  }
  let suffix = 0;
  while (
    suffix < a.length - prefix &&
    suffix < b.length - prefix &&
    a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const aPrefix = a.slice(0, prefix);
  const aMid = a.slice(prefix, a.length - suffix);
  const aSuffix = a.slice(a.length - suffix);
  const bPrefix = b.slice(0, prefix);
  const bMid = b.slice(prefix, b.length - suffix);
  const bSuffix = b.slice(b.length - suffix);

  const wrap = (prefixPart, midPart, suffixPart, cls) =>
    `${escapeHtml(prefixPart)}<span class="${cls}">${escapeHtml(midPart || " ")}</span>${escapeHtml(suffixPart)}`;

  return {
    leftHtml: wrap(aPrefix, aMid, aSuffix, "diff-del"),
    rightHtml: wrap(bPrefix, bMid, bSuffix, "diff-add"),
    meta: {
      leftWords: a ? a.split(/\s+/).length : 0,
      rightWords: b ? b.split(/\s+/).length : 0,
      leftChars: a.length,
      rightChars: b.length,
    },
  };
};

const openDiffModal = (entry) => {
  const currentText = extractDeltaText(activeDoc().content || JSON.stringify(quill.getContents()));
  const snapshotText = extractDeltaText(entry.content || "");
  const diff = buildDiffMarkup(currentText, snapshotText);
  activeDiffSnapshotId = entry.id;

  diffCurrentEl.innerHTML = diff.leftHtml;
  diffSnapshotEl.innerHTML = diff.rightHtml;
  diffMetaEl.textContent = `Current: ${diff.meta.leftWords} words / ${diff.meta.leftChars} chars | Snapshot: ${diff.meta.rightWords} words / ${diff.meta.rightChars} chars`;
  diffModalEl.hidden = false;
};

const closeDiffModal = () => {
  activeDiffSnapshotId = null;
  diffModalEl.hidden = true;
};

const restoreSnapshotById = (id) => {
  const entry = backups.find((item) => item.id === id);
  if (!entry) return;
  const doc = activeDoc();
  doc.title = entry.title || doc.title;
  doc.content = entry.content;
  doc.updatedAt = Date.now();
  layoutState = { ...layoutState, ...(entry.layout || {}) };
  persistLayout();
  applyLayout();
  persistDocs();
  loadActiveDoc();
  pushHistoryState("version-restore");
  setStatus("Version restored");
};

const renderSuggestionsPanel = () => {
  const doc = activeDoc();
  const list = suggestions
    .filter((entry) => entry.docId === doc.id)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 60);

  suggestionsListEl.innerHTML = "";
  if (!list.length) {
    suggestionsListEl.innerHTML = `<p class="panel-empty">No suggestions logged.</p>`;
    return;
  }

  for (const entry of list) {
    const item = document.createElement("article");
    item.className = "version-item";
    const statusLabel = entry.status || "pending";
    const actionButtons =
      statusLabel === "pending"
        ? `<div class="version-actions">
            <button class="action action-find-sub" data-suggestion-accept="${entry.id}">Accept</button>
            <button class="action action-find-sub" data-suggestion-reject="${entry.id}">Reject</button>
          </div>`
        : `<div class="version-actions"><span class="suggestion-state ${statusLabel}">${statusLabel}</span></div>`;
    item.innerHTML = `
      <div class="version-head">
        <strong>${entry.type === "insert" ? "Inserted text" : "Deleted text"}</strong>
        <span>${formatTime(entry.ts)}</span>
      </div>
      <p>${entry.preview || "(no preview)"}</p>
      ${actionButtons}
    `;
    suggestionsListEl.appendChild(item);
  }
};

const toggleVersionsPanel = (open = !versionsPanelOpen) => {
  versionsPanelOpen = open;
  versionsPanelEl.hidden = !open;
  toggleVersionsButton.textContent = open ? "Hide Versions" : "Versions";
  toggleVersionsButton.setAttribute("aria-pressed", open ? "true" : "false");
  if (open) {
    renderVersionsPanel();
  }
};

const toggleSuggestionsPanel = (open = !suggestionsPanelOpen) => {
  suggestionsPanelOpen = open;
  suggestionsPanelEl.hidden = !open;
  if (open) {
    renderSuggestionsPanel();
  }
};

const createCommentAnchor = (index, length, quote) => {
  const sourceText = quill.getText();
  const ctx = anchorContext(index, length, sourceText);
  return {
    index,
    length,
    quote: quote || sourceText.slice(index, index + length),
    before: ctx.before,
    after: ctx.after,
  };
};

const resolveCommentAnchor = (comment) => {
  const anchor = comment.anchor || {};
  const quote = anchor.quote || "";
  if (!quote) return { index: anchor.index || 0, length: anchor.length || 0 };
  const idx = resolveAnchoredIndex({
    text: quote,
    index: anchor.index || 0,
    before: anchor.before || "",
    after: anchor.after || "",
  });
  if (idx >= 0) return { index: idx, length: quote.length };
  return { index: Math.max(0, Math.min(anchor.index || 0, quill.getLength() - 1)), length: anchor.length || quote.length };
};

const renderCommentsPanel = () => {
  const doc = activeDoc();
  const list = comments
    .filter((entry) => entry.docId === doc.id)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 80);

  commentsListEl.innerHTML = "";
  if (!list.length) {
    commentsListEl.innerHTML = `<p class="panel-empty">No comments yet.</p>`;
    return;
  }

  for (const entry of list) {
    const item = document.createElement("article");
    item.className = "version-item";
    const repliesHtml = (entry.replies || [])
      .map(
        (reply) =>
          `<div class="comment-reply"><span>${formatTime(reply.createdAt)}</span><p>${escapeHtml(reply.text || "")}</p></div>`,
      )
      .join("");
    item.innerHTML = `
      <div class="version-head">
        <strong>${entry.resolved ? "Resolved comment" : "Comment"}</strong>
        <span>${formatTime(entry.createdAt)}</span>
      </div>
      <p><em>"${escapeHtml(entry.anchor?.quote || "")}"</em></p>
      <p>${escapeHtml(entry.text || "")}</p>
      <div class="version-actions">
        <button class="action action-find-sub" data-comment-jump="${entry.id}">Jump</button>
        <button class="action action-find-sub" data-comment-reply="${entry.id}">Reply</button>
        <button class="action action-find-sub" data-comment-resolve="${entry.id}">
          ${entry.resolved ? "Reopen" : "Resolve"}
        </button>
      </div>
      ${repliesHtml ? `<div class="comment-replies">${repliesHtml}</div>` : ""}
    `;
    commentsListEl.appendChild(item);
  }
};

const toggleCommentsPanel = (open = !commentsPanelOpen) => {
  commentsPanelOpen = open;
  commentsPanelEl.hidden = !open;
  toggleCommentsButton.textContent = open ? "Hide Comments" : "Comments";
  toggleCommentsButton.setAttribute("aria-pressed", open ? "true" : "false");
  if (open) renderCommentsPanel();
};

const refreshStyleSelect = () => {
  const current = styleSelectEl.value;
  const baseOptions = [
    { value: "normal", label: "Normal" },
    { value: "h1", label: "Heading 1" },
    { value: "h2", label: "Heading 2" },
    { value: "quote", label: "Quote" },
    { value: "code", label: "Code" },
  ];
  styleSelectEl.innerHTML = "";
  for (const opt of baseOptions) {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    styleSelectEl.appendChild(option);
  }
  for (const custom of customStyles) {
    const option = document.createElement("option");
    option.value = `custom:${custom.id}`;
    option.textContent = `Custom: ${custom.name}`;
    styleSelectEl.appendChild(option);
  }
  if ([...styleSelectEl.options].some((o) => o.value === current)) styleSelectEl.value = current;
};

const refreshTemplateSelect = () => {
  const current = templateSelectEl.value;
  const base = ["blank", "letter", "report", "notes"];
  templateSelectEl.innerHTML = "";
  for (const key of base) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = TEMPLATE_PRESETS[key].title;
    templateSelectEl.appendChild(option);
  }
  for (const custom of customTemplates) {
    const option = document.createElement("option");
    option.value = `custom:${custom.id}`;
    option.textContent = `Custom: ${custom.name}`;
    templateSelectEl.appendChild(option);
  }
  if ([...templateSelectEl.options].some((o) => o.value === current)) templateSelectEl.value = current;
};

const renderStyleManager = () => {
  styleManagerListEl.innerHTML = "";
  if (!customStyles.length) {
    styleManagerListEl.innerHTML = `<p class="panel-empty">No custom styles.</p>`;
    return;
  }
  for (const style of customStyles) {
    const item = document.createElement("article");
    item.className = "version-item";
    item.innerHTML = `
      <div class="version-head">
        <strong>${escapeHtml(style.name)}</strong>
        <span>${formatTime(style.createdAt || Date.now())}</span>
      </div>
      <p>${escapeHtml(style.preview || "Custom style")}</p>
      <div class="version-actions">
        <button class="action action-find-sub" data-style-apply="${style.id}">Apply</button>
        <button class="action action-find-sub" data-style-delete="${style.id}">Delete</button>
      </div>
    `;
    styleManagerListEl.appendChild(item);
  }
};

const renderTemplateManager = () => {
  templateManagerListEl.innerHTML = "";
  if (!customTemplates.length) {
    templateManagerListEl.innerHTML = `<p class="panel-empty">No custom templates.</p>`;
    return;
  }
  for (const tpl of customTemplates) {
    const item = document.createElement("article");
    item.className = "version-item";
    item.innerHTML = `
      <div class="version-head">
        <strong>${escapeHtml(tpl.name)}</strong>
        <span>${formatTime(tpl.createdAt || Date.now())}</span>
      </div>
      <p>${escapeHtml(tpl.title || "Untitled template")}</p>
      <div class="version-actions">
        <button class="action action-find-sub" data-template-apply="${tpl.id}">Apply</button>
        <button class="action action-find-sub" data-template-delete="${tpl.id}">Delete</button>
      </div>
    `;
    templateManagerListEl.appendChild(item);
  }
};

const toggleStyleManager = (open = !styleManagerOpen) => {
  styleManagerOpen = open;
  styleManagerPanelEl.hidden = !open;
  toggleStyleManagerButton.textContent = open ? "Hide Styles" : "Styles";
  if (open) renderStyleManager();
};

const toggleTemplateManager = (open = !templateManagerOpen) => {
  templateManagerOpen = open;
  templateManagerPanelEl.hidden = !open;
  toggleTemplateManagerButton.textContent = open ? "Hide Templates" : "Templates";
  if (open) renderTemplateManager();
};

const addCommentFromSelection = () => {
  const range = quill.getSelection();
  if (!range || !range.length) {
    setStatus("Select text to comment");
    return;
  }
  const quote = quill.getText(range.index, range.length);
  const text = window.prompt("Comment text");
  if (!text || !text.trim()) {
    setStatus("Comment canceled");
    return;
  }
  comments.push({
    id: `cm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    docId: activeDoc().id,
    createdAt: Date.now(),
    resolved: false,
    text: text.trim(),
    anchor: createCommentAnchor(range.index, range.length, quote),
    replies: [],
  });
  persistComments();
  renderCommentsPanel();
  toggleCommentsPanel(true);
  setStatus("Comment added");
};

const insertTable = () => {
  if (previewMode) {
    setStatus("Switch to Edit View to insert table");
    return;
  }
  const rowsInput = window.prompt("Rows (1-10)", "3");
  if (rowsInput === null) {
    setStatus("Table insert canceled");
    return;
  }
  const colsInput = window.prompt("Columns (1-10)", "3");
  if (colsInput === null) {
    setStatus("Table insert canceled");
    return;
  }
  const rows = Math.max(1, Math.min(10, Number(rowsInput) || 3));
  const cols = Math.max(1, Math.min(10, Number(colsInput) || 3));
  const rowHtml = `<tr>${Array.from({ length: cols }, () => "<td> </td>").join("")}</tr>`;
  const tableHtml = `<table border="1" style="border-collapse:collapse;width:100%">${Array.from({ length: rows }, () => rowHtml).join("")}</table><p><br></p>`;
  const range = quill.getSelection(true);
  quill.clipboard.dangerouslyPasteHTML(range ? range.index : quill.getLength(), tableHtml, "user");
  setStatus("Table inserted");
};

const handleImageFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const insertImageByPrompt = async () => {
  if (previewMode) {
    setStatus("Switch to Edit View to insert image");
    return;
  }
  const mode = window.prompt("Paste image URL, or type 'upload' for local file");
  if (!mode) {
    setStatus("Image insert canceled");
    return;
  }
  const normalizedMode = mode.trim().toLowerCase();
  if (normalizedMode === "upload" || normalizedMode === "file") {
    imagePickerEl.click();
    return;
  }
  const url = mode.trim();
  const range = quill.getSelection(true);
  quill.insertEmbed(range ? range.index : quill.getLength(), "image", url, "user");
  quill.setSelection((range ? range.index : quill.getLength()) + 1, 0, "silent");
  setStatus("Image inserted");
};

const applyTemplate = () => {
  if (previewMode) {
    setStatus("Switch to Edit View to apply template");
    return;
  }
  const key = templateSelectEl.value;
  const tpl = key.startsWith("custom:")
    ? customTemplates.find((t) => t.id === key.replace("custom:", ""))
    : TEMPLATE_PRESETS[key];
  if (!tpl) return;
  titleEl.value = tpl.title || tpl.name || "Untitled document";
  quill.setContents(quill.clipboard.convert({ html: tpl.html }));
  if (tpl.layout) {
    layoutState = { ...layoutState, ...tpl.layout };
    applyLayout();
    persistLayout();
  }
  saveActiveDoc();
  pushHistoryState("template");
  schedulePreviewRender();
  setStatus(`Template applied: ${tpl.title || tpl.name}`);
};

const applyNamedStyle = () => {
  if (previewMode) {
    setStatus("Switch to Edit View to apply style");
    return;
  }
  const style = styleSelectEl.value;
  const range = quill.getSelection(true) || { index: Math.max(0, quill.getLength() - 1), length: 0 };
  if (style.startsWith("custom:")) {
    const custom = customStyles.find((s) => s.id === style.replace("custom:", ""));
    if (!custom) return;
    if (custom.block) {
      for (const [k, v] of Object.entries(custom.block)) {
        quill.formatLine(range.index, range.length || 1, k, v, "user");
      }
    }
    if (custom.inline) {
      for (const [k, v] of Object.entries(custom.inline)) {
        quill.formatText(range.index, Math.max(1, range.length), k, v, "user");
      }
    }
    setStatus("Custom style applied");
    return;
  }
  quill.formatLine(range.index, range.length || 1, "header", false, "user");
  quill.formatLine(range.index, range.length || 1, "blockquote", false, "user");
  quill.formatLine(range.index, range.length || 1, "code-block", false, "user");
  if (style === "h1") quill.formatLine(range.index, range.length || 1, "header", 1, "user");
  if (style === "h2") quill.formatLine(range.index, range.length || 1, "header", 2, "user");
  if (style === "quote") quill.formatLine(range.index, range.length || 1, "blockquote", true, "user");
  if (style === "code") quill.formatLine(range.index, range.length || 1, "code-block", true, "user");
  setStatus("Style applied");
};

const exportSyncPack = async () => {
  const payload = {
    exportedAt: new Date().toISOString(),
    docs,
    activeId,
    layoutState,
    backups,
    editorPrefs,
    historyState,
    suggestions,
    comments,
    customStyles,
    customTemplates,
  };
  const passphrase = window.prompt("Optional sync-pack passphrase (leave empty for plain export)");
  if (passphrase) {
    const encrypted = await encryptPayload(payload, passphrase);
    downloadBlob(
      `wordz-sync-${new Date().toISOString().slice(0, 10)}.wordzsync.enc`,
      new Blob([JSON.stringify(encrypted)], { type: "application/json" }),
    );
    setStatus("Encrypted sync pack exported");
    return;
  }
  downloadBlob(
    `wordz-sync-${new Date().toISOString().slice(0, 10)}.wordzsync`,
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
  );
  setStatus("Sync pack exported");
};

const mergeByIdLatest = (localList, importedList) => {
  const score = (item) => item.updatedAt || item.savedAt || item.ts || 0;
  const map = new Map();
  for (const item of localList) {
    map.set(item.id, item);
  }
  for (const item of importedList) {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
      continue;
    }
    if (score(item) > score(existing)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
};

const importSyncPack = async (raw) => {
  const parsedBlob = JSON.parse(raw);
  const parsed = parsedBlob?.encrypted
    ? await (async () => {
        const passphrase = window.prompt("Passphrase for encrypted sync pack");
        if (!passphrase) throw new Error("Missing passphrase");
        return decryptPayload(parsedBlob, passphrase);
      })()
    : parsedBlob;
  if (!parsed || !Array.isArray(parsed.docs)) {
    throw new Error("Invalid sync pack");
  }

  docs = mergeByIdLatest(docs, parsed.docs);
  backups = mergeByIdLatest(backups, Array.isArray(parsed.backups) ? parsed.backups : []);
  suggestions = mergeByIdLatest(suggestions, Array.isArray(parsed.suggestions) ? parsed.suggestions : []);
  comments = mergeByIdLatest(comments, Array.isArray(parsed.comments) ? parsed.comments : []);
  customStyles = mergeByIdLatest(customStyles, Array.isArray(parsed.customStyles) ? parsed.customStyles : []);
  customTemplates = mergeByIdLatest(customTemplates, Array.isArray(parsed.customTemplates) ? parsed.customTemplates : []);
  historyState = { ...historyState, ...(parsed.historyState || {}) };

  if (parsed.layoutState && PAGE_PRESETS[parsed.layoutState.pageSize]) {
    layoutState = { ...layoutState, ...parsed.layoutState };
  }
  if (parsed.editorPrefs) {
    editorPrefs = { ...editorPrefs, ...parsed.editorPrefs };
  }

  if (!docs.find((doc) => doc.id === activeId)) {
    activeId = docs[0]?.id;
  }

  persistDocs();
  persistBackups();
  persistSuggestions();
  persistComments();
  persistCustomStyles();
  persistCustomTemplates();
  persistHistory();
  persistLayout();
  persistEditorPrefs();
  applyLayout();
  applySpellcheck();
  renderDocs();
  loadActiveDoc();
  renderVersionsPanel();
  renderSuggestionsPanel();
  renderCommentsPanel();
  refreshStyleSelect();
  refreshTemplateSelect();
  renderStyleManager();
  renderTemplateManager();
  setStatus("Sync pack imported");
};

const updateWordCount = () => {
  const text = quill.getText().trim();
  const count = text ? text.split(/\s+/).length : 0;
  wordCountEl.textContent = `${count} ${count === 1 ? "word" : "words"}`;
};

const updatePageCount = (count) => {
  pageCountEl.textContent = `${count} ${count === 1 ? "page" : "pages"}`;
};

const formatUpdated = (time) =>
  new Date(time).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const removeDocumentById = (docId) => {
  const target = docs.find((doc) => doc.id === docId);
  if (!target) return;

  const label = target.title || "Untitled document";
  const confirmed = window.confirm(`Delete "${label}"? This removes its snapshots, suggestions, comments, and history.`);
  if (!confirmed) return;

  docs = docs.filter((doc) => doc.id !== docId);
  backups = backups.filter((item) => item.docId !== docId);
  suggestions = suggestions.filter((item) => item.docId !== docId);
  comments = comments.filter((item) => item.docId !== docId);
  delete historyState[docId];

  if (!docs.length) {
    const fresh = defaultDoc();
    docs = [fresh];
    activeId = fresh.id;
  } else if (activeId === docId) {
    const next = docs.slice().sort((a, b) => b.updatedAt - a.updatedAt)[0];
    activeId = next.id;
  }

  persistDocs();
  persistBackups();
  persistSuggestions();
  persistComments();
  persistHistory();

  renderDocs();
  loadActiveDoc();
  setStatus("Document deleted");
};

const renderDocs = () => {
  docsListEl.innerHTML = "";
  docsCountEl.textContent = `${docs.length} ${docs.length === 1 ? "document" : "documents"}`;

  docs
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .forEach((doc) => {
      const li = document.createElement("li");
      const row = document.createElement("div");
      const button = document.createElement("button");
      const deleteButton = document.createElement("button");
      const title = document.createElement("span");
      const time = document.createElement("span");

      row.className = "doc-row";
      button.className = `doc-item ${doc.id === activeId ? "active" : ""}`;
      title.className = "doc-title";
      title.textContent = doc.title || "Untitled document";
      time.className = "doc-time";
      time.textContent = formatUpdated(doc.updatedAt);
      button.appendChild(title);
      button.appendChild(time);

      button.onclick = () => {
        activeId = doc.id;
        loadActiveDoc();
        renderDocs();
      };

      deleteButton.type = "button";
      deleteButton.className = "doc-delete";
      deleteButton.textContent = "Remove";
      deleteButton.setAttribute("aria-label", `Remove ${doc.title || "Untitled document"}`);
      deleteButton.onclick = (event) => {
        event.stopPropagation();
        removeDocumentById(doc.id);
      };

      row.appendChild(button);
      row.appendChild(deleteButton);
      li.appendChild(row);
      docsListEl.appendChild(li);
    });
};

const loadActiveDoc = () => {
  const doc = activeDoc();
  titleEl.value = doc.title;
  quill.setContents(doc.content ? JSON.parse(doc.content) : []);
  lastSnapshotHash = `${doc.id}:${doc.content}:${layoutState.pageSize}:${layoutState.margin}:${layoutState.lineSpacing}:${layoutState.headerText}:${layoutState.footerText}:${layoutState.showPageNumbers}`;
  updateWordCount();
  schedulePreviewRender();
  refreshFindMatches();
  pushHistoryState("load");
  renderSuggestionsPanel();
  renderVersionsPanel();
  renderCommentsPanel();
  setStatus("Saved");
};

const saveActiveDoc = () => {
  const doc = activeDoc();
  doc.title = titleEl.value.trim() || "Untitled document";
  doc.content = JSON.stringify(quill.getContents());
  doc.updatedAt = Date.now();
  persistDocs();
  createSnapshot("manual");
  pushHistoryState("save");
  renderDocs();
  updateWordCount();
  renderVersionsPanel();
  setStatus("Saved");
};

const scheduleAutosave = () => {
  setStatus("Saving...");
  window.clearTimeout(autosaveTimer);
  autosaveTimer = window.setTimeout(saveActiveDoc, AUTOSAVE_MS);
  window.clearTimeout(historyCommitTimer);
  historyCommitTimer = window.setTimeout(() => {
    if (!applyingHistory) {
      pushHistoryState("edit");
    }
  }, AUTOSAVE_MS + 50);
};

const schedulePreviewRender = () => {
  window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(() => {
    const pages = paginateHtml(quill.root.innerHTML);
    updatePageCount(pages.length);
    if (previewMode) {
      renderPagePreview(pages);
    }
  }, 120);
};

const currentPayload = () => {
  const doc = activeDoc();
  return {
    title: titleEl.value.trim() || doc.title || "Untitled document",
    delta: quill.getContents(),
    plainText: quill.getText(),
    html: quill.root.innerHTML,
    updatedAt: new Date().toISOString(),
    layout: layoutState,
  };
};

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "document";

const downloadBlob = (filename, blob) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const toBase64 = (bytes) => {
  const arr = new Uint8Array(bytes);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < arr.length; i += chunk) {
    binary += String.fromCharCode(...arr.subarray(i, i + chunk));
  }
  return btoa(binary);
};
const fromBase64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));

const deriveAesKey = async (passphrase, saltBytes) => {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: 150000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

const encryptPayload = async (payload, passphrase) => {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passphrase, salt);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(payload)),
  );
  return {
    encrypted: true,
    algo: "AES-GCM",
    salt: toBase64(salt),
    iv: toBase64(iv),
    payload: toBase64(cipher),
  };
};

const decryptPayload = async (blobData, passphrase) => {
  const decoder = new TextDecoder();
  const key = await deriveAesKey(passphrase, fromBase64(blobData.salt));
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(blobData.iv) },
    key,
    fromBase64(blobData.payload),
  );
  return JSON.parse(decoder.decode(plain));
};

const sanitizeTitle = (fileName) => fileName.replace(/\.[^.]+$/, "").trim() || "Imported document";

const contentLimits = () => {
  const page = PAGE_PRESETS[layoutState.pageSize];
  const margin = marginCssToPx(layoutState.margin);
  const width = page.widthPx - margin * 2;
  const height = page.heightPx - margin * 2 - HEADER_SPACE_PX - FOOTER_SPACE_PX;
  return { width, height };
};

const measureHtmlHeight = (html, width) => {
  const probe = document.createElement("div");
  probe.className = "page-measure";
  probe.style.width = `${width}px`;
  probe.style.lineHeight = layoutState.lineSpacing;
  probe.innerHTML = html;
  document.body.appendChild(probe);
  const h = probe.scrollHeight;
  probe.remove();
  return h;
};

const splitOversizedBlock = (node, width, maxHeight) => {
  const text = (node.textContent || "").trim();
  if (!text) {
    return ["<p><br></p>"];
  }

  const tag = node.nodeType === Node.ELEMENT_NODE ? node.tagName.toLowerCase() : "p";
  const words = text.split(/\s+/);
  const chunks = [];
  let current = [];

  for (const word of words) {
    const candidate = [...current, word].join(" ");
    const html = `<${tag}>${candidate}</${tag}>`;
    if (measureHtmlHeight(html, width) <= maxHeight) {
      current.push(word);
      continue;
    }

    if (!current.length) {
      chunks.push(html);
      current = [];
    } else {
      chunks.push(`<${tag}>${current.join(" ")}</${tag}>`);
      current = [word];
    }
  }

  if (current.length) {
    chunks.push(`<${tag}>${current.join(" ")}</${tag}>`);
  }

  return chunks.length ? chunks : ["<p><br></p>"];
};

const paginateHtml = (rawHtml) => {
  const normalized = rawHtml?.trim() ? rawHtml : "<p><br></p>";
  const source = document.createElement("div");
  source.innerHTML = normalized;

  const blocks = Array.from(source.childNodes);
  if (!blocks.length) {
    return ["<p><br></p>"];
  }

  const { width, height } = contentLimits();
  const pages = [];
  let currentHtml = "";

  const canFit = (candidateHtml) => measureHtmlHeight(candidateHtml, width) <= height;

  const pushCurrent = () => {
    pages.push(currentHtml || "<p><br></p>");
    currentHtml = "";
  };

  for (const block of blocks) {
    const blockHtml =
      block.nodeType === Node.ELEMENT_NODE
        ? block.outerHTML
        : `<p>${block.textContent || ""}</p>`;

    const candidate = `${currentHtml}${blockHtml}`;
    if (canFit(candidate)) {
      currentHtml = candidate;
      continue;
    }

    if (currentHtml) {
      pushCurrent();
      if (canFit(blockHtml)) {
        currentHtml = blockHtml;
        continue;
      }
    }

    const pieces = splitOversizedBlock(block, width, height);
    for (const piece of pieces) {
      const pieceCandidate = `${currentHtml}${piece}`;
      if (!canFit(pieceCandidate) && currentHtml) {
        pushCurrent();
      }
      currentHtml = `${currentHtml}${piece}`;
      if (!canFit(currentHtml)) {
        pushCurrent();
      }
    }
  }

  if (currentHtml) {
    pushCurrent();
  }

  return pages.length ? pages : ["<p><br></p>"];
};

const renderPagePreview = (pages = paginateHtml(quill.root.innerHTML)) => {
  pagePreviewEl.innerHTML = "";
  updatePageCount(pages.length);

  pages.forEach((bodyHtml, index) => {
    const sheet = document.createElement("article");
    sheet.className = "page-sheet";

    const header = document.createElement("header");
    header.className = "page-head";
    header.textContent = layoutState.headerText || " ";

    const body = document.createElement("section");
    body.className = "page-body";
    body.style.lineHeight = layoutState.lineSpacing;
    body.innerHTML = bodyHtml;

    const footer = document.createElement("footer");
    footer.className = "page-foot";
    const footerText = document.createElement("span");
    footerText.textContent = layoutState.footerText || " ";
    footer.appendChild(footerText);

    if (layoutState.showPageNumbers) {
      const number = document.createElement("span");
      number.className = "page-number";
      number.textContent = `Page ${index + 1}`;
      footer.appendChild(number);
    }

    sheet.appendChild(header);
    sheet.appendChild(body);
    sheet.appendChild(footer);
    pagePreviewEl.appendChild(sheet);
  });
};

const applyPayloadAsDocument = (payload) => {
  const doc = defaultDoc();
  doc.title = payload.title?.trim() || "Imported document";

  if (payload.delta) {
    doc.content = JSON.stringify(payload.delta);
  } else if (typeof payload.html === "string") {
    doc.content = JSON.stringify(quill.clipboard.convert({ html: payload.html }));
  } else if (typeof payload.plainText === "string") {
    doc.content = JSON.stringify(quill.clipboard.convert({ text: payload.plainText }));
  } else {
    doc.content = JSON.stringify(quill.clipboard.convert({ text: "" }));
  }

  if (payload.layout && PAGE_PRESETS[payload.layout.pageSize]) {
    layoutState = {
      ...layoutState,
      pageSize: payload.layout.pageSize,
      margin: normalizeMargin(payload.layout.margin) || layoutState.margin,
      lineSpacing: normalizeLineSpacing(payload.layout.lineSpacing) || layoutState.lineSpacing,
      headerText: typeof payload.layout.headerText === "string" ? payload.layout.headerText : layoutState.headerText,
      footerText: typeof payload.layout.footerText === "string" ? payload.layout.footerText : layoutState.footerText,
      showPageNumbers:
        typeof payload.layout.showPageNumbers === "boolean"
          ? payload.layout.showPageNumbers
          : layoutState.showPageNumbers,
    };
    persistLayout();
    applyLayout();
  }

  docs.push(doc);
  activeId = doc.id;
  persistDocs();
  renderDocs();
  loadActiveDoc();
  pushHistoryState("import");
};

const saveToFile = async () => {
  saveActiveDoc();
  const payload = currentPayload();
  const filename = `${slugify(payload.title)}.wordz`;
  const body = JSON.stringify(payload, null, 2);

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: "Wordz document",
            accept: {
              "application/json": [".wordz", ".json"],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(body);
      await writable.close();
      setStatus("Saved to file");
      return;
    } catch {
      // User canceled; fallback below for broader browser support.
    }
  }

  downloadBlob(filename, new Blob([body], { type: "application/json" }));
  setStatus("Saved to file");
};

const importDocxFile = async (file) => {
  const mammoth = await ensureMammothModule();
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  applyPayloadAsDocument({
    title: sanitizeTitle(file.name),
    html: result.value,
  });
};

const importTextLikeFile = async (file) => {
  const text = await file.text();
  const lower = file.name.toLowerCase();

  if (lower.endsWith(".wordz") || lower.endsWith(".json")) {
    applyPayloadAsDocument(JSON.parse(text));
  } else if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    applyPayloadAsDocument({ title: sanitizeTitle(file.name), html: text });
  } else {
    applyPayloadAsDocument({ title: sanitizeTitle(file.name), plainText: text });
  }
};

const openFromFile = async () => {
  let file;

  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: "Documents",
            accept: {
              "application/json": [".wordz", ".json"],
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
              "text/plain": [".txt"],
              "text/html": [".html", ".htm"],
            },
          },
        ],
      });
      file = await handle.getFile();
    } catch {
      return;
    }
  } else {
    filePickerEl.click();
    return;
  }

  if (file.name.toLowerCase().endsWith(".docx")) {
    await importDocxFile(file);
  } else {
    await importTextLikeFile(file);
  }
  setStatus("Opened file");
};

filePickerEl.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    if (file.name.toLowerCase().endsWith(".docx")) {
      await importDocxFile(file);
    } else {
      await importTextLikeFile(file);
    }
    setStatus("Opened file");
  } catch {
    setStatus("Open failed");
  }

  event.target.value = "";
});

const exportPdf = async () => {
  const { jsPDF } = await ensurePdfModule();
  saveActiveDoc();

  const pages = paginateHtml(quill.root.innerHTML);
  const marginPts = marginCssToPt(layoutState.margin);
  const pdf = new jsPDF({ unit: "pt", format: layoutState.pageSize });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const [r, g, b] = hexToRgb(layoutState.fontColor);

  pages.forEach((bodyHtml, index) => {
    if (index > 0) pdf.addPage(layoutState.pageSize);

    const probe = document.createElement("div");
    probe.innerHTML = bodyHtml;
    const text = probe.textContent || " ";

    if (layoutState.headerText) {
      pdf.setFontSize(10);
      pdf.text(layoutState.headerText, marginPts, marginPts - 10);
    }

    if (layoutState.footerText) {
      pdf.setFontSize(10);
      pdf.text(layoutState.footerText, marginPts, pdf.internal.pageSize.getHeight() - marginPts + 18);
    }

    if (layoutState.showPageNumbers) {
      pdf.setFontSize(10);
      pdf.text(
        `Page ${index + 1}`,
        pageWidth - marginPts,
        pdf.internal.pageSize.getHeight() - marginPts + 18,
        { align: "right" },
      );
    }

    pdf.setFont(resolvePdfFontFamily(), "normal");
    pdf.setFontSize(parseFloat(layoutState.baseFontSize) || 12);
    pdf.setTextColor(r, g, b);
    const width = pageWidth - marginPts * 2;
    const lines = pdf.splitTextToSize(text, width);
    pdf.text(lines, marginPts, marginPts + 26, { baseline: "top" });
  });

  const doc = activeDoc();
  pdf.save(`${slugify(doc.title || "document")}.pdf`);
  setStatus("PDF exported");
};

const inlineRunsFromNode = async (node, docx, style = {}) => {
  const { TextRun, ImageRun } = docx;
  const runs = [];
  const runDefaults = resolveDocxRunDefaults();

  if (node.nodeType === Node.TEXT_NODE) {
    if (!node.textContent) return runs;
    runs.push(
      new TextRun({
        text: node.textContent,
        ...runDefaults,
        bold: !!style.bold,
        italics: !!style.italics,
        underline: style.underline ? {} : undefined,
        strike: !!style.strike,
      }),
    );
    return runs;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return runs;
  const tag = node.tagName.toLowerCase();

  if (tag === "br") {
    runs.push(new TextRun({ break: 1, text: "", ...runDefaults }));
    return runs;
  }

  if (tag === "img") {
    const src = node.getAttribute("src") || "";
    try {
      let bytes;
      if (src.startsWith("data:image/")) {
        const base64 = src.split(",")[1] || "";
        bytes = fromBase64(base64);
      } else if (/^https?:\/\//i.test(src)) {
        const response = await fetch(src);
        const buffer = await response.arrayBuffer();
        bytes = new Uint8Array(buffer);
      }
      if (bytes) {
        runs.push(
          new ImageRun({
            data: bytes,
            transformation: { width: 420, height: 260 },
          }),
        );
      }
    } catch {
      runs.push(new TextRun({ text: "[Image unavailable]", ...runDefaults }));
    }
    return runs;
  }

  const nextStyle = {
    ...style,
    bold: style.bold || tag === "strong" || tag === "b",
    italics: style.italics || tag === "em" || tag === "i",
    underline: style.underline || tag === "u",
    strike: style.strike || tag === "s" || tag === "strike",
  };

  for (const child of Array.from(node.childNodes)) {
    runs.push(...(await inlineRunsFromNode(child, docx, nextStyle)));
  }
  return runs;
};

const paragraphFromElement = async (element, docx, opts = {}) => {
  const { AlignmentType, HeadingLevel, Paragraph, TextRun } = docx;
  const tag = element.tagName.toLowerCase();
  const runs = await inlineRunsFromNode(element, docx);
  const safeRuns = runs.length ? runs : [new TextRun({ text: "", ...resolveDocxRunDefaults() })];

  const headingMap = {
    h1: HeadingLevel.HEADING_1,
    h2: HeadingLevel.HEADING_2,
    h3: HeadingLevel.HEADING_3,
  };

  const alignRaw = element.style?.textAlign || "";
  const alignMap = {
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
    justify: AlignmentType.JUSTIFIED,
  };

  const paragraphOptions = {
    children: safeRuns,
    heading: headingMap[tag],
    alignment: alignMap[alignRaw] || AlignmentType.LEFT,
      spacing: {
        line: Math.round((parseFloat(layoutState.lineSpacing) || 1.25) * 240),
      },
    ...opts,
  };

  if (tag === "blockquote") {
    paragraphOptions.indent = { left: 720 };
  }

  return new Paragraph(paragraphOptions);
};

const tableFromElement = async (tableEl, docx) => {
  const { Table, TableRow, TableCell, Paragraph, WidthType, TextRun } = docx;
  const runDefaults = resolveDocxRunDefaults();
  const rows = Array.from(tableEl.querySelectorAll("tr")).map((row) => {
    const cells = Array.from(row.querySelectorAll("th,td")).map((cell) => {
      const text = cell.textContent?.trim() || " ";
      return new TableCell({
        width: { size: 100 / Math.max(1, row.children.length), type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text, ...runDefaults })] })],
      });
    });
    return new TableRow({ children: cells });
  });
  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
};

const htmlToDocxChildren = async (html, docx) => {
  const { Paragraph, TextRun } = docx;
  const root = document.createElement("div");
  root.innerHTML = html || "<p><br></p>";
  const out = [];
  const runDefaults = resolveDocxRunDefaults();

  const nodes = Array.from(root.childNodes);
  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || "").trim();
      if (text) out.push(new Paragraph({ children: [new TextRun({ text, ...runDefaults })] }));
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const tag = node.tagName.toLowerCase();

    if (tag === "table") {
      out.push(await tableFromElement(node, docx));
      continue;
    }

    if (tag === "ul" || tag === "ol") {
      const items = Array.from(node.querySelectorAll(":scope > li"));
      for (const li of items) {
        const paragraph = await paragraphFromElement(li, docx, {
          ...(tag === "ul"
            ? { bullet: { level: 0 } }
            : {
                numbering: { reference: "wordz-numbering", level: 0 },
              }),
        });
        out.push(paragraph);
      }
      continue;
    }

    out.push(await paragraphFromElement(node, docx));
  }

  return out.length ? out : [new Paragraph({ children: [new TextRun({ text: "", ...runDefaults })] })];
};

const exportDocx = async () => {
  const docx = await ensureDocxModule();
  const { AlignmentType, Document, Footer, Header, HeadingLevel, Packer, PageNumber, Paragraph, TextRun } = docx;
  saveActiveDoc();
  const docState = activeDoc();
  const contentChildren = await htmlToDocxChildren(quill.root.innerHTML, docx);
  const runDefaults = resolveDocxRunDefaults();

  const wordDoc = new Document({
    numbering: {
      config: [
        {
          reference: "wordz-numbering",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 720, hanging: 260 } },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        headers: {
          default: new Header({
            children: [new Paragraph({ children: [new TextRun({ text: layoutState.headerText || "", ...runDefaults })] })],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: layoutState.footerText || "", ...runDefaults }),
                  ...(layoutState.showPageNumbers
                    ? [new TextRun({ text: "   ", ...runDefaults }), new TextRun({ children: [PageNumber.CURRENT], ...runDefaults })]
                    : []),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: docState.title, ...runDefaults })],
            heading: HeadingLevel.TITLE,
          }),
          ...contentChildren,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(wordDoc);
  downloadBlob(`${slugify(docState.title || "document")}.docx`, blob);
  setStatus("DOCX exported");
};

const printDocument = () => {
  saveActiveDoc();
  const pages = paginateHtml(quill.root.innerHTML);
  const doc = activeDoc();

  const printWindow = window.open("", "_blank", "width=980,height=740");
  if (!printWindow) {
    setStatus("Pop-up blocked");
    return;
  }

  const printFont = FONT_FAMILIES[layoutState.fontFamily]?.css || FONT_FAMILIES.source_sans.css;
  const sheets = pages
    .map((bodyHtml, index) => {
      const pageNo = layoutState.showPageNumbers ? `<span class="page-number">Page ${index + 1}</span>` : "";
      return `
        <article class="print-page">
          <header>${layoutState.headerText || "&nbsp;"}</header>
          <section class="body">${bodyHtml}</section>
          <footer><span>${layoutState.footerText || "&nbsp;"}</span>${pageNo}</footer>
        </article>
      `;
    })
    .join("");

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${doc.title}</title>
        <style>
          :root { --line: ${layoutState.lineSpacing}; --font-size: ${layoutState.baseFontSize || "12"}pt; --font-color: ${normalizeHexColor(layoutState.fontColor)}; }
          body { margin: 0; background: #f0f0f0; font-family: ${printFont}; font-size: var(--font-size); color: var(--font-color); }
          .print-page { width: ${PAGE_PRESETS[layoutState.pageSize].width}; min-height: ${PAGE_PRESETS[layoutState.pageSize].minHeight}; margin: 10mm auto; box-sizing: border-box; background: #fff; padding: ${layoutState.margin}in; display: grid; grid-template-rows: 36px 1fr 36px; }
          .print-page .body { line-height: var(--line); font-size: var(--font-size); color: var(--font-color); }
          .print-page footer { display: flex; justify-content: space-between; }
          .print-page { page-break-after: always; }
          .print-page:last-child { page-break-after: auto; }
          @media print { body { background: #fff; } .print-page { margin: 0; box-shadow: none; } }
        </style>
      </head>
      <body>${sheets}</body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
  setStatus("Printed");
};

titleEl.addEventListener("input", () => {
  scheduleAutosave();
  schedulePreviewRender();
});

quill.on("text-change", (delta, oldDelta, source) => {
  if (source === "user" && editorPrefs.suggestMode && !applyingHistory && !applyingSuggestionAction) {
    const oldText = plainTextFromDelta(oldDelta);
    let cursor = 0;
    for (const op of delta.ops || []) {
      if (op.retain) {
        cursor += op.retain;
      }
      if (op.delete) {
        const deletedText = oldText.slice(cursor, cursor + op.delete);
        const ctx = anchorContext(cursor, op.delete, oldText);
        pushSuggestion({
          type: "delete",
          index: cursor,
          length: op.delete,
          text: deletedText,
          before: ctx.before,
          after: ctx.after,
          preview:
            deletedText.replace(/\s+/g, " ").trim().slice(0, 80) ||
            `${op.delete} character${op.delete === 1 ? "" : "s"} deleted`,
        });
      }
      if (op.insert) {
        const len = typeof op.insert === "string" ? op.insert.length : 1;
        if (typeof op.insert === "string") {
          const ctx = anchorContext(cursor, len, quill.getText());
          if (op.insert.length) {
            quill.formatText(cursor, len, { background: "#fff2a8" }, "silent");
          }
          pushSuggestion({
            type: "insert",
            index: cursor,
            length: len,
            text: op.insert,
            before: ctx.before,
            after: ctx.after,
            preview: op.insert.replace(/\s+/g, " ").trim().slice(0, 80) || "(whitespace)",
          });
        }
        cursor += len;
      }
    }
    renderSuggestionsPanel();
  }
  scheduleAutosave();
  schedulePreviewRender();
});

newDocButton.addEventListener("click", () => {
  const doc = defaultDoc();
  docs.push(doc);
  activeId = doc.id;
  persistDocs();
  renderDocs();
  loadActiveDoc();
});

pageSizeEl.addEventListener("change", () => {
  layoutState.pageSize = pageSizeEl.value;
  persistLayout();
  applyLayout();
  schedulePreviewRender();
  setStatus("Layout updated");
});

pageMarginEl.addEventListener("change", () => {
  const next = normalizeMargin(pageMarginEl.value);
  if (!next) {
    pageMarginEl.value = layoutState.margin;
    setStatus("Margin must be 0.25 to 3.00 in");
    return;
  }
  layoutState.margin = next;
  pageMarginEl.value = next;
  persistLayout();
  applyLayout();
  schedulePreviewRender();
  setStatus("Layout updated");
});

lineSpacingEl.addEventListener("change", () => {
  const next = normalizeLineSpacing(lineSpacingEl.value);
  if (!next) {
    lineSpacingEl.value = layoutState.lineSpacing;
    setStatus("Line spacing must be 1.00 to 3.00");
    return;
  }
  layoutState.lineSpacing = next;
  lineSpacingEl.value = next;
  persistLayout();
  applyLayout();
  schedulePreviewRender();
  setStatus("Layout updated");
});

fontFamilySelectEl.addEventListener("change", () => {
  const key = fontFamilySelectEl.value;
  if (!FONT_FAMILIES[key]) return;
  layoutState.fontFamily = key;
  persistLayout();
  applyLayout();
  setStatus("Font updated");
});

fontColorEl.addEventListener("input", () => {
  layoutState.fontColor = normalizeHexColor(fontColorEl.value);
  persistLayout();
  applyLayout();
  schedulePreviewRender();
  setStatus("Font color updated");
});

baseFontSizeEl.addEventListener("change", () => {
  const next = Number(baseFontSizeEl.value);
  if (!Number.isFinite(next) || next < 9 || next > 24) {
    baseFontSizeEl.value = layoutState.baseFontSize || "12";
    setStatus("Font size must be 9 to 24 pt");
    return;
  }
  layoutState.baseFontSize = String(next);
  persistLayout();
  applyLayout();
  schedulePreviewRender();
  setStatus("Font size updated");
});

applyTypographyThemeEl.addEventListener("click", () => {
  const key = typographyThemeSelectEl.value;
  const theme = TYPO_THEMES[key];
  if (!theme) return;
  layoutState.typographyTheme = key;
  layoutState.fontFamily = theme.fontFamily;
  layoutState.lineSpacing = theme.lineSpacing;
  layoutState.baseFontSize = theme.baseFontSize;
  persistLayout();
  applyLayout();
  schedulePreviewRender();
  setStatus(`Theme applied: ${theme.label}`);
});

unlinkFormatEl.addEventListener("click", () => {
  const range = quill.getSelection(true);
  if (!range) {
    setStatus("Place cursor inside a link");
    return;
  }
  quill.format("link", false, "user");
  setStatus("Link removed");
});

headerTextEl.addEventListener("input", () => {
  layoutState.headerText = headerTextEl.value;
  persistLayout();
  if (previewMode) renderPagePreview();
});

footerTextEl.addEventListener("input", () => {
  layoutState.footerText = footerTextEl.value;
  persistLayout();
  if (previewMode) renderPagePreview();
});

pageNumbersEl.addEventListener("change", () => {
  layoutState.showPageNumbers = pageNumbersEl.checked;
  persistLayout();
  if (previewMode) renderPagePreview();
});

spellcheckToggleEl.addEventListener("change", () => {
  editorPrefs.spellcheck = spellcheckToggleEl.checked;
  applySpellcheck();
  persistEditorPrefs();
  setStatus(editorPrefs.spellcheck ? "Spellcheck on" : "Spellcheck off");
});

toggleFindButton.addEventListener("click", () => {
  toggleFindPanel();
});

findCloseEl.addEventListener("click", () => {
  toggleFindPanel(false);
});

findInputEl.addEventListener("input", () => {
  refreshFindMatches();
  if (findMatches.length) focusFindMatch(1);
});

findPrevEl.addEventListener("click", () => {
  refreshFindMatches();
  focusFindMatch(-1);
});

findNextEl.addEventListener("click", () => {
  refreshFindMatches();
  focusFindMatch(1);
});

replaceOneEl.addEventListener("click", () => {
  refreshFindMatches();
  replaceCurrentMatch();
});

replaceAllEl.addEventListener("click", () => {
  replaceAllMatches();
});

restoreBackupButton.addEventListener("click", () => {
  restoreLatestSnapshot();
});

undoDocButton.addEventListener("click", () => {
  stepHistory(-1);
});

redoDocButton.addEventListener("click", () => {
  stepHistory(1);
});

toggleSuggestButton.addEventListener("click", () => {
  editorPrefs.suggestMode = !editorPrefs.suggestMode;
  persistEditorPrefs();
  updateSuggestModeUI();
  toggleSuggestionsPanel(true);
  setStatus(editorPrefs.suggestMode ? "Suggestions mode on" : "Suggestions mode off");
});

toggleVersionsButton.addEventListener("click", () => {
  toggleVersionsPanel();
});

toggleStyleManagerButton.addEventListener("click", () => {
  toggleStyleManager();
});

toggleTemplateManagerButton.addEventListener("click", () => {
  toggleTemplateManager();
});

toggleCommentsButton.addEventListener("click", () => {
  toggleCommentsPanel();
});

addCommentButton.addEventListener("click", () => {
  addCommentFromSelection();
});

versionsCloseEl.addEventListener("click", () => {
  toggleVersionsPanel(false);
});

suggestionsCloseEl.addEventListener("click", () => {
  toggleSuggestionsPanel(false);
});

suggestionsAcceptAllEl.addEventListener("click", () => {
  applyAllSuggestions("accept");
});

suggestionsRejectAllEl.addEventListener("click", () => {
  applyAllSuggestions("reject");
});

suggestionsListEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const acceptId = target.getAttribute("data-suggestion-accept");
  if (acceptId) {
    applySuggestionDecision(acceptId, "accept");
    return;
  }
  const rejectId = target.getAttribute("data-suggestion-reject");
  if (rejectId) {
    applySuggestionDecision(rejectId, "reject");
  }
});

commentsCloseEl.addEventListener("click", () => {
  toggleCommentsPanel(false);
});

styleManagerCloseEl.addEventListener("click", () => {
  toggleStyleManager(false);
});

templateManagerCloseEl.addEventListener("click", () => {
  toggleTemplateManager(false);
});

saveStyleEl.addEventListener("click", () => {
  const range = quill.getSelection(true);
  if (!range) {
    setStatus("Place cursor to save style");
    return;
  }
  const name = window.prompt("Style name");
  if (!name || !name.trim()) return;
  const formats = quill.getFormat(range.index, Math.max(1, range.length));
  customStyles.push({
    id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    createdAt: Date.now(),
    preview: JSON.stringify(formats).slice(0, 120),
    block: {
      header: formats.header || false,
      blockquote: formats.blockquote || false,
      "code-block": formats["code-block"] || false,
      align: formats.align || false,
    },
    inline: {
      bold: !!formats.bold,
      italic: !!formats.italic,
      underline: !!formats.underline,
      strike: !!formats.strike,
      color: formats.color || false,
      background: formats.background || false,
      size: formats.size || false,
    },
  });
  persistCustomStyles();
  refreshStyleSelect();
  renderStyleManager();
  setStatus("Custom style saved");
});

styleManagerListEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const applyId = target.getAttribute("data-style-apply");
  if (applyId) {
    styleSelectEl.value = `custom:${applyId}`;
    applyNamedStyle();
    return;
  }
  const deleteId = target.getAttribute("data-style-delete");
  if (deleteId) {
    customStyles = customStyles.filter((s) => s.id !== deleteId);
    persistCustomStyles();
    refreshStyleSelect();
    renderStyleManager();
    setStatus("Custom style deleted");
  }
});

saveTemplateEl.addEventListener("click", () => {
  const name = window.prompt("Template name");
  if (!name || !name.trim()) return;
  customTemplates.push({
    id: `tp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    title: titleEl.value.trim() || "Untitled template",
    html: quill.root.innerHTML,
    layout: { ...layoutState },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  persistCustomTemplates();
  refreshTemplateSelect();
  renderTemplateManager();
  setStatus("Template saved");
});

templateManagerListEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const applyId = target.getAttribute("data-template-apply");
  if (applyId) {
    templateSelectEl.value = `custom:${applyId}`;
    applyTemplate();
    return;
  }
  const deleteId = target.getAttribute("data-template-delete");
  if (deleteId) {
    customTemplates = customTemplates.filter((t) => t.id !== deleteId);
    persistCustomTemplates();
    refreshTemplateSelect();
    renderTemplateManager();
    setStatus("Template deleted");
  }
});

commentsListEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const jumpId = target.getAttribute("data-comment-jump");
  if (jumpId) {
    const entry = comments.find((item) => item.id === jumpId);
    if (!entry) return;
    const resolved = resolveCommentAnchor(entry);
    quill.setSelection(resolved.index, resolved.length || 0, "user");
    quill.focus();
    setStatus("Jumped to comment");
    return;
  }

  const replyId = target.getAttribute("data-comment-reply");
  if (replyId) {
    const entry = comments.find((item) => item.id === replyId);
    if (!entry) return;
    const text = window.prompt("Reply");
    if (!text || !text.trim()) return;
    entry.replies = entry.replies || [];
    entry.replies.push({
      id: `rp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: text.trim(),
      createdAt: Date.now(),
    });
    persistComments();
    renderCommentsPanel();
    setStatus("Reply added");
    return;
  }

  const resolveId = target.getAttribute("data-comment-resolve");
  if (resolveId) {
    const entry = comments.find((item) => item.id === resolveId);
    if (!entry) return;
    entry.resolved = !entry.resolved;
    persistComments();
    renderCommentsPanel();
    setStatus(entry.resolved ? "Comment resolved" : "Comment reopened");
  }
});

versionsListEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const diffId = target.getAttribute("data-version-diff");
  if (diffId) {
    const entry = backups.find((item) => item.id === diffId);
    if (entry) openDiffModal(entry);
    return;
  }
  const id = target.getAttribute("data-version-restore");
  if (!id) return;
  restoreSnapshotById(id);
});

diffCloseEl.addEventListener("click", () => {
  closeDiffModal();
});

diffRestoreEl.addEventListener("click", () => {
  if (!activeDiffSnapshotId) return;
  restoreSnapshotById(activeDiffSnapshotId);
  closeDiffModal();
});

diffModalEl.addEventListener("click", (event) => {
  if (event.target === diffModalEl) {
    closeDiffModal();
  }
});

insertTableButton.addEventListener("click", () => {
  insertTable();
});

insertImageButton.addEventListener("click", () => {
  insertImageByPrompt().catch(() => setStatus("Image insert failed"));
});

imagePickerEl.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const dataUrl = await handleImageFile(file);
    const range = quill.getSelection(true);
    quill.insertEmbed(range ? range.index : quill.getLength(), "image", dataUrl, "user");
    setStatus("Image inserted");
  } catch {
    setStatus("Image insert failed");
  }
  event.target.value = "";
});

applyTemplateButton.addEventListener("click", () => {
  applyTemplate();
});

applyStyleButton.addEventListener("click", () => {
  applyNamedStyle();
});

syncExportButton.addEventListener("click", () => {
  exportSyncPack().catch(() => setStatus("Sync export failed"));
});

syncImportButton.addEventListener("click", () => {
  syncPickerEl.click();
});

syncPickerEl.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    await importSyncPack(text);
  } catch {
    setStatus("Sync import failed");
  }
  event.target.value = "";
});

openFileButton.addEventListener(
  "click",
  setActionBusy(openFileButton, "Opening...", async () => {
    try {
      await openFromFile();
    } catch {
      setStatus("Open failed");
    }
  }),
);

saveFileButton.addEventListener(
  "click",
  setActionBusy(saveFileButton, "Saving...", async () => {
    try {
      await saveToFile();
    } catch {
      setStatus("Save failed");
    }
  }),
);

exportPdfButton.addEventListener(
  "click",
  setActionBusy(exportPdfButton, "Rendering...", async () => {
    try {
      await exportPdf();
    } catch {
      setStatus("PDF export failed");
    }
  }),
);

exportDocxButton.addEventListener(
  "click",
  setActionBusy(exportDocxButton, "Building...", async () => {
    try {
      await exportDocx();
    } catch {
      setStatus("DOCX export failed");
    }
  }),
);

printDocButton.addEventListener("click", printDocument);

toggleMinimalButton.addEventListener("click", () => {
  minimalMode = !minimalMode;
  applyMinimalMode();
  setStatus(minimalMode ? "Minimal mode on" : "Minimal mode off");
});

togglePageViewButton.addEventListener("click", () => {
  previewMode = !previewMode;
  applyPreviewMode();
  setStatus(previewMode ? "Page view on" : "Edit view on");
});

window.addEventListener("keydown", (event) => {
  if (!diffModalEl.hidden && event.key === "Escape") {
    closeDiffModal();
    return;
  }

  const undoShortcut = (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z";
  if (undoShortcut) {
    event.preventDefault();
    stepHistory(-1);
    return;
  }

  const redoShortcut =
    ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "z") ||
    ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "y");
  if (redoShortcut) {
    event.preventDefault();
    stepHistory(1);
    return;
  }

  const findShortcut = (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "f";
  if (findShortcut) {
    event.preventDefault();
    toggleFindPanel(true);
    return;
  }

  if (findPanelOpen && event.key === "Escape") {
    toggleFindPanel(false);
    return;
  }

  if (findPanelOpen && event.key === "Enter" && document.activeElement === findInputEl) {
    event.preventDefault();
    refreshFindMatches();
    focusFindMatch(event.shiftKey ? -1 : 1);
    return;
  }

  const minimalShortcut = (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "m";
  if (minimalShortcut) {
    event.preventDefault();
    minimalMode = !minimalMode;
    applyMinimalMode();
    setStatus(minimalMode ? "Minimal mode on" : "Minimal mode off");
    return;
  }

  const previewShortcut = (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "p";
  if (previewShortcut) {
    event.preventDefault();
    previewMode = !previewMode;
    applyPreviewMode();
    setStatus(previewMode ? "Page view on" : "Edit view on");
    return;
  }

  const versionsShortcut = (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "v";
  if (versionsShortcut) {
    event.preventDefault();
    toggleVersionsPanel();
    return;
  }

  const suggestionsShortcut = (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "g";
  if (suggestionsShortcut) {
    event.preventDefault();
    toggleSuggestionsPanel();
    return;
  }

  const commentsShortcut = (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "c";
  if (commentsShortcut) {
    event.preventDefault();
    toggleCommentsPanel();
  }
});

openFileButton.addEventListener("pointerenter", () => {
  ensureMammothModule();
});
openFileButton.addEventListener("focus", () => {
  ensureMammothModule();
});
exportPdfButton.addEventListener("pointerenter", () => {
  ensurePdfModule();
});
exportPdfButton.addEventListener("focus", () => {
  ensurePdfModule();
});
exportDocxButton.addEventListener("pointerenter", () => {
  ensureDocxModule();
});
exportDocxButton.addEventListener("focus", () => {
  ensureDocxModule();
});

window.addEventListener("beforeunload", () => {
  try {
    createSnapshot("manual");
    persistHistory();
    persistSuggestions();
    persistComments();
    persistCustomStyles();
    persistCustomTemplates();
  } catch {
    // Ignore unload write failures.
  }
});

applyLayout();
applySpellcheck();
applyMinimalMode();
setupCommandMenus();
applyMenuVisibility();
refreshStyleSelect();
refreshTemplateSelect();
persistDocs();
renderDocs();
loadActiveDoc();
applyPreviewMode();
schedulePreviewRender();
toggleFindPanel(false);
toggleVersionsPanel(false);
toggleSuggestionsPanel(false);
toggleCommentsPanel(false);
toggleStyleManager(false);
toggleTemplateManager(false);
closeDiffModal();

menuStripEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const menu = target.getAttribute("data-menu");
  if (!menu) return;
  activeMenu = activeMenu === menu ? "all" : menu;
  applyMenuVisibility();
});

menuCollapseToggleEl.addEventListener("click", () => {
  commandBarCollapsed = !commandBarCollapsed;
  applyMenuVisibility();
});
