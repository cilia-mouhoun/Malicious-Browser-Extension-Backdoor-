
(() => {
  "use strict";
  const STORAGE_KEY = "ts_log";
  const UPDATE_INTERVAL_MS = 1000; // Update every second
  // =========================================================================
  // Helper functions
  // =========================================================================
  function clampNumber(value, min, max, fallback) {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }
  function formatInt(value) {
    const n = Math.round(clampNumber(value, 0, 1e15, 0));
    return n.toLocaleString(undefined);
  }
  function formatPercent(ratio) {
    const pct = clampNumber(ratio, 0, 1, 0) * 100;
    return `${pct.toFixed(1)}%`;
  }
  function safeText(value) {
    return typeof value === "string" ? value : "";
  }
  function extractDomain(url) {
    try {
      const u = new URL(url);
      return u.hostname || "unknown";
    } catch {
      return "unknown";
    }
  }
  // =========================================================================
  // Real data calculation from stored keystroke logs
  // =========================================================================
  async function getStoredLogs() {
    return new Promise((resolve) => {
      const api = typeof browser !== "undefined" ? browser : chrome;
      api.storage.local.get(STORAGE_KEY, (result) => {
        const entries = result[STORAGE_KEY] || [];
        resolve(entries.map((entry) => JSON.parse(entry)));
      });
    });
  }
  function calculateMetrics(entries) {
    const metrics = {
      totalKeystrokes: 0,
      totalSessions: new Set(),
      totalDomains: new Set(),
      currentDomain: "N/A",
      recentKeystrokes: 0,
      errorRate: 0,
      isActive: false,
      currentWPM: 0,
    };
    if (!entries || entries.length === 0) {
      return {
        ...metrics,
        totalSessions: 0,
        totalDomains: 0,
      };
    }
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    // Calculate recent activity and total metrics
    for (const entry of entries) {
      // Deobfuscate if needed
      const rawKeys =
        entry.obfuscated && typeof window.Stealth !== "undefined"
          ? window.Stealth.deobfuscate(entry.keys)
          : entry.keys || "";
      // Regex matching special keys like [SHIFT], [ENTER] or normal characters
      const tokens = rawKeys.match(/\[[^\]]+\]|[^]/g) || [];
      const strokeCount = tokens.length;
      // Count keystrokes
      metrics.totalKeystrokes += strokeCount;
      metrics.totalSessions.add(entry.sessionId);
      const domain = extractDomain(entry.url);
      metrics.totalDomains.add(domain);
      // Check if recent
      if (entry.timestamp > fiveMinutesAgo) {
        metrics.recentKeystrokes += strokeCount;
      }
    }
    // Get current domain from most recent entry
    if (entries.length > 0) {
      const lastEntry = entries[entries.length - 1];
      metrics.currentDomain = extractDomain(lastEntry.url);
      metrics.isActive = now - lastEntry.timestamp < 30000; // active if keystroke in last 30 seconds
    }
    // Calculate error rate from backspace count
    let backspaceCount = 0;
    let normalChars = 0;
    for (const entry of entries) {
      const rawKeys =
        entry.obfuscated && typeof window.Stealth !== "undefined"
          ? window.Stealth.deobfuscate(entry.keys)
          : entry.keys || "";
      const tokens = rawKeys.match(/\[[^\]]+\]|[^]/g) || [];
      const bksps = tokens.filter((t) => t === "[BKSP]").length;
      backspaceCount += bksps;
      // Normal chars are the non-bracketed tokens
      normalChars += tokens.filter((t) => !t.startsWith("[")).length;
    }
    metrics.errorRate =
      normalChars > 0 ? backspaceCount / (backspaceCount + normalChars) : 0;
    // Calculate WPM estimate (characters / 5 = words, divide by minutes)
    const oldestEntry = entries[0];
    const timeSpanMs =
      entries[entries.length - 1].timestamp - oldestEntry.timestamp;
    const timeSpanMinutes = Math.max(timeSpanMs / (60 * 1000), 0.1);
    const words = metrics.totalKeystrokes / 5;
    metrics.currentWPM = Math.round(words / timeSpanMinutes);
    return {
      ...metrics,
      totalSessions: metrics.totalSessions.size || 0,
      totalDomains: metrics.totalDomains.size || 0,
    };
  }
  // =========================================================================
  // UI Update
  // =========================================================================
  async function updateUI() {
    try {
      const entries = await getStoredLogs();
      const metrics = calculateMetrics(entries);
      // Update status
      const statusEl = document.getElementById("status");
      const statusTextEl = document.getElementById("statusText");
      if (metrics.isActive) {
        statusEl.classList.remove("is-idle");
        statusEl.classList.add("is-active");
        statusEl.style.background = "";
        statusTextEl.textContent = "Active";
      } else {
        statusEl.classList.remove("is-active");
        statusEl.classList.add("is-idle");
        statusEl.style.background = "";
        statusTextEl.textContent = "Idle";
      }
      // Update metrics
      const wpmEl = document.getElementById("wpm");
      const errorRateEl = document.getElementById("errorRate");
      const keystrokesEl = document.getElementById("keystrokes");
      const siteEl = document.getElementById("site");
      if (wpmEl) wpmEl.textContent = formatInt(metrics.currentWPM);
      if (errorRateEl)
        errorRateEl.textContent = formatPercent(metrics.errorRate);
      if (keystrokesEl)
        keystrokesEl.textContent = formatInt(metrics.recentKeystrokes);
      if (siteEl) siteEl.textContent = safeText(metrics.currentDomain);
      // Update stats summary
      const totalEl = document.getElementById("totalKeystrokes");
      if (totalEl)
        totalEl.textContent = `Total: ${formatInt(metrics.totalKeystrokes)}`;
      const sessionsEl = document.getElementById("sessionCount");
      if (sessionsEl)
        sessionsEl.textContent = `Sessions: ${metrics.totalSessions}`;
      const domainsEl = document.getElementById("domainCount");
      if (domainsEl) domainsEl.textContent = `Sites: ${metrics.totalDomains}`;
    } catch (err) {
      console.error("[TypeSmart popup] Update error:", err.message);
    }
  }
  // =========================================================================
  // Event handlers
  // =========================================================================
  function handleClear() {
    if (confirm("Clear all logged keystrokes?")) {
      const api = typeof browser !== "undefined" ? browser : chrome;
      // Send message to background script to wipe both ts_log and ts_failed_queue
      api.runtime.sendMessage({ type: "CLEAR" }, (response) => {
        console.log("[TypeSmart popup] All logs and queues cleared");
        updateUI();
      });
    }
  }
  function handleExport() {
    const api = typeof browser !== "undefined" ? browser : chrome;
    api.runtime.sendMessage({ type: "EXPORT" }, (response) => {
      if (response && response.success) {
        // Parse the stringified entries from storage into actual objects
        const parsedEntries = response.entries.map((entry) =>
          typeof entry === "string" ? JSON.parse(entry) : entry,
        );
        const json = JSON.stringify(parsedEntries, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `typesmart-logs-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }
  // =========================================================================
  // Initialization
  // =========================================================================
  function main() {
    const clearBtn = document.getElementById("clearBtn");
    const exportBtn = document.getElementById("exportBtn");
    if (clearBtn) clearBtn.addEventListener("click", handleClear);
    if (exportBtn) exportBtn.addEventListener("click", handleExport);
    // Initial update
    updateUI();
    // Update every second
    setInterval(updateUI, UPDATE_INTERVAL_MS);
    console.log("[TypeSmart popup] Loaded  (showing REAL data)");
  }
  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
