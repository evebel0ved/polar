(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // Constants & state
  // ---------------------------------------------------------------------
  var W = 1400, H = 800;

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
    orientation: "vertical", //   "horizontal"
    captionText: "MOMENT",
    serialText: "N° 01",       // customizable frame-number label printed on the card margin
    photoImg: null,
    photoImg2: null,           // 2nd photo — only used for video (stacks on top of photo 1)
    photoImg3: null,           // 3rd photo — only used for video (stacks on top of photo 2)
    scale: 6,
    gifSeconds: 3,
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
  var photoInput2 = document.getElementById("photoInput2");
  var pickPhoto2Btn = document.getElementById("pickPhoto2");
  var photoStatus2 = document.getElementById("photoStatus2");
  var photoInput3 = document.getElementById("photoInput3");
  var pickPhoto3Btn = document.getElementById("pickPhoto3");
  var photoStatus3 = document.getElementById("photoStatus3");
  var serialInput = document.getElementById("serialInput");
  var cameraSwatchGrid = document.getElementById("cameraSwatchGrid");
  var bgSwatchGrid = document.getElementById("bgSwatchGrid");
  var orientVerticalBtn = document.getElementById("orientVertical");
  var orientHorizontalBtn = document.getElementById("orientHorizontal");
  var captionInput = document.getElementById("captionInput");
  var scaleRange = document.getElementById("scaleRange");
  var scaleVal = document.getElementById("scaleVal");
  var gifRange = document.getElementById("gifRange");
  var gifVal = document.getElementById("gifVal");
  var playPreviewBtn = document.getElementById("playPreview");
  var downloadPngBtn = document.getElementById("downloadPng");

  // ---------------------------------------------------------------------
  // Small utilities
  // ---------------------------------------------------------------------
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  // Used to cap video export resolution on Android — see the video
  // export block below for why (weaker/inconsistent hardware H.264
  // encoders on some Android devices drop frames or crash the GPU
  // process at larger canvas sizes; iOS/desktop don't need the cap).
  function isAndroid() {
    return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent || "");
  }

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
  // Scene layout
  // ---------------------------------------------------------------------

  var VERTICAL_MARGIN = 250;

  var CARD_DIMS = {
   
    vertical:   { w: 420, h: 500, side: "bottom", margin: 92 },
    horizontal: { w: 440, h: 300, side: "right",  margin: 76 }
  };

  function computeHorizontalLayout() {
    var bodyW = 620, bodyH = 424, bodyR = 36, shoulderH = 76;
    var bodyY = Math.max(24, Math.round((H - bodyH) / 2) - 18);
    return { bodyX: 180, bodyY: bodyY, bodyW: bodyW, bodyH: bodyH, bodyR: bodyR, shoulderH: shoulderH };
  }


  function computeVerticalLayout() {
    var VERTICAL_SCALE = 580 / 620;
   
    var bodyW = 620 * VERTICAL_SCALE, bodyH = 424 * VERTICAL_SCALE,
        bodyR = 36 * VERTICAL_SCALE, shoulderH = 76 * VERTICAL_SCALE;
   
    var bodyY = VERTICAL_MARGIN;
    return {
      bodyX: (W - bodyW) / 2,
      bodyY: bodyY,
      bodyW: bodyW, bodyH: bodyH, bodyR: bodyR, shoulderH: shoulderH
    };
  }

  function getLayout(orientation) {
    return orientation === "vertical" ? computeVerticalLayout() : computeHorizontalLayout();
  }


  function applyOrientationDims(orientation) {
    if (orientation === "vertical") {
      
      var vs = 580 / 620;
      var contentH = 424 * vs + CARD_DIMS.vertical.h;
      var side = Math.round(contentH + VERTICAL_MARGIN * 2);
      W = side; H = side;
    } else {
      W = 1400; H = 800;  // shorter canvas — less empty space above/below
    }
    stage.width = W;
    stage.height = H;
  }

  function cameraCenter(L) {
    L = L || computeHorizontalLayout();
    return {
      cx: L.bodyX + L.bodyW / 2,
      cy: L.bodyY + L.shoulderH + (L.bodyH - L.shoulderH) / 2
    };
  }


  function cardLeftAt(e, cardW, L) {
    var rightEdge = L.bodyX + L.bodyW;
    var CARD_OVERLAP = 20;
    var SHADOW_CLEARANCE = 50;
    var startX = rightEdge - cardW - SHADOW_CLEARANCE;
    var endX = rightEdge - CARD_OVERLAP;
    return lerp(startX, endX, e);
  }

 
  function cardTopAt(e, cardH, L) {
    var bodyBottom = L.bodyY + L.bodyH;
   
    var startY = L.bodyY - cardH;
    var endY = bodyBottom;
    return lerp(startY, endY, e);
  }

  // ---------------------------------------------------------------------
  // Background
  // ---------------------------------------------------------------------
  function drawColorBackground(ctx, colorDef) {
    var isDark = isDarkColor(colorDef.body);
    
    var base = isDark ? colorDef.body : shade(colorDef.body, 58);
    var edge = isDark ? shade(colorDef.body, -35) : shade(base, -4);
    var g = ctx.createRadialGradient(W * 0.32, H * 0.28, 60, W * 0.5, H * 0.55, W * 0.8);
    g.addColorStop(0, isDark ? shade(colorDef.body, 12) : shade(base, 14));
    g.addColorStop(0.55, isDark ? colorDef.body : base);
    g.addColorStop(1, edge);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    var vg = ctx.createLinearGradient(0, 0, 0, H);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, isDark ? "rgba(0,0,0,0.18)" : "rgba(60,50,40,0.035)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  function drawBackground(ctx, bgColorDef) {
    ctx.clearRect(0, 0, W, H);
    drawColorBackground(ctx, bgColorDef);
  }

  // ---------------------------------------------------------------------
  // Camera 
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

   
    var leverAngle = -Math.PI / 2 - 0.25;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(leverAngle);
    var leverW = r * 0.42, leverLen = r * 0.48, leverBase = r * 0.68;
    roundRectPath(ctx, -leverW / 2, -(leverBase + leverLen), leverW, leverLen + leverW / 2, leverW / 2);
    var leverGrad = ctx.createLinearGradient(-leverW / 2, 0, leverW / 2, 0);
    leverGrad.addColorStop(0, "#404244");
    leverGrad.addColorStop(0.5, "#1f2022");
    leverGrad.addColorStop(1, "#080809");
    ctx.fillStyle = leverGrad;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.stroke();
    ctx.restore();

 
    var idx = x + Math.cos(leverAngle) * r * 0.4;
    var idy = y + Math.sin(leverAngle) * r * 0.4;
    ctx.beginPath();
    ctx.arc(idx, idy, r * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(238,236,232,0.95)";
    ctx.fill();

    // soft highlight on the cap for depth
    ctx.beginPath();
    ctx.ellipse(x - r * 0.16, y - r * 0.18, r * 0.09, r * 0.05, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
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
    
    // 바깥쪽 얇은 테두리
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "#cccccc"; 
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.stroke();

    // 납작한 안쪽 버튼면
    ctx.beginPath();
    ctx.arc(x, y, r * 0.85, 0, Math.PI * 2);
    ctx.fillStyle = "#e6e6e6"; // 단색에 가까운 밝은 톤
    ctx.fill();
    
    // 미세한 빛 반사 테두리만 추가하여 평면적인 느낌 강조
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.stroke();
    
    ctx.restore();
  }

  function drawStatusLED(ctx, x, y, w, h) {
    ctx.save();
    roundRectPath(ctx, x, y, w, h, w / 2);
    var grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, "#d85d4f");
    grad.addColorStop(0.5, "#b5382a");
    grad.addColorStop(1, "#7c2018");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.stroke();
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
    // 세로 줄무늬 패턴
  var step = 6.0; // 선 사이 간격
  for (var ix = x + 3; ix < x + w - 3; ix += step) {
    // 음영 선
    ctx.beginPath();
    ctx.moveTo(ix, y);
    ctx.lineTo(ix, y + h);
    ctx.strokeStyle = isDark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // 밝은 광택 선 (입체감 효과)
    ctx.beginPath();
    ctx.moveTo(ix + 1, y);
    ctx.lineTo(ix + 1, y + h);
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
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
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
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

 function drawGearedTopDial(ctx, x, y, w, h, isDark) {
    ctx.save();

    // 1. 납작하고 둥근 다이얼 몸통
    roundRectPath(ctx, x - w / 2, y - h / 2, w, h, 2);
    var g = ctx.createLinearGradient(x - w / 2, y, x + w / 2, y);
    g.addColorStop(0, "#19191b");
    g.addColorStop(0.2, "#3d3d3f");
    g.addColorStop(0.8, "#3d3d3f");
    g.addColorStop(1, "#19191b");
    ctx.fillStyle = g;
    ctx.fill();

    // 2. 세로 톱니 패턴
    var step = 3.5;
    for (var ix = x - w / 2 + 2; ix < x + w / 2 - 1; ix += step) {
      ctx.beginPath();
      ctx.moveTo(ix, y - h / 2);
      ctx.lineTo(ix, y + h / 2);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // 밝은 하이라이트 선
      ctx.beginPath();
      ctx.moveTo(ix + 1, y - h / 2);
      ctx.lineTo(ix + 1, y + h / 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 3. 외곽선
    roundRectPath(ctx, x - w / 2, y - h / 2, w, h, 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.stroke();

    ctx.restore();
  }

  function drawLogoDot(ctx, x, y, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    var g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
    g.addColorStop(0, "#d33a29");
    g.addColorStop(1, "#a3211a");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }
  
  function drawCamera(ctx, colorDef, L) {
    L = L || computeHorizontalLayout();
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
    ctx.lineWidth = bw * 0.015; // 테두리를 더 두껍게
    ctx.strokeStyle = "#e0e0e0"; // 연한 회색/흰색 테두리로 변경
    ctx.stroke();

   
    drawTopNub(ctx, bx + bw * 0.22, by - 10.5 * k, 34 * k, 10 * k, 0, shade(body, isDark ? 8 : -5));
    drawGearedTopDial(ctx, bx + bw * 0.78, by - 10.5 * k, 60 * k, 8 * k, isDark);

    // shoulder plate
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

    // 텍스트
    ctx.save();
    ctx.font = "bold " + (bw * 0.032) + "px 'Helvetica Neue', Helvetica, sans-serif";
    ctx.fillStyle = "#ffffff"; // 흰색 글씨
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("MOMENT", bx + bw * 0.06, shY);
    ctx.restore();
    
    // red logo dot — moved left (closer to the wordmark) from 0.354 to 0.27
    drawLogoDot(ctx, bx + bw * 0.27 + 10, shY, bw * 0.038);

    // grey sensor / viewfinder window
    var winW = bw * 0.11, winH = winW * 0.65; 
    drawWindow(ctx, bx + bw * 0.506 - winW / 2, shY - winH / 2, winW, winH);

    // chrome shutter button
    drawShutterButton(ctx, bx + bw * 0.657, shY, bw * 0.042);

    // red vertical status LED
    drawStatusLED(ctx, bx + bw * 0.748, shY - L.shoulderH * 0.225, bw * 0.022, L.shoulderH * 0.45);

    // pill-shaped waffle switch (far right of shoulder)
    drawRidgedSwitch(ctx, bx + bw * 0.851 - bw * 0.064, shY - L.shoulderH * 0.24, bw * 0.129, L.shoulderH * 0.46, body, isDark);

    // bottom-left toggle knob
    var c = cameraCenter(L);
    drawToggleKnob(ctx, bx + bw * 0.11, by + bh * 0.84, bw * 0.054, body, isDark);

    // 바디 하이라이트 
    
    ctx.save();
    roundRectPath(ctx, bx, by, bw, bh, L.bodyR);
    ctx.clip();
    var hgCx = bx + bw * 0.06, hgCy = by + bh * 0.06;
    var hg = ctx.createRadialGradient(hgCx, hgCy, 0, hgCx, hgCy, bw * 0.6);
    hg.addColorStop(0, "rgba(255,255,255,0.32)");
    hg.addColorStop(0.35, "rgba(255,255,255,0.16)");
    hg.addColorStop(0.7, "rgba(255,255,255,0.05)");
    hg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hg;
    ctx.fillRect(bx, by, bw, bh);
    ctx.restore();
    
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
//  동심원

ctx.strokeStyle = "#3d3d3d";

var knInner = R * 0.33;

for (let i = 0; i < 18; i++) {

    let rr = R - 8 - i * 6;

    if (rr < knInner) break;

    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.stroke();
}

// 마지막 동심원
ctx.beginPath();
ctx.arc(cx, cy, knInner, 0, Math.PI * 2);
ctx.strokeStyle = "rgba(255,255,255,0.1)";
ctx.lineWidth = 1;
ctx.stroke();

// 가운데 검정 원
ctx.beginPath();
ctx.arc(cx, cy, knInner, 0, Math.PI * 2);

var centerGrad = ctx.createRadialGradient(
    cx - knInner * 0.25,
    cy - knInner * 0.25,
    knInner * 0.08,
    cx,
    cy,
    knInner
);

centerGrad.addColorStop(0, "#1d1d1d");
centerGrad.addColorStop(0.5, "#0c0c0c");
centerGrad.addColorStop(1, "#000000");

ctx.fillStyle = centerGrad;
ctx.fill();
    
    ctx.restore(); 
  }
  // ---------------------------------------------------------------------
  // Polaroid card (orientation aware)
  // ---------------------------------------------------------------------
  function drawPhotoCard(ctx, e, photoImg, orientation, captionText, serialText, L, stack) {
    L = L || computeHorizontalLayout();
    stack = stack || { x: 0, y: 0, rot: 0 };
    var dims = CARD_DIMS[orientation] || CARD_DIMS.vertical;
    var left, top;
    if (orientation === "vertical") {
      // camera sits at the top of the frame; card ejects straight down,
      // centered under it
      left = (W - dims.w) / 2;
      top = cardTopAt(e, dims.h, L);
    } else {
     
      var STACK_MAX_Y_OFFSET = 24;
      var SHADOW_MARGIN = 14;
      var availH = (L.bodyY + L.bodyH) - (L.bodyY + L.shoulderH) - STACK_MAX_Y_OFFSET - SHADOW_MARGIN;
     
      var CARD_OVERLAP = 20;
      var rightEdge = L.bodyX + L.bodyW;
      var availW = (W - L.bodyX) - (rightEdge - CARD_OVERLAP);
      dims = Object.assign({}, dims, { h: Math.max(160, availH), w: Math.max(200, availW) });
      top = L.bodyY + L.shoulderH;
      left = cardLeftAt(e, dims.w, L);
    }
   
    left += stack.x || 0;
    top += stack.y || 0;

    var caption = captionText || "";
    var serial = serialText || "";

    ctx.save();
    if (orientation === "vertical") {
     
      ctx.beginPath();
      ctx.rect(0, L.bodyY, W, H - L.bodyY);
      ctx.clip();
    }
    if (stack.rot) {
      var rcx = left + dims.w / 2, rcy = top + dims.h / 2;
      ctx.translate(rcx, rcy);
      ctx.rotate(stack.rot * Math.PI / 180);
      ctx.translate(-rcx, -rcy);
    }
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
      pg.addColorStop(0, "#f4f4f5");
      pg.addColorStop(1, "#e6e6e8");
      ctx.fillStyle = pg;
      ctx.fillRect(pX, pY, pW, pH);
      ctx.strokeStyle = "rgba(206,206,209,0.12)";
      ctx.lineWidth = 1;
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
      ctx.font = "500 17px 'IBM Plex Sans KR', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Upload your photo", pX + pW / 2, pY + pH / 2 + 5);
    }

    function fitFontSize(ctx, text, family, maxSize, maxWidth) {
      var size = maxSize;
      if (!text) return size;
      ctx.font = size + "px " + family;
      while (size > 8 && ctx.measureText(text).width > maxWidth) {
        size -= 1;
        ctx.font = size + "px " + family;
      }
      return size;
    }

    if (dims.side === "right") {
      // vertical margin strip on the right
      var mCenterX = left + dims.w - dims.margin / 2;
      var serialMaxW = dims.margin - 10;
      var serialSize = fitFontSize(ctx, serial, "'IBM Plex Mono', monospace", 13, serialMaxW);
      ctx.fillStyle = "#9a968c";
      ctx.font = "500 " + serialSize + "px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(serial, mCenterX, top + 34);

      var captionMaxH = dims.h - 60;
      var captionSize = fitFontSize(ctx, caption, "'Space Grotesk', sans-serif", 15, captionMaxH);
      ctx.save();
      ctx.translate(mCenterX, top + dims.h - 26);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "left";
      ctx.font = "600 " + captionSize + "px 'Space Grotesk', sans-serif";
      ctx.fillStyle = "#5b5850";
      ctx.fillText(caption, 0, 0);
      ctx.restore();
    } else {
      var bottomHalfW = dims.w / 2 - pad - 6;
      var serialSizeB = fitFontSize(ctx, serial, "'IBM Plex Mono', monospace", 13, bottomHalfW);
      ctx.fillStyle = "#9a968c";
      ctx.font = "500 " + serialSizeB + "px 'IBM Plex Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(serial, left + pad, top + dims.h - dims.margin + 40);

      var captionSizeB = fitFontSize(ctx, caption, "'Space Grotesk', sans-serif", 15, bottomHalfW);
      ctx.textAlign = "right";
      ctx.font = "600 " + captionSizeB + "px 'Space Grotesk', sans-serif";
      ctx.fillStyle = "#5b5850";
      ctx.fillText(caption, left + dims.w - pad, top + dims.h - dims.margin + 40);
    }

    ctx.restore(); // closes the outer stack-rotation save opened above
  }

  // ---------------------------------------------------------------------
  // Scene render
  // ---------------------------------------------------------------------

  function resolveTimelinePosition(phase, segCount) {
    var p = clamp(phase, 0, 1);
    if (segCount <= 1) {
      return { idx: 0, localE: easeOutCubic(p) };
    }
    var slideFrac = 0.7;
    var segFloat = p * segCount;
    var idx = Math.min(segCount - 1, Math.floor(segFloat));
    var local = segFloat - idx;
    if (p >= 1) { idx = segCount - 1; local = 1; }
    var localE = easeOutCubic(clamp(local / slideFrac, 0, 1));
    return { idx: idx, localE: localE };
  }


  function stackOffsetFor(i) {
    if (i === 0) return { x: 0, y: 0, rot: 0 };
    var dir = i % 2 === 1 ? 1 : -1;
    return { x: dir * (10 + i * 4), y: i * 8, rot: dir * (3 + i * 1.5) };
  }

  
  function serialForIndex(text, i) {
    var base = text || "";
    if (i === 0) return base;
    var m = /^(.*?)(\d+)(\D*)$/.exec(base);
    if (!m) return base;
    var num = parseInt(m[2], 10) + i;
    var padded = String(num).length < m[2].length
      ? ("0000000000" + num).slice(-m[2].length)
      : String(num);
    return m[1] + padded + m[3];
  }

  function renderScene(ctx, phase, st) {
    var L = getLayout(st.orientation);
    var cameraColorDef = CAMERA_COLORS[st.cameraColorIndex];
    var bgColorDef = BG_COLORS[st.bgColorIndex];
    drawBackground(ctx, bgColorDef);


    var photos = [st.photoImg];
    if (st.photoImg2) photos.push(st.photoImg2);
    if (st.photoImg3) photos.push(st.photoImg3);
    var pos = resolveTimelinePosition(phase, photos.length);

  
    for (var i = 0; i <= pos.idx; i++) {
      var e = (i < pos.idx) ? 1 : pos.localE;
      drawPhotoCard(ctx, e, photos[i], st.orientation, st.captionText,
        serialForIndex(st.serialText, i), L, stackOffsetFor(i));
    }
    drawCamera(ctx, cameraColorDef, L);
  }

  function render() {
    renderScene(ctxStage, state.phase, state);
    specCamera.textContent = CAMERA_COLORS[state.cameraColorIndex].label;
    specBg.textContent = BG_COLORS[state.bgColorIndex].label;
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

  function setOrientation(orientation) {
    state.orientation = orientation;
    orientVerticalBtn.classList.toggle("is-active", orientation === "vertical");
    orientHorizontalBtn.classList.toggle("is-active", orientation === "horizontal");
    applyOrientationDims(orientation);
    render();
  }

  function handlePhotoFile(file, slot) {
    if (!file || !file.type.match(/^image\//)) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        if (slot === 2) {
          state.photoImg2 = img;
          photoStatus2.textContent = file.name ;
        } else if (slot === 3) {
          state.photoImg3 = img;
          photoStatus3.textContent = file.name ;
        } else {
          state.photoImg = img;
          photoStatus.textContent = file.name ;
        }
        statusText.textContent = "PRINTING PHOTOS...";
        render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  pickPhotoBtn.addEventListener("click", function () { photoInput.click(); });
  photoInput.addEventListener("change", function (e) {
    if (e.target.files && e.target.files[0]) handlePhotoFile(e.target.files[0], 1);
  });

  if (pickPhoto2Btn) pickPhoto2Btn.addEventListener("click", function () { photoInput2.click(); });
  if (photoInput2) photoInput2.addEventListener("change", function (e) {
    if (e.target.files && e.target.files[0]) handlePhotoFile(e.target.files[0], 2);
  });
  if (pickPhoto3Btn) pickPhoto3Btn.addEventListener("click", function () { photoInput3.click(); });
  if (photoInput3) photoInput3.addEventListener("change", function (e) {
    if (e.target.files && e.target.files[0]) handlePhotoFile(e.target.files[0], 3);
  });

  if (serialInput) {
    serialInput.addEventListener("input", function () {
      state.serialText = serialInput.value;
      render();
    });
  }


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


  gifRange.min = "1";
  gifRange.max = "7";
  gifRange.step = "0.1";
  gifRange.value = String(state.gifSeconds);
  gifVal.textContent = state.gifSeconds.toFixed(1) + "s";

  // preview animation (visible canvas only — not exported)
  var rafId = null;
  playPreviewBtn.addEventListener("click", function () {
    if (state.playing) {
      state.playing = false;
      if (rafId) cancelAnimationFrame(rafId);
      state.phase = 1;
      render();
      playPreviewBtn.textContent = "▶ MOTION PREVIEW";
      return;
    }
    state.playing = true;
    playPreviewBtn.textContent = "■ STOP";
    var photoCount = 1
  + (state.photoImg2 ? 1 : 0)
  + (state.photoImg3 ? 1 : 0);

var duration = state.gifSeconds * photoCount * 1000;
    var start = performance.now();
    function tick(now) {
      var t = clamp((now - start) / duration, 0, 1);
      state.phase = t;
      render();
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        state.playing = false;
        playPreviewBtn.textContent = "▶ MOTION PREVIEW";
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
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
  
    setTimeout(function () {
      a.remove();
      URL.revokeObjectURL(url);
    }, 10000);
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
      // PNG only ever shows the first photo — the 2nd/3rd stack is a
      // GIF/video-only feature
      var pngState = Object.assign({}, state, { photoImg2: null, photoImg3: null });
      renderScene(octx, 1, pngState);
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

  function buildPaletteFromFrames(dataArrays, maxColors) {
    var samples = [];
    var strideEach = 12;
    dataArrays.forEach(function (data) {
      for (var i = 0; i < data.length; i += strideEach) {
        samples.push([data[i], data[i + 1], data[i + 2]]);
      }
    });
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
        var d = 2 * dr * dr +
                4 * dg * dg +
                3 * db * db;
        if (d < bestDist) { bestDist = d; best = i; }
      }
      cache.set(key, best);
      return best;
    };
  }

  // 8x8 Bayer matrix (0..63), used for ordered dithering
  var BAYER8 = [
    0, 32, 8, 40, 2, 34, 10, 42,
    48, 16, 56, 24, 50, 18, 58, 26,
    12, 44, 4, 36, 14, 46, 6, 38,
    60, 28, 52, 20, 62, 30, 54, 22,
    3, 35, 11, 43, 1, 33, 9, 41,
    51, 19, 59, 27, 49, 17, 57, 25,
    15, 47, 7, 39, 13, 45, 5, 37,
    63, 31, 55, 23, 61, 29, 53, 21
  ];


  function imageDataToIndicesOrderedDither(data, w, h, nearestIndexFn, strength) {
    strength = strength || 20;
    var out = new Uint8Array(w * h);
    for (var y = 0; y < h; y++) {
      var rowOff = y * w;
      var by8 = (y & 7) * 8;
      for (var x = 0; x < w; x++) {
        var di = (rowOff + x) * 4;
        var lum =
    data[di] * 0.2126 +
    data[di + 1] * 0.7152 +
    data[di + 2] * 0.0722;

// 밝은 곳은 약하게
// 어두운 곳은 조금 강하게
var adaptiveStrength =
    strength * (0.35 + (1 - lum / 255) * 0.65);

var offset =
    (BAYER8[by8 + (x & 7)] / 63 - 0.5) *
    adaptiveStrength;
        var r = clamp(data[di]     + offset * 1.0, 0, 255);
        var g = clamp(data[di + 1] + offset * 0.8, 0, 255);
        var b = clamp(data[di + 2] + offset * 0.6, 0, 255);
        out[rowOff + x] = nearestIndexFn(Math.round(r), Math.round(g), Math.round(b));
      }
    }
    return out;
  }

  function imageDataToIndices(data, w, h, nearestIndexFn) {
    var out = new Uint8Array(w * h);
    for (var i = 0, p = 0; i < data.length; i += 4, p++) {
      out[p] = nearestIndexFn(data[i], data[i + 1], data[i + 2]);
    }
    return out;
  }

  // --- byte writer ---------------------------------------------------------

  function ByteWriter() {
    this.buf = new Uint8Array(1 << 16);
    this.len = 0;
  }
  ByteWriter.prototype._ensure = function (extra) {
    if (this.len + extra <= this.buf.length) return;
    var cap = this.buf.length;
    while (cap < this.len + extra) cap *= 2;
    var next = new Uint8Array(cap);
    next.set(this.buf.subarray(0, this.len));
    this.buf = next;
  };
  ByteWriter.prototype.writeByte = function (b) {
    this._ensure(1);
    this.buf[this.len++] = b & 0xff;
  };
  ByteWriter.prototype.writeBytes = function (arr, offset, length) {
    offset = offset || 0; length = length === undefined ? arr.length : length;
    this._ensure(length);
    for (var i = 0; i < length; i++) this.buf[this.len++] = arr[offset + i] & 0xff;
  };
  ByteWriter.prototype.writeString = function (s) {
    this._ensure(s.length);
    for (var i = 0; i < s.length; i++) this.buf[this.len++] = s.charCodeAt(i) & 0xff;
  };
  ByteWriter.prototype.toUint8Array = function () { return this.buf.subarray(0, this.len); };

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

 
  function getDownscaledPhoto(img, maxDim) {
    if (!img) return img;
    var srcW = img.naturalWidth || img.width;
    var srcH = img.naturalHeight || img.height;
    if (!srcW || !srcH) return img;
    var longSide = Math.max(srcW, srcH);
    if (longSide <= maxDim) return img;
    img.__downscaleCache = img.__downscaleCache || {};
    var cached = img.__downscaleCache[maxDim];
    if (cached) return cached;
    var ratio = maxDim / longSide;
    var dw = Math.max(1, Math.round(srcW * ratio));
    var dh = Math.max(1, Math.round(srcH * ratio));
    var c = document.createElement("canvas");
    c.width = dw; c.height = dh;
    var cctx = c.getContext("2d");
    cctx.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in cctx) cctx.imageSmoothingQuality = "high";
    cctx.drawImage(img, 0, 0, srcW, srcH, 0, 0, dw, dh);
    img.__downscaleCache[maxDim] = c;
    return c;
  }

  // Builds a lightweight state clone whose photoImg/2/3 point at
  // pre-downscaled versions of the originals, for use as the render
  // source throughout a GIF/video export loop.
  function withDownscaledPhotos(st, maxDim) {
    return Object.assign({}, st, {
      photoImg: getDownscaledPhoto(st.photoImg, maxDim),
      photoImg2: getDownscaledPhoto(st.photoImg2, maxDim),
      photoImg3: getDownscaledPhoto(st.photoImg3, maxDim)
    });
  }

  // ---------------------------------------------------------------------
  // Video (WebM) export — uses the browser's own encoder via
  // canvas.captureStream() + MediaRecorder, so quality is far higher (and
  // encoding far faster/lighter) than a hand-rolled GIF encoder would be.
  // Added as a companion "동영상으로 저장" button placed right after the
  // PNG button.
  // ---------------------------------------------------------------------
  function createVideoButton() {
    if (!downloadPngBtn || !downloadPngBtn.parentNode) return null;
    if (typeof MediaRecorder === "undefined" ||
        !HTMLCanvasElement.prototype.captureStream) return null;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "downloadVideo";
    btn.className = "block";
    btn.textContent = "동영상으로 저장";
    downloadPngBtn.parentNode.insertBefore(btn, downloadPngBtn.nextSibling);
    return btn;
  }

  var downloadVideoBtn = createVideoButton();

  if (downloadVideoBtn) {
    downloadVideoBtn.addEventListener("click", function () {
      function resetVideoButtons() {
        downloadVideoBtn.disabled = false;
        downloadPngBtn.disabled = false;
        playPreviewBtn.disabled = false;
        state.phase = 1;
        render();
      }

      downloadVideoBtn.disabled = true;
      downloadPngBtn.disabled = true;
      playPreviewBtn.disabled = true;
      statusText.textContent = "동영상 녹화 준비 중…";

      try {
        // Android hardware H.264 encoders are inconsistent at larger
        // frame sizes — some drop frames mid-recording (clip ends up
        // way shorter than intended) and some crash the GPU process
        // entirely on lower-memory devices. Capping the export canvas
        // to a smaller long-side on Android substantially reduces both
        // failure modes; desktop/iOS keep the original, higher-quality
        // scale since they don't show this issue.
        var vScale = isAndroid() ? 1.0 : 1.6;
        var ANDROID_MAX_LONG_SIDE = 1280;
        var vw = Math.round(W * vScale), vh = Math.round(H * vScale);
        if (isAndroid()) {
          var longSide = Math.max(vw, vh);
          if (longSide > ANDROID_MAX_LONG_SIDE) {
            var capRatio = ANDROID_MAX_LONG_SIDE / longSide;
            vScale = vScale * capRatio;
            vw = Math.round(W * vScale);
            vh = Math.round(H * vScale);
          }
        }
        var off = document.createElement("canvas");
        off.width = vw; off.height = vh;
        var octx = off.getContext("2d");
        octx.scale(vScale, vScale);
        // See getDownscaledPhoto: avoids re-downsampling full-resolution
        // source photos on every recorded frame.
        var videoExportState = withDownscaledPhotos(state, Math.round(Math.max(vw, vh) * 1.2));
        renderScene(octx, 0, videoExportState);

        var fps = 30;
        // NOTE: previously this tried captureStream(0) + track.requestFrame()
        // ("manual" frame pumping) whenever the browser exposed
        // requestFrame(). On some Android Chrome builds that combination
        // is unreliable — rAF gets throttled or requestFrame() silently
        // no-ops — so the MediaRecorder only ever receives a couple of
        // frames and the saved clip ends up 0–3s long regardless of the
        // intended duration. Forcing the *automatic* captureStream(fps)
        // mode makes the browser itself responsible for pulling frames
        // off the canvas at a steady rate, which is far more consistent
        // across devices. We still redraw the canvas manually in tick()
        // so the automatic sampler always has fresh content to grab.
        var stream = off.captureStream(fps);

        var photoCountForHold = 1 + (state.photoImg2 ? 1 : 0) + (state.photoImg3 ? 1 : 0);
        var holdMs = photoCountForHold > 1 ? 1200 : 900;
        var photoCount =
    1 +
    (state.photoImg2 ? 1 : 0) +
    (state.photoImg3 ? 1 : 0);

        var animMs = state.gifSeconds * photoCount * 1000;
        var expectedSeconds = (animMs + holdMs) / 1000;

        var recordFps = 30;
        var frameIntervalMs = 1000 / recordFps;
        var animFrameCount = Math.max(1, Math.round(animMs / frameIntervalMs));
        var holdFrameCount = Math.max(1, Math.round(holdMs / frameIntervalMs));
        var frameTs = [];
        for (var vf = 0; vf <= animFrameCount; vf++) frameTs.push(vf / animFrameCount);
        for (var vh2 = 0; vh2 < holdFrameCount; vh2++) frameTs.push(1);

        // mp4 is required for upload targets that reject webm, so it's
        // always tried first. But some Android hardware H.264 encoders
        // drop frames after the first keyframe even though
        // isTypeSupported() reports true, which produces the same
        // "clip is way too short" symptom from the encoder side instead
        // of the frame-supply side. recordOnce() below is reused so we
        // can transparently retry with webm if the mp4 output comes back
        // implausibly short, without duplicating the whole recording
        // pipeline.
        var mp4Candidates = ["video/mp4;codecs=avc1", "video/mp4"];
        var webmCandidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];

        function pickSupported(list) {
          for (var i = 0; i < list.length; i++) {
            if (MediaRecorder.isTypeSupported(list[i])) return list[i];
          }
          return "";
        }

        function getBlobDurationSeconds(blob) {
          return new Promise(function (resolve) {
            try {
              var v = document.createElement("video");
              v.preload = "metadata";
              v.muted = true;
              var url = URL.createObjectURL(blob);
              var settled = false;
              function finish(val) {
                if (settled) return;
                settled = true;
                URL.revokeObjectURL(url);
                resolve(val);
              }
              v.onloadedmetadata = function () {
                // Some browsers report Infinity/NaN for duration on
                // streamed/irregular mp4s; treat that as "unknown" rather
                // than "too short" so we don't discard a valid recording.
                var d = v.duration;
                finish(isFinite(d) && d > 0 ? d : null);
              };
              v.onerror = function () { finish(null); };
              // Safety timeout in case metadata never fires.
              setTimeout(function () { finish(null); }, 1500);
              v.src = url;
            } catch (e) {
              resolve(null);
            }
          });
        }

        function recordOnce(mimeType) {
          return new Promise(function (resolve, reject) {
            var recorder;
            try {
              recorder = mimeType
                ? new MediaRecorder(stream, { mimeType: mimeType, videoBitsPerSecond: 8000000 })
                : new MediaRecorder(stream);
            } catch (e) {
              reject(e);
              return;
            }

            var chunks = [];
            recorder.ondataavailable = function (e) {
              if (e.data && e.data.size > 0) chunks.push(e.data);
            };
            recorder.onerror = function (e) {
              reject(e);
            };
            recorder.onstop = function () {
              var actualType = recorder.mimeType || mimeType || "video/webm";
              var blob = new Blob(chunks, { type: actualType });
              resolve(blob);
            };

            // Frequent timeslices keep chunks small so onstop always has
            // data even if the very last dataavailable event lands late.
            recorder.start(100);

            var frameIdx = 0;
            var nextFrameAt = null;
            var startedAt = performance.now();
            function tick(now) {
              if (nextFrameAt === null) nextFrameAt = now;
              if (now >= nextFrameAt) {
                renderScene(octx, frameTs[frameIdx], videoExportState);
                frameIdx++;
                nextFrameAt += frameIntervalMs;
                if (nextFrameAt < now) nextFrameAt = now + frameIntervalMs;
              }
              if (frameIdx < frameTs.length) {
                requestAnimationFrame(tick);
              } else {
                renderScene(octx, 1, videoExportState);
                // Stop once we've actually spent roughly the intended
                // animation time recording, rather than a fixed guess —
                // guards against the automatic sampler needing a bit
                // longer to catch up on slower devices.
                var elapsed = performance.now() - startedAt;
var minRecordMs = animFrameCount * frameIntervalMs + holdFrameCount * frameIntervalMs;

var endPadding = isAndroid() ? 2500 : 300;
var extraWait = Math.max(
  endPadding,
  minRecordMs - elapsed + endPadding
);

setTimeout(function () {
  if (recorder.state !== "inactive") {
    recorder.stop();
  }
}, extraWait);
                
              }
            }
            requestAnimationFrame(tick);
          });
        }

        var mp4Type = pickSupported(mp4Candidates);
        var webmType = pickSupported(webmCandidates);

        statusText.textContent = "동영상 녹화 중…";

        function finishWithBlob(blob, ext) {
          downloadBlob(blob, "polaroid." + ext);
          statusText.textContent = "동영상 저장 완료 (" + vw + "×" + vh + ")";
          resetVideoButtons();
        }

        function recordWebmFallback() {
          if (!webmType) {
            statusText.textContent = "이 브라우저에서는 동영상 저장을 지원하지 않아요.";
            resetVideoButtons();
            return;
          }
          statusText.textContent = "MP4 저장에 실패해 다른 형식으로 다시 시도 중…";
          recordOnce(webmType).then(function (blob) {
            finishWithBlob(blob, "webm");
          }).catch(function () {
            statusText.textContent = "동영상 저장 중 오류가 발생했어요.";
            resetVideoButtons();
          });
        }

        if (mp4Type) {
          recordOnce(mp4Type).then(function (blob) {
            // Guard against the "encoder reports success but only kept
            // the first couple of frames" failure mode: if the resulting
            // clip's duration is wildly shorter than intended (or the
            // blob is suspiciously tiny), fall back to webm instead of
            // silently handing the user a broken 1–3s file.
            var tooSmall = blob.size < 20000;
            getBlobDurationSeconds(blob).then(function (dur) {
              var tooShort = dur !== null && dur < expectedSeconds * 0.5;
              if (tooSmall || tooShort) {
                recordWebmFallback();
              } else {
                finishWithBlob(blob, "mp4");
              }
            });
          }).catch(function () {
            recordWebmFallback();
          });
        } else {
          recordWebmFallback();
        }
      } catch (errStart) {
        statusText.textContent = "이 브라우저에서는 동영상 저장을 지원하지 않아요.";
        resetVideoButtons();
      }
    });
  }
  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------
  applyOrientationDims(state.orientation);
  buildSwatches();
  render();
})();
