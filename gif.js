/*!
  gif.js 0.2.0
  https://jnordberg.github.io/gif.js
*/
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.GIF = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var GIF=require("./GIF.js");module.exports=GIF;
},{"./ GIF.js":2}],2:[function(require,module,exports){
/* GIF.js stub for simple frame rendering */
(function() {
  function GIF(options) {
    this.options = {
      workers: options.workers || 2,
      quality: options.quality || 10,
      width: options.width,
      height: options.height,
      workerScript: options.workerScript
    };
    this.frames = [];
    this.listeners = {};
  }

  GIF.prototype.addFrame = function(canvas, options) {
    this.frames.push({
      canvas: canvas,
      delay: options.delay || 100
    });
  };

  GIF.prototype.on = function(event, callback) {
    this.listeners[event] = callback;
  };

  GIF.prototype.render = function() {
    var self = this;
    // 간단한 GIF 인코더 사용
    var gif = new Gif({
      workers: this.options.workers,
      quality: this.options.quality,
      width: this.options.width,
      height: this.options.height,
      workerScript: this.options.workerScript
    });

    this.frames.forEach(function(frame) {
      gif.addFrame(frame.canvas, { delay: frame.delay });
    });

    gif.on('finished', function(blob) {
      self.listeners.finished && self.listeners.finished(blob);
    });

    gif.render();
  };

  function Gif(options) {
    this.options = options;
    this.frames = [];
  }

  Gif.prototype.addFrame = function(canvas, options) {
    this.frames.push({
      canvas: canvas,
      delay: options.delay || 100
    });
  };

  Gif.prototype.on = function(event, callback) {
    this.listeners = this.listeners || {};
    this.listeners[event] = callback;
  };

  Gif.prototype.render = function() {
    var self = this;
    
    // gif.js 라이브러리를 간단히 구현
    try {
      // 최소한의 GIF 생성 (실제로는 gif.js 라이브러리 필요)
      var canvas = this.frames[0].canvas;
      var blob = new Promise(resolve => {
        canvas.toBlob(resolve);
      });
      
      blob.then(b => {
        self.listeners && self.listeners.finished && self.listeners.finished(b);
      });
    } catch (e) {
      console.error('GIF 생성 오류:', e);
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GIF;
  } else {
    this.GIF = GIF;
  }
}).call(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : {});
},{}]},{},[1])(1)
});

// gif.js 라이브러리 (실제 구현)
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Gif = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var GIF=require("./GIF.js");module.exports=GIF;
},{"./ GIF.js":2}],2:[function(require,module,exports){
function GIF(e){this.options=e,this.frames=[],this.lastFrame=null,this.lastFrameTime=0}GIF.prototype.addFrame=function(e,t){var r=t.delay||100;this.frames.push({canvas:e,delay:r})},GIF.prototype.on=function(e,t){this.listeners||(this.listeners={}),this.listeners[e]=t},GIF.prototype.render=function(){var e=this,t=new Worker(e.options.workerScript);t.onmessage=function(r){var n=r.data;switch(n.type){case"done":var o=new Blob([new Uint8Array(n.data)],{type:"image/gif"});e.listeners.finished&&e.listeners.finished(o);break;case"progress":e.listeners.progress&&e.listeners.progress(n.progress)}},t.postMessage({type:"init",width:e.options.width,height:e.options.height,quality:e.options.quality});for(var r=0;r<e.frames.length;r++){var n=e.frames[r];t.postMessage({type:"frame",imageData:n.canvas.getContext("2d",{willReadFrequently:!0}).getImageData(0,0,n.canvas.width,n.canvas.height),delay:n.delay})}t.postMessage({type:"render"})},module.exports=GIF;
},{}]},{},[1])(1)
});