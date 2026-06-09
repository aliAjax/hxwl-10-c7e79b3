import './styles.css';

const storageKey = 'hxwl-10-tide-records';
const stationStorageKey = 'hxwl-10-tide-stations';
const seed = [
  { id: crypto.randomUUID(), place: '东极青浜', date: '2026-06-03', time: '05:40', level: 128, windDir: '东北', wind: 13, weather: '多云', note: '浪面平稳' },
  { id: crypto.randomUUID(), place: '东极青浜', date: '2026-06-03', time: '11:50', level: 342, windDir: '东北', wind: 18, weather: '晴', note: '午前涨潮明显' },
  { id: crypto.randomUUID(), place: '东极青浜', date: '2026-06-04', time: '18:20', level: 86, windDir: '东南', wind: 9, weather: '阴', note: '退潮后礁石外露' },
  { id: crypto.randomUUID(), place: '嵊泗基湖', date: '2026-06-05', time: '06:15', level: 156, windDir: '南', wind: 11, weather: '晴', note: '适合晨间观察' },
  { id: crypto.randomUUID(), place: '嵊泗基湖', date: '2026-06-05', time: '13:05', level: 319, windDir: '西南', wind: 15, weather: '晴', note: '游客增加' },
  { id: crypto.randomUUID(), place: '象山石浦', date: '2026-06-06', time: '10:30', level: 288, windDir: '东', wind: 21, weather: '小雨', note: '港内风浪偏大' }
];
const stationSeed = [
  { id: crypto.randomUUID(), name: '东极青浜', sea: '东海', longitude: '122.6789', latitude: '30.1234', note: '位于东极岛群，视野开阔' },
  { id: crypto.randomUUID(), name: '嵊泗基湖', sea: '东海', longitude: '122.4567', latitude: '30.6789', note: '基湖沙滩附近，适合观测' },
  { id: crypto.randomUUID(), name: '象山石浦', sea: '东海', longitude: '121.9876', latitude: '29.3456', note: '石浦港内，受风浪影响较小' }
];

let records = load();
let stations = loadStations();
let editingId = null;
let editingStationId = null;

const app = document.querySelector('#app');
app.innerHTML = `
  <main class="shell">
    <section class="hero">
      <div>
        <p class="eyebrow">hxwl-10 · port 5110</p>
        <h1>海边潮汐观察</h1>
        <p class="intro">手动记录潮位、风向、风速和天气，用本地数据跑通第一期潮汐可视化。</p>
      </div>
      <div class="actions">
        <button class="ghost" id="manageStations">站点管理</button>
        <button class="ghost" id="importSample">载入示例</button>
        <label class="ghost file">导入CSV<input id="csvInput" type="file" accept=".csv,text/csv" /></label>
        <button class="ghost" id="exportCsv">导出CSV</button>
      </div>
    </section>

    <section class="layout">
      <form class="panel form" id="recordForm">
        <h2>记录潮汐</h2>
        <select name="place" id="placeSelect" required>
          <option value="">请选择地点</option>
        </select>
        <div class="pair">
          <input name="date" type="date" required />
          <input name="time" type="time" required />
        </div>
        <div class="pair">
          <input name="level" type="number" min="0" step="1" placeholder="潮位cm" required />
          <input name="wind" type="number" min="0" step="1" placeholder="风速km/h" required />
        </div>
        <div class="pair">
          <input name="windDir" placeholder="风向" required />
          <input name="weather" placeholder="天气" required />
        </div>
        <textarea name="note" placeholder="备注"></textarea>
        <button class="primary" type="submit">保存记录</button>
      </form>

      <div class="board">
        <section class="stats" id="stats"></section>
        <section class="panel">
          <div class="panelHead">
            <h2>今日潮位曲线</h2>
            <select id="placeFilter"></select>
          </div>
          <div id="todayChart" class="chart"></div>
        </section>
        <section class="gridTwo">
          <div class="panel">
            <h2>最近一周潮位</h2>
            <div id="weekChart" class="chart small"></div>
          </div>
          <div class="panel">
            <h2>地点对比</h2>
            <div id="placeChart" class="chart small"></div>
          </div>
        </section>
      </div>
    </section>

    <section class="panel" id="stationPanel" style="display:none;">
      <div class="panelHead">
        <h2>观测站点管理</h2>
        <button class="ghost" id="closeStationPanel">关闭</button>
      </div>
      <form class="form" id="stationForm" style="margin-bottom:20px;">
        <div class="pair">
          <input name="name" placeholder="地点名称" required />
          <input name="sea" placeholder="所属海域" required />
        </div>
        <div class="pair">
          <input name="longitude" type="number" step="0.0001" placeholder="经度" required />
          <input name="latitude" type="number" step="0.0001" placeholder="纬度" required />
        </div>
        <textarea name="note" placeholder="备注"></textarea>
        <button class="primary" type="submit">保存站点</button>
      </form>
      <div class="tableWrap"><table><thead><tr><th>地点名称</th><th>所属海域</th><th>经度</th><th>纬度</th><th>备注</th><th>关联记录</th><th></th></tr></thead><tbody id="stationRows"></tbody></table></div>
    </section>

    <section class="panel">
      <div class="panelHead">
        <h2>观测列表</h2>
        <input id="search" placeholder="搜索地点、天气或备注" />
      </div>
      <div class="tableWrap"><table><thead><tr><th>时间</th><th>地点</th><th>潮位</th><th>风</th><th>天气</th><th></th></tr></thead><tbody id="rows"></tbody></table></div>
    </section>
  </main>
`;

const form = document.querySelector('#recordForm');
const search = document.querySelector('#search');
const placeFilter = document.querySelector('#placeFilter');
const placeSelect = document.querySelector('#placeSelect');
const stationForm = document.querySelector('#stationForm');
const stationPanel = document.querySelector('#stationPanel');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const item = { ...data, level: Number(data.level), wind: Number(data.wind), id: editingId || crypto.randomUUID() };
  records = editingId ? records.map((record) => (record.id === editingId ? item : record)) : [item, ...records];
  editingId = null;
  form.reset();
  placeSelect.value = '';
  persist();
  render();
});

search.addEventListener('input', render);
placeFilter.addEventListener('change', render);
document.querySelector('#manageStations').addEventListener('click', () => {
  stationPanel.style.display = 'block';
  renderStations();
});
document.querySelector('#closeStationPanel').addEventListener('click', () => {
  stationPanel.style.display = 'none';
});
document.querySelector('#importSample').addEventListener('click', () => {
  records = seed;
  persist();
  render();
});
document.querySelector('#exportCsv').addEventListener('click', () => downloadCsv(records));
document.querySelector('#csvInput').addEventListener('change', importCsv);

stationForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(stationForm).entries());
  const item = { ...data, id: editingStationId || crypto.randomUUID() };
  if (editingStationId) {
    const oldStation = stations.find((s) => s.id === editingStationId);
    if (oldStation && oldStation.name !== item.name) {
      records = records.map((record) => (record.place === oldStation.name ? { ...record, place: item.name } : record));
      persist();
    }
    stations = stations.map((station) => (station.id === editingStationId ? item : station));
  } else {
    stations = [item, ...stations];
  }
  editingStationId = null;
  stationForm.reset();
  persistStations();
  renderStations();
  render();
});

function load() {
  return JSON.parse(localStorage.getItem(storageKey) || 'null') || seed;
}

function loadStations() {
  return JSON.parse(localStorage.getItem(stationStorageKey) || 'null') || stationSeed;
}

function persist() {
  localStorage.setItem(storageKey, JSON.stringify(records));
}

function persistStations() {
  localStorage.setItem(stationStorageKey, JSON.stringify(stations));
}

function getStationRecordCount(stationName) {
  return records.filter((record) => record.place === stationName).length;
}

function renderStations() {
  const stationRows = document.querySelector('#stationRows');
  stationRows.innerHTML = stations
    .map((station) => {
      const count = getStationRecordCount(station.name);
      return `<tr><td>${station.name}</td><td>${station.sea}</td><td>${station.longitude}</td><td>${station.latitude}</td><td>${station.note || '-'}</td><td>${count}</td><td><button data-edit-station="${station.id}">编辑</button><button data-del-station="${station.id}" ${count > 0 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>删除</button></td></tr>`;
    })
    .join('');
  document.querySelectorAll('[data-edit-station]').forEach((button) => button.addEventListener('click', () => editStation(button.dataset.editStation)));
  document.querySelectorAll('[data-del-station]').forEach((button) => {
    if (!button.disabled) {
      button.addEventListener('click', () => removeStation(button.dataset.delStation));
    }
  });
}

function editStation(id) {
  const station = stations.find((item) => item.id === id);
  editingStationId = id;
  Object.entries(station).forEach(([key, value]) => {
    if (stationForm.elements[key]) stationForm.elements[key].value = value;
  });
}

function removeStation(id) {
  const station = stations.find((item) => item.id === id);
  const count = getStationRecordCount(station.name);
  if (count > 0) {
    alert('该站点有关联的潮汐记录，无法删除。请先删除相关记录后再操作。');
    return;
  }
  stations = stations.filter((item) => item.id !== id);
  persistStations();
  renderStations();
  render();
}

function render() {
  const selectedPlace = placeFilter.value;
  const currentPlaceSelectValue = placeSelect.value;
  const stationNames = stations.map((station) => station.name).sort();
  const places = [...new Set(records.map((record) => record.place))].sort();
  placeFilter.innerHTML = `<option value="">全部地点</option>${places.map((place) => `<option>${place}</option>`).join('')}`;
  placeFilter.value = selectedPlace && places.includes(selectedPlace) ? selectedPlace : '';
  placeSelect.innerHTML = `<option value="">请选择地点</option>${stationNames.map((name) => `<option>${name}</option>`).join('')}`;
  placeSelect.value = currentPlaceSelectValue && stationNames.includes(currentPlaceSelectValue) ? currentPlaceSelectValue : '';
  const filtered = records.filter((record) => [record.place, record.weather, record.note].join(' ').includes(search.value.trim()));
  const scoped = placeFilter.value ? filtered.filter((record) => record.place === placeFilter.value) : filtered;
  document.querySelector('#stats').innerHTML = cards([
    ['记录数', records.length],
    ['最高潮位', `${Math.max(...records.map((record) => record.level), 0)}cm`],
    ['平均风速', `${avg(records.map((record) => record.wind)).toFixed(1)}km/h`]
  ]);
  document.querySelector('#rows').innerHTML = scoped
    .sort(byDateDesc)
    .map((record) => `<tr><td>${record.date} ${record.time}</td><td>${record.place}</td><td>${record.level}cm</td><td>${record.windDir} ${record.wind}km/h</td><td>${record.weather}</td><td><button data-edit="${record.id}">编辑</button><button data-del="${record.id}">删除</button></td></tr>`)
    .join('');
  document.querySelectorAll('[data-del]').forEach((button) => button.addEventListener('click', () => remove(button.dataset.del)));
  document.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => edit(button.dataset.edit)));
  drawLine('#todayChart', scoped.sort(byDateAsc).map((record) => ({ label: record.time, value: record.level })), 'cm');
  drawLine('#weekChart', dailyAverage(scoped, 'level'), 'cm');
  drawBars('#placeChart', groupAverage(filtered, 'place', 'level'), 'cm');
}

function edit(id) {
  const record = records.find((item) => item.id === id);
  editingId = id;
  Object.entries(record).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value;
  });
  if (record.place) {
    const stationNames = stations.map((station) => station.name);
    if (stationNames.includes(record.place)) {
      placeSelect.value = record.place;
    } else {
      placeSelect.innerHTML = `<option value="">请选择地点</option><option value="${record.place}" selected>${record.place}</option>${stationNames.filter((name) => name !== record.place).map((name) => `<option>${name}</option>`).join('')}`;
    }
  }
}

function remove(id) {
  records = records.filter((record) => record.id !== id);
  persist();
  render();
}

function importCsv(event) {
  const file = event.target.files[0];
  if (!file) return;
  file.text().then((text) => {
    const rows = text.trim().split(/\n+/).slice(1).map((line) => line.split(','));
    records = rows.map(([place, date, time, level, windDir, wind, weather, note]) => ({ id: crypto.randomUUID(), place, date, time, level: Number(level), windDir, wind: Number(wind), weather, note }));
    persist();
    render();
  });
}

function downloadCsv(data) {
  const csv = ['place,date,time,level,windDir,wind,weather,note', ...data.map((record) => [record.place, record.date, record.time, record.level, record.windDir, record.wind, record.weather, record.note].join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'tide-records.csv' });
  a.click();
  URL.revokeObjectURL(url);
}

function cards(items) {
  return items.map(([label, value]) => `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`).join('');
}

function avg(values) {
  return values.length ? values.reduce((sum, value) => sum + Number(value), 0) / values.length : 0;
}

function byDateAsc(a, b) {
  return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
}

function byDateDesc(a, b) {
  return byDateAsc(b, a);
}

function dailyAverage(data, field) {
  const map = new Map();
  data.forEach((record) => {
    const list = map.get(record.date) || [];
    list.push(record[field]);
    map.set(record.date, list);
  });
  return [...map.entries()].sort().slice(-7).map(([label, values]) => ({ label: label.slice(5), value: avg(values) }));
}

function groupAverage(data, key, field) {
  const map = new Map();
  data.forEach((record) => {
    const list = map.get(record[key]) || [];
    list.push(record[field]);
    map.set(record[key], list);
  });
  return [...map.entries()].map(([label, values]) => ({ label, value: avg(values) })).sort((a, b) => b.value - a.value);
}

function drawLine(selector, data, unit) {
  const el = document.querySelector(selector);
  if (!data.length) return (el.innerHTML = '<p class="empty">暂无数据</p>');
  const max = Math.max(...data.map((item) => item.value), 1);
  const points = data.map((item, index) => `${40 + index * (420 / Math.max(data.length - 1, 1))},${180 - (item.value / max) * 140}`).join(' ');
  el.innerHTML = `<svg viewBox="0 0 500 220" role="img"><polyline points="${points}" fill="none" stroke="#0d9488" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${data.map((item, index) => `<g><circle cx="${40 + index * (420 / Math.max(data.length - 1, 1))}" cy="${180 - (item.value / max) * 140}" r="5"/><text x="${40 + index * (420 / Math.max(data.length - 1, 1))}" y="205">${item.label}</text><text x="${40 + index * (420 / Math.max(data.length - 1, 1))}" y="${170 - (item.value / max) * 140}">${Math.round(item.value)}${unit}</text></g>`).join('')}</svg>`;
}

function drawBars(selector, data, unit) {
  const el = document.querySelector(selector);
  if (!data.length) return (el.innerHTML = '<p class="empty">暂无数据</p>');
  const max = Math.max(...data.map((item) => item.value), 1);
  el.innerHTML = `<svg viewBox="0 0 500 220" role="img">${data.map((item, index) => { const width = (item.value / max) * 320; return `<g><text x="18" y="${45 + index * 42}">${item.label}</text><rect x="140" y="${24 + index * 42}" width="${width}" height="22" rx="4"/><text x="${150 + width}" y="${42 + index * 42}">${Math.round(item.value)}${unit}</text></g>`; }).join('')}</svg>`;
}

render();
