/* ========================================
   Finance Tracker Dashboard - Application
   ======================================== */

(function () {
  'use strict';

  // --- Constants ---
  const STORAGE_KEY = 'fintrack_data';
  const CURRENCY_KEY = 'fintrack_currency';

  const CURRENCIES = {
    USD: { code: 'USD', symbol: '$', locale: 'en-US' },
    EUR: { code: 'EUR', symbol: '\u20AC', locale: 'de-DE' },
    GBP: { code: 'GBP', symbol: '\u00A3', locale: 'en-GB' },
    JPY: { code: 'JPY', symbol: '\u00A5', locale: 'ja-JP' },
    CAD: { code: 'CAD', symbol: '$', locale: 'en-CA' },
    AUD: { code: 'AUD', symbol: '$', locale: 'en-AU' },
    CHF: { code: 'CHF', symbol: 'Fr', locale: 'de-CH' },
    CNY: { code: 'CNY', symbol: '\u00A5', locale: 'zh-CN' },
    INR: { code: 'INR', symbol: '\u20B9', locale: 'en-IN' },
    NGN: { code: 'NGN', symbol: '\u20A6', locale: 'en-NG' },
    BRL: { code: 'BRL', symbol: 'R$', locale: 'pt-BR' },
    KRW: { code: 'KRW', symbol: '\u20A9', locale: 'ko-KR' }
  };

  // Exchange rates relative to USD (1 USD = X of target currency)
  const EXCHANGE_RATES = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 149.50,
    CAD: 1.36,
    AUD: 1.53,
    CHF: 0.88,
    CNY: 7.24,
    INR: 83.12,
    NGN: 1550.00,
    BRL: 4.97,
    KRW: 1325.00
  };

  function getSelectedCurrency() {
    return localStorage.getItem(CURRENCY_KEY) || 'USD';
  }

  function convertFromUSD(amountInUSD) {
    const rate = EXCHANGE_RATES[getSelectedCurrency()] || 1;
    return amountInUSD * rate;
  }

  function convertToUSD(amountInLocal) {
    const rate = EXCHANGE_RATES[getSelectedCurrency()] || 1;
    return amountInLocal / rate;
  }
  const CATEGORY_MAP = {
    food: { label: 'Food & Dining', icon: '🍔', type: 'expense' },
    transport: { label: 'Transportation', icon: '🚗', type: 'expense' },
    housing: { label: 'Housing', icon: '🏠', type: 'expense' },
    utilities: { label: 'Utilities', icon: '💡', type: 'expense' },
    entertainment: { label: 'Entertainment', icon: '🎬', type: 'expense' },
    shopping: { label: 'Shopping', icon: '🛍️', type: 'expense' },
    health: { label: 'Health', icon: '💊', type: 'expense' },
    education: { label: 'Education', icon: '📚', type: 'expense' },
    'other-expense': { label: 'Other', icon: '📦', type: 'expense' },
    salary: { label: 'Salary', icon: '💰', type: 'income' },
    freelance: { label: 'Freelance', icon: '💻', type: 'income' },
    investment: { label: 'Investment', icon: '📈', type: 'income' },
    'other-income': { label: 'Other Income', icon: '💵', type: 'income' }
  };

  const CHART_COLORS = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
  ];

  // --- State ---
  let state = loadState();

  function getDefaultState() {
    return {
      transactions: [],
      budgets: [],
      goals: []
    };
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load state:', e);
    }
    return getDefaultState();
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  }

  // --- Utility Functions ---
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function formatCurrency(amount) {
    const cur = CURRENCIES[getSelectedCurrency()] || CURRENCIES.USD;
    const converted = convertFromUSD(amount);
    return new Intl.NumberFormat(cur.locale, {
      style: 'currency',
      currency: cur.code,
      maximumFractionDigits: cur.code === 'JPY' || cur.code === 'KRW' ? 0 : 2
    }).format(converted);
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getTodayString() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function getCurrentMonth() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function getMonthLabel(monthStr) {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }

  const THEME_KEY = 'fintrack_theme';

  // --- Theme Management ---
  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    renderCharts();
  }

  function isDarkMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  // Apply theme immediately to prevent flash
  applyTheme(getPreferredTheme());

  // --- DOM References ---
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const sidebar = $('#sidebar');
  const menuToggle = $('#menuToggle');
  const sidebarClose = $('#sidebarClose');
  const pageTitle = $('#pageTitle');
  const addTransactionBtn = $('#addTransactionBtn');

  // --- Sidebar & Navigation ---
  let overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('active');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  }

  // --- Currency Selector ---
  $('#currencySelect').value = getSelectedCurrency();
  $('#currencySelect').addEventListener('change', (e) => {
    localStorage.setItem(CURRENCY_KEY, e.target.value);
    renderAll();
  });

  $('#themeToggle').addEventListener('click', toggleTheme);

  // Listen for OS theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(THEME_KEY)) {
      applyTheme(e.matches ? 'dark' : 'light');
      renderCharts();
    }
  });

  menuToggle.addEventListener('click', openSidebar);
  sidebarClose.addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);

  function navigateTo(section) {
    $$('.content-section').forEach(s => s.classList.remove('active'));
    $$('.nav-item').forEach(n => n.classList.remove('active'));

    const el = $(`#section-${section}`);
    const nav = $(`.nav-item[data-section="${section}"]`);
    if (el) el.classList.add('active');
    if (nav) nav.classList.add('active');

    const titles = {
      dashboard: 'Dashboard',
      transactions: 'Transactions',
      budgets: 'Budgets',
      goals: 'Savings Goals',
      saver: 'AI Personal Saver'
    };
    pageTitle.textContent = titles[section] || 'Dashboard';

    addTransactionBtn.style.display = (section === 'dashboard' || section === 'transactions') ? '' : 'none';

    closeSidebar();
    renderCurrentSection(section);
  }

  $$('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.section);
    });
  });

  $$('.view-all').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(link.dataset.section);
    });
  });

  // --- Modal Management ---
  function openModal(id) {
    const modal = $(`#${id}`);
    if (modal) modal.classList.add('active');
  }

  function closeModal(id) {
    const modal = $(`#${id}`);
    if (modal) modal.classList.remove('active');
  }

  $$('.modal-close, [data-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal || btn.closest('.modal-overlay')?.id;
      if (modalId) closeModal(modalId);
    });
  });

  $$('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal.id);
    });
  });

  // --- Transaction CRUD ---
  addTransactionBtn.addEventListener('click', () => {
    resetTransactionForm();
    openModal('transactionModal');
  });

  function resetTransactionForm() {
    $('#transactionId').value = '';
    $('#transactionForm').reset();
    $('#transactionDate').value = getTodayString();
    $('#transactionModalTitle').textContent = 'Add Transaction';
  }

  $('#transactionForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const id = $('#transactionId').value;
    const transaction = {
      id: id || generateId(),
      type: $('#transactionType').value,
      amount: convertToUSD(parseFloat($('#transactionAmount').value)),
      category: $('#transactionCategory').value,
      description: $('#transactionDescription').value.trim(),
      date: $('#transactionDate').value
    };

    if (id) {
      const idx = state.transactions.findIndex(t => t.id === id);
      if (idx !== -1) state.transactions[idx] = transaction;
    } else {
      state.transactions.push(transaction);
    }

    saveState();
    closeModal('transactionModal');
    renderAll();
  });

  function editTransaction(id) {
    const t = state.transactions.find(t => t.id === id);
    if (!t) return;

    $('#transactionId').value = t.id;
    $('#transactionType').value = t.type;
    $('#transactionAmount').value = parseFloat(convertFromUSD(t.amount).toFixed(2));
    $('#transactionCategory').value = t.category;
    $('#transactionDescription').value = t.description;
    $('#transactionDate').value = t.date;
    $('#transactionModalTitle').textContent = 'Edit Transaction';

    openModal('transactionModal');
  }

  function deleteTransaction(id) {
    if (!confirm('Delete this transaction?')) return;
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveState();
    renderAll();
  }

  // --- Budget CRUD ---
  $('#addBudgetBtn').addEventListener('click', () => {
    $('#budgetForm').reset();
    openModal('budgetModal');
  });

  $('#budgetForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const category = $('#budgetCategory').value;
    const amount = convertToUSD(parseFloat($('#budgetAmount').value));
    const existing = state.budgets.findIndex(b => b.category === category);

    if (existing !== -1) {
      state.budgets[existing].amount = amount;
    } else {
      state.budgets.push({ id: generateId(), category, amount });
    }

    saveState();
    closeModal('budgetModal');
    renderAll();
  });

  function deleteBudget(id) {
    if (!confirm('Remove this budget?')) return;
    state.budgets = state.budgets.filter(b => b.id !== id);
    saveState();
    renderAll();
  }

  // --- Goal CRUD ---
  $('#addGoalBtn').addEventListener('click', () => {
    $('#goalForm').reset();
    openModal('goalModal');
  });

  $('#goalForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const goal = {
      id: generateId(),
      name: $('#goalName').value.trim(),
      target: convertToUSD(parseFloat($('#goalTarget').value)),
      current: convertToUSD(parseFloat($('#goalCurrent').value) || 0),
      deadline: $('#goalDeadline').value || null
    };

    state.goals.push(goal);
    saveState();
    closeModal('goalModal');
    renderAll();
  });

  function addToGoal(id) {
    const goal = state.goals.find(g => g.id === id);
    if (!goal) return;

    const cur = CURRENCIES[getSelectedCurrency()] || CURRENCIES.USD;
    const amount = prompt(`Enter amount to add (${cur.symbol}):`);
    if (amount === null) return;
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    goal.current = Math.min(goal.current + convertToUSD(val), goal.target);
    saveState();
    renderAll();
  }

  function deleteGoal(id) {
    if (!confirm('Delete this goal?')) return;
    state.goals = state.goals.filter(g => g.id !== id);
    saveState();
    renderAll();
  }

  // --- Rendering ---
  function renderAll() {
    renderSummaryCards();
    renderRecentTransactions();
    renderAllTransactions();
    renderBudgets();
    renderGoals();
    renderCharts();
    renderSaver();
  }

  function renderCurrentSection(section) {
    renderSummaryCards();
    if (section === 'dashboard') {
      renderRecentTransactions();
      renderCharts();
    } else if (section === 'transactions') {
      renderAllTransactions();
    } else if (section === 'budgets') {
      renderBudgets();
    } else if (section === 'goals') {
      renderGoals();
    } else if (section === 'saver') {
      renderSaver();
    }
  }

  function renderSummaryCards() {
    const currentMonth = getCurrentMonth();
    const monthTransactions = state.transactions.filter(t => t.date.startsWith(currentMonth));

    const totalIncome = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100) : 0;

    $('#totalIncome').textContent = formatCurrency(totalIncome);
    $('#totalExpenses').textContent = formatCurrency(totalExpenses);
    $('#balance').textContent = formatCurrency(balance);
    $('#balance').style.color = balance >= 0 ? '' : 'var(--color-expense)';
    $('#savingsRate').textContent = Math.max(0, savingsRate).toFixed(1) + '%';
  }

  function createTransactionHTML(t, showActions) {
    const cat = CATEGORY_MAP[t.category] || { label: t.category, icon: '📋' };
    const actionsHTML = showActions ? `
      <div class="transaction-actions">
        <button onclick="window._editTransaction('${t.id}')" title="Edit">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="delete-btn" onclick="window._deleteTransaction('${t.id}')" title="Delete">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    ` : '';

    return `
      <div class="transaction-item">
        <div class="transaction-icon cat-${t.category}">${cat.icon}</div>
        <div class="transaction-details">
          <div class="transaction-description">${escapeHTML(t.description)}</div>
          <div class="transaction-meta">${cat.label} &middot; ${formatDate(t.date)}</div>
        </div>
        <div class="transaction-amount ${t.type}">
          ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
        </div>
        ${actionsHTML}
      </div>
    `;
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderRecentTransactions() {
    const container = $('#recentTransactions');
    const sorted = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    const recent = sorted.slice(0, 5);

    if (recent.length === 0) {
      container.innerHTML = '<p class="empty-state">No transactions yet. Add your first transaction to get started.</p>';
      return;
    }

    container.innerHTML = recent.map(t => createTransactionHTML(t, false)).join('');
  }

  function renderAllTransactions() {
    const container = $('#allTransactions');
    const filterType = $('#filterType').value;
    const filterCategory = $('#filterCategory').value;
    const search = $('#searchTransactions').value.toLowerCase().trim();

    let filtered = [...state.transactions];

    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }
    if (filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category === filterCategory);
    }
    if (search) {
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(search) ||
        (CATEGORY_MAP[t.category]?.label || '').toLowerCase().includes(search)
      );
    }

    filtered.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

    if (filtered.length === 0) {
      container.innerHTML = '<p class="empty-state">No transactions found.</p>';
      return;
    }

    container.innerHTML = filtered.map(t => createTransactionHTML(t, true)).join('');
  }

  // Populate category filter
  function populateCategoryFilter() {
    const select = $('#filterCategory');
    select.innerHTML = '<option value="all">All Categories</option>';
    Object.entries(CATEGORY_MAP).forEach(([key, val]) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = val.label;
      select.appendChild(opt);
    });
  }

  $('#filterType').addEventListener('change', renderAllTransactions);
  $('#filterCategory').addEventListener('change', renderAllTransactions);
  $('#searchTransactions').addEventListener('input', renderAllTransactions);

  function renderBudgets() {
    const container = $('#budgetsList');
    if (state.budgets.length === 0) {
      container.innerHTML = '<p class="empty-state">No budgets set. Create a budget to track your spending.</p>';
      return;
    }

    const currentMonth = getCurrentMonth();
    const monthExpenses = state.transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth));

    container.innerHTML = state.budgets.map(budget => {
      const spent = monthExpenses
        .filter(t => t.category === budget.category)
        .reduce((sum, t) => sum + t.amount, 0);

      const percentage = Math.min((spent / budget.amount) * 100, 100);
      const remaining = budget.amount - spent;
      const cat = CATEGORY_MAP[budget.category] || { label: budget.category, icon: '📦' };

      let progressClass = '';
      if (percentage >= 90) progressClass = 'danger';
      else if (percentage >= 70) progressClass = 'warning';

      return `
        <div class="budget-card">
          <div class="budget-header">
            <span class="budget-category">${cat.icon} ${cat.label}</span>
          </div>
          <div class="budget-amounts">
            <strong>${formatCurrency(spent)}</strong> of ${formatCurrency(budget.amount)}
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${progressClass}" style="width: ${percentage}%"></div>
          </div>
          <div class="budget-status">
            ${remaining >= 0
              ? `${formatCurrency(remaining)} remaining`
              : `${formatCurrency(Math.abs(remaining))} over budget`}
          </div>
          <div class="budget-actions">
            <button class="btn btn-sm btn-danger" onclick="window._deleteBudget('${budget.id}')">Remove</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderGoals() {
    const container = $('#goalsList');
    if (state.goals.length === 0) {
      container.innerHTML = '<p class="empty-state">No savings goals yet. Set a goal to start saving.</p>';
      return;
    }

    container.innerHTML = state.goals.map(goal => {
      const percentage = Math.min((goal.current / goal.target) * 100, 100);
      const remaining = goal.target - goal.current;
      const deadlineText = goal.deadline ? `Target: ${formatDate(goal.deadline)}` : '';

      return `
        <div class="goal-card">
          <div class="goal-name">${escapeHTML(goal.name)}</div>
          <div class="goal-amounts">
            <span><strong>${formatCurrency(goal.current)}</strong> saved</span>
            <span>Goal: <strong>${formatCurrency(goal.target)}</strong></span>
          </div>
          <div class="goal-progress-bar">
            <div class="goal-progress-fill" style="width: ${percentage}%"></div>
          </div>
          <div class="goal-footer">
            <span class="goal-percentage">${percentage.toFixed(1)}%</span>
            <span>${remaining > 0 ? formatCurrency(remaining) + ' to go' : 'Goal reached!'}</span>
          </div>
          ${deadlineText ? `<div class="goal-footer" style="margin-top:4px"><span>${deadlineText}</span></div>` : ''}
          <div class="goal-actions">
            <button class="btn btn-sm btn-primary" onclick="window._addToGoal('${goal.id}')">+ Add Funds</button>
            <button class="btn btn-sm btn-danger" onclick="window._deleteGoal('${goal.id}')">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Charts (Canvas-based, no dependencies) ---
  function renderCharts() {
    renderMonthlyChart();
    renderCategoryChart();
  }

  function renderMonthlyChart() {
    const canvas = $('#monthlyChart');
    const ctx = canvas.getContext('2d');

    // Get last 6 months
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
    }

    const incomeData = months.map(m =>
      state.transactions
        .filter(t => t.type === 'income' && t.date.startsWith(m))
        .reduce((sum, t) => sum + t.amount, 0)
    );

    const expenseData = months.map(m =>
      state.transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(m))
        .reduce((sum, t) => sum + t.amount, 0)
    );

    const maxVal = Math.max(...incomeData, ...expenseData, 100);
    const labels = months.map(getMonthLabel);

    drawBarChart(ctx, canvas, labels, [
      { data: incomeData, color: '#10b981', label: 'Income' },
      { data: expenseData, color: '#ef4444', label: 'Expenses' }
    ], maxVal);
  }

  function renderCategoryChart() {
    const canvas = $('#categoryChart');
    const ctx = canvas.getContext('2d');

    const currentMonth = getCurrentMonth();
    const expenses = state.transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth));

    const categoryTotals = {};
    expenses.forEach(t => {
      const label = CATEGORY_MAP[t.category]?.label || t.category;
      categoryTotals[label] = (categoryTotals[label] || 0) + t.amount;
    });

    const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      drawEmptyChart(ctx, canvas, 'No expenses this month');
      return;
    }

    drawDoughnutChart(ctx, canvas, entries.map(e => e[0]), entries.map(e => e[1]), CHART_COLORS);
  }

  // --- Chart Theme Colors ---
  function chartColors() {
    if (isDarkMode()) {
      return {
        grid: '#334155',
        axisLabel: '#94a3b8',
        barLabel: '#94a3b8',
        legendText: '#cbd5e1',
        centerText: '#f1f5f9',
        centerSub: '#94a3b8',
        emptyText: '#94a3b8'
      };
    }
    return {
      grid: '#e2e8f0',
      axisLabel: '#94a3b8',
      barLabel: '#64748b',
      legendText: '#475569',
      centerText: '#1e293b',
      centerSub: '#64748b',
      emptyText: '#94a3b8'
    };
  }

  // --- Canvas Drawing Helpers ---
  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { width: rect.width, height: rect.height };
  }

  function drawBarChart(ctx, canvas, labels, datasets, maxVal) {
    const { width, height } = setupCanvas(canvas);

    const padding = { top: 30, right: 20, bottom: 40, left: 60 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const tc = chartColors();

    // Grid lines
    ctx.strokeStyle = tc.grid;
    ctx.lineWidth = 1;
    ctx.font = '11px -apple-system, sans-serif';
    ctx.fillStyle = tc.axisLabel;
    ctx.textAlign = 'right';

    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartH / gridLines) * i;
      const val = maxVal - (maxVal / gridLines) * i;

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillText(formatCompact(val), padding.left - 8, y + 4);
    }

    // Bars
    const groupWidth = chartW / labels.length;
    const barWidth = Math.min(groupWidth * 0.3, 30);
    const barGap = 4;

    datasets.forEach((dataset, di) => {
      ctx.fillStyle = dataset.color;

      dataset.data.forEach((val, i) => {
        const barH = (val / maxVal) * chartH;
        const x = padding.left + groupWidth * i + (groupWidth - (barWidth * datasets.length + barGap * (datasets.length - 1))) / 2 + di * (barWidth + barGap);
        const y = padding.top + chartH - barH;

        ctx.beginPath();
        roundedRect(ctx, x, y, barWidth, barH, 3);
        ctx.fill();
      });
    });

    // Labels
    ctx.fillStyle = tc.barLabel;
    ctx.textAlign = 'center';
    ctx.font = '11px -apple-system, sans-serif';

    labels.forEach((label, i) => {
      const x = padding.left + groupWidth * i + groupWidth / 2;
      ctx.fillText(label, x, height - padding.bottom + 18);
    });

    // Legend
    ctx.font = '12px -apple-system, sans-serif';
    let legendX = padding.left;
    datasets.forEach(ds => {
      ctx.fillStyle = ds.color;
      ctx.fillRect(legendX, 8, 12, 12);
      ctx.fillStyle = tc.legendText;
      ctx.textAlign = 'left';
      ctx.fillText(ds.label, legendX + 16, 18);
      legendX += ctx.measureText(ds.label).width + 36;
    });
  }

  function drawDoughnutChart(ctx, canvas, labels, data, colors) {
    const { width, height } = setupCanvas(canvas);

    ctx.clearRect(0, 0, width, height);

    const total = data.reduce((a, b) => a + b, 0);
    const centerX = width * 0.4;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    const innerRadius = radius * 0.55;

    let startAngle = -Math.PI / 2;

    data.forEach((val, i) => {
      const sliceAngle = (val / total) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      startAngle = endAngle;
    });

    // Center text
    const tc = chartColors();
    ctx.fillStyle = tc.centerText;
    ctx.font = 'bold 16px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(formatCurrency(total), centerX, centerY - 2);
    ctx.fillStyle = tc.centerSub;
    ctx.font = '11px -apple-system, sans-serif';
    ctx.fillText('Total', centerX, centerY + 14);

    // Legend
    const legendX = width * 0.7;
    const legendStartY = Math.max(20, centerY - (labels.length * 22) / 2);

    ctx.textAlign = 'left';
    labels.forEach((label, i) => {
      const y = legendStartY + i * 22;
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(legendX, y - 5, 10, 10);
      ctx.fillStyle = tc.legendText;
      ctx.font = '11px -apple-system, sans-serif';

      const pct = ((data[i] / total) * 100).toFixed(0);
      const text = label.length > 12 ? label.slice(0, 12) + '...' : label;
      ctx.fillText(`${text} (${pct}%)`, legendX + 15, y + 4);
    });
  }

  function drawEmptyChart(ctx, canvas, message) {
    const { width, height } = setupCanvas(canvas);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = chartColors().emptyText;
    ctx.font = '14px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(message, width / 2, height / 2);
  }

  function roundedRect(ctx, x, y, w, h, r) {
    if (h < r * 2) r = h / 2;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  function formatCompact(num) {
    const sym = (CURRENCIES[getSelectedCurrency()] || CURRENCIES.USD).symbol;
    const converted = convertFromUSD(num);
    if (converted >= 1000000) return sym + (converted / 1000000).toFixed(1) + 'M';
    if (converted >= 1000) return sym + (converted / 1000).toFixed(1) + 'k';
    return sym + converted.toFixed(0);
  }

  // --- Resize Handler ---
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderCharts, 150);
  });

  // --- Expose handlers to window ---
  window._editTransaction = editTransaction;
  window._deleteTransaction = deleteTransaction;
  window._deleteBudget = deleteBudget;
  window._addToGoal = addToGoal;
  window._deleteGoal = deleteGoal;

  // --- AI Personal Saver ---
  function getFinanceSnapshot() {
    const currentMonth = getCurrentMonth();
    const monthTx = state.transactions.filter(t => t.date.startsWith(currentMonth));
    const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expenses;
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

    // Category breakdown
    const catSpend = {};
    monthTx.filter(t => t.type === 'expense').forEach(t => {
      const label = CATEGORY_MAP[t.category]?.label || t.category;
      catSpend[label] = (catSpend[label] || 0) + t.amount;
    });
    const topCategories = Object.entries(catSpend).sort((a, b) => b[1] - a[1]);

    // Previous month comparison
    const now = new Date();
    const pmStr = now.getMonth() === 0
      ? (now.getFullYear() - 1) + '-12'
      : now.getFullYear() + '-' + String(now.getMonth()).padStart(2, '0');
    const prevTx = state.transactions.filter(t => t.date.startsWith(pmStr));
    const prevExpenses = prevTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const prevIncome = prevTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

    // Budget status
    const budgetStatus = state.budgets.map(b => {
      const spent = monthTx.filter(t => t.type === 'expense' && t.category === b.category).reduce((s, t) => s + t.amount, 0);
      return { ...b, spent, pct: b.amount > 0 ? (spent / b.amount) * 100 : 0, label: CATEGORY_MAP[b.category]?.label || b.category };
    });

    return { income, expenses, balance, savingsRate, topCategories, prevExpenses, prevIncome, budgetStatus, monthTx };
  }

  function computeHealthScore(snap) {
    let score = 50;
    // Savings rate bonus (up to 25 pts)
    if (snap.savingsRate >= 20) score += 25;
    else if (snap.savingsRate >= 10) score += 15;
    else if (snap.savingsRate > 0) score += 5;
    else score -= 10;

    // Budget adherence (up to 15 pts)
    if (snap.budgetStatus.length > 0) {
      const avgAdherence = snap.budgetStatus.reduce((s, b) => s + Math.min(b.pct, 100), 0) / snap.budgetStatus.length;
      if (avgAdherence <= 80) score += 15;
      else if (avgAdherence <= 100) score += 5;
      else score -= 5;
    }

    // Month-over-month expense change (up to 10 pts)
    if (snap.prevExpenses > 0) {
      const change = ((snap.expenses - snap.prevExpenses) / snap.prevExpenses) * 100;
      if (change < -5) score += 10;
      else if (change < 5) score += 5;
      else score -= 5;
    }

    // Goals progress
    if (state.goals.length > 0) {
      const avgProgress = state.goals.reduce((s, g) => s + (g.current / g.target), 0) / state.goals.length * 100;
      if (avgProgress >= 50) score += 5;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function generateInsights(snap) {
    const insights = [];

    // Spending trend
    if (snap.prevExpenses > 0) {
      const change = ((snap.expenses - snap.prevExpenses) / snap.prevExpenses) * 100;
      if (change > 10) {
        insights.push({ type: 'warning', icon: '📈', title: 'Spending is up ' + Math.abs(change).toFixed(0) + '%',
          text: `You've spent ${formatCurrency(snap.expenses)} this month vs ${formatCurrency(snap.prevExpenses)} last month. Review your categories below to identify where the increase is coming from.`, tag: 'caution' });
      } else if (change < -5) {
        insights.push({ type: 'success', icon: '📉', title: 'Spending down ' + Math.abs(change).toFixed(0) + '%',
          text: `Great job! You've reduced spending to ${formatCurrency(snap.expenses)} from ${formatCurrency(snap.prevExpenses)} last month. Keep it up!`, tag: 'save' });
      }
    }

    // Top expense category alert
    if (snap.topCategories.length > 0) {
      const [topCat, topAmt] = snap.topCategories[0];
      const pct = snap.expenses > 0 ? ((topAmt / snap.expenses) * 100).toFixed(0) : 0;
      insights.push({ type: 'tip', icon: '🏷️', title: `${topCat} is your #1 expense`,
        text: `${formatCurrency(topAmt)} (${pct}% of all spending). ${topAmt > snap.income * 0.3 ? 'This is over 30% of your income — consider ways to reduce it.' : 'This looks manageable relative to your income.'}`, tag: 'info' });
    }

    // Budget warnings
    snap.budgetStatus.forEach(b => {
      if (b.pct >= 100) {
        insights.push({ type: 'alert', icon: '🚨', title: `${b.label} budget exceeded`,
          text: `You've spent ${formatCurrency(b.spent)} against a ${formatCurrency(b.amount)} budget. You're ${formatCurrency(b.spent - b.amount)} over — try to avoid more spending in this category.`, tag: 'caution' });
      } else if (b.pct >= 80) {
        insights.push({ type: 'warning', icon: '⚠️', title: `${b.label} budget at ${b.pct.toFixed(0)}%`,
          text: `${formatCurrency(b.amount - b.spent)} remaining. Pace yourself for the rest of the month.`, tag: 'caution' });
      }
    });

    // Savings rate insight
    if (snap.income > 0) {
      if (snap.savingsRate < 10) {
        insights.push({ type: 'alert', icon: '💡', title: 'Low savings rate: ' + snap.savingsRate.toFixed(1) + '%',
          text: 'Financial experts recommend saving at least 20% of income. Look for non-essential expenses to cut back on.', tag: 'caution' });
      } else if (snap.savingsRate >= 20) {
        insights.push({ type: 'success', icon: '🎯', title: 'Excellent savings rate: ' + snap.savingsRate.toFixed(1) + '%',
          text: 'You\'re saving above the recommended 20% — you\'re on track for your financial goals!', tag: 'save' });
      }
    }

    // Goal insights
    state.goals.forEach(goal => {
      const pct = (goal.current / goal.target) * 100;
      if (goal.deadline) {
        const daysLeft = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
        const remaining = goal.target - goal.current;
        if (daysLeft > 0 && remaining > 0) {
          const monthsLeft = Math.max(1, daysLeft / 30);
          const perMonth = remaining / monthsLeft;
          insights.push({ type: 'tip', icon: '🎯', title: `"${goal.name}" needs ${formatCurrency(perMonth)}/mo`,
            text: `${daysLeft} days left to save ${formatCurrency(remaining)}. ${perMonth <= snap.balance ? 'This is achievable with your current surplus!' : 'You may need to cut expenses to hit this target.'}`, tag: 'info' });
        } else if (daysLeft <= 0 && remaining > 0) {
          insights.push({ type: 'alert', icon: '⏰', title: `"${goal.name}" deadline passed`,
            text: `You still need ${formatCurrency(remaining)} to reach your goal. Consider setting a new deadline.`, tag: 'caution' });
        }
      }
      if (pct >= 100) {
        insights.push({ type: 'success', icon: '🎉', title: `"${goal.name}" reached!`,
          text: `Congratulations! You've saved ${formatCurrency(goal.current)} and hit your target.`, tag: 'save' });
      }
    });

    // Potential savings
    if (snap.topCategories.length >= 2) {
      const discretionary = snap.topCategories
        .filter(([cat]) => !['Housing', 'Utilities'].includes(cat))
        .reduce((s, [, amt]) => s + amt, 0);
      const potential = discretionary * 0.15;
      if (potential > 0) {
        insights.push({ type: 'tip', icon: '💰', title: `Save up to ${formatCurrency(potential)}/month`,
          text: 'By reducing discretionary spending (excluding housing & utilities) by 15%, you could save this much extra every month.', tag: 'save' });
      }
    }

    if (insights.length === 0) {
      insights.push({ type: 'tip', icon: '📊', title: 'Add more data for insights',
        text: 'Keep tracking your income and expenses — the AI Saver will provide personalized tips once it has more data to work with.', tag: 'info' });
    }

    return insights;
  }

  function renderSaver() {
    const snap = getFinanceSnapshot();
    const score = computeHealthScore(snap);

    // Health score arc
    const arc = document.getElementById('healthScoreArc');
    const scoreText = document.getElementById('healthScoreText');
    const verdict = document.getElementById('healthVerdict');
    if (arc) {
      const circumference = 2 * Math.PI * 42;
      const dashLen = (score / 100) * circumference;
      arc.setAttribute('stroke-dasharray', `${dashLen} ${circumference}`);
      arc.setAttribute('stroke', score >= 70 ? 'var(--color-income)' : score >= 40 ? 'var(--color-savings)' : 'var(--color-expense)');
    }
    if (scoreText) scoreText.textContent = score;
    if (verdict) {
      if (score >= 80) verdict.textContent = 'Excellent — keep it up!';
      else if (score >= 60) verdict.textContent = 'Good — room for improvement';
      else if (score >= 40) verdict.textContent = 'Fair — review the tips below';
      else verdict.textContent = 'Needs attention — check insights';
    }

    // Savings potential
    const discretionary = snap.topCategories
      .filter(([cat]) => !['Housing', 'Utilities'].includes(cat))
      .reduce((s, [, amt]) => s + amt, 0);
    const potential = discretionary * 0.15;
    const potentialEl = document.getElementById('savingsPotential');
    if (potentialEl) potentialEl.textContent = formatCurrency(potential);

    // Insights
    const insights = generateInsights(snap);
    const container = document.getElementById('saverInsights');
    if (container) {
      container.innerHTML = insights.map(i => `
        <div class="insight-card">
          <div class="insight-icon ${i.type}">${i.icon}</div>
          <div class="insight-body">
            <div class="insight-title">${i.title}</div>
            <div class="insight-text">${i.text}</div>
            <span class="insight-tag tag-${i.tag}">${i.tag === 'save' ? 'Savings Tip' : i.tag === 'caution' ? 'Caution' : 'Info'}</span>
          </div>
        </div>
      `).join('');
    }
  }

  const refreshSaverBtn = document.getElementById('refreshSaverBtn');
  if (refreshSaverBtn) {
    refreshSaverBtn.addEventListener('click', renderSaver);
  }

  // --- AI Chatbot ---
  const chatFab = document.getElementById('chatbotFab');
  const chatPanel = document.getElementById('chatbotPanel');
  const chatMessages = document.getElementById('chatbotMessages');
  const chatForm = document.getElementById('chatbotForm');
  const chatInput = document.getElementById('chatbotInput');
  const chatClear = document.getElementById('chatbotClear');

  if (chatFab) {
    chatFab.addEventListener('click', () => {
      const isOpen = chatPanel.classList.toggle('active');
      chatFab.classList.toggle('active', isOpen);
      if (isOpen && chatMessages.children.length === 0) {
        addBotMessage('Hi! I\'m your FinTrack AI assistant. Ask me about your spending, budgets, goals, or savings tips.');
      }
      if (isOpen) chatInput.focus();
    });
  }

  if (chatClear) {
    chatClear.addEventListener('click', () => {
      chatMessages.innerHTML = '';
      addBotMessage('Chat cleared. How can I help you?');
    });
  }

  $$('.chatbot-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.dataset.q;
      if (q) handleChatQuery(q);
    });
  });

  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = chatInput.value.trim();
      if (!q) return;
      chatInput.value = '';
      handleChatQuery(q);
    });
  }

  function addBotMessage(text) {
    const div = document.createElement('div');
    div.className = 'chat-msg bot';
    div.innerHTML = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'chat-msg user';
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'chat-typing';
    div.id = 'chatTyping';
    div.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function removeTyping() {
    const el = document.getElementById('chatTyping');
    if (el) el.remove();
  }

  function handleChatQuery(query) {
    addUserMessage(query);
    showTyping();

    setTimeout(() => {
      removeTyping();
      const response = generateChatResponse(query);
      addBotMessage(response);
    }, 500 + Math.random() * 500);
  }

  function generateChatResponse(query) {
    const q = query.toLowerCase();
    const snap = getFinanceSnapshot();

    // Monthly summary
    if (q.includes('month') && (q.includes('summary') || q.includes('doing') || q.includes('overview') || q.includes('how'))) {
      return `Here's your monthly snapshot:<br><br>` +
        `<strong>Income:</strong> ${formatCurrency(snap.income)}<br>` +
        `<strong>Expenses:</strong> ${formatCurrency(snap.expenses)}<br>` +
        `<strong>Balance:</strong> ${formatCurrency(snap.balance)}<br>` +
        `<strong>Savings rate:</strong> ${snap.savingsRate.toFixed(1)}%<br><br>` +
        (snap.savingsRate >= 20 ? 'You\'re doing great this month!' : snap.savingsRate > 0 ? 'Try to push your savings rate toward 20%.' : 'You\'re spending more than you earn — time to review expenses.');
    }

    // Top spending / categories
    if (q.includes('spend') || q.includes('category') || q.includes('top') || q.includes('most') || q.includes('where')) {
      if (snap.topCategories.length === 0) return 'No expenses recorded this month yet.';
      const lines = snap.topCategories.slice(0, 5).map(([cat, amt], i) => {
        const pct = ((amt / snap.expenses) * 100).toFixed(0);
        return `${i + 1}. <strong>${cat}</strong> — ${formatCurrency(amt)} (${pct}%)`;
      });
      return 'Your top spending categories this month:<br><br>' + lines.join('<br>');
    }

    // Saving tips
    if (q.includes('save') || q.includes('saving') || q.includes('tip') || q.includes('cut') || q.includes('reduce')) {
      const tips = [];
      snap.topCategories.forEach(([cat, amt]) => {
        if (!['Housing', 'Utilities'].includes(cat) && amt > snap.expenses * 0.15) {
          tips.push(`<strong>${cat}</strong> (${formatCurrency(amt)}) is a big chunk — could you trim 10-15%?`);
        }
      });
      snap.budgetStatus.forEach(b => {
        if (b.pct > 100) tips.push(`You're over your <strong>${b.label}</strong> budget by ${formatCurrency(b.spent - b.amount)}.`);
      });
      if (tips.length === 0) tips.push('Your spending looks balanced! Keep an emergency fund of 3-6 months of expenses.');
      tips.push('Consider the 50/30/20 rule: 50% needs, 30% wants, 20% savings.');
      return 'Here are some personalized tips:<br><br>' + tips.map(t => '• ' + t).join('<br>');
    }

    // Goals
    if (q.includes('goal') || q.includes('target') || q.includes('progress')) {
      if (state.goals.length === 0) return 'You don\'t have any savings goals yet. Set one up in the Goals section!';
      const lines = state.goals.map(g => {
        const pct = ((g.current / g.target) * 100).toFixed(1);
        const remaining = g.target - g.current;
        return `<strong>${g.name}</strong>: ${formatCurrency(g.current)} / ${formatCurrency(g.target)} (${pct}%)` + (remaining > 0 ? ` — ${formatCurrency(remaining)} to go` : ' — Reached!');
      });
      return 'Your savings goals:<br><br>' + lines.join('<br><br>');
    }

    // Budget
    if (q.includes('budget')) {
      if (state.budgets.length === 0) return 'No budgets set up yet. Head to the Budgets section to create one!';
      const lines = snap.budgetStatus.map(b => {
        const status = b.pct >= 100 ? '🔴 Over' : b.pct >= 80 ? '🟡 ' + b.pct.toFixed(0) + '%' : '🟢 ' + b.pct.toFixed(0) + '%';
        return `${status} <strong>${b.label}</strong>: ${formatCurrency(b.spent)} / ${formatCurrency(b.amount)}`;
      });
      return 'Budget status this month:<br><br>' + lines.join('<br>');
    }

    // Income
    if (q.includes('income') || q.includes('earn') || q.includes('salary')) {
      return `Your total income this month is <strong>${formatCurrency(snap.income)}</strong>.` +
        (snap.prevIncome > 0 ? `<br>Last month it was ${formatCurrency(snap.prevIncome)}.` : '');
    }

    // Balance
    if (q.includes('balance') || q.includes('left') || q.includes('remain')) {
      return `Your current monthly balance is <strong>${formatCurrency(snap.balance)}</strong> (income minus expenses).` +
        (snap.balance < 0 ? '<br>You\'re in the red — try to reduce spending!' : '<br>You\'re in the positive — nice work!');
    }

    // Health score
    if (q.includes('score') || q.includes('health') || q.includes('rate')) {
      const score = computeHealthScore(snap);
      return `Your financial health score is <strong>${score}/100</strong>.<br><br>` +
        `Savings rate: ${snap.savingsRate.toFixed(1)}%<br>` +
        (score >= 70 ? 'You\'re in great shape!' : score >= 40 ? 'There\'s room for improvement — check the AI Saver section for tips.' : 'This needs attention — review your spending and budgets.');
    }

    // Hello / greeting
    if (q.includes('hello') || q.includes('hi') || q.includes('hey') || q.includes('help')) {
      return 'Hi there! I can help you with:<br><br>' +
        '• <strong>Monthly summary</strong> — your income & expenses<br>' +
        '• <strong>Top spending</strong> — where your money goes<br>' +
        '• <strong>Saving tips</strong> — personalized advice<br>' +
        '• <strong>Goal progress</strong> — how close you are<br>' +
        '• <strong>Budget status</strong> — are you on track?<br><br>' +
        'Just ask a question or tap a suggestion below!';
    }

    // Fallback
    return 'I can help with questions about your <strong>spending</strong>, <strong>income</strong>, <strong>budgets</strong>, <strong>goals</strong>, and <strong>savings tips</strong>. Try asking "How am I doing this month?" or "Where am I spending the most?"';
  }

  // --- Initialize ---
  function init() {
    populateCategoryFilter();
    $('#transactionDate').value = getTodayString();

    // Add demo data if empty
    if (state.transactions.length === 0) {
      seedDemoData();
    }

    renderAll();
  }

  function seedDemoData() {
    const now = new Date();
    const cm = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const pm = now.getMonth() === 0
      ? (now.getFullYear() - 1) + '-12'
      : now.getFullYear() + '-' + String(now.getMonth()).padStart(2, '0');

    state.transactions = [
      { id: generateId(), type: 'income', amount: 5200, category: 'salary', description: 'Monthly salary', date: `${cm}-01` },
      { id: generateId(), type: 'income', amount: 800, category: 'freelance', description: 'Freelance project', date: `${cm}-05` },
      { id: generateId(), type: 'expense', amount: 1200, category: 'housing', description: 'Rent payment', date: `${cm}-01` },
      { id: generateId(), type: 'expense', amount: 350, category: 'food', description: 'Grocery shopping', date: `${cm}-03` },
      { id: generateId(), type: 'expense', amount: 120, category: 'utilities', description: 'Electric bill', date: `${cm}-05` },
      { id: generateId(), type: 'expense', amount: 85, category: 'transport', description: 'Gas & parking', date: `${cm}-07` },
      { id: generateId(), type: 'expense', amount: 50, category: 'entertainment', description: 'Movie tickets', date: `${cm}-10` },
      { id: generateId(), type: 'expense', amount: 200, category: 'shopping', description: 'New shoes', date: `${cm}-12` },
      { id: generateId(), type: 'expense', amount: 75, category: 'health', description: 'Pharmacy', date: `${cm}-14` },
      { id: generateId(), type: 'income', amount: 5200, category: 'salary', description: 'Monthly salary', date: `${pm}-01` },
      { id: generateId(), type: 'expense', amount: 1200, category: 'housing', description: 'Rent payment', date: `${pm}-01` },
      { id: generateId(), type: 'expense', amount: 420, category: 'food', description: 'Groceries & dining', date: `${pm}-08` },
      { id: generateId(), type: 'expense', amount: 150, category: 'utilities', description: 'Utilities', date: `${pm}-06` },
      { id: generateId(), type: 'expense', amount: 300, category: 'shopping', description: 'Holiday gifts', date: `${pm}-15` },
      { id: generateId(), type: 'expense', amount: 65, category: 'entertainment', description: 'Concert tickets', date: `${pm}-20` }
    ];

    state.budgets = [
      { id: generateId(), category: 'food', amount: 500 },
      { id: generateId(), category: 'housing', amount: 1300 },
      { id: generateId(), category: 'entertainment', amount: 100 },
      { id: generateId(), category: 'shopping', amount: 250 }
    ];

    state.goals = [
      { id: generateId(), name: 'Emergency Fund', target: 10000, current: 4500, deadline: '2026-12-31' },
      { id: generateId(), name: 'Vacation Fund', target: 3000, current: 1200, deadline: '2026-06-30' },
      { id: generateId(), name: 'New Laptop', target: 2000, current: 850, deadline: null }
    ];

    saveState();
  }

  init();
})();
