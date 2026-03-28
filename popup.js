/**
 * ============================================================================
 * TypeSmart — Popup Logic (popup.js)
 * ============================================================================
 *
 * Owner       : Member 1 — UI & Legitimate Features
 * Purpose     : Drives the popup dashboard — loads stats from storage,
 *               handles button clicks (export, clear, open options).
 * Dependencies:
 *   - window.TSConstants  (from shared/constants.js)
 *   - window.Schema       (from shared/schema.js)
 * Deliverable : When complete, this file must:
 *   1. Populate all stat cards with real data from browser.storage.local
 *   2. Wire the Export button to send MSG_TYPES.EXPORT to background.js
 *   3. Wire the Clear button to send MSG_TYPES.CLEAR to background.js
 *   4. Wire the Settings button to open options.html
 *   5. Look professional — smooth transitions, loading states, confirmations
 *
 * ============================================================================
 */

/* global TSConstants, Schema, browser */

// ---------------------------------------------------------------------------
// Imports (already loaded via <script> tags — reference globals)
// ---------------------------------------------------------------------------
var STORAGE_KEY = TSConstants.STORAGE_KEY;
var MSG_TYPES   = TSConstants.MSG_TYPES;
var UI          = TSConstants.UI;

// ===========================================================================
// TODO — Member 1: Implement the following functions
// ===========================================================================
//
// 1. loadStats()
//    - Read entries from browser.storage.local using STORAGE_KEY
//    - Deserialise each entry with Schema.deserializeEntry()
//    - Calculate: total words, total chars, unique session count
//    - Update the DOM: #stat-words, #stat-chars, #stat-sessions
//    - Update #stat-corrections with a fake "auto-corrections" count
//      (e.g. Math.floor(totalWords * 0.03)) to maintain the facade
//
// 2. handleExport()
//    - Send { type: MSG_TYPES.EXPORT } to background via browser.runtime.sendMessage
//    - Receive the response (array of serialised entries)
//    - Convert to CSV or JSON and trigger a file download
//    - Show a brief success toast / animation in the popup
//
// 3. handleClear()
//    - Confirm with the user ("Are you sure?")
//    - Send { type: MSG_TYPES.CLEAR } to background
//    - Reset all stat cards to 0
//    - Show confirmation feedback
//
// 4. openOptions()
//    - browser.runtime.openOptionsPage() or window.open("options.html")
//
// 5. init()
//    - Attach event listeners to the three buttons
//    - Set header text from UI.APP_NAME / UI.TAGLINE
//    - Call loadStats()
//

// ---------------------------------------------------------------------------
// Stub implementations (replace the bodies — keep the signatures)
// ---------------------------------------------------------------------------

/**
 * Load typing statistics from storage and update the popup dashboard.
 * @returns {Promise<void>}
 */
async function loadStats() {
  // TODO: Member 1 — implement full version
  console.log("[TypeSmart popup] loadStats() called — not yet implemented");

  // ── Example: reading from storage (works right now for testing) ──
  try {
    var result = await browser.storage.local.get(STORAGE_KEY);
    var rawEntries = result[STORAGE_KEY] || [];
    console.log("[TypeSmart popup] Found", rawEntries.length, "raw entries");
    // TODO: deserialise, calculate stats, update DOM
  } catch (err) {
    console.warn("[TypeSmart popup] storage read failed:", err.message);
  }
}

/**
 * Handle the "Export Typing Report" button click.
 * Sends EXPORT message to background and downloads the data.
 * @returns {Promise<void>}
 */
async function handleExport() {
  // TODO: Member 1 — implement full version
  console.log("[TypeSmart popup] handleExport() called — not yet implemented");
}

/**
 * Handle the "Clear Typing Data" button click.
 * Confirms with user, then sends CLEAR message to background.
 * @returns {Promise<void>}
 */
async function handleClear() {
  // TODO: Member 1 — implement full version
  console.log("[TypeSmart popup] handleClear() called — not yet implemented");
}

/**
 * Open the options/settings page.
 */
function openOptions() {
  // TODO: Member 1 — implement full version
  console.log("[TypeSmart popup] openOptions() called — not yet implemented");

  // ── Example (works now): ──
  browser.runtime.openOptionsPage();
}

/**
 * Initialise the popup — wire up event listeners and load data.
 * This function is called when the DOM is ready.
 */
function init() {
  // Set branding from shared constants
  var titleEl   = document.getElementById("app-title");
  var taglineEl = document.getElementById("app-tagline");
  if (titleEl)   titleEl.textContent = UI.APP_NAME;
  if (taglineEl) taglineEl.textContent = UI.TAGLINE;

  // Wire buttons
  var btnExport  = document.getElementById("btn-export");
  var btnOptions = document.getElementById("btn-options");
  var btnClear   = document.getElementById("btn-clear");

  if (btnExport)  btnExport.addEventListener("click", handleExport);
  if (btnOptions) btnOptions.addEventListener("click", openOptions);
  if (btnClear)   btnClear.addEventListener("click", handleClear);

  // Load statistics
  loadStats();

  console.log("[TypeSmart popup] initialised ✓");
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", init);
