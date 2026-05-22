const COLORS = {
  grid: "#232a33",
  text: "#8a95a3",
  series: ["#ff5a1f", "#ffb547", "#36c46b", "#4da6ff", "#c97bff"],
};

export function drawChart(canvas, data, options = {}) {
  const { type = "line", yLabel = "", showDots = true, gridLines = 5 } = options;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight || 200;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  const pad = { top: 16, right: 16, bottom: 32, left: yLabel ? 52 : 44 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  const allPoints = data.flatMap((s) => s.points);
  if (!allPoints.length) {
    ctx.fillStyle = COLORS.text;
    ctx.font = "13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No data", w / 2, h / 2);
    return;
  }

  const xVals = allPoints.map((p) => p.x);
  const yVals = allPoints.map((p) => p.y);
  let xMin = Math.min(...xVals), xMax = Math.max(...xVals);
  let yMin = Math.min(...yVals), yMax = Math.max(...yVals);
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  if (xMin === xMax) { xMin -= 1; xMax += 1; }
  const yPad = (yMax - yMin) * 0.08;
  yMin -= yPad; yMax += yPad;

  const sx = (v) => pad.left + ((v - xMin) / (xMax - xMin)) * cw;
  const sy = (v) => pad.top + ch - ((v - yMin) / (yMax - yMin)) * ch;

  // Grid
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  for (let i = 0; i <= gridLines; i++) {
    const y = pad.top + (ch / gridLines) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
  }
  ctx.setLineDash([]);

  // Y-axis labels
  ctx.fillStyle = COLORS.text;
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "right";
  for (let i = 0; i <= gridLines; i++) {
    const val = yMax - ((yMax - yMin) / gridLines) * i;
    const y = pad.top + (ch / gridLines) * i;
    ctx.fillText(Math.round(val), pad.left - 6, y + 4);
  }

  // Y label
  if (yLabel) {
    ctx.save();
    ctx.translate(12, pad.top + ch / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }

  // X-axis labels
  const xLabels = options.xLabels || [];
  if (xLabels.length) {
    ctx.textAlign = "center";
    const step = Math.max(1, Math.floor(xLabels.length / 8));
    for (let i = 0; i < xLabels.length; i += step) {
      const pt = allPoints[i] || { x: xMin + ((xMax - xMin) * i) / (xLabels.length - 1) };
      ctx.fillText(xLabels[i], sx(pt.x), h - 6);
    }
  }

  if (type === "bar") {
    const barW = Math.max(4, (cw / allPoints.length) * 0.7);
    data.forEach((series, si) => {
      ctx.fillStyle = series.color || COLORS.series[si % COLORS.series.length];
      for (const p of series.points) {
        const x = sx(p.x) - barW / 2;
        const barH = sy(yMin) - sy(p.y);
        ctx.fillRect(x, sy(p.y), barW, barH);
      }
    });
    return;
  }

  // Line chart
  data.forEach((series, si) => {
    const color = series.color || COLORS.series[si % COLORS.series.length];
    const pts = series.points.slice().sort((a, b) => a.x - b.x);
    if (!pts.length) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(sx(pts[0].x), sy(pts[0].y));
    for (let i = 1; i < pts.length; i++) ctx.lineTo(sx(pts[i].x), sy(pts[i].y));
    ctx.stroke();

    if (showDots) {
      ctx.fillStyle = color;
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(sx(p.x), sy(p.y), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  // Legend
  if (data.length > 1) {
    ctx.font = "11px system-ui, sans-serif";
    let lx = pad.left;
    for (let i = 0; i < data.length; i++) {
      const color = data[i].color || COLORS.series[i % COLORS.series.length];
      ctx.fillStyle = color;
      ctx.fillRect(lx, h - 12, 10, 10);
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = "left";
      const label = data[i].label || `Series ${i + 1}`;
      ctx.fillText(label, lx + 14, h - 3);
      lx += ctx.measureText(label).width + 28;
    }
  }
}

export function sparkline(canvas, points, color = COLORS.series[0]) {
  if (!points.length) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight || 32;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  const yVals = points.map((p) => p.y);
  let yMin = Math.min(...yVals), yMax = Math.max(...yVals);
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  const pad = 2;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const x = pad + ((w - pad * 2) * i) / (points.length - 1 || 1);
    const y = pad + (h - pad * 2) - ((points[i].y - yMin) / (yMax - yMin)) * (h - pad * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}
