import './styles.css';

const storageKey = 'hxwl-10-tide-records';
const stationStorageKey = 'hxwl-10-tide-stations';
const snapshotStorageKey = 'hxwl-10-tide-snapshots';

const seed = [
  { id: crypto.randomUUID(), place: '东极青浜', date: '2026-06-03', time: '05:40', level: 128, windDir: '东北', wind: 13, weather: '多云', note: '浪面平稳' },
  { id: crypto.randomUUID(), place: '东极青浜', date: '2026-06-03', time: '08:20', level: 289, windDir: '东北', wind: 16, weather: '晴', note: '潮位快速上涨' },
  { id: crypto.randomUUID(), place: '东极青浜', date: '2026-06-03', time: '11:50', level: 342, windDir: '东北', wind: 18, weather: '晴', note: '午前涨潮明显' },
  { id: crypto.randomUUID(), place: '东极青浜', date: '2026-06-04', time: '18:20', level: 86, windDir: '东南', wind: 9, weather: '阴', note: '退潮后礁石外露' },
  { id: crypto.randomUUID(), place: '东极青浜', date: '2026-06-07', time: '09:15', level: 156, windDir: '北', wind: 22, weather: '大风', note: '' },
  { id: crypto.randomUUID(), place: '嵊泗基湖', date: '2026-06-05', time: '06:15', level: 156, windDir: '南', wind: 11, weather: '晴', note: '适合晨间观察' },
  { id: crypto.randomUUID(), place: '嵊泗基湖', date: '2026-06-05', time: '06:15', level: 162, windDir: '南', wind: 12, weather: '晴', note: '重复录入测试' },
  { id: crypto.randomUUID(), place: '嵊泗基湖', date: '2026-06-05', time: '13:05', level: 319, windDir: '西南', wind: 15, weather: '晴', note: '游客增加' },
  { id: crypto.randomUUID(), place: '嵊泗基湖', date: '2026-06-08', time: '14:30', level: 298, windDir: '西北', wind: 25, weather: '阴', note: '' },
  { id: crypto.randomUUID(), place: '象山石浦', date: '2026-06-06', time: '10:30', level: 288, windDir: '东', wind: 21, weather: '小雨', note: '港内风浪偏大' }
];

const stationSeed = [
  { id: crypto.randomUUID(), name: '东极青浜', seaArea: '东海', longitude: 122.7833, latitude: 30.2667, note: '东极列岛主岛之一' },
  { id: crypto.randomUUID(), name: '嵊泗基湖', seaArea: '东海', longitude: 122.4583, latitude: 30.7333, note: '基湖沙滩景区' },
  { id: crypto.randomUUID(), name: '象山石浦', seaArea: '东海', longitude: 121.95, latitude: 29.2167, note: '石浦渔港' }
];

let records = load();
let stations = loadStations();
let editingId = null;
let editingStationId = null;
let pendingImportData = null;
let currentView = 'list';
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();
let selectedCalendarDate = null;
let anomalyFilterEnabled = false;

const anomalyConfig = {
  levelJumpThreshold: 100,
  levelJumpTimeWindowHours: 6,
  highWindThreshold: 20
};

const app = document.querySelector('#app');
app.innerHTML = `
  <main class="shell">
    <section class="hero">
      <div class="heroContent">
        <p class="eyebrow">hxwl-10 · port 5110</p>
        <h1>海边潮汐观察</h1>
        <p class="intro">手动记录潮位、风向、风速和天气，用本地数据跑通第一期潮汐可视化。</p>
        <div class="viewToggle">
          <button class="viewBtn active" data-view="list">📋 列表视图</button>
          <button class="viewBtn" data-view="calendar">📅 观测日历</button>
        </div>
      </div>
      <div class="actions">
        <button class="ghost" id="importSample">载入示例</button>
        <label class="ghost file">导入CSV<input id="csvInput" type="file" accept=".csv,text/csv" /></label>
        <button class="ghost" id="exportCsv">导出CSV</button>
      </div>
    </section>

    <section class="layout">
      <form class="panel form" id="recordForm">
        <h2>记录潮汐</h2>
        <select name="place" required>
          <option value="">请选择站点</option>
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

    <section class="panel" id="calendarViewSection" style="display:none;">
      <div class="calendarLayout">
        <div class="calendarPanel">
          <div class="panelHead">
            <h2>观测日历</h2>
            <div class="calendarNav">
              <button class="calendarNavBtn" id="prevMonth">‹</button>
              <span class="calendarTitle" id="calendarTitle"></span>
              <button class="calendarNavBtn" id="nextMonth">›</button>
            </div>
          </div>
          <div class="calendar" id="calendar"></div>
        </div>
        <div class="calendarDetail" id="calendarDetail">
          <div class="panel">
            <h2 id="calendarDetailTitle">选择日期查看记录</h2>
            <div id="calendarDetailRows"></div>
          </div>
        </div>
      </div>
    </section>

    <section class="panel" id="listViewSection">
      <div class="panelHead">
        <h2>观测列表</h2>
        <div class="listFilters">
          <button class="anomalyFilterBtn" id="anomalyFilterBtn">⚠️ 只看异常</button>
          <input id="search" placeholder="搜索地点、天气或备注" />
        </div>
      </div>
      <div class="tableWrap"><table><thead><tr><th>时间</th><th>地点</th><th>潮位</th><th>风</th><th>天气</th><th>异常</th><th></th></tr></thead><tbody id="rows"></tbody></table></div>
    </section>

    <section class="panel">
      <div class="panelHead">
        <h2>观测站点管理</h2>
        <span id="stationCount" class="countBadge"></span>
      </div>
      <div class="stationLayout">
        <form class="panel form stationForm" id="stationForm">
          <h3 id="stationFormTitle">新增站点</h3>
          <input name="name" placeholder="地点名称" required />
          <input name="seaArea" placeholder="所属海域" required />
          <div class="pair">
            <input name="longitude" type="number" step="0.0001" placeholder="经度" required />
            <input name="latitude" type="number" step="0.0001" placeholder="纬度" required />
          </div>
          <textarea name="note" placeholder="备注"></textarea>
          <div class="formActions">
            <button type="button" class="ghost" id="cancelStationEdit" style="display:none;">取消</button>
            <button class="primary" type="submit">保存站点</button>
          </div>
        </form>
        <div class="stationList">
          <div class="tableWrap"><table><thead><tr><th>地点名称</th><th>所属海域</th><th>经纬度</th><th>备注</th><th>关联记录</th><th></th></tr></thead><tbody id="stationRows"></tbody></table></div>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panelHead">
        <h2>数据快照</h2>
        <span id="snapshotCount" class="countBadge"></span>
      </div>
      <div class="snapshotLayout">
        <form class="panel form snapshotForm" id="snapshotForm">
          <h3 id="snapshotFormTitle">保存当前快照</h3>
          <input name="snapshotName" placeholder="输入快照名称" required />
          <p class="snapshotHint">将保存当前所有潮汐记录和站点数据</p>
          <button class="primary" type="submit">📸 保存快照</button>
        </form>
        <div class="snapshotList">
          <div id="snapshotRows"></div>
        </div>
      </div>
    </section>
  </main>

  <div class="modalBackdrop" id="csvModal" style="display:none;">
    <div class="modal">
      <div class="modalHead">
        <h2>CSV导入预览</h2>
        <button class="modalClose" id="closeCsvModal">&times;</button>
      </div>
      <div class="modalBody" id="csvModalBody"></div>
      <div class="modalFoot">
        <button class="ghost" id="cancelCsvImport">取消</button>
        <button class="primary" id="confirmCsvImport" disabled>确认导入</button>
      </div>
    </div>
  </div>
`;

const form = document.querySelector('#recordForm');
const search = document.querySelector('#search');
const placeFilter = document.querySelector('#placeFilter');
const stationForm = document.querySelector('#stationForm');
const cancelStationEditBtn = document.querySelector('#cancelStationEdit');
const stationFormTitle = document.querySelector('#stationFormTitle');
const snapshotForm = document.querySelector('#snapshotForm');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const item = { ...data, level: Number(data.level), wind: Number(data.wind), id: editingId || crypto.randomUUID() };
  records = editingId ? records.map((record) => (record.id === editingId ? item : record)) : [item, ...records];
  editingId = null;
  form.reset();
  persist();
  render();
});

search.addEventListener('input', render);
placeFilter.addEventListener('change', render);
document.querySelector('#anomalyFilterBtn').addEventListener('click', () => {
  anomalyFilterEnabled = !anomalyFilterEnabled;
  render();
});
document.querySelector('#importSample').addEventListener('click', () => {
  records = seed;
  persist();
  render();
});
document.querySelector('#exportCsv').addEventListener('click', () => downloadCsv(records));
document.querySelector('#csvInput').addEventListener('change', importCsv);
document.querySelector('#closeCsvModal').addEventListener('click', closeCsvModal);
document.querySelector('#cancelCsvImport').addEventListener('click', closeCsvModal);
document.querySelector('#confirmCsvImport').addEventListener('click', confirmCsvImport);
document.querySelector('#csvModal').addEventListener('click', (e) => {
  if (e.target.id === 'csvModal') closeCsvModal();
});

document.querySelectorAll('.viewBtn').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentView = btn.dataset.view;
    render();
  });
});

document.querySelector('#prevMonth').addEventListener('click', () => {
  calendarMonth--;
  if (calendarMonth < 0) {
    calendarMonth = 11;
    calendarYear--;
  }
  render();
});

document.querySelector('#nextMonth').addEventListener('click', () => {
  calendarMonth++;
  if (calendarMonth > 11) {
    calendarMonth = 0;
    calendarYear++;
  }
  render();
});

stationForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(stationForm).entries());
  const station = {
    ...data,
    longitude: Number(data.longitude),
    latitude: Number(data.latitude),
    id: editingStationId || crypto.randomUUID()
  };
  stations = editingStationId
    ? stations.map((s) => (s.id === editingStationId ? station : s))
    : [station, ...stations];
  editingStationId = null;
  stationForm.reset();
  cancelStationEditBtn.style.display = 'none';
  stationFormTitle.textContent = '新增站点';
  persistStations();
  render();
});

cancelStationEditBtn.addEventListener('click', () => {
  editingStationId = null;
  stationForm.reset();
  cancelStationEditBtn.style.display = 'none';
  stationFormTitle.textContent = '新增站点';
});

snapshotForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(snapshotForm);
  const name = formData.get('snapshotName');
  if (!name || !name.trim()) return;
  saveSnapshot(name);
  snapshotForm.reset();
  render();
});

function load() {
  return JSON.parse(localStorage.getItem(storageKey) || 'null') || seed;
}

function persist() {
  localStorage.setItem(storageKey, JSON.stringify(records));
}

function loadStations() {
  return JSON.parse(localStorage.getItem(stationStorageKey) || 'null') || stationSeed;
}

function persistStations() {
  localStorage.setItem(stationStorageKey, JSON.stringify(stations));
}

function loadSnapshots() {
  return JSON.parse(localStorage.getItem(snapshotStorageKey) || '[]');
}

function persistSnapshots(snapshots) {
  localStorage.setItem(snapshotStorageKey, JSON.stringify(snapshots));
}

function saveSnapshot(name) {
  const snapshots = loadSnapshots();
  const snapshot = {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    records: JSON.parse(JSON.stringify(records)),
    stations: JSON.parse(JSON.stringify(stations)),
    recordCount: records.length,
    stationCount: stations.length
  };
  snapshots.unshift(snapshot);
  persistSnapshots(snapshots);
  return snapshot;
}

function deleteSnapshot(id) {
  const snapshots = loadSnapshots().filter((s) => s.id !== id);
  persistSnapshots(snapshots);
}

function restoreSnapshot(id) {
  const snapshots = loadSnapshots();
  const snapshot = snapshots.find((s) => s.id === id);
  if (!snapshot) return false;
  records = JSON.parse(JSON.stringify(snapshot.records));
  stations = JSON.parse(JSON.stringify(snapshot.stations));
  persist();
  persistStations();
  editingId = null;
  editingStationId = null;
  form.reset();
  stationForm.reset();
  cancelStationEditBtn.style.display = 'none';
  stationFormTitle.textContent = '新增站点';
  return true;
}

function getRecordCountForStation(stationName) {
  return records.filter((record) => record.place === stationName).length;
}

function editStation(id) {
  const station = stations.find((s) => s.id === id);
  editingStationId = id;
  stationFormTitle.textContent = '编辑站点';
  cancelStationEditBtn.style.display = 'inline-block';
  Object.entries(station).forEach(([key, value]) => {
    if (stationForm.elements[key]) stationForm.elements[key].value = value;
  });
  stationForm.elements.name.focus();
}

function removeStation(id) {
  const station = stations.find((s) => s.id === id);
  const recordCount = getRecordCountForStation(station.name);
  if (recordCount > 0) {
    if (!confirm(`该站点"${station.name}"关联了 ${recordCount} 条潮汐记录。删除站点后历史记录中的地点名称仍将保留，但无法再选择该站点。确定要删除吗？`)) {
      return;
    }
  } else {
    if (!confirm(`确定要删除站点"${station.name}"吗？`)) {
      return;
    }
  }
  stations = stations.filter((s) => s.id !== id);
  persistStations();
  if (editingStationId === id) {
    editingStationId = null;
    stationForm.reset();
    cancelStationEditBtn.style.display = 'none';
    stationFormTitle.textContent = '新增站点';
  }
  if (editingId) {
    editingId = null;
    form.reset();
  }
  render();
}

function aggregateByDate(records) {
  const map = new Map();
  records.forEach((record) => {
    const list = map.get(record.date) || [];
    list.push(record);
    map.set(record.date, list);
  });
  return map;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function getPrimaryWeather(dayRecords) {
  const weatherCount = {};
  dayRecords.forEach((r) => {
    weatherCount[r.weather] = (weatherCount[r.weather] || 0) + 1;
  });
  let primary = '';
  let maxCount = 0;
  Object.entries(weatherCount).forEach(([weather, count]) => {
    if (count > maxCount) {
      maxCount = count;
      primary = weather;
    }
  });
  return primary;
}

function getWeatherIcon(weather) {
  const map = {
    '晴': '☀️',
    '多云': '⛅',
    '阴': '☁️',
    '小雨': '🌧️',
    '中雨': '🌧️',
    '大雨': '🌧️',
    '雷阵雨': '⛈️',
    '雪': '❄️',
    '雾': '🌫️'
  };
  return map[weather] || '🌤️';
}

function selectCalendarDate(dateStr) {
  selectedCalendarDate = dateStr;
  render();
}

function renderCalendar() {
  const aggregated = aggregateByDate(records);
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
  const today = new Date().toISOString().slice(0, 10);
  
  document.querySelector('#calendarTitle').textContent = `${calendarYear}年${calendarMonth + 1}月`;
  
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  let html = `<div class="calendarWeekdays">${weekdays.map((d) => `<div class="calendarWeekday">${d}</div>`).join('')}</div><div class="calendarDays">`;
  
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="calendarDay empty"></div>`;
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayRecords = aggregated.get(dateStr) || [];
    const isToday = dateStr === today;
    const isSelected = dateStr === selectedCalendarDate;
    const hasRecords = dayRecords.length > 0;
    
    let dayContent = `<div class="calendarDayNumber${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}">${day}</div>`;
    
    if (hasRecords) {
      const maxLevel = Math.max(...dayRecords.map((r) => r.level));
      const primaryWeather = getPrimaryWeather(dayRecords);
      const weatherIcon = getWeatherIcon(primaryWeather);
      dayContent += `
        <div class="calendarDayBadge">${dayRecords.length}条</div>
        <div class="calendarDayInfo">
          <span class="calendarDayLevel">${maxLevel}cm</span>
          <span class="calendarDayWeather">${weatherIcon}</span>
        </div>
      `;
    }
    
    html += `<div class="calendarDay${hasRecords ? ' hasRecords' : ''}${isSelected ? ' selected' : ''}" data-date="${dateStr}">${dayContent}</div>`;
  }
  
  const totalCells = firstDay + daysInMonth;
  const remainingCells = Math.ceil(totalCells / 7) * 7 - totalCells;
  for (let i = 0; i < remainingCells; i++) {
    html += `<div class="calendarDay empty"></div>`;
  }
  
  html += `</div>`;
  document.querySelector('#calendar').innerHTML = html;
  
  document.querySelectorAll('.calendarDay[data-date]').forEach((cell) => {
    cell.addEventListener('click', () => selectCalendarDate(cell.dataset.date));
  });
}

function renderCalendarDetail() {
  const titleEl = document.querySelector('#calendarDetailTitle');
  const rowsEl = document.querySelector('#calendarDetailRows');
  
  if (!selectedCalendarDate) {
    titleEl.textContent = '选择日期查看记录';
    rowsEl.innerHTML = '<p class="empty">点击日历中的日期查看当天的潮汐观测记录</p>';
    return;
  }
  
  const dayRecords = records.filter((r) => r.date === selectedCalendarDate).sort(byDateAsc);
  
  titleEl.textContent = `${selectedCalendarDate} 观测记录 (${dayRecords.length}条)`;
  
  if (dayRecords.length === 0) {
    rowsEl.innerHTML = '<p class="empty">当天暂无观测记录</p>';
    return;
  }
  
  rowsEl.innerHTML = `
    <div class="tableWrap">
      <table>
        <thead>
          <tr><th>时间</th><th>地点</th><th>潮位</th><th>风</th><th>天气</th><th>备注</th><th></th></tr>
        </thead>
        <tbody>
          ${dayRecords.map((record) => `
            <tr>
              <td>${record.time}</td>
              <td>${record.place}</td>
              <td>${record.level}cm</td>
              <td>${record.windDir} ${record.wind}km/h</td>
              <td>${record.weather}</td>
              <td>${record.note || '-'}</td>
              <td>
                <button data-edit="${record.id}">编辑</button>
                <button data-del="${record.id}">删除</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  rowsEl.querySelectorAll('[data-del]').forEach((button) => {
    button.addEventListener('click', () => remove(button.dataset.del));
  });
  rowsEl.querySelectorAll('[data-edit]').forEach((button) => {
    button.addEventListener('click', () => edit(button.dataset.edit));
  });
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function renderSnapshots() {
  const snapshots = loadSnapshots();
  const countEl = document.querySelector('#snapshotCount');
  const rowsEl = document.querySelector('#snapshotRows');

  countEl.textContent = `${snapshots.length} 个快照`;

  if (snapshots.length === 0) {
    rowsEl.innerHTML = '<p class="empty">暂无快照，保存当前数据创建第一个快照吧！</p>';
    return;
  }

  rowsEl.innerHTML = `
    <div class="tableWrap">
      <table>
        <thead>
          <tr><th>快照名称</th><th>创建时间</th><th>记录数</th><th>站点数</th><th></th></tr>
        </thead>
        <tbody>
          ${snapshots.map((snapshot) => `
            <tr>
              <td><strong>${escapeHtml(snapshot.name)}</strong></td>
              <td>${formatDate(snapshot.createdAt)}</td>
              <td>${snapshot.recordCount} 条</td>
              <td>${snapshot.stationCount} 个</td>
              <td>
                <button data-restore-snapshot="${snapshot.id}">恢复</button>
                <button data-del-snapshot="${snapshot.id}">删除</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  rowsEl.querySelectorAll('[data-restore-snapshot]').forEach((button) => {
    button.addEventListener('click', () => {
      const snapshotId = button.dataset.restoreSnapshot;
      const snapshots = loadSnapshots();
      const snapshot = snapshots.find((s) => s.id === snapshotId);
      if (!snapshot) return;

      if (confirm(`确定要恢复快照"${snapshot.name}"吗？\n\n恢复后将替换当前所有潮汐记录和站点数据，当前未保存的修改将会丢失。`)) {
        restoreSnapshot(snapshotId);
        render();
      }
    });
  });

  rowsEl.querySelectorAll('[data-del-snapshot]').forEach((button) => {
    button.addEventListener('click', () => {
      const snapshotId = button.dataset.delSnapshot;
      const snapshots = loadSnapshots();
      const snapshot = snapshots.find((s) => s.id === snapshotId);
      if (!snapshot) return;

      if (confirm(`确定要删除快照"${snapshot.name}"吗？此操作不可撤销。`)) {
        deleteSnapshot(snapshotId);
        render();
      }
    });
  });
}

function render() {
  document.querySelectorAll('.viewBtn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === currentView);
  });
  document.querySelector('#listViewSection').style.display = currentView === 'list' ? '' : 'none';
  document.querySelector('#calendarViewSection').style.display = currentView === 'calendar' ? '' : 'none';
  
  if (currentView === 'calendar') {
    renderCalendar();
    renderCalendarDetail();
  }
  
  const anomalies = detectAllAnomalies(records);
  const anomalyCount = anomalies.size;

  const anomalyFilterBtn = document.querySelector('#anomalyFilterBtn');
  anomalyFilterBtn.classList.toggle('active', anomalyFilterEnabled);
  anomalyFilterBtn.innerHTML = anomalyFilterEnabled ? '✅ 显示全部' : `⚠️ 只看异常 (${anomalyCount})`;

  const selectedPlace = placeFilter.value;
  const places = [...new Set(records.map((record) => record.place))].sort();
  placeFilter.innerHTML = `<option value="">全部地点</option>${places.map((place) => `<option>${place}</option>`).join('')}`;
  placeFilter.value = selectedPlace && places.includes(selectedPlace) ? selectedPlace : '';

  const placeSelect = form.elements.place;
  const currentPlaceValue = placeSelect.value;
  const stationNames = stations.map((s) => s.name).sort();
  
  const editingRecord = editingId ? records.find((r) => r.id === editingId) : null;
  const isEditingHistoricalPlace = editingRecord && !stationNames.includes(editingRecord.place);
  
  let availablePlaces;
  if (isEditingHistoricalPlace) {
    availablePlaces = [...new Set([...stationNames, editingRecord.place])].sort();
  } else {
    availablePlaces = stationNames;
  }
  
  placeSelect.innerHTML = `<option value="">请选择站点</option>${availablePlaces.map((name) => {
    const isStation = stationNames.includes(name);
    return `<option value="${name}">${name}${isStation ? '' : ' (历史)'}</option>`;
  }).join('')}`;
  if (currentPlaceValue && availablePlaces.includes(currentPlaceValue)) {
    placeSelect.value = currentPlaceValue;
  } else if (!editingId && stationNames.length > 0) {
    placeSelect.value = stationNames[0];
  } else if (isEditingHistoricalPlace) {
    placeSelect.value = editingRecord.place;
  }

  document.querySelector('#stationCount').textContent = `${stations.length} 个站点`;
  document.querySelector('#stationRows').innerHTML = stations
    .map((station) => {
      const recordCount = getRecordCountForStation(station.name);
      return `<tr>
        <td><strong>${station.name}</strong></td>
        <td>${station.seaArea}</td>
        <td>${station.longitude.toFixed(4)}, ${station.latitude.toFixed(4)}</td>
        <td>${station.note || '-'}</td>
        <td><span class="recordCount">${recordCount} 条</span></td>
        <td>
          <button data-edit-station="${station.id}">编辑</button>
          <button data-del-station="${station.id}">删除</button>
        </td>
      </tr>`;
    })
    .join('');
  document.querySelectorAll('[data-edit-station]').forEach((button) =>
    button.addEventListener('click', () => editStation(button.dataset.editStation))
  );
  document.querySelectorAll('[data-del-station]').forEach((button) =>
    button.addEventListener('click', () => removeStation(button.dataset.delStation))
  );
  let filtered = records.filter((record) => [record.place, record.weather, record.note].join(' ').includes(search.value.trim()));
  if (anomalyFilterEnabled) {
    filtered = filtered.filter(record => anomalies.has(record.id));
  }
  const scoped = placeFilter.value ? filtered.filter((record) => record.place === placeFilter.value) : filtered;
  document.querySelector('#stats').innerHTML = cards([
    ['记录数', records.length],
    ['异常记录', `${anomalyCount} 条`],
    ['最高潮位', `${Math.max(...records.map((record) => record.level), 0)}cm`],
    ['平均风速', `${avg(records.map((record) => record.wind)).toFixed(1)}km/h`]
  ]);
  document.querySelector('#rows').innerHTML = scoped
    .sort(byDateDesc)
    .map((record) => {
      const recordAnomalies = anomalies.get(record.id) || [];
      const anomalyBadges = recordAnomalies.map(a => 
        `<span class="${getAnomalyBadgeClass(a.type)}" title="${escapeHtml(a.reason)}">${getAnomalyTypeLabel(a.type)}</span>`
      ).join('');
      const rowClass = recordAnomalies.length > 0 ? 'anomalyRow' : '';
      return `<tr class="${rowClass}"><td>${record.date} ${record.time}</td><td>${record.place}</td><td>${record.level}cm</td><td>${record.windDir} ${record.wind}km/h</td><td>${record.weather}</td><td>${anomalyBadges || '<span class="noAnomaly">-</span>'}</td><td><button data-edit="${record.id}">编辑</button><button data-del="${record.id}">删除</button></td></tr>`;
    })
    .join('');
  document.querySelectorAll('[data-del]').forEach((button) => button.addEventListener('click', () => remove(button.dataset.del)));
  document.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => edit(button.dataset.edit)));
  
  const todayChartData = scoped.sort(byDateAsc).map((record) => ({
    id: record.id,
    label: record.time,
    value: record.level,
    isAnomaly: anomalies.has(record.id),
    anomalyTypes: (anomalies.get(record.id) || []).map(a => a.type)
  }));
  drawLine('#todayChart', todayChartData, 'cm');
  drawLine('#weekChart', dailyAverage(scoped, 'level'), 'cm');
  drawBars('#placeChart', groupAverage(filtered, 'place', 'level'), 'cm');
  renderSnapshots();
}

function edit(id) {
  const record = records.find((item) => item.id === id);
  editingId = id;
  render();
  Object.entries(record).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value;
  });
}

function remove(id) {
  records = records.filter((record) => record.id !== id);
  persist();
  render();
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function detectFieldMapping(headers) {
  const mapping = {};
  const headerMap = {
    'place': 'place', '地点': 'place', '站点': 'place',
    'date': 'date', '日期': 'date',
    'time': 'time', '时间': 'time',
    'level': 'level', '潮位': 'level', '水位': 'level',
    'windDir': 'windDir', '风向': 'windDir',
    'wind': 'wind', '风速': 'wind',
    'weather': 'weather', '天气': 'weather',
    'note': 'note', '备注': 'note', '说明': 'note'
  };
  headers.forEach((header, index) => {
    const cleanHeader = header.toLowerCase().trim();
    if (headerMap[header] || headerMap[cleanHeader]) {
      const field = headerMap[header] || headerMap[cleanHeader];
      mapping[field] = index;
    }
  });
  return mapping;
}

function validateDate(dateStr) {
  if (!dateStr) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  if (month === 2 && isLeapYear) {
    if (day > 29) return false;
  } else if (day > daysInMonth[month - 1]) {
    return false;
  }
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
}

function validateRow(row, mapping, lineNum) {
  const errors = [];
  const data = {
    place: mapping.place !== undefined ? row[mapping.place] : '',
    date: mapping.date !== undefined ? row[mapping.date] : '',
    time: mapping.time !== undefined ? row[mapping.time] : '',
    level: mapping.level !== undefined ? row[mapping.level] : '',
    windDir: mapping.windDir !== undefined ? row[mapping.windDir] : '',
    wind: mapping.wind !== undefined ? row[mapping.wind] : '',
    weather: mapping.weather !== undefined ? row[mapping.weather] : '',
    note: mapping.note !== undefined ? row[mapping.note] : ''
  };
  if (!data.place || !data.place.trim()) {
    errors.push({ field: '地点', message: '地点不能为空', value: data.place });
  }
  if (!validateDate(data.date)) {
    errors.push({ field: '日期', message: '日期格式非法，请使用YYYY-MM-DD格式', value: data.date });
  }
  const levelNum = Number(data.level);
  if (data.level === '' || isNaN(levelNum)) {
    errors.push({ field: '潮位', message: '潮位必须为有效数字', value: data.level });
  }
  const windNum = Number(data.wind);
  if (data.wind === '' || isNaN(windNum)) {
    errors.push({ field: '风速', message: '风速必须为有效数字', value: data.wind });
  }
  return {
    lineNum,
    valid: errors.length === 0,
    errors,
    data: {
      place: data.place.trim(),
      date: data.date.trim(),
      time: data.time.trim(),
      level: levelNum,
      windDir: data.windDir.trim(),
      wind: windNum,
      weather: data.weather.trim(),
      note: data.note.trim()
    },
    raw: row.join(', ')
  };
}

function importCsv(event) {
  const file = event.target.files[0];
  if (!file) return;
  const csvInput = document.querySelector('#csvInput');
  file.text().then((text) => {
    const lines = text.trim().split(/\n+/);
    if (lines.length < 2) {
      showImportError('CSV文件为空或格式不正确，至少需要包含表头和一行数据。');
      csvInput.value = '';
      return;
    }
    const headers = parseCsvLine(lines[0]);
    const mapping = detectFieldMapping(headers);
    const requiredFields = ['place', 'date', 'time', 'level', 'windDir', 'wind', 'weather'];
    const missingFields = requiredFields.filter(f => mapping[f] === undefined);
    if (missingFields.length > 0) {
      const fieldNames = { place: '地点', date: '日期', time: '时间', level: '潮位', windDir: '风向', wind: '风速', weather: '天气' };
      showImportError(`CSV缺少必要字段：${missingFields.map(f => fieldNames[f]).join('、')}。\n\n检测到的表头：${headers.join('、')}\n\n请确保CSV包含上述字段，支持中英文列名。`);
      csvInput.value = '';
      return;
    }
    const rows = lines.slice(1);
    const results = rows.map((line, index) => {
      const row = parseCsvLine(line);
      return validateRow(row, mapping, index + 2);
    });
    const validRows = results.filter(r => r.valid);
    const errorRows = results.filter(r => !r.valid);
    pendingImportData = {
      validRows,
      errorRows,
      mapping,
      headers,
      fileName: file.name
    };
    renderCsvPreview();
    openCsvModal();
    csvInput.value = '';
  }).catch(() => {
    showImportError('文件读取失败，请检查文件是否正确。');
    csvInput.value = '';
  });
}

function renderCsvPreview() {
  if (!pendingImportData) return;
  const { validRows, errorRows, mapping, headers, fileName } = pendingImportData;
  const fieldMap = { place: '地点', date: '日期', time: '时间', level: '潮位', windDir: '风向', wind: '风速', weather: '天气', note: '备注' };
  const mappingHtml = Object.entries(mapping).map(([field, idx]) => {
    return `<div class="mappingItem"><span class="mappingKey">${fieldMap[field]}</span><span class="mappingArrow">→</span><span class="mappingVal">${headers[idx]}</span></div>`;
  }).join('');
  let errorSummary = '';
  if (errorRows.length > 0) {
    const errorList = errorRows.slice(0, 10).map(r => {
      const errorMsgs = r.errors.map(e => `<span class="errorTag">${e.field}: ${e.message}</span>`).join('');
      return `<div class="errorRow"><span class="errorLine">第${r.lineNum}行</span>${errorMsgs}<div class="errorRaw">${escapeHtml(r.raw)}</div></div>`;
    }).join('');
    const moreErrors = errorRows.length > 10 ? `<div class="moreErrors">...还有 ${errorRows.length - 10} 条错误未显示</div>` : '';
    errorSummary = `
      <div class="previewSection errorSection">
        <h3 class="errorTitle">⚠️ 错误行摘要 (${errorRows.length} 条)</h3>
        <div class="errorList">${errorList}${moreErrors}</div>
        <p class="errorNote">错误行将被跳过，不会导入。</p>
      </div>
    `;
  }
  const previewRows = validRows.slice(0, 5).map(r => `
    <tr>
      <td>${r.lineNum}</td>
      <td>${escapeHtml(r.data.place)}</td>
      <td>${escapeHtml(r.data.date)}</td>
      <td>${escapeHtml(r.data.time)}</td>
      <td>${r.data.level}</td>
      <td>${escapeHtml(r.data.windDir)}</td>
      <td>${r.data.wind}</td>
      <td>${escapeHtml(r.data.weather)}</td>
      <td>${escapeHtml(r.data.note || '-')}</td>
    </tr>
  `).join('');
  const morePreview = validRows.length > 5 ? `<div class="morePreview">...还有 ${validRows.length - 5} 条有效数据</div>` : '';
  const html = `
    <div class="previewHeader">
      <div class="fileName">📄 ${escapeHtml(fileName)}</div>
    </div>
    <div class="previewStats">
      <div class="statCard total"><span class="statLabel">解析总行数</span><span class="statValue">${validRows.length + errorRows.length}</span></div>
      <div class="statCard valid"><span class="statLabel">有效行数</span><span class="statValue">${validRows.length}</span></div>
      <div class="statCard error"><span class="statLabel">错误行数</span><span class="statValue">${errorRows.length}</span></div>
    </div>
    <div class="previewSection">
      <h3>🔗 字段映射</h3>
      <div class="mappingGrid">${mappingHtml}</div>
    </div>
    ${errorSummary}
    <div class="previewSection">
      <h3>📋 数据预览 (前5条)</h3>
      <div class="tableWrap">
        <table class="previewTable">
          <thead>
            <tr><th>行号</th><th>地点</th><th>日期</th><th>时间</th><th>潮位</th><th>风向</th><th>风速</th><th>天气</th><th>备注</th></tr>
          </thead>
          <tbody>${previewRows}</tbody>
        </table>
      </div>
      ${morePreview}
    </div>
  `;
  document.querySelector('#csvModalBody').innerHTML = html;
  const confirmBtn = document.querySelector('#confirmCsvImport');
  if (validRows.length > 0) {
    confirmBtn.disabled = false;
    confirmBtn.textContent = `确认导入 ${validRows.length} 条记录`;
  } else {
    confirmBtn.disabled = true;
    confirmBtn.textContent = '没有可导入的有效数据';
  }
}

function openCsvModal() {
  document.querySelector('#csvModal').style.display = 'flex';
}

function closeCsvModal() {
  document.querySelector('#csvModal').style.display = 'none';
  pendingImportData = null;
}

function confirmCsvImport() {
  if (!pendingImportData || pendingImportData.validRows.length === 0) return;
  const { validRows, errorRows } = pendingImportData;
  const newRecords = validRows.map(r => ({
    id: crypto.randomUUID(),
    ...r.data
  }));
  records = [...newRecords, ...records];
  persist();
  render();
  closeCsvModal();
  const totalImported = validRows.length;
  const totalSkipped = errorRows.length;
  let message = `✅ 成功导入 ${totalImported} 条观测记录。`;
  if (totalSkipped > 0) {
    message += `\n⚠️ 跳过 ${totalSkipped} 条错误数据，请检查CSV文件。`;
  }
  alert(message);
}

function showImportError(message) {
  alert('❌ CSV导入失败\n\n' + message);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
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

function getMinutesDiff(dateStr1, timeStr1, dateStr2, timeStr2) {
  const dt1 = new Date(`${dateStr1}T${timeStr1}`);
  const dt2 = new Date(`${dateStr2}T${timeStr2}`);
  return Math.abs((dt2 - dt1) / (1000 * 60));
}

function detectLevelJumpAnomalies(records) {
  const anomalies = new Map();
  const places = [...new Set(records.map(r => r.place))];

  places.forEach(place => {
    const placeRecords = records
      .filter(r => r.place === place)
      .sort(byDateAsc);

    for (let i = 1; i < placeRecords.length; i++) {
      const prev = placeRecords[i - 1];
      const curr = placeRecords[i];
      const levelDiff = Math.abs(curr.level - prev.level);
      const timeDiffHours = getMinutesDiff(prev.date, prev.time, curr.date, curr.time) / 60;

      if (timeDiffHours <= anomalyConfig.levelJumpTimeWindowHours && levelDiff >= anomalyConfig.levelJumpThreshold) {
        const reason = `潮位跳变异常：${prev.level}cm → ${curr.level}cm（${levelDiff >= 0 ? '+' : ''}${levelDiff}cm），间隔${timeDiffHours.toFixed(1)}小时`;
        if (!anomalies.has(prev.id)) anomalies.set(prev.id, []);
        if (!anomalies.has(curr.id)) anomalies.set(curr.id, []);
        anomalies.get(prev.id).push({ type: 'jump', reason });
        anomalies.get(curr.id).push({ type: 'jump', reason });
      }
    }
  });

  return anomalies;
}

function detectDuplicateAnomalies(records) {
  const anomalies = new Map();
  const keyMap = new Map();

  records.forEach(record => {
    const key = `${record.place}|${record.date}|${record.time}`;
    if (!keyMap.has(key)) {
      keyMap.set(key, []);
    }
    keyMap.get(key).push(record);
  });

  keyMap.forEach((group, key) => {
    if (group.length > 1) {
      const [place, date, time] = key.split('|');
      const reason = `重复记录异常：同一地点(${place}) ${date} ${time} 存在 ${group.length} 条记录`;
      group.forEach(record => {
        if (!anomalies.has(record.id)) anomalies.set(record.id, []);
        anomalies.get(record.id).push({ type: 'duplicate', reason });
      });
    }
  });

  return anomalies;
}

function detectHighWindNoNoteAnomalies(records) {
  const anomalies = new Map();

  records.forEach(record => {
    if (record.wind >= anomalyConfig.highWindThreshold && (!record.note || record.note.trim() === '')) {
      const reason = `高风速无备注异常：风速 ${record.wind}km/h（≥${anomalyConfig.highWindThreshold}km/h）但备注为空`;
      anomalies.set(record.id, [{ type: 'wind', reason }]);
    }
  });

  return anomalies;
}

function detectAllAnomalies(records) {
  const anomalies = new Map();

  const mergeAnomalies = (sourceAnomalies) => {
    sourceAnomalies.forEach((anomalyList, id) => {
      if (!anomalies.has(id)) anomalies.set(id, []);
      anomalies.get(id).push(...anomalyList);
    });
  };

  mergeAnomalies(detectLevelJumpAnomalies(records));
  mergeAnomalies(detectDuplicateAnomalies(records));
  mergeAnomalies(detectHighWindNoNoteAnomalies(records));

  return anomalies;
}

function getAnomalyBadgeClass(type) {
  const classMap = {
    jump: 'anomalyBadge jump',
    duplicate: 'anomalyBadge duplicate',
    wind: 'anomalyBadge wind'
  };
  return classMap[type] || 'anomalyBadge';
}

function getAnomalyTypeLabel(type) {
  const labelMap = {
    jump: '跳变',
    duplicate: '重复',
    wind: '高风'
  };
  return labelMap[type] || '异常';
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

function getAnomalyCircleColor(anomalyTypes) {
  if (!anomalyTypes || anomalyTypes.length === 0) return '#0d9488';
  if (anomalyTypes.includes('jump')) return '#dc2626';
  if (anomalyTypes.includes('duplicate')) return '#d97706';
  if (anomalyTypes.includes('wind')) return '#7c3aed';
  return '#dc2626';
}

function drawLine(selector, data, unit) {
  const el = document.querySelector(selector);
  if (!data.length) return (el.innerHTML = '<p class="empty">暂无数据</p>');
  const max = Math.max(...data.map((item) => item.value), 1);
  const points = data.map((item, index) => `${40 + index * (420 / Math.max(data.length - 1, 1))},${180 - (item.value / max) * 140}`).join(' ');
  
  const dataPoints = data.map((item, index) => {
    const cx = 40 + index * (420 / Math.max(data.length - 1, 1));
    const cy = 180 - (item.value / max) * 140;
    const isAnomaly = item.isAnomaly === true;
    const circleColor = isAnomaly ? getAnomalyCircleColor(item.anomalyTypes) : '#0d9488';
    const circleR = isAnomaly ? 8 : 5;
    const anomalyClass = isAnomaly ? 'anomalyPoint' : '';
    const anomalyTitle = isAnomaly && item.anomalyTypes ? 
      `异常类型: ${item.anomalyTypes.map(t => getAnomalyTypeLabel(t)).join('、')}` : '';
    
    return `
      <g class="${anomalyClass}" title="${anomalyTitle}">
        <circle cx="${cx}" cy="${cy}" r="${circleR}" fill="${circleColor}" stroke="white" stroke-width="2"/>
        <text x="${cx}" y="205">${item.label}</text>
        <text x="${cx}" y="${170 - (item.value / max) * 140}">${Math.round(item.value)}${unit}</text>
      </g>
    `;
  }).join('');
  
  el.innerHTML = `
    <svg viewBox="0 0 500 220" role="img">
      <polyline points="${points}" fill="none" stroke="#0d9488" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      ${dataPoints}
    </svg>
  `;
}

function drawBars(selector, data, unit) {
  const el = document.querySelector(selector);
  if (!data.length) return (el.innerHTML = '<p class="empty">暂无数据</p>');
  const max = Math.max(...data.map((item) => item.value), 1);
  el.innerHTML = `<svg viewBox="0 0 500 220" role="img">${data.map((item, index) => { const width = (item.value / max) * 320; return `<g><text x="18" y="${45 + index * 42}">${item.label}</text><rect x="140" y="${24 + index * 42}" width="${width}" height="22" rx="4"/><text x="${150 + width}" y="${42 + index * 42}">${Math.round(item.value)}${unit}</text></g>`; }).join('')}</svg>`;
}

render();
