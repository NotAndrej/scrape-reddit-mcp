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

## Install prompt for agents (copy/paste)

```
# Installer prompt: ScrapeReddit MCP

Copy the block below and give it to your coding agent.

---

You are an AI coding agent. Install and configure the ScrapeReddit MCP server for
this environment, then verify it works.

Repository: https://github.com/NotAndrej/scrape-reddit-mcp
License: GPL-3.0-or-later

Steps:

1. Clone the repository to a persistent local path, for example `~/scrape-reddit-mcp`,
   and ensure `node --version` is 18 or newer.
2. Test the server starts:
   - Send one JSON-RPC `initialize` request to `node index.js` over stdin.
   - Confirm it responds with `serverInfo.name == "ScrapeReddit"`.
3. Register it with the current harness:
   - OpenCode: run `opencode mcp add ScrapeReddit --global -- node <path>/index.js`,
     then copy `opencode-skill/SKILL.md` to `~/.config/opencode/skills/reddit/SKILL.md`,
     then run `opencode reload`.
   - Claude Code: ensure `.mcp.json` in the project/workspace points `ScrapeReddit` to
     `node <path>/index.js`.
   - Codex: append an `[mcp_servers.ScrapeReddit]` block (`command = "node"`,
     `args = ["<path>/index.js"]`) to `~/.codex/config.toml`.
   - Other agent: register the stdio server command `node <path>/index.js` as an MCP
     server named `ScrapeReddit`.
4. Verify with the MCP `tools/list` that `read_reddit_post` is available, and call it on:
   `https://www.reddit.com/r/opensource/comments/1xelcuf/your_tokens_arent_valuable_no_more_ai/`
5. Report the post title and author after a successful read.

Constraints:
- Do not use curl/webfetch/websearch against reddit.com as a substitute.
- Preserve existing user configuration; only add the ScrapeReddit entry.
- Prefer absolute paths in harness configs.

---

File lives in the repository as `INSTALL_PROMPT.md`.

```

## License

GPL-3.0-or-later (GNU General Public License v3.0 or later).

See LICENSE for full text.

## Generic agent integration (CC / OC / PI / Codex)

This repo ships shared instructions in `AGENTS.md`. Harness-specific files:

- **Claude Code (CC):** `.mcp.json`
- **OpenCode (OC):** `.opencode/opencode.json` + `opencode-skill/SKILL.md`
- **Codex:** `.codex/config.toml`
- **Pi / others:** follow `AGENTS.md` and register the stdio server `node index.js`
