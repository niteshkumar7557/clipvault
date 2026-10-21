/**
 * Popup Renderer Script - Milestone 6
 * 
 * Manages:
 * - Tabs: Clipboard History & Reusable Snippets
 * - Live search across both tabs
 * - Snippets CRUD (Create, Read, Update, Delete)
 * - Copying via Left Click or Enter
 * - Settings window launch
 * - Global Esc & keyboard arrow navigation
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const tabHistoryBtn = document.getElementById('tab-history-btn');
  const tabSnippetsBtn = document.getElementById('tab-snippets-btn');
  const historyView = document.getElementById('history-view');
  const snippetsView = document.getElementById('snippets-view');

  const historyEmpty = document.getElementById('history-empty');
  const emptyTitle = document.getElementById('empty-title');
  const emptyDesc = document.getElementById('empty-desc');
  const emptyIcon = document.getElementById('empty-icon');
  const historyList = document.getElementById('history-list');
  const historyCountBadge = document.getElementById('history-count-badge');

  const snippetsEmpty = document.getElementById('snippets-empty');
  const snippetsList = document.getElementById('snippets-list');
  const snippetsCountBadge = document.getElementById('snippets-count-badge');

  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const addSnippetBtn = document.getElementById('add-snippet-btn');
  const emptyAddSnippetBtn = document.getElementById('empty-add-snippet-btn');
  const openSettingsBtn = document.getElementById('open-settings-btn');

  // Modal elements
  const snippetModal = document.getElementById('snippet-modal');
  const modalTitle = document.getElementById('modal-title');
  const snippetTitleInput = document.getElementById('snippet-title-input');
  const snippetTagsInput = document.getElementById('snippet-tags-input');
  const snippetContentInput = document.getElementById('snippet-content-input');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalSaveBtn = document.getElementById('modal-save-btn');

  // State
  let activeTab = 'history'; // 'history' | 'snippets'
  let historyItems = [];
  let snippetItems = [];
  let selectedIndex = 0;
  let currentSearchQuery = '';
  let editingSnippetId = null;

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatTimestamp(timestamp) {
    if (!timestamp) return 'Just now';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  // Active items helper based on current tab
  function getActiveItems() {
    return activeTab === 'history' ? historyItems : snippetItems;
  }

  function updateSelection(newIndex) {
    const items = getActiveItems();
    if (items.length === 0) {
      selectedIndex = -1;
      return;
    }

    if (newIndex < 0) {
      selectedIndex = items.length - 1;
    } else if (newIndex >= items.length) {
      selectedIndex = 0;
    } else {
      selectedIndex = newIndex;
    }

    const currentList = activeTab === 'history' ? historyList : snippetsList;
    const itemElements = currentList.querySelectorAll('.history-item, .snippet-item');
    itemElements.forEach((el, index) => {
      if (index === selectedIndex) {
        el.classList.add('selected');
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        el.classList.remove('selected');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // RENDER HISTORY
  // ---------------------------------------------------------------------------
  function renderHistory(items) {
    historyItems = Array.isArray(items) ? items : [];
    historyCountBadge.textContent = historyItems.length;

    if (activeTab !== 'history') return;

    if (historyItems.length === 0) {
      historyEmpty.style.display = 'block';
      historyList.style.display = 'none';
      historyList.innerHTML = '';
      selectedIndex = -1;

      if (currentSearchQuery.trim() !== '') {
        emptyIcon.textContent = '🔍';
        emptyTitle.textContent = 'No matching clips';
        emptyDesc.textContent = `No history items matched "${escapeHtml(currentSearchQuery)}"`;
      } else {
        emptyIcon.textContent = '✂️';
        emptyTitle.textContent = 'No clipboard history';
        emptyDesc.innerHTML = 'Copy any text with <kbd>⌘C</kbd> to record it here.';
      }
      return;
    }

    historyEmpty.style.display = 'none';
    historyList.style.display = 'flex';

    historyList.innerHTML = historyItems.map((item, index) => {
      const isPinned = item.pinned;
      const isSelected = index === selectedIndex ? 'selected' : '';
      const pinnedClass = isPinned ? 'pinned' : '';

      return `
        <li class="history-item ${pinnedClass} ${isSelected}" data-id="${item.id}" data-index="${index}">
          <div class="item-meta">
            <div class="item-left-meta">
              ${isPinned ? '<span class="pin-indicator">📌</span>' : ''}
              <span class="item-time">${formatTimestamp(item.createdAt)}</span>
            </div>
            <div class="item-tags">
              <span class="type-pill">${item.content.length}c</span>
              <div class="item-actions">
                <button class="quick-action-btn pin-btn" title="${isPinned ? 'Unpin' : 'Pin'}">
                  ${isPinned ? 'Unpin' : '📌'}
                </button>
                <button class="quick-action-btn del-btn" title="Delete">🗑️</button>
              </div>
            </div>
          </div>
          <div class="item-content">${escapeHtml(item.content)}</div>
        </li>
      `;
    }).join('');

    // Attach listeners
    historyList.querySelectorAll('.history-item').forEach((el) => {
      const id = el.getAttribute('data-id');
      const idx = parseInt(el.getAttribute('data-index'), 10);

      el.addEventListener('click', (e) => {
        if (e.target.closest('.quick-action-btn')) return;
        updateSelection(idx);
        window.api.history.copy(id);
      });

      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        updateSelection(idx);
        window.api.history.contextMenu(id);
      });

      el.querySelector('.pin-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        window.api.history.pin(id);
      });

      el.querySelector('.del-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        window.api.history.delete(id);
      });
    });

    if (selectedIndex < 0 || selectedIndex >= historyItems.length) {
      updateSelection(0);
    }
  }

  // ---------------------------------------------------------------------------
  // RENDER SNIPPETS
  // ---------------------------------------------------------------------------
  function renderSnippets(snippets) {
    let list = Array.isArray(snippets) ? snippets : [];

    // Filter snippets by search query if present
    if (currentSearchQuery.trim() !== '') {
      const q = currentSearchQuery.toLowerCase();
      list = list.filter(s => 
        (s.title && s.title.toLowerCase().includes(q)) ||
        (s.content && s.content.toLowerCase().includes(q)) ||
        (s.tags && s.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    snippetItems = list;
    snippetsCountBadge.textContent = (Array.isArray(snippets) ? snippets.length : 0);

    if (activeTab !== 'snippets') return;

    if (snippetItems.length === 0) {
      snippetsEmpty.style.display = 'block';
      snippetsList.style.display = 'none';
      snippetsList.innerHTML = '';
      selectedIndex = -1;
      return;
    }

    snippetsEmpty.style.display = 'none';
    snippetsList.style.display = 'flex';

    snippetsList.innerHTML = snippetItems.map((snippet, index) => {
      const isSelected = index === selectedIndex ? 'selected' : '';
      const tagsHtml = (snippet.tags || []).map(t => `<span class="tag-pill">#${escapeHtml(t)}</span>`).join('');

      return `
        <li class="snippet-item ${isSelected}" data-id="${snippet.id}" data-index="${index}">
          <div class="snippet-header">
            <span class="snippet-title">${escapeHtml(snippet.title)}</span>
            <div class="snippet-tags">${tagsHtml}</div>
          </div>
          <div class="item-content">${escapeHtml(snippet.content)}</div>
          <div class="item-meta">
            <span class="item-time">Snippet</span>
            <div class="item-actions">
              <button class="quick-action-btn edit-snippet-btn" title="Edit Snippet">✏️</button>
              <button class="quick-action-btn del-snippet-btn" title="Delete Snippet">🗑️</button>
            </div>
          </div>
        </li>
      `;
    }).join('');

    // Attach listeners
    snippetsList.querySelectorAll('.snippet-item').forEach((el) => {
      const id = el.getAttribute('data-id');
      const idx = parseInt(el.getAttribute('data-index'), 10);
      const snippet = snippetItems[idx];

      el.addEventListener('click', (e) => {
        if (e.target.closest('.quick-action-btn')) return;
        updateSelection(idx);
        window.api.snippets.copy(id);
      });

      el.querySelector('.edit-snippet-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openSnippetModal(snippet);
      });

      el.querySelector('.del-snippet-btn')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await window.api.snippets.delete(id);
      });
    });

    if (selectedIndex < 0 || selectedIndex >= snippetItems.length) {
      updateSelection(0);
    }
  }

  // ---------------------------------------------------------------------------
  // TAB SWITCHING
  // ---------------------------------------------------------------------------
  function switchTab(tab) {
    activeTab = tab;
    selectedIndex = 0;

    if (tab === 'history') {
      tabHistoryBtn.classList.add('active');
      tabSnippetsBtn.classList.remove('active');
      historyView.style.display = 'flex';
      snippetsView.style.display = 'none';
      searchInput.placeholder = 'Search history...';
      addSnippetBtn.style.display = 'none';
      refreshActiveView();
    } else {
      tabSnippetsBtn.classList.add('active');
      tabHistoryBtn.classList.remove('active');
      snippetsView.style.display = 'flex';
      historyView.style.display = 'none';
      searchInput.placeholder = 'Search snippets by title, tag, content...';
      addSnippetBtn.style.display = 'block';
      refreshActiveView();
    }
  }

  tabHistoryBtn.addEventListener('click', () => switchTab('history'));
  tabSnippetsBtn.addEventListener('click', () => switchTab('snippets'));

  // ---------------------------------------------------------------------------
  // SNIPPET MODAL
  // ---------------------------------------------------------------------------
  function openSnippetModal(snippetToEdit = null) {
    if (snippetToEdit) {
      editingSnippetId = snippetToEdit.id;
      modalTitle.textContent = 'Edit Snippet';
      snippetTitleInput.value = snippetToEdit.title || '';
      snippetTagsInput.value = (snippetToEdit.tags || []).join(', ');
      snippetContentInput.value = snippetToEdit.content || '';
    } else {
      editingSnippetId = null;
      modalTitle.textContent = 'New Snippet';
      snippetTitleInput.value = '';
      snippetTagsInput.value = '';
      snippetContentInput.value = '';
    }
    snippetModal.style.display = 'flex';
    snippetTitleInput.focus();
  }

  function closeSnippetModal() {
    snippetModal.style.display = 'none';
    editingSnippetId = null;
  }

  addSnippetBtn.addEventListener('click', () => openSnippetModal());
  emptyAddSnippetBtn.addEventListener('click', () => openSnippetModal());
  modalCancelBtn.addEventListener('click', closeSnippetModal);

  modalSaveBtn.addEventListener('click', async () => {
    const title = snippetTitleInput.value.trim();
    const content = snippetContentInput.value.trim();
    const tags = snippetTagsInput.value.split(',').map(t => t.trim()).filter(Boolean);

    if (!title || !content) {
      alert('Please provide both a title and content for the snippet.');
      return;
    }

    try {
      if (editingSnippetId) {
        await window.api.snippets.update(editingSnippetId, { title, content, tags });
      } else {
        await window.api.snippets.create({ title, content, tags });
      }
      closeSnippetModal();
      refreshActiveView();
    } catch (err) {
      alert('Error saving snippet: ' + err.message);
    }
  });

  // Settings window button
  openSettingsBtn.addEventListener('click', () => {
    window.api.settings.open();
  });

  // ---------------------------------------------------------------------------
  // DATA REFRESH & SEARCH
  // ---------------------------------------------------------------------------
  async function refreshActiveView() {
    if (activeTab === 'history') {
      if (currentSearchQuery.trim() !== '') {
        const results = await window.api.history.search(currentSearchQuery);
        renderHistory(results);
      } else {
        const all = await window.api.history.get();
        renderHistory(all);
      }
    } else {
      const allSnippets = await window.api.snippets.get();
      renderSnippets(allSnippets);
    }
  }

  // Search input
  searchInput.addEventListener('input', async (e) => {
    currentSearchQuery = e.target.value;
    clearSearchBtn.style.display = currentSearchQuery.length > 0 ? 'flex' : 'none';
    selectedIndex = 0;
    refreshActiveView();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentSearchQuery = '';
    clearSearchBtn.style.display = 'none';
    searchInput.focus();
    selectedIndex = 0;
    refreshActiveView();
  });

  // Real-time IPC listeners
  window.api.onHistoryUpdated((items) => {
    renderHistory(items);
  });

  window.api.onSnippetsUpdated((snippets) => {
    renderSnippets(snippets);
  });

  window.api.onWindowShown?.(() => {
    searchInput.value = '';
    currentSearchQuery = '';
    clearSearchBtn.style.display = 'none';
    closeSnippetModal();
    selectedIndex = 0;
    searchInput.focus();
    refreshActiveView();
  });

  // ---------------------------------------------------------------------------
  // KEYBOARD NAVIGATION
  // ---------------------------------------------------------------------------
  window.addEventListener('keydown', (e) => {
    // If modal open, Esc closes modal
    if (snippetModal.style.display === 'flex') {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSnippetModal();
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      if (currentSearchQuery.length > 0) {
        searchInput.value = '';
        currentSearchQuery = '';
        clearSearchBtn.style.display = 'none';
        selectedIndex = 0;
        refreshActiveView();
      } else {
        window.api.window.hide();
      }
      return;
    }

    const items = getActiveItems();
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      updateSelection(selectedIndex + 1);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      updateSelection(selectedIndex - 1);
      return;
    }

    if (e.key === 'Enter') {
      // Don't copy if user is typing in a form or search input with Enter pressed
      if (e.target === searchInput && items.length > 0 && selectedIndex >= 0) {
        e.preventDefault();
      }
      if (selectedIndex >= 0 && selectedIndex < items.length) {
        const item = items[selectedIndex];
        if (activeTab === 'history') {
          window.api.history.copy(item.id);
        } else {
          window.api.snippets.copy(item.id);
        }
      }
    }
  });

  // Initial load
  const [initialHistory, initialSnippets] = await Promise.all([
    window.api.history.get(),
    window.api.snippets.get()
  ]);
  renderHistory(initialHistory);
  renderSnippets(initialSnippets);
});
