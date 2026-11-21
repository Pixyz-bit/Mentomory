# PixBooth shared room backend

Mentomory starts with Solo, Duo, Trio, or Quartet. Solo opens the style and layout picker. In a shared room, the host uses that same picker and guests receive the chosen layout and pose prompts. A 10-digit code or invite link admits up to the chosen capacity. Any member can start a five-second countdown once every seat has a camera on.

Each browser captures locally at a shared server timestamp. Private JPEG previews refresh about once per second and the higher-resolution shutter captures are composed into a 2160 × 1620 source image per shot. Shared rooms support Classic and Meme still layouts with up to four shots. Camera access requires a secure browser context.

The backend holds room data and media in memory. Guest seats are freed on leave or after 30 seconds without an authenticated heartbeat. The same room code can admit a replacement guest. Replacing a participant starts a fresh photo set, keeping earlier shots private. Host leave closes the room and otherwise the room expires after 15 minutes without any member activity. Restarts clear rooms. There are no accounts or durable photo storage.

## Runtime and VM setup

For local review, run `npm run dev` and open the same localhost URL in two browser tabs. Vite serves an in-memory Duo API and polls for updates. Set `VITE_PIXBOOTH_API_URL` to use another backend.

- Set `REALTIME_API_URL=http://realtime-server:3000` and a server-only `REALTIME_API_KEY` for the `pixbooth` project.
- Set `PIXBOOTH_ORIGINS=https://mentomory.pixyzbit.dev` to the exact frontend origin. For local testing, also add your localhost origin to this list and the Centrifugo registration.
- Set frontend `VITE_PIXBOOTH_API_URL` if the API differs from `https://pixbooth-api.chrbuilds.dev`. The frontend defaults to the existing `wss://realtime.chrbuilds.dev/connection/websocket` endpoint.
- The VM Compose file uses project `pixbooth`, the existing `app_network`, no host port, and an environment file at `~/apps/pixbooth/backend.env`.
- Register the application with `~/bin/realtime-project pixbooth https://mentomory.pixyzbit.dev`. The shared service must reload its registry and allowed origins to activate registration. This can briefly interrupt Pixel Plaza realtime.
- Caddy routes the PixBooth API hostname to `pixbooth:3000`. Publish DNS for the API hostname before enabling its HTTPS route. Keep the shared token and publish API private.
- Run the tests with `node --test tests/duo-room.test.mjs` from the repository root. Verify the API container at `/health` and run a two-browser capture after DNS and the frontend release are active.
