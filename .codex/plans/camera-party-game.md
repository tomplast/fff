# Camera Party Game — product and build plan

## Product premise

A browser party game for one shared screen and webcam: friends stand in view,
move their hands/bodies, and cooperatively or competitively play short,
spectator-friendly challenges. The feeling is playful physical comedy, like
EyeToy Play, without needing a controller or account.

## First playable slice

Build one polished 60–90 second game, **Bubble Pop**:

- The camera feed fills the play area.
- Big, high-contrast bubbles float across it.
- One or two people pop bubbles with open hands.
- Body/hand landmarks drive collision; score, round timer, and clear end screen
  are visible to spectators.
- A calibration screen confirms the camera, shows the tracked hands, explains
  lighting/distance, and has a Start button.
- The game runs fully on-device after assets load; no login, server, recording,
  or camera upload.
- At the round end, players can explicitly choose to take a souvenir photo with
  their score overlay, then download it locally. Nothing is captured or retained
  without that action.

Success means a first-time group can grant camera permission, understand the
game from the screen, complete a round, and immediately want a rematch.

## Technical direction

- Use a browser-first web app (React + TypeScript + Vite is a pragmatic
  default).
- Access video with `getUserMedia`; render a mirrored preview in a canvas/WebGL
  scene so player motion feels natural.
- Use a client-side landmark model such as MediaPipe Tasks Vision for hand pose
  first. Add full-body pose only when a game genuinely needs it.
- Keep a tiny game engine layer separate from UI: game loop, world objects,
  timer/scoring, input adapter, and per-game rules. This lets future mini-games
  reuse calibration and tracking without making the first game an abstract
  platform too early.
- Handle tracking loss explicitly: freeze input, show “step back into view,”
  and never award hits from stale landmark data.
- Prefer the most permissive viable model/license and package model assets for
  offline-ish local play after initial load.

## Game design rules

- Favor broad, readable movements over precision gestures.
- Make every game understandable in five seconds and playable in under two
  minutes.
- Treat the camera image as a stage: high-contrast targets and visible feedback
  matter more than realistic graphics.
- Design for imperfect rooms: varying light, cluttered backgrounds, mixed
  heights, and people entering/exiting frame.
- Start as a co-op/shared-score experience. Competitive player attribution is a
  later problem because reliably assigning one hand/body to a person adds
  tracking complexity.
- Take inspiration from EyeToy's "interact with the screen" fantasy: washing,
  swatting, catching, avoiding, making music, and playful visual transformation.
  The reference is the immediacy, not a copy of its art, names, or rules.

## Mini-game north star

Build a small collection of instantly legible physical verbs, adding only one
after the interaction beneath it is proven:

- **Bubble Pop** — reach and pop floating bubbles. First game; hand tracking.
- **Window Wash** — clear soap, rain, or paint from the camera view with broad
  wiping motions. A strong second camera game because it uses movement rather
  than precise gestures.
- **Obstacle Dash** — duck, lean, and step to avoid a simple stream of hazards.
  Introduce pose tracking only here.
- **Fruit Frenzy** — swipe or swat flying fruit; make its visual language and
  scoring distinct rather than copying another game's implementation.
- **Band Room** — strike large screen zones to play drums/notes together. This
  works with hands first and could later accept phone motion controls.

Every game ends with a short celebration/replay screen and an optional,
user-triggered local photo. Treat photos as ephemeral browser/app output, not
as a player profile or remote storage feature.

## Phases

1. **Experience spike (no polish)**
   - Verify webcam permissions, mirrored video, real-time hand landmarks, and
     a visible hand cursor on target browsers/devices.
   - Test in an ordinary room with 1–2 people at typical TV/laptop distance.
   - Stop condition: tracking is responsive enough that users intuitively move
     the cursor with a hand.

2. **Vertical slice: Bubble Pop**
   - Add calibration, round state, bubble spawning/collision/scoring, sound and
     visual feedback, pause/retry, optional local photo capture, and a small
     privacy note.
   - Keep only desktop Chrome/Edge as the supported baseline initially.
   - Stop condition: a complete round works reliably in a manual group test.

3. **Playtest and tune**
   - Observe five short sessions. Measure permission success, time to first
     hit, tracking-loss frequency, completion rate, and rematch intent.
   - Tune target size, dwell/collision threshold, spawn rate, and instruction
     clarity from observation rather than adding features.
   - Stop condition: most players can start and finish without verbal help.

4. **Second camera interaction and mini-game**
   - Introduce one new reusable input only if needed: body pose, two-hand
     gestures, or coarse motion zones.
   - Build **Window Wash** before adding a harder body-pose game. It reuses hand
     tracking while proving that a different physical verb remains fun.
   - Stop condition: both games reuse camera/calibration/tracking infrastructure
     without duplicating it.

5. **Party shell**
   - Add game select, short rules cards, round rotation, accessibility motion
     reduction, audio controls, and a simple local high-score/session summary.
   - Consider PWA/installability after the core loop is proven.

6. **Phone-controller experiment**
   - Test one phone-only game, then one optional hybrid game, via QR-based local
     pairing. Do not make phones mandatory for camera games.
   - Stop condition: joining, permission, and calibration are fast enough that
     they do not interrupt a party round.

## Explicit non-goals for version one

- Online multiplayer, matchmaking, accounts, cloud saves, or streaming.
- Storing/uploading video, facial identity, or analytics that include camera
  content.
- Mobile Safari support, arbitrary-device guarantees, or sophisticated
  multi-person identity tracking.
- A large mini-game catalog, progression economy, avatars, or social sharing.

## Main risks and early checks

| Risk | Early mitigation |
| --- | --- |
| Webcam permission or unsupported browser | Test permission/error paths first; clearly state supported browsers. |
| Latency makes play feel bad | Draw and collide against the latest landmarks; lower camera/model resolution before adding graphics. |
| Hands disappear / variable lighting | Calibrate with live feedback and use forgiving hit areas. |
| Two players occlude one another | Design the first game as shared co-op, not person-scored competition. |
| Privacy concern | Keep processing local, explain it before requesting the camera, and make photo capture an explicit action. |

## Decisions to make together

1. Is the primary setup a laptop in a living room, or a TV connected to a
   laptop/mini-PC? This changes target scale, distance assumptions, and setup
   flow.
2. Do you want the first game to feel more like silly co-op, a competitive party
   challenge, or a kids/family toybox?
3. What visual personality fits: colorful toybox, retro EyeToy-era camera
   collage, or something else?
4. Should the camera view itself be central on screen, or should the game render
   players as silhouettes/cutouts over a stylized world?

## Recommended next action

Agree on the four product decisions above, then implement only Phase 1 and
Bubble Pop. Do not start the mini-game collection or phone-controller work until
real people have tried that interaction in the intended room setup.
