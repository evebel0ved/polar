// 상태 관리
const state = {
  image: null,
  imageX: 50,
  imageY: 50,
  imageScale: 100,
  cameraColor: '#f5f5f5',
  bgColor: '#e8e8e8',
  animationEnabled: false,
  gifDuration: 3
};

const canvas = document.getElementById('cameraCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

// 엘리먼트 참조
const imageInput = document.getElementById('imageInput');
const fileName = document.getElementById('fileName');
const clearBtn = document.getElementById('clearBtn');
const imageXSlider = document.getElementById('imageX');
const imageYSlider = document.getElementById('imageY');
const imageScaleSlider = document.getElementById('imageScale');
const bgColorInput = document.getElementById('bgColor');
const animationToggle = document.getElementById('animationToggle');
const gifDurationSlider = document.getElementById('gifDuration');
const downloadPngBtn = document.getElementById('downloadPng');
const downloadGifBtn = document.getElementById('downloadGif');
const resetBtn = document.getElementById('resetBtn');
const colorOptions = document.querySelectorAll('.color-option');

// 이벤트 리스너
imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      state.image = new Image();
      state.image.onload = () => {
        fileName.textContent = file.name;
        render();
      };
      state.image.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});

clearBtn.addEventListener('click', () => {
  state.image = null;
  imageInput.value = '';
  fileName.textContent = '선택된 파일 없음';
  render();
});

imageXSlider.addEventListener('input', (e) => {
  state.imageX = parseInt(e.target.value);
  document.getElementById('imageXValue').textContent = state.imageX;
  render();
});

imageYSlider.addEventListener('input', (e) => {
  state.imageY = parseInt(e.target.value);
  document.getElementById('imageYValue').textContent = state.imageY;
  render();
});

imageScaleSlider.addEventListener('input', (e) => {
  state.imageScale = parseInt(e.target.value);
  document.getElementById('imageScaleValue').textContent = state.imageScale + '%';
  render();
});

bgColorInput.addEventListener('input', (e) => {
  state.bgColor = e.target.value;
  render();
});

animationToggle.addEventListener('change', (e) => {
  state.animationEnabled = e.target.checked;
});

gifDurationSlider.addEventListener('input', (e) => {
  state.gifDuration = parseFloat(e.target.value);
  document.getElementById('gifDurationValue').textContent = state.gifDuration + '초';
});

colorOptions.forEach((btn) => {
  btn.addEventListener('click', () => {
    colorOptions.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.cameraColor = btn.dataset.color;
    render();
  });
});

downloadPngBtn.addEventListener('click', downloadPNG);
downloadGifBtn.addEventListener('click', downloadGIF);

resetBtn.addEventListener('click', () => {
  if (confirm('모든 설정을 초기화하시겠습니까?')) {
    state.image = null;
    state.imageX = 50;
    state.imageY = 50;
    state.imageScale = 100;
    state.cameraColor = '#f5f5f5';
    state.bgColor = '#e8e8e8';
    state.animationEnabled = false;
    state.gifDuration = 3;

    imageInput.value = '';
    fileName.textContent = '선택된 파일 없음';
    imageXSlider.value = 50;
    imageYSlider.value = 50;
    imageScaleSlider.value = 100;
    bgColorInput.value = '#e8e8e8';
    animationToggle.checked = false;
    gifDurationSlider.value = 3;

    document.getElementById('imageXValue').textContent = '50';
    document.getElementById('imageYValue').textContent = '50';
    document.getElementById('imageScaleValue').textContent = '100%';
    document.getElementById('gifDurationValue').textContent = '3초';

    colorOptions.forEach((b, idx) => {
      if (idx === 0) b.classList.add('active');
      else b.classList.remove('active');
    });

    render();
  }
});

// 초기 색상 설정
colorOptions[0].classList.add('active');

// 렌더링 함수
function render() {
  const w = canvas.width;
  const h = canvas.height;

  // 배경
  ctx.fillStyle = state.bgColor;
  ctx.fillRect(0, 0, w, h);

  // 폴라로이드 카메라 그리기
  drawPolaroidCamera();
}

function drawPolaroidCamera() {
  const w = canvas.width;
  const h = canvas.height;

  // 카메라 바디 (왼쪽)
  const cameraX = 50;
  const cameraY = (h - 300) / 2;
  const cameraWidth = 280;
  const cameraHeight = 300;

  // 카메라 배경
  ctx.fillStyle = state.cameraColor;
  ctx.beginPath();
  ctx.roundRect(cameraX, cameraY, cameraWidth, cameraHeight, 15);
  ctx.fill();

  // 카메라 테두리 (3D 효과)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cameraX + 2, cameraY + 2, cameraWidth - 4, cameraHeight - 4, 12);
  ctx.stroke();

  // 렌즈
  const lensX = cameraX + cameraWidth / 2;
  const lensY = cameraY + 120;
  const lensRadius = 60;

  // 렌즈 그림자
  const lensGradient = ctx.createRadialGradient(lensX - 15, lensY - 15, 10, lensX, lensY, lensRadius);
  lensGradient.addColorStop(0, '#555');
  lensGradient.addColorStop(1, '#222');
  ctx.fillStyle = lensGradient;
  ctx.beginPath();
  ctx.arc(lensX, lensY, lensRadius, 0, Math.PI * 2);
  ctx.fill();

  // 렌즈 테두리
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 렌즈 반사
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.arc(lensX - 20, lensY - 20, 15, 0, Math.PI * 2);
  ctx.fill();

  // 카메라 상단 부분
  ctx.fillStyle = state.cameraColor;
  ctx.fillRect(cameraX + 20, cameraY - 20, cameraWidth - 40, 20);

  // 플래시
  ctx.fillStyle = '#ddd';
  ctx.fillRect(cameraX + 30, cameraY + 20, 25, 25);
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  ctx.strokeRect(cameraX + 30, cameraY + 20, 25, 25);

  // 로고 텍스트
  ctx.fillStyle = '#333';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('LEICA', lensX, cameraY + 30);

  // 출력되는 사진 (오른쪽)
  const photoCardX = cameraX + cameraWidth + 40;
  const photoCardY = cameraY + 20;
  const photoCardWidth = 200;
  const photoCardHeight = 240;

  // 사진 카드 백그라운드
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 5;
  ctx.fillRect(photoCardX, photoCardY, photoCardWidth, photoCardHeight);
  ctx.shadowColor = 'transparent';

  // 사진 영역
  const photoAreaX = photoCardX + 10;
  const photoAreaY = photoCardY + 10;
  const photoAreaWidth = photoCardWidth - 20;
  const photoAreaHeight = photoCardHeight * 0.75;

  // 사진 배경색
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(photoAreaX, photoAreaY, photoAreaWidth, photoAreaHeight);

  // 사진 그리기
  if (state.image) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(photoAreaX, photoAreaY, photoAreaWidth, photoAreaHeight);
    ctx.clip();

    const imgWidth = photoAreaWidth * (state.imageScale / 100);
    const imgHeight = (state.image.height / state.image.width) * imgWidth;

    const offsetX = photoAreaX + (photoAreaWidth - imgWidth) * (state.imageX / 100);
    const offsetY = photoAreaY + (photoAreaHeight - imgHeight) * (state.imageY / 100);

    ctx.drawImage(state.image, offsetX, offsetY, imgWidth, imgHeight);
    ctx.restore();
  }

  // 사진 하단 여백 (날짜)
  ctx.fillStyle = '#fff';
  ctx.fillRect(photoAreaX, photoAreaY + photoAreaHeight, photoAreaWidth, photoCardHeight - photoAreaHeight - 10);

  ctx.fillStyle = '#999';
  ctx.font = '10px Arial';
  ctx.textAlign = 'left';
  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  ctx.fillText(dateStr, photoCardX + 12, photoCardY + photoCardHeight - 8);
}

// Canvas roundRect 폴리필
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}

function downloadPNG() {
  const scale = 6;
  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = canvas.width * scale;
  renderCanvas.height = canvas.height * scale;
  const renderCtx = renderCanvas.getContext('2d');
  renderCtx.scale(scale, scale);

  // 배경
  renderCtx.fillStyle = state.bgColor;
  renderCtx.fillRect(0, 0, canvas.width, canvas.height);

  // 카메라 그리기 (고화질)
  drawPolaroidCameraHQ(renderCtx, scale);

  renderCanvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `polaroid_${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

function drawPolaroidCameraHQ(renderCtx, scale) {
  const w = canvas.width;
  const h = canvas.height;

  // 카메라 바디
  const cameraX = 50;
  const cameraY = (h - 300) / 2;
  const cameraWidth = 280;
  const cameraHeight = 300;

  renderCtx.fillStyle = state.cameraColor;
  renderCtx.beginPath();
  renderCtx.roundRect(cameraX, cameraY, cameraWidth, cameraHeight, 15);
  renderCtx.fill();

  renderCtx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  renderCtx.lineWidth = 2;
  renderCtx.beginPath();
  renderCtx.roundRect(cameraX + 2, cameraY + 2, cameraWidth - 4, cameraHeight - 4, 12);
  renderCtx.stroke();

  // 렌즈
  const lensX = cameraX + cameraWidth / 2;
  const lensY = cameraY + 120;
  const lensRadius = 60;

  const lensGradient = renderCtx.createRadialGradient(lensX - 15, lensY - 15, 10, lensX, lensY, lensRadius);
  lensGradient.addColorStop(0, '#555');
  lensGradient.addColorStop(1, '#222');
  renderCtx.fillStyle = lensGradient;
  renderCtx.beginPath();
  renderCtx.arc(lensX, lensY, lensRadius, 0, Math.PI * 2);
  renderCtx.fill();

  renderCtx.strokeStyle = '#111';
  renderCtx.lineWidth = 3;
  renderCtx.stroke();

  renderCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  renderCtx.beginPath();
  renderCtx.arc(lensX - 20, lensY - 20, 15, 0, Math.PI * 2);
  renderCtx.fill();

  // 상단 부분
  renderCtx.fillStyle = state.cameraColor;
  renderCtx.fillRect(cameraX + 20, cameraY - 20, cameraWidth - 40, 20);

  // 플래시
  renderCtx.fillStyle = '#ddd';
  renderCtx.fillRect(cameraX + 30, cameraY + 20, 25, 25);
  renderCtx.strokeStyle = '#999';
  renderCtx.lineWidth = 1;
  renderCtx.strokeRect(cameraX + 30, cameraY + 20, 25, 25);

  // 로고
  renderCtx.fillStyle = '#333';
  renderCtx.font = 'bold 12px Arial';
  renderCtx.textAlign = 'center';
  renderCtx.fillText('LEICA', lensX, cameraY + 30);

  // 출력되는 사진
  const photoCardX = cameraX + cameraWidth + 40;
  const photoCardY = cameraY + 20;
  const photoCardWidth = 200;
  const photoCardHeight = 240;

  renderCtx.fillStyle = '#fff';
  renderCtx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  renderCtx.shadowBlur = 15;
  renderCtx.shadowOffsetX = 5;
  renderCtx.shadowOffsetY = 5;
  renderCtx.fillRect(photoCardX, photoCardY, photoCardWidth, photoCardHeight);
  renderCtx.shadowColor = 'transparent';

  const photoAreaX = photoCardX + 10;
  const photoAreaY = photoCardY + 10;
  const photoAreaWidth = photoCardWidth - 20;
  const photoAreaHeight = photoCardHeight * 0.75;

  renderCtx.fillStyle = '#f0f0f0';
  renderCtx.fillRect(photoAreaX, photoAreaY, photoAreaWidth, photoAreaHeight);

  if (state.image) {
    renderCtx.save();
    renderCtx.beginPath();
    renderCtx.rect(photoAreaX, photoAreaY, photoAreaWidth, photoAreaHeight);
    renderCtx.clip();

    const imgWidth = photoAreaWidth * (state.imageScale / 100);
    const imgHeight = (state.image.height / state.image.width) * imgWidth;

    const offsetX = photoAreaX + (photoAreaWidth - imgWidth) * (state.imageX / 100);
    const offsetY = photoAreaY + (photoAreaHeight - imgHeight) * (state.imageY / 100);

    renderCtx.drawImage(state.image, offsetX, offsetY, imgWidth, imgHeight);
    renderCtx.restore();
  }

  renderCtx.fillStyle = '#fff';
  renderCtx.fillRect(photoAreaX, photoAreaY + photoAreaHeight, photoAreaWidth, photoCardHeight - photoAreaHeight - 10);

  renderCtx.fillStyle = '#999';
  renderCtx.font = '10px Arial';
  renderCtx.textAlign = 'left';
  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  renderCtx.fillText(dateStr, photoCardX + 12, photoCardY + photoCardHeight - 8);
}

function downloadGIF() {
  if (!window.GIF) {
    alert('GIF 라이브러리 로딩 중입니다. 잠시 후 다시 시도해주세요.');
    return;
  }

  const frames = [];
  const frameCount = Math.ceil(state.gifDuration * 10);
  const scale = 6;

  if (state.animationEnabled && state.image) {
    // 슬라이드 애니메이션
    for (let i = 0; i < frameCount; i++) {
      const progress = i / (frameCount - 1);
      const originalX = state.imageX;
      const originalY = state.imageY;

      // 사진이 왼쪽에서 오른쪽으로 출력되도록
      state.imageX = Math.max(0, originalX - 100 + (100 * progress));

      const renderCanvas = document.createElement('canvas');
      renderCanvas.width = canvas.width * scale;
      renderCanvas.height = canvas.height * scale;
      const renderCtx = renderCanvas.getContext('2d');
      renderCtx.scale(scale, scale);

      renderCtx.fillStyle = state.bgColor;
      renderCtx.fillRect(0, 0, canvas.width, canvas.height);
      drawPolaroidCameraHQ(renderCtx, scale);

      frames.push(renderCanvas);

      state.imageX = originalX;
      state.imageY = originalY;
    }
  } else {
    // 정적 이미지
    for (let i = 0; i < frameCount; i++) {
      const renderCanvas = document.createElement('canvas');
      renderCanvas.width = canvas.width * scale;
      renderCanvas.height = canvas.height * scale;
      const renderCtx = renderCanvas.getContext('2d');
      renderCtx.scale(scale, scale);

      renderCtx.fillStyle = state.bgColor;
      renderCtx.fillRect(0, 0, canvas.width, canvas.height);
      drawPolaroidCameraHQ(renderCtx, scale);

      frames.push(renderCanvas);
    }
  }

  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: canvas.width * scale,
    height: canvas.height * scale
  });

  const frameDelay = Math.round((state.gifDuration * 1000) / frameCount);
  frames.forEach((frame) => {
    gif.addFrame(frame, { delay: frameDelay });
  });

  gif.on('finished', function (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `polaroid_${Date.now()}.gif`;
    a.click();
    URL.revokeObjectURL(url);
  });

  gif.render();
}

// 초기 렌더링
render();