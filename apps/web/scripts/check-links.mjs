// Crawls the running site and reports dead links.
// Usage: node scripts/check-links.mjs [baseUrl]   (default http://localhost:3000)
// Starts from every locale home page, follows internal links (and anchors),
// and checks external links once. Exits with code 1 if a link is broken.

import process from "node:process"

const base = new URL(process.argv[2] ?? "http://localhost:3000")
const startPaths = ["/fr", "/en"]

const pages = new Map() // internal URL without hash -> { status, ids }
const external = new Map() // external URL -> status
const references = [] // { from, href }

const hrefPattern = /<a\b[^>]*?\shref="([^"]+)"/gi
const idPattern = /\sid="([^"]+)"/gi
const decode = (value) => value.replaceAll("&amp;", "&")

async function fetchStatus(url, method = "GET") {
  try {
    const response = await fetch(url, { method, redirect: "follow" })
    return {
      status: response.status,
      body: method === "GET" ? await response.text() : "",
    }
  } catch (error) {
    return { status: 0, body: "", error: String(error) }
  }
}

async function crawl(url) {
  const key = url.href.split("#")[0]
  if (pages.has(key)) return
  pages.set(key, { status: "pending", ids: new Set() })

  const { status, body } = await fetchStatus(key)
  const ids = new Set([...body.matchAll(idPattern)].map((match) => match[1]))
  pages.set(key, { status, ids })
  if (status >= 400 || status === 0) return

  for (const [, rawHref] of body.matchAll(hrefPattern)) {
    const href = decode(rawHref)
    if (href.startsWith("mailto:") || href.startsWith("tel:")) continue
    const target = new URL(href, key)
    references.push({ from: key, href: target.href })
    if (target.origin === base.origin) await crawl(target)
    else if (!external.has(target.href)) external.set(target.href, null)
  }
}

for (const path of startPaths) await crawl(new URL(path, base))

await Promise.all(
  [...external.keys()].map(async (url) => {
    let { status } = await fetchStatus(url, "HEAD")
    if (status === 405 || status === 0) ({ status } = await fetchStatus(url))
    external.set(url, status)
  })
)

const broken = []
for (const { from, href } of references) {
  const url = new URL(href)
  const isExternal = url.origin !== base.origin
  const status = isExternal
    ? external.get(href)
    : pages.get(href.split("#")[0])?.status
  if (!status || status >= 400) {
    broken.push(`${status ?? "?"}  ${href}  (from ${from})`)
    continue
  }
  if (
    !isExternal &&
    url.hash &&
    !pages.get(href.split("#")[0])?.ids.has(url.hash.slice(1))
  ) {
    broken.push(`#  ${href}  missing anchor (from ${from})`)
  }
}

console.log(`Checked ${pages.size} pages and ${external.size} external links.`)
for (const [url, { status }] of pages) console.log(`  ${status}  ${url}`)
for (const [url, status] of external) console.log(`  ${status}  ${url}`)

if (broken.length) {
  console.log(`\n${broken.length} broken link(s):`)
  for (const line of [...new Set(broken)]) console.log(`  ${line}`)
  process.exit(1)
}
console.log("\nNo broken links.")
