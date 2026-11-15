# Android TV Browser Camera POC

## Objective

Verify, on the target Android TV, that a USB webcam is visible to its browser
and can provide a smooth, mirrored live preview. This is a hardware and
permission spike, not the game.

## Acceptance

- The page runs from a secure (HTTPS) origin in the TV browser.
- On request it asks for camera permission, lists detected video devices, and
  opens an available webcam.
- The TV shows a mirrored live preview with an updating frame-rate indicator.
- Missing permission, camera, or camera-open failures have readable on-screen
  explanations.

## Non-goals

- Hand/body tracking, MediaPipe, mini-game UI, phone pairing, photo capture,
  persistence, or network services.

## Implementation

- Static HTML, CSS, and JavaScript only; no packages, compilation, backend, or
  vision dependencies.
- Use `getUserMedia` for video, a mirrored `<video>` element for preview, and
  `requestVideoFrameCallback`/`requestAnimationFrame` for a small performance
  overlay.

## Verification

1. Serve the static page from HTTPS and open it on the TV.
2. Test with the USB webcam connected; note the reported camera selection and
   observed preview FPS.
3. If no camera appears, retain the status text as the compatibility
   result before investigating tracking.

## Result and next phase

The initial Android TV browser test reached a 640×480 camera stream at about
17 video FPS and 69 render FPS. That passes the threshold for broad hand-driven
play. The next narrow phase overlays MediaPipe Hand Landmarker index-fingertip
cursors; body pose and gameplay remain out of scope.
