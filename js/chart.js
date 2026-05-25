// Charts backed by Chart.js (vendored UMD global `window.Chart`). The exported
// signatures are kept stable so existing call sites need no changes:
//   drawChart(canvas, [{ label, color, points:[{x,y}] }], { type, xLabels, yLabel, showDots, gridLines })
//   sparkline(canvas, points, color)
// Plus a small donut for session muscle splits.

const PALETTE = {
  grid: "#232a33",
  text: "#8a95a3",
  tooltipBg: "#1a1f26",
  series: ["#39b54a", "#ffb547", "#4da6ff", "#c97bff", "#ff5a1f"],
};

function hexToRgba(hex, a) {
  const m = hex.replace("#", "");
  const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Lazily create a vertical gradient from a series color, scoped to the chart area.
function areaGradient(ctx, area, color) {
  if (!area) return hexToRgba(color, 0.18);
  const g = ctx.createLinearGradient(0, area.top, 0, area.bottom);
  g.addColorStop(0, hexToRgba(color, 0.38));
  g.addColorStop(1, hexToRgba(color, 0));
  return g;
}

function destroyExisting(canvas) {
  if (canvas._chart) { canvas._chart.destroy(); canvas._chart = null; }
}

function baseScales(yLabel, xLabels) {
  return {
    x: {
      grid: { display: false },
      ticks: { color: PALETTE.text, font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
      display: !!(xLabels && xLabels.length),
    },
    y: {
      beginAtZero: false,
      grid: { color: PALETTE.grid, drawBorder: false },
      border: { display: false },
      ticks: { color: PALETTE.text, font: { size: 11 }, maxTicksLimit: 6, precision: 0 },
      title: yLabel ? { display: true, text: yLabel, color: PALETTE.text, font: { size: 11 } } : { display: false },
    },
  };
}

function commonTooltip() {
  return {
    backgroundColor: PALETTE.tooltipBg,
    borderColor: PALETTE.grid,
    borderWidth: 1,
    titleColor: "#e8ecf1",
    bodyColor: "#e8ecf1",
    padding: 8,
    cornerRadius: 8,
    displayColors: false,
  };
}

export function drawChart(canvas, data, options = {}) {
  const Chart = window.Chart;
  if (!Chart) return drawFallback(canvas, "Charts unavailable");

  const { type = "line", yLabel = "" } = options;
  const xLabels = options.xLabels || [];

  destroyExisting(canvas);

  // Build labels: prefer provided xLabels, else use the x values of the first series.
  const labels = xLabels.length
    ? xLabels
    : (data[0]?.points || []).slice().sort((a, b) => a.x - b.x).map((p) => p.x);

  const datasets = data.map((series, si) => {
    const color = series.color || PALETTE.series[si % PALETTE.series.length];
    const pts = series.points.slice().sort((a, b) => a.x - b.x).map((p) => p.y);
    if (type === "bar") {
      return {
        label: series.label || `Series ${si + 1}`,
        data: pts,
        backgroundColor: (c) => {
          const a = c.chart.chartArea;
          const g = c.chart.ctx.createLinearGradient(0, a?.top ?? 0, 0, a?.bottom ?? 150);
          g.addColorStop(0, color);
          g.addColorStop(1, hexToRgba(color, 0.55));
          return g;
        },
        borderColor: color,
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 48,
      };
    }
    return {
      label: series.label || `Series ${si + 1}`,
      data: pts,
      borderColor: color,
      borderWidth: 2.5,
      tension: 0.35,
      fill: true,
      backgroundColor: (c) => areaGradient(c.chart.ctx, c.chart.chartArea, color),
      pointRadius: 0,
      pointHoverRadius: 5,
      pointBackgroundColor: color,
      pointBorderColor: "#0b0d10",
      pointBorderWidth: 2,
    };
  });

  canvas._chart = new Chart(canvas, {
    type,
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: "easeOutQuart" },
      interaction: { mode: "index", intersect: false },
      scales: baseScales(yLabel, xLabels),
      plugins: {
        legend: {
          display: data.length > 1,
          labels: { color: PALETTE.text, boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { size: 11 } },
        },
        tooltip: commonTooltip(),
      },
    },
  });
  return canvas._chart;
}

// Tiny inline trend line. Drawn manually (not via Chart.js) so it stays crisp
// and cheap inside table cells, with a soft gradient fill under the line.
export function sparkline(canvas, points, color = PALETTE.series[0]) {
  if (!points.length) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 80;
  const h = canvas.clientHeight || 24;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const yVals = points.map((p) => p.y);
  let yMin = Math.min(...yVals), yMax = Math.max(...yVals);
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  const pad = 2;
  const xAt = (i) => pad + ((w - pad * 2) * i) / (points.length - 1 || 1);
  const yAt = (v) => pad + (h - pad * 2) - ((v - yMin) / (yMax - yMin)) * (h - pad * 2);

  ctx.beginPath();
  ctx.moveTo(xAt(0), yAt(points[0].y));
  for (let i = 1; i < points.length; i++) ctx.lineTo(xAt(i), yAt(points[i].y));

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, hexToRgba(color, 0.35));
  grad.addColorStop(1, hexToRgba(color, 0));
  ctx.save();
  ctx.lineTo(xAt(points.length - 1), h);
  ctx.lineTo(xAt(0), h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(xAt(0), yAt(points[0].y));
  for (let i = 1; i < points.length; i++) ctx.lineTo(xAt(i), yAt(points[i].y));
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  ctx.stroke();
}

// Doughnut for session muscle split. segments: [{ label, value, color? }]
export function drawDonut(canvas, segments, options = {}) {
  const Chart = window.Chart;
  if (!Chart || !segments.length) return;
  destroyExisting(canvas);
  const colors = segments.map((s, i) => s.color || PALETTE.series[i % PALETTE.series.length]);
  canvas._chart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: segments.map((s) => s.label),
      datasets: [{
        data: segments.map((s) => s.value),
        backgroundColor: colors,
        borderColor: "#0b0d10",
        borderWidth: 2,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      animation: { duration: 600, easing: "easeOutQuart" },
      plugins: {
        legend: {
          position: options.legend || "bottom",
          labels: { color: PALETTE.text, boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { size: 11 }, padding: 10 },
        },
        tooltip: {
          ...commonTooltip(),
          callbacks: {
            label: (c) => {
              const total = c.dataset.data.reduce((a, b) => a + b, 0) || 1;
              const pct = Math.round((c.parsed / total) * 100);
              return ` ${c.label}: ${c.parsed} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

function drawFallback(canvas, msg) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.clientWidth || 300;
  const h = canvas.clientHeight || 150;
  canvas.width = w; canvas.height = h;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = PALETTE.text;
  ctx.font = "13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(msg, w / 2, h / 2);
}
