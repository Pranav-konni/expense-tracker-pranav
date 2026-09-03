// data layer

let transactions = [];
let editingId = null;
let chartInstance = null;

const STORAGE_KEY = "expense_tracker_data";

function loadData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) transactions = JSON.parse(data);
    else transactions = [];
  } catch {
    transactions = [];
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function genereateId() {
  return Date.now() + "_" + Math.random().toString(36).slice(2, 7);
}

// DOM REFS

const descInput = document.getElementById("descInput");
const amountInput = document.getElementById("amountInput");
const categorySelect = document.getElementById("categorySelect");
const addBtn = document.getElementById("addBtn");
const expensesList = document.getElementById("expensesList");
const filterCategory = document.getElementById("filterCategory");
const filterType = document.getElementById("filterType");
const totalBalance = document.getElementById("totalBalance");
const totalIncome = document.getElementById("totalIncome");
const totalExpense = document.getElementById("totalExpenses");
const transactionCount = document.getElementById("transactionCount");
const clearAllBtn = document.getElementById("clearAllBtn");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");

// Render

function renderAll() {
  renderStats();
  renderList();
  renderChart();
}

function renderStats() {
  const total = transactions.reduce((sum, t) => {
    return t.type === "income" ? sum + t.amount : sum - t.amount;
  }, 0);

  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  totalBalance.textContent = `₹${total.toFixed(2)}`;
  totalIncome.textContent = `₹${income.toFixed(2)}`;
  totalExpense.textContent = `₹${expense.toFixed(2)}`;

  if (transactionCount) {
    transactionCount.textContent = transactions.length;
  }
}

function getFilteredTransactions() {
  const cat = filterCategory ? filterCategory.value : "all";
  const type = filterType ? filterType.value : "all";

  return transactions.filter((t) => {
    if (cat !== "all" && t.category !== cat) return false;
    if (type !== "all" && t.type !== type) return false;
    return true;
  });
}

function renderList() {
  if (!expensesList) return;

  const filtered = getFilteredTransactions();

  if (filtered.length === 0) {
    expensesList.innerHTML = `<div class="no-expenses">No Transactions Match Your filters</div>`;
    return;
  }

  // sort by data descending

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  let html = "";

  sorted.forEach((t) => {
    const isIncome = t.type === "income";
    const amountClass = isIncome ? "income-amount" : "";
    const sign = isIncome ? "+" : "-";

    html += `
    <div class="expense-item" data-id="${t.id}">
      <div class="expense-info">
        <div class="expense-details">
          <div class="expense-title">${t.description}</div>
        </div>

        <div class="expense-meta">
          <span class="category-badge">${t.category}</span>
          <span>${formatDate(t.date)}</span>
          <span style="text-transform:capitalize;">${t.type}</span>
        </div>
      </div>

      <div class="expense-amount ${amountClass}">
        ${sign}₹${t.amount.toFixed(2)}
      </div>

      <div class="expense-actions">
        <button class="edit-btn" data-id="${t.id}">
          <i class="fas fa-pen"></i>
        </button>

        <button class="delete-btn" data-id="${t.id}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
    `;
  });

  expensesList.innerHTML = html;

  // event listner for edit and delete

  expensesList.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();

      const id = btn.dataset.id;

      if (confirm("Delete this transactions?")) {
        transactions = transactions.filter((t) => t.id !== id);

        saveData();

        if (editingId === id) {
          editingId = null;
        }

        renderAll();
      }
    });
  });

  expensesList.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();

      const id = btn.dataset.id;

      const t = transactions.find((tr) => tr.id === id);

      if (t) {
        editingId = id;

        descInput.value = t.description;
        amountInput.value = t.amount;
        categorySelect.value = t.category;

        //  set radio

        const typeRadio = document.querySelector(
          `input[name="type"][value="${t.type}"]`,
        );

        if (typeRadio) {
          typeRadio.checked = true;
        }

        addBtn.innerHTML = '<i class="fas fa-save"></i>Update';

        addBtn.style.background = "var(--warning)";

        // scroll to form

        document
          .querySelector(".add-form")
          ?.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// chart

function renderChart() {
  const chartCanvas = document.getElementById("categoryChart");

  if (!chartCanvas || typeof Chart === "undefined") {
    return;
  }

  const ctx = chartCanvas.getContext("2d");

  // expenses by category

  const expenses = transactions.filter((t) => t.type === "expense");

  const categoryMap = {};

  expenses.forEach((t) => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
  });

  const labels = Object.keys(categoryMap);

  const data = Object.values(categoryMap);

  const colors = [
    "#6366f1",
    "#10b981",
    "#ef4444",
    "#8b5cf6",
    "#f58e0b",
    "#ec4899",
    "#14b8a6",
    "#f97316",
    "#6b7280",
  ];

  if (chartInstance) {
    chartInstance.destroy();
  }

  if (labels.length === 0) {
    chartInstance = new Chart(ctx, {
      type: "doughnut",

      data: {
        labels: ["No Data"],

        datasets: [
          {
            data: [1],
            backgroundColor: ["#e5e7eb"],
          },
        ],
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,

        plugins: {
          legend: {
            display: false,
          },
        },

        cutout: "70%",
      },
    });

    return;
  }

  chartInstance = new Chart(ctx, {
    type: "doughnut",

    data: {
      labels: labels,

      datasets: [
        {
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 0,
        },
      ],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          position: "bottom",

          labels: {
            boxWidth: 12,
            font: {
              size: 11,
            },
            padding: 12,

            color:
              getComputedStyle(document.documentElement)
                .getPropertyValue("--text")
                .trim() || "#1a1a2e",
          },
        },
      },

      cutout: "65%",
    },
  });
}

// Add / Update

function handleAdd() {
  const desc = descInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categorySelect.value;

  const selectedType = document.querySelector('input[name="type"]:checked');

  const type = selectedType ? selectedType.value : "expense";

  if (!desc) {
    alert("Please enter a description.");
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    alert("Please enter a valid amount.");
    return;
  }

  if (!category) {
    alert("Please select a category.");
    return;
  }

  if (editingId) {
    const idx = transactions.findIndex((t) => t.id === editingId);

    if (idx !== -1) {
      transactions[idx].description = desc;
      transactions[idx].amount = amount;
      transactions[idx].category = category;
      transactions[idx].type = type;
      transactions[idx].updated = new Date().toISOString();
    }

    editingId = null;

    addBtn.innerHTML = '<i class="fas fa-plus"></i>Add';

    addBtn.style.background = "";
  } else {
    const newT = {
      id: genereateId(),
      description: desc,
      amount: amount,
      category: category,
      type: type,
      date: new Date().toISOString(),
      created: new Date().toISOString(),
    };

    transactions.push(newT);
  }

  saveData();
  clearForm();
  renderAll();
}

function clearForm() {
  descInput.value = "";
  amountInput.value = "";

  categorySelect.value = categorySelect.querySelector('option[value="Food"]')
    ? "Food"
    : "";

  const expenseRadio = document.querySelector(
    'input[name="type"][value="expense"]',
  );

  if (expenseRadio) {
    expenseRadio.checked = true;
  }

  editingId = null;

  addBtn.innerHTML = '<i class="fas fa-plus"></i>Add';

  addBtn.style.background = "";
}

// clear

function clearAll() {
  if (transactions.length === 0) return;

  if (confirm("Delete all transactions ? This cannot be undone.")) {
    transactions = [];

    saveData();
    renderAll();
  }
}

// theme

let darkMode = false;

themeToggle.addEventListener("click", () => {
  darkMode = !darkMode;

  document.documentElement.setAttribute(
    "data-theme",
    darkMode ? "dark" : "light",
  );

  themeIcon.className = darkMode ? "fas fa-sun" : "fas fa-moon";

  renderChart();
});

// Event Listner

addBtn.addEventListener("click", handleAdd);

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.closest(".add-form")) {
    handleAdd();
  }
});

clearAllBtn.addEventListener("click", clearAll);

if (filterCategory) {
  filterCategory.addEventListener("change", renderList);
}

if (filterType) {
  filterType.addEventListener("change", renderList);
}

// Init

loadData();
renderAll();

//  set default category on load

if (categorySelect.querySelector('option[value="Food"]')) {
  categorySelect.value = "Food";
}

console.log(
  "Expense Tracker Loaded. Data:",
  transactions.length,
  "transactions",
);
