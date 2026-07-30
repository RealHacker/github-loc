const BADGE_API_BASE = "https://ghloc.vercel.app/api"

interface BadgeResponse {
  schemaVersion: number
  label: string
  message: string
  cacheSeconds: number
}

function buildFilter(ignoredFiles: string[]): string | undefined {
  if (ignoredFiles.length === 0) {
    return undefined
  }

  return ignoredFiles.map((ignored) => `!${ignored}$`).join(",")
}

export async function fetchBadgeLoc(
  org: string,
  repo: string,
  branch: string,
  ignoredFiles: string[],
): Promise<number> {
  const url = new URL(`${BADGE_API_BASE}/${org}/${repo}/badge`)
  url.searchParams.set("branch", branch)

  const filter = buildFilter(ignoredFiles)

  if (filter) {
    url.searchParams.set("filter", filter)
  }

  const badge = await fetch(url.toString()).then(async (res) => {
    const text = await res.text()

    if (!res.ok) {
      throw new Error(text.trim() || `HTTP ${res.status}`)
    }

    let data: unknown

    try {
      data = JSON.parse(text)
    } catch {
      throw new Error("Invalid response: " + text)
    }

    if (typeof data !== "object" || data === null) {
      throw new Error("Invalid response: " + text)
    }

    return data as BadgeResponse
  })

  const loc = Number.parseInt(badge.message.replaceAll(",", ""), 10)

  if (Number.isNaN(loc)) {
    throw new Error("Invalid response: missing line count")
  }

  return loc
}
