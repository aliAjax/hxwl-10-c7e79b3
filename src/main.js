import './styles.css';

const storageKey = 'hxwl-10-tide-records';
const stationStorageKey = 'hxwl-10-tide-stations';
const snapshotStorageKey = 'hxwl-10-tide-snapshots';
const opLogStorageKey = 'hxwl-10-tide-oplog';

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
let compareSelectedPlaces = [];
let compareStartDate = '';
let compareEndDate = '';
let mapSelectedStationId = null;

const anomalyConfig = {
  levelJumpThreshold: 100,
  levelJumpTimeWindowHours: 6,
  highWindThreshold: 20
};

const compareColors = ['#0d9488', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

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
          <button class="viewBtn" data-view="compare">📊 多地点对比</button>
        </div>
      </div>
      <div class="actions">
        <button class="ghost" id="importSample">载入示例</button>
        <label class="ghost file">导入CSV<input id="csvInput" type="file" accept=".csv,text/csv" /></label>
        <button class="ghost" id="exportCsv">导出CSV</button>
      </div>
    </section>

    <section class="layout" id="formSection">
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

    <section class="panel" id="mapSection">
      <div class="panelHead">
        <h2>站点地图概览</h2>
        <div class="mapFilters">
          <button class="ghost" id="clearMapFilter">显示全部站点</button>
        </div>
      </div>
      <div class="mapLayout">
        <div id="mapContainer" class="mapContainer"></div>
        <div class="mapLegend" id="mapLegend"></div>
      </div>
      <div id="mapSelectedInfo" class="mapSelectedInfo"></div>
    </section>

    <section class="panel" id="stationSection">
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

    <section class="panel" id="snapshotSection">
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

    <section class="panel" id="oplogSection">
      <div class="panelHead">
        <h2>离线观测队列</h2>
        <div class="oplogActions">
          <span id="oplogCount" class="countBadge"></span>
          <button class="ghost" id="undoBtn" style="background:#fef3c7;color:#92400e;">↩️ 撤销最近操作</button>
          <button class="ghost" id="replayBtn" style="background:#dbeafe;color:#1e40af;">▶️ 重放全部操作</button>
          <button class="ghost" id="clearOpLogBtn" style="background:#fee2e2;color:#dc2626;">🗑️ 清空日志</button>
        </div>
      </div>
      <p class="oplogHint">所有新增、编辑、删除操作都会被记录。撤销可以回退最近一次操作，重放会根据操作日志从初始状态重新执行所有操作。刷新页面后仍然有效。</p>
      <div class="tableWrap"><table><thead><tr><th>时间</th><th>操作类型</th><th>内容</th><th></th></tr></thead><tbody id="oplogRows"></tbody></table></div>
    </section>

    <section class="panel" id="compareViewSection" style="display:none;">
      <div class="panelHead">
        <h2>多地点对比分析</h2>
        <span id="compareDataQuality" class="countBadge"></span>
      </div>
      
      <div class="compareLayout">
        <div class="compareControls">
          <div class="panel form">
            <h3>选择观测地点</h3>
            <div class="placeCheckboxes" id="placeCheckboxes"></div>
            <p class="compareHint">至少选择2个地点进行对比</p>
          </div>
          
          <div class="panel form">
            <h3>选择日期范围</h3>
            <div class="pair">
              <div>
                <label class="fieldLabel">开始日期</label>
                <input type="date" id="compareStartDate" />
              </div>
              <div>
                <label class="fieldLabel">结束日期</label>
                <input type="date" id="compareEndDate" />
              </div>
            </div>
            <button class="primary" id="applyCompareBtn">应用筛选</button>
            <button class="ghost" id="resetCompareBtn">重置</button>
          </div>
          
          <div class="panel">
            <h3>数据质量摘要</h3>
            <div id="compareSummary"></div>
          </div>
        </div>
        
        <div class="compareCharts">
          <div class="panel chartPanel">
            <div class="panelHead">
              <h2>潮位趋势对比</h2>
              <span class="chartSubtitle">每日平均潮位变化</span>
            </div>
            <div id="tideTrendChart" class="chart wideChart"></div>
          </div>
          
          <div class="gridTwo">
            <div class="panel chartPanel">
              <div class="panelHead">
                <h2>潮位区间对比</h2>
                <span class="chartSubtitle">最低-最高潮位范围</span>
              </div>
              <div id="tideRangeChart" class="chart"></div>
            </div>
            <div class="panel chartPanel">
              <div class="panelHead">
                <h2>风速分布散点</h2>
                <span class="chartSubtitle">每条记录的风速值</span>
              </div>
              <div id="windStripChart" class="chart"></div>
            </div>
          </div>
          
          <div class="gridTwo">
            <div class="panel chartPanel">
              <div class="panelHead">
                <h2>综合指标雷达图</h2>
                <span class="chartSubtitle">多维度综合对比</span>
              </div>
              <div id="radarCompareChart" class="chart"></div>
            </div>
            <div class="panel chartPanel">
              <div class="panelHead">
                <h2>天气分布环形图</h2>
                <span class="chartSubtitle">各天气类型占比</span>
              </div>
              <div id="weatherDonutChart" class="chart"></div>
            </div>
          </div>
          
          <div class="panel chartPanel">
            <div class="panelHead">
              <h2>潮位分布箱线图</h2>
              <span class="chartSubtitle">四分位数与异常值</span>
            </div>
            <div id="boxplotCompareChart" class="chart wideChart"></div>
          </div>
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

  <div class="chartTooltip" id="chartTooltip"></div>
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
  if (editingId) {
    const before = records.find((r) => r.id === editingId);
    logOperation('edit', before, item);
    records = records.map((record) => (record.id === editingId ? item : record));
  } else {
    logOperation('add', null, item);
    records = [item, ...records];
  }
  editingId = null;
  form.reset();
  persist();
  render();
});

search.addEventListener('input', render);
placeFilter.addEventListener('change', () => {
  const selectedValue = placeFilter.value;
  if (selectedValue) {
    const station = stations.find(s => s.name === selectedValue);
    if (station) {
      mapSelectedStationId = station.id;
    }
  } else {
    mapSelectedStationId = null;
  }
  render();
});
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

document.querySelector('#undoBtn').addEventListener('click', undoLastOperation);
document.querySelector('#replayBtn').addEventListener('click', () => {
  const count = replayAllOperations();
  if (count > 0) {
    alert(`✅ 已成功重放 ${count} 条操作`);
  }
});
document.querySelector('#clearOpLogBtn').addEventListener('click', clearOpLog);

document.querySelector('#applyCompareBtn').addEventListener('click', () => {
  compareStartDate = document.querySelector('#compareStartDate').value;
  compareEndDate = document.querySelector('#compareEndDate').value;
  render();
});

document.querySelector('#resetCompareBtn').addEventListener('click', () => {
  compareSelectedPlaces = [];
  compareStartDate = '';
  compareEndDate = '';
  initCompareDefaults();
  render();
});

document.querySelector('#clearMapFilter').addEventListener('click', () => {
  mapSelectedStationId = null;
  const placeFilter = document.querySelector('#placeFilter');
  if (placeFilter) placeFilter.value = '';
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

function loadOpLog() {
  return JSON.parse(localStorage.getItem(opLogStorageKey) || '[]');
}

function persistOpLog(opLog) {
  localStorage.setItem(opLogStorageKey, JSON.stringify(opLog));
}

function logOperation(type, before, after) {
  const opLog = loadOpLog();
  const entry = {
    id: crypto.randomUUID(),
    type,
    timestamp: Date.now(),
    before: before ? JSON.parse(JSON.stringify(before)) : null,
    after: after ? JSON.parse(JSON.stringify(after)) : null
  };
  opLog.push(entry);
  persistOpLog(opLog);
}

function undoLastOperation() {
  const opLog = loadOpLog();
  if (opLog.length === 0) {
    alert('没有可撤销的操作');
    return false;
  }
  const lastOp = opLog.pop();
  persistOpLog(opLog);

  switch (lastOp.type) {
    case 'add':
      records = records.filter((r) => r.id !== lastOp.after.id);
      break;
    case 'edit':
      records = records.map((r) =>
        r.id === lastOp.before.id ? lastOp.before : r
      );
      break;
    case 'delete':
      records = [...records, lastOp.before];
      break;
    default:
      return false;
  }

  persist();
  if (editingId) {
    editingId = null;
    form.reset();
  }
  render();
  return true;
}

function replayAllOperations() {
  const opLog = loadOpLog();
  if (opLog.length === 0) {
    alert('没有可重放的操作日志');
    return 0;
  }
  records = load();
  const recordMap = new Map(records.map((r) => [r.id, r]));

  for (const op of opLog) {
    switch (op.type) {
      case 'add':
        recordMap.set(op.after.id, JSON.parse(JSON.stringify(op.after)));
        break;
      case 'edit':
        if (recordMap.has(op.before.id)) {
          recordMap.set(op.after.id, JSON.parse(JSON.stringify(op.after)));
        }
        break;
      case 'delete':
        recordMap.delete(op.before.id);
        break;
    }
  }

  records = Array.from(recordMap.values());
  persist();
  render();
  return opLog.length;
}

function clearOpLog() {
  if (!confirm('确定要清空所有操作日志吗？清空后将无法再撤销之前的操作。')) {
    return;
  }
  persistOpLog([]);
  render();
}

function getOpTypeLabel(type) {
  const map = { add: '新增', edit: '编辑', delete: '删除' };
  return map[type] || type;
}

function getOpDescription(op) {
  if (op.type === 'add') {
    return `${op.after.place} ${op.after.date} ${op.after.time} 潮位${op.after.level}cm`;
  } else if (op.type === 'edit') {
    return `${op.after.place} ${op.after.date} ${op.after.time}`;
  } else if (op.type === 'delete') {
    return `${op.before.place} ${op.before.date} ${op.before.time} 潮位${op.before.level}cm`;
  }
  return '';
}

function formatOpTime(timestamp) {
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function getRecordCountForStation(stationName) {
  return records.filter((record) => record.place === stationName).length;
}

const mapSeaAreaColors = {
  '东海': '#0d9488',
  '黄海': '#f59e0b',
  '渤海': '#8b5cf6',
  '南海': '#ef4444',
  '太平洋': '#14b8a6',
  'default': '#6366f1'
};

function getSeaAreaColor(seaArea) {
  return mapSeaAreaColors[seaArea] || mapSeaAreaColors['default'];
}

function projectCoordToMap(longitude, latitude, bounds, width, height, padding = 40) {
  const { minLng, maxLng, minLat, maxLat } = bounds;
  const lngRange = maxLng - minLng || 1;
  const latRange = maxLat - minLat || 1;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const x = padding + ((longitude - minLng) / lngRange) * usableWidth;
  const y = height - padding - ((latitude - minLat) / latRange) * usableHeight;
  return { x, y };
}

function getMapBounds(stationList) {
  if (stationList.length === 0) {
    return { minLng: 120, maxLng: 125, minLat: 28, maxLat: 32 };
  }
  const lngs = stationList.map(s => s.longitude);
  const lats = stationList.map(s => s.latitude);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const lngPad = (maxLng - minLng) * 0.2 || 0.5;
  const latPad = (maxLat - minLat) * 0.2 || 0.5;
  return {
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
    minLat: minLat - latPad,
    maxLat: maxLat + latPad
  };
}

function getStationRadius(recordCount) {
  if (recordCount === 0) return 14;
  if (recordCount <= 3) return 16;
  if (recordCount <= 10) return 20;
  if (recordCount <= 30) return 24;
  return 28;
}

function selectMapStation(stationId) {
  if (mapSelectedStationId === stationId) {
    mapSelectedStationId = null;
    const placeFilter = document.querySelector('#placeFilter');
    if (placeFilter) placeFilter.value = '';
  } else {
    mapSelectedStationId = stationId;
    const station = stations.find(s => s.id === stationId);
    if (station) {
      const placeFilter = document.querySelector('#placeFilter');
      if (placeFilter) {
        placeFilter.value = station.name;
      }
    }
  }
  render();
}

function renderStationMap() {
  const mapContainer = document.querySelector('#mapContainer');
  const legendContainer = document.querySelector('#mapLegend');
  const selectedInfo = document.querySelector('#mapSelectedInfo');

  if (!mapContainer) return;

  if (stations.length === 0) {
    mapContainer.innerHTML = `
      <div class="mapEmpty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        <div>暂无站点数据，请先添加观测站点</div>
      </div>
    `;
    legendContainer.innerHTML = '';
    selectedInfo.classList.remove('active');
    return;
  }

  const width = 800;
  const height = 340;
  const bounds = getMapBounds(stations);
  const padding = 50;

  const seaAreas = [...new Set(stations.map(s => s.seaArea).filter(Boolean))];

  let gridLines = '';
  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const x = padding + (i / gridSteps) * (width - padding * 2);
    const y = padding + (i / gridSteps) * (height - padding * 2);
    gridLines += `<line class="mapGridLine" x1="${x}" y1="${padding}" x2="${x}" y2="${height - padding}" />`;
    gridLines += `<line class="mapGridLine" x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" />`;
  }

  let axisLabels = '';
  for (let i = 0; i <= gridSteps; i++) {
    const lng = bounds.minLng + (i / gridSteps) * (bounds.maxLng - bounds.minLng);
    const lat = bounds.maxLat - (i / gridSteps) * (bounds.maxLat - bounds.minLat);
    const x = padding + (i / gridSteps) * (width - padding * 2);
    const y = padding + (i / gridSteps) * (height - padding * 2);
    axisLabels += `<text class="mapAxisLabel" x="${x}" y="${height - padding + 16}" text-anchor="middle">${lng.toFixed(1)}°E</text>`;
    axisLabels += `<text class="mapAxisLabel" x="${padding - 6}" y="${y + 4}" text-anchor="end">${lat.toFixed(1)}°N</text>`;
  }

  let seaLabels = '';
  seaAreas.forEach((sea) => {
    const seaStations = stations.filter(s => s.seaArea === sea);
    if (seaStations.length > 0) {
      const avgLng = seaStations.reduce((sum, s) => sum + s.longitude, 0) / seaStations.length;
      const avgLat = seaStations.reduce((sum, s) => sum + s.latitude, 0) / seaStations.length;
      const pos = projectCoordToMap(avgLng, avgLat, bounds, width, height, padding);
      seaLabels += `<text class="mapSeaLabel" x="${pos.x}" y="${pos.y}">${sea}</text>`;
    }
  });

  let stationNodes = '';
  stations.forEach((station) => {
    const recordCount = getRecordCountForStation(station.name);
    const pos = projectCoordToMap(station.longitude, station.latitude, bounds, width, height, padding);
    const isSelected = mapSelectedStationId === station.id;
    const radius = getStationRadius(recordCount);
    const color = getSeaAreaColor(station.seaArea);

    stationNodes += `
      <g class="mapStation ${isSelected ? 'selected' : ''}" data-station-id="${station.id}" data-station-name="${station.name}">
        <circle cx="${pos.x}" cy="${pos.y}" r="${radius}" fill="${color}" fill-opacity="${isSelected ? 1 : 0.85}" stroke="${isSelected ? '#ef4444' : 'white'}" stroke-width="${isSelected ? 3 : 2}" />
        <text class="mapStationCount" x="${pos.x}" y="${pos.y}">${recordCount}</text>
        <text class="mapStationLabel" x="${pos.x}" y="${pos.y - radius - 8}">${escapeHtml(station.name)}</text>
        <text class="mapStationSubLabel" x="${pos.x}" y="${pos.y + radius + 16}">${escapeHtml(station.seaArea || '-')}</text>
      </g>
    `;
  });

  mapContainer.innerHTML = `
    <div class="mapCompass">🧭</div>
    <div class="mapScale">约 ${((bounds.maxLng - bounds.minLng) * 111).toFixed(0)} km</div>
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="mapWavePattern" patternUnits="userSpaceOnUse" width="40" height="40">
          <path d="M0 20 Q 10 15, 20 20 T 40 20" fill="none" stroke="rgba(13, 148, 136, 0.06)" stroke-width="2"/>
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#mapWavePattern)"/>
      ${gridLines}
      ${seaLabels}
      ${axisLabels}
      ${stationNodes}
    </svg>
  `;

  mapContainer.querySelectorAll('.mapStation').forEach((node) => {
    node.addEventListener('click', () => {
      selectMapStation(node.dataset.stationId);
    });
  });

  let legendHtml = '<h4>海域图例</h4>';
  seaAreas.forEach((sea) => {
    const count = stations.filter(s => s.seaArea === sea).length;
    legendHtml += `
      <div class="mapLegendItem">
        <span class="mapLegendDot" style="background:${getSeaAreaColor(sea)}"></span>
        <span>${escapeHtml(sea)} (${count}个站点)</span>
      </div>
    `;
  });
  legendHtml += '<h4 style="margin-top:8px">点位大小</h4>';
  legendHtml += `
    <div class="mapLegendItem">
      <span class="mapLegendDot" style="background:#0d9488;width:12px;height:12px"></span>
      <span>记录较少</span>
    </div>
    <div class="mapLegendItem">
      <span class="mapLegendDot" style="background:#0d9488;width:18px;height:18px"></span>
      <span>记录中等</span>
    </div>
    <div class="mapLegendItem">
      <span class="mapLegendDot" style="background:#0d9488;width:24px;height:24px"></span>
      <span>记录较多</span>
    </div>
  `;
  legendContainer.innerHTML = legendHtml;

  if (mapSelectedStationId) {
    const station = stations.find(s => s.id === mapSelectedStationId);
    if (station) {
      const recordCount = getRecordCountForStation(station.name);
      selectedInfo.classList.add('active');
      selectedInfo.innerHTML = `
        <strong>📍 ${escapeHtml(station.name)}</strong>
        <span>${escapeHtml(station.seaArea || '未知海域')}</span>
        <span>·</span>
        <span>经度 ${station.longitude.toFixed(4)}°, 纬度 ${station.latitude.toFixed(4)}°</span>
        <span>·</span>
        <span>${recordCount} 条观测记录</span>
        <span style="margin-left:12px;color:#0d9488;font-size:13px;">点击"显示全部站点"或再次点击该点位可取消筛选</span>
      `;
    } else {
      selectedInfo.classList.remove('active');
    }
  } else {
    selectedInfo.classList.remove('active');
  }
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
  if (mapSelectedStationId === id) {
    mapSelectedStationId = null;
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

function renderOpLog() {
  const opLog = loadOpLog().slice().reverse();
  const countEl = document.querySelector('#oplogCount');
  const rowsEl = document.querySelector('#oplogRows');
  const undoBtn = document.querySelector('#undoBtn');
  const replayBtn = document.querySelector('#replayBtn');
  const clearBtn = document.querySelector('#clearOpLogBtn');

  countEl.textContent = `${opLog.length} 条操作`;

  const hasOps = opLog.length > 0;
  undoBtn.disabled = !hasOps;
  replayBtn.disabled = !hasOps;
  clearBtn.disabled = !hasOps;
  undoBtn.style.opacity = hasOps ? '1' : '0.5';
  replayBtn.style.opacity = hasOps ? '1' : '0.5';
  clearBtn.style.opacity = hasOps ? '1' : '0.5';
  undoBtn.style.cursor = hasOps ? 'pointer' : 'not-allowed';
  replayBtn.style.cursor = hasOps ? 'pointer' : 'not-allowed';
  clearBtn.style.cursor = hasOps ? 'pointer' : 'not-allowed';

  if (!hasOps) {
    rowsEl.innerHTML = '<tr><td colspan="4"><p class="empty" style="text-align:center;padding:32px 16px;">暂无操作记录，新增、编辑或删除潮汐记录后将在此显示</p></td></tr>';
    return;
  }

  const typeClassMap = {
    add: 'opTypeAdd',
    edit: 'opTypeEdit',
    delete: 'opTypeDelete'
  };

  rowsEl.innerHTML = opLog.map((op, index) => `
    <tr class="${index === 0 ? 'opRowLatest' : ''}">
      <td>${formatOpTime(op.timestamp)}</td>
      <td><span class="opTypeTag ${typeClassMap[op.type] || ''}">${getOpTypeLabel(op.type)}</span></td>
      <td>${escapeHtml(getOpDescription(op))}</td>
      <td>${index === 0 ? '<span class="latestBadge">可撤销</span>' : ''}</td>
    </tr>
  `).join('');
}

function render() {
  document.querySelectorAll('.viewBtn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === currentView);
  });
  
  if (currentView === 'compare') {
    renderCompareView();
    return;
  }
  
  document.querySelector('#formSection').style.display = '';
  document.querySelector('#listViewSection').style.display = currentView === 'list' ? '' : 'none';
  document.querySelector('#calendarViewSection').style.display = currentView === 'calendar' ? '' : 'none';
  document.querySelector('#compareViewSection').style.display = 'none';
  document.querySelector('#mapSection').style.display = '';
  document.querySelector('#stationSection').style.display = '';
  document.querySelector('#snapshotSection').style.display = '';
  
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
  const stationNames = stations.map((s) => s.name).sort();
  const recordPlaces = [...new Set(records.map((record) => record.place))].sort();
  const allPlaces = [...new Set([...stationNames, ...recordPlaces])].sort();
  placeFilter.innerHTML = `<option value="">全部地点</option>${allPlaces.map((place) => {
    const isStation = stationNames.includes(place);
    const recordCount = getRecordCountForStation(place);
    return `<option value="${place}">${place}${isStation ? '' : ' (历史)'}${recordCount > 0 ? ` (${recordCount}条)` : ' (0条)'}</option>`;
  }).join('')}`;
  placeFilter.value = selectedPlace && allPlaces.includes(selectedPlace) ? selectedPlace : '';

  const placeSelect = form.elements.place;
  const currentPlaceValue = placeSelect.value;
  
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
  renderOpLog();
  renderStationMap();
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
  const before = records.find((record) => record.id === id);
  if (before) {
    logOperation('delete', before, null);
  }
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

function initCompareDefaults() {
  const places = [...new Set(records.map((record) => record.place))].sort();
  if (places.length >= 2 && compareSelectedPlaces.length === 0) {
    compareSelectedPlaces = places.slice(0, Math.min(3, places.length));
  }
  if (!compareStartDate || !compareEndDate) {
    const dates = records.map((r) => r.date).sort();
    if (dates.length > 0) {
      compareStartDate = compareStartDate || dates[0];
      compareEndDate = compareEndDate || dates[dates.length - 1];
    }
  }
  document.querySelector('#compareStartDate').value = compareStartDate;
  document.querySelector('#compareEndDate').value = compareEndDate;
}

function getPlaceDateRange(place) {
  const placeRecords = records.filter((r) => r.place === place);
  if (placeRecords.length === 0) return null;
  const dates = placeRecords.map((r) => r.date).sort();
  return { min: dates[0], max: dates[dates.length - 1], count: placeRecords.length };
}

function getOverlappingDateRange(places) {
  const ranges = places.map((p) => getPlaceDateRange(p)).filter(Boolean);
  if (ranges.length === 0) return null;
  const maxStart = ranges.reduce((max, r) => (r.min > max ? r.min : max), ranges[0].min);
  const minEnd = ranges.reduce((min, r) => (r.max < min ? r.max : min), ranges[0].max);
  if (maxStart > minEnd) return null;
  return { start: maxStart, end: minEnd };
}

function getDatesInRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function calculateCompareStats(selectedPlaces, startDate, endDate) {
  const results = {};
  const allDates = getDatesInRange(startDate, endDate);
  
  selectedPlaces.forEach((place, idx) => {
    const placeRecords = records.filter(
      (r) => r.place === place && r.date >= startDate && r.date <= endDate
    );
    
    const datesWithData = [...new Set(placeRecords.map((r) => r.date))];
    const missingDates = allDates.filter((d) => !datesWithData.includes(d));
    
    const levels = placeRecords.map((r) => r.level);
    const winds = placeRecords.map((r) => r.wind);
    
    const weatherCount = {};
    placeRecords.forEach((r) => {
      weatherCount[r.weather] = (weatherCount[r.weather] || 0) + 1;
    });
    
    results[place] = {
      color: compareColors[idx % compareColors.length],
      index: idx,
      recordCount: placeRecords.length,
      expectedDays: allDates.length,
      daysWithData: datesWithData.length,
      missingDates: missingDates,
      avgLevel: levels.length ? avg(levels) : 0,
      maxLevel: levels.length ? Math.max(...levels) : 0,
      minLevel: levels.length ? Math.min(...levels) : 0,
      medianLevel: levels.length ? getMedian(levels) : 0,
      q1Level: levels.length ? getQuantile(levels, 0.25) : 0,
      q3Level: levels.length ? getQuantile(levels, 0.75) : 0,
      avgWind: winds.length ? avg(winds) : 0,
      maxWind: winds.length ? Math.max(...winds) : 0,
      weatherDistribution: weatherCount,
      dailyRecords: aggregateByDate(placeRecords),
      levels: levels.sort((a, b) => a - b),
      winds: winds.sort((a, b) => a - b)
    };
  });
  
  return results;
}

function getMedian(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function getQuantile(values, q) {
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
}

function renderPlaceCheckboxes() {
  const container = document.querySelector('#placeCheckboxes');
  const places = [...new Set(records.map((record) => record.place))].sort();
  
  if (places.length === 0) {
    container.innerHTML = '<p class="empty">暂无观测地点数据</p>';
    return;
  }
  
  container.innerHTML = places.map((place) => {
    const placeInfo = getPlaceDateRange(place);
    const isChecked = compareSelectedPlaces.includes(place);
    const recordCount = placeInfo ? placeInfo.count : 0;
    return `
      <label class="placeCheckbox">
        <input type="checkbox" data-place="${escapeHtml(place)}" ${isChecked ? 'checked' : ''} />
        <span class="checkboxLabel">${escapeHtml(place)}</span>
        <span class="recordCount">${recordCount}条</span>
      </label>
    `;
  }).join('');
  
  container.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const place = e.target.dataset.place;
      if (e.target.checked) {
        if (!compareSelectedPlaces.includes(place)) {
          compareSelectedPlaces.push(place);
        }
      } else {
        compareSelectedPlaces = compareSelectedPlaces.filter((p) => p !== place);
      }
      render();
    });
  });
}

function renderCompareSummary(stats, selectedPlaces) {
  const container = document.querySelector('#compareSummary');
  const qualityBadge = document.querySelector('#compareDataQuality');
  
  if (selectedPlaces.length < 2) {
    container.innerHTML = '<p class="empty">请至少选择2个地点进行对比</p>';
    qualityBadge.textContent = '';
    return;
  }
  
  const overlapping = getOverlappingDateRange(selectedPlaces);
  const effectiveStart = compareStartDate && overlapping ? (compareStartDate > overlapping.start ? compareStartDate : overlapping.start) : (overlapping ? overlapping.start : '');
  const effectiveEnd = compareEndDate && overlapping ? (compareEndDate < overlapping.end ? compareEndDate : overlapping.end) : (overlapping ? overlapping.end : '');
  const hasEffectiveOverlap = Boolean(overlapping && effectiveStart && effectiveEnd && effectiveStart <= effectiveEnd);
  
  let issues = [];
  if (!overlapping) {
    issues.push({ type: 'error', text: '所选地点没有共同的观测日期' });
  } else if (!hasEffectiveOverlap) {
    issues.push({ type: 'error', text: '所选日期范围与共同观测期不重叠' });
  } else {
    if (compareStartDate && compareStartDate < overlapping.start) {
      issues.push({ type: 'warning', text: `部分地点在 ${compareStartDate} 至 ${overlapping.start} 期间无数据` });
    }
    if (compareEndDate && compareEndDate > overlapping.end) {
      issues.push({ type: 'warning', text: `部分地点在 ${overlapping.end} 至 ${compareEndDate} 期间无数据` });
    }
  }
  
  selectedPlaces.forEach((place) => {
    const s = stats[place];
    if (s && s.missingDates.length > 0) {
      const missingPct = Math.round((s.missingDates.length / s.expectedDays) * 100);
      if (missingPct > 30) {
        issues.push({ type: 'warning', text: `${place} 数据缺失 ${missingPct}%` });
      }
    }
  });
  
  const minRecords = Math.min(...selectedPlaces.map((p) => stats[p]?.recordCount || 0));
  const maxRecords = Math.max(...selectedPlaces.map((p) => stats[p]?.recordCount || 0));
  if (maxRecords > minRecords * 2 && minRecords > 0) {
    issues.push({ type: 'info', text: `各地点记录数量差异较大 (${minRecords}-${maxRecords}条)` });
  }
  
  let qualityText = '数据良好';
  let qualityClass = 'compareQualityGood';
  if (issues.some((i) => i.type === 'error')) {
    qualityText = '数据不可用';
    qualityClass = 'compareQualityError';
  } else if (issues.some((i) => i.type === 'warning')) {
    qualityText = '存在数据问题';
    qualityClass = 'compareQualityWarning';
  }
  qualityBadge.textContent = qualityText;
  qualityBadge.className = `countBadge ${qualityClass}`;
  
  let issuesHtml = '';
  if (issues.length > 0) {
    issuesHtml = `
      <div class="compareIssues">
        ${issues.map((i) => `<div class="compareIssue ${i.type}">${i.text}</div>`).join('')}
      </div>
    `;
  }
  
  container.innerHTML = `
    <div class="compareSummaryGrid">
      ${selectedPlaces.map((place, idx) => {
        const s = stats[place];
        if (!s) {
          const dateRange = getPlaceDateRange(place);
          return `
            <div class="compareSummaryCard" style="border-left: 4px solid ${compareColors[idx % compareColors.length]}">
              <div class="compareSummaryTitle">${escapeHtml(place)}</div>
              <div class="compareSummaryStats">
                <div><span>记录数</span><strong>${dateRange ? dateRange.count : 0}</strong></div>
                <div><span>观测期</span><strong>${dateRange ? dateRange.min + ' ~ ' + dateRange.max : '无数据'}</strong></div>
              </div>
            </div>
          `;
        }
        const dataCompleteness = s.expectedDays > 0 ? Math.round((s.daysWithData / s.expectedDays) * 100) : 0;
        return `
          <div class="compareSummaryCard" style="border-left: 4px solid ${s.color}">
            <div class="compareSummaryTitle">${escapeHtml(place)}</div>
            <div class="compareSummaryStats">
              <div><span>记录数</span><strong>${s.recordCount}</strong></div>
              <div><span>有数据天数</span><strong>${s.daysWithData}/${s.expectedDays}</strong></div>
              <div><span>数据完整度</span><strong>${dataCompleteness}%</strong></div>
            </div>
            <div class="completenessBar">
              <div class="completenessFill" style="width: ${dataCompleteness}%; background: ${s.color}"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
    ${hasEffectiveOverlap ? `
      <div class="compareDateInfo">
        <strong>共同观测期：</strong>${effectiveStart} 至 ${effectiveEnd}
      </div>
    ` : `
      <div class="compareDateInfo" style="color: #dc2626;">
        <strong>无可重叠日期</strong> — ${overlapping ? '所选日期范围与共同观测期不重叠' : '各地点观测期不交叉'}
      </div>
    `}
    ${issuesHtml}
  `;
}

function drawGroupedBarChart(selector, stats, places, metricLabels, unit) {
  const el = document.querySelector(selector);
  if (places.length < 2) return (el.innerHTML = '<p class="empty">请选择至少2个地点</p>');
  
  const metrics = metricLabels.map((m) => m.key);
  const allValues = [];
  places.forEach((place) => {
    metrics.forEach((m) => {
      if (stats[place] && stats[place][m] !== undefined) {
        allValues.push(stats[place][m]);
      }
    });
  });
  
  if (allValues.length === 0) return (el.innerHTML = '<p class="empty">暂无数据</p>');
  
  const max = Math.max(...allValues) * 1.15;
  const chartWidth = 600;
  const chartHeight = 300;
  const padding = { top: 40, right: 20, bottom: 60, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  
  const groupWidth = innerWidth / metrics.length;
  const barWidth = (groupWidth * 0.7) / places.length;
  const barGap = groupWidth * 0.15;
  
  let bars = '';
  let labels = '';
  let legend = '';
  
  metrics.forEach((metric, mIdx) => {
    const groupX = padding.left + mIdx * groupWidth + barGap;
    
    labels += `<text x="${groupX + groupWidth / 2 - barGap / 2}" y="${chartHeight - 25}" text-anchor="middle" class="chartLabel">${metricLabels[mIdx].label}</text>`;
    
    places.forEach((place, pIdx) => {
      const s = stats[place];
      if (!s) return;
      
      const value = s[metric];
      const barHeight = (value / max) * innerHeight;
      const x = groupX + pIdx * barWidth;
      const y = padding.top + innerHeight - barHeight;
      
      bars += `
        <g>
          <rect x="${x}" y="${y}" width="${barWidth - 2}" height="${barHeight}" fill="${s.color}" rx="4">
            <title>${escapeHtml(place)} - ${metricLabels[mIdx].label}: ${Math.round(value)}${unit}</title>
          </rect>
          <text x="${x + barWidth / 2 - 1}" y="${y - 6}" text-anchor="middle" class="chartValue">${Math.round(value)}</text>
        </g>
      `;
    });
  });
  
  places.forEach((place, idx) => {
    const s = stats[place];
    if (!s) return;
    legend += `
      <g transform="translate(${padding.left + idx * 120}, 15)">
        <rect x="0" y="0" width="14" height="14" fill="${s.color}" rx="2"/>
        <text x="22" y="12" class="legendText">${escapeHtml(place)}</text>
      </g>
    `;
  });
  
  const yTicks = 5;
  let yAxis = '';
  for (let i = 0; i <= yTicks; i++) {
    const y = padding.top + (innerHeight / yTicks) * i;
    const value = Math.round(max - (max / yTicks) * i);
    yAxis += `<line x1="${padding.left}" y1="${y}" x2="${chartWidth - padding.right}" y2="${y}" stroke="#e0efec" stroke-width="1"/>`;
    yAxis += `<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" class="chartLabel">${value}${unit}</text>`;
  }
  
  el.innerHTML = `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img">
      ${yAxis}
      ${bars}
      ${labels}
      ${legend}
    </svg>
  `;
}

function drawRadarChart(selector, stats, places) {
  const el = document.querySelector(selector);
  if (places.length < 2) return (el.innerHTML = '<p class="empty">请选择至少2个地点</p>');
  
  const axes = [
    { key: 'avgLevel', label: '平均潮位', max: 400 },
    { key: 'maxLevel', label: '最高潮位', max: 400 },
    { key: 'avgWind', label: '平均风速', max: 30 },
    { key: 'maxWind', label: '最大风速', max: 40 },
    { key: 'daysWithData', label: '观测天数', max: Math.max(...places.map((p) => stats[p]?.expectedDays || 30)) }
  ];
  
  const chartWidth = 350;
  const chartHeight = 350;
  const centerX = chartWidth / 2;
  const centerY = chartHeight / 2;
  const radius = Math.min(chartWidth, chartHeight) / 2 - 60;
  const angleStep = (Math.PI * 2) / axes.length;
  
  let grid = '';
  let axisLabels = '';
  let polygons = '';
  let legend = '';
  
  for (let level = 1; level <= 5; level++) {
    const r = (radius / 5) * level;
    let points = '';
    axes.forEach((axis, idx) => {
      const angle = idx * angleStep - Math.PI / 2;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      points += `${x},${y} `;
    });
    grid += `<polygon points="${points.trim()}" fill="none" stroke="#e0efec" stroke-width="1"/>`;
  }
  
  axes.forEach((axis, idx) => {
    const angle = idx * angleStep - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    grid += `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" stroke="#e0efec" stroke-width="1"/>`;
    
    const labelX = centerX + (radius + 25) * Math.cos(angle);
    const labelY = centerY + (radius + 25) * Math.sin(angle);
    axisLabels += `<text x="${labelX}" y="${labelY}" text-anchor="middle" class="chartLabel">${axis.label}</text>`;
  });
  
  places.forEach((place, pIdx) => {
    const s = stats[place];
    if (!s) return;
    
    let points = '';
    axes.forEach((axis, idx) => {
      const angle = idx * angleStep - Math.PI / 2;
      const value = s[axis.key] || 0;
      const normalizedValue = Math.min(value / axis.max, 1);
      const r = radius * normalizedValue;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      points += `${x},${y} `;
    });
    
    polygons += `
      <polygon points="${points.trim()}" fill="${s.color}" fill-opacity="0.2" stroke="${s.color}" stroke-width="2">
        <title>${escapeHtml(place)}</title>
      </polygon>
    `;
    
    legend += `
      <g transform="translate(${20}, ${20 + pIdx * 25})">
        <rect x="0" y="0" width="14" height="14" fill="${s.color}" rx="2"/>
        <text x="22" y="12" class="legendText">${escapeHtml(place)}</text>
      </g>
    `;
  });
  
  el.innerHTML = `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img">
      ${grid}
      ${polygons}
      ${axisLabels}
      ${legend}
    </svg>
  `;
}

function drawStackedBarChart(selector, stats, places) {
  const el = document.querySelector(selector);
  if (places.length < 2) return (el.innerHTML = '<p class="empty">请选择至少2个地点</p>');
  
  const weatherTypes = ['晴', '多云', '阴', '小雨', '中雨', '大雨', '大风', '雾'];
  const weatherColors = {
    '晴': '#fbbf24',
    '多云': '#94a3b8',
    '阴': '#64748b',
    '小雨': '#60a5fa',
    '中雨': '#3b82f6',
    '大雨': '#1d4ed8',
    '大风': '#8b5cf6',
    '雾': '#9ca3af'
  };
  
  const chartWidth = 600;
  const chartHeight = 300;
  const padding = { top: 40, right: 120, bottom: 60, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  
  const barWidth = innerWidth / places.length * 0.7;
  const barGap = innerWidth / places.length * 0.15;
  
  let bars = '';
  let labels = '';
  let legend = '';
  
  places.forEach((place, pIdx) => {
    const s = stats[place];
    if (!s) return;
    
    const total = s.recordCount || 1;
    let currentY = padding.top + innerHeight;
    
    weatherTypes.forEach((weather) => {
      const count = s.weatherDistribution[weather] || 0;
      if (count === 0) return;
      
      const height = (count / total) * innerHeight;
      const x = padding.left + pIdx * (barWidth + barGap) + barGap;
      const y = currentY - height;
      currentY = y;
      
      bars += `
        <g>
          <rect x="${x}" y="${y}" width="${barWidth}" height="${height}" fill="${weatherColors[weather] || '#999'}" rx="2">
            <title>${escapeHtml(place)} - ${weather}: ${count}次 (${Math.round((count / total) * 100)}%)</title>
          </rect>
        </g>
      `;
    });
    
    labels += `<text x="${padding.left + pIdx * (barWidth + barGap) + barGap + barWidth / 2}" y="${chartHeight - 25}" text-anchor="middle" class="chartLabel">${escapeHtml(place)}</text>`;
  });
  
  weatherTypes.forEach((weather, idx) => {
    legend += `
      <g transform="translate(${chartWidth - padding.right + 10}, ${padding.top + idx * 22})">
        <rect x="0" y="0" width="14" height="14" fill="${weatherColors[weather] || '#999'}" rx="2"/>
        <text x="22" y="12" class="legendText">${weather}</text>
      </g>
    `;
  });
  
  const yTicks = 5;
  let yAxis = '';
  for (let i = 0; i <= yTicks; i++) {
    const y = padding.top + (innerHeight / yTicks) * (yTicks - i);
    const value = i * 20;
    yAxis += `<line x1="${padding.left}" y1="${y}" x2="${chartWidth - padding.right}" y2="${y}" stroke="#e0efec" stroke-width="1"/>`;
    yAxis += `<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" class="chartLabel">${value}%</text>`;
  }
  
  el.innerHTML = `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img">
      ${yAxis}
      ${bars}
      ${labels}
      ${legend}
    </svg>
  `;
}

function drawBoxplotChart(selector, stats, places) {
  const el = document.querySelector(selector);
  if (places.length < 2) return (el.innerHTML = '<p class="empty">请选择至少2个地点</p>');
  
  const allValues = [];
  places.forEach((place) => {
    const s = stats[place];
    if (s && s.levels.length > 0) {
      allValues.push(...s.levels);
    }
  });
  
  if (allValues.length === 0) return (el.innerHTML = '<p class="empty">暂无数据</p>');
  
  const min = Math.min(...allValues) * 0.9;
  const max = Math.max(...allValues) * 1.1;
  const range = max - min;
  
  const chartWidth = 700;
  const chartHeight = 300;
  const padding = { top: 40, right: 40, bottom: 60, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  
  const boxWidth = innerWidth / places.length * 0.5;
  const boxGap = innerWidth / places.length * 0.25;
  
  let boxes = '';
  let labels = '';
  let outliers = '';
  
  function getY(value) {
    return padding.top + innerHeight - ((value - min) / range) * innerHeight;
  }
  
  places.forEach((place, pIdx) => {
    const s = stats[place];
    if (!s || s.levels.length === 0) return;
    
    const centerX = padding.left + pIdx * (boxWidth + boxGap * 2) + boxGap + boxWidth / 2;
    const boxLeft = centerX - boxWidth / 2;
    
    const q1Y = getY(s.q1Level);
    const medianY = getY(s.medianLevel);
    const q3Y = getY(s.q3Level);
    const minY = getY(s.minLevel);
    const maxY = getY(s.maxLevel);
    const boxHeight = q3Y - q1Y;
    const iqr = s.q3Level - s.q1Level;
    const lowerFence = s.q1Level - 1.5 * iqr;
    const upperFence = s.q3Level + 1.5 * iqr;
    
    const whiskerMin = Math.max(s.minLevel, lowerFence);
    const whiskerMax = Math.min(s.maxLevel, upperFence);
    const whiskerMinY = getY(whiskerMin);
    const whiskerMaxY = getY(whiskerMax);
    
    s.levels.forEach((val) => {
      if (val < lowerFence || val > upperFence) {
        const outlierY = getY(val);
        outliers += `<circle cx="${centerX}" cy="${outlierY}" r="4" fill="${s.color}" stroke="white" stroke-width="1">
          <title>${escapeHtml(place)} 异常值: ${val}cm</title>
        </circle>`;
      }
    });
    
    boxes += `
      <g>
        <line x1="${centerX}" y1="${whiskerMaxY}" x2="${centerX}" y2="${q3Y}" stroke="${s.color}" stroke-width="2"/>
        <line x1="${centerX - 10}" y1="${whiskerMaxY}" x2="${centerX + 10}" y2="${whiskerMaxY}" stroke="${s.color}" stroke-width="2"/>
        <line x1="${centerX}" y1="${whiskerMinY}" x2="${centerX}" y2="${q1Y}" stroke="${s.color}" stroke-width="2"/>
        <line x1="${centerX - 10}" y1="${whiskerMinY}" x2="${centerX + 10}" y2="${whiskerMinY}" stroke="${s.color}" stroke-width="2"/>
        <rect x="${boxLeft}" y="${q1Y}" width="${boxWidth}" height="${boxHeight}" fill="${s.color}" fill-opacity="0.3" stroke="${s.color}" stroke-width="2" rx="2">
          <title>${escapeHtml(place)}: Q1=${Math.round(s.q1Level)}, 中位=${Math.round(s.medianLevel)}, Q3=${Math.round(s.q3Level)}</title>
        </rect>
        <line x1="${boxLeft}" y1="${medianY}" x2="${boxLeft + boxWidth}" y2="${medianY}" stroke="${s.color}" stroke-width="3"/>
        <text x="${centerX}" y="${q1Y - 8}" text-anchor="middle" class="chartValue">${Math.round(s.maxLevel)}</text>
        <text x="${centerX}" y="${q3Y + boxHeight + 20}" text-anchor="middle" class="chartValue">${Math.round(s.minLevel)}</text>
      </g>
    `;
    
    labels += `<text x="${centerX}" y="${chartHeight - 25}" text-anchor="middle" class="chartLabel">${escapeHtml(place)}</text>`;
  });
  
  const yTicks = 6;
  let yAxis = '';
  for (let i = 0; i <= yTicks; i++) {
    const value = min + (range / yTicks) * (yTicks - i);
    const y = getY(value);
    yAxis += `<line x1="${padding.left}" y1="${y}" x2="${chartWidth - padding.right}" y2="${y}" stroke="#e0efec" stroke-width="1"/>`;
    yAxis += `<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" class="chartLabel">${Math.round(value)}cm</text>`;
  }
  
  el.innerHTML = `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img">
      ${yAxis}
      ${boxes}
      ${outliers}
      ${labels}
    </svg>
  `;
}

function drawTideTrendChart(selector, stats, places, startDate, endDate) {
  const el = document.querySelector(selector);
  if (places.length < 2) return (el.innerHTML = '<p class="empty">请选择至少2个地点</p>');
  
  const allDates = getDatesInRange(startDate, endDate);
  if (allDates.length === 0) return (el.innerHTML = '<p class="empty">日期范围内无数据</p>');
  
  const chartWidth = 720;
  const chartHeight = 320;
  const padding = { top: 40, right: 30, bottom: 60, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  
  const allLevels = [];
  places.forEach((place) => {
    const s = stats[place];
    if (s && s.dailyRecords) {
      s.dailyRecords.forEach((dayRecords) => {
        dayRecords.forEach((r) => allLevels.push(r.level));
      });
    }
  });
  
  if (allLevels.length === 0) return (el.innerHTML = '<p class="empty">暂无潮位数据</p>');
  
  const maxLevel = Math.max(...allLevels) * 1.1;
  const minLevel = Math.min(...allLevels) * 0.9;
  const levelRange = maxLevel - minLevel;
  
  function getX(dateStr) {
    const idx = allDates.indexOf(dateStr);
    if (idx === -1) return null;
    return padding.left + (idx / Math.max(allDates.length - 1, 1)) * innerWidth;
  }
  
  function getY(level) {
    return padding.top + innerHeight - ((level - minLevel) / levelRange) * innerHeight;
  }
  
  let lines = '';
  let dots = '';
  let legend = '';
  
  places.forEach((place, pIdx) => {
    const s = stats[place];
    if (!s) return;
    
    const dailyAvgs = [];
    allDates.forEach((date) => {
      const dayRecords = s.dailyRecords.get(date);
      if (dayRecords && dayRecords.length > 0) {
        const avgVal = avg(dayRecords.map((r) => r.level));
        dailyAvgs.push({ date, value: avgVal });
      }
    });
    
    if (dailyAvgs.length === 0) return;
    
    let points = '';
    dailyAvgs.forEach((d) => {
      const x = getX(d.date);
      const y = getY(d.value);
      if (x !== null) {
        points += `${x},${y} `;
        dots += `
          <circle cx="${x}" cy="${y}" r="5" fill="${s.color}" stroke="white" stroke-width="2">
            <title>${escapeHtml(place)} · ${d.date} · 平均${Math.round(d.value)}cm</title>
          </circle>
        `;
      }
    });
    
    if (points.trim()) {
      lines += `<polyline points="${points.trim()}" fill="none" stroke="${s.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    
    legend += `
      <g transform="translate(${padding.left + pIdx * 130}, 12)">
        <line x1="0" y1="7" x2="20" y2="7" stroke="${s.color}" stroke-width="3"/>
        <circle cx="10" cy="7" r="4" fill="${s.color}" stroke="white" stroke-width="1.5"/>
        <text x="30" y="11" class="legendText">${escapeHtml(place)}</text>
      </g>
    `;
  });
  
  const yTicks = 5;
  let yAxis = '';
  for (let i = 0; i <= yTicks; i++) {
    const value = minLevel + (levelRange / yTicks) * (yTicks - i);
    const y = getY(value);
    yAxis += `<line x1="${padding.left}" y1="${y}" x2="${chartWidth - padding.right}" y2="${y}" stroke="#e0efec" stroke-width="1"/>`;
    yAxis += `<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" class="chartLabel">${Math.round(value)}cm</text>`;
  }
  
  let xLabels = '';
  const labelStep = Math.max(1, Math.floor(allDates.length / 8));
  allDates.forEach((date, idx) => {
    if (idx % labelStep === 0 || idx === allDates.length - 1) {
      const x = getX(date);
      if (x !== null) {
        xLabels += `<text x="${x}" y="${chartHeight - 35}" text-anchor="middle" class="chartLabel">${date.slice(5)}</text>`;
      }
    }
  });
  
  el.innerHTML = `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img">
      ${yAxis}
      ${lines}
      ${dots}
      ${xLabels}
      ${legend}
    </svg>
  `;
}

function drawDumbbellChart(selector, stats, places) {
  const el = document.querySelector(selector);
  if (places.length < 2) return (el.innerHTML = '<p class="empty">请选择至少2个地点</p>');
  
  const allValues = [];
  places.forEach((place) => {
    const s = stats[place];
    if (s) {
      allValues.push(s.minLevel, s.maxLevel);
    }
  });
  
  if (allValues.length === 0) return (el.innerHTML = '<p class="empty">暂无数据</p>');
  
  const max = Math.max(...allValues) * 1.1;
  const min = Math.min(...allValues) * 0.9;
  const range = max - min;
  
  const chartWidth = 380;
  const chartHeight = 300;
  const padding = { top: 30, right: 60, bottom: 40, left: 100 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  
  const rowHeight = innerHeight / places.length;
  
  function getX(value) {
    return padding.left + ((value - min) / range) * innerWidth;
  }
  
  let dumbbells = '';
  let yLabels = '';
  let valueLabels = '';
  
  places.forEach((place, pIdx) => {
    const s = stats[place];
    if (!s) return;
    
    const y = padding.top + pIdx * rowHeight + rowHeight / 2;
    
    const minX = getX(s.minLevel);
    const maxX = getX(s.maxLevel);
    const avgX = getX(s.avgLevel);
    
    dumbbells += `
      <line x1="${minX}" y1="${y}" x2="${maxX}" y2="${y}" stroke="${s.color}" stroke-width="4" stroke-linecap="round" opacity="0.3"/>
      <circle cx="${minX}" cy="${y}" r="8" fill="white" stroke="${s.color}" stroke-width="3">
        <title>${escapeHtml(place)} 最低潮位: ${Math.round(s.minLevel)}cm</title>
      </circle>
      <circle cx="${maxX}" cy="${y}" r="8" fill="${s.color}" stroke="white" stroke-width="2">
        <title>${escapeHtml(place)} 最高潮位: ${Math.round(s.maxLevel)}cm</title>
      </circle>
      <circle cx="${avgX}" cy="${y}" r="5" fill="#f59e0b" stroke="white" stroke-width="1.5">
        <title>${escapeHtml(place)} 平均潮位: ${Math.round(s.avgLevel)}cm</title>
      </circle>
    `;
    
    yLabels += `<text x="${padding.left - 15}" y="${y + 5}" text-anchor="end" class="chartLabel">${escapeHtml(place)}</text>`;
    
    valueLabels += `
      <text x="${minX}" y="${y - 14}" text-anchor="middle" class="chartValue" style="font-size: 10px;">${Math.round(s.minLevel)}</text>
      <text x="${maxX}" y="${y - 14}" text-anchor="middle" class="chartValue" style="font-size: 10px;">${Math.round(s.maxLevel)}</text>
    `;
  });
  
  let legend = `
    <g transform="translate(${padding.left}, ${chartHeight - 15})">
      <circle cx="0" cy="0" r="5" fill="white" stroke="#666" stroke-width="2"/>
      <text x="12" y="4" class="legendText">最低</text>
      <circle cx="60" cy="0" r="4" fill="#f59e0b" stroke="white" stroke-width="1.5"/>
      <text x="72" y="4" class="legendText">平均</text>
      <circle cx="120" cy="0" r="5" fill="#666" stroke="white" stroke-width="1.5"/>
      <text x="132" y="4" class="legendText">最高</text>
    </g>
  `;
  
  const xTicks = 5;
  let xAxis = '';
  for (let i = 0; i <= xTicks; i++) {
    const value = min + (range / xTicks) * i;
    const x = getX(value);
    xAxis += `<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${padding.top + innerHeight}" stroke="#e0efec" stroke-width="1"/>`;
    xAxis += `<text x="${x}" y="${chartHeight - 35}" text-anchor="middle" class="chartLabel">${Math.round(value)}cm</text>`;
  }
  
  el.innerHTML = `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img">
      ${xAxis}
      ${dumbbells}
      ${yLabels}
      ${valueLabels}
      ${legend}
    </svg>
  `;
}

function drawWindStripChart(selector, stats, places) {
  const el = document.querySelector(selector);
  if (places.length < 2) return (el.innerHTML = '<p class="empty">请选择至少2个地点</p>');
  
  const allWinds = [];
  places.forEach((place) => {
    const s = stats[place];
    if (s && s.winds.length > 0) {
      allWinds.push(...s.winds);
    }
  });
  
  if (allWinds.length === 0) return (el.innerHTML = '<p class="empty">暂无风速数据</p>');
  
  const maxWind = Math.max(...allWinds) * 1.1;
  const minWind = Math.min(...allWinds) * 0.9;
  const windRange = maxWind - minWind;
  
  const chartWidth = 380;
  const chartHeight = 300;
  const padding = { top: 30, right: 40, bottom: 50, left: 100 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  
  const rowHeight = innerHeight / places.length;
  
  function getX(wind) {
    return padding.left + ((wind - minWind) / windRange) * innerWidth;
  }
  
  let strips = '';
  let yLabels = '';
  let avgMarkers = '';
  
  places.forEach((place, pIdx) => {
    const s = stats[place];
    if (!s || s.winds.length === 0) return;
    
    const y = padding.top + pIdx * rowHeight + rowHeight / 2;
    const stripHalfHeight = Math.min(rowHeight * 0.35, 20);
    
    strips += `
      <rect x="${padding.left}" y="${y - stripHalfHeight}" width="${innerWidth}" height="${stripHalfHeight * 2}" fill="#f8faf9" rx="4"/>
    `;
    
    s.winds.forEach((wind, wIdx) => {
      const x = getX(wind);
      const jitterY = y + (Math.random() - 0.5) * stripHalfHeight * 1.2;
      const opacity = 0.6 + Math.random() * 0.4;
      strips += `
        <circle cx="${x}" cy="${jitterY}" r="4" fill="${s.color}" opacity="${opacity}">
          <title>${escapeHtml(place)} · ${wind}km/h</title>
        </circle>
      `;
    });
    
    const avgX = getX(s.avgWind);
    avgMarkers += `
      <line x1="${avgX}" y1="${y - stripHalfHeight - 5}" x2="${avgX}" y2="${y + stripHalfHeight + 5}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="3,2"/>
      <circle cx="${avgX}" cy="${y}" r="6" fill="#f59e0b" stroke="white" stroke-width="2">
        <title>${escapeHtml(place)} 平均风速: ${s.avgWind.toFixed(1)}km/h</title>
      </circle>
    `;
    
    yLabels += `<text x="${padding.left - 15}" y="${y + 5}" text-anchor="end" class="chartLabel">${escapeHtml(place)}</text>`;
  });
  
  const xTicks = 5;
  let xAxis = '';
  for (let i = 0; i <= xTicks; i++) {
    const value = minWind + (windRange / xTicks) * i;
    const x = getX(value);
    xAxis += `<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${padding.top + innerHeight}" stroke="#e0efec" stroke-width="1"/>`;
    xAxis += `<text x="${x}" y="${chartHeight - 30}" text-anchor="middle" class="chartLabel">${Math.round(value)}</text>`;
  }
  
  xAxis += `<text x="${chartWidth / 2}" y="${chartHeight - 10}" text-anchor="middle" class="chartLabel">风速 (km/h)</text>`;
  
  el.innerHTML = `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img">
      ${xAxis}
      ${strips}
      ${avgMarkers}
      ${yLabels}
    </svg>
  `;
}

function drawWeatherDonutChart(selector, stats, places) {
  const el = document.querySelector(selector);
  if (places.length < 2) return (el.innerHTML = '<p class="empty">请选择至少2个地点</p>');
  
  const weatherTypes = ['晴', '多云', '阴', '小雨', '中雨', '大雨', '大风', '雾'];
  const weatherColors = {
    '晴': '#fbbf24',
    '多云': '#94a3b8',
    '阴': '#64748b',
    '小雨': '#60a5fa',
    '中雨': '#3b82f6',
    '大雨': '#1d4ed8',
    '大风': '#8b5cf6',
    '雾': '#9ca3af'
  };
  
  const chartWidth = 480;
  const donutSize = 110;
  const chartHeight = 280;
  const centerY = chartHeight / 2 - 10;
  
  const donutGap = chartWidth / places.length;
  
  let donuts = '';
  let labels = '';
  let legend = '';
  
  places.forEach((place, pIdx) => {
    const s = stats[place];
    if (!s) return;
    
    const centerX = donutGap * pIdx + donutGap / 2;
    const total = s.recordCount || 1;
    
    let currentAngle = -Math.PI / 2;
    let segments = '';
    
    weatherTypes.forEach((weather) => {
      const count = s.weatherDistribution[weather] || 0;
      if (count === 0) return;
      
      const angle = (count / total) * Math.PI * 2;
      const endAngle = currentAngle + angle;
      
      const innerRadius = donutSize * 0.55;
      const outerRadius = donutSize * 0.85;
      
      const x1 = centerX + outerRadius * Math.cos(currentAngle);
      const y1 = centerY + outerRadius * Math.sin(currentAngle);
      const x2 = centerX + outerRadius * Math.cos(endAngle);
      const y2 = centerY + outerRadius * Math.sin(endAngle);
      const x3 = centerX + innerRadius * Math.cos(endAngle);
      const y3 = centerY + innerRadius * Math.sin(endAngle);
      const x4 = centerX + innerRadius * Math.cos(currentAngle);
      const y4 = centerY + innerRadius * Math.sin(currentAngle);
      
      const largeArc = angle > Math.PI ? 1 : 0;
      
      const path = `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
      
      segments += `
        <path d="${path}" fill="${weatherColors[weather] || '#999'}">
          <title>${escapeHtml(place)} · ${weather}: ${count}次 (${Math.round((count / total) * 100)}%)</title>
        </path>
      `;
      
      currentAngle = endAngle;
    });
    
    donuts += segments;
    
    donuts += `
      <circle cx="${centerX}" cy="${centerY}" r="${donutSize * 0.5}" fill="white"/>
      <text x="${centerX}" y="${centerY - 5}" text-anchor="middle" class="chartValue" style="font-size: 18px;">${s.recordCount}</text>
      <text x="${centerX}" y="${centerY + 15}" text-anchor="middle" class="chartLabel" style="font-size: 11px;">条记录</text>
    `;
    
    labels += `<text x="${centerX}" y="${chartHeight - 20}" text-anchor="middle" class="chartLabel" style="font-weight: 600; font-size: 13px;">${escapeHtml(place)}</text>`;
  });
  
  const legendY = chartHeight - 5;
  let legendX = 10;
  weatherTypes.slice(0, 6).forEach((weather, idx) => {
    legend += `
      <g transform="translate(${legendX}, ${legendY})">
        <rect x="0" y="0" width="10" height="10" fill="${weatherColors[weather]}" rx="2"/>
        <text x="14" y="9" class="legendText" style="font-size: 10px;">${weather}</text>
      </g>
    `;
    legendX += 55;
  });
  
  el.innerHTML = `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img">
      ${donuts}
      ${labels}
      ${legend}
    </svg>
  `;
}

function renderCompareView() {
  document.querySelector('#formSection').style.display = 'none';
  document.querySelector('#calendarViewSection').style.display = 'none';
  document.querySelector('#listViewSection').style.display = 'none';
  document.querySelector('#mapSection').style.display = 'none';
  document.querySelector('#stationSection').style.display = 'none';
  document.querySelector('#snapshotSection').style.display = 'none';
  document.querySelector('#oplogSection').style.display = '';
  document.querySelector('#compareViewSection').style.display = '';
  
  initCompareDefaults();
  renderPlaceCheckboxes();
  
  const selectedPlaces = compareSelectedPlaces.filter((p) => 
    records.some((r) => r.place === p)
  );
  
  const emptyMsg = '<p class="empty">请选择至少2个地点进行对比</p>';
  if (selectedPlaces.length < 2) {
    document.querySelector('#tideTrendChart').innerHTML = emptyMsg;
    document.querySelector('#tideRangeChart').innerHTML = emptyMsg;
    document.querySelector('#windStripChart').innerHTML = emptyMsg;
    document.querySelector('#radarCompareChart').innerHTML = emptyMsg;
    document.querySelector('#weatherDonutChart').innerHTML = emptyMsg;
    document.querySelector('#boxplotCompareChart').innerHTML = emptyMsg;
    renderCompareSummary({}, selectedPlaces);
    renderOpLog();
    return;
  }
  
  const overlapping = getOverlappingDateRange(selectedPlaces);
  let effectiveStart = compareStartDate;
  let effectiveEnd = compareEndDate;
  
  if (overlapping) {
    if (!effectiveStart || effectiveStart < overlapping.start) {
      effectiveStart = overlapping.start;
    }
    if (!effectiveEnd || effectiveEnd > overlapping.end) {
      effectiveEnd = overlapping.end;
    }
  }
  
  const chartIds = ['tideTrendChart', 'tideRangeChart', 'windStripChart', 'radarCompareChart', 'weatherDonutChart', 'boxplotCompareChart'];
  
  if (!effectiveStart || !effectiveEnd || effectiveStart > effectiveEnd) {
    const dateRanges = selectedPlaces.map((p) => {
      const r = getPlaceDateRange(p);
      return r ? `<div class="compareDateRangeItem"><strong>${escapeHtml(p)}</strong>：${r.min} ~ ${r.max}（${r.count}条记录）</div>` : `<div class="compareDateRangeItem"><strong>${escapeHtml(p)}</strong>：无数据</div>`;
    }).join('');
    const noOverlapMsg = `<div class="compareNoData"><p class="empty">所选地点在指定日期范围内无共同观测数据</p><div class="compareDateRangeList">${dateRanges}</div><p class="compareHint">请调整日期范围或更换地点</p></div>`;
    chartIds.forEach((id) => {
      document.querySelector('#' + id).innerHTML = noOverlapMsg;
    });
    renderCompareSummary({}, selectedPlaces);
    renderOpLog();
    return;
  }
  
  const stats = calculateCompareStats(selectedPlaces, effectiveStart, effectiveEnd);
  
  renderCompareSummary(stats, selectedPlaces);
  
  drawTideTrendChart('#tideTrendChart', stats, selectedPlaces, effectiveStart, effectiveEnd);
  drawDumbbellChart('#tideRangeChart', stats, selectedPlaces);
  drawWindStripChart('#windStripChart', stats, selectedPlaces);
  drawRadarChart('#radarCompareChart', stats, selectedPlaces);
  drawWeatherDonutChart('#weatherDonutChart', stats, selectedPlaces);
  drawBoxplotChart('#boxplotCompareChart', stats, selectedPlaces);
  renderOpLog();
}

render();
