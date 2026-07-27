// 상태 관리
const state = {
  photo: null,
  photoX: 100,
  photoY: 120,
  photoScale: 100,
  cameraColor: '#f5f5f5',
  bgColor: '#f5f1f0',
  gradientIntensity: 30,
  gifSeconds: 2.5,
  animationType: false,
  autoAspect: true
};

const canvas = document.getElementById('polaroidCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

// 버튼 요소들
const pickPhotoBtn = document.getElementById('pickPhoto');
const photoInput = document.getElementById('photoInput');
const clearPhotoBtn = document.getElementById('clearPhoto');
const photoXInput = document.getElementById('photoX');
const photoYInput = document.getElementById('photoY');
const photoScaleInput = document.getElementById('photoScale');
const bgColorInput = document.getElementById('bgColor');
const gradientIntensityInput = document.getElementById('gradientIntensity');
const gifSecondsInput = document.getElementById('gifSeconds');
const animationTypeCheckbox = document.getElementById('animationType');
const autoAspectCheckbox = document.getElementById('autoAspect');
const downloadPngBtn = document.getElementById('downloadPng');
const downloadPngTopBtn = document.getElementById('downloadPngTop');
const downloadGifBtn = document.getElementById('downloadGif');
const downloadGifTopBtn = document.getElementById('downloadGifTop');
const resetBtn = document.getElementById('resetBtn');
const statusText = document.getElementById('statusText');
const photoStatus = document.getElementById('photoStatus');

// 카메라 색상 버튼
const cameraColorBtns = document.querySelectorAll('[data-camera-color]');

// 이벤트 리스너
pickPhotoBtn.addEventListener('click', () => photoInput.click());

photoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      state.photo = new Image();
      state.photo.onload = () => {
        if (state.autoAspect) {
          // 자동 비율 계산
          const aspectRatio = state.photo.width / state.photo.height;
          const maxWidth = 900;
          const maxHeight = 1000;
          
          let photoWidth = maxWidth;
          let photoHeight = photoWidth / aspectRatio;
          
          if (photoHeight > maxHeight) {
            photoHeight = maxHeight;
            photoWidth = photoHeight * aspectRatio;
          }
          
          state.photoScale = Math.round((photoWidth / 900) * 100);
          photoScaleInput.value = state.photoScale;
          document.getElementById('photoScaleValue').textContent = state.photoScale + '%';
        }
        photoStatus.textContent = file.name;
        render();
      };
      state.photo.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});

clearPhotoBtn.addEventListener('click', () => {
  state.photo = null;
  photoInput.value = '';
  photoStatus.textContent = '사진 없음';
  render();
});

photoXInput.addEventListener('input', (e) => {
  state.photoX = parseInt(e.target.value);
  document.getElementById('photoXValue').textContent = state.photoX;
  render();
});

photoYInput.addEventListener('input', (e) => {
  state.photoY = parseInt(e.target.value);
  document.getElementById('photoYValue').textContent = state.photoY;
  render();
});

photoScaleInput.addEventListener('input', (e) => {
  state.photoScale = parseInt(e.target.value);
  document.getElementById('photoScaleValue').textContent = state.photoScale + '%';
  render();
});

bgColorInput.addEventListener('input', (e) => {
  state.bgColor = e.target.value;
  render();
});

gradientIntensityInput.addEventListener('input', (e) => {
  state.gradientIntensity = parseInt(e.target.value);
  document.getElementById('gradientValue').textContent = state.gradientIntensity + '%';
  render();
});

gifSecondsInput.addEventListener('input', (e) => {
  state.gifSeconds = parseFloat(e.target.value);
  document.getElementById('gifSecondsValue').textContent = state.gifSeconds + '초';
});

animationTypeCheckbox.addEventListener('change', (e) => {
  state.animationType = e.target.checked;
});

autoAspectCheckbox.addEventListener('change', (e) => {
  state.autoAspect = e.target.checked;
});

cameraColorBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    cameraColorBtns.forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    state.cameraColor = e.target.dataset.cameraColor;
    render();
  });
});

// 초기 카메라 색상 버튼 활성화
cameraColorBtns[0].classList.add('active');

downloadPngBtn.addEventListener('click', downloadPNG);
downloadPngTopBtn.addEventListener('click', downloadPNG);
downloadGifBtn.addEventListener('click', downloadGIF);
downloadGifTopBtn.addEventListener('click', downloadGIF);

resetBtn.addEventListener('click', () => {
  if (confirm('모든 설정을 초기화하시겠습니까?')) {
    state.photo = null;
    state.photoX = 100;
    state.photoY = 120;
    state.photoScale = 100;
    state.cameraColor = '#f5f5f5';
    state.bgColor = '#f5f1f0';
    state.gradientIntensity = 30;
    state.gifSeconds = 2.5;
    state.animationType = false;
    
    photoInput.value = '';
    photoStatus.textContent = '사진 없음';
    photoXInput.value = 100;
    photoYInput.value = 120;
    photoScaleInput.value = 100;
    bgColorInput.value = '#f5f1f0';
    gradientIntensityInput.value = 30;
    gifSecondsInput.value = 2.5;
    animationTypeCheckbox.checked = false;
    
    document.getElementById('photoXValue').textContent = '100';
    document.getElementById('photoYValue').textContent = '120';
    document.getElementById('photoScaleValue').textContent = '100%';
    document.getElementById('gradientValue').textContent = '30%';
    document.getElementById('gifSecondsValue').textContent = '2.5초';
    
    cameraColorBtns.forEach(b => b.classList.remove('active'));
    cameraColorBtns[0].classList.add('active');
    
    render();
  }
});

// 헥스 색상을 RGB로 변환
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

// RGB를 16진수로 변환
function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// 테마 컬러 기반 배경 그라데이션
function getBackgroundGradient(baseColor, intensity) {
  const rgb = hexToRgb(baseColor);
  const intensityFactor = intensity / 100;
  
  // 밝아진 버전
  const lightR = Math.min(255, rgb.r + (255 - rgb.r) * intensityFactor * 0.4);
  const lightG = Math.min(255, rgb.g + (255 - rgb.g) * intensityFactor * 0.4);
  const lightB = Math.min(255, rgb.b + (255 - rgb.b) * intensityFactor * 0.4);
  
  // 어두어진 버전
  const darkR = Math.max(0, rgb.r - rgb.r * intensityFactor * 0.3);
  const darkG = Math.max(0, rgb.g - rgb.g * intensityFactor * 0.3);
  const darkB = Math.max(0, rgb.b - rgb.b * intensityFactor * 0.3);
  
  return {
    base: baseColor,
    light: rgbToHex(Math.round(lightR), Math.round(lightG), Math.round(lightB)),
    dark: rgbToHex(Math.round(darkR), Math.round(darkG), Math.round(darkB))
  };
}

// 메인 렌더링 함수
function render() {
  const scale = 6; // 고화질 배수
  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = canvas.width * scale;
  renderCanvas.height = canvas.height * scale;
  
  drawPolaroid(renderCanvas, scale);
  
  // 화면에 표시할 미리보기 캔버스
  drawPolaroid(canvas, 1);
}

function drawPolaroid(targetCanvas, scale) {
  const ctx = targetCanvas.getContext('2d');
  const w = targetCanvas.width;
  const h = targetCanvas.height;
  
  // 배경 그라데이션
  const gradients = getBackgroundGradient(state.bgColor, state.gradientIntensity);
  
  // 방사형 그라데이션
  const radialGradient = ctx.createRadialGradient(w * 0.15, h * 0.15, 0, w * 0.5, h * 0.5, w);
  radialGradient.addColorStop(0, gradients.light);
  radialGradient.addColorStop(0.5, gradients.base);
  radialGradient.addColorStop(1, gradients.dark);
  
  ctx.fillStyle = radialGradient;
  ctx.fillRect(0, 0, w, h);
  
  // 폴라로이드 카드 그리기
  drawPolaroidCard(ctx, w, h, scale);
}

function drawPolaroidCard(ctx, canvasWidth, canvasHeight, scale) {
  const cardWidth = canvasWidth * 0.6;
  const cardHeight = canvasHeight * 0.8;
  const cardX = (canvasWidth - cardWidth) / 2;
  const cardY = (canvasHeight - cardHeight) / 2;
  
  // 카드 배경
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 40 * scale;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 20 * scale;
  ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
  ctx.shadowColor = 'transparent';
  
  // 사진 영역 배경
  const photoAreaX = cardX + 30 * scale;
  const photoAreaY = cardY + 30 * scale;
  const photoAreaWidth = cardWidth - 60 * scale;
  const photoAreaHeight = cardHeight * 0.65;
  
  ctx.fillStyle = state.cameraColor;
  ctx.fillRect(photoAreaX, photoAreaY, photoAreaWidth, photoAreaHeight);
  
  // 사진 그리기
  if (state.photo) {
    const photoWidth = (photoAreaWidth * state.photoScale) / 100;
    const photoHeight = (photoAreaHeight * state.photoScale) / 100;
    const photoX = photoAreaX + state.photoX * scale;
    const photoY = photoAreaY + state.photoY * scale;
    
    // 클리핑 영역 설정
    ctx.save();
    ctx.beginPath();
    ctx.rect(photoAreaX, photoAreaY, photoAreaWidth, photoAreaHeight);
    ctx.clip();
    
    ctx.drawImage(state.photo, photoX, photoY, photoWidth, photoHeight);
    ctx.restore();
  }
  
  // 하단 여백
  const textAreaY = photoAreaY + photoAreaHeight + 20 * scale;
  const textAreaHeight = cardHeight - (textAreaY - cardY) - 20 * scale;
  
  // 텍스트 영역 배경
  ctx.fillStyle = '#fffbf8';
  ctx.fillRect(photoAreaX, textAreaY, photoAreaWidth, textAreaHeight);
  
  // 텍스트
  ctx.fillStyle = state.cameraColor;
  ctx.font = `bold ${24 * scale}px 'Jua', sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('Polaroid', photoAreaX + 15 * scale, textAreaY + 35 * scale);
  
  ctx.font = `${16 * scale}px 'Jua', sans-serif`;
  ctx.fillStyle = '#999';
  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  ctx.textAlign = 'right';
  ctx.fillText(dateStr, photoAreaX + photoAreaWidth - 15 * scale, textAreaY + 35 * scale);
}

function downloadPNG() {
  statusText.textContent = '다운로드 중...';
  downloadPngBtn.disabled = true;
  downloadPngTopBtn.disabled = true;
  
  const scale = 6;
  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = canvas.width * scale;
  renderCanvas.height = canvas.height * scale;
  
  drawPolaroid(renderCanvas, scale);
  
  renderCanvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `polaroid_${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    
    statusText.textContent = 'PNG 저장 완료!';
    setTimeout(() => {
      statusText.textContent = '준비 완료';
      downloadPngBtn.disabled = false;
      downloadPngTopBtn.disabled = false;
    }, 2000);
  });
}

function downloadGIF() {
  statusText.textContent = 'GIF 생성 중...';
  downloadGifBtn.disabled = true;
  downloadGifTopBtn.disabled = true;
  
  const scale = 6;
  const frameCount = Math.max(5, Math.ceil(state.gifSeconds * 5)); // 약 5fps
  const frames = [];
  
  if (state.animationType && state.photo) {
    // 슬라이드 애니메이션
    for (let i = 0; i < frameCount; i++) {
      const progress = i / (frameCount - 1);
      
      // 원래 위치에서 화면 오른쪽까지 슬라이드
      const originalX = state.photoX;
      state.photoX = originalX + (400 * progress);
      
      const renderCanvas = document.createElement('canvas');
      renderCanvas.width = canvas.width * scale;
      renderCanvas.height = canvas.height * scale;
      drawPolaroid(renderCanvas, scale);
      
      frames.push(renderCanvas);
      
      state.photoX = originalX;
    }
  } else {
    // 정적 이미지 반복
    for (let i = 0; i < frameCount; i++) {
      const renderCanvas = document.createElement('canvas');
      renderCanvas.width = canvas.width * scale;
      renderCanvas.height = canvas.height * scale;
      drawPolaroid(renderCanvas, scale);
      frames.push(renderCanvas);
    }
  }
  
  // GIF 생성
  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: canvas.width * scale,
    height: canvas.height * scale,
    workerScript: './gif.worker.js'
  });
  
  frames.forEach((frame) => {
    gif.addFrame(frame, { delay: Math.round((state.gifSeconds * 1000) / frameCount) });
  });
  
  gif.on('finished', function(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `polaroid_${Date.now()}.gif`;
    a.click();
    URL.revokeObjectURL(url);
    
    statusText.textContent = 'GIF 저장 완료!';
    setTimeout(() => {
      statusText.textContent = '준비 완료';
      downloadGifBtn.disabled = false;
      downloadGifTopBtn.disabled = false;
    }, 2000);
  });
  
  gif.render();
}

// 초기 렌더링
render();