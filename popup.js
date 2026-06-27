// popup.js
let allTabs = [];
let view = 'tabs'; // 'tabs' | 'sessions'

async function loadTabs() {
  allTabs = await chrome.tabs.query({ currentWindow: true });
  renderTabs(allTabs);
}

const GROUP_COLORS = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'grey'];

// async function groupTabsByDomain() {

async function groupTabsByDomain() {
  const countEl = document.getElementById('tab-count');
  countEl.textContent = 'Grouping tabs...';

  try {
    // Ping to wake up the service worker to avoid race conditions
    try {
      await chrome.runtime.sendMessage({ action: 'ping' });
    } catch (e) {
      console.log('Ping failed (expected if SW was inactive), trying again:', e);
      // Wait a moment for the service worker to fully wake up
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const result = await chrome.runtime.sendMessage({ action: 'groupTabs' });
    console.log('response from background:', result);
    
    if (result && result.error) {
      throw new Error(result.error);
    }
    
    if (!result || result.count === 0) {
      countEl.textContent = 'No domains have 2+ tabs to group.';
    } else {
      countEl.textContent = `✓ Created ${result.count} tab group${result.count > 1 ? 's' : ''}`;
    }
    setTimeout(() => loadTabs(), 1800);
  } catch (e) {
    console.error('sendMessage failed:', e);
    countEl.textContent = 'Error: ' + e.message;
  }
}

function renderTabs(tabs) {
  const list = document.getElementById('tab-list');
  const countEl = document.getElementById('tab-count');
  countEl.textContent = `${tabs.length} tab${tabs.length !== 1 ? 's' : ''} open`;

  list.innerHTML = '';
  tabs.forEach(tab => {
    const item = document.createElement('div');
    item.className = 'tab-item';

    const favicon = tab.favIconUrl
      ? `<img src="${tab.favIconUrl}" onerror="this.style.display='none'" />`
      : '<img style="display:none" />';

    item.innerHTML = `
  <img class="tab-favicon" src="${tab.favIconUrl || ''}" />
  <div class="tab-info">
    <div class="tab-title">${tab.title || 'Untitled'}</div>
    <div class="tab-url">${tab.url || ''}</div>
  </div>
  <span class="close-btn" data-id="${tab.id}" title="Close tab">×</span>
`;

// Wire favicon error handler properly — no inline onerror
const img = item.querySelector('.tab-favicon');
if (!tab.favIconUrl) {
  img.style.display = 'none';
} else {
  img.addEventListener('error', () => { img.style.display = 'none'; });
}

    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('close-btn')) return;
      chrome.tabs.update(tab.id, { active: true });
      chrome.windows.update(tab.windowId, { focused: true });
    });

    item.querySelector('.close-btn').addEventListener('click', async () => {
      await chrome.tabs.remove(tab.id);
      loadTabs();
    });

    list.appendChild(item);
  });
}

// ── Sessions ─────────────────────────────────────────────

async function getSessions() {
  const result = await chrome.storage.local.get('sessions');
  return result.sessions || [];
}

function saveSession() {
  const saveBar = document.getElementById('save-bar');
  const nameInput = document.getElementById('session-name');

  saveBar.style.display = 'flex';
  nameInput.value = '';
  nameInput.style.borderColor = '#ddd';
  nameInput.focus();

  // Clone and replace buttons to remove any previously attached listeners
  const confirmBtn = document.getElementById('confirm-save');
  const cancelBtn = document.getElementById('cancel-save');
  const newConfirm = confirmBtn.cloneNode(true);
  const newCancel = cancelBtn.cloneNode(true);
  confirmBtn.replaceWith(newConfirm);
  cancelBtn.replaceWith(newCancel);

  newConfirm.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) { nameInput.style.borderColor = '#e00'; return; }

    const tabs = await chrome.tabs.query({ currentWindow: true });
    const sessionTabs = tabs.map(t => ({ title: t.title, url: t.url }));
    const sessions = await getSessions();
    sessions.push({
      id: Date.now(),
      name,
      savedAt: new Date().toLocaleString(),
      tabs: sessionTabs
    });
    await chrome.storage.local.set({ sessions });

    saveBar.style.display = 'none';
    const countEl = document.getElementById('tab-count');
    countEl.textContent = `✓ Saved "${name}" with ${sessionTabs.length} tabs`;
    setTimeout(() => loadTabs(), 1800);
  });

  newCancel.addEventListener('click', () => {
    saveBar.style.display = 'none';
  });

  nameInput.onkeydown = (e) => {
    if (e.key === 'Enter') newConfirm.click();
    if (e.key === 'Escape') newCancel.click();
  };
}

async function renderSessions() {
  const list = document.getElementById('tab-list');
  const countEl = document.getElementById('tab-count');
  const sessions = await getSessions();

  countEl.textContent = `${sessions.length} saved session${sessions.length !== 1 ? 's' : ''}`;
  list.innerHTML = '';

  if (sessions.length === 0) {
    list.innerHTML = `<p style="padding: 20px 16px; font-size: 13px; color: #999;">No saved sessions yet.</p>`;
    return;
  }

  sessions.forEach(session => {
    const item = document.createElement('div');
    item.className = 'session-item';
    item.innerHTML = `
      <div class="session-info">
        <div class="session-name">${session.name}</div>
        <div class="session-meta">${session.tabs.length} tabs · ${session.savedAt}</div>
      </div>
      <div class="session-actions">
        <button class="btn btn-primary btn-sm restore-btn">Restore</button>
        <button class="btn btn-sm delete-btn">Delete</button>
      </div>
    `;

    item.querySelector('.restore-btn').addEventListener('click', () => restoreSession(session));
    item.querySelector('.delete-btn').addEventListener('click', () => deleteSession(session.id));

    list.appendChild(item);
  });
}

async function restoreSession(session) {
  for (const tab of session.tabs) {
    await chrome.tabs.create({ url: tab.url, active: false });
  }
  window.close(); // close popup after restoring
}

async function deleteSession(id) {
  const sessions = await getSessions();
  const updated = sessions.filter(s => s.id !== id);
  await chrome.storage.local.set({ sessions: updated });
  renderSessions();
}

// ── Nav ───────────────────────────────────────────────────

function switchView(v) {
  view = v;
  const searchEl = document.getElementById('search');
  const saveBtn = document.getElementById('save-session');
  const sessionsBtn = document.getElementById('view-sessions');

  if (view === 'tabs') {
    searchEl.style.display = 'block';
    saveBtn.textContent = 'Save session';
    sessionsBtn.textContent = 'Saved sessions';
    loadTabs();
  } else {
    searchEl.style.display = 'none';
    saveBtn.textContent = '← Back to tabs';
    sessionsBtn.textContent = '';
    renderSessions();
  }
}

document.getElementById('save-session').addEventListener('click', () => {
  if (view === 'tabs') {
    saveSession();
  } else {
    switchView('tabs');
  }
});

document.getElementById('group-tabs').addEventListener('click', groupTabsByDomain);

document.getElementById('view-sessions').addEventListener('click', () => {
  if (view === 'tabs') switchView('sessions');
});

document.getElementById('search').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  const filtered = allTabs.filter(t =>
    (t.title || '').toLowerCase().includes(q) ||
    (t.url || '').toLowerCase().includes(q)
  );
  renderTabs(filtered);
});

loadTabs();