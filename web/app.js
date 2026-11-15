const preview = document.querySelector('#preview');
const startButton = document.querySelector('#start');
const stopButton = document.querySelector('#stop');
const status = document.querySelector('#status');
const devices = document.querySelector('#devices');
const emptyState = document.querySelector('#empty-state');
const videoFps = document.querySelector('#video-fps');
const renderFps = document.querySelector('#render-fps');
const resolution = document.querySelector('#resolution');

let stream;
let renderFrames = 0;
let videoFrames = 0;
let lastSampleAt = performance.now();
let metricsRunning = false;

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
    setStatus(`Camera ready: ${track.label || 'video input'}. Move in front of it and watch the FPS.`);
    await listVideoInputs();
    startMetrics();
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

