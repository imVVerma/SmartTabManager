# Smart Tab Manager

A Chrome browser extension to view, search, save, and organize your open tabs — built as a learning project to understand how browser extensions work from the ground up.

---

## What it does

- **View all open tabs** in a clean popup UI with favicons, titles, and URLs
- **Search tabs** in real time by title or URL
- **Close any tab** directly from the popup with one click
- **Save a session** — snapshot all your current tabs under a name and restore them later, even after restarting the browser
- **Restore or delete saved sessions** from the sessions view
- **Group tabs by domain** *(in progress — see known issues below)*

---

## How to run it on your own system

This extension is unpacked, meaning you load it directly into Chrome from your file system — no Web Store needed.

### Prerequisites

- Google Chrome (any recent version)
- No Node.js, no build step, no dependencies — it's plain HTML, CSS, and JavaScript

### Steps

**1. Clone the repository**

```bash
git clone https://github.com/imVVerma/SmartTabManager.git
cd SmartTabManager
```

**2. Open Chrome and go to the extensions page**

Type this in your address bar:

```
chrome://extensions
```

**3. Enable Developer Mode**

Toggle the **Developer mode** switch in the top right corner of the extensions page.

**4. Load the extension**

Click **Load unpacked** and select the `SmartTabManager` folder you just cloned.

**5. Pin it to your toolbar**

Click the puzzle piece icon in Chrome's toolbar, find Smart Tab Manager, and click the pin icon so it's always visible.

**6. You're done**

Click the extension icon to open the popup and start using it.

---

## Project structure

```
SmartTabManager/
├── manifest.json       # Extension config — permissions, popup, service worker
├── popup.html          # The UI rendered when you click the extension icon
├── popup.js            # All popup logic — tab rendering, sessions, search
├── background.js       # Background service worker — runs independently of the popup
└── icons/
    └── icon128.png     # Extension icon
```

---

## Key concepts you'll learn from this codebase

| Concept | Where to look |
|---|---|
| Manifest V3 structure | `manifest.json` |
| Querying and closing tabs | `popup.js` → `loadTabs`, `renderTabs` |
| Persisting data across sessions | `popup.js` → `getSessions`, `saveSession` |
| Message passing between popup and service worker | `popup.js` → `groupTabsByDomain`, `background.js` → `onMessage` |
| Chrome's Content Security Policy rules | Why all event handlers use `addEventListener` and never `onclick=` in HTML |

---

## Known issues

### Group Tabs is not working yet

The **Group tabs** button is implemented but not functioning correctly in the current version. The feature is supposed to automatically organize your open tabs into Chrome's native colored tab groups based on domain (e.g. all YouTube tabs together, all GitHub tabs together).

The code is in place — `chrome.tabs.group()` and `chrome.tabGroups.update()` are both being called correctly — but the message passing between the popup and the background service worker is silently failing. The popup sends the `groupTabs` message but the background worker does not respond.

This is being investigated and will be fixed in the next iteration. If you want to dig into it yourself, the relevant files are `popup.js` (`groupTabsByDomain` function) and `background.js` (`onMessage` listener).

---

## Upcoming

- Fix tab grouping
- Ungroup all tabs button
- Auto-save session on browser close
- Export sessions as JSON

---

## Built with

- Vanilla JavaScript — no frameworks
- Chrome Extensions API (Manifest V3)
- `chrome.tabs`, `chrome.tabGroups`, `chrome.storage.local`, `chrome.runtime`
