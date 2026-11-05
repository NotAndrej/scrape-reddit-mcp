# ScrapeReddit MCP

**ScrapeReddit** is an MCP (Model Context Protocol) server that reads Reddit posts
by URL, bypassing Reddit's JavaScript proof-of-work challenge and "prove your
humanity" gate. It exposes one tool:

- `read_reddit_post(url, includeComments?, maxComments?)`

## Why

Reddit front-ends ordinary HTTP fetches with a JS challenge and a CAPTCHA.
Generic tools (`curl`, `webfetch`, web search) often receive only the challenge
page. This server solves the challenge (`jsc_token` + doubled seed), replays the
request with the same cookie jar, and returns parsed post metadata + body.

## Requirements

- Node.js >= 18

## Run

```sh
node index.js
```

The server speaks MCP over stdio.

## OpenCode setup

```sh
opencode mcp add ScrapeReddit --global -- node /absolute/path/to/index.js
```

Optionally copy `opencode-skill/SKILL.md` to
`~/.config/opencode/skills/reddit/SKILL.md` so agents are instructed to prefer
ScrapeReddit whenever a Reddit URL is involved.

## Shell reader

`scripts/read_reddit.sh` is a standalone bash reader using the same flow.

## License

GPL-3.0-or-later (GNU General Public License v3.0 or later).

See LICENSE for full text.

## Generic agent integration (CC / OC / PI / Codex)

This repo ships shared instructions in `AGENTS.md`. Harness-specific files:

- **Claude Code (CC):** `.mcp.json`
- **OpenCode (OC):** `.opencode/opencode.json` + `opencode-skill/SKILL.md`
- **Codex:** `.codex/config.toml`
- **Pi / others:** follow `AGENTS.md` and register the stdio server `node index.js`
