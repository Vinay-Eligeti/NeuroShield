// extension/popup.js
document.getElementById("start").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.runtime.sendMessage({ type: "start-monitor", targetTabId: tab.id });
});

document.getElementById("stop").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "stop-monitor" });
});
