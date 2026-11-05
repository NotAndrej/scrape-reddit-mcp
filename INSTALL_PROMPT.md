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
