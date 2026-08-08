export interface ParsedFrontmatter {
  data: Record<string, unknown>
  content: string
}

function coerce(value: string): unknown {
  const trimmed = value.trim()
  if (trimmed === "") return ""
  if (trimmed === "true") return true
  if (trimmed === "false") return false
  if (trimmed === "null" || trimmed === "~") return null
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim()
    if (!inner) return []
    return inner.split(",").map((item) => coerce(item))
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

export function parseFrontmatter(raw: string): ParsedFrontmatter {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/)
  if (!match) return { data: {}, content: raw }

  const yamlBlock = match[1]
  const content = raw.slice(match[0].length)
  const data: Record<string, unknown> = {}

  for (const line of yamlBlock.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue
    const colonIndex = line.indexOf(":")
    if (colonIndex === -1) continue
    const key = line.slice(0, colonIndex).trim()
    const value = line.slice(colonIndex + 1).trim()
    if (!key) continue
    data[key] = coerce(value)
  }

  return { data, content }
}
