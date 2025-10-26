// ==== CONFIGURATION ====
// Ganti path berikut dengan gambar frame PNG transparan yang ingin Anda gunakan
const FRAME_IMAGES = {
  "frame1.png": "frames/frame1.png",
  "frame2.png": "frames/frame2.png",
  "frame3.png": "frames/frame3.png",
  "frame4.png": "frames/frame4.png",
  "frame5.png": "frames/frame5.png",
  "frame6.png": "frames/frame6.png",
  "frame7.png": "frames/frame7.png"
};

// ==== DOM Elements ====
const video = document.getElementById('video');
const frameOverlay = document.getElementById('frameOverlay');
const frameSelect = document.getElementById('frameSelect');
const filterSelect = document.getElementById('filterSelect');
const countdownEl = document.getElementById('countdown');
const startBtn = document.getElementById('startBtn');
const resultSection = document.getElementById('resultSection');
const resultCanvas = document.getElementById('resultCanvas');
const downloadBtn = document.getElementById('downloadBtn');

const PHOTO_WIDTH = 480;
const PHOTO_HEIGHT = 480;
const STRIP_HEIGHT = 1440; // 480 * 3
const COUNTDOWN_TIME = 3; // seconds before each photo
const PHOTOS_PER_STRIP = 3;

// ==== State ====
let stream = null;
let frameImage = null;
let filterCSS = 'none'; // For live preview
let filterCanvas = null; // For canvas processing

// ==== FILTERS ====
const FILTERS_MAP = {
  none: '',
  grayscale: 'grayscale(1)',
  sepia: 'sepia(1)',
  brightness: 'brightness(1.3)',
  contrast: 'contrast(1.4)',
  invert: 'invert(1)',
  saturate: 'saturate(2)',
  blur: 'blur(2px)',
  mirror: ''
};
const FILTERS_CANVAS = {
  none: '',
  grayscale: 'grayscale(1)',
  sepia: 'sepia(1)',
  brightness: 'brightness(1.3)',
  contrast: 'contrast(1.4)',
  invert: 'invert(1)',
  saturate: 'saturate(2)',
  blur: 'blur(2px)',
  mirror: ''
};

// ==== Camera Setup ====
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: PHOTO_WIDTH, height: PHOTO_HEIGHT }, audio: false });
    video.srcObject = stream;
  } catch (e) {
    alert('Gagal mengakses kamera. Pastikan browser Anda mengizinkan akses kamera.');
  }
}

// ==== Handle Frame Overlay ====
frameSelect.addEventListener('change', () => {
  const frameVal = frameSelect.value;
  filterCSS = FILTERS_MAP[selectedValue] || '';
  if (frameVal && FRAME_IMAGES[frameVal]) {
    frameOverlay.src = FRAME_IMAGES[frameVal];
    frameOverlay.style.display = 'block';
    loadFrameImage(FRAME_IMAGES[frameVal]);
  } else {
    frameOverlay.src = '';
    frameOverlay.style.display = 'none';
    frameImage = null;
  } 
  video.style.filter = filterCSS;

  if (selectedValue === 'mirror') {
    video.style.transform = 'scaleX(-1)'; 
  } else {
    video.style.transform = 'none'; 
  }
});

function loadFrameImage(src) {
  frameImage = new window.Image();
  frameImage.crossOrigin = "anonymous";
  frameImage.src = src;
}

// ==== Handle Filter Preview ====
filterSelect.addEventListener('change', () => {
  filterCSS = FILTERS_MAP[filterSelect.value] || '';
  video.style.filter = filterCSS;
});

// ==== Photo Strip Logic ====
startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  resultSection.style.display = 'none';
  countdownEl.textContent = '';

  // Make sure frameImage is loaded before continuing
  if (frameSelect.value && !frameImage) {
    loadFrameImage(FRAME_IMAGES[frameSelect.value]);
    await new Promise(res => { frameImage.onload = res; });
  }

  // Prepare photos
  let photos = [];
  for (let i = 0; i < PHOTOS_PER_STRIP; i++) {
    await runCountdown(COUNTDOWN_TIME, i === 0 ? "Siap-siap..." : "Lagi...");
    const photo = await capturePhoto();
    photos.push(photo);
    if (i < PHOTOS_PER_STRIP - 1) {
      await delay(500); // short interval after shot
    }
  }
  countdownEl.textContent = '';
  // Create photo strip
  const strip = await createPhotoStrip(photos);
  showResult(strip);

  startBtn.disabled = false;
});

// ==== Countdown ====
function runCountdown(sec, msg) {
  return new Promise(resolve => {
    let t = sec;
    countdownEl.textContent = msg ? msg : '';
    setTimeout(() => {
      const interval = setInterval(() => {
        countdownEl.textContent = t;
        if (--t < 0) {
          clearInterval(interval);
          countdownEl.textContent = '📸';
          setTimeout(() => {
            countdownEl.textContent = '';
            resolve();
          }, 500);
        }
      }, 1000);
    }, 500);
  });
}

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// ==== Capture Photo ====
async function capturePhoto() {
  // Draw video frame to canvas, apply filter, overlay frame
  const canvas = document.createElement('canvas');
  canvas.width = PHOTO_WIDTH;
  canvas.height = PHOTO_HEIGHT;
  const ctx = canvas.getContext('2d');
  const selectedFilter = filterSelect.value; 
  // Apply filter
  ctx.filter = FILTERS_CANVAS[filterSelect.value] || '';
  ctx.drawImage(video, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
  // Overlay frame if any
  if (frameImage && frameImage.complete) {
    ctx.drawImage(frameImage, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
  }
  if (selectedFilter === 'mirror') {
    ctx.translate(PHOTO_WIDTH, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(video, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);

  if (selectedFilter === 'mirror') {
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
  }
  if (frameImage && frameImage.complete) {
    ctx.drawImage(frameImage, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
  }
  // Return as image
  return canvas;
}

// ==== Create Final Strip ====
async function createPhotoStrip(photoCanvases) {
  const stripCanvas = document.createElement('canvas');
  stripCanvas.width = PHOTO_WIDTH;
  stripCanvas.height = PHOTO_HEIGHT * PHOTOS_PER_STRIP;
  const ctx = stripCanvas.getContext('2d');
  for (let i = 0; i < PHOTOS_PER_STRIP; i++) {
    ctx.drawImage(photoCanvases[i], 0, PHOTO_HEIGHT * i);
  }
  return stripCanvas;
}

// ==== Show Result & Download ====
function showResult(stripCanvas) {
  // Copy to visible canvas
  const ctx = resultCanvas.getContext('2d');
  ctx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
  ctx.drawImage(stripCanvas, 0, 0);

  // Download link
  resultCanvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    downloadBtn.href = url;
  }, "image/png");

  resultSection.style.display = '';
}

// ==== Init ====
window.addEventListener('DOMContentLoaded', () => {
  startCamera();
  // Initial filter
  filterCSS = FILTERS_MAP[filterSelect.value] || '';
  video.style.filter = filterCSS;
  // Hide overlay by default
  frameOverlay.style.display = 'none';
});


