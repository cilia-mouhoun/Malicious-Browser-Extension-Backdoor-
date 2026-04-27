
(() => {
  "use strict";
  const STORAGE_KEY = "ts_log";
  const MS_PER_MIN = 60000;
  const HISTORY_DAYS = 7;
  // =========================================================================
  // Utility Functions
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
  function formatMinutes(ms) {
    const minutes = Math.max(0, Math.round(ms / MS_PER_MIN));
    return `${minutes}m`;
  }
  function pad2(num) {
    return String(num).padStart(2, "0");
  }
  function getLocalDateKey(dateMs) {
    const d = new Date(dateMs);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  function formatDateShort(dateKey) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey));
    if (!m) return String(dateKey);
    return `${Number(m[2])}/${Number(m[3])}`;
  }
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }
  // =========================================================================
  // Real Data Processing
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
  function processHistoricalData(entries) {
    const history = {};
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    // Initialize history for last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateKey = getLocalDateKey(date.getTime());
      history[dateKey] = {
        dateKey,
        keystrokesCount: 0,
        backspaceCount: 0,
        sessionCount: new Set(),
        urls: new Set(),
        timeSpanMs: 0,
      };
    }
    // Process entries
    for (const entry of entries) {
      if (entry.timestamp < sevenDaysAgo) continue;
      const dateKey = getLocalDateKey(entry.timestamp);
      if (!history[dateKey]) continue;
      const day = history[dateKey];
      const keyCount = entry.keys.length;
      const backspaceMatches = entry.keys.match(/\[BKSP\]/g) || [];
      day.keystrokesCount += keyCount;
      day.backspaceCount += backspaceMatches.length;
      day.sessionCount.add(entry.sessionId);
      day.urls.add(entry.url);
    }
    // Convert to array and calculate metrics
    const dailyData = Object.keys(history)
      .map((dateKey) => {
        const day = history[dateKey];
        const totalKeystrokes = day.keystrokesCount;
        const words = totalKeystrokes / 5;
        const errorRate =
          totalKeystrokes > 0 ? day.backspaceCount / totalKeystrokes : 0;
        return {
          dateKey,
          date: formatDateShort(dateKey),
          keystrokes: totalKeystrokes,
          wpm: Math.max(0, words), // Simplified WPM
          errorRate,
          sessionCount: day.sessionCount.size,
          urlCount: day.urls.size,
        };
      })
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    return dailyData;
  }
  function calculateSummary(dailyData) {
    const totalKeystrokes = dailyData.reduce((sum, d) => sum + d.keystrokes, 0);
    const avgErrorRate =
      dailyData.length > 0
        ? dailyData.reduce((sum, d) => sum + d.errorRate, 0) / dailyData.length
        : 0;
    const totalSessions = dailyData.reduce((sum, d) => sum + d.sessionCount, 0);
    const totalUrls = dailyData.reduce((sum, d) => sum + d.urlCount, 0);
    const totalWords = totalKeystrokes / 5;
    const avgWpm = dailyData.length > 0 ? totalWords / dailyData.length : 0;
    return {
      totalKeystrokes,
      averageWPM: Math.round(avgWpm),
      averageErrorRate: avgErrorRate,
      totalSessions,
      totalUrls,
      totalWords,
      daysActive: dailyData.filter((d) => d.keystrokes > 0).length,
    };
  }
  // =========================================================================
  // UI Building
  // =========================================================================
  function renderSummaryCards(summary) {
    const container = document.getElementById("summaryCards");
    if (!container) return;
    container.innerHTML = "";
    const cards = [
      {
        label: "Total Keystrokes",
        value: formatInt(summary.totalKeystrokes),
      },
      {
        label: "Average WPM",
        value: formatInt(summary.averageWPM),
      },
      {
        label: "Error Rate",
        value: formatPercent(summary.averageErrorRate),
      },
      {
        label: "Unique Sessions",
        value: formatInt(summary.totalSessions),
      },
      {
        label: "Websites Visited",
        value: formatInt(summary.totalUrls),
      },
      {
        label: "Days Active",
        value: formatInt(summary.daysActive),
      },
    ];
    for (const card of cards) {
      const cardEl = el("div", "card");
      const labelEl = el("div", "card-label", card.label);
      const valueEl = el("div", "card-value", card.value);
      cardEl.appendChild(labelEl);
      cardEl.appendChild(valueEl);
      container.appendChild(cardEl);
    }
  }
  function renderTimelineChart(dailyData) {
    const canvas = document.getElementById("wpmChart");
    if (!canvas || typeof window.Chart === "undefined") return;
    const labels = dailyData.map((d) => d.date);
    const data = dailyData.map((d) => d.wpm);
    if (window.wpmChart instanceof window.Chart) {
      window.wpmChart.destroy();
    }
    window.wpmChart = new window.Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Keystroke Count",
            data,
            borderColor: "rgba(233, 69, 96, 0.8)",
            backgroundColor: "rgba(233, 69, 96, 0.1)",
            tension: 0.3,
            fill: true,
            pointRadius: 5,
            pointBackgroundColor: "rgba(233, 69, 96, 0.9)",
            pointHoverRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: "rgba(234, 234, 234, 0.6)",
            },
            grid: {
              color: "rgba(234, 234, 234, 0.08)",
            },
          },
          x: {
            ticks: {
              color: "rgba(234, 234, 234, 0.6)",
            },
            grid: {
              display: false,
            },
          },
        },
      },
    });
  }
  function renderKeystrokesChart(dailyData) {
    const canvas = document.getElementById("keystrokesChart");
    if (!canvas || typeof window.Chart === "undefined") return;
    const labels = dailyData.map((d) => d.date);
    const data = dailyData.map((d) => d.keystrokes);
    if (window.keystrokesChart instanceof window.Chart) {
      window.keystrokesChart.destroy();
    }
    window.keystrokesChart = new window.Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Daily Keystrokes",
            data,
            backgroundColor: "rgba(15, 115, 160, 0.6)",
            borderColor: "rgba(15, 115, 160, 0.8)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        indexAxis: "x",
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: "rgba(234, 234, 234, 0.6)",
            },
            grid: {
              color: "rgba(234, 234, 234, 0.08)",
            },
          },
          x: {
            ticks: {
              color: "rgba(234, 234, 234, 0.6)",
            },
            grid: {
              display: false,
            },
          },
        },
      },
    });
  }
  function renderActivitySplit(dailyData) {
    const canvas = document.getElementById("activityChart");
    if (!canvas || typeof window.Chart === "undefined") return;
    const total = dailyData.reduce((sum, d) => sum + d.keystrokes, 0);
    if (window.activityChart instanceof window.Chart) {
      window.activityChart.destroy();
    }
    window.activityChart = new window.Chart(canvas, {
      type: "doughnut",
      data: {
        labels: ["Typing Activity", "Idle"],
        datasets: [
          {
            data: [
              Math.round((total / (total + 1000)) * 100),
              Math.round((1000 / (total + 1000)) * 100),
            ],
            backgroundColor: [
              "rgba(233, 69, 96, 0.7)",
              "rgba(122, 122, 158, 0.3)",
            ],
            borderColor: ["rgba(233, 69, 96, 0.9)", "rgba(122, 122, 158, 0.5)"],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            labels: {
              color: "rgba(234, 234, 234, 0.8)",
            },
          },
        },
      },
    });
  }
  // =========================================================================
  // Chart loading
  // =========================================================================
  async function loadChartLibrary() {
    if (typeof window.Chart !== "undefined") {
      return true;
    }
    const isExtension =
      window.location.protocol === "moz-extension:" ||
      window.location.protocol === "chrome-extension:";
    try {
      if (!isExtension) {
        const script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
        script.async = true;
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
    } catch {
      // Fallback to local
    }
    if (typeof window.Chart === "undefined") {
      const script = document.createElement("script");
      script.src = "vendor/chart.umd.min.js";
      script.async = true;
      try {
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      } catch {
        console.warn("[TypeSmart] Chart.js failed to load");
        return false;
      }
    }
    return typeof window.Chart !== "undefined";
  }
  // =========================================================================
  // Main initialization
  // =========================================================================
  async function main() {
    try {
      console.log("[TypeSmart Options] Loading real historical data...");
      const entries = await getStoredLogs();
      const dailyData = processHistoricalData(entries);
      const summary = calculateSummary(dailyData);
      // Update summary cards
      renderSummaryCards(summary);
      // Update metadata
      const rangePill = document.getElementById("rangePill");
      if (rangePill) {
        rangePill.textContent = `Range: Last ${HISTORY_DAYS} days`;
      }
      const generatedAt = document.getElementById("generatedAt");
      if (generatedAt) {
        generatedAt.textContent = `Last updated: now`;
      }
      const summarySub = document.getElementById("summarySub");
      if (summarySub) {
        summarySub.textContent =
          entries.length > 0
            ? `${entries.length} keystroke entries recorded`
            : "No data yet";
      }
      // Load Chart.js and render charts
      const hasCharts = await loadChartLibrary();
      if (hasCharts) {
        renderTimelineChart(dailyData);
        renderKeystrokesChart(dailyData);
        renderActivitySplit(dailyData);
      } else {
        console.warn("[TypeSmart] Charts disabled - Chart.js unavailable");
      }
      console.log("[TypeSmart Options] Dashboard loaded  (REAL DATA)");
    } catch (err) {
      console.error("[TypeSmart Options] Error:", err.message);
    }
  }
  // Start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
