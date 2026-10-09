// Checks that every commit has a "Signed-off-by" line matching its author
// (Developer Certificate of Origin, see CONTRIBUTING.md).
// Input (stdin): JSON commits as returned by the GitHub API
// (GET /repos/{owner}/{repo}/pulls/{number}/commits), optionally paginated
// with `gh api --paginate --slurp` (array of pages). Bot commits are skipped.
import { readFileSync } from "node:fs"

const commits = JSON.parse(readFileSync(0, "utf8")).flat()
if (commits.length === 0) {
  console.error("No commits received.")
  process.exit(1)
}

let failed = false
for (const { sha, author, commit } of commits) {
  const short = sha.slice(0, 7)
  const login = author?.login ?? ""
  if (login.endsWith("[bot]")) {
    console.log(`skip  ${short} (bot: ${login})`)
    continue
  }
  const email = commit.author.email.toLowerCase()
  const signed = commit.message
    .split("\n")
    .some((line) => /^signed-off-by:/i.test(line) && line.toLowerCase().includes(`<${email}>`))
  if (signed) {
    console.log(`ok    ${short}`)
  } else {
    console.log(`FAIL  ${short} has no "Signed-off-by" line matching <${email}>`)
    failed = true
  }
}

if (failed) {
  console.log("\nSign your commits with `git commit -s` (or `git rebase --signoff main`).")
  console.log("See CONTRIBUTING.md#developer-certificate-of-origin-dco")
  process.exit(1)
}
