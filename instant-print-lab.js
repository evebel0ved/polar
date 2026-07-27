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
    bodyX: 140, bodyY: 250, bodyW: 620, bodyH: 424, bodyR: 36,
    shoulderH: 94
  };

  var CARD_DIMS = {
    vertical:   { w: 480, h: 580, side: "bottom", margin: 108 },
    // horizontal card is height-capped so it never extends past the
    // camera body's top/bottom edges (see cameraCenter() below)
    horizontal: { w: 430, h: 300, side: "right",  margin: 92 }
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
  // Camera — detailed body render (rounded-body instant camera with a
  // large center lens, inspired by classic instant-camera proportions —
  // no brand names or wordmarks are drawn anywhere on the body/lens)
  // ---------------------------------------------------------------------
  function drawToggleKnob(ctx, x, y, r, body, isDark) {
    ctx.save();

    // recessed body-colored collar the knob sits inside
    ctx.beginPath();
    ctx.arc(x, y, r * 1.22, 0, Math.PI * 2);
    ctx.fillStyle = shade(body, isDark ? -14 : -10);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, r * 1.22, 0, Math.PI * 2);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = shade(body, isDark ? 6 : -22);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r * 1.08, Math.PI * 0.9, Math.PI * 1.6);
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // dark knurled dial face
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    var grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.15, x, y, r);
    grad.addColorStop(0, "#38393a");
    grad.addColorStop(0.6, "#19191b");
    grad.addColorStop(1, "#050506");
    ctx.fillStyle = grad;
    ctx.fill();

    // fine ridged edge
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    var teeth = 40;
    for (var t = 0; t < teeth; t++) {
      var ta = (t / teeth) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(ta) * r * 0.86, y + Math.sin(ta) * r * 0.86);
      ctx.lineTo(x + Math.cos(ta) * r, y + Math.sin(ta) * r);
      ctx.strokeStyle = t % 2 === 0 ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
    ctx.restore();

    ctx.lineWidth = 1.4;
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.stroke();

    // thin metallic rim highlight (top-left arc)
    ctx.beginPath();
    ctx.arc(x, y, r - 2, Math.PI * 1.05, Math.PI * 1.75);
    ctx.strokeStyle = "rgba(255,255,255,0.24)";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // raised center dial
    ctx.beginPath();
    ctx.arc(x, y, r * 0.62, 0, Math.PI * 2);
    var capGrad = ctx.createRadialGradient(x - r * 0.2, y - r * 0.24, r * 0.05, x, y, r * 0.62);
    capGrad.addColorStop(0, "#333537");
    capGrad.addColorStop(0.7, "#141416");
    capGrad.addColorStop(1, "#020203");
    ctx.fillStyle = capGrad;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.stroke();

    // two position-marker dots + pointer notch, offset like a real index mark
    [-0.62, 0.62].forEach(function (off) {
      var a = -Math.PI / 2 + off;
      var dx = x + Math.cos(a) * r * 0.4;
      var dy = y + Math.sin(a) * r * 0.4;
      ctx.beginPath();
      ctx.arc(dx, dy, r * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(238,236,232,0.9)";
      ctx.fill();
    });
    ctx.beginPath();
    ctx.ellipse(x - r * 0.16, y - r * 0.18, r * 0.09, r * 0.05, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fill();
    ctx.restore();
  }

  function drawWindow(ctx, x, y, w, h) {
    ctx.save();
    roundRectPath(ctx, x, y, w, h, 8);
    var grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, "#4c5054");
    grad.addColorStop(1, "#1b1c1e");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.stroke();
    roundRectPath(ctx, x + 5, y + 4, w * 0.42, h * 0.34, 4);
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fill();
    ctx.restore();
  }

  function drawShutterButton(ctx, x, y, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "#e2e2df";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, r * 0.86, 0, Math.PI * 2);
    var grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * 0.86);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.55, "#cfcfcb");
    grad.addColorStop(1, "#a5a5a0");
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, r * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(x - r * 0.3, y - r * 0.34, r * 0.28, r * 0.15, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fill();
    ctx.restore();
  }

  function drawStatusLED(ctx, x, y, w, h) {
    ctx.save();
    roundRectPath(ctx, x, y, w, h, w / 2);
    var grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, "#e2685a");
    grad.addColorStop(0.5, "#b5382a");
    grad.addColorStop(1, "#7c2018");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.32, y + h * 0.22, w * 0.28, h * 0.14, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fill();
    ctx.restore();
  }

  function drawRidgedSwitch(ctx, x, y, w, h, body, isDark) {
    ctx.save();
    // sunken bezel
    roundRectPath(ctx, x - 3, y - 3, w + 6, h + 6, (h + 6) / 2);
    ctx.fillStyle = shade(body, isDark ? -22 : -16);
    ctx.fill();

    roundRectPath(ctx, x, y, w, h, h / 2);
    ctx.clip();
    var g = ctx.createLinearGradient(x, y, x, y + h);
    var base = shade(body, isDark ? -20 : -26);
    g.addColorStop(0, shade(base, 10));
    g.addColorStop(0.5, base);
    g.addColorStop(1, shade(base, -12));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);

    // diagonal cross-hatched waffle texture
    ctx.strokeStyle = isDark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.28)";
    ctx.lineWidth = 1.1;
    var step = 5.5;
    for (var i = -h; i < w + h; i += step) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i + h, y + h);
      ctx.stroke();
    }
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.16)";
    for (var j = -h; j < w + h; j += step) {
      ctx.beginPath();
      ctx.moveTo(x + j, y + h);
      ctx.lineTo(x + j + h, y);
      ctx.stroke();
    }
    ctx.restore();

    roundRectPath(ctx, x, y, w, h, h / 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.25)";
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.14, y + 1.4);
    ctx.lineTo(x + w * 0.86, y + 1.4);
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawTopNub(ctx, x, y, w, h, angle, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    roundRectPath(ctx, -w / 2, -h / 2, w, h, h / 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    ctx.stroke();
    ctx.restore();
  }

  function drawBodyLightSweep(ctx, L, isDark) {
    ctx.save();
    roundRectPath(ctx, L.bodyX, L.bodyY, L.bodyW, L.bodyH, L.bodyR);
    ctx.clip();
    ctx.globalCompositeOperation = "soft-light";
    var g = ctx.createRadialGradient(
      L.bodyX + L.bodyW * 0.2, L.bodyY + L.bodyH * 0.42, 10,
      L.bodyX + L.bodyW * 0.2, L.bodyY + L.bodyH * 0.42, L.bodyW * 0.75
    );
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.35, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(L.bodyX, L.bodyY, L.bodyW, L.bodyH);

    ctx.globalCompositeOperation = "source-over";
    var g2 = ctx.createLinearGradient(L.bodyX, L.bodyY, L.bodyX + L.bodyW * 0.55, L.bodyY + L.bodyH * 0.55);
    g2.addColorStop(0, isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.40)");
    g2.addColorStop(0.5, isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.10)");
    g2.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g2;
    ctx.fillRect(L.bodyX, L.bodyY, L.bodyW, L.bodyH);
    ctx.restore();
  }

  function drawGearedTopDial(ctx, x, y, r, isDark) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, "#3d3d3f");
    g.addColorStop(0.65, "#1c1c1e");
    g.addColorStop(1, "#060607");
    ctx.fillStyle = g;
    ctx.fill();
    var teeth = 28;
    for (var t = 0; t < teeth; t++) {
      var ta = (t / teeth) * Math.PI * 2;
      var x1 = x + Math.cos(ta) * r * 0.86, y1 = y + Math.sin(ta) * r * 0.86;
      var x2 = x + Math.cos(ta) * r, y2 = y + Math.sin(ta) * r;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = t % 2 === 0 ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.4)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, r - 1.5, Math.PI * 1.05, Math.PI * 1.7);
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  function drawLogoDot(ctx, x, y, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, "#e34432");
    g.addColorStop(0.55, "#c1281c");
    g.addColorStop(1, "#8c1912");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = r * 0.09;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x - r * 0.28, y - r * 0.32, r * 0.32, r * 0.16, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fill();
    ctx.restore();
  }

  function drawCamera(ctx, colorDef) {
    var L = LAYOUT;
    var body = colorDef.body;
    var isDark = isDarkColor(body);
    var bw = L.bodyW, bh = L.bodyH, bx = L.bodyX, by = L.bodyY;
    var k = bw / 620; // proportional scale for hardware sizing

    ctx.save();
    ctx.shadowColor = "rgba(20,16,12,0.28)";
    ctx.shadowBlur = 40 * k;
    ctx.shadowOffsetY = 18 * k;

    // body
    roundRectPath(ctx, bx, by, bw, bh, L.bodyR);
    var bodyGrad = ctx.createLinearGradient(0, by, 0, by + bh);
    bodyGrad.addColorStop(0, shade(body, isDark ? 6 : 10));
    bodyGrad.addColorStop(0.4, body);
    bodyGrad.addColorStop(1, shade(body, isDark ? -10 : -6));
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.restore();

    // body edge line
    roundRectPath(ctx, bx, by, bw, bh, L.bodyR);
    ctx.lineWidth = 2;
    ctx.strokeStyle = shade(body, isDark ? 14 : -14);
    ctx.stroke();

    // faint top hardware — strap lug (left) and geared advance dial with
    // strap lug (right), both low-contrast like the reference photo
    drawTopNub(ctx, bx + bw * 0.22, by - 1 * k, 22 * k, 10 * k, -0.05, shade(body, isDark ? 8 : -5));
    drawTopNub(ctx, bx + bw * 0.70, by - 2 * k, 18 * k, 18 * k, 0, shade(body, isDark ? 8 : -5));
    drawGearedTopDial(ctx, bx + bw * 0.70, by + 3 * k, 15 * k, isDark);

    // shoulder plate — a neutral silver-grey top panel, independent of the
    // body shell color (matches the reference: the top plate reads as a
    // fixed metal/plastic tone across every colorway, only going dark on
    // the charcoal body)
    var plateColor = isDark ? shade(body, -4) : "#d8d7d3";
    roundRectPath(ctx, bx, by, bw, L.shoulderH, { tl: L.bodyR, tr: L.bodyR, br: 0, bl: 0 });
    var plateGrad = ctx.createLinearGradient(0, by, 0, by + L.shoulderH);
    plateGrad.addColorStop(0, shade(plateColor, 8));
    plateGrad.addColorStop(1, shade(plateColor, -10));
    ctx.fillStyle = plateGrad;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bx, by + L.shoulderH + 0.5);
    ctx.lineTo(bx + bw, by + L.shoulderH + 0.5);
    ctx.strokeStyle = shade(plateColor, -30);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    var shY = by + L.shoulderH * 0.56;

    // red logo dot (no lettering)
    drawLogoDot(ctx, bx + bw * 0.354, shY, bw * 0.038);

    // grey sensor / viewfinder window
    var winW = bw * 0.08, winH = winW * 0.62;
    drawWindow(ctx, bx + bw * 0.506 - winW / 2, shY - winH / 2, winW, winH);

    // chrome shutter button
    drawShutterButton(ctx, bx + bw * 0.657, shY, bw * 0.042);

    // red vertical status LED
    drawStatusLED(ctx, bx + bw * 0.771 - bw * 0.009, shY - L.shoulderH * 0.33, bw * 0.018, L.shoulderH * 0.62);

    // pill-shaped waffle switch (far right of shoulder)
    drawRidgedSwitch(ctx, bx + bw * 0.851 - bw * 0.064, shY - L.shoulderH * 0.24, bw * 0.129, L.shoulderH * 0.46, body, isDark);

    // bottom-left toggle knob
    var c = cameraCenter();
    drawToggleKnob(ctx, bx + bw * 0.171, by + bh * 0.79, bw * 0.054, body, isDark);

    // lens assembly
    drawLens(ctx, c.cx, c.cy, bw * 0.237);

    // soft diagonal light sweep across the body for a glossier, 3D feel
    drawBodyLightSweep(ctx, L, isDark);

    // subtle bottom inner shadow (ground the body, add depth)
    ctx.save();
    roundRectPath(ctx, L.bodyX, L.bodyY, L.bodyW, L.bodyH, L.bodyR);
    ctx.clip();
    var bs = ctx.createLinearGradient(0, L.bodyY + L.bodyH - 60, 0, L.bodyY + L.bodyH);
    bs.addColorStop(0, "rgba(0,0,0,0)");
    bs.addColorStop(1, isDark ? "rgba(0,0,0,0.28)" : "rgba(20,16,10,0.14)");
    ctx.fillStyle = bs;
    ctx.fillRect(L.bodyX, L.bodyY + L.bodyH - 60, L.bodyW, 60);
    ctx.restore();

    ctx.restore();
  }

  function drawLens(ctx, cx, cy, R) {
    ctx.save();

    // recessed mount collar (depth behind the lens)
    ctx.beginPath();
    ctx.arc(cx, cy, R + 14, 0, Math.PI * 2);
    ctx.fillStyle = "#030303";
    ctx.fill();

    // thin bright chrome trim ring where the lens meets the body
    ctx.beginPath();
    ctx.arc(cx, cy, R + 6, 0, Math.PI * 2);
    var trimGrad = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    trimGrad.addColorStop(0, "#e9e9e6");
    trimGrad.addColorStop(0.5, "#8b8b86");
    trimGrad.addColorStop(1, "#3a3a38");
    ctx.strokeStyle = trimGrad;
    ctx.lineWidth = 3;
    ctx.stroke();

    // outer bezel
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    var bezelGrad = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
    bezelGrad.addColorStop(0, "#333230");
    bezelGrad.addColorStop(1, "#0d0c0b");
    ctx.fillStyle = bezelGrad;
    ctx.fill();

    // outer knurled ring band (dense fine ridges, like a focus/filter ring)
    var knOuter = R, knInner = R * 0.82;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, knOuter, 0, Math.PI * 2);
    ctx.arc(cx, cy, knInner, 0, Math.PI * 2, true);
    ctx.clip("evenodd");
    var teeth = 130;
    for (var t = 0; t < teeth; t++) {
      var ta = (t / teeth) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ta) * knInner, cy + Math.sin(ta) * knInner);
      ctx.lineTo(cx + Math.cos(ta) * knOuter, cy + Math.sin(ta) * knOuter);
      ctx.strokeStyle = t % 2 === 0 ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.4)";
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, knInner, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // smooth recessed ring (focus collar) between the knurl and the dome
    var smoothOuter = knInner, smoothInner = R * 0.6;
    ctx.beginPath();
    ctx.arc(cx, cy, (smoothOuter + smoothInner) / 2, 0, Math.PI * 2);
    ctx.lineWidth = smoothOuter - smoothInner;
    var ringGrad = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    ringGrad.addColorStop(0, "#232220");
    ringGrad.addColorStop(0.5, "#141312");
    ringGrad.addColorStop(1, "#050505");
    ctx.strokeStyle = ringGrad;
    ctx.stroke();

    // screws around the smooth ring
    var screwR = (smoothOuter + smoothInner) / 2;
    [30, 150, 210, 330].forEach(function (deg) {
      var a = (deg * Math.PI) / 180;
      var sx = cx + Math.cos(a) * screwR, sy = cy + Math.sin(a) * screwR;
      ctx.beginPath();
      ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(sx - 2.6, sy);
      ctx.lineTo(sx + 2.6, sy);
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    // aperture-blade facets ring, just outside the glass dome
    var facetR = R * 0.56;
    var facetCount = 14;
    for (var f = 0; f < facetCount; f++) {
      var fa = (f / facetCount) * Math.PI * 2;
      var fa2 = ((f + 1) / facetCount) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, facetR, fa, fa2);
      ctx.closePath();
      ctx.fillStyle = f % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.12)";
      ctx.fill();
    }

    // glossy black lens dome
    var gR = R * 0.54;
    ctx.beginPath();
    ctx.arc(cx, cy, gR, 0, Math.PI * 2);
    var glassGrad = ctx.createRadialGradient(cx - gR * 0.3, cy - gR * 0.35, gR * 0.05, cx, cy, gR);
    glassGrad.addColorStop(0, "#333a3f");
    glassGrad.addColorStop(0.5, "#121517");
    glassGrad.addColorStop(1, "#020202");
    ctx.fillStyle = glassGrad;
    ctx.fill();

    // fine concentric grooves inside the dome
    for (var gc = 1; gc <= 8; gc++) {
      ctx.beginPath();
      ctx.arc(cx, cy, gR * (gc / 9), 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.045)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // center pin, offset slightly like a real lens axis screw
    ctx.beginPath();
    ctx.arc(cx - gR * 0.06, cy + gR * 0.08, gR * 0.09, 0, Math.PI * 2);
    var pinGrad = ctx.createRadialGradient(cx - gR * 0.1, cy + gR * 0.04, 1, cx - gR * 0.06, cy + gR * 0.08, gR * 0.09);
    pinGrad.addColorStop(0, "#4a4f52");
    pinGrad.addColorStop(1, "#0a0b0c");
    ctx.fillStyle = pinGrad;
    ctx.fill();

    // broad photographic highlight sweep across the upper-left of the lens
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    var sweep = ctx.createLinearGradient(cx - R, cy - R, cx + R * 0.2, cy + R * 0.2);
    sweep.addColorStop(0, "rgba(255,255,255,0.22)");
    sweep.addColorStop(0.35, "rgba(255,255,255,0.05)");
    sweep.addColorStop(0.5, "rgba(255,255,255,0)");
    ctx.fillStyle = sweep;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();

    // crisp specular highlights on the glass dome
    ctx.beginPath();
    ctx.ellipse(cx - gR * 0.32, cy - gR * 0.36, gR * 0.24, gR * 0.13, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + gR * 0.3, cy + gR * 0.4, gR * 0.11, gR * 0.05, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
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
