import {
  locateRoot,
  injectStat,
  updateStat,
  updateStatError,
  updateLink,
  updateFallbackLink,
} from "./injector"
import { fetchLoc, loadLoc } from "./loader"
import { getTarget, getFilter, now } from "./util"
import Stat from "./Stat"

const FETCH_RATE_LIMIT = 10 * 60

let mainToken = 0

function main() {
  const token = ++mainToken

  locateRoot().then(([root, isPublic, existingStat]) => {
    if (token !== mainToken) {
      return
    }
    const [org, repo, branch] = getTarget()

    const stat =
      existingStat ??
      injectStat(
        root,
        Stat({
          org,
          repo,
          branch,
        }),
      )

    loadLoc(org, repo, branch).then((locData) => {
      if (isPublic) {
        getFilter().then((filter) => {
          updateLink(stat, filter)
        })
      }

      if (locData) {
        updateStat(stat, locData.loc)

        if (now() - locData.lastFetched < FETCH_RATE_LIMIT) {
          if (!isPublic && Object.keys(locData.locByLangs).length > 0) {
            updateFallbackLink(stat, locData, org, repo)
          }

          return
        }
      }

      fetchLoc(org, repo, branch)
        .then((locData) => {
          updateStat(stat, locData.loc)

          if (!isPublic && Object.keys(locData.locByLangs).length > 0) {
            updateFallbackLink(stat, locData, org, repo)
          }
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : "Failed to fetch LOC"
          console.error("Failed to fetch LOC:", err)
          updateStatError(stat, message)
        })
    })
  })
}

chrome.runtime.onMessage.addListener((message) => {
  if (message === "github-loc:update") {
    main()
  }
})

main()
