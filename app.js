const trades = [];
const form = document.getElementById('trade-form');
const tableBody = document.querySelector('#trade-table tbody');
const summaryEl = document.getElementById('summary');
const monthlySummaryEl = document.getElementById('monthly-summary');
const lineCanvas = document.getElementById('profit-line');
const barCanvas = document.getElementById('monthly-bar');
let lineChart;
let barChart;

loadTrades();
updateTable();
updateSummary();
drawCharts();
setDefaultFormValues();
form.addEventListener('submit', e => {
  e.preventDefault();
  const trade = {
    ticker: document.getElementById('ticker').value,
    strategy: document.getElementById('strategy').value,
    openDate: document.getElementById('openDate').value,
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
    tr.innerHTML = `
      <td>${t.ticker}</td>
      <td>${t.strategy}</td>
      <td>${t.openDate}</td>
      <td>${t.closeDate}</td>
      <td>$${t.strike.toFixed(2)}</td>
      <td>${t.premium.toFixed(2)}</td>
      <td>${t.buyback.toFixed(2)}</td>
      <td>${t.qty}</td>
      <td>$${t.commissions.toFixed(2)}</td>
      <td>$${t.net.toFixed(2)}</td>
      <td><button class="delete-btn" data-id="${t.id}" title="Delete">&times;</button></td>
    `;
    tr.querySelector('.delete-btn').addEventListener('click', () => deleteTrade(t.id));
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

function updateSummary() {
  if (!trades.length) {
    summaryEl.innerHTML = '';
    monthlySummaryEl.innerHTML = '';
    return;
  }
  const totalProfit = trades.reduce((s,t) => s + t.net, 0);
  const avgPremium = trades.reduce((s,t) => s + t.premium, 0) / trades.length;
  const durations = trades.map(t => (new Date(t.closeDate) - new Date(t.openDate))/86400000);
  const avgDuration = durations.reduce((a,b)=>a+b,0)/durations.length;
  const wins = trades.filter(t => t.net > 0).length;
  const winRate = wins / trades.length * 100;
  const cards = [
    {label:'Total Profit', value: '$' + totalProfit.toFixed(2)},
    {label:'Avg Premium', value: avgPremium.toFixed(2)},
    {label:'Trades', value: trades.length},
    {label:'Avg Duration', value: avgDuration.toFixed(1) + 'd'},
    {label:'Win Rate', value: winRate.toFixed(1) + '%'}
  ];
  summaryEl.innerHTML = cards.map(c => `<div class="summary-card"><h3>${c.label}</h3><p>${c.value}</p></div>`).join('');

  const monthly = {};
  for (const t of trades) {
    const m = t.closeDate.slice(0,7); // YYYY-MM
    monthly[m] = (monthly[m] || 0) + t.net;
  }
  const rows = Object.entries(monthly).sort().map(([m,v])=>`<div>${m}: $${v.toFixed(2)}</div>`).join('');
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
        borderColor: '#00c853',
        tension: 0.3,
        fill: false
      }]
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => '$' + ctx.parsed.y.toFixed(2)
          }
        },
        legend: {
          display: false
        }
      },
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
      labels,
      datasets: [{
        data,
        backgroundColor: data.map(v => v >= 0 ? 'rgba(0,200,83,0.7)' : 'rgba(239,68,68,0.7)')
      }]
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => '$' + ctx.parsed.y.toFixed(2)
          }
        },
        legend: {
          display: false
        }
      },
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
        t.strike = parseFloat(t.strike);
        t.premium = parseFloat(t.premium);
        t.buyback = parseFloat(t.buyback) || 0;
        t.qty = parseInt(t.qty) || 1;
        t.commissions = parseFloat(t.commissions) || 0;
        const gross = (t.premium - (t.buyback || 0)) * 100 * t.qty;
        t.net = gross - t.commissions;
        trades.push(t);
      });
    }
  } catch(err) {
    console.error('Failed to load trades', err);
  }
}

function setDefaultFormValues() {
  document.getElementById('buyback').value = '0.01';
  document.getElementById('quantity').value = '1';
  document.getElementById('commissions').value = '0';
}
