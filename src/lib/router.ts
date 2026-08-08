import { writable } from "svelte/store"

export type Route =
  | { name: "library" }
  | { name: "reader"; storyId: string }
  | { name: "settings" }
  | { name: "students" }
  | { name: "progress" }
  | { name: "addStory" }

function parse(hash: string): Route {
  const h = hash.replace(/^#\/?/, "")
  if (!h || h === "library") return { name: "library" }
  if (h === "settings") return { name: "settings" }
  if (h === "students") return { name: "students" }
  if (h === "progress") return { name: "progress" }
  if (h === "add-story") return { name: "addStory" }
  const readerMatch = h.match(/^story\/([^/]+)$/)
  if (readerMatch) return { name: "reader", storyId: readerMatch[1] }
  return { name: "library" }
}

export const route = writable<Route>(parse(window.location.hash))

window.addEventListener("hashchange", () => {
  route.set(parse(window.location.hash))
})

export function navigate(next: Route): void {
  const hash =
    next.name === "library"
      ? "#/library"
      : next.name === "settings"
        ? "#/settings"
        : next.name === "students"
          ? "#/students"
          : next.name === "progress"
            ? "#/progress"
            : next.name === "addStory"
              ? "#/add-story"
              : `#/story/${next.storyId}`
  if (window.location.hash !== hash) {
    window.location.hash = hash
  } else {
    route.set(next)
  }
}
