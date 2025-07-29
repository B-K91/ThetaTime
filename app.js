const trades = [];
const form = document.getElementById('trade-form');
const tableBody = document.querySelector('#trade-table tbody');
const summaryEl = document.getElementById('summary');
const monthlySummaryEl = document.getElementById('monthly-summary');
const csvInput = document.getElementById('csvFile');
const lineCanvas = document.getElementById('profit-line');
const barCanvas = document.getElementById('monthly-bar');

// Set preset default values for the trade form inputs
function setDefaultFormValues() {
  document.getElementById('ticker').value = 'GME';
  document.getElementById('strategy').value = 'Covered Call';

  const formatDate = d => d.toISOString().slice(0, 10);

  const today = new Date();
  const day = today.getDay();

  const mondayThisWeek = new Date(today);
  mondayThisWeek.setDate(today.getDate() - ((day + 6) % 7));

  const lastMonday = new Date(mondayThisWeek);
  lastMonday.setDate(mondayThisWeek.getDate() - 7);

  const lastFriday = new Date(lastMonday);
  lastFriday.setDate(lastMonday.getDate() + 4);

  document.getElementById('openDate').value = formatDate(lastMonday);
  document.getElementById('closeDate').value = formatDate(lastFriday);

  document.getElementById('strike').value = 25;
  document.getElementById('premium').value = 0.10;
  document.getElementById('buyback').value = 0.1;
  document.getElementById('quantity').value = 10;
  document.getElementById('commissions').value = 10;
}

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
});

csvInput.addEventListener('change', () => {
  const file = csvInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => parseCSV(e.target.result);
  reader.readAsText(file);
  csvInput.value = '';
});

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  for (let line of lines.slice(1)) {
    const [ticker, strategy, openDate, closeDate, strike, premium, buyback, qty, commissions] = line.split(',');
    addTrade({
      ticker, strategy, openDate, closeDate,
      strike: parseFloat(strike),
      premium: parseFloat(premium),
      buyback: parseFloat(buyback) || 0,
      qty: parseInt(qty) || 1,
      commissions: parseFloat(commissions) || 0
    });
  }
}

function addTrade(t) {
  t.id = Date.now() + Math.random();
  const perContract = (t.premium - (t.buyback || 0)) * 100 - (t.commissions || 0);
  t.net = perContract * (t.qty || 1);
  trades.push(t);
  updateTable();
  updateSummary();
  drawCharts();
}

function updateTable() {
  tableBody.innerHTML = '';
  trades.sort((a,b) => new Date(a.closeDate) - new Date(b.closeDate));
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
  const ctx = lineCanvas.getContext('2d');
  ctx.clearRect(0,0,lineCanvas.width,lineCanvas.height);
  if(!trades.length) return;
  const points = [];
  let cum = 0;
  for (const t of trades) {
    cum += t.net;
    points.push({date:new Date(t.closeDate), value:cum});
  }
  const minDate = points[0].date;
  const maxDate = points[points.length-1].date;
  const minY = Math.min(0, ...points.map(p=>p.value));
  const maxY = Math.max(...points.map(p=>p.value));
  const pad = 40;
  const w = lineCanvas.width - pad*2;
  const h = lineCanvas.height - pad*2;
  ctx.strokeStyle = '#00c853';
  ctx.beginPath();
  points.forEach((p,i)=>{
    const x = pad + (p.date-minDate)/(maxDate-minDate)*w;
    const y = pad + h - (p.value-minY)/(maxY-minY)*h;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();
}

function drawBarChart() {
  const ctx = barCanvas.getContext('2d');
  ctx.clearRect(0,0,barCanvas.width,barCanvas.height);
  if(!trades.length) return;
  const monthly = {};
  for(const t of trades){
    const m = t.closeDate.slice(0,7);
    monthly[m] = (monthly[m]||0)+t.net;
  }
  const entries = Object.entries(monthly).sort();
  const pad = 40;
  const w = barCanvas.width - pad*2;
  const h = barCanvas.height - pad*2;
  const maxVal = Math.max(...entries.map(e=>e[1]), 0);
  const barWidth = w/entries.length*0.6;
  entries.forEach(([m,v],i)=>{
    const x = pad + i*(w/entries.length) + barWidth*0.2;
    const y = pad + h - (v/maxVal)*h;
    ctx.fillStyle = v>=0? 'rgba(0,200,83,0.7)' : 'rgba(239,68,68,0.7)';
    ctx.fillRect(x,y,barWidth,(v/maxVal)*h);
    ctx.fillStyle = '#fff';
    ctx.fillText(m, x, h + pad + 10);
  });
}
