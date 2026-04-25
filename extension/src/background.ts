export {}

async function fetchPageHtml(url: string): Promise<string> {
  // Use credentials: "include" so site session cookies are sent.
  // mobile.bg stores search filters (engine_power, body type, location, etc.)
  // in a session cookie — without it, fine-grained filters are ignored.
  const response = await fetch(url, { credentials: "include" })
  const buffer = await response.arrayBuffer()
  const contentType = response.headers.get("content-type") || ""
  const charsetMatch = contentType.match(/charset=([^\s;]+)/i)
  let charset = charsetMatch?.[1]?.toLowerCase() || ""

  if (!charset) {
    charset = url.includes("mobile.bg") ? "windows-1251" : "utf-8"
  }

  try {
    return new TextDecoder(charset).decode(buffer)
  } catch {
    return new TextDecoder("utf-8").decode(buffer)
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "fetchPage") {
    fetchPageHtml(message.url)
      .then((html) => sendResponse({ html }))
      .catch((err) => sendResponse({ error: String(err) }))
    return true
  }
})

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("tabs/welcome.html") })
  }
})
