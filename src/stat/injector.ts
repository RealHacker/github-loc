import { JSX, render } from "preact"
import { LocData } from "./loader"
import { openFallbackPage } from "./util"

const ABOUT_SECTION_XPATH =
  '//h2[.//text()[normalize-space()="About"]]/parent::*[contains(@class,"sidebarSection")]'

function findAboutSection(): Element | null {
  return document.evaluate(
    ABOUT_SECTION_XPATH,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  ).singleNodeValue as Element | null
}

function isPublicRepo(): boolean {
  for (const label of document.querySelectorAll(".Label.Label--secondary")) {
    const text = label.textContent?.trim()
    if (text === "Private") return false
    if (text === "Public") return true
  }

  return true
}

function removeOrphanedStats(root: Element) {
  for (const stat of document.querySelectorAll("#github-loc")) {
    if (!root.contains(stat)) {
      stat.remove()
    }
  }
}

function findExistingStat(root: Element): HTMLElement | null {
  const stat = root.querySelector("#github-loc")

  return stat instanceof HTMLElement ? stat : null
}

export function locateRoot(): Promise<[Element, boolean, HTMLElement | null]> {
  return new Promise((resolve) => {
    const tryLocate = (): [Element, boolean, HTMLElement | null] | null => {
      const root = findAboutSection()

      if (!root) {
        return null
      }

      removeOrphanedStats(root)

      return [root, isPublicRepo(), findExistingStat(root)]
    }

    const found = tryLocate()

    if (found) {
      resolve(found)
      return
    }

    const observer = new MutationObserver(() => {
      const result = tryLocate()

      if (result) {
        observer.disconnect()
        resolve(result)
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })
  })
}

export function injectStat(root: Element, stat: JSX.Element): HTMLElement {
  const existing = root.querySelector("#github-loc")

  if (existing instanceof HTMLElement) {
    return existing
  }

  const div = document.createElement("div")
  div.className = "mt-2"
  div.id = "github-loc"

  if (root.lastElementChild?.firstElementChild?.textContent?.includes("Report")) {
    root.insertBefore(div, root.lastElementChild)
  } else {
    root.appendChild(div)
  }

  render(stat, div)

  return div
}

function getStatLink(stat: Element): HTMLElement | null {
  return stat.querySelector("a")
}

function getStatCount(stat: Element): HTMLElement | null {
  return stat.querySelector("#github-loc-count")
}

export function updateStat(stat: Element, value: number) {
  const count = getStatCount(stat)
  const link = getStatLink(stat)

  if (count) {
    count.textContent = value.toLocaleString()
  }

  link?.removeAttribute("title")
}

export function updateStatError(stat: Element, message: string) {
  const count = getStatCount(stat)
  const link = getStatLink(stat)

  if (count) {
    count.textContent = "—"
  }

  if (link) {
    link.title = message
  }
}

export function updateLink(stat: Element, filter: string) {
  const link = stat.firstElementChild!.getAttribute("href")!
  stat.firstElementChild!.setAttribute("href", link + filter)
}

export function updateFallbackLink(stat: HTMLElement, data: LocData, org: string, repo: string) {
  stat = stat.firstElementChild! as HTMLElement
  stat.removeAttribute("href")

  stat.onclick = () => {
    openFallbackPage(data, org, repo)
  }
}
