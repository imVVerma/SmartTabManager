const GROUP_COLORS = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'grey'];

chrome.runtime.onInstalled.addListener(() => {
  console.log('Tab Manager installed.');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'groupTabs') {
    handleGroupTabs().then(result => sendResponse(result));
    return true; // keeps the message channel open for async response
  }
});

async function handleGroupTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });

  const domainMap = {};
  for (const tab of tabs) {
    if (!tab.url || tab.url.startsWith('chrome://')) continue;
    try {
      const domain = new URL(tab.url).hostname.replace('www.', '');
      if (!domainMap[domain]) domainMap[domain] = [];
      domainMap[domain].push(tab.id);
    } catch (e) {}
  }

  const toGroup = Object.entries(domainMap).filter(([, ids]) => ids.length > 1);
  if (toGroup.length === 0) return { count: 0 };

  let colorIndex = 0;
  for (const [domain, tabIds] of toGroup) {
    const groupId = await chrome.tabs.group({ tabIds });
    await chrome.tabGroups.update(groupId, {
      title: domain,
      color: GROUP_COLORS[colorIndex % GROUP_COLORS.length],
      collapsed: false
    });
    colorIndex++;
  }

  return { count: toGroup.length };
}