# Seamless Hermes pairing

Replace the existing 7-step wizard at `/connect` with a single calm screen whose hero is a paste-link field. The three pairing methods collapse into one surface; Demo Mode stays as a quiet escape hatch.

## The screen

One card, three inputs of decreasing prominence:

1. **Hero: Paste connect link** — large monospace input. Accepts `hermes://connect?...` and `https://agentmissioncontrol.dev/pair?...`. Auto-detects on paste, no Submit button needed — parsing happens on change.
2. **Secondary: Pairing code** — compact 6-char input (`H3K-9QF` style) with auto-hyphenation and uppercase.
3. **Tertiary: "Open from Hermes"** — explainer line: "Click 'Open in Mission Control' from your Hermes dashboard and this page will fill in automatically." Plus a "Try Demo Mode" ghost link.

Below the card, a small "What gets shared" disclosure (collapsed by default) preserving the existing data-collection notice.

## Confirm step (same screen, swapped content)

Once a link/code parses successfully, the card morphs into a confirm panel:

- Agent name, version, profile, fingerprint (monospace, truncated middle).
- Permission mode selector inline (Monitor / Mission control, Full control disabled — same as today).
- Single primary button: **Connect agent**. Secondary: **Cancel**.

No separate Install / Pair / Check steps. The fake "running checks" animation runs inline on the confirm card for ~1.2s after Connect is pressed, then routes to `/missions`.

## Deep link handling

`/connect` reads `?token=...` (and `?link=...`) from the URL on mount. If present, it skips straight to the confirm panel. This is what the "Open in Mission Control" button from Hermes would hit. In demo build, any non-empty token is accepted and resolves to a mock agent.

## Demo Mode

Kept as a text link under the card: "Just exploring? Enter Demo Mode →". One click, no extra screen, routes straight to `/missions` via existing `resetDemo()`.

## Files

- Rewrite `src/routes/connect.tsx` — drop the step machine, `STEPS` array, `MethodOption`, `CopyBlock`, `ConnectionCheck`, QR pairing card. Keep `DataNotice` (collapsed), `PermissionOption`, and the header bar (no step counter).
- Add a small `parseConnectLink(input: string)` helper at the top of the file that returns `{ ok, agent?, error? }` for both URL and code formats. Pure function, no network.
- No changes to `src/mock/store.ts`, `src/mock/types.ts`, or any other route.

## What stays the same

- Mock store, permission modes, dark visual language, header chrome.
- `setConnected(mode, permission)` / `resetDemo()` contracts.
- Auto-redirect from `/connect` → `/missions` once connected.

## Out of scope

Real Hermes protocol, real PKCE, real deep-link OS registration, QR scanning. The link path is wired end-to-end against mock data so the UX is what it would be in production.
