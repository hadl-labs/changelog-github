import { readFileSync } from "node:fs"

export function getVersionMessage() {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"))
  return `Release v${pkg.version}`
}
