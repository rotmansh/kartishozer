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

## Difficulty by age

`PRESETS` in `www/game.js` sets how the game plays. Each hero has a
default, and the title screen lets a parent switch it.

- **קל מאוד (age 4):** the hero walks by himself, a tap anywhere on the
  screen jumps, the hose sprays on its own, three hearts that food
  refills, and the game never ends. He hops up steps by himself after a
  moment, and a second fall into the same pit carries him across. Its
  own two levels, about a minute each.
- **קל (age 6):** you move yourself, three hearts, slow energy drain,
  falling into a pit just puts you back.
- **רגיל (age 9) / קשה (age 12):** one hit, energy runs down, pits are
  deadly; the full 222-tile level.

## Vehicles and stickers

In the very easy levels the hero gets into a parked vehicle and drives
it for a stretch (`drive` … `park` in the level data): a fire truck
whose water cannon puts out fires, and an ambulance with a siren.
Nothing can hurt him while he drives.

Stickers are earned for things done in the game (rescuing the kitten,
the helmet, driving each vehicle, the police car, the medic star, the
badge, finishing with every heart). They are kept per hero in the
browser, shown at the end of each level and in the album on the title
screen.

## Adding a hero

Heroes live in `CHARACTERS` at the top of `www/game.js`. Each one has a
name and a palette override for the hair colours; locked slots show as
"בקרוב" on the title screen.
