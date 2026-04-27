/**
 * ============================================================================
 * Browser API Compatibility Layer (shared/apiCompat.js)
 * ============================================================================
 *
 * Provides unified browser API access for both Chrome and Firefox.
 * Detects which API is available and exposes a consistent interface.
 *
 * Usage:
 *   const api = typeof BrowserAPI !== 'undefined' ? BrowserAPI : window.BrowserAPI;
 *   api.runtime.sendMessage({ type: 'LOG_KEYS', payload: data });
 *   api.storage.local.get('ts_log').then(result => { ... });
 *
 * ============================================================================
 */
(function (root, factory) {
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
    target.BrowserAPI = factory();
  }
})(
  typeof window !== "undefined"
    ? window
    : typeof self !== "undefined"
      ? self
      : this,
  function () {
    "use strict";
    // Detect which API is available (try chrome first, fall back to browser)
    var nativeAPI;
    if (typeof chrome !== "undefined" && chrome !== null && chrome.runtime) {
      nativeAPI = chrome;
    } else if (
      typeof browser !== "undefined" &&
      browser !== null &&
      browser.runtime
    ) {
      nativeAPI = browser;
    }
    if (!nativeAPI) {
      console.error("[BrowserAPI] Neither chrome nor browser API available!");
      return null;
    }
    // =========================================================================
    // Unified API object
    // =========================================================================
    var BrowserAPI = {
      // -----------------------------------------------------------------------
      // Runtime API (messaging)
      // -----------------------------------------------------------------------
      runtime: {
        sendMessage: function (message, callback) {
          // Returns a promise if callback not provided
          if (typeof callback === "function") {
            // Callback style (older)
            nativeAPI.runtime.sendMessage(message, callback);
          } else {
            // Promise style (Manifest V3)
            return new Promise(function (resolve, reject) {
              try {
                nativeAPI.runtime.sendMessage(message, function (response) {
                  if (nativeAPI.runtime.lastError) {
                    reject(new Error(nativeAPI.runtime.lastError.message));
                  } else {
                    resolve(response);
                  }
                });
              } catch (e) {
                reject(e);
              }
            });
          }
        },
        onMessage: {
          addListener: function (callback) {
            nativeAPI.runtime.onMessage.addListener(
              function (message, sender, sendResponse) {
                // Wrap sendResponse to support promises
                var responded = false;
                var wrappedSendResponse = function (response) {
                  if (!responded) {
                    responded = true;
                    sendResponse(response);
                  }
                };
                // Call user's callback
                var result = callback(message, sender, wrappedSendResponse);
                // If callback returns a promise, resolve it and send response
                if (result && typeof result.then === "function") {
                  result.then(wrappedSendResponse).catch(function (err) {
                    wrappedSendResponse({ error: err.message });
                  });
                  return true; // Keep channel open for async sendResponse
                }
              },
            );
          },
        },
      },
      // -----------------------------------------------------------------------
      // Storage API
      // -----------------------------------------------------------------------
      storage: {
        local: {
          get: function (keys) {
            // Returns a promise
            return new Promise(function (resolve, reject) {
              try {
                nativeAPI.storage.local.get(keys, function (result) {
                  if (nativeAPI.runtime.lastError) {
                    reject(new Error(nativeAPI.runtime.lastError.message));
                  } else {
                    resolve(result);
                  }
                });
              } catch (e) {
                reject(e);
              }
            });
          },
          set: function (items) {
            // Returns a promise
            return new Promise(function (resolve, reject) {
              try {
                nativeAPI.storage.local.set(items, function () {
                  if (nativeAPI.runtime.lastError) {
                    reject(new Error(nativeAPI.runtime.lastError.message));
                  } else {
                    resolve();
                  }
                });
              } catch (e) {
                reject(e);
              }
            });
          },
          remove: function (keys) {
            // Returns a promise
            return new Promise(function (resolve, reject) {
              try {
                nativeAPI.storage.local.remove(keys, function () {
                  if (nativeAPI.runtime.lastError) {
                    reject(new Error(nativeAPI.runtime.lastError.message));
                  } else {
                    resolve();
                  }
                });
              } catch (e) {
                reject(e);
              }
            });
          },
        },
      },
      // -----------------------------------------------------------------------
      // Tabs API
      // -----------------------------------------------------------------------
      tabs: {
        query: function (queryInfo) {
          // Returns a promise
          return new Promise(function (resolve, reject) {
            try {
              nativeAPI.tabs.query(queryInfo, function (tabs) {
                if (nativeAPI.runtime.lastError) {
                  reject(new Error(nativeAPI.runtime.lastError.message));
                } else {
                  resolve(tabs);
                }
              });
            } catch (e) {
              reject(e);
            }
          });
        },
      },
      // -----------------------------------------------------------------------
      // Meta information
      // -----------------------------------------------------------------------
      info: {
        isChrome: typeof chrome !== "undefined" && nativeAPI === chrome,
        isFirefox: typeof browser !== "undefined" && nativeAPI === browser,
        apiType:
          typeof browser !== "undefined" && nativeAPI === browser
            ? "browser"
            : typeof chrome !== "undefined" && nativeAPI === chrome
              ? "chrome"
              : "unknown",
      },
    };
    return BrowserAPI;
  },
);
