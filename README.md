# MotiVane

**Your ideas deserve the right moment.**

We tend to have good ideas at the wrong moment. We save them, forget them, and never come back. MotiVane hangs your ideas on threads from a cloud. The better a moment suits an idea, the lower it hangs, and the best three come down within reach, each with a plain reason why.

Change the sky, the hour, your free time or your energy, and the notes rise and fall to match. The main interaction is a direct picture of the recommendation engine.

Designed and built by **Rustem Tukhbetov**. It began as a React Native concept for the IOS II course in Computer Engineering at Ankara University (March 2026) and was rebuilt as a web prototype for a portfolio.

## What you can do

- **Catch an idea in one line.** Keyword rules fill in the details and show their guess, so the idea matches straight away. "Details" opens everything for editing.
- **Describe the moment in a sentence.** "It's a *rainy evening*. I have *30 minutes* and *hardly any* energy." Every underlined word is a menu.
- **Try five labelled demo skies**, or press "Use my real sky" for live weather.
- **Read the hanging notes.** Up to three notes come down within reach, or fewer when fewer genuinely fit. Each note says why, and opening it lists the rules that applied.
- **Filter with the compass.** Its points are the four kinds of idea: Wander, Make, Learn and Tend. The needle leans towards whatever the current moment favours.
- **Browse the List view.** It has the same ideas without the spatial layer, with search, kind filters and grouping by fit.
- **Act on a note.** Begin the first small step with a quiet timer that never rings, mark the idea finished, send it back to the cloud until the sky changes, rest it until tomorrow, edit it, or let it go (with undo).
- **Make it smaller.** "This feels too big" swaps in a five-minute start and matches the idea as five minutes and low energy, so it can reach you on days the whole thing couldn't.
- **Keep an Almanac.** Finished ideas are recorded with the weather you did them in, and each one becomes a star you can only see on clear nights. There are no streaks, scores or reminders.

## How matching works

Every idea starts at 40 points and simple rules move it up or down. An idea needs at least 60 to come within reach, and only the top three do. The code is in [src/domain/matching.ts](src/domain/matching.ts), and the in-app "How it works" sheet lists the same rules.

| Rule | Points |
| --- | --- |
| The idea asks for this weather | +22 |
| Outdoor idea: clear / grey / rain / snow | +14 / +4 / −30 / −24 |
| The idea asks for a different sky, and this one is dry | −6 |
| Indoor idea on a wet or snowy day | +8 |
| The idea likes this hour / another hour | +14 / −10 |
| Outdoor idea at night | −20 |
| Fits your time / only the first step fits / neither | +16 / +4 / −25 |
| Energy is enough / short by one / short by two | +10 / −2 / −8 |
| Live temperature below 0° or above 34°, outdoors | −14 |
| Waiting more than two weeks | up to +6 |

There is no AI. The same inputs always give the same result.

## What's real, local and simulated

| Data | Status |
| --- | --- |
| Preset skies, sample ideas, sample Almanac entries | **Simulated.** Labelled in the interface, with an always-visible stamp on the sky. |
| Your ideas and settings | **Local.** Saved in this browser's `localStorage`. No account, server or sync. |
| "Use my real sky" | **Real, on request.** Asks for location once, sends coordinates rounded to two decimals to [Open-Meteo](https://open-meteo.com/) and takes the hour from your clock. Coordinates are never stored, and a reading stops claiming to be live after 30 minutes. |
| Time and energy | **Self-reported**, always. |

If location is refused or the weather service fails, the app says so, takes the hour from your clock and leaves the weather for you to choose.

**Reset controls** are in "How it works". *Reset the demo* restores samples and never touches ideas you wrote. *Remove the sample ideas* and *Erase everything here* are separate, and each asks for confirmation.

## Run it

Requires Node 20 or newer (Netlify is configured for 22).

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

```bash
npm run preview
```

No API keys or environment variables are needed, so there is no `.env.example`.

## Deploy to Netlify

[netlify.toml](netlify.toml) already sets the build command, the `dist` publish folder, the Node version, the SPA fallback for `/list` and `/almanac`, a content security policy and asset caching. In the Netlify dashboard, choose "Add new site", import the repository and accept the detected settings. Or use the CLI from this folder:

```bash
npx netlify-cli deploy --build --prod
```

If you later change where the weather comes from, update `connect-src` in `netlify.toml` or the browser will block the request.

## How the code is organised

- [src/domain/](src/domain/) holds the pure logic, with no React: matching, title guessing, the reducer, storage and sanitising, the hanging layout, and the sky palettes.
- [src/adapters/weather.ts](src/adapters/weather.ts) is the only file that knows about Open-Meteo or geolocation.
- [src/ui/](src/ui/) holds the components, and [src/styles.css](src/styles.css) holds all the styling as plain CSS.

There is no UI kit, router, state library or animation library. Runtime dependencies are React and three self-hosted fonts.

The 45 tests cover matching, explanations, persistence (corrupt, partial, outdated and blocked storage), demo reset, the weather adapter, layout, and text contrast in all 16 skies.

## Limitations

- **No background behaviour.** The app doesn't watch the weather or send notifications. It only knows about a moment while it's open. A native app could do this, which was the original concept.
- **One browser only.** Ideas don't sync between devices, and clearing site data removes them.
- **Guessing is keyword rules in English.** It handles common phrasing and defaults sensibly otherwise, and the interface is English only.
- **Tested in Chromium.** The code uses `@property` and CSS `linear()` easing, which current Safari and Firefox support, but it hasn't been run in them. Screen reader behaviour hasn't been tested with a real screen reader either.
- **Open-Meteo's free tier is for non-commercial use.** That suits a portfolio piece, but a commercial launch would need a paid plan.

## Why some of the original plan isn't here

The first concept named React Native, SQLite, Google Books and Gemini. A web portfolio piece doesn't need a mobile runtime. Book lookups didn't improve the core loop, and deterministic rules are easier to explain and trust than a model that would need a server to hide its key. Both could be added behind adapters later, without changing how matching works.
