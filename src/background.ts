import { DEFAULT_IGNORED_FILES } from "./defaults"
import { fetchBadgeLoc } from "./badge-api"

interface FetchLocMessage {
  type: "github-loc:fetch"
  org: string
  repo: string
  branch: string
}

interface FetchLocResponse {
  loc?: number
  error?: string
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const url = new URL(tab.url)

    if (url.pathname.split("/").length > 2) {
      chrome.tabs.sendMessage(tabId, "github-loc:update").catch(() => {})
    }
  }
})

chrome.runtime.onInstalled.addListener(async () => {
  const ignoredFiles = await chrome.storage.sync.get("ignoredFiles")

  if (!Array.isArray(ignoredFiles.ignoredFiles)) {
    chrome.storage.sync.set({ ignoredFiles: DEFAULT_IGNORED_FILES })
  }
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (typeof message !== "object" || message === null || message.type !== "github-loc:fetch") {
    return
  }

  const { org, repo, branch } = message as FetchLocMessage

  ;(async () => {
    try {
      const ignoredFiles = await chrome.storage.sync.get("ignoredFiles")
      const files = Array.isArray(ignoredFiles.ignoredFiles) ? ignoredFiles.ignoredFiles : []
      const loc = await fetchBadgeLoc(org, repo, branch, files)
      const response: FetchLocResponse = { loc }
      sendResponse(response)
    } catch (err) {
      const response: FetchLocResponse = {
        error: err instanceof Error ? err.message : "Failed to fetch LOC",
      }
      sendResponse(response)
    }
  })()

  return true
})
