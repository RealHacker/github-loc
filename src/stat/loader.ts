import { now } from "./util"

export interface LocData {
  loc: number
  locByLangs: { [lang: string]: number }
  lastFetched: number
}

interface FetchLocResponse {
  loc?: number
  error?: string
}

function makeKey(org: string, repo: string, branch: string) {
  return org + "/" + repo + "/" + branch
}

export function loadLoc(org: string, repo: string, branch: string): Promise<LocData | null> {
  return new Promise((resolve) => {
    const key = makeKey(org, repo, branch)

    chrome.storage.local.get(key, (data) => {
      const locData = data[key] as LocData

      if (
        typeof locData === "object" &&
        typeof locData.loc === "number" &&
        typeof locData.locByLangs === "object" &&
        typeof locData.lastFetched === "number"
      ) {
        resolve(locData as LocData)
      } else {
        resolve(null)
      }
    })
  })
}

export async function fetchLoc(org: string, repo: string, branch: string): Promise<LocData> {
  const response = (await chrome.runtime.sendMessage({
    type: "github-loc:fetch",
    org,
    repo,
    branch,
  })) as FetchLocResponse | undefined

  if (!response) {
    throw new Error("Failed to fetch LOC")
  }

  if (typeof response.error === "string") {
    throw new Error(response.error)
  }

  if (typeof response.loc !== "number") {
    throw new Error("Invalid response from background")
  }

  const data: LocData = {
    loc: response.loc,
    locByLangs: {},
    lastFetched: now(),
  }

  chrome.storage.local.set({ [makeKey(org, repo, branch)]: data })

  return data
}
