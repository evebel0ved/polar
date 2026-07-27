(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // Constants & state
  // ---------------------------------------------------------------------
  var W = 1400, H = 1000;

  var CAMERA_COLORS = [
    { id: "white",    label: "WHITE",    body: "#f6f5f2" },
    { id: "pink",     label: "PINK",     body: "#f2d9df" },
    { id: "mint",     label: "MINT",     body: "#d9ebe0" },
    { id: "lavender", label: "LILAC",    body: "#e1dcee" },
    { id: "sky",      label: "SKY",      body: "#d8e5f1" },
    { id: "peach",    label: "PEACH",    body: "#f2e0cf" },
    { id: "butter",   label: "BUTTER",   body: "#f2ecd1" },
    { id: "black",    label: "CHARCOAL", body: "#383734" }
  ];

  var BG_COLORS = [
    { id: "paper",      label: "PAPER",    body: "#f4f3f0" },
    { id: "cream",      label: "CREAM",    body: "#f7ecd9" },
    { id: "blush",      label: "BLUSH",    body: "#f4d9de" },
    { id: "rose",       label: "ROSE",     body: "#eec3cc" },
    { id: "mint",       label: "MINT",     body: "#d7ebdf" },
    { id: "sage",       label: "SAGE",     body: "#c8d6c0" },
    { id: "sky",        label: "SKY",      body: "#d3e3f1" },
    { id: "powder",     label: "POWDER",   body: "#cfe0ea" },
    { id: "lilac",      label: "LILAC",    body: "#e0daee" },
    { id: "mauve",      label: "MAUVE",    body: "#d9c7d6" },
    { id: "peach",      label: "PEACH",    body: "#f3ddc6" },
    { id: "apricot",    label: "APRICOT",  body: "#f0c8a0" },
    { id: "butter",     label: "BUTTER",   body: "#f5edc9" },
    { id: "sand",       label: "SAND",     body: "#e4d3b8" },
    { id: "terracotta", label: "TERRA",    body: "#d99e7c" },
    { id: "slate",      label: "SLATE",    body: "#9fa8ac" },
    { id: "ink",        label: "INK",      body: "#2b2f38" },
    { id: "charcoal",   label: "CHARCOAL", body: "#383734" }
  ];

  var state = {
    cameraColorIndex: 0,
    bgColorIndex: 0,
    bgMode: "color",           // "color" | "blur"
    orientation: "vertical",   // "vertical" | "horizontal"
    captionText: "INSTANT",
    photoImg: null,
    scale: 6,
    gifSeconds: 1.4,
    gifLoop: true,
    phase: 1,
    playing: false
  };

  // ---------------------------------------------------------------------
  // DOM refs
  // ---------------------------------------------------------------------
  var stage = document.getElementById("stage");
  var ctxStage = stage.getContext("2d");
  var statusText = document.getElementById("statusText");
  var phaseLabel = document.getElementById("phaseLabel");
  var specCamera = document.getElementById("specCamera");
  var specBg = document.getElementById("specBg");
  var specOrient = document.getElementById("specOrient");
  var specScale = document.getElementById("specScale");
  var photoInput = document.getElementById("photoInput");
  var pickPhotoBtn = document.getElementById("pickPhoto");
  var photoStatus = document.getElementById("photoStatus");
  var cameraSwatchGrid = document.getElementById("cameraSwatchGrid");
  var bgSwatchGrid = document.getElementById("bgSwatchGrid");
  var bgColorBlock = document.getElementById("bgColorBlock");
  var bgModeColorBtn = document.getElementById("bgModeColor");
  var bgModeBlurBtn = document.getElementById("bgModeBlur");
  var bgNote = document.getElementById("bgNote");
  var orientVerticalBtn = document.getElementById("orientVertical");
  var orientHorizontalBtn = document.getElementById("orientHorizontal");
  var captionInput = document.getElementById("captionInput");
  var scaleRange = document.getElementById("scaleRange");
  var scaleVal = document.getElementById("scaleVal");
  var gifRange = document.getElementById("gifRange");
  var gifVal = document.getElementById("gifVal");
  var gifLoopBox = document.getElementById("gifLoop");
  var playPreviewBtn = document.getElementById("playPreview");
  var downloadPngBtn = document.getElementById("downloadPng");
  var downloadGifBtn = document.getElementById("downloadGif");

  // ---------------------------------------------------------------------
  // Small utilities
  // ---------------------------------------------------------------------
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function hexToRgb(hex) {
    var h = hex.replace("#", "");
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }
  function rgbToHex(r, g, b) {
    function h(v) { return clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0"); }
    return "#" + h(r) + h(g) + h(b);
  }
  function shade(hex, percent) {
    var rgb = hexToRgb(hex);
    var t = percent < 0 ? 0 : 255;
    var p = Math.abs(percent) / 100;
    return rgbToHex(
      lerp(rgb[0], t, p),
      lerp(rgb[1], t, p),
      lerp(rgb[2], t, p)
    );
  }
  function isDarkColor(hex) {
    var rgb = hexToRgb(hex);
    var lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    return lum < 0.55;
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    var rr = typeof r === "number" ? { tl: r, tr: r, br: r, bl: r } : r;
    ctx.beginPath();
    ctx.moveTo(x + rr.tl, y);
    ctx.lineTo(x + w - rr.tr, y);
    ctx.arcTo(x + w, y, x + w, y + rr.tr, rr.tr);
    ctx.lineTo(x + w, y + h - rr.br);
    ctx.arcTo(x + w, y + h, x + w - rr.br, y + h, rr.br);
    ctx.lineTo(x + rr.bl, y + h);
    ctx.arcTo(x, y + h, x, y + h - rr.bl, rr.bl);
    ctx.lineTo(x, y + rr.tl);
    ctx.arcTo(x, y, x + rr.tl, y, rr.tl);
    ctx.closePath();
  }

  function coverRect(imgW, imgH, boxW, boxH) {
    var srcRatio = imgW / imgH;
    var boxRatio = boxW / boxH;
    var sw, sh, sx, sy;
    if (srcRatio > boxRatio) {
      sh = imgH;
      sw = imgH * boxRatio;
      sx = (imgW - sw) / 2;
      sy = 0;
    } else {
      sw = imgW;
      sh = imgW / boxRatio;
      sx = 0;
      sy = (imgH - sh) / 2;
    }
    return { sx: sx, sy: sy, sw: sw, sh: sh };
  }

  // ---------------------------------------------------------------------
  // Scene layout (logical 1400x1000 coordinate space — fixed regardless
  // of device, so preview and every exported file share one composition)
  // ---------------------------------------------------------------------
  var LAYOUT = {
    bodyX: 90, bodyY: 210, bodyW: 760, bodyH: 580, bodyR: 30,
    shoulderH: 150
  };

  var CARD_DIMS = {
    vertical:   { w: 420, h: 500, side: "bottom", margin: 96 },
    horizontal: { w: 540, h: 400, side: "right",  margin: 112 }
  };

  function cameraCenter() {
    return {
      cx: LAYOUT.bodyX + LAYOUT.bodyW / 2,
      cy: LAYOUT.bodyY + LAYOUT.shoulderH + (LAYOUT.bodyH - LAYOUT.shoulderH) / 2
    };
  }

  function cardLeftAt(e, cardW) {
    var rightEdge = LAYOUT.bodyX + LAYOUT.bodyW;
    var startX = rightEdge - cardW + 50;
    var endX = rightEdge - 60;
    return lerp(startX, endX, e);
  }

  // ---------------------------------------------------------------------
  // Background
  // ---------------------------------------------------------------------
  function drawColorBackground(ctx, colorDef) {
    var isDark = isDarkColor(colorDef.body);
    var edge = isDark ? shade(colorDef.body, -35) : "#ffffff";
    var g = ctx.createRadialGradient(W * 0.32, H * 0.28, 60, W * 0.5, H * 0.55, W * 0.8);
    g.addColorStop(0, isDark ? shade(colorDef.body, 12) : shade(colorDef.body, 55));
    g.addColorStop(0.55, isDark ? colorDef.body : shade(colorDef.body, 22));
    g.addColorStop(1, edge);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    var vg = ctx.createLinearGradient(0, 0, 0, H);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, isDark ? "rgba(0,0,0,0.18)" : "rgba(60,50,40,0.05)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  function drawBlurredPhotoBackground(ctx, photoImg) {
    var crop = coverRect(photoImg.naturalWidth || photoImg.width, photoImg.naturalHeight || photoImg.height, W, H);
    var pad = 80;
    ctx.save();
    try {
      ctx.filter = "blur(42px) saturate(1.06) brightness(0.94)";
      ctx.drawImage(photoImg, crop.sx, crop.sy, crop.sw, crop.sh, -pad, -pad, W + pad * 2, H + pad * 2);
    } catch (err) {
      // filter unsupported — fall back to a plain (unblurred) cover fill
      ctx.drawImage(photoImg, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, W, H);
    }
    ctx.restore();

    var vg = ctx.createLinearGradient(0, 0, 0, H);
    vg.addColorStop(0, "rgba(18,15,12,0.22)");
    vg.addColorStop(0.5, "rgba(18,15,12,0.12)");
    vg.addColorStop(1, "rgba(18,15,12,0.34)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  function drawBackground(ctx, bgColorDef, bgMode, photoImg) {
    ctx.clearRect(0, 0, W, H);
    if (bgMode === "blur" && photoImg) {
      drawBlurredPhotoBackground(ctx, photoImg);
    } else {
      drawColorBackground(ctx, bgColorDef);
    }
  }

  // ---------------------------------------------------------------------
  // Camera — detailed body render
  // ---------------------------------------------------------------------
  function drawDial(ctx, x, y, r, color, ticks) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    var grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    grad.addColorStop(0, shade(color, 26));
    grad.addColorStop(1, shade(color, -22));
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.stroke();

    var teeth = ticks || 16;
    for (var i = 0; i < teeth; i++) {
      var a = (i / teeth) * Math.PI * 2;
      var x1 = x + Math.cos(a) * (r - 3), y1 = y + Math.sin(a) * (r - 3);
      var x2 = x + Math.cos(a) * r, y2 = y + Math.sin(a) * r;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // index mark
    ctx.beginPath();
    ctx.arc(x, y - r * 0.5, 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fill();
    ctx.restore();
  }

  function drawGripTexture(ctx, x, y, w, h, r, body, isDark) {
    ctx.save();
    roundRectPath(ctx, x, y, w, h, r);
    ctx.clip();
    var base = shade(body, isDark ? -12 : -14);
    ctx.fillStyle = base;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.16)";
    ctx.lineWidth = 2;
    var step = 9;
    for (var i = -h; i < w + h; i += step) {
      ctx.beginPath();
      ctx.moveTo(x + i, y + h);
      ctx.lineTo(x + i + h, y);
      ctx.stroke();
    }
    ctx.restore();
    roundRectPath(ctx, x, y, w, h, r);
    ctx.lineWidth = 1;
    ctx.strokeStyle = isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.18)";
    ctx.stroke();
  }

  function drawStrapLug(ctx, x, y, body, isDark) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fillStyle = shade(body, isDark ? -20 : -24);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = "#17171a";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - 1.5, y - 1.5, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fill();
    ctx.restore();
  }

  function drawFlash(ctx, x, y, w, h) {
    ctx.save();
    roundRectPath(ctx, x, y, w, h, 6);
    var grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, "#eef1ee");
    grad.addColorStop(0.5, "#c7cdc8");
    grad.addColorStop(1, "#9aa39c");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    ctx.stroke();
    roundRectPath(ctx, x + 4, y + 4, w - 8, h * 0.4, 3);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fill();
    ctx.restore();
  }

  function drawLED(ctx, x, y, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 3.4, 0, Math.PI * 2);
    var g = ctx.createRadialGradient(x - 1, y - 1, 0.4, x, y, 3.6);
    g.addColorStop(0, shade(color, 40));
    g.addColorStop(1, color);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }

  function drawCamera(ctx, colorDef) {
    var L = LAYOUT;
    var body = colorDef.body;
    var isDark = isDarkColor(body);

    ctx.save();
    ctx.shadowColor = "rgba(20,16,12,0.28)";
    ctx.shadowBlur = 46;
    ctx.shadowOffsetY = 22;

    // body
    roundRectPath(ctx, L.bodyX, L.bodyY, L.bodyW, L.bodyH, L.bodyR);
    var bodyGrad = ctx.createLinearGradient(0, L.bodyY, 0, L.bodyY + L.bodyH);
    bodyGrad.addColorStop(0, shade(body, isDark ? 6 : 10));
    bodyGrad.addColorStop(0.4, body);
    bodyGrad.addColorStop(1, shade(body, isDark ? -10 : -6));
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.restore();

    // body edge line
    roundRectPath(ctx, L.bodyX, L.bodyY, L.bodyW, L.bodyH, L.bodyR);
    ctx.lineWidth = 2;
    ctx.strokeStyle = shade(body, isDark ? 14 : -14);
    ctx.stroke();

    // shoulder band (top)
    roundRectPath(ctx, L.bodyX, L.bodyY, L.bodyW, L.shoulderH, { tl: L.bodyR, tr: L.bodyR, br: 0, bl: 0 });
    ctx.fillStyle = shade(body, isDark ? -6 : -8);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(L.bodyX, L.bodyY + L.shoulderH + 0.5);
    ctx.lineTo(L.bodyX + L.bodyW, L.bodyY + L.shoulderH + 0.5);
    ctx.strokeStyle = shade(body, isDark ? 10 : -18);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // strap lugs (top corners)
    drawStrapLug(ctx, L.bodyX + 22, L.bodyY + 22, body, isDark);
    drawStrapLug(ctx, L.bodyX + L.bodyW - 22, L.bodyY + 22, body, isDark);

    // hot shoe (top center)
    var hsW = 54, hsH = 16, hsX = L.bodyX + L.bodyW / 2 - hsW / 2, hsY = L.bodyY - 9;
    roundRectPath(ctx, hsX, hsY, hsW, hsH, 3);
    ctx.fillStyle = "#232326";
    ctx.fill();
    roundRectPath(ctx, hsX + 5, hsY + 3, hsW - 10, hsH - 10, 1.5);
    ctx.fillStyle = "#0e0e10";
    ctx.fill();

    // viewfinder window
    var vfX = L.bodyX + 66, vfY = L.bodyY + 46, vfW = 150, vfH = 58;
    roundRectPath(ctx, vfX, vfY, vfW, vfH, 10);
    var vfGrad = ctx.createLinearGradient(vfX, vfY, vfX, vfY + vfH);
    vfGrad.addColorStop(0, "#3b3d40");
    vfGrad.addColorStop(1, "#151517");
    ctx.fillStyle = vfGrad;
    ctx.fill();
    roundRectPath(ctx, vfX + 8, vfY + 7, vfW * 0.4, vfH * 0.32, 6);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fill();
    // viewfinder eyepiece (small square below window)
    roundRectPath(ctx, vfX + 14, vfY + vfH - 4, 26, 14, 3);
    ctx.fillStyle = "#101012";
    ctx.fill();

    // status LED near viewfinder
    drawLED(ctx, vfX + vfW + 30, vfY + 14, "#c65b4a");

    // small indicator dot
    ctx.beginPath();
    ctx.arc(vfX + vfW + 34, vfY + vfH / 2 + 12, 7, 0, Math.PI * 2);
    ctx.fillStyle = shade(body, isDark ? 20 : -22);
    ctx.fill();

    // brand plate (blank embossed plate, no logo)
    var plX = L.bodyX + 66, plY = L.bodyY + L.shoulderH + 34, plW = 190, plH = 30;
    roundRectPath(ctx, plX, plY, plW, plH, 4);
    ctx.fillStyle = shade(body, isDark ? -4 : -5);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = shade(body, isDark ? 10 : -16);
    ctx.stroke();
    roundRectPath(ctx, plX + 2, plY + 2, plW - 4, plH * 0.4, 3);
    ctx.fillStyle = shade(body, isDark ? 8 : 20);
    ctx.globalAlpha = 0.35;
    ctx.fill();
    ctx.globalAlpha = 1;

    // textured grip strip (lower-left front, rubberized ridge pattern)
    drawGripTexture(ctx, L.bodyX + 40, L.bodyY + L.bodyH - 150, 150, 108, 8, body, isDark);

    // flash unit
    drawFlash(ctx, L.bodyX + 60, L.bodyY + L.shoulderH + 78, 92, 46);

    // shutter button (with chrome ring)
    var shX = L.bodyX + L.bodyW - 96, shY = L.bodyY + 70;
    ctx.beginPath();
    ctx.arc(shX, shY, 34, 0, Math.PI * 2);
    ctx.fillStyle = "#d8d8d4";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(shX, shY, 30, 0, Math.PI * 2);
    var shGrad = ctx.createRadialGradient(shX - 8, shY - 10, 4, shX, shY, 30);
    shGrad.addColorStop(0, shade(body, isDark ? 24 : 30));
    shGrad.addColorStop(1, shade(body, isDark ? -18 : -20));
    ctx.fillStyle = shGrad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = shade(body, isDark ? 10 : -30);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(shX, shY, 11, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fill();

    // mode dial (top right) — larger, with tick marks
    drawDial(ctx, L.bodyX + L.bodyW - 40, L.bodyY + 26, 20, shade(body, isDark ? -8 : -12), 18);

    // bottom-left small dial
    drawDial(ctx, L.bodyX + 60, L.bodyY + L.bodyH - 46, 22, shade(body, isDark ? -10 : -16), 20);

    // film-door seam + latch (right edge)
    ctx.beginPath();
    ctx.moveTo(L.bodyX + L.bodyW - 26, L.bodyY + L.shoulderH + 12);
    ctx.lineTo(L.bodyX + L.bodyW - 26, L.bodyY + L.bodyH - 14);
    ctx.strokeStyle = shade(body, isDark ? 12 : -20);
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    roundRectPath(ctx, L.bodyX + L.bodyW - 40, L.bodyY + L.bodyH - 40, 22, 12, 3);
    ctx.fillStyle = shade(body, isDark ? -16 : -24);
    ctx.fill();

    // bottom rubber feet
    [L.bodyX + 34, L.bodyX + L.bodyW - 34].forEach(function (fx) {
      roundRectPath(ctx, fx - 16, L.bodyY + L.bodyH - 6, 32, 10, 4);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fill();
    });

    // lens assembly
    var c = cameraCenter();
    drawLens(ctx, c.cx, c.cy, 232);

    ctx.restore();
  }

  function drawLens(ctx, cx, cy, R) {
    ctx.save();

    // mount collar (slightly larger than bezel, gives depth)
    ctx.beginPath();
    ctx.arc(cx, cy, R + 8, 0, Math.PI * 2);
    ctx.fillStyle = "#050505";
    ctx.fill();

    // outer bezel
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    var bezelGrad = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
    bezelGrad.addColorStop(0, "#302f2c");
    bezelGrad.addColorStop(1, "#0f0e0d");
    ctx.fillStyle = bezelGrad;
    ctx.fill();

    // focus-scale ticks around outer rim
    var tickCount = 48;
    for (var t = 0; t < tickCount; t++) {
      var ta = (t / tickCount) * Math.PI * 2;
      var long = t % 4 === 0;
      var r1 = R - (long ? 14 : 8);
      var r2 = R - 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ta) * r1, cy + Math.sin(ta) * r1);
      ctx.lineTo(cx + Math.cos(ta) * r2, cy + Math.sin(ta) * r2);
      ctx.strokeStyle = long ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.06)";
      ctx.lineWidth = long ? 1.3 : 1;
      ctx.stroke();
    }

    // ridged rings
    var ringCount = 7;
    for (var i = 0; i < ringCount; i++) {
      var rr = R * (0.42 + (i / ringCount) * 0.42);
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = i % 2 === 0 ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.32)";
      ctx.stroke();
    }

    // knurled grip ring (fine vertical ridges) between R*0.62–0.74
    var innerR = R * 0.62, outerR = R * 0.76;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
    ctx.clip("evenodd");
    var knurlTeeth = 64;
    for (var k = 0; k < knurlTeeth; k++) {
      var ka = (k / knurlTeeth) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ka) * innerR, cy + Math.sin(ka) * innerR);
      ctx.lineTo(cx + Math.cos(ka) * outerR, cy + Math.sin(ka) * outerR);
      ctx.strokeStyle = k % 2 === 0 ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.30)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.restore();

    // screws
    var screwR = R * 0.92;
    [45, 135, 225, 315].forEach(function (deg) {
      var a = (deg * Math.PI) / 180;
      var sx = cx + Math.cos(a) * screwR, sy = cy + Math.sin(a) * screwR;
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(sx - 3, sy);
      ctx.lineTo(sx + 3, sy);
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    // aperture-blade facets ring, just outside the glass
    var facetR = R * 0.54;
    var facetCount = 9;
    for (var f = 0; f < facetCount; f++) {
      var fa = (f / facetCount) * Math.PI * 2;
      var fa2 = ((f + 1) / facetCount) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, facetR, fa, fa2);
      ctx.closePath();
      ctx.fillStyle = f % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.10)";
      ctx.fill();
    }

    // inner glass
    var gR = R * 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, gR, 0, Math.PI * 2);
    var glassGrad = ctx.createRadialGradient(cx - gR * 0.3, cy - gR * 0.35, gR * 0.05, cx, cy, gR);
    glassGrad.addColorStop(0, "#3a4750");
    glassGrad.addColorStop(0.55, "#14181b");
    glassGrad.addColorStop(1, "#050506");
    ctx.fillStyle = glassGrad;
    ctx.fill();

    // concentric glass coating rings
    for (var gcr = 0; gcr < 3; gcr++) {
      ctx.beginPath();
      ctx.arc(cx, cy, gR * (0.55 + gcr * 0.15), 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(120,170,190,0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // specular highlight
    ctx.beginPath();
    ctx.ellipse(cx - gR * 0.32, cy - gR * 0.35, gR * 0.22, gR * 0.12, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.20)";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + gR * 0.28, cy + gR * 0.42, gR * 0.1, gR * 0.05, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();

    ctx.restore();
  }

  // ---------------------------------------------------------------------
  // Polaroid card (orientation aware)
  // ---------------------------------------------------------------------
  function drawPhotoCard(ctx, e, photoImg, orientation, captionText) {
    var dims = CARD_DIMS[orientation] || CARD_DIMS.vertical;
    var c = cameraCenter();
    var left = cardLeftAt(e, dims.w);
    var top = c.cy - dims.h / 2;
    var caption = (captionText || "").trim() || "INSTANT";

    ctx.save();
    ctx.shadowColor = "rgba(20,16,10,0.30)";
    ctx.shadowBlur = 32;
    ctx.shadowOffsetX = 14;
    ctx.shadowOffsetY = 10;
    roundRectPath(ctx, left, top, dims.w, dims.h, 5);
    ctx.fillStyle = "#fdfdfb";
    ctx.fill();
    ctx.restore();

    var pad = 18;
    var pX, pY, pW, pH;

    if (dims.side === "right") {
      pX = left + pad;
      pY = top + pad;
      pW = dims.w - pad - dims.margin - 8;
      pH = dims.h - pad * 2;
    } else {
      pX = left + pad;
      pY = top + pad;
      pW = dims.w - pad * 2;
      pH = dims.h - pad - dims.margin;
    }

    ctx.save();
    roundRectPath(ctx, pX, pY, pW, pH, 2);
    ctx.clip();
    if (photoImg) {
      var crop = coverRect(photoImg.naturalWidth || photoImg.width, photoImg.naturalHeight || photoImg.height, pW, pH);
      ctx.drawImage(photoImg, crop.sx, crop.sy, crop.sw, crop.sh, pX, pY, pW, pH);
    } else {
      var pg = ctx.createLinearGradient(pX, pY, pX + pW, pY + pH);
      pg.addColorStop(0, "#eceae4");
      pg.addColorStop(1, "#dedbd3");
      ctx.fillStyle = pg;
      ctx.fillRect(pX, pY, pW, pH);
      ctx.strokeStyle = "#c9c6bc";
      ctx.lineWidth = 2;
      for (var i = -pH; i < pW; i += 26) {
        ctx.beginPath();
        ctx.moveTo(pX + i, pY + pH);
        ctx.lineTo(pX + i + pH, pY);
        ctx.stroke();
      }
    }
    ctx.restore();

    roundRectPath(ctx, pX, pY, pW, pH, 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.stroke();

    if (!photoImg) {
      ctx.fillStyle = "#8b887f";
      ctx.font = "500 15px 'IBM Plex Sans KR', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("사진을 업로드하세요", pX + pW / 2, pY + pH / 2 + 5);
    }

    if (dims.side === "right") {
      // vertical margin strip on the right
      var mCenterX = left + dims.w - dims.margin / 2;
      ctx.fillStyle = "#9a968c";
      ctx.font = "500 13px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("N° 01", mCenterX, top + 34);

      ctx.save();
      ctx.translate(mCenterX, top + dims.h - 26);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "left";
      ctx.font = "600 15px 'Space Grotesk', sans-serif";
      ctx.fillStyle = "#5b5850";
      ctx.fillText(caption, 0, 0);
      ctx.restore();
    } else {
      ctx.fillStyle = "#9a968c";
      ctx.font = "500 13px 'IBM Plex Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText("N° 01", left + pad, top + dims.h - dims.margin + 40);
      ctx.textAlign = "right";
      ctx.font = "600 15px 'Space Grotesk', sans-serif";
      ctx.fillStyle = "#5b5850";
      ctx.fillText(caption, left + dims.w - pad, top + dims.h - dims.margin + 40);
    }
  }

  // ---------------------------------------------------------------------
  // Scene render
  // ---------------------------------------------------------------------
  function renderScene(ctx, phase, st) {
    var cameraColorDef = CAMERA_COLORS[st.cameraColorIndex];
    var bgColorDef = BG_COLORS[st.bgColorIndex];
    drawBackground(ctx, bgColorDef, st.bgMode, st.photoImg);
    var e = easeOutCubic(clamp(phase, 0, 1));
    drawPhotoCard(ctx, e, st.photoImg, st.orientation, st.captionText);
    drawCamera(ctx, cameraColorDef);
  }

  function render() {
    renderScene(ctxStage, state.phase, state);
    specCamera.textContent = CAMERA_COLORS[state.cameraColorIndex].label;
    specBg.textContent = state.bgMode === "blur" ? "PHOTO BLUR" : BG_COLORS[state.bgColorIndex].label;
    specOrient.textContent = state.orientation === "horizontal" ? "가로" : "세로";
    specScale.textContent = "×" + state.scale;
    phaseLabel.textContent = state.phase >= 1 ? "FRAME — STATIC" : "FRAME — EJECTING";
  }

  // ---------------------------------------------------------------------
  // UI wiring
  // ---------------------------------------------------------------------
  function buildSwatchGrid(container, palette, getIndex, setIndex) {
    palette.forEach(function (c, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "swatch" + (i === getIndex() ? " is-active" : "");
      b.style.background = c.body;
      b.title = c.label;
      var span = document.createElement("span");
      span.textContent = c.label;
      b.appendChild(span);
      b.addEventListener("click", function () {
        setIndex(i);
        Array.prototype.forEach.call(container.children, function (el) { el.classList.remove("is-active"); });
        b.classList.add("is-active");
        render();
      });
      container.appendChild(b);
    });
  }

  function buildSwatches() {
    buildSwatchGrid(
      cameraSwatchGrid,
      CAMERA_COLORS,
      function () { return state.cameraColorIndex; },
      function (i) { state.cameraColorIndex = i; }
    );
    buildSwatchGrid(
      bgSwatchGrid,
      BG_COLORS,
      function () { return state.bgColorIndex; },
      function (i) { state.bgColorIndex = i; }
    );
  }

  function setBgMode(mode) {
    state.bgMode = mode;
    bgModeColorBtn.classList.toggle("is-active", mode === "color");
    bgModeBlurBtn.classList.toggle("is-active", mode === "blur");
    bgColorBlock.style.display = mode === "blur" ? "none" : "";
    bgNote.textContent = mode === "blur"
      ? "업로드한 사진을 흐리게 처리해 배경으로 사용해요. 사진이 없으면 컬러로 표시됩니다."
      : "배경 컬러를 카메라 컬러와 별도로 고를 수 있어요.";
    render();
  }

  function setOrientation(orientation) {
    state.orientation = orientation;
    orientVerticalBtn.classList.toggle("is-active", orientation === "vertical");
    orientHorizontalBtn.classList.toggle("is-active", orientation === "horizontal");
    render();
  }

  function handlePhotoFile(file) {
    if (!file || !file.type.match(/^image\//)) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        state.photoImg = img;
        photoStatus.textContent = file.name + " 적용됨";
        statusText.textContent = "사진이 적용되었어요. 컬러와 배율을 조정해보세요.";
        render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  pickPhotoBtn.addEventListener("click", function () { photoInput.click(); });
  photoInput.addEventListener("change", function (e) {
    if (e.target.files && e.target.files[0]) handlePhotoFile(e.target.files[0]);
  });

  bgModeColorBtn.addEventListener("click", function () { setBgMode("color"); });
  bgModeBlurBtn.addEventListener("click", function () { setBgMode("blur"); });

  orientVerticalBtn.addEventListener("click", function () { setOrientation("vertical"); });
  orientHorizontalBtn.addEventListener("click", function () { setOrientation("horizontal"); });

  captionInput.addEventListener("input", function () {
    state.captionText = captionInput.value;
    render();
  });

  scaleRange.addEventListener("input", function () {
    state.scale = parseInt(scaleRange.value, 10);
    scaleVal.textContent = "×" + state.scale;
    render();
  });

  gifRange.addEventListener("input", function () {
    state.gifSeconds = parseFloat(gifRange.value);
    gifVal.textContent = state.gifSeconds.toFixed(1) + "s";
  });

  gifLoopBox.addEventListener("change", function () {
    state.gifLoop = gifLoopBox.checked;
  });

  // preview animation (visible canvas only — not exported)
  var rafId = null;
  playPreviewBtn.addEventListener("click", function () {
    if (state.playing) {
      state.playing = false;
      if (rafId) cancelAnimationFrame(rafId);
      state.phase = 1;
      render();
      playPreviewBtn.textContent = "▶ 배출 애니메이션 미리보기";
      return;
    }
    state.playing = true;
    playPreviewBtn.textContent = "■ 정지";
    var duration = state.gifSeconds * 1000;
    var start = performance.now();
    function tick(now) {
      var t = clamp((now - start) / duration, 0, 1);
      state.phase = t;
      render();
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        state.playing = false;
        playPreviewBtn.textContent = "▶ 배출 애니메이션 미리보기";
      }
    }
    rafId = requestAnimationFrame(tick);
  });

  // ---------------------------------------------------------------------
  // PNG export — same composition, rendered at N× resolution
  // ---------------------------------------------------------------------
  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  downloadPngBtn.addEventListener("click", function () {
    downloadPngBtn.disabled = true;
    statusText.textContent = "PNG 렌더링 중… (×" + state.scale + ")";
    setTimeout(function () {
      var scale = state.scale;
      var off = document.createElement("canvas");
      off.width = W * scale;
      off.height = H * scale;
      var octx = off.getContext("2d");
      octx.scale(scale, scale);
      renderScene(octx, 1, state);
      off.toBlob(function (blob) {
        downloadBlob(blob, "instant-print-card.png");
        statusText.textContent = "PNG 저장 완료 (" + off.width + "×" + off.height + ")";
        downloadPngBtn.disabled = false;
      }, "image/png");
    }, 30);
  });

  // ---------------------------------------------------------------------
  // GIF export — median-cut palette + LZW encoder (no external libraries)
  // ---------------------------------------------------------------------
  function buildPaletteFromImageData(data, maxColors) {
    var samples = [];
    for (var i = 0; i < data.length; i += 4 * 5) {
      samples.push([data[i], data[i + 1], data[i + 2]]);
    }
    var boxes = [samples];

    function channelRange(pixels) {
      var mins = [255, 255, 255], maxs = [0, 0, 0];
      for (var j = 0; j < pixels.length; j++) {
        var p = pixels[j];
        for (var c = 0; c < 3; c++) {
          if (p[c] < mins[c]) mins[c] = p[c];
          if (p[c] > maxs[c]) maxs[c] = p[c];
        }
      }
      return { mins: mins, maxs: maxs };
    }

    while (boxes.length < maxColors) {
      var bestIdx = -1, bestRange = -1, bestChannel = 0;
      for (var b = 0; b < boxes.length; b++) {
        if (boxes[b].length < 2) continue;
        var rg = channelRange(boxes[b]);
        var ranges = [rg.maxs[0] - rg.mins[0], rg.maxs[1] - rg.mins[1], rg.maxs[2] - rg.mins[2]];
        var mx = Math.max(ranges[0], ranges[1], ranges[2]);
        if (mx > bestRange) { bestRange = mx; bestIdx = b; bestChannel = ranges.indexOf(mx); }
      }
      if (bestIdx === -1 || bestRange <= 0) break;
      var box = boxes[bestIdx];
      box.sort(function (p, q) { return p[bestChannel] - q[bestChannel]; });
      var mid = box.length >> 1;
      boxes.splice(bestIdx, 1, box.slice(0, mid), box.slice(mid));
    }

    return boxes.map(function (pixels) {
      var sum = [0, 0, 0];
      for (var j = 0; j < pixels.length; j++) { sum[0] += pixels[j][0]; sum[1] += pixels[j][1]; sum[2] += pixels[j][2]; }
      var n = pixels.length || 1;
      return [Math.round(sum[0] / n), Math.round(sum[1] / n), Math.round(sum[2] / n)];
    });
  }

  function makeNearestIndexFn(palette) {
    var cache = new Map();
    return function (r, g, b) {
      var key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      var hit = cache.get(key);
      if (hit !== undefined) return hit;
      var best = 0, bestDist = Infinity;
      for (var i = 0; i < palette.length; i++) {
        var p = palette[i];
        var dr = p[0] - r, dg = p[1] - g, db = p[2] - b;
        var d = dr * dr + dg * dg + db * db;
        if (d < bestDist) { bestDist = d; best = i; }
      }
      cache.set(key, best);
      return best;
    };
  }

  function imageDataToIndices(data, w, h, nearestIndexFn) {
    var out = new Uint8Array(w * h);
    for (var i = 0, p = 0; i < data.length; i += 4, p++) {
      out[p] = nearestIndexFn(data[i], data[i + 1], data[i + 2]);
    }
    return out;
  }

  // --- byte writer -------------------------------------------------------
  function ByteWriter() { this.bytes = []; }
  ByteWriter.prototype.writeByte = function (b) { this.bytes.push(b & 0xff); };
  ByteWriter.prototype.writeBytes = function (arr, offset, length) {
    offset = offset || 0; length = length === undefined ? arr.length : length;
    for (var i = 0; i < length; i++) this.bytes.push(arr[offset + i] & 0xff);
  };
  ByteWriter.prototype.writeString = function (s) {
    for (var i = 0; i < s.length; i++) this.writeByte(s.charCodeAt(i));
  };
  ByteWriter.prototype.toUint8Array = function () { return new Uint8Array(this.bytes); };

  // --- LZW encoder (standard GIF LZW/variable-width code algorithm) ------
  var EOF = -1, BITS = 12, HSIZE = 5003;
  var MASKS = [0x0000, 0x0001, 0x0003, 0x0007, 0x000F, 0x001F, 0x003F, 0x007F,
    0x00FF, 0x01FF, 0x03FF, 0x07FF, 0x0FFF, 0x1FFF, 0x3FFF, 0x7FFF, 0xFFFF];

  function LZWEncoder(width, height, pixels, colorDepth) {
    var initCodeSize = Math.max(2, colorDepth);
    var accum = new Uint8Array(256);
    var htab = new Int32Array(HSIZE);
    var codetab = new Int32Array(HSIZE);
    var curAccum = 0, curBits = 0;
    var aCount = 0;
    var freeEnt = 0;
    var maxcode = 0;
    var clearFlg = false;
    var gInitBits = 0, clearCode = 0, eofCode = 0;
    var remaining = 0, curPixel = 0;
    var nBits = 0;

    function maxcodeFor(n) { return (1 << n) - 1; }

    function charOut(c, outs) {
      accum[aCount++] = c;
      if (aCount >= 254) flushChar(outs);
    }
    function flushChar(outs) {
      if (aCount > 0) {
        outs.writeByte(aCount);
        outs.writeBytes(accum, 0, aCount);
        aCount = 0;
      }
    }
    function clHash(hsize) { for (var i = 0; i < hsize; i++) htab[i] = -1; }
    function clBlock(outs) {
      clHash(HSIZE);
      freeEnt = clearCode + 2;
      clearFlg = true;
      output(clearCode, outs);
    }
    function nextPixel() {
      if (remaining === 0) return EOF;
      remaining--;
      var px = pixels[curPixel++];
      return px & 0xff;
    }
    function output(code, outs) {
      curAccum &= MASKS[curBits];
      if (curBits > 0) curAccum |= (code << curBits);
      else curAccum = code;
      curBits += nBits;
      while (curBits >= 8) {
        charOut(curAccum & 0xff, outs);
        curAccum >>= 8;
        curBits -= 8;
      }
      if (freeEnt > maxcode || clearFlg) {
        if (clearFlg) {
          nBits = gInitBits;
          maxcode = maxcodeFor(nBits);
          clearFlg = false;
        } else {
          nBits++;
          maxcode = nBits === BITS ? (1 << BITS) : maxcodeFor(nBits);
        }
      }
      if (code === eofCode) {
        while (curBits > 0) {
          charOut(curAccum & 0xff, outs);
          curAccum >>= 8;
          curBits -= 8;
        }
        flushChar(outs);
      }
    }
    function compress(initBits, outs) {
      var fcode, c, i, ent, disp, hshift;
      gInitBits = initBits;
      clearFlg = false;
      nBits = gInitBits;
      maxcode = maxcodeFor(nBits);
      clearCode = 1 << (initBits - 1);
      eofCode = clearCode + 1;
      freeEnt = clearCode + 2;
      aCount = 0;
      ent = nextPixel();
      hshift = 0;
      for (fcode = HSIZE; fcode < 65536; fcode *= 2) hshift++;
      hshift = 8 - hshift;
      clHash(HSIZE);
      output(clearCode, outs);

      outerLoop:
      while ((c = nextPixel()) !== EOF) {
        fcode = (c << BITS) + ent;
        i = (c << hshift) ^ ent;
        if (htab[i] === fcode) { ent = codetab[i]; continue; }
        else if (htab[i] >= 0) {
          disp = HSIZE - i;
          if (i === 0) disp = 1;
          do {
            i -= disp;
            if (i < 0) i += HSIZE;
            if (htab[i] === fcode) { ent = codetab[i]; continue outerLoop; }
          } while (htab[i] >= 0);
        }
        output(ent, outs);
        ent = c;
        if (freeEnt < (1 << BITS)) {
          codetab[i] = freeEnt++;
          htab[i] = fcode;
        } else {
          clBlock(outs);
        }
      }
      output(ent, outs);
      output(eofCode, outs);
    }

    this.encode = function (outs) {
      outs.writeByte(initCodeSize);
      remaining = width * height;
      curPixel = 0;
      compress(initCodeSize + 1, outs);
      outs.writeByte(0);
    };
  }

  function encodeGIF(opts) {
    var width = opts.width, height = opts.height, palette = opts.palette, frames = opts.frames, loop = opts.loop;
    var bits = Math.max(1, Math.ceil(Math.log2(palette.length)));
    var tableSize = 1 << bits;
    var paddedPalette = palette.slice();
    while (paddedPalette.length < tableSize) paddedPalette.push([0, 0, 0]);

    var out = new ByteWriter();
    out.writeString("GIF89a");
    out.writeByte(width & 0xff); out.writeByte((width >> 8) & 0xff);
    out.writeByte(height & 0xff); out.writeByte((height >> 8) & 0xff);
    out.writeByte(0x80 | (7 << 4) | (bits - 1));
    out.writeByte(0);
    out.writeByte(0);
    for (var i = 0; i < tableSize; i++) {
      var c = paddedPalette[i];
      out.writeByte(c[0]); out.writeByte(c[1]); out.writeByte(c[2]);
    }
    if (loop) {
      out.writeByte(0x21); out.writeByte(0xff); out.writeByte(11);
      out.writeString("NETSCAPE2.0");
      out.writeByte(3); out.writeByte(1);
      out.writeByte(0); out.writeByte(0);
      out.writeByte(0);
    }
    frames.forEach(function (frame) {
      out.writeByte(0x21); out.writeByte(0xf9); out.writeByte(4);
      out.writeByte(0x08); // disposal: restore to background
      var delayCs = Math.max(2, Math.round(frame.delay / 10));
      out.writeByte(delayCs & 0xff); out.writeByte((delayCs >> 8) & 0xff);
      out.writeByte(0);
      out.writeByte(0);
      out.writeByte(0x2c);
      out.writeByte(0); out.writeByte(0);
      out.writeByte(0); out.writeByte(0);
      out.writeByte(width & 0xff); out.writeByte((width >> 8) & 0xff);
      out.writeByte(height & 0xff); out.writeByte((height >> 8) & 0xff);
      out.writeByte(0);
      var lzw = new LZWEncoder(width, height, frame.indices, bits);
      lzw.encode(out);
    });
    out.writeByte(0x3b);
    return out.toUint8Array();
  }

  downloadGifBtn.addEventListener("click", function () {
    downloadGifBtn.disabled = true;
    downloadPngBtn.disabled = true;
    playPreviewBtn.disabled = true;
    statusText.textContent = "GIF 프레임 렌더링 중…";

    setTimeout(function () {
      var gifScale = 1.6;
      var gw = Math.round(W * gifScale), gh = Math.round(H * gifScale);
      var off = document.createElement("canvas");
      off.width = gw; off.height = gh;
      var octx = off.getContext("2d");
      octx.scale(gifScale, gifScale);

      var slideSteps = 16, holdSteps = 6;
      var totalMs = state.gifSeconds * 1000;
      var perFrameMs = totalMs / (slideSteps + holdSteps);
      var phases = [];
      for (var s = 0; s <= slideSteps; s++) phases.push(s / slideSteps);
      for (var h = 0; h < holdSteps; h++) phases.push(1);

      var rawFrames = [];
      phases.forEach(function (ph) {
        renderScene(octx, ph, state);
        rawFrames.push(octx.getImageData(0, 0, gw, gh));
      });

      statusText.textContent = "GIF 색상 팔레트 계산 중…";
      setTimeout(function () {
        var palette = buildPaletteFromImageData(rawFrames[rawFrames.length - 1].data, 256);
        var nearest = makeNearestIndexFn(palette);

        statusText.textContent = "GIF 인코딩 중… (" + rawFrames.length + "프레임)";
        setTimeout(function () {
          var frames = rawFrames.map(function (imgData) {
            return { indices: imageDataToIndices(imgData.data, gw, gh, nearest), delay: perFrameMs };
          });
          var bytes = encodeGIF({ width: gw, height: gh, palette: palette, frames: frames, loop: state.gifLoop });
          var blob = new Blob([bytes], { type: "image/gif" });
          downloadBlob(blob, "instant-print-card.gif");
          statusText.textContent = "GIF 저장 완료 (" + gw + "×" + gh + ", " + frames.length + "프레임)";
          downloadGifBtn.disabled = false;
          downloadPngBtn.disabled = false;
          playPreviewBtn.disabled = false;
          state.phase = 1;
          render();
        }, 20);
      }, 20);
    }, 30);
  });

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------
  buildSwatches();
  render();
})();
