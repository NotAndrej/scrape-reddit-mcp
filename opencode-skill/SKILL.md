---
name: reddit
description: Use whenever a task involves a Reddit URL, r/<subreddit> thread, reading a Reddit post or comments, summarizing Reddit discussion, quoting Reddit content, or verifying a Reddit post. Always use the ScrapeReddit MCP instead of curl, webfetch, or websearch for Reddit pages.
---

# Reddit (via ScrapeReddit MCP)

Reddit pages are fronted by a JavaScript proof-of-work challenge and a “prove your humanity” CAPTCHA, so generic HTTP fetch tools usually fail or return only a challenge page. This environment has a dedicated MCP server, **ScrapeReddit**, that solves the challenge and returns the post HTML as readable text.

## MANDATORY BEHAVIOR

When the user provides, mentions, or you need to inspect a Reddit post URL (e.g. `https://www.reddit.com/r/<subreddit>/comments/<id>/<slug>/`):

1. **Do NOT** use `webfetch`, `curl`, or web search against reddit.com.
2. **DO** call the ScrapeReddit MCP tool:
   ```
   tools.ScrapeReddit.read_reddit_post({ "url": "<reddit_post_url>" })
   ```
3. Add `includeComments: true` (and optionally `maxComments`) only when the user asks for comments or discussion, to keep output smaller.
4. Use the returned `BODY` as the source of truth for the post text. Treat `AUTHOR`, `POSTED`, `SCORE`, and `COMMENTS` metadata as authoritative.
5. If the tool errors, report the error rather than falling back to blocked fetches.

## What the tool returns

- `TITLE`, `AUTHOR`, `SUBREDDIT`, `POSTED`, `SCORE`, `COMMENTS`, `PERMALINK`
- `BODY`: full post text
- Optional top-level comments with authors and scores

## When not to use

- The URL is not a Reddit post (e.g. a subreddit listing, user profile, or media file). In that case explain the limitation or ask the user.
