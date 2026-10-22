# חמישיית ההצלה

A side-scrolling platformer with one hero per kid. All art, music and
levels are original and drawn in code (`www/game.js`), so the game is a
plain web page that Capacitor wraps into an Android app.

## Play

- **Browser:** open `www/index.html`. Arrows/WASD move, Z/Space jump,
  X shoots water, P pauses, M mutes.
- **Phone:** touch controls appear automatically (pad on the left, jump
  and water on the right). Play in landscape.

## Android APK

Every push that touches `wonder-kids/` runs the **Rescue Five APK**
workflow, which uploads `app-debug.apk` as a run artifact. Locally, with
the Android SDK installed: `npm ci && npm run apk`.

The debug keystore is committed on purpose so each new build installs
over the previous one.

## Adding a hero

Heroes live in `CHARACTERS` at the top of `www/game.js`. Each one has a
name and a palette override for the hair colours; locked slots show as
"בקרוב" on the title screen.
