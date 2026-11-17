# AFTRHRS

**Every feeling has a soundtrack.**

AFTRHRS is a social music discovery platform built around emotion. People post *Mood Drops* (one song, one mood, one line they couldn't say out loud), talk to **Mood AI** when they don't know what they want to hear, and gather in **Sound Rooms** built around a feeling or an hour of the night.

This is a complete, runnable application: React frontend, Express API, SQLite database, authentication, a rule-based conversation engine, a rule-based recommender, and a seeded sample world so it never looks empty.

---

## Quick start

Requirements: **Node.js 22.13 or newer** (uses the built-in `node:sqlite` module, so there is no native database driver to compile; older 22.x versions only enable it behind a flag).

```bash
npm install
npm run dev
```

Open **http://localhost:5173**.

- **Explore the Community** on the landing page opens a temporary demo account. No sign-up needed.
- **Find My Sound** creates a real account and runs onboarding.

On first launch the server creates `data/aftrhrs.db`, applies migrations, and seeds the sample world. To start over:

```bash
npm run db:reset
```

### Production

```bash
npm run build
JWT_SECRET=<long random string> npm start
```

One Node process serves the API and the built client on `PORT` (default 4000). In production `JWT_SECRET` is required and session cookies are `Secure`, so the app must be served over HTTPS. Behind a TLS-terminating proxy this works as is because `trust proxy` is enabled. For a plain-HTTP local check only, set `INSECURE_COOKIES=true`.

### Deploy a demo on Render (free)

The repo includes a [`render.yaml`](render.yaml) Blueprint.

1. Push the repo to GitHub.
2. On [render.com](https://render.com), choose **New → Blueprint** and pick the repository.
3. Click **Apply**. Render installs, builds and starts the app, and generates `JWT_SECRET` for you.

The free plan sleeps after inactivity (the first visit afterwards takes about a minute) and has no persistent disk, so the database is re-seeded with the sample world on every restart. Accounts created there are temporary. That suits a demo; add a Render disk mounted at `data/` for real persistence.

**Why not Vercel?** Vercel runs backends as short-lived serverless functions without a persistent filesystem, so this SQLite + Express server would lose its data between requests. Moving to Vercel would mean switching to a hosted Postgres (Neon, Supabase) and wrapping the API as serverless functions. See *Future integrations*.

Deployment notes:
- Any host that runs a long-lived Node 22 process with a persistent disk works (Render, Railway, Fly.io, a VPS). Mount a volume for `data/`.
- Serverless platforms with ephemeral filesystems are not suitable for SQLite as configured. Point `DATABASE_PATH` at a persistent volume, or swap the data layer (see *Future integrations*).

---

## Configuration

Copy `.env.example` to `.env`. Every variable is read only on the server; nothing is bundled into the browser.

| Variable | Default | Purpose |
|---|---|---|
| `API_PORT` | `4000` | API port in development (Vite proxies `/api` to it). |
| `PORT` | `4000` | Port for the combined server in production. |
| `JWT_SECRET` | dev: auto-generated into `data/.session_secret` | Signs session cookies. **Required in production.** |
| `DATABASE_PATH` | `./data/aftrhrs.db` | SQLite file location. |
| `AI_PROVIDER` | *(empty)* | Empty = built-in rule-based engine. `openai` or `gemini` to let an LLM voice replies. |
| `AI_API_KEY` | | Key for the provider above. |
| `AI_MODEL` | provider default | e.g. `gpt-4o-mini`, `gemini-2.0-flash`. |
| `MUSIC_METADATA` | `itunes` | `itunes` looks up official cover art and 30-second previews in the background. `off` makes no network calls. |

---

## Project structure

```
shared/constants.ts        Moods, languages, genres, Mood Drop backdrops, conversation styles
server/
  migrations/001_init.sql  Schema (applied once, tracked in _migrations)
  src/
    index.ts               Entry point: open DB, migrate, seed, listen
    app.ts                 Express app: helmet/CSP, origin check, rate limits, routes, SPA fallback
    db.ts                  node:sqlite wrapper, statement cache, transactions, migration runner
    http.ts                Sessions (JWT in httpOnly cookie), auth middleware, validation, errors
    queries.ts             Shared read models: songs, drops, rooms, playlists, notifications
    recommend.ts           Rule-based recommender + "The Sound of Me"
    itunes.ts              Optional artwork/preview enrichment (iTunes Search API)
    ai/engine.ts           Rule-based Mood AI conversation engine
    ai/lexicon.ts          Mood lexicon, situations, follow-up questions, voice lines
    ai/provider.ts         AI provider abstraction (rule-based / OpenAI / Gemini)
    routes/                auth, users, drops, music, community, ai
    seed.ts, seed/         Sample catalogue, demo users, drops, rooms, playlists
  tests/journey.test.ts    End-to-end API journey tests
client/
  src/lib/                 API client, auth/player/toast state, types, canvas card renderer
  src/components/          Shell (sidebar + bottom nav), DropCard, shared UI
  src/pages/               Landing, Auth, Onboarding, Home, Discover, MoodAI, Create, Rooms, Profile, Settings, Misc
```

### Data model

`users`, `user_preferences`, `moods` (18 built-in + user-created custom moods), `artists`, `songs`, `song_moods`, `mood_drops`, `likes`, `comments`, `saved_posts`, `saved_music`, `follows`, `blocks`, `reports`, `notifications`, `sound_rooms`, `room_memberships`, `room_songs`, `room_discussions`, `playlists`, `playlist_songs`, `conversations`, `conversation_messages`.

Composite primary keys enforce one like, save, follow, block or membership per pair, and `CHECK` constraints stop self-follows and self-blocks. Deleting an account cascades to everything it owns.

---

## Features

**Accounts.** Registration with password rules (8+ characters, a letter and a number), bcrypt hashing, login by email or username, 30-day httpOnly `SameSite=Lax` session cookie, logout, protected routes, five-question onboarding, password change, and account deletion (confirmed by typing your username plus your password).

**Demo mode.** Creates a clearly labelled temporary guest that is pre-onboarded and already follows a few sample listeners. Guests are deleted automatically after 48 hours. The 20 seeded listeners are fictional, carry a **DEMO** tag everywhere, and cannot be logged into.

**Feed.** For You (ranked by taste, freshness and social signals), Following, Trending and Latest, mood filters, featured drops, infinite scroll, and suggestions for people, songs and rooms.

**Mood Drops.** Each drop has a song, a mood, a caption, a backdrop and an optional Sound Room. Creating one takes six steps with a live preview: song, mood, caption, backdrop, preview and publish. You can make custom moods. Drops can be liked, commented on, saved, shared (native share sheet or copy link), reported, deleted by their author, and downloaded as a **1080×1350 PNG card** rendered in the browser.

**Mood AI.** See the next section.

**Discover.** Mood of the Week, Trending Right Now, Today's Moods, Songs You Might Feel, Hidden Gems, New Artist Discoveries, People Like Your Music Taste, Trending Soundtracks, Popular Mood Drops, and the full catalogue. The catalogue can be filtered by mood, genre, language and artist, sorted by fit, popularity, recently posted, least known or A–Z, and searched.

**Sound Rooms.** Ten rooms, each with generated cover art, a description, a real member count, featured songs, the room's Mood Drops, a discussion thread and a member list. You must join a room to post or talk in it.

**Profiles.** Avatar upload (resized to 256px in the browser), bio, current mood, followers and following lists, favourite artists and genres, tabs for Mood Drops, saved songs, saved posts (private), playlists and rooms, and **THE SOUND OF ME**: an archetype, a written summary, a mood signature, an energy level and languages, all derived from preferences and real interactions.

**Social and safety.** Follow and unfollow, notifications (likes, comments, follows, welcome) with per-type preferences, user search, blocking (hides both ways and removes follows), reporting (hides the drop from the reporter), private accounts (only followers see drops and identity), and a choice of whether saved songs show on your profile.

**Music.** 187 songs across 11 languages: English, Tamil, Hindi, Malayalam, Telugu, Punjabi, Korean, Japanese, Spanish, French and instrumental. Each song has mood tags, energy and popularity. Songs link out to Spotify, YouTube or Apple Music (your choice in Settings). Where Apple's public search has a confident match, the app shows official cover art and plays a **30-second preview**; otherwise it shows generated mood artwork. AFTRHRS never hosts, downloads or proxies audio, and never presents a preview as full playback.

**Design.** Dark-first editorial look with an Instrument Serif and Manrope type pairing, film grain, mood-coloured gradients, a desktop sidebar plus mobile bottom navigation, keyboard focus styles, a skip link, ARIA roles on tabs, menus and dialogs, and reduced-motion support.

---

## Mood AI

Mood AI works **without any paid API**. The rule-based engine in `server/src/ai/engine.ts`:

1. **Reads the message**: matches it against a mood lexicon with negation handling ("not sad" does not count as sad), detects situations (driving, studying, gym, rain, can't sleep and so on), and picks up language and genre requests, energy words ("softer", "more energy"), intensity words ("really", "a bit"), and vague answers ("anything", "I don't know", "surprise me", "something different", "just existing").
2. **Keeps state across the conversation**: the mood, a secondary mood blended in, energy shift, intensity, situation, language, genre, which questions it has already asked, and recently recommended songs. State is stored per conversation in the database.
3. **Asks follow-ups suited to the style**: Quick (no questions), Casual (one), Deep (flavour, energy, intensity) or Situational ("alone or with people?"). Each mood has its own questions, for example *"Old memories or old versions of yourself?"*. After two unclear answers it stops asking and picks something itself.
4. **Recommends and explains**: scores the catalogue against the conversation and the listener's taste profile, keeps one song per artist, and gives every pick a reason.
5. **Follows up**: *Another take* (no repeats), *Make it a playlist* (10 songs ordered to rise and settle), *Softer* / *More energy*, "same but in Tamil", saving any song or playlist, and **publishing a pick as a Mood Drop** with a suggested caption.

Lines are drawn from pools without repeating within a conversation, so the same input does not get the same reply twice.

The UI says plainly when the built-in engine is answering. It never claims an LLM is connected unless one is configured.

**Connecting an LLM later.** Set `AI_PROVIDER=openai` or `gemini`, plus `AI_API_KEY`, on the server. The provider in `server/src/ai/provider.ts` rewrites the engine's draft reply in the AFTRHRS voice, while understanding, state and song choice stay with the engine, so recommendations always come from the real catalogue. If the provider call fails, the rule-based reply is used. The frontend does not change.

---

## Security

- Passwords hashed with bcrypt (cost 10). Login compares against a dummy hash for unknown users so response timing doesn't reveal which accounts exist.
- JWT sessions in an `httpOnly`, `SameSite=Lax` cookie (`Secure` in production). Tokens are never readable from JavaScript.
- In production, state-changing API calls must come from the app's own origin.
- Every request body validated with zod. Parameterised SQL everywhere.
- Ownership checks on every edit and delete (drops, comments, playlists, room messages). Blocked and private content is filtered in the queries themselves.
- Rate limits: sign-up/login/demo/password/delete (30 per 15 min), writes (40/min), Mood AI (60/min), all API calls (600/min).
- helmet headers and a Content-Security-Policy that allows only the app itself, Google Fonts, and Apple's artwork and preview hosts.
- AI keys and the session secret exist only in server environment variables.

---

## Testing

### Automated: `npm test`

`server/tests/journey.test.ts` starts the real Express app against an in-memory database, seeds it, and runs the journey over HTTP. **17 of 17 pass.**

| # | Covers |
|---|---|
| — | Seed meets the brief: 100+ songs, 10 rooms, 15 playlists, Tamil/Hindi/English/Malayalam/Telugu present |
| 1 | Register (weak password rejected, duplicate email rejected), session, logout, login (wrong password rejected), protected route rejects anonymous users |
| 2 | Onboarding validation and storage |
| 3 | For You / Following / Trending / Latest feeds, mood filter, pagination, personalised Discover |
| 4 | Create a Mood Drop: validation, custom mood, must join a room before posting in it |
| 5 | Like (counted once), comment, save, delete comment, cannot delete someone else's drop |
| 6 | Follow/unfollow, search, block hides content from feeds, report hides the drop |
| 7 | Mood AI: "Play something" → "Anything" → "Just existing" → "Something nostalgic" → "Old versions of me", explained picks, regeneration without repeats, language follow-up |
| 7b | Mood detection on nine phrasings, including negation and "I'd love…" |
| 8 | Generate and save a playlist |
| 9 | Save a recommendation; conversation history reflects it |
| 10 | Publish an AI recommendation as a Mood Drop |
| 11 | Join a Sound Room (member count is real), post, discuss |
| 12 | Data persists after logout and login |
| — | Notifications by type, read state, notification preferences, private accounts, profile edit, guest flag |
| 14 | 404s, empty search, empty mood filter, unknown conversation |
| — | Account deletion removes the account and its content |

### Manual: in the browser

Run in the built-in browser against the dev server, plus a production build (`npm run build`, then `npm start` on port 4100):

- **Demo mode → feed → all 12 page types** (Discover, Rooms, a room, Mood AI, Create, Notifications, Settings, Search, own profile, another profile, a drop, a playlist) all render with no console errors.
- **Mood AI by typing**: the full example dialogue, then *Make it a playlist* → *Save playlist* → open a pick in Create (song, mood and caption prefilled) → **publish**.
- **Like, save and comment** on a drop; **follow** a listener; **join** a room (count went from 3 to 4).
- **Persistence**: after a full page reload, the like, save, comment, follow, room membership, published drop and saved playlist were all still there.
- **Register** (weak password blocked in the form) → **onboarding** (5 questions) → personalised feed (suggestions matched the chosen languages, artists and moods) → empty Following feed, empty profile and welcome notification → **logout** → protected route sends you to login → **login**.
- **Preview player**: a 30-second preview loads and plays. **Download card** produces a 1080×1350 PNG.
- **Responsive**: 1440px desktop (sidebar plus right rail) and a 375px phone (bottom nav). No page scrolls sideways at 375px.
- **Production build**: demo login works, fonts load, and the security policy allows Apple artwork and preview audio.

### Bugs found and fixed during testing

- The whole logged-in app went blank on newer Chromium because an effect returned `window.scrollTo(...)`, which now returns a Promise.
- Song rows and people cards pushed the page sideways on phones (grid columns had no minimum width).
- In development the API port collided with the port the preview tool sets; the API now uses `API_PORT`.
- Cover-art matching sometimes chose remixes, lo-fi flips or cover versions (10 of 175 matches). These are now rejected, and a match by the credited artist is preferred.

### Not verified

- An actual OpenAI or Gemini call (no key was available). The fallback to the rule-based engine on provider error is in the code but not exercised by a test.
- Screen-reader walkthroughs and Safari/Firefox.
- Load or performance testing.
- Accuracy of every catalogue entry. The metadata was curated by hand; the iTunes lookup only adds artwork, previews and links when it finds a confident match.

---

## Honest fallbacks

| Area | What happens now |
|---|---|
| Streaming playback | Outbound search links to Spotify, YouTube or Apple Music. 30-second previews from Apple where available. No full playback. |
| Album art | Official artwork from the iTunes Search API, looked up in the background and cached. Otherwise generated mood artwork. |
| Mood AI | Built-in rule-based engine. Labelled as such in the UI. |
| Notifications | In-app only. No email or push. |
| Moderation | Reports are stored and hidden from the reporter. There is no admin review screen. |
| Sample content | Demo listeners, their drops, comments, likes, follows and room activity are fictional and labelled **DEMO** / *sample*. Trending and member counts are computed from this instance's data, never presented as platform-wide statistics. |

---

## Future integrations and what they need

| Integration | What it would add | What it needs |
|---|---|---|
| **OpenAI / Gemini** | LLM-voiced Mood AI replies (already wired) | `AI_PROVIDER`, `AI_API_KEY`, optional `AI_MODEL` |
| **AI recommendations** | Embedding-based song and people matching | An embeddings provider and key; a new `Recommender` implementation in `server/src/recommend.ts` |
| **Spotify Web API** | Account linking, real track IDs and embeds, playlist export, listening history as a taste signal | Spotify developer app: Client ID and Secret, a redirect URI, OAuth scopes (`playlist-modify-private`, `user-top-read`); Web Playback SDK needs Premium users |
| **YouTube Data API** | Video IDs and official embeds | Google Cloud API key with YouTube Data API v3 enabled |
| **Apple MusicKit** | Full playback for subscribers | Apple Developer membership, MusicKit identifier, private key, signed developer token |
| **Email** | Verification, password reset, digests | SMTP or a provider such as Resend or Postmark: API key and a verified sending domain |
| **Push notifications** | Mobile and web push | VAPID keys (web) or APNs/FCM credentials |
| **Managed database** | Horizontal scaling, backups | A Postgres URL (Supabase, Neon, RDS). The SQL is standard apart from `INSERT OR IGNORE` and `group_concat`, which need small changes. |
| **Object storage** | Avatars outside the database | S3-compatible bucket and keys (avatars are currently small data URLs stored in the database) |
| **Moderation** | Admin review of reports, automated text checks | An admin role and a moderation provider key |
