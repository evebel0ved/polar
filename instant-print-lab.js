(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // Constants & state
  // ---------------------------------------------------------------------
  // W is fixed; H now depends on orientation (see applyOrientationDims) —
  // vertical exports/preview use a square canvas, horizontal uses a
  // shorter canvas (less empty space above/below). Both get corrected
  // by applyOrientationDims() before the very first render.
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
    bgMode: "color",
    orientation: "horizontal", // "vertical" | "horizontal" — horizontal is now default
    captionText: "INSTANT",
    serialText: "N° 01",       // customizable frame-number label printed on the card margin
    photoImg: null,
    photoImg2: null,           // 2nd photo — only used for GIF/video (stacks on top of photo 1)
    photoImg3: null,           // 3rd photo — only used for GIF/video (stacks on top of photo 2)
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
  var photoInput2 = document.getElementById("photoInput2");
  var pickPhoto2Btn = document.getElementById("pickPhoto2");
  var photoStatus2 = document.getElementById("photoStatus2");
  var photoInput3 = document.getElementById("photoInput3");
  var pickPhoto3Btn = document.getElementById("pickPhoto3");
  var photoStatus3 = document.getElementById("photoStatus3");
  var serialInput = document.getElementById("serialInput");
  var cameraSwatchGrid = document.getElementById("cameraSwatchGrid");
  var bgSwatchGrid = document.getElementById("bgSwatchGrid");
  var bgColorBlock = document.getElementById("bgColorBlock");
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
  // Scene layout (logical W×H coordinate space — fixed per orientation
  // regardless of device, so preview and every exported file share one
  // composition). W is always 1400; H is 800 for horizontal or 1400
  // (square) for vertical — see applyOrientationDims().
  // ---------------------------------------------------------------------
  // How far above the camera's top edge (L.bodyY) the vertical eject
  // animation's start position sits. Safe to set above 0 only because
  // drawPhotoCard hard-clips the card to L.bodyY and below on every
  // frame — this constant only affects how much eject motion is spent
  // before the card is visible, never what actually renders/exports.
  var VERTICAL_START_LIFT = 70;

  // Fixed top/bottom margin for vertical layout. Raised 40 -> 90 for
  // noticeably more breathing room around the camera+card group (the
  // square canvas side length in applyOrientationDims grows with this,
  // so margins scale directly with this one constant).
  var VERTICAL_MARGIN = 90;

  var CARD_DIMS = {
    // vertical card is narrower than the (now bigger) camera body so the
    // ejected photo stays visually contained within the camera's footprint
    // instead of poking out past its left/right edges
    vertical:   { w: 420, h: 500, side: "bottom", margin: 92 },
    // horizontal card enlarged (324 -> 380) so the photo now extends up
    // into the shoulder-plate area instead of stopping at the lens
    // centerline — see drawPhotoCard's horizontal `top` calc, which
    // anchors from L.bodyY with a fixed clearance instead of centering
    // on cameraCenter(). Height chosen (with that anchor) so even the
    // 3rd stacked photo's stack.y offset + drop shadow stay inside
    // L.bodyY..L.bodyY+L.bodyH — never pokes out past the camera body.
    horizontal: { w: 480, h: 380, side: "right",  margin: 92 }
  };

  // horizontal (landscape) layout — card ejects sideways from under the
  // camera's right edge, so the canvas only needs to be tall enough for
  // the camera body itself. Recomputed off the current H so the reduced
  // (non-square) horizontal canvas still keeps the camera vertically
  // centered instead of assuming a fixed 1000px-tall canvas.
  function computeHorizontalLayout() {
    var bodyW = 620, bodyH = 424, bodyR = 36, shoulderH = 94;
    var bodyY = Math.max(24, Math.round((H - bodyH) / 2) - 18);
    return { bodyX: 180, bodyY: bodyY, bodyW: bodyW, bodyH: bodyH, bodyR: bodyR, shoulderH: shoulderH };
  }

  // vertical (portrait) layout — camera sits near the top, card ejects
  // straight down. Enlarged (same 620:424 body ratio, so every hardware
  // element positioned/sized off bw/bh/k inside drawCamera scales
  // automatically). With the canvas now square, the whole camera+card
  // group is vertically centered in the available height rather than
  // pinned near the top, so the extra square space reads as intentional
  // framing instead of empty padding.
  function computeVerticalLayout() {
    var VERTICAL_SCALE = 580 / 620;
    var bodyW = 620 * VERTICAL_SCALE, bodyH = 424 * VERTICAL_SCALE,
        bodyR = 36 * VERTICAL_SCALE, shoulderH = 94 * VERTICAL_SCALE;
    // Canvas height is now sized (in applyOrientationDims) to exactly fit
    // this content plus VERTICAL_MARGIN on each side, so bodyY is just
    // that fixed margin rather than a centering calc against a much
    // taller canvas.
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

  // Sets W/H for the chosen orientation and resizes the actual <canvas>
  // element to match, so the preview's intrinsic aspect ratio (and every
  // export, which reads W/H at save time) always matches what's selected.
  function applyOrientationDims(orientation) {
    if (orientation === "vertical") {
      // Square canvas (W === H), sized directly off the real content
      // height (camera body + ejected card, at vertical layout's
      // proportions) plus VERTICAL_MARGIN on each side. Previously only
      // H was tightened here while W stayed fixed at 1400 (horizontal
      // mode's width), which left the "square" vertical canvas actually
      // a 1400x977 rectangle. Deriving both from the same content-based
      // side length keeps it genuinely square with margins that scale
      // with VERTICAL_MARGIN instead of leftover horizontal-mode width.
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

  // horizontal orientation: card slides out sideways from under the
  // camera body's right edge
  function cardLeftAt(e, cardW, L) {
    var rightEdge = L.bodyX + L.bodyW;
    var startX = rightEdge - cardW + 50;
    // Reduced from 60 to 20: at full eject (e=1) the card now sits
    // further right, showing more of the printed photo out from under
    // the camera body instead of leaving 60px of it still tucked
    // underneath. Still keeps a small (20px) overlap so the card visibly
    // connects to the camera rather than looking fully detached.
    var endX = rightEdge - 20;
    return lerp(startX, endX, e);
  }

  // vertical orientation: card ejects straight down — starts fully behind
  // the camera body (never above its top edge) and slides down to rest
  // flush against the camera's bottom edge once fully ejected
  function cardTopAt(e, cardH, L) {
    var bodyBottom = L.bodyY + L.bodyH;
    // Start position is L.bodyY - VERTICAL_START_LIFT (above the
    // camera's own top edge) rather than flush with it or centered on
    // card height. This relies entirely on drawPhotoCard's hard clip at
    // L.bodyY (added alongside this): whatever part of the card sits
    // above L.bodyY is clipped away every frame, in both preview and
    // every export, so lifting this start position can never actually
    // show or save anything above the camera — it only changes how much
    // of the eject motion happens before the card first peeks out from
    // under the camera body. (Previously this used
    // max(bodyBottom - cardH + 56, ...), but that term doesn't scale
    // with the vertical margin and silently overrode the lift once the
    // margin grew — the lift is now applied directly.)
    var startY = L.bodyY - VERTICAL_START_LIFT;
    var endY = bodyBottom;
    return lerp(startY, endY, e);
  }

  // ---------------------------------------------------------------------
  // Background
  // ---------------------------------------------------------------------
  function drawColorBackground(ctx, colorDef) {
    var isDark = isDarkColor(colorDef.body);
    // light backgrounds are pre-lightened before building the gradient;
    // already-dark colors (charcoal/ink/slate/…) are left exactly as-is.
    // Raised 38 -> 58: the previous value still read as fairly saturated
    // on lighter swatches; this pushes them noticeably closer to a pale
    // pastel while dark swatches are untouched.
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

  function drawBackground(ctx, bgColorDef, bgMode, photoImg) {
    ctx.clearRect(0, 0, W, H);
    drawColorBackground(ctx, bgColorDef);
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

    // protruding grip lever — a small metallic tab sticking out past the
    // collar, like a manual advance/rewind lever, so the knob reads as a
    // real turnable control rather than a flat disc
    var leverAngle = -Math.PI / 2 - 0.25;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(leverAngle);
    var leverW = r * 0.34, leverLen = r * 0.62, leverBase = r * 0.68;
    roundRectPath(ctx, -leverW / 2, -(leverBase + leverLen), leverW, leverLen + leverW / 2, leverW / 2);
    var leverGrad = ctx.createLinearGradient(-leverW / 2, 0, leverW / 2, 0);
    leverGrad.addColorStop(0, "#c9c9c6");
    leverGrad.addColorStop(0.5, "#efeeea");
    leverGrad.addColorStop(1, "#9a9a96");
    ctx.fillStyle = leverGrad;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.stroke();
    ctx.restore();

    // single index dot marking the lever's resting position (replaces the
    // old pair of overlapping dots for a cleaner face)
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

    // faint top hardware — strap lug (left) and geared advance dial with
    // strap lug (right), both low-contrast like the reference photo.
    // Pulled further above the top edge (by - 12*k instead of by - 1/2*k)
    // so neither shape overlaps the body's border stroke, widened, and
    // the right-hand dial moved further right and away from the button
    // below it.
    drawTopNub(ctx, bx + bw * 0.22, by - 12 * k, 34 * k, 10 * k, -0.05, shade(body, isDark ? 8 : -5));
    drawGearedTopDial(ctx, bx + bw * 0.78, by - 12 * k, 60 * k, 8 * k, isDark);

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

    // 텍스트
    ctx.save();
    ctx.font = "bold " + (bw * 0.032) + "px 'Helvetica Neue', Helvetica, sans-serif";
    ctx.fillStyle = "#ffffff"; // 흰색 글씨
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("POLAROID", bx + bw * 0.06, shY);
    ctx.restore();
    
    // red logo dot — moved left (closer to the wordmark) from 0.354 to 0.27
    drawLogoDot(ctx, bx + bw * 0.27, shY, bw * 0.038);

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

    // 바디 하이라이트 (상단에 위치 — 빛이 위에서 들어오는 느낌)
    // uses a radial gradient (opaque near the top-left corner, fading to
    // fully transparent) instead of a flat-alpha shape, so it blends
    // softly into the body instead of ending on a hard edge; clipped to
    // the rounded body path so it can't poke out past the corner.
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
// Leica 스타일 동심원

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
      // Anchored from the body's top edge with a small fixed clearance,
      // instead of vertically centering on cameraCenter() (the lens
      // area below the shoulder plate). Centering on the lens left ~97px
      // of unused headroom above the card that overlapped the shoulder
      // plate but was never used — this reclaims that space so the photo
      // extends up into the shoulder area, while the fixed clearance
      // (rather than a center calc) keeps the math simple to reason
      // about for the bottom-edge safety check below.
      var topClearance = 16;
      left = cardLeftAt(e, dims.w, L);
      top = L.bodyY + topClearance;
    }
    // stacked photos (2nd/3rd) settle slightly offset & rotated from the
    // first, like a scattered pile of instant prints, instead of sitting
    // in an identical spot on top of one another
    left += stack.x || 0;
    top += stack.y || 0;

    var caption = (captionText || "").trim() || "INSTANT";
    var serial = (serialText || "").trim() || "N° 01";

    ctx.save();
    if (orientation === "vertical") {
      // Hard clip at the camera body's top edge: nothing drawn for this
      // card (fill OR its drop-shadow) can render above L.bodyY. Applied
      // in world space, before the stack-rotation transform below, so it
      // holds regardless of stack.rot. This is what actually guarantees
      // the card never visibly pokes out above the camera — previously
      // that guarantee came only from keeping cardTopAt's start position
      // far enough below L.bodyY to out-run the shadow's own spread,
      // which capped how early the eject animation could start. With the
      // clip in place, cardTopAt is free to start much closer to the
      // body's top edge.
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
      ctx.fillText(serial, mCenterX, top + 34);

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
      ctx.fillText(serial, left + pad, top + dims.h - dims.margin + 40);
      ctx.textAlign = "right";
      ctx.font = "600 15px 'Space Grotesk', sans-serif";
      ctx.fillStyle = "#5b5850";
      ctx.fillText(caption, left + dims.w - pad, top + dims.h - dims.margin + 40);
    }

    ctx.restore(); // closes the outer stack-rotation save opened above
  }

  // ---------------------------------------------------------------------
  // Scene render
  // ---------------------------------------------------------------------
  // Splits a single 0..1 phase into (segment index, local eject progress)
  // across N photo segments. Each segment gets an equal share of the
  // phase range; within a segment the first 70% is the eject slide
  // (eased) and the remaining 30% is a hold, so multiple photos don't
  // eject back-to-back with no pause between them.
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

  // Stacked (2nd/3rd) photos settle slightly offset & rotated from the
  // first, like a scattered pile of instant prints landing on top of
  // one another, instead of sitting in an identical spot.
  function stackOffsetFor(i) {
    if (i === 0) return { x: 0, y: 0, rot: 0 };
    var dir = i % 2 === 1 ? 1 : -1;
    return { x: dir * (10 + i * 4), y: i * 8, rot: dir * (3 + i * 1.5) };
  }

  // If the label ends in digits (like the default "N° 01"), each stacked
  // card auto-increments that trailing number; otherwise every card
  // just repeats the same custom text as-is.
  function serialForIndex(text, i) {
    var base = (text || "").trim() || "N° 01";
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
    drawBackground(ctx, bgColorDef, st.bgMode, st.photoImg);

    // 2nd/3rd photos only ever take part here — PNG export always calls
    // this with a state clone that has photoImg2/3 cleared, so a plain
    // still export never shows a stack, per spec.
    var photos = [st.photoImg];
    if (st.photoImg2) photos.push(st.photoImg2);
    if (st.photoImg3) photos.push(st.photoImg3);
    var pos = resolveTimelinePosition(phase, photos.length);

    // cards drawn first (in stacking order), camera drawn on top — the
    // part of each card still "inside" the body gets covered by the
    // camera, giving the eject effect
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

  // slot 1 = state.photoImg (used everywhere), slot 2/3 = state.photoImg2/3
  // (only ever drawn during GIF/video export & preview, stacked on top of
  // slot 1 — PNG export always ignores them)
  function handlePhotoFile(file, slot) {
    if (!file || !file.type.match(/^image\//)) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        if (slot === 2) {
          state.photoImg2 = img;
          photoStatus2.textContent = file.name + " 적용됨";
        } else if (slot === 3) {
          state.photoImg3 = img;
          photoStatus3.textContent = file.name + " 적용됨";
        } else {
          state.photoImg = img;
          photoStatus.textContent = file.name + " 적용됨";
        }
        statusText.textContent = "사진이 적용되었어요. 컬러와 배율을 조정해보세요.";
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
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    // Some mobile browsers (notably iOS Safari) hand the blob URL off to
    // the OS save flow asynchronously — revoking too soon (or removing
    // the triggering <a> too soon) can interrupt that hand-off partway
    // through and produce a truncated/corrupted saved file, especially
    // for larger GIF/video blobs. Keeping the link in the DOM and
    // revoking after a longer delay gives that flow time to finish.
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

  // --- byte writer, used to accumulate the encoded PNG/APNG bytes ---------
  // Growable Uint8Array-backed buffer instead of a plain JS array with
  // .push(). A hand-rolled export of several megapixels × many frames can
  // produce tens of millions of bytes; pushing that many numbers onto a
  // plain array is slow and memory-heavy enough to crash the tab (this is
  // the page-error-after-saving bug). Doubling a typed array is both much
  // faster and much lighter on memory.
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

  // ---------------------------------------------------------------------
  // APNG export — true 24-bit color per frame, no fixed palette (no
  // external libraries). Replaces the old GIF path: GIF is capped at 256
  // colors per frame by the format itself, so however good the palette/
  // dithering gets, photos and gradients still show visible color
  // separation/banding. PNG (and therefore APNG) has no such limit —
  // each frame is full RGB — so that banding goes away entirely. The
  // tradeoff is a larger file (full-color frames compress less than a
  // paletted GIF frame) and slightly narrower support in some chat apps
  // that treat APNG as a static image, which is called out in the
  // in-app status message after saving.
  // ---------------------------------------------------------------------

  // --- CRC32 (required to close every PNG chunk) --------------------------
  var _crcTable = null;
  function crc32(bytes, start, length) {
    if (!_crcTable) {
      _crcTable = new Uint32Array(256);
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        _crcTable[n] = c >>> 0;
      }
    }
    start = start || 0;
    length = length === undefined ? bytes.length - start : length;
    var crc = 0xffffffff;
    for (var i = 0; i < length; i++) {
      crc = _crcTable[(crc ^ bytes[start + i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  // --- deflate via the browser's own Compression Streams API -------------
  // Avoids shipping/hand-rolling a zlib implementation just for this.
  // Support: Chrome/Edge 80+, Safari 16.4+, Firefox 113+ — effectively
  // every browser this app already targets for canvas/MediaRecorder.
  //
  // The PNG spec requires IDAT/fdAT payloads to be a full zlib datastream
  // (RFC 1950): a 2-byte zlib header, the raw DEFLATE-compressed data,
  // and a 4-byte big-endian Adler-32 checksum of the *uncompressed* data
  // — not bare DEFLATE on its own. The only deflate mode the
  // Compression Streams API exposes that maps onto standard, cross-tool
  // DEFLATE bytes is "deflate-raw" (plain "deflate" adds its own framing
  // that isn't zlib's either), so this wraps that raw output with the
  // zlib header/trailer by hand. Skipping this and using deflate-raw
  // output directly is what produced files that browsers/OS photo apps
  // correctly identified as animated PNGs (right dimensions, right frame
  // count) but then failed to decode the actual pixel data from —
  // exactly the "broken data stream" failure mode this fixes.
  function adler32(bytes) {
    var a = 1, b = 0, MOD = 65521;
    for (var i = 0; i < bytes.length; i++) {
      a = (a + bytes[i]) % MOD;
      b = (b + a) % MOD;
    }
    return ((b << 16) | a) >>> 0;
  }

  function deflateZlib(bytes) {
    if (typeof CompressionStream === "undefined") {
      return Promise.reject(new Error("CompressionStream unsupported"));
    }
    var cs = new CompressionStream("deflate-raw");
    var writer = cs.writable.getWriter();
    writer.write(bytes);
    writer.close();
    return new Response(cs.readable).arrayBuffer().then(function (buf) {
      var raw = new Uint8Array(buf);
      var checksum = adler32(bytes);
      var out = new Uint8Array(2 + raw.length + 4);
      out[0] = 0x78; out[1] = 0x9c; // zlib header: deflate, 32K window, default compression
      out.set(raw, 2);
      var off = 2 + raw.length;
      out[off] = (checksum >>> 24) & 0xff;
      out[off + 1] = (checksum >>> 16) & 0xff;
      out[off + 2] = (checksum >>> 8) & 0xff;
      out[off + 3] = checksum & 0xff;
      return out;
    });
  }

  // --- PNG chunk writer ----------------------------------------------------
  function writeChunk(out, type, data) {
    var len = data ? data.length : 0;
    out.writeByte((len >>> 24) & 0xff); out.writeByte((len >>> 16) & 0xff);
    out.writeByte((len >>> 8) & 0xff); out.writeByte(len & 0xff);
    var crcStart = out.len;
    out.writeString(type);
    if (data) out.writeBytes(data);
    var crc = crc32(out.buf, crcStart, out.len - crcStart);
    out.writeByte((crc >>> 24) & 0xff); out.writeByte((crc >>> 16) & 0xff);
    out.writeByte((crc >>> 8) & 0xff); out.writeByte(crc & 0xff);
  }

  function u32Bytes(v) {
    return [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff];
  }

  // Applies the PNG "Up" filter (each byte stored as the difference from
  // the same byte in the previous row) to every scanline. Chosen over
  // "None" because it consistently shrinks this app's frames (flat color
  // fields + smooth gradients + repeated frame-to-frame background) far
  // better than storing raw bytes, for a fraction of the CPU cost of
  // trying all five PNG filter types per line and picking the best.
  function filterUp(rgba, w, h) {
    var stride = w * 4;
    var out = new Uint8Array((stride + 1) * h);
    var prevRow = null;
    for (var y = 0; y < h; y++) {
      var rowStart = y * stride;
      var outStart = y * (stride + 1);
      out[outStart] = 2; // filter type 2 = Up
      for (var x = 0; x < stride; x++) {
        var v = rgba[rowStart + x];
        var up = prevRow ? prevRow[x] : 0;
        out[outStart + 1 + x] = (v - up) & 0xff;
      }
      prevRow = rgba.subarray(rowStart, rowStart + stride);
    }
    return out;
  }

  // RGBA Uint8ClampedArray -> zlib-compressed, filtered scanline data
  // ready to split across IDAT/fdAT chunks.
  function encodeFrameData(imgData, w, h) {
    var filtered = filterUp(imgData, w, h);
    return deflateZlib(filtered);
  }

  // Splits compressed bytes into <=maxLen chunks (PNG chunk length field
  // is 4 bytes but keeping individual chunks modest avoids ever pushing
  // a single chunk near the practical decoder-friendly size).
  function splitBytes(bytes, maxLen) {
    var parts = [];
    for (var i = 0; i < bytes.length; i += maxLen) {
      parts.push(bytes.subarray(i, Math.min(i + maxLen, bytes.length)));
    }
    return parts.length ? parts : [new Uint8Array(0)];
  }

  // opts: { width, height, frames: [{ data: Uint8ClampedArray RGBA, delayMs }], loop }
  // Returns a Promise<Uint8Array> of the full APNG file.
  function encodeAPNG(opts) {
    var width = opts.width, height = opts.height, frames = opts.frames, loop = opts.loop;
    var CHUNK_MAX = 1 << 16;

    return Promise.all(frames.map(function (f) {
      return encodeFrameData(f.data, width, height);
    })).then(function (compressedFrames) {
      var out = new ByteWriter();
      // PNG signature
      out.writeBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

      // IHDR
      var ihdr = new Uint8Array(13);
      ihdr.set(u32Bytes(width), 0);
      ihdr.set(u32Bytes(height), 4);
      ihdr[8] = 8;  // bit depth
      ihdr[9] = 6;  // color type: truecolor + alpha
      ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
      writeChunk(out, "IHDR", ihdr);

      // acTL — animation control (must precede IDAT)
      var acTL = new Uint8Array(8);
      acTL.set(u32Bytes(frames.length), 0);
      acTL.set(u32Bytes(loop ? 0 : 1), 4); // 0 = loop forever
      writeChunk(out, "acTL", acTL);

      var seq = 0;

      // First frame is written as the standard IDAT stream (also the
      // fallback image non-APNG-aware viewers/decoders show), preceded
      // by its own fcTL per the APNG spec.
      var fcTL0 = new Uint8Array(26);
      fcTL0.set(u32Bytes(seq++), 0);
      fcTL0.set(u32Bytes(width), 4);
      fcTL0.set(u32Bytes(height), 8);
      fcTL0.set(u32Bytes(0), 12); // x_offset
      fcTL0.set(u32Bytes(0), 16); // y_offset
      var delay0 = Math.max(2, Math.round(frames[0].delayMs));
      // delay as fraction delay_num/delay_den; using milliseconds/1000 den
      // keeps this exact without needing a gcd reduction step.
      fcTL0[20] = (delay0 >> 8) & 0xff; fcTL0[21] = delay0 & 0xff;
      fcTL0[22] = (1000 >> 8) & 0xff; fcTL0[23] = 1000 & 0xff;
      fcTL0[24] = 1; // dispose_op: background (matches old GIF's disposal=restore-to-background)
      fcTL0[25] = 0; // blend_op: source
      writeChunk(out, "fcTL", fcTL0);

      splitBytes(compressedFrames[0], CHUNK_MAX).forEach(function (part) {
        writeChunk(out, "IDAT", part);
      });

      // Remaining frames as fcTL + fdAT pairs
      for (var i = 1; i < frames.length; i++) {
        var fcTL = new Uint8Array(26);
        fcTL.set(u32Bytes(seq++), 0);
        fcTL.set(u32Bytes(width), 4);
        fcTL.set(u32Bytes(height), 8);
        fcTL.set(u32Bytes(0), 12);
        fcTL.set(u32Bytes(0), 16);
        var delay = Math.max(2, Math.round(frames[i].delayMs));
        fcTL[20] = (delay >> 8) & 0xff; fcTL[21] = delay & 0xff;
        fcTL[22] = (1000 >> 8) & 0xff; fcTL[23] = 1000 & 0xff;
        fcTL[24] = 1;
        fcTL[25] = 0;
        writeChunk(out, "fcTL", fcTL);

        splitBytes(compressedFrames[i], CHUNK_MAX).forEach(function (part) {
          var withSeq = new Uint8Array(4 + part.length);
          withSeq.set(u32Bytes(seq++), 0);
          withSeq.set(part, 4);
          writeChunk(out, "fdAT", withSeq);
        });
      }

      writeChunk(out, "IEND", null);
      return out.toUint8Array();
    });
  }

  function resetGifButtons() {
    downloadGifBtn.disabled = false;
    downloadPngBtn.disabled = false;
    playPreviewBtn.disabled = false;
    if (typeof downloadVideoBtn !== "undefined" && downloadVideoBtn) downloadVideoBtn.disabled = false;
    state.phase = 1;
    render();
  }

  // Downscales a source image once into an offscreen canvas capped to
  // maxDim on its longer side, and caches the result on the image object
  // itself (keyed by maxDim) so repeated calls with the same target size
  // are free. Exists because GIF/video export redraws every photo on
  // every single animation frame (dozens of times) — repeatedly asking
  // ctx.drawImage to downsample a full-resolution phone photo (often
  // 3000-4000px on a side) that many times in a row is what was causing
  // the color/pixel corruption reported on mobile: some mobile WebKit/
  // Chrome builds show tiling or color-channel glitches when the same
  // oversized source bitmap is downsampled by the GPU compositor over and
  // over in a tight loop. Pre-shrinking once to roughly export resolution
  // means every animation frame after that only ever downsamples a small,
  // already-appropriately-sized bitmap, which is both far more stable and
  // much faster.
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

  downloadGifBtn.addEventListener("click", function () {
    downloadGifBtn.disabled = true;
    downloadPngBtn.disabled = true;
    playPreviewBtn.disabled = true;
    if (typeof downloadVideoBtn !== "undefined" && downloadVideoBtn) downloadVideoBtn.disabled = true;

    if (typeof CompressionStream === "undefined") {
      statusText.textContent = "이 브라우저에서는 애니메이션 PNG 저장을 지원하지 않아요. 동영상 저장을 이용해 주세요.";
      resetGifButtons();
      return;
    }

    statusText.textContent = "이미지 프레임 렌더링 중…";

    setTimeout(function () {
      try {
        // APNG carries full 24-bit color (no 256-color palette limit like
        // GIF), so export resolution no longer needs to be inflated just
        // to keep a fixed dither pattern below the eye's resolving power
        // — 1.8x is plenty crisp on high-density phone screens while
        // keeping frame count x resolution (and therefore file size and
        // encode time) reasonable.
        var apngScale = 1.8;
        var gw = Math.round(W * apngScale), gh = Math.round(H * apngScale);
        var off = document.createElement("canvas");
        off.width = gw; off.height = gh;
        var octx = off.getContext("2d");
        octx.scale(apngScale, apngScale);

        // Pre-downscale source photos once (capped a bit above the export
        // canvas's own resolution) instead of letting every animation
        // frame re-downsample the full-resolution originals — see
        // getDownscaledPhoto for why this matters on mobile.
        var exportState = withDownscaledPhotos(state, Math.round(Math.max(gw, gh) * 1.2));

        // more photos in the stack means more frames overall, so trim the
        // per-segment step count a bit past 1 photo to keep total frame
        // count (and encode time/file size) reasonable
        var photoCount = 1 + (state.photoImg2 ? 1 : 0) + (state.photoImg3 ? 1 : 0);
        var slideSteps = photoCount > 1 ? 10 : 16;
        var holdSteps = photoCount > 1 ? 3 : 6;
        var stepsPerSeg = slideSteps + holdSteps;
        var totalSteps = stepsPerSeg * photoCount;
        var totalMs = state.gifSeconds * 1000;
        var perFrameMs = totalMs / totalSteps;
        var phases = [];
        for (var s = 0; s <= totalSteps; s++) phases.push(s / totalSteps);
        // brief extra hold on the final resting shot
        for (var h = 0; h < (photoCount > 1 ? 8 : 6); h++) phases.push(1);

        var rawFrames = phases.map(function (ph) {
          renderScene(octx, ph, exportState);
          return { data: octx.getImageData(0, 0, gw, gh).data, delayMs: perFrameMs };
        });

        statusText.textContent = "이미지 인코딩 중… (" + rawFrames.length + "프레임)";
        setTimeout(function () {
          encodeAPNG({ width: gw, height: gh, frames: rawFrames, loop: state.gifLoop })
            .then(function (bytes) {
              var blob = new Blob([bytes], { type: "image/png" });
              downloadBlob(blob, "instant-print-card.apng.png");
              statusText.textContent = "움직이는 PNG 저장 완료 (" + gw + "×" + gh + ", " + rawFrames.length + "프레임) — 색상 제한 없는 고화질 포맷이에요. 일부 앱에서는 정지 이미지로만 보일 수 있어요.";
              resetGifButtons();
            })
            .catch(function () {
              statusText.textContent = "이미지 인코딩 중 오류가 발생했어요. 다시 시도해 주세요.";
              resetGifButtons();
            });
        }, 20);
      } catch (err1) {
        statusText.textContent = "이미지 렌더링 중 오류가 발생했어요. 다시 시도해 주세요.";
        resetGifButtons();
      }
    }, 30);
  });

  // ---------------------------------------------------------------------
  // Video (WebM) export — uses the browser's own encoder via
  // canvas.captureStream() + MediaRecorder, so encoding is far faster/
  // lighter than the hand-rolled APNG path above, and file size stays
  // much smaller for the same visual quality (real video compression vs.
  // a sequence of independently-compressed full-color PNG frames).
  // Added as a companion "동영상으로 저장" button placed right after the
  // animated-PNG button.
  // ---------------------------------------------------------------------
  function createVideoButton() {
    if (!downloadGifBtn || !downloadGifBtn.parentNode) return null;
    if (typeof MediaRecorder === "undefined" ||
        !HTMLCanvasElement.prototype.captureStream) return null;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "downloadVideo";
    btn.className = downloadGifBtn.className;
    btn.textContent = "동영상으로 저장";
    downloadGifBtn.parentNode.insertBefore(btn, downloadGifBtn.nextSibling);
    return btn;
  }

  var downloadVideoBtn = createVideoButton();

  if (downloadVideoBtn) {
    downloadVideoBtn.addEventListener("click", function () {
      function resetVideoButtons() {
        downloadVideoBtn.disabled = false;
        downloadGifBtn.disabled = false;
        downloadPngBtn.disabled = false;
        playPreviewBtn.disabled = false;
        state.phase = 1;
        render();
      }

      downloadVideoBtn.disabled = true;
      downloadGifBtn.disabled = true;
      downloadPngBtn.disabled = true;
      playPreviewBtn.disabled = true;
      statusText.textContent = "동영상 녹화 준비 중…";

      try {
        var vScale = 1.6;
        var vw = Math.round(W * vScale), vh = Math.round(H * vScale);
        var off = document.createElement("canvas");
        off.width = vw; off.height = vh;
        var octx = off.getContext("2d");
        octx.scale(vScale, vScale);
        // See getDownscaledPhoto: avoids re-downsampling full-resolution
        // source photos on every recorded frame.
        var videoExportState = withDownscaledPhotos(state, Math.round(Math.max(vw, vh) * 1.2));
        renderScene(octx, 0, videoExportState);

        var fps = 30;
        var stream, track = null, manualFrames = false;
        try {
          stream = off.captureStream(0);
          track = stream.getVideoTracks && stream.getVideoTracks()[0];
          manualFrames = !!(track && typeof track.requestFrame === "function");
        } catch (probeErr) {
          manualFrames = false;
        }
        if (!manualFrames) {
          stream = off.captureStream(fps);
        }
        var mimeCandidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
        var mimeType = "";
        for (var m = 0; m < mimeCandidates.length; m++) {
          if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mimeCandidates[m])) {
            mimeType = mimeCandidates[m];
            break;
          }
        }
        var recorder = mimeType
          ? new MediaRecorder(stream, { mimeType: mimeType, videoBitsPerSecond: 8000000 })
          : new MediaRecorder(stream);
        var chunks = [];
        recorder.ondataavailable = function (e) {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        recorder.onerror = function () {
          statusText.textContent = "동영상 저장 중 오류가 발생했어요.";
          resetVideoButtons();
        };
        recorder.onstop = function () {
          try {
            var blob = new Blob(chunks, { type: mimeType || "video/webm" });
            downloadBlob(blob, "instant-print-card.webm");
            statusText.textContent = "동영상 저장 완료 (" + vw + "×" + vh + ")";
          } catch (errStop) {
            statusText.textContent = "동영상 저장 중 오류가 발생했어요.";
          }
          resetVideoButtons();
        };

        var photoCountForHold = 1 + (state.photoImg2 ? 1 : 0) + (state.photoImg3 ? 1 : 0);
        var holdMs = photoCountForHold > 1 ? 1200 : 900;
        var animMs = state.gifSeconds * 1000;

        // Fixed-timestep frame schedule instead of driving the animation
        // off real rAF wall-clock deltas. The old tick() computed
        // `t = elapsed / animMs` from `now` on every rAF callback — but
        // rAF firing isn't perfectly even (a busy main thread, GC pause,
        // or a slow paint can delay/skip a callback), and MediaRecorder
        // doesn't know or care about that: it just samples whatever the
        // canvas currently shows at its own cadence, so any uneven gap
        // between renders shows up as a stutter/hitch in the recorded
        // video even though the on-screen *preview* (which isn't going
        // through an encoder) never showed one. Precomputing an evenly
        // spaced phase list up front — same approach already used for
        // the animated-PNG export above — and pacing delivery with setTimeout at
        // a fixed target interval makes every frame land at an exact,
        // predictable spot regardless of how bursty rendering actually
        // is on the device.
        var recordFps = 30;
        var frameIntervalMs = 1000 / recordFps;
        var animFrameCount = Math.max(1, Math.round(animMs / frameIntervalMs));
        var holdFrameCount = Math.max(1, Math.round(holdMs / frameIntervalMs));
        var frameTs = [];
        for (var vf = 0; vf <= animFrameCount; vf++) frameTs.push(vf / animFrameCount);
        for (var vh2 = 0; vh2 < holdFrameCount; vh2++) frameTs.push(1);

        recorder.start();
        statusText.textContent = "동영상 녹화 중…";

        var frameIdx = 0;
        var nextFrameAt = null;
        function tick(now) {
          if (nextFrameAt === null) nextFrameAt = now;
          if (now >= nextFrameAt) {
            renderScene(octx, frameTs[frameIdx], videoExportState);
            if (manualFrames) track.requestFrame();
            frameIdx++;
            nextFrameAt += frameIntervalMs;
            // if we fell behind (e.g. a long pause), resync instead of
            // firing a burst of catch-up frames back-to-back
            if (nextFrameAt < now) nextFrameAt = now + frameIntervalMs;
          }
          if (frameIdx < frameTs.length) {
            requestAnimationFrame(tick);
          } else {
            renderScene(octx, 1, videoExportState);
            if (manualFrames) track.requestFrame();
            setTimeout(function () { recorder.stop(); }, 60);
          }
        }
        requestAnimationFrame(tick);
      } catch (errStart) {
        statusText.textContent = "이 브라우저에서는 동영상 저장을 지원하지 않아요. 움직이는 PNG 저장을 이용해 주세요.";
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
