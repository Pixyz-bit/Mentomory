# PixBooth Duo backend

Mentomory starts with Solo or Duo. Solo opens the existing style and layout picker. Duo opens Create room and Join room. Rooms use a random 10-digit code and admit two browsers. The creator is on the left. Either member can start a five-second countdown once both cameras are on.

Both browsers capture locally at a shared server timestamp. Small private JPEG previews refresh about once per second, and the browsers combine the two full captures into one downloadable photo. Duo supports up to four captures per room and downloads the latest completed pair. Camera access requires a secure browser context.

The backend holds room data and media in memory. Rooms expire after 15 minutes without a request from either authenticated member. An open tab sends a heartbeat while the browser allows it to run. Restarts clear rooms. There are no accounts or durable photo storage.

## Runtime and VM setup

- Set `REALTIME_API_URL=http://realtime-server:3000` and a server-only `REALTIME_API_KEY` for the `pixbooth` project.
- Set `PIXBOOTH_ORIGINS=https://mentomory.pixyzbit.dev` to the exact frontend origin. For local testing, also add your localhost origin to this list and the Centrifugo registration.
- Set frontend `VITE_PIXBOOTH_API_URL` if the API differs from `https://pixbooth-api.chrbuilds.dev`. The frontend defaults to the existing `wss://realtime.chrbuilds.dev/connection/websocket` endpoint.
- The VM Compose file uses project `pixbooth`, the existing `app_network`, no host port, and an environment file at `~/apps/pixbooth/backend.env`.
- Register the application with `~/bin/realtime-project pixbooth https://mentomory.pixyzbit.dev`. The shared service must reload its registry and allowed origins to activate registration. This can briefly interrupt Pixel Plaza realtime.
- Caddy routes the PixBooth API hostname to `pixbooth:3000`. Publish DNS for the API hostname before enabling its HTTPS route. Keep the shared token and publish API private.
- Run the tests with `node --test tests/duo-room.test.mjs` from the repository root. Verify the API container at `/health` and run a two-browser capture after DNS and the frontend release are active.
