// GIF 인코더 워커 (gif.js)
// 복잡한 GIF 인코딩을 별도 워커에서 처리

var GIFEncoder = function() {
  this.width = 0;
  this.height = 0;
  this.frames = [];
  this.palette = null;
};

GIFEncoder.prototype.init = function(width, height, quality) {
  this.width = width;
  this.height = height;
  this.quality = quality;
};

GIFEncoder.prototype.addFrame = function(imageData, delay) {
  this.frames.push({
    imageData: imageData,
    delay: delay
  });
};

GIFEncoder.prototype.render = function() {
  // 간단한 GIF 생성 (실제 구현은 매우 복잡함)
  var gif = this.createGif();
  return gif;
};

GIFEncoder.prototype.createGif = function() {
  // GIF 헤더
  var gif = [];
  
  // GIF89a 시그니처
  gif.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);
  
  // 로직 스크린 디스크립터
  gif.push(this.width & 0xFF, (this.width >> 8) & 0xFF);
  gif.push(this.height & 0xFF, (this.height >> 8) & 0xFF);
  gif.push(0xF0, 0x00, 0x00); // 팩 바이트, 배경, 종횡비
  
  // 전역 컬러 테이블
  for (var i = 0; i < 256 * 3; i++) {
    gif.push(0);
  }
  
  // 프레임 데이터 추가
  for (var f = 0; f < this.frames.length; f++) {
    var frame = this.frames[f];
    
    // 그래픽 컨트롤 확장
    gif.push(0x21, 0xF9, 0x04, 0x00);
    gif.push(frame.delay & 0xFF, (frame.delay >> 8) & 0xFF);
    gif.push(0x00, 0x00);
    
    // 이미지 디스크립터
    gif.push(0x2C, 0x00, 0x00, 0x00, 0x00);
    gif.push(this.width & 0xFF, (this.width >> 8) & 0xFF);
    gif.push(this.height & 0xFF, (this.height >> 8) & 0xFF);
    gif.push(0x00);
    
    // LZW 최소 코드 크기
    gif.push(0x08);
    
    // 이미지 데이터 블록 (간단화)
    gif.push(0x01, 0x00, 0x00);
  }
  
  // GIF 트레일러
  gif.push(0x3B);
  
  return new Uint8Array(gif);
};

var encoder = new GIFEncoder();

onmessage = function(e) {
  switch (e.data.type) {
    case 'init':
      encoder.init(e.data.width, e.data.height, e.data.quality);
      break;
    case 'frame':
      encoder.addFrame(e.data.imageData, e.data.delay);
      break;
    case 'render':
      var gif = encoder.render();
      postMessage({
        type: 'done',
        data: gif.buffer
      }, [gif.buffer]);
      break;
  }
};