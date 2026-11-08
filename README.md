# MotiVane

Your ideas deserve the right moment.

Good ideas tend to show up at the wrong time: you save them, forget them and never come back to them. MotiVane hangs your saved ideas on threads from a cloud. The better the current moment suits an idea, the lower it hangs, and the three best fits come down within reach, each with a short reason.

When you change the sky, the hour, your free time or your energy, the notes move up and down to match, so the layout itself shows what the recommendation engine thinks.

By Rustem Tukhbetov. The project started as a React Native concept for the IOS II course in Computer Engineering at Ankara University (March 2026). This repository is the web version, rebuilt as a portfolio prototype.

## What you can do

- Type an idea in one line. Keyword rules guess the details and show the guess, so the idea can match right away. "Details" opens every field for editing.
- Describe the moment as a sentence: "It's a *rainy evening*. I have *30 minutes* and *hardly any* energy." Each underlined word opens a menu.
- Switch between five labelled demo skies, or press "Use my real sky" to load live weather.
- Read the notes that come down. At most three hang within reach, fewer if fewer fit. Each one says why it's there, and opening it lists the rules that applied.
- Filter with the compass. Its four points are the four kinds of idea (Wander, Make, Learn and Tend), and the needle leans towards the kind the current moment favours.
- Use the List view to see the same ideas without the spatial layout, with search, kind filters and grouping by fit.
- Open a note to begin its first small step with a quiet timer that never rings, mark it finished, send it back to the cloud until the sky changes, rest it until tomorrow, edit it or let it go. Letting go can be undone.
- Press "This feels too big" to swap in a five-minute start. The idea then matches as five minutes and low energy, so it can reach you on days when the whole thing wouldn't.
- Finished ideas go into the Almanac along with the weather you did them in, and each one becomes a star that only shows on clear nights. The app keeps no streaks or scores and sends no reminders.

## How matching works

Every idea starts at 40 points, and simple rules add to that or take away from it. An idea needs 60 or more to come within reach, and only the top three do. The rules live in [src/domain/matching.ts](src/domain/matching.ts), and the "How it works" sheet in the app lists the same ones.

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

Matching uses no AI, so the same inputs always give the same result.

## What's real, local and simulated

| Data | Status |
| --- | --- |
| Preset skies, sample ideas, sample Almanac entries | Simulated. The interface labels them, and a stamp on the sky always says so. |
| Your ideas and settings | Local. Saved in this browser's `localStorage`, with no account, server or sync. |
| "Use my real sky" | Real, on request. The app asks for your location once, sends the coordinates rounded to two decimals to [Open-Meteo](https://open-meteo.com/) and takes the hour from your clock. It never stores coordinates, and after 30 minutes a reading is no longer labelled as live. |
| Time and energy | Always self-reported. |

If you refuse location or the weather service fails, the app tells you, takes the hour from your clock and lets you choose the weather yourself.

The reset controls are in "How it works". "Reset the demo" restores the samples and leaves your own ideas alone. "Remove the sample ideas" and "Erase everything here" are separate buttons, and each asks for confirmation first.

## Run it

You need Node 20 or newer (Netlify is configured for 22).

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

The app needs no API keys or environment variables, so there is no `.env.example`.

## Deploy to Netlify

[netlify.toml](netlify.toml) sets the build command, the `dist` publish folder, the Node version, the SPA fallback for `/list` and `/almanac`, a content security policy and asset caching. In the Netlify dashboard, choose "Add new site", import the repository and keep the detected settings. You can also deploy with the CLI from this folder:

```bash
npx netlify-cli deploy --build --prod
```

If you switch to a different weather source, add it to `connect-src` in `netlify.toml`, otherwise the browser will block the request.

## How the code is organised

- [src/domain/](src/domain/) has the pure logic, with no React: matching, title guessing, the reducer, storage and sanitising, the hanging layout and the sky palettes.
- [src/adapters/weather.ts](src/adapters/weather.ts) is the only file that knows about Open-Meteo or geolocation.
- [src/ui/](src/ui/) has the components, and [src/styles.css](src/styles.css) has all the styling as plain CSS.

The runtime dependencies are React and three self-hosted fonts. There's no UI kit, router, state library or animation library.

The 45 tests cover matching, explanations, persistence (corrupt, partial, outdated and blocked storage), demo reset, the weather adapter, layout, and text contrast in all 16 skies.

## Limitations

The app doesn't watch the weather in the background or send notifications. It only knows about the moment while it's open. The original concept was a native app, which could do this.

Ideas live in one browser. They don't sync between devices, and clearing site data deletes them.

Title guessing uses English keyword rules and falls back to sensible defaults. The interface is English only.

It has only been tested in Chromium. It uses `@property` and CSS `linear()` easing, which current Safari and Firefox support, but it hasn't been run in them or checked with a real screen reader.

Open-Meteo's free tier is for non-commercial use. That's fine for a portfolio piece, but a commercial launch would need a paid plan.

## Why some of the original plan isn't here

The first concept planned React Native, SQLite, Google Books and Gemini. A web portfolio piece doesn't need a mobile runtime, and book lookups didn't make the core loop better. Fixed rules are also easier to explain and trust than a model, which would need a server to keep its key secret. Book lookups or a model could still be added later behind an adapter without changing how matching works.
