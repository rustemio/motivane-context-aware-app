# MotiVane

Notes that wait for the right weather.

You write down an idea and you do not give it a date. You say what it needs: rain, daylight, a weekend, being within three kilometres of home. The app watches the world and lights the note up when its conditions are met.

Started as a React Native course project at Ankara University, Computer Engineering, spring 2026. Rebuilt from the README up.

## Try it

```bash
npm install
npm run web      # browser
npm run ios      # iOS simulator, needs Xcode
npm run android  # Android emulator
```

One codebase runs in all three. The browser version is the one you can send to someone.

## How it decides

A note holds conditions, not a deadline:

```ts
{ text: 'Finish the screenplay', needs: [{ kind: 'sky', is: 'rain' }] }
```

Six kinds of condition: sky, temperature, daylight, hours, weekday, place. They combine with AND. There is no OR, because "rain or snow or whenever" is the same as no condition at all, and that is what this app is trying to get away from.

`src/core/engine.ts` answers each condition with one of three values: `yes`, `no`, `unknown`. The third one is what holds the rest of the design together. If you refuse location access, a two-valued engine has to either call the condition met, and the note lies about being ready, or call it unmet, and the note goes quiet forever with no explanation. `unknown` says the true thing: there was nothing to ask.

A note is then **ripe** when every condition says yes, **waiting** when any says no, and **unsure** when nothing says no but something says unknown. `no` outranks `unknown`: if one condition is definitely unmet, it does not matter what else could not be checked.

Open any note and it shows every condition with its own verdict. The app explains its answer instead of announcing it.

## Decisions worth explaining

**Open-Meteo, not OpenWeatherMap.** The first plan named OpenWeatherMap. Any key in this app ends up inside the browser bundle where anyone can read it. Open-Meteo needs no key and sends CORS headers, so the web build can be published as a plain link with nothing to hide. It also returns sunrise and sunset in the same call, which the daylight condition needs.

**Daylight is sunrise to sunset, not "08:00 to 20:00".** The same clock hour is light in one city and dark in another, and the gap moves through the year. Hours and daylight are separate conditions for that reason.

**The engine is pure.** No network, no storage, no React inside `src/core`. Everything that can fail — permissions, geolocation, fetch — lives in `src/world/useWorld.ts` and hands the engine a finished `World` where an unknown fact is simply an absent field. That is why the engine is covered by tests that run in under a second with no device attached.

**AsyncStorage, not SQLite.** The course plan said SQLite. A person has tens of notes, not thousands, and the whole list is read on every recalculation anyway. SQLite would have added a schema, migrations, and two code paths for phone and browser. AsyncStorage is native storage on a phone and `localStorage` in a browser, through one call.

**Twelve preset chips, not a condition editor.** A real editor with sliders and a map would cover more cases and get used less. An idea is written down while walking; if capturing one costs three screens of setup, it does not get captured.

## What the web build cannot do

On a phone this app should push a notification the moment a note ripens. A browser tab cannot do that reliably, so the web build answers the question when you open it: which of my ideas are ready right now. The notification belongs in the native build, and the same code gets there with `npx expo run:ios`.

## Tests

```bash
npm test
npm run check
```

The engine, the weather-code mapping, the local-time conversion and the phrasing are pure functions, and all of them are covered. The interface is not: it is checked by running it.

## Layout

```
src/core/     engine, types, weather client — no React, no I/O
src/data/     storage and the notes the app opens with
src/world/    permissions, geolocation, the World snapshot
src/ui/       board, sticky note, sheets, wording, palette
App.tsx       wiring and ordering
```

Comments in the code are in Russian and explain why, not what.

Built by Rustem Tukhbetov · [creativeoglu.com](https://creativeoglu.com)
