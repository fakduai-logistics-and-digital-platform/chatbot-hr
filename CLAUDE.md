# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Static single-page HR chatbot app deployed to GitHub Pages. There is no package manager, build tool, bundler, or test framework in the current repo.

Core app lives in `index.html`:
- Inline CSS defines full dark chat UI, layout, animations, and responsive browser behavior.
- Inline JavaScript handles chat state, message rendering, Enter-to-send behavior, loading indicator, and webhook calls.
- Chat messages are posted to `https://n8n.fakduai.com/webhook/chat-hr` as JSON with `message` and `timestamp`.
- Webhook response handling prefers JSON `reply_to_user`, then JSON `message`, then plain text fallback.
- `logo.jpg` is used for favicon, header logo, and bot avatar.
- User avatar uses DiceBear pixel-art SVG generated from a random per-page-load seed.

## Skill usage

Use skills intelligently based on task context:
- `/karpathy-guidelines` — call at start of every conversation before coding, reviewing, or explaining implementation work. Apply its guidance throughout session.
- `/simplify` — call after code changes when reviewing changed code for reuse, quality, or efficiency.
- `/design-taste-frontend` or `/redesign-existing-projects` — call for UI redesign, visual polish, layout, interaction, or frontend design quality work.
- `/web-perf` — call when measuring or improving page load, Core Web Vitals, Lighthouse, or frontend runtime performance.
- `/stop-slop` — call when drafting or editing prose, product copy, README text, or user-facing writing.
- `/find-skills` — call when requested capability may need a skill not already listed.
- `/update-config` — call when changing Claude/OpenClaude settings, hooks, or automated behavior.

After large tasks finish, use `/compact` to reduce context before continuing with unrelated work.

## Sub-agent usage

Use only these sub-agents by default:
- `Explore` — use for codebase search, file discovery, or repo understanding before editing.
- `verification` — use after non-trivial implementation before reporting completion, especially 3+ file edits, backend/API changes, or infrastructure changes.

Prefer sub-agents when their work would add noisy search/build output to main context. Main agent still owns synthesis, edits, and user-facing answer.

## Commands

No install/build/test commands exist currently. Common local workflows:

```bash
# Serve locally from repo root
python3 -m http.server 8000

# Open app after server starts
open http://localhost:8000
```

Validation options for this repo are manual/browser-based:
- Open `index.html` directly or through local HTTP server.
- Test sending a message and verify webhook response renders in chat.
- Check browser DevTools console/network for JavaScript or webhook errors.

## Deployment

GitHub Pages deploy is configured in `.github/workflows/deploy.yml`:
- Runs on push to `main` and manual `workflow_dispatch`.
- Uploads repository root (`path: '.'`) as Pages artifact.
- Deploys with `actions/deploy-pages@v4`.

Because deploy uploads repo root, avoid adding generated files or local-only artifacts at repository top level unless they should be published.

## Repo structure

- `index.html` — complete app: markup, styles, and JavaScript.
- `logo.jpg` — brand image used by app.
- `.github/workflows/deploy.yml` — GitHub Pages deployment.
- `.agents/` and `skills-lock.json` — local OpenClaude/agent skill files, not app runtime code.

## Implementation notes

- Preserve Thai UI copy unless requested otherwise.
- Current message rendering uses `innerHTML` after newline formatting, so changes around message content should account for HTML injection risk from user input or webhook output.
- `getWebhookUrl()` currently generates a new UUID for every sent message; if conversation continuity is needed, session handling must change deliberately.
