class CameraEngine {
  constructor() {
    this.canvas = document.getElementById('mainCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.state = {
      photo: null,
      cameraColor: 'white',
      posX: 0,
      posY: 0,
      scale: 100,
      bgMode: 'light',
      animEnabled: false,
      gifDuration: 3
    };
    this.setupEventListeners();
    this.animate();
  }

  setupEventListeners() {
    // Photo upload
    document.getElementById('photoInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          this.state.photo = new Image();
          this.state.photo.onload = () => {
            document.getElementById('photoInfo').textContent = file.name;
          };
          this.state.photo.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });

    // Camera color
    document.querySelectorAll('.color-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.cameraColor = btn.dataset.color;
      });
    });

    // Position sliders
    document.getElementById('posX').addEventListener('input', (e) => {
      this.state.posX = parseInt(e.target.value);
      document.getElementById('posXVal').textContent = this.state.posX;
    });

    document.getElementById('posY').addEventListener('input', (e) => {
      this.state.posY = parseInt(e.target.value);
      document.getElementById('posYVal').textContent = this.state.posY;
    });

    document.getElementById('scale').addEventListener('input', (e) => {
      this.state.scale = parseInt(e.target.value);
      document.getElementById('scaleVal').textContent = this.state.scale + '%';
    });

    // Background
    document.querySelectorAll('input[name="bg"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.state.bgMode = e.target.value;
      });
    });

    // Animation
    document.getElementById('animToggle').addEventListener('change', (e) => {
      this.state.animEnabled = e.target.checked;
    });

    document.getElementById('gifDuration').addEventListener('input', (e) => {
      this.state.gifDuration = parseFloat(e.target.value);
      document.getElementById('durationVal').textContent = this.state.gifDuration + 's';
    });

    // Export buttons
    document.getElementById('downloadPng').addEventListener('click', () => this.exportPNG());
    document.getElementById('downloadGif').addEventListener('click', () => this.exportGIF());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
  }

  getColorScheme() {
    const schemes = {
      white: { primary: '#fafafa', secondary: '#f5f5f5' },
      champagne: { primary: '#f5f0e8', secondary: '#ede5dd' },
      'pastel-blue': { primary: '#e8f4ff', secondary: '#d8e8f7' },
      'pastel-pink': { primary: '#ffe8f0', secondary: '#f5dce5' },
      'pastel-green': { primary: '#e8ffe8', secondary: '#d8f5d8' },
      black: { primary: '#2a2a2a', secondary: '#1a1a1a' }
    };
    return schemes[this.state.cameraColor] || schemes.white;
  }

  getCameraBodyColor() {
    const colors = {
      white: { body: '#f8f8f8', accent: '#e0e0e0' },
      champagne: { body: '#f5f0e8', accent: '#dcc9b5' },
      'pastel-blue': { body: '#e8f4ff', accent: '#b8d8ff' },
      'pastel-pink': { body: '#ffe8f0', accent: '#ffb8d8' },
      'pastel-green': { body: '#e8ffe8', accent: '#b8ffb8' },
      black: { body: '#1a1a1a', accent: '#333333' }
    };
    return colors[this.state.cameraColor] || colors.white;
  }

  drawBackground() {
    const bgModes = {
      light: { start: '#fbfbfb', end: '#f0f0f0', accent: '#e8e8e8' },
      neutral: { start: '#f5f5f5', end: '#ebebeb', accent: '#e0e0e0' },
      warm: { start: '#faf8f5', end: '#f0e8e3', accent: '#e8ddd0' }
    };
    const mode = bgModes[this.state.bgMode] || bgModes.light;

    const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    gradient.addColorStop(0, mode.start);
    gradient.addColorStop(1, mode.end);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Subtle grain
    this.ctx.fillStyle = `rgba(0, 0, 0, 0.015)`;
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      const size = Math.random() * 2;
      this.ctx.fillRect(x, y, size, size);
    }
  }

  drawCamera() {
    const colors = this.getCameraBodyColor();
    const centerX = this.canvas.width / 2 - 180;
    const centerY = this.canvas.height / 2;

    // Camera body
    this.ctx.fillStyle = colors.body;
    this.ctx.strokeStyle = colors.accent;
    this.ctx.lineWidth = 1.5;
    this.drawRoundRect(centerX - 90, centerY - 110, 180, 220, 12);
    this.ctx.fill();
    this.ctx.stroke();

    // Shadow for depth
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    this.ctx.shadowBlur = 20;
    this.ctx.shadowOffsetX = 5;
    this.ctx.shadowOffsetY = 8;
    this.ctx.fillStyle = colors.body;
    this.drawRoundRect(centerX - 90, centerY - 110, 180, 220, 12);
    this.ctx.fill();
    this.ctx.shadowColor = 'transparent';

    // Top panel
    this.ctx.fillStyle = '#1a1a1a';
    this.drawRoundRect(centerX - 85, centerY - 105, 170, 45, 8);
    this.ctx.fill();

    // Brand text
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 11px DM Sans';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('SOFORT', centerX - 80, centerY - 92);

    // Leica logo circle
    this.ctx.fillStyle = '#d41919';
    this.ctx.beginPath();
    this.ctx.arc(centerX + 50, centerY - 84, 6, 0, Math.PI * 2);
    this.ctx.fill();

    // Flash indicator
    this.ctx.fillStyle = '#c0e8ff';
    this.drawRoundRect(centerX + 62, centerY - 95, 15, 10, 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#888';
    this.ctx.lineWidth = 0.5;
    this.ctx.stroke();

    // Lens assembly
    const lensX = centerX;
    const lensY = centerY + 5;
    const lensRadius = 45;

    // Lens gradient (3D effect)
    const lensGradient = this.ctx.createRadialGradient(lensX - 12, lensY - 12, 15, lensX, lensY, lensRadius);
    lensGradient.addColorStop(0, '#444');
    lensGradient.addColorStop(0.6, '#1a1a1a');
    lensGradient.addColorStop(1, '#000');
    this.ctx.fillStyle = lensGradient;
    this.ctx.beginPath();
    this.ctx.arc(lensX, lensY, lensRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Lens ring
    this.ctx.strokeStyle = '#222';
    this.ctx.lineWidth = 2.5;
    this.ctx.stroke();

    // Lens concentric rings
    for (let i = 1; i <= 3; i++) {
      this.ctx.strokeStyle = `rgba(100, 100, 100, ${0.15 - i * 0.04})`;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(lensX, lensY, lensRadius * (i / 3.5), 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // Lens highlight
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    this.ctx.beginPath();
    this.ctx.arc(lensX - 16, lensY - 16, 10, 0, Math.PI * 2);
    this.ctx.fill();

    // Lens inner shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    this.ctx.beginPath();
    this.ctx.arc(lensX, lensY, 20, 0, Math.PI * 2);
    this.ctx.fill();

    // Lens text
    this.ctx.fillStyle = '#555';
    this.ctx.font = 'bold 8px DM Sans';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('LEICA', lensX, centerY + 70);

    // Bottom grip area
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    this.drawRoundRect(centerX - 80, centerY + 80, 160, 25, 6);
    this.ctx.fill();
  }

  drawPrintedPhoto() {
    const cardX = this.canvas.width / 2 + 100;
    const cardY = this.canvas.height / 2 - 80;
    const cardWidth = 150;
    const cardHeight = 160;

    // Card shadow
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    this.ctx.shadowBlur = 15;
    this.ctx.shadowOffsetX = 3;
    this.ctx.shadowOffsetY = 6;

    // Card base
    this.ctx.fillStyle = '#fff';
    this.drawRoundRect(cardX, cardY, cardWidth, cardHeight, 2);
    this.ctx.fill();
    this.ctx.shadowColor = 'transparent';

    // Photo area background
    this.ctx.fillStyle = '#fafafa';
    this.drawRoundRect(cardX + 4, cardY + 4, cardWidth - 8, cardHeight - 28, 1);
    this.ctx.fill();

    // Draw photo
    if (this.state.photo) {
      this.ctx.save();
      this.ctx.beginPath();
      this.drawRoundRect(cardX + 4, cardY + 4, cardWidth - 8, cardHeight - 28, 1);
      this.ctx.clip();

      const photoWidth = (cardWidth - 8) * (this.state.scale / 100);
      const photoHeight = (this.state.photo.height / this.state.photo.width) * photoWidth;

      const offsetX = (this.state.posX / 100) * 20;
      const offsetY = (this.state.posY / 100) * 20;

      const centerPhotoX = cardX + 4 + (cardWidth - 8) / 2 - photoWidth / 2 + offsetX;
      const centerPhotoY = cardY + 4 + (cardHeight - 28) / 2 - photoHeight / 2 + offsetY;

      this.ctx.drawImage(this.state.photo, centerPhotoX, centerPhotoY, photoWidth, photoHeight);
      this.ctx.restore();
    }

    // White bottom area
    this.ctx.fillStyle = '#fff';
    this.drawRoundRect(cardX + 4, cardY + cardHeight - 24, cardWidth - 8, 20, 1);
    this.ctx.fill();

    // Date
    this.ctx.fillStyle = '#bbb';
    this.ctx.font = '7px DM Sans';
    this.ctx.textAlign = 'left';
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
    this.ctx.fillText(dateStr, cardX + 6, cardY + cardHeight - 6);
  }

  drawRoundRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + w - radius, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    this.ctx.lineTo(x + w, y + h - radius);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    this.ctx.lineTo(x + radius, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  render() {
    this.drawBackground();
    this.drawCamera();
    this.drawPrintedPhoto();
  }

  animate() {
    this.render();
    requestAnimationFrame(() => this.animate());
  }

  async exportPNG() {
    const scale = 6;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.canvas.width * scale;
    exportCanvas.height = this.canvas.height * scale;
    const exportCtx = exportCanvas.getContext('2d');
    exportCtx.scale(scale, scale);

    // Render at high quality
    const bgModes = {
      light: { start: '#fbfbfb', end: '#f0f0f0', accent: '#e8e8e8' },
      neutral: { start: '#f5f5f5', end: '#ebebeb', accent: '#e0e0e0' },
      warm: { start: '#faf8f5', end: '#f0e8e3', accent: '#e8ddd0' }
    };
    const mode = bgModes[this.state.bgMode] || bgModes.light;

    const gradient = exportCtx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    gradient.addColorStop(0, mode.start);
    gradient.addColorStop(1, mode.end);
    exportCtx.fillStyle = gradient;
    exportCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Render engine
    const tempState = this.state;
    this.ctx = exportCtx;
    this.drawCamera();
    this.drawPrintedPhoto();
    this.ctx = this.canvas.getContext('2d');

    exportCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sofort_${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  exportGIF() {
    if (!window.GIF) {
      alert('Loading GIF library...');
      return;
    }

    const frames = [];
    const frameCount = Math.ceil(this.state.gifDuration * 10);
    const scale = 6;

    if (this.state.animEnabled && this.state.photo) {
      for (let i = 0; i < frameCount; i++) {
        const progress = i / (frameCount - 1);
        const originalX = this.state.posX;
        this.state.posX = -100 + (200 * progress);

        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = this.canvas.width * scale;
        frameCanvas.height = this.canvas.height * scale;
        const frameCtx = frameCanvas.getContext('2d');
        frameCtx.scale(scale, scale);

        const bgModes = {
          light: { start: '#fbfbfb', end: '#f0f0f0', accent: '#e8e8e8' },
          neutral: { start: '#f5f5f5', end: '#ebebeb', accent: '#e0e0e0' },
          warm: { start: '#faf8f5', end: '#f0e8e3', accent: '#e8ddd0' }
        };
        const mode = bgModes[this.state.bgMode] || bgModes.light;

        const gradient = frameCtx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, mode.start);
        gradient.addColorStop(1, mode.end);
        frameCtx.fillStyle = gradient;
        frameCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const tempCtx = this.ctx;
        this.ctx = frameCtx;
        this.drawCamera();
        this.drawPrintedPhoto();
        this.ctx = tempCtx;

        frames.push(frameCanvas);
        this.state.posX = originalX;
      }
    } else {
      for (let i = 0; i < frameCount; i++) {
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = this.canvas.width * scale;
        frameCanvas.height = this.canvas.height * scale;
        const frameCtx = frameCanvas.getContext('2d');
        frameCtx.scale(scale, scale);

        const bgModes = {
          light: { start: '#fbfbfb', end: '#f0f0f0', accent: '#e8e8e8' },
          neutral: { start: '#f5f5f5', end: '#ebebeb', accent: '#e0e0e0' },
          warm: { start: '#faf8f5', end: '#f0e8e3', accent: '#e8ddd0' }
        };
        const mode = bgModes[this.state.bgMode] || bgModes.light;

        const gradient = frameCtx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, mode.start);
        gradient.addColorStop(1, mode.end);
        frameCtx.fillStyle = gradient;
        frameCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const tempCtx = this.ctx;
        this.ctx = frameCtx;
        this.drawCamera();
        this.drawPrintedPhoto();
        this.ctx = tempCtx;

        frames.push(frameCanvas);
      }
    }

    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: this.canvas.width * scale,
      height: this.canvas.height * scale
    });

    const frameDelay = Math.round((this.state.gifDuration * 1000) / frameCount);
    frames.forEach((frame) => {
      gif.addFrame(frame, { delay: frameDelay });
    });

    gif.on('finished', (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sofort_${Date.now()}.gif`;
      a.click();
      URL.revokeObjectURL(url);
    });

    gif.render();
  }

  reset() {
    if (confirm('Reset all settings?')) {
      this.state = {
        photo: null,
        cameraColor: 'white',
        posX: 0,
        posY: 0,
        scale: 100,
        bgMode: 'light',
        animEnabled: false,
        gifDuration: 3
      };

      document.getElementById('photoInput').value = '';
      document.getElementById('photoInfo').textContent = 'No image selected';
      document.getElementById('posX').value = 0;
      document.getElementById('posY').value = 0;
      document.getElementById('scale').value = 100;
      document.getElementById('posXVal').textContent = '0';
      document.getElementById('posYVal').textContent = '0';
      document.getElementById('scaleVal').textContent = '100%';
      document.querySelector('input[value="light"]').checked = true;
      document.getElementById('animToggle').checked = false;
      document.getElementById('gifDuration').value = 3;
      document.getElementById('durationVal').textContent = '3s';

      document.querySelectorAll('.color-swatch').forEach((b, idx) => {
        if (idx === 0) b.classList.add('active');
        else b.classList.remove('active');
      });
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new CameraEngine();
});