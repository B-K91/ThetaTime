const trades = [];
const form = document.getElementById('trade-form');
const tableBody = document.querySelector('#trade-table tbody');
const summaryEl = document.getElementById('summary');
const monthlySummaryEl = document.getElementById('monthly-summary');
const lineCanvas = document.getElementById('profit-line');
const barCanvas = document.getElementById('monthly-bar');
const editBtn = document.getElementById('edit-btn');
const saveBtn = document.getElementById('save-btn');
let isEditing = false;
let lineChart;
let barChart;

loadTrades();
ensurePresetTrade();
updateTable();
updateSummary();
drawCharts();
setDefaultFormValues();
editBtn.addEventListener('click', () => {
  isEditing = true;
  editBtn.style.display = 'none';
  saveBtn.style.display = 'inline-block';
  updateTable();
});
saveBtn.addEventListener('click', () => {
  saveEdits();
  isEditing = false;
  saveBtn.style.display = 'none';
  editBtn.style.display = 'inline-block';
  updateTable();
  updateSummary();
  drawCharts();
});
form.addEventListener('submit', e => {
  e.preventDefault();
  const trade = {
    ticker: document.getElementById('ticker').value,
    closeDate: document.getElementById('closeDate').value,
    strike: parseFloat(document.getElementById('strike').value),
    premium: parseFloat(document.getElementById('premium').value),
    buyback: parseFloat(document.getElementById('buyback').value) || 0,
    qty: parseInt(document.getElementById('quantity').value) || 1,
    commissions: parseFloat(document.getElementById('commissions').value) || 0
  };
  addTrade(trade);
  form.reset();
  setDefaultFormValues();
});


function addTrade(t) {
  t.id = Date.now() + Math.random();
  t.qty = t.qty || 1;
  t.commissions = t.commissions || 0;
  const gross = (t.premium - (t.buyback || 0)) * 100 * t.qty;
  t.net = gross - t.commissions;
  const capital = t.strike * 100 * t.qty;
  t.percent = capital ? (t.net / capital) * 100 : 0;
  trades.push(t);
  saveTrades();
  updateTable();
  updateSummary();
  drawCharts();
}

function updateTable() {
  tableBody.innerHTML = '';
  trades.sort((a,b) => new Date(b.closeDate) - new Date(a.closeDate));
  for (const t of trades) {
    const tr = document.createElement('tr');
    tr.className = t.net >= 0 ? 'profit' : 'loss';
    tr.dataset.id = t.id;
    if (isEditing) {
      tr.innerHTML = `
        <td contenteditable data-field="ticker">${t.ticker}</td>
        <td contenteditable data-field="closeDate">${t.closeDate}</td>
        <td contenteditable data-field="strike">${t.strike.toFixed(2)}</td>
        <td contenteditable data-field="premium">${t.premium.toFixed(2)}</td>
        <td contenteditable data-field="buyback">${t.buyback.toFixed(2)}</td>
        <td contenteditable data-field="qty">${t.qty}</td>
        <td contenteditable data-field="commissions">${t.commissions.toFixed(2)}</td>
        <td class="net">$${t.net.toFixed(2)}</td>
        <td>${t.percent.toFixed(1)}%</td>
        <td><button class="delete-btn" data-id="${t.id}" title="Delete">&times;</button></td>
      `;
      tr.querySelector('.delete-btn').addEventListener('click', () => deleteTrade(t.id));
    } else {
      tr.innerHTML = `
        <td>${t.ticker}</td>
        <td>${t.closeDate}</td>
        <td>$${t.strike.toFixed(2)}</td>
        <td>${t.premium.toFixed(2)}</td>
        <td>${t.buyback.toFixed(2)}</td>
        <td>${t.qty}</td>
        <td>$${t.commissions.toFixed(2)}</td>
        <td class="net">$${t.net.toFixed(2)}</td>
        <td>${t.percent.toFixed(1)}%</td>
        <td></td>
      `;
    }
    tableBody.appendChild(tr);
  }
}

function deleteTrade(id) {
  const idx = trades.findIndex(tr => tr.id === id);
  if (idx !== -1) {
    trades.splice(idx, 1);
    saveTrades();
    updateTable();
    updateSummary();
    drawCharts();
  }
}

function saveEdits() {
  const rows = tableBody.querySelectorAll('tr');
  rows.forEach(row => {
    const id = parseFloat(row.dataset.id);
    const trade = trades.find(t => t.id === id);
    if (!trade) return;
    row.querySelectorAll('[data-field]').forEach(cell => {
      const field = cell.dataset.field;
      let val = cell.innerText.trim();
      if (['strike','premium','buyback','commissions'].includes(field)) {
        val = parseFloat(val) || 0;
      } else if (field === 'qty') {
        val = parseInt(val) || 1;
      }
      trade[field] = val;
    });
    const gross = (trade.premium - (trade.buyback || 0)) * 100 * trade.qty;
    trade.net = gross - trade.commissions;
    const cap = trade.strike * 100 * trade.qty;
    trade.percent = cap ? (trade.net / cap) * 100 : 0;
  });
  saveTrades();
}

function updateSummary() {
  if (!trades.length) {
    summaryEl.innerHTML = '';
    monthlySummaryEl.innerHTML = '';
    return;
  }
  const totalProfit = trades.reduce((s, t) => s + t.net, 0);
  const wins = trades.filter(t => t.net > 0).length;
  const winRate = trades.length ? (wins / trades.length) * 100 : 0;

  const cards = [
    { label: 'Total Profit', value: '$' + totalProfit.toFixed(2) },
    { label: 'Win Rate', value: winRate.toFixed(1) + '%' }
  ];
  summaryEl.innerHTML = cards.map(c => `<div class="summary-card"><h3>${c.label}</h3><p>${c.value}</p></div>`).join('');

  const monthly = {};
  for (const t of trades) {
    const m = t.closeDate.slice(0,7); // YYYY-MM
    monthly[m] = (monthly[m] || 0) + t.net;
  }
  const rows = Object.entries(monthly)
    .sort()
    .map(([m,v]) => `<div>${formatMonthYear(m)}: $${v.toFixed(2)}</div>`)
    .join('');
  monthlySummaryEl.innerHTML = rows;
}

function drawCharts() {
  drawLineChart();
  drawBarChart();
}

function drawLineChart() {
  if (lineChart) lineChart.destroy();
  if (!trades.length) return;
  let cum = 0;
  const labels = [];
  const data = trades
    .slice()
    .sort((a, b) => new Date(a.closeDate) - new Date(b.closeDate))
    .map(t => {
      cum += t.net;
      labels.push(t.closeDate);
      return cum;
    });

  lineChart = new Chart(lineCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#2196f3',
        tension: 0.3,
        fill: false
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: true },
        y: { display: true }
      }
    }
  });
}

function drawBarChart() {
  if (barChart) barChart.destroy();
  if (!trades.length) return;
  const monthly = {};
  for (const t of trades) {
    const m = t.closeDate.slice(0, 7);
    monthly[m] = (monthly[m] || 0) + t.net;
  }
  const labels = Object.keys(monthly).sort();
  const data = labels.map(m => monthly[m]);

  barChart = new Chart(barCanvas, {
    type: 'bar',
    data: {
      labels: labels.map(formatMonthYear),
      datasets: [{
        data,
        backgroundColor: data.map(v => v >= 0 ? 'rgba(33,150,243,0.7)' : 'rgba(33,150,243,0.3)')
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: true },
        y: { display: true }
      }
    }
  });
}

function saveTrades() {
  localStorage.setItem('trades', JSON.stringify(trades));
}

function loadTrades() {
  const data = localStorage.getItem('trades');
  if (!data) return;
  try {
    const saved = JSON.parse(data);
    if (Array.isArray(saved)) {
      saved.forEach(t => {
        delete t.strategy;
        t.strike = parseFloat(t.strike);
        t.premium = parseFloat(t.premium);
        t.buyback = parseFloat(t.buyback) || 0;
        t.qty = parseInt(t.qty) || 1;
        t.commissions = parseFloat(t.commissions) || 0;
        const gross = (t.premium - (t.buyback || 0)) * 100 * t.qty;
        t.net = gross - t.commissions;
        const cap = t.strike * 100 * t.qty;
        t.percent = cap ? (t.net / cap) * 100 : 0;
        trades.push(t);
      });
    }
  } catch(err) {
    console.error('Failed to load trades', err);
  }
}

function setDefaultFormValues() {
  document.getElementById('ticker').value = 'GME';
  document.getElementById('closeDate').value = formatDate(new Date());
  document.getElementById('strike').value = '25';
  document.getElementById('premium').value = '0.10';
  document.getElementById('buyback').value = '0.01';
  document.getElementById('quantity').value = '10';
  document.getElementById('commissions').value = '10';
}

function ensurePresetTrade() {
  if (trades.length) return;
  const today = new Date();
  addTrade({
    ticker: 'GME',
    closeDate: formatDate(today),
    strike: 25,
    premium: 0.1,
    buyback: 0.01,
    qty: 10,
    commissions: 10
  });
}

function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMonthYear(key) {
  const [y, m] = key.split('-');
  const date = new Date(y, parseInt(m) - 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}
