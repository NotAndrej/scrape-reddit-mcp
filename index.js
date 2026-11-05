#!/usr/bin/env node
// ScrapeReddit MCP server - reads Reddit posts (including behind Reddit's JS challenge)
// Protocol: MCP over stdio (JSON-RPC 2.0)

const readline = require('readline');

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

let cookieJar = new Map();

function cookieString() {
  return [...cookieJar.entries()].map(([k,v]) => `${k}=${v}`).join('; ');
}

function collectCookies(res) {
  let setCookies = [];
  if (typeof res.headers.getSetCookie === 'function') {
    setCookies = res.headers.getSetCookie();
  } else {
    const sc = res.headers.get('set-cookie');
    if (sc) setCookies = [sc];
  }
  for (const sc of setCookies) {
    const first = sc.split(';')[0];
    const idx = first.indexOf('=');
    if (idx > 0) cookieJar.set(first.slice(0, idx).trim(), first.slice(idx+1).trim());
  }
}

function baseHeaders(site = 'none') {
  return {
    'User-Agent': UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': site,
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  };
}

async function fetchRedditPost(url) {
  cookieJar = new Map();

  // Step 1
  const h1 = baseHeaders('none');
  if (cookieString()) h1['Cookie'] = cookieString();
  let res = await fetch(url, { headers: h1, redirect: 'follow' });
  collectCookies(res);
  let html = await res.text();

  const tokenMatch = html.match(/jsc_token"\s*value="([^"]+)"/);
  const seedMatch = html.match(/\(async e=>e\+e\)\("([0-9a-f]+)"\)/);

  if (tokenMatch && seedMatch) {
    const token = tokenMatch[1];
    const seed = seedMatch[1];
    const solution = seed + seed;
    const submitUrl = url + (url.includes('?') ? '&' : '?') +
      `solution=${encodeURIComponent(solution)}&js_challenge=1&jsc_token=${encodeURIComponent(token)}&jsc_orig_r=`;

    const h2 = baseHeaders('same-origin');
    if (cookieString()) h2['Cookie'] = cookieString();
    res = await fetch(submitUrl, { headers: h2, redirect: 'follow' });
    collectCookies(res);
    html = await res.text();
  }

  return html;
}

function textOfElement(htmlFragment) {
  let t = htmlFragment.replace(/<script[\s\S]*?<\/script>/gi, '')
                    .replace(/<style[\s\S]*?<\/style>/gi, '');
  t = t.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<\/p>/gi, '\n\n');
  t = t.replace(/<\/li>/gi, '\n');
  t = t.replace(/<[^>]+>/g, '');
  t = htmlDecode(t);
  // collapse multiple blank lines
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

function htmlDecode(s) {
  return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
          .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#x27;/g,"'")
          .replace(/&nbsp;/g,' ');
}

function findMatchingDiv(html, markerAttr) {
  // find <div ... markerAttr ...> and its matching close
  const re = new RegExp('<div\\b[^>]*' + markerAttr + '[^>]*>', 'i');
  const m = html.match(re);
  if (!m) return '';
  const startIdx = html.indexOf(m[0]);
  const openTagEnd = startIdx + m[0].length;
  let depth = 1;
  let i = openTagEnd;
  while (depth > 0) {
    const nextOpen = html.indexOf('<div', i);
    const nextClose = html.indexOf('</div>', i);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + 4;
    } else {
      depth--;
      if (depth === 0) {
        return html.slice(openTagEnd, nextClose);
      }
      i = nextClose + 6;
    }
  }
  return '';
}

function extractComments(html, maxComments) {
  const out = [];
  const re = /<shreddit-comment\b([^>]*)>([\s\S]*?)<\/shreddit-comment>/gi;
  let m;
  while ((m = re.exec(html)) !== null && out.length < maxComments * 3) {
    const attrs = m[1];
    const inner = m[2];
    const dm = attrs.match(/\bdepth="([^"]*)"/);
    const depth = dm ? dm[1] : '';
    if (depth && depth !== '0') continue;
    const am = attrs.match(/\bauthor="([^"]*)"/);
    const sm = attrs.match(/\bscore="([^"]*)"/);
    const content = findMatchingDiv(inner, 'slot="comment"') || inner;
    const author = am ? am[1] : 'unknown';
    const score = sm ? sm[1] : '?';
    out.push({ author, score, text: textOfElement(content) });
    if (out.length >= maxComments) break;
  }
  return out;
}

function buildOutput(html, includeComments, maxComments) {
  const lines = [];
  const postMatch = html.match(/<shreddit-post\b([^>]*)>/i);
  const attrs = postMatch ? postMatch[1] : '';
  const getAttr = (name) => {
    const m = attrs.match(new RegExp('\\b' + name + '="([^"]*)"', 'i'));
    return m ? m[1] : '';
  };
  const title = getAttr('post-title') || (html.match(/<title>([^<]*)<\/title>/i)?.[1] || '');
  const author = getAttr('author');
  const subreddit = getAttr('subreddit-prefixed-name');
  const created = getAttr('created-timestamp');
  const score = getAttr('score');
  const commentCount = getAttr('comment-count');
  const permalink = getAttr('permalink');

  lines.push(`TITLE: ${htmlDecode(title)}`);
  if (author) lines.push(`AUTHOR: ${author}`);
  if (subreddit) lines.push(`SUBREDDIT: ${subreddit}`);
  if (created) lines.push(`POSTED: ${created}`);
  if (score !== '') lines.push(`SCORE: ${score}`);
  if (commentCount !== '') lines.push(`COMMENTS: ${commentCount}`);
  if (permalink) lines.push(`PERMALINK: https://www.reddit.com${permalink}`);
  lines.push('');

  const bodyHtml = findMatchingDiv(html, 'slot="text-body"');
  lines.push('BODY:');
  lines.push(textOfElement(bodyHtml || ''));
  lines.push('');

  if (includeComments) {
    const comments = extractComments(html, maxComments);
    lines.push(`TOP-LEVEL COMMENTS (up to ${maxComments}):`);
    if (comments.length === 0) {
      lines.push('(none found in parsed HTML)');
    } else {
      comments.forEach((c, i) => {
        lines.push(`\n[${i+1}] u/${c.author} (score ${c.score}):`);
        lines.push(c.text);
      });
    }
  }
  return lines.join('\n');
}

async function handleToolCall(params) {
  const args = params.arguments || {};
  const url = args.url;
  if (!url) throw new Error('Missing required argument: url');
  const html = await fetchRedditPost(url);
  const text = buildOutput(html, !!args.includeComments, args.maxComments || 10);
  return { content: [{ type: 'text', text }], isError: false };
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

rl.on('line', async (line) => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch (e) { return; }
  const { id, method } = msg;

  // Notifications: no response
  if (method && method.startsWith('notifications/')) return;

  try {
    if (method === 'initialize') {
      send({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'ScrapeReddit', version: '1.0.0' },
        },
      });
    } else if (method === 'tools/list') {
      send({
        jsonrpc: '2.0',
        id,
        result: {
          tools: [{
            name: 'read_reddit_post',
            description: 'Read a Reddit post by URL, bypassing Reddit\'s JS challenge. Returns title, author, metadata, and post body; optionally top-level comments.',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', description: 'Full Reddit post URL' },
                includeComments: { type: 'boolean', description: 'Include top-level comments', default: false },
                maxComments: { type: 'integer', description: 'Max top-level comments to include', default: 10 },
              },
              required: ['url'],
            },
          }],
        },
      });
    } else if (method === 'tools/call') {
      const result = await handleToolCall(msg.params || {});
      send({ jsonrpc: '2.0', id, result });
    } else if (method === 'ping') {
      send({ jsonrpc: '2.0', id, result: {} });
    } else {
      send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
    }
  } catch (e) {
    send({ jsonrpc: '2.0', id, error: { code: -32000, message: String(e && e.message || e) } });
  }
});
