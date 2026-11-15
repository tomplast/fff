const preview = document.querySelector('#preview');
const stage = document.querySelector('.stage');
const handCanvas = document.querySelector('#hands');
const handContext = handCanvas.getContext('2d');
const startButton = document.querySelector('#start');
const stopButton = document.querySelector('#stop');
const status = document.querySelector('#status');
const devices = document.querySelector('#devices');
const emptyState = document.querySelector('#empty-state');
const videoFps = document.querySelector('#video-fps');
const renderFps = document.querySelector('#render-fps');
const resolution = document.querySelector('#resolution');
const handState = document.querySelector('#hand-state');

let stream;
let renderFrames = 0;
let videoFrames = 0;
let lastSampleAt = performance.now();
let metricsRunning = false;
let handLandmarker;
let handTrackingRunning = false;
let lastTrackedVideoTime = -1;

const HAND_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task';
const VISION_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const VISION_MODULE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest';

function setStatus(message) {
  status.textContent = message;
}

function explainCameraError(error) {
  const explanations = {
    NotAllowedError: 'Camera permission was denied. Allow it in this browser, then try again.',
    NotFoundError: 'No camera was found. Check the USB webcam and TV support.',
    NotReadableError: 'The camera is already in use or could not be read.',
    OverconstrainedError: 'This camera cannot supply the requested video settings.',
    SecurityError: 'This browser has blocked camera access for this page.',
  };
  return explanations[error.name] ?? `Camera failed: ${error.name || error.message}`;
}

async function listVideoInputs() {
  try {
    const inputs = (await navigator.mediaDevices.enumerateDevices())
      .filter((device) => device.kind === 'videoinput');
    devices.replaceChildren();
    if (inputs.length === 0) {
      devices.append(Object.assign(document.createElement('li'), { textContent: 'No video inputs reported.' }));
      return;
    }
    inputs.forEach((input, index) => {
      devices.append(Object.assign(document.createElement('li'), {
        textContent: input.label || `Camera ${index + 1} (name available after permission)`,
      }));
    });
  } catch (error) {
    devices.replaceChildren(Object.assign(document.createElement('li'), { textContent: `Could not list inputs: ${error.name}` }));
  }
}

function sampleMetrics(now) {
  renderFrames += 1;
  if (now - lastSampleAt >= 1000) {
    const elapsedSeconds = (now - lastSampleAt) / 1000;
    renderFps.textContent = `Render: ${(renderFrames / elapsedSeconds).toFixed(0)} fps`;
    videoFps.textContent = `Video: ${(videoFrames / elapsedSeconds).toFixed(0)} fps`;
    renderFrames = 0;
    videoFrames = 0;
    lastSampleAt = now;
  }
  if (metricsRunning) requestAnimationFrame(sampleMetrics);
}

function countVideoFrame() {
  videoFrames += 1;
  if (metricsRunning && preview.requestVideoFrameCallback) {
    preview.requestVideoFrameCallback(countVideoFrame);
  }
}

function startMetrics() {
  metricsRunning = true;
  renderFrames = 0;
  videoFrames = 0;
  lastSampleAt = performance.now();
  requestAnimationFrame(sampleMetrics);
  if (preview.requestVideoFrameCallback) preview.requestVideoFrameCallback(countVideoFrame);
}

function stopMetrics() {
  metricsRunning = false;
  videoFps.textContent = 'Video: -- fps';
  renderFps.textContent = 'Render: -- fps';
  resolution.textContent = '--';
}

function resizeHandCanvas() {
  const rect = stage.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;
  handCanvas.width = Math.round(rect.width * pixelRatio);
  handCanvas.height = Math.round(rect.height * pixelRatio);
  handContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  return rect;
}

function drawHands(landmarks) {
  const rect = resizeHandCanvas();
  handContext.clearRect(0, 0, rect.width, rect.height);
  if (!landmarks?.length || !preview.videoWidth || !preview.videoHeight) return;

  const scale = Math.max(rect.width / preview.videoWidth, rect.height / preview.videoHeight);
  const displayedWidth = preview.videoWidth * scale;
  const displayedHeight = preview.videoHeight * scale;
  const offsetX = (rect.width - displayedWidth) / 2;
  const offsetY = (rect.height - displayedHeight) / 2;

  landmarks.forEach((hand) => {
    const fingertip = hand[8];
    const x = offsetX + (1 - fingertip.x) * displayedWidth;
    const y = offsetY + fingertip.y * displayedHeight;
    handContext.beginPath();
    handContext.arc(x, y, 27, 0, Math.PI * 2);
    handContext.fillStyle = 'rgba(129, 229, 255, 0.25)';
    handContext.fill();
    handContext.lineWidth = 4;
    handContext.strokeStyle = '#81e5ff';
    handContext.stroke();
    handContext.beginPath();
    handContext.arc(x, y, 7, 0, Math.PI * 2);
    handContext.fillStyle = '#f5f7ff';
    handContext.fill();
  });
}

function handTrackingLoop() {
  if (!handTrackingRunning || !handLandmarker || !stream) return;
  if (preview.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && preview.currentTime !== lastTrackedVideoTime) {
    lastTrackedVideoTime = preview.currentTime;
    const result = handLandmarker.detectForVideo(preview, performance.now());
    drawHands(result.landmarks);
    handState.textContent = `Hands: ${result.landmarks.length} tracked`;
  }
  requestAnimationFrame(handTrackingLoop);
}

async function startHandTracking() {
  handState.textContent = 'Hands: loading model…';
  try {
    const { FilesetResolver, HandLandmarker } = await import(VISION_MODULE_URL);
    const vision = await FilesetResolver.forVisionTasks(VISION_WASM_URL);
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    handTrackingRunning = true;
    lastTrackedVideoTime = -1;
    handState.textContent = 'Hands: show your hand';
    handTrackingLoop();
  } catch (error) {
    handState.textContent = 'Hands: unavailable';
    setStatus(`Camera works, but hand tracking could not start: ${error.message || error.name}.`);
  }
}

function stopHandTracking() {
  handTrackingRunning = false;
  handLandmarker?.close();
  handLandmarker = undefined;
  resizeHandCanvas();
  handContext.clearRect(0, 0, handCanvas.width, handCanvas.height);
  handState.textContent = 'Hands: off';
}

async function startCamera() {
  if (!window.isSecureContext) {
    setStatus('Camera access needs HTTPS. Open this page from a secure URL, not a plain HTTP address.');
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus('This browser does not expose the Web Camera API. A native TV wrapper may be required.');
    return;
  }
  startButton.disabled = true;
  setStatus('Requesting camera permission…');
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, min: 15 } },
    });
    preview.srcObject = stream;
    await preview.play();
    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    resolution.textContent = `${settings.width ?? '?'}×${settings.height ?? '?'} @ ${settings.frameRate ?? '?'} fps`;
    emptyState.hidden = true;
    stopButton.disabled = false;
    setStatus(`Camera ready: ${track.label || 'video input'}. Loading hand tracking…`);
    await listVideoInputs();
    startMetrics();
    await startHandTracking();
    if (handTrackingRunning) setStatus('Camera and hand tracking are ready. Point your index finger at the screen.');
  } catch (error) {
    setStatus(explainCameraError(error));
    startButton.disabled = false;
    await listVideoInputs();
  }
}

function stopCamera() {
  stream?.getTracks().forEach((track) => track.stop());
  stream = undefined;
  preview.srcObject = null;
  stopHandTracking();
  emptyState.hidden = false;
  stopButton.disabled = true;
  startButton.disabled = false;
  stopMetrics();
  setStatus('Camera stopped.');
}

startButton.addEventListener('click', startCamera);
stopButton.addEventListener('click', stopCamera);

if (!window.isSecureContext) {
  setStatus('This page is not secure. Deploy it to HTTPS before testing camera access on the TV.');
} else if (!navigator.mediaDevices?.getUserMedia) {
  setStatus('This browser does not support the Web Camera API.');
} else {
  setStatus('Camera API found. Connect the webcam, then select Start camera.');
}
listVideoInputs();

