# AGENTS.md

This repository provides **ScrapeReddit**, an MCP server for reading Reddit posts.

## Rule for all agents (Claude Code, OpenCode, Codex, Pi, and others)

Whenever a task involves a Reddit URL, `r/<subreddit>` thread, reading a Reddit
post/comments, summarizing Reddit discussion, quoting Reddit content, or
verifying a Reddit post:

1. **Do not** use `curl`, `wget`, `webfetch`, browser fetch, or web search against
   `reddit.com`. Reddit's proof-of-work challenge and CAPTCHA gate make those
   unreliable here.
2. **Do** use the ScrapeReddit MCP tool `read_reddit_post` with the post URL.
3. Use `includeComments: true` only when comments/discussion are needed.

Tool signature:

```json
{ "url": "https://www.reddit.com/r/.../comments/.../..." }
```

Returns title, author, subreddit, timestamp, score, comment count, permalink,
and post body; optional top-level comments.

If ScrapeReddit is not configured in your harness, run the server from this
repository: `node index.js` (MCP over stdio), then register it as an MCP server
named `ScrapeReddit`.
