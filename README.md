# Camera Party Game POC

This is a no-build browser proof of concept for testing a USB webcam in an
Android TV browser. It is deliberately not a game yet: it confirms camera
permission, a mirrored preview, detected camera names, and live video/render
frame rates.

## Run it

Camera access requires a secure context. This repository deploys `web/` to
GitHub Pages whenever `main` changes, giving the POC a trusted HTTPS URL. In
repository **Settings → Pages**, select **GitHub Actions** as the source once.
The published address will normally be `https://tomplast.github.io/fff/`.

A plain local HTTP server is useful for checking layout on a computer but
normally cannot request a camera from another device.

On the TV, connect the webcam first, open the page, select **Start camera**, and
approve the browser's camera permission. The status panel reports what happened.

## Success criteria

- A camera preview appears and is mirrored.
- Video FPS is stable enough for broad gestures (start by looking for 15+ FPS).
- The browser lists a usable video input after permission is granted.

If any step fails, capture the exact status text and TV/browser model before
moving to hand tracking or a native wrapper.

