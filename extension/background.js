// extension/background.js
let monitorTabId = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "start-monitor") {
    openMonitorTab(msg.targetTabId).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === "stop-monitor") {
    if (monitorTabId) {
      chrome.tabs.sendMessage(monitorTabId, { type: "stop-capture" });
    }
    sendResponse({ ok: true });
    return true;
  }
});

async function openMonitorTab(targetTabId) {
  if (monitorTabId) {
    try {
      await chrome.tabs.update(monitorTabId, { active: true });
      chrome.tabs.sendMessage(monitorTabId, { type: "start-capture", targetTabId });
      return;
    } catch {
      monitorTabId = null;
    }
  }

  const url = chrome.runtime.getURL("monitor.html");
  const tab = await chrome.tabs.create({ url });
  monitorTabId = tab.id;

  const onUpdated = (tabId, info) => {
    if (tabId === monitorTabId && info.status === "complete") {
      chrome.tabs.sendMessage(monitorTabId, { type: "start-capture", targetTabId });
      chrome.tabs.onUpdated.removeListener(onUpdated);
    }
  };
  chrome.tabs.onUpdated.addListener(onUpdated);
}
