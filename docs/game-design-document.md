# Walking Game: Game Design Document

Draft as of 2026-11-19. The living version is the Claude Doc "Walking Game: Game Design Document"; this file is a snapshot. Sections not listed yet (core gameplay, touch controls, progression, art and audio, monetization, roadmap) are still being drafted.

**Rule:** no game code until this design document is approved.

## Overview

**Pitch:** A fun, addictive mobile game where the steps you take in the real world, counted by your phone, earn you in-game currency and actions.

**Core hook:** Real walking is the main resource. The more you move during the day, the more you can do in the game.

**Platforms:** iOS and Android (phones first).

Still open:

- What the player spends steps on (building, exploring, collecting, battling, or something else).
- Whether steps convert to one currency, to energy/actions, or both.
- Target audience: casual fitness walkers, existing mobile gamers, or both.

## Technical

**Engine (depends on the core loop, not yet decided):** The game needs a native app, because a web app can't read the phone's step history or count steps in the background. If the game is mostly menus, upgrades and idle progress, Flutter or React Native is easier, because mature step-data plugins already exist. If it's a game world with characters, movement or action, Godot fits better and matches the team's experience.

**Step data:**

- iOS: Apple HealthKit, through a native Godot plugin.
- Android: Health Connect, through a native Godot plugin.
- On first launch the game reads recent step history and credits steps taken since the last session. Players never need to keep the app open while walking.
- Anti-cheat: rely on the OS step data, and set daily caps on how many steps can turn into rewards.

| Option | Best if the game is | Pros | Cons |
| --- | --- | --- | --- |
| Godot 4 (native export) | A world, characters, movement or action | Team already knows it; strong 2D/3D tools | Needs HealthKit and Health Connect plugins; may need to write one |
| React Native + Expo (JavaScript) | Mostly UI, upgrades, idle progress | JavaScript; mature step-data plugins; fast on-phone testing with dev builds and over-the-air updates; backend can live on Vercel | Weak for real-time game visuals |
| Capacitor (JavaScript web app in a native shell) | Mostly UI, upgrades, idle progress | Reuses a normal web app; native plugins add step data | Health plugins less mature; web rendering can feel less smooth |
| Flutter | Mostly UI, upgrades, idle progress | Mature step-data plugins; fast UI work | Dart, a new language for the team; weak for real-time game visuals |
| Unity | A world or action game needing a big plugin ecosystem | Mature health-data plugins exist | New engine for the team; licensing |
| Web app / PWA only | Not viable | Fastest to ship; no app store review | Can't read step history or count in background, so it can't support the core hook |

**Hosting:** Vercel or a similar host can run the backend (accounts, cloud saves, leaderboards) in any of these options. The game itself still ships as an app through the App Store and Google Play.

**Requirement: test on real phones from the first build.** Step counting only works on a real device, so every build must install on the team's own phones.

- Android: install a test build directly over USB or from a downloaded file (sideloading). No store account is needed.
- iOS: needs a Mac with Xcode. A free Apple ID can install on your own phone, but the build expires after 7 days. TestFlight (paid Apple Developer account, $99/year) gives longer-lived builds and lets testers install them.
- All engines in the table support this. Godot, Flutter and React Native can each deploy straight to a plugged-in phone.

**Proposed performance targets:** 60 fps on mid-range phones from about 2021 onward. Install size under 150 MB. Very low battery drain, because the OS counts steps rather than the game.

Still open:

- Pick the engine once the core loop is decided: Godot for a world or action game, Flutter or React Native for a UI or idle game.
- Check whether existing Godot HealthKit and Health Connect plugins are good enough, or whether we write our own.
