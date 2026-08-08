import { parseFrontmatter } from "./frontmatter"
import type { Story, StoryMeta } from "../types"

const storyModules = import.meta.glob("/src/stories/*.md", {
  query: "?raw",
  import: "default",
  eager: false,
}) as Record<string, () => Promise<string>>

function splitSentences(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
}

function idFromPath(path: string): string {
  const file = path.split("/").pop() ?? path
  return file.replace(/\.md$/, "")
}

let cache: Story[] | null = null

export async function loadAllStories(): Promise<Story[]> {
  if (cache) return cache
  const entries = Object.entries(storyModules)
  const stories = await Promise.all(
    entries.map(async ([path, loader]) => {
      const raw = await loader()
      const parsed = parseFrontmatter(raw)
      const data = parsed.data as Partial<StoryMeta>
      const id = data.id ?? idFromPath(path)
      const story: Story = {
        id,
        title: data.title ?? id,
        level: (data.level as Story["level"]) ?? "A1",
        ageRange: data.ageRange,
        tags: data.tags,
        author: data.author,
        sentences: splitSentences(parsed.content),
      }
      return story
    })
  )
  stories.sort((a, b) => a.title.localeCompare(b.title))
  cache = stories
  return stories
}

export async function loadStory(id: string): Promise<Story | undefined> {
  const stories = await loadAllStories()
  return stories.find((s) => s.id === id)
}
