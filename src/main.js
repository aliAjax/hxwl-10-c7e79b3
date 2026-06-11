import './styles.css';

const storageKey = 'hxwl-10-tide-records';
const stationStorageKey = 'hxwl-10-tide-stations';
const snapshotStorageKey = 'hxwl-10-tide-snapshots';
const opLogStorageKey = 'hxwl-10-tide-oplog';
const weatherDictStorageKey = 'hxwl-10-weather-dict';
const ruleStorageKey = 'hxwl-10-tide-rules';
const goalsStorageKey = 'hxwl-10-goals';
const practiceRecordsStorageKey = 'hxwl-10-practice-records';
const todayPlanStorageKey = 'hxwl-10-today-plan';

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

const weatherDictSeed = [
  { id: crypto.randomUUID(), name: '晴', icon: '☀️' },
  { id: crypto.randomUUID(), name: '多云', icon: '⛅' },
  { id: crypto.randomUUID(), name: '阴', icon: '☁️' },
  { id: crypto.randomUUID(), name: '小雨', icon: '🌧️' },
  { id: crypto.randomUUID(), name: '中雨', icon: '🌧️' },
  { id: crypto.randomUUID(), name: '大雨', icon: '🌧️' },
  { id: crypto.randomUUID(), name: '雷阵雨', icon: '⛈️' },
  { id: crypto.randomUUID(), name: '雪', icon: '❄️' },
  { id: crypto.randomUUID(), name: '雾', icon: '🌫️' },
  { id: crypto.randomUUID(), name: '大风', icon: '💨' }
];

let records = load();
let stations = loadStations();
let weatherDict = loadWeatherDict();
let editingId = null;
let editingStationId = null;
let editingWeatherDictId = null;
let pendingImportData = null;
let importMergeStrategy = 'skip';
let importAddUnknownStations = false;
let importAddUnknownWeather = false;
let currentView = 'list';
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();
let selectedCalendarDate = null;
let anomalyFilterEnabled = false;
let compareSelectedPlaces = [];
let compareStartDate = '';
let compareEndDate = '';
let mapSelectedStationId = null;
let reportSelectedPlaces = [];
let reportStartDate = '';
let reportEndDate = '';
let reportType = 'daily';
let reportGenerated = false;
let reportCache = null;

let goals = loadGoals();
let practiceRecords = loadPracticeRecords();
let editingGoalId = null;

let practiceTimerState = {
  isRunning: false,
  startTime: null,
  elapsedSeconds: 0,
  timerInterval: null,
  targetBPM: 60,
  currentBPM: 0,
  beatCount: 0,
  beatStartTime: null
};

const defaultAnomalyRules = {
  levelJumpThreshold: 100,
  levelJumpTimeWindowHours: 6,
  highWindThreshold: 20,
  enableDuplicateDetection: true
};

let anomalyRules = loadRules();
let ruleEditingMode = false;
let ruleDirtyForm = null;

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
          <button class="viewBtn" data-view="report">📄 报告生成</button>
          <button class="viewBtn" data-view="goals">🎯 观测目标</button>
          <button class="viewBtn" data-view="practice">⏱️ 观测中心</button>
        </div>
      </div>
      <div class="actions">
        <button class="ghost" id="importSample">载入示例</button>
        <div class="csvImportGroup">
          <label class="ghost file">导入CSV<input id="csvInput" type="file" accept=".csv,text/csv" /></label>
          <button class="ghost" id="downloadTemplate">📥 模板下载</button>
          <button class="ghost" id="showFieldHelp">📖 字段说明</button>
        </div>
        <button class="ghost" id="rulesCenterBtn" style="background:#ecfeff;color:#155e75;border-color:#a5f3fc;">⚙️ 预警规则</button>
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
          <input name="weather" placeholder="天气 (可从词典选择)" list="weatherDictList" required />
        </div>
        <datalist id="weatherDictList"></datalist>
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

    <section class="panel" id="weatherDictSection">
      <div class="panelHead">
        <h2>天气词典管理</h2>
        <div class="weatherDictHeadActions">
          <span id="weatherDictCount" class="countBadge"></span>
          <button class="ghost" id="resetWeatherDictBtn" style="background:#fef3c7;color:#92400e;">↩️ 恢复默认</button>
        </div>
      </div>
      <div class="weatherDictLayout">
        <form class="panel form weatherDictForm" id="weatherDictForm">
          <h3 id="weatherDictFormTitle">新增天气</h3>
          <div class="pair">
            <input name="name" placeholder="天气名称" required />
            <input name="icon" placeholder="图标emoji" required />
          </div>
          <div class="formActions">
            <button type="button" class="ghost" id="cancelWeatherDictEdit" style="display:none;">取消</button>
            <button class="primary" type="submit">保存</button>
          </div>
        </form>
        <div class="weatherDictList">
          <div class="tableWrap"><table><thead><tr><th>图标</th><th>天气名称</th><th>关联记录</th><th></th></tr></thead><tbody id="weatherDictRows"></tbody></table></div>
        </div>
      </div>
    </section>

    <section class="panel" id="rulesCenterSection">
      <div class="panelHead">
        <h2>⚙️ 潮汐预警规则中心</h2>
        <div class="rulesHeadActions">
          <span id="ruleStatusBadge" class="countBadge" style="background:#dcfce7;color:#166534;">使用当前配置</span>
          <button class="ghost" id="resetRulesBtn" style="background:#fef3c7;color:#92400e;">↩️ 恢复默认规则</button>
        </div>
      </div>
      <div id="rulesCenterBody" class="rulesCenterBody"></div>
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

    <section class="panel" id="reportViewSection" style="display:none;">
      <div class="panelHead">
        <h2>📄 观测报告生成</h2>
        <span id="reportStatusBadge" class="countBadge"></span>
      </div>

      <div class="reportLayout">
        <div class="reportControls">
          <div class="panel form">
            <h3>报告类型</h3>
            <div class="reportTypeGroup">
              <label class="reportTypeOption">
                <input type="radio" name="reportType" value="daily" ${reportType === 'daily' ? 'checked' : ''} />
                <span>📆 日报</span>
              </label>
              <label class="reportTypeOption">
                <input type="radio" name="reportType" value="weekly" ${reportType === 'weekly' ? 'checked' : ''} />
                <span>📅 周报</span>
              </label>
            </div>
          </div>

          <div class="panel form">
            <h3>选择日期范围</h3>
            <div class="pair">
              <div>
                <label class="fieldLabel">开始日期</label>
                <input type="date" id="reportStartDate" />
              </div>
              <div>
                <label class="fieldLabel">结束日期</label>
                <input type="date" id="reportEndDate" />
              </div>
            </div>
            <div class="reportQuickRange">
              <button type="button" class="ghost" data-range="today">今天</button>
              <button type="button" class="ghost" data-range="yesterday">昨天</button>
              <button type="button" class="ghost" data-range="7days">近7天</button>
              <button type="button" class="ghost" data-range="30days">近30天</button>
            </div>
          </div>

          <div class="panel form">
            <h3>选择观测站点</h3>
            <div class="reportPlaceCheckboxes" id="reportPlaceCheckboxes"></div>
            <p class="compareHint">至少选择1个站点</p>
          </div>

          <div class="panel form">
            <div class="reportActions">
              <button class="primary" id="generateReportBtn">📊 生成报告</button>
              <button class="ghost" id="resetReportBtn">重置条件</button>
            </div>
            <button class="primary exportBtn" id="exportReportHtmlBtn" style="display:none; background:#1e40af;">📥 导出为HTML</button>
          </div>
        </div>

        <div class="reportContent" id="reportContent">
          <div class="reportEmpty">
            <div class="reportEmptyIcon">📋</div>
            <h3>尚未生成报告</h3>
            <p>请在左侧选择报告类型、日期范围和观测站点，然后点击「生成报告」</p>
          </div>
        </div>
      </div>
    </section>

    <section class="panel" id="goalsViewSection" style="display:none;">
      <div class="goalsLayout">
        <div class="goalLeftCol">
          <form class="panel form goalForm" id="goalForm">
            <div class="panelHead">
              <h3 id="goalFormTitle">🎯 新增观测目标</h3>
            </div>
            <input name="title" placeholder="目标名称（如：6月潮位观测质量达标）" required />
            <div class="pair">
              <div>
                <label class="fieldLabel">目标类型</label>
                <select name="goalType" id="goalType">
                  <option value="bpm">质量分目标</option>
                  <option value="duration">观测时长目标</option>
                  <option value="combo">综合目标</option>
                </select>
              </div>
              <div>
                <label class="fieldLabel">优先级</label>
                <select name="priority" id="goalPriority">
                  <option value="high">🔴 高优先级</option>
                  <option value="medium" selected>🟡 中优先级</option>
                  <option value="low">🟢 低优先级</option>
                </select>
              </div>
            </div>
            <div class="pair">
              <div>
                <label class="fieldLabel">目标质量分</label>
                <input name="targetBPM" type="number" min="20" max="100" step="1" placeholder="例如: 90" />
              </div>
              <div>
                <label class="fieldLabel">起始质量分</label>
                <input name="startBPM" type="number" min="20" max="100" step="1" placeholder="例如: 60" />
              </div>
            </div>
            <div class="pair">
              <div>
                <label class="fieldLabel">周观测时长（分钟）</label>
                <input name="weeklyMinutes" type="number" min="1" step="1" placeholder="例如: 300" />
              </div>
              <div>
                <label class="fieldLabel">截止日期</label>
                <input name="deadline" type="date" />
              </div>
            </div>
            <textarea name="description" placeholder="目标描述、观测要点..."></textarea>
            <div class="formActions">
              <button type="button" class="ghost" id="cancelGoalEdit" style="display:none;">取消</button>
              <button class="primary" type="submit">💾 保存目标</button>
            </div>
          </form>

          <div class="panel" id="todayPlanPanel">
            <div class="panelHead">
              <h3>📅 今日观测计划</h3>
              <span id="todayDateBadge" class="countBadge"></span>
            </div>
            <div id="todayPlanContent"></div>
          </div>
        </div>

        <div class="goalRightCol">
          <div class="panel">
            <div class="panelHead">
              <h2>🎯 观测目标看板</h2>
              <div class="goalStatsRow" id="goalStatsRow"></div>
            </div>
            <div class="goalFilterTabs">
              <button class="goalFilterTab active" data-filter="active">进行中</button>
              <button class="goalFilterTab" data-filter="completed">已达成</button>
              <button class="goalFilterTab" data-filter="overdue">已逾期</button>
              <button class="goalFilterTab" data-filter="all">全部</button>
            </div>
            <div id="goalListContainer"></div>
          </div>
        </div>
      </div>
    </section>

    <section class="panel" id="practiceViewSection" style="display:none;">
      <div class="practiceLayout">
        <div class="practiceLeftCol">
          <div class="panel practiceTimerPanel">
            <div class="panelHead">
              <h2>⏱️ 现场观测计时</h2>
              <span id="practiceStatusBadge" class="countBadge" style="background:#e0f2fe;color:#075985;">准备中</span>
            </div>

            <div class="practiceSelectGoal">
              <label class="fieldLabel">选择观测目标</label>
              <select id="practiceGoalSelect">
                <option value="">-- 无目标自由观测 --</option>
              </select>
            </div>

            <div class="practiceBPMInputs">
              <div class="pair">
                <div>
                  <label class="fieldLabel">目标质量分</label>
                  <div class="bpmInputWrap">
                    <button class="bpmAdjustBtn" id="bpmMinus10">-10</button>
                    <button class="bpmAdjustBtn" id="bpmMinus5">-5</button>
                    <input id="practiceBPMInput" type="number" min="20" max="100" value="60" />
                    <button class="bpmAdjustBtn" id="bpmPlus5">+5</button>
                    <button class="bpmAdjustBtn" id="bpmPlus10">+10</button>
                  </div>
                </div>
                <div>
                  <label class="fieldLabel">定时提醒</label>
                  <div class="metronomeControl">
                    <button class="ghost" id="metronomeToggleBtn">🔔 开启提醒</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="timerDisplay">
              <div class="timerDigits" id="timerDigits">00:00:00</div>
              <div class="timerSubInfo">
                <span id="timerBPMDisplay">质量分: 60</span>
                <span id="timerGoalDisplay">未绑定目标</span>
              </div>
            </div>

            <div class="beatRecorder">
              <div class="panelHead" style="padding:0;margin-bottom:12px;">
                <h3 style="margin-bottom:0;">📊 质量评估（记录瞬时打分）</h3>
              </div>
              <p class="practiceHint">按 TAP 键对每次观测质量快速打分，系统会自动计算平均质量分</p>
              <div class="tapArea">
                <button class="tapBtn" id="tapBtn">TAP 打分</button>
                <div class="tapResult">
                  <div class="tapBPM" id="tapBPM">--</div>
                  <div class="tapSub">分</div>
                </div>
              </div>
              <div class="tapStats">
                <span>评估次数：<strong id="tapCount">0</strong></span>
                <span>平均质量分：<strong id="tapAvgBPM">--</strong></span>
              </div>
            </div>

            <div class="practiceControls">
              <button class="primary practiceStartBtn" id="practiceStartBtn">▶️ 开始观测</button>
              <button class="ghost practicePauseBtn" id="practicePauseBtn" disabled>⏸️ 暂停</button>
              <button class="ghost practiceStopBtn" id="practiceStopBtn" disabled style="background:#fee2e2;color:#dc2626;">⏹️ 结束</button>
            </div>
          </div>

          <div class="panel" id="todayPlanInPractice">
            <div class="panelHead">
              <h3>📅 今日观测计划</h3>
              <span id="planDateBadge2" class="countBadge"></span>
            </div>
            <div id="todayPlanInPracticeContent"></div>
          </div>
        </div>

        <div class="practiceRightCol">
          <div class="panel">
            <div class="panelHead">
              <h2>📊 观测记录</h2>
              <span id="practiceRecordCount" class="countBadge"></span>
            </div>
            <div class="practiceStats" id="practiceStatsSummary"></div>
            <div class="practiceRecordList" id="practiceRecordList"></div>
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

  <div class="fieldHelpBackdrop" id="fieldHelpBackdrop" style="display:none;">
    <div class="fieldHelpPanel">
      <div class="fieldHelpHead">
        <h2>CSV导入字段说明</h2>
        <button class="modalClose" id="closeFieldHelp">&times;</button>
      </div>
      <div class="fieldHelpBody">
        <div class="fieldHelpIntro">
          <p>导入CSV时，系统会自动识别以下中文或英文列名。请确保您的CSV文件包含所有<strong>必填字段</strong>，列名完全一致（不区分大小写）。</p>
          <p class="fieldHelpTip">💡 建议先下载模板，在模板基础上填写数据，可避免列名或格式错误。</p>
        </div>
        <table class="fieldHelpTable">
          <thead>
            <tr><th>字段名称</th><th>可选列名</th><th>必填</th><th>格式要求</th><th>示例</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="fieldTag required">地点</span></td>
              <td>地点、站点、place</td>
              <td>是</td>
              <td>不能为空，需为已有站点名称或自定义地点</td>
              <td>东极青浜</td>
            </tr>
            <tr>
              <td><span class="fieldTag required">日期</span></td>
              <td>日期、date</td>
              <td>是</td>
              <td>YYYY-MM-DD格式，必须为合法日历日期（含闰年校验）</td>
              <td>2026-06-10</td>
            </tr>
            <tr>
              <td><span class="fieldTag required">时间</span></td>
              <td>时间、time</td>
              <td>是</td>
              <td>建议HH:MM格式</td>
              <td>06:30</td>
            </tr>
            <tr>
              <td><span class="fieldTag required">潮位</span></td>
              <td>潮位、水位、level</td>
              <td>是</td>
              <td>必须为有效数字，单位cm</td>
              <td>156</td>
            </tr>
            <tr>
              <td><span class="fieldTag required">风向</span></td>
              <td>风向、windDir</td>
              <td>是</td>
              <td>文本，常见如东北、东南、南、西南等</td>
              <td>东北</td>
            </tr>
            <tr>
              <td><span class="fieldTag required">风速</span></td>
              <td>风速、wind</td>
              <td>是</td>
              <td>必须为有效数字，单位km/h</td>
              <td>12</td>
            </tr>
            <tr>
              <td><span class="fieldTag required">天气</span></td>
              <td>天气、weather</td>
              <td>是</td>
              <td>文本，建议使用天气词典中的名称</td>
              <td>晴</td>
            </tr>
            <tr>
              <td><span class="fieldTag optional">备注</span></td>
              <td>备注、说明、note</td>
              <td>否</td>
              <td>文本，可为空</td>
              <td>浪面平稳</td>
            </tr>
          </tbody>
        </table>
        <div class="fieldHelpNotes">
          <h3>⚠️ 常见错误</h3>
          <ul>
            <li><strong>日期格式错误</strong>：必须为YYYY-MM-DD，如2026-06-10，不支持2026/06/10或06-10-2026</li>
            <li><strong>非法日历日期</strong>：如6月31日、2月30日、非闰年2月29日等会被校验拒绝</li>
            <li><strong>潮位或风速非数字</strong>：如填入"abc"或留空均会报错</li>
            <li><strong>地点为空</strong>：地点列不能留空</li>
            <li><strong>列名不匹配</strong>：列名必须与上方"可选列名"完全一致（不区分大小写）</li>
          </ul>
        </div>
      </div>
      <div class="fieldHelpFoot">
        <button class="ghost" id="closeFieldHelpBtn">关闭</button>
        <button class="primary" id="downloadTemplateFromHelp">📥 下载导入模板</button>
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
const weatherDictForm = document.querySelector('#weatherDictForm');
const cancelWeatherDictEditBtn = document.querySelector('#cancelWeatherDictEdit');
const weatherDictFormTitle = document.querySelector('#weatherDictFormTitle');
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

document.querySelector('#downloadTemplate').addEventListener('click', downloadCsvTemplate);
document.querySelector('#showFieldHelp').addEventListener('click', () => {
  document.querySelector('#fieldHelpBackdrop').style.display = 'flex';
});
document.querySelector('#closeFieldHelp').addEventListener('click', () => {
  document.querySelector('#fieldHelpBackdrop').style.display = 'none';
});
document.querySelector('#closeFieldHelpBtn').addEventListener('click', () => {
  document.querySelector('#fieldHelpBackdrop').style.display = 'none';
});
document.querySelector('#downloadTemplateFromHelp').addEventListener('click', () => {
  downloadCsvTemplate();
});
document.querySelector('#fieldHelpBackdrop').addEventListener('click', (e) => {
  if (e.target.id === 'fieldHelpBackdrop') {
    document.querySelector('#fieldHelpBackdrop').style.display = 'none';
  }
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

weatherDictForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(weatherDictForm).entries());
  const weatherItem = {
    ...data,
    id: editingWeatherDictId || crypto.randomUUID()
  };
  weatherDict = editingWeatherDictId
    ? weatherDict.map((w) => (w.id === editingWeatherDictId ? weatherItem : w))
    : [weatherItem, ...weatherDict];
  editingWeatherDictId = null;
  weatherDictForm.reset();
  cancelWeatherDictEditBtn.style.display = 'none';
  weatherDictFormTitle.textContent = '新增天气';
  persistWeatherDict();
  render();
});

cancelWeatherDictEditBtn.addEventListener('click', () => {
  editingWeatherDictId = null;
  weatherDictForm.reset();
  cancelWeatherDictEditBtn.style.display = 'none';
  weatherDictFormTitle.textContent = '新增天气';
});

document.querySelector('#resetWeatherDictBtn').addEventListener('click', () => {
  if (confirm('确定要恢复默认天气词典吗？您自定义的天气词条将被替换为默认词条。')) {
    resetWeatherDict();
    render();
  }
});

document.querySelector('#rulesCenterBtn').addEventListener('click', scrollToRulesCenter);
document.querySelector('#resetRulesBtn').addEventListener('click', () => {
  if (confirm('确定要恢复默认预警规则吗？您自定义的阈值配置将被替换为系统默认值。')) {
    resetRules();
    ruleEditingMode = false;
    ruleDirtyForm = null;
    render();
  }
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

document.querySelectorAll('input[name="reportType"]').forEach((radio) => {
  radio.addEventListener('change', (e) => {
    reportType = e.target.value;
  });
});

document.querySelectorAll('[data-range]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const range = btn.dataset.range;
    const today = new Date();
    let start = new Date(today);
    let end = new Date(today);
    if (range === 'today') {
    } else if (range === 'yesterday') {
      start.setDate(start.getDate() - 1);
      end = new Date(start);
    } else if (range === '7days') {
      start.setDate(start.getDate() - 6);
    } else if (range === '30days') {
      start.setDate(start.getDate() - 29);
    }
    reportStartDate = start.toISOString().slice(0, 10);
    reportEndDate = end.toISOString().slice(0, 10);
    document.querySelector('#reportStartDate').value = reportStartDate;
    document.querySelector('#reportEndDate').value = reportEndDate;
  });
});

document.querySelector('#reportStartDate').addEventListener('change', (e) => {
  reportStartDate = e.target.value;
});

document.querySelector('#reportEndDate').addEventListener('change', (e) => {
  reportEndDate = e.target.value;
});

document.querySelector('#generateReportBtn').addEventListener('click', () => {
  reportStartDate = document.querySelector('#reportStartDate').value;
  reportEndDate = document.querySelector('#reportEndDate').value;
  if (!reportStartDate || !reportEndDate) {
    alert('请选择日期范围');
    return;
  }
  if (reportStartDate > reportEndDate) {
    alert('开始日期不能晚于结束日期');
    return;
  }
  if (reportSelectedPlaces.length === 0) {
    alert('请至少选择一个站点');
    return;
  }
  reportGenerated = true;
  reportCache = null;
  render();
});

document.querySelector('#resetReportBtn').addEventListener('click', () => {
  reportSelectedPlaces = [];
  reportStartDate = '';
  reportEndDate = '';
  reportType = 'daily';
  reportGenerated = false;
  reportCache = null;
  initReportDefaults();
  render();
});

document.querySelector('#exportReportHtmlBtn').addEventListener('click', exportReportAsHtml);

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

function loadWeatherDict() {
  return JSON.parse(localStorage.getItem(weatherDictStorageKey) || 'null') || weatherDictSeed;
}

function persistWeatherDict() {
  localStorage.setItem(weatherDictStorageKey, JSON.stringify(weatherDict));
}

function resetWeatherDict() {
  weatherDict = weatherDictSeed.map(item => ({ ...item, id: crypto.randomUUID() }));
  persistWeatherDict();
}

function loadRules() {
  try {
    const stored = localStorage.getItem(ruleStorageKey);
    if (!stored) {
      return { ...defaultAnomalyRules };
    }
    const parsed = JSON.parse(stored);
    return {
      levelJumpThreshold: typeof parsed.levelJumpThreshold === 'number' ? parsed.levelJumpThreshold : defaultAnomalyRules.levelJumpThreshold,
      levelJumpTimeWindowHours: typeof parsed.levelJumpTimeWindowHours === 'number' ? parsed.levelJumpTimeWindowHours : defaultAnomalyRules.levelJumpTimeWindowHours,
      highWindThreshold: typeof parsed.highWindThreshold === 'number' ? parsed.highWindThreshold : defaultAnomalyRules.highWindThreshold,
      enableDuplicateDetection: typeof parsed.enableDuplicateDetection === 'boolean' ? parsed.enableDuplicateDetection : defaultAnomalyRules.enableDuplicateDetection
    };
  } catch (e) {
    return { ...defaultAnomalyRules };
  }
}

function persistRules() {
  localStorage.setItem(ruleStorageKey, JSON.stringify(anomalyRules));
}

function resetRules() {
  anomalyRules = { ...defaultAnomalyRules };
  persistRules();
}

function isDefaultRules() {
  return anomalyRules.levelJumpThreshold === defaultAnomalyRules.levelJumpThreshold
    && anomalyRules.levelJumpTimeWindowHours === defaultAnomalyRules.levelJumpTimeWindowHours
    && anomalyRules.highWindThreshold === defaultAnomalyRules.highWindThreshold
    && anomalyRules.enableDuplicateDetection === defaultAnomalyRules.enableDuplicateDetection;
}

function scrollToRulesCenter() {
  const section = document.querySelector('#rulesCenterSection');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    section.style.transition = 'box-shadow 0.3s';
    section.style.boxShadow = '0 0 0 3px rgba(20,184,166,0.4)';
    setTimeout(() => { section.style.boxShadow = ''; }, 1500);
  }
}

function getWeatherDictIcon(name) {
  const item = weatherDict.find(w => w.name === name);
  return item ? item.icon : '🌤️';
}

function getRecordCountForWeather(weatherName) {
  return records.filter(r => r.weather === weatherName).length;
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
    weatherDict: JSON.parse(JSON.stringify(weatherDict)),
    recordCount: records.length,
    stationCount: stations.length,
    weatherDictCount: weatherDict.length
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
  if (snapshot.weatherDict) {
    weatherDict = JSON.parse(JSON.stringify(snapshot.weatherDict));
  }
  persist();
  persistStations();
  persistWeatherDict();
  editingId = null;
  editingStationId = null;
  editingWeatherDictId = null;
  form.reset();
  stationForm.reset();
  weatherDictForm.reset();
  cancelStationEditBtn.style.display = 'none';
  stationFormTitle.textContent = '新增站点';
  cancelWeatherDictEditBtn.style.display = 'none';
  weatherDictFormTitle.textContent = '新增天气';
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

function editWeatherDict(id) {
  const item = weatherDict.find((w) => w.id === id);
  editingWeatherDictId = id;
  weatherDictFormTitle.textContent = '编辑天气';
  cancelWeatherDictEditBtn.style.display = 'inline-block';
  Object.entries(item).forEach(([key, value]) => {
    if (weatherDictForm.elements[key]) weatherDictForm.elements[key].value = value;
  });
  weatherDictForm.elements.name.focus();
}

function removeWeatherDict(id) {
  const item = weatherDict.find((w) => w.id === id);
  const recordCount = getRecordCountForWeather(item.name);
  if (recordCount > 0) {
    if (!confirm(`该天气"${item.name}"关联了 ${recordCount} 条潮汐记录。删除后历史记录中的天气名称仍将保留，但无法再从词典中选择该天气。确定要删除吗？`)) {
      return;
    }
  } else {
    if (!confirm(`确定要删除天气"${item.name}"吗？`)) {
      return;
    }
  }
  weatherDict = weatherDict.filter((w) => w.id !== id);
  persistWeatherDict();
  if (editingWeatherDictId === id) {
    editingWeatherDictId = null;
    weatherDictForm.reset();
    cancelWeatherDictEditBtn.style.display = 'none';
    weatherDictFormTitle.textContent = '新增天气';
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
  return getWeatherDictIcon(weather);
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
          <span class="calendarDayWeather">${escapeHtml(weatherIcon)}</span>
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
              <td>${escapeHtml(record.time)}</td>
              <td>${escapeHtml(record.place)}</td>
              <td>${escapeHtml(record.level)}cm</td>
              <td>${escapeHtml(record.windDir)} ${escapeHtml(record.wind)}km/h</td>
              <td>${escapeHtml(record.weather)}</td>
              <td>${escapeHtml(record.note || '-')}</td>
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

function renderRulesCenter() {
  const body = document.querySelector('#rulesCenterBody');
  const statusBadge = document.querySelector('#ruleStatusBadge');
  const resetBtn = document.querySelector('#resetRulesBtn');

  if (!body) return;

  if (statusBadge) {
    if (isDefaultRules()) {
      statusBadge.textContent = '使用默认配置';
      statusBadge.style.background = '#e0f2fe';
      statusBadge.style.color = '#075985';
    } else {
      statusBadge.textContent = '使用自定义配置';
      statusBadge.style.background = '#fef3c7';
      statusBadge.style.color = '#92400e';
    }
  }

  if (resetBtn) {
    resetBtn.disabled = isDefaultRules();
    resetBtn.style.opacity = isDefaultRules() ? '0.5' : '1';
    resetBtn.style.cursor = isDefaultRules() ? 'not-allowed' : 'pointer';
  }

  if (!ruleEditingMode) {
    body.innerHTML = `
      <div class="rulesGrid">
        <div class="ruleCard jump">
          <div class="ruleCardHead">
            <span class="ruleIcon">📈</span>
            <span class="ruleTitle">潮位跳变阈值</span>
          </div>
          <div class="ruleCardValue">≥ ${anomalyRules.levelJumpThreshold} cm</div>
          <div class="ruleCardDesc">当同一地点相邻记录的潮位差超过该值时，判定为跳变异常</div>
        </div>
        <div class="ruleCard jump">
          <div class="ruleCardHead">
            <span class="ruleIcon">⏱️</span>
            <span class="ruleTitle">跳变时间窗口</span>
          </div>
          <div class="ruleCardValue">≤ ${anomalyRules.levelJumpTimeWindowHours} 小时</div>
          <div class="ruleCardDesc">判断潮位跳变的最大时间间隔，超过则不算短时间跳变</div>
        </div>
        <div class="ruleCard wind">
          <div class="ruleCardHead">
            <span class="ruleIcon">💨</span>
            <span class="ruleTitle">高风速无备注阈值</span>
          </div>
          <div class="ruleCardValue">≥ ${anomalyRules.highWindThreshold} km/h</div>
          <div class="ruleCardDesc">风速达到此阈值且备注为空时，判定为高风速无备注异常</div>
        </div>
        <div class="ruleCard duplicate">
          <div class="ruleCardHead">
            <span class="ruleIcon">🔁</span>
            <span class="ruleTitle">重复记录检测</span>
          </div>
          <div class="ruleCardValue">${anomalyRules.enableDuplicateDetection ? '✅ 已开启' : '❌ 已关闭'}</div>
          <div class="ruleCardDesc">同一地点同一时间存在多条记录时，判定为重复记录异常</div>
        </div>
      </div>
      <div class="ruleActions">
        <button class="primary" id="editRulesBtn">✏️ 编辑规则</button>
        <span class="ruleHint">规则保存在浏览器本地（localStorage），修改后立即对所有视图生效</span>
      </div>
    `;
    const editBtn = document.querySelector('#editRulesBtn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        ruleEditingMode = true;
        ruleDirtyForm = { ...anomalyRules };
        render();
      });
    }
  } else {
    const form = ruleDirtyForm || { ...anomalyRules };
    body.innerHTML = `
      <form class="rulesEditForm" id="rulesEditForm">
        <div class="rulesGrid">
          <div class="ruleCard edit jump">
            <div class="ruleCardHead">
              <span class="ruleIcon">📈</span>
              <span class="ruleTitle">潮位跳变阈值 (cm)</span>
            </div>
            <input type="number" name="levelJumpThreshold" min="1" step="1" value="${form.levelJumpThreshold}" required />
            <div class="ruleCardDesc">默认值：${defaultAnomalyRules.levelJumpThreshold} cm</div>
          </div>
          <div class="ruleCard edit jump">
            <div class="ruleCardHead">
              <span class="ruleIcon">⏱️</span>
              <span class="ruleTitle">跳变时间窗口 (小时)</span>
            </div>
            <input type="number" name="levelJumpTimeWindowHours" min="0.1" step="0.5" value="${form.levelJumpTimeWindowHours}" required />
            <div class="ruleCardDesc">默认值：${defaultAnomalyRules.levelJumpTimeWindowHours} 小时</div>
          </div>
          <div class="ruleCard edit wind">
            <div class="ruleCardHead">
              <span class="ruleIcon">💨</span>
              <span class="ruleTitle">高风速无备注阈值 (km/h)</span>
            </div>
            <input type="number" name="highWindThreshold" min="1" step="1" value="${form.highWindThreshold}" required />
            <div class="ruleCardDesc">默认值：${defaultAnomalyRules.highWindThreshold} km/h</div>
          </div>
          <div class="ruleCard edit duplicate">
            <div class="ruleCardHead">
              <span class="ruleIcon">🔁</span>
              <span class="ruleTitle">重复记录检测开关</span>
            </div>
            <label class="ruleSwitch">
              <input type="checkbox" name="enableDuplicateDetection" ${form.enableDuplicateDetection ? 'checked' : ''} />
              <span class="ruleSwitchSlider"></span>
            </label>
            <div class="ruleCardDesc">默认：${defaultAnomalyRules.enableDuplicateDetection ? '开启' : '关闭'}</div>
          </div>
        </div>
        <div class="ruleActions">
          <button type="button" class="ghost" id="cancelEditRulesBtn">取消</button>
          <button type="submit" class="primary" id="saveRulesBtn">💾 保存并应用规则</button>
        </div>
      </form>
    `;

    const editForm = document.querySelector('#rulesEditForm');
    const cancelBtn = document.querySelector('#cancelEditRulesBtn');
    const saveBtn = document.querySelector('#saveRulesBtn');

    function collectFormValues() {
      const levelJumpThresholdInput = editForm.querySelector('input[name="levelJumpThreshold"]');
      const levelJumpTimeWindowHoursInput = editForm.querySelector('input[name="levelJumpTimeWindowHours"]');
      const highWindThresholdInput = editForm.querySelector('input[name="highWindThreshold"]');
      const enableDuplicateDetectionInput = editForm.querySelector('input[name="enableDuplicateDetection"]');
      
      return {
        levelJumpThreshold: Number(levelJumpThresholdInput.value),
        levelJumpTimeWindowHours: Number(levelJumpTimeWindowHoursInput.value),
        highWindThreshold: Number(highWindThresholdInput.value),
        enableDuplicateDetection: enableDuplicateDetectionInput.checked
      };
    }

    function validateAndSaveRules() {
      const newRules = collectFormValues();
      if (isNaN(newRules.levelJumpThreshold) || newRules.levelJumpThreshold <= 0 ||
          isNaN(newRules.levelJumpTimeWindowHours) || newRules.levelJumpTimeWindowHours <= 0 ||
          isNaN(newRules.highWindThreshold) || newRules.highWindThreshold <= 0) {
        alert('所有数值阈值必须大于0，请检查输入。');
        return false;
      }
      anomalyRules = newRules;
      persistRules();
      ruleEditingMode = false;
      ruleDirtyForm = null;
      return true;
    }

    cancelBtn.addEventListener('click', () => {
      ruleEditingMode = false;
      ruleDirtyForm = null;
      render();
    });

    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (validateAndSaveRules()) {
        render();
      }
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (validateAndSaveRules()) {
          render();
        }
      });
    }

    editForm.querySelectorAll('input').forEach((inp) => {
      inp.addEventListener('input', () => {
        ruleDirtyForm = collectFormValues();
      });
    });
  }
}

function render() {
  document.querySelectorAll('.viewBtn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === currentView);
  });
  
  if (currentView === 'compare') {
    renderCompareView();
    return;
  }

  if (currentView === 'report') {
    renderReportView();
    return;
  }

  if (currentView === 'goals') {
    renderGoalsView();
    return;
  }

  if (currentView === 'practice') {
    renderPracticeView();
    return;
  }

  document.querySelector('#formSection').style.display = '';
  document.querySelector('#listViewSection').style.display = currentView === 'list' ? '' : 'none';
  document.querySelector('#calendarViewSection').style.display = currentView === 'calendar' ? '' : 'none';
  document.querySelector('#compareViewSection').style.display = 'none';
  document.querySelector('#reportViewSection').style.display = 'none';
  document.querySelector('#mapSection').style.display = '';
  document.querySelector('#stationSection').style.display = '';
  document.querySelector('#weatherDictSection').style.display = '';
  document.querySelector('#rulesCenterSection').style.display = '';
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
        <td><strong>${escapeHtml(station.name)}</strong></td>
        <td>${escapeHtml(station.seaArea)}</td>
        <td>${station.longitude.toFixed(4)}, ${station.latitude.toFixed(4)}</td>
        <td>${escapeHtml(station.note || '-')}</td>
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

  document.querySelector('#weatherDictCount').textContent = `${weatherDict.length} 个天气`;
  document.querySelector('#weatherDictRows').innerHTML = weatherDict
    .map((item) => {
      const recordCount = getRecordCountForWeather(item.name);
      return `<tr>
        <td style="font-size: 24px; text-align: center;">${escapeHtml(item.icon)}</td>
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td><span class="recordCount">${recordCount} 条</span></td>
        <td>
          <button data-edit-weather="${item.id}">编辑</button>
          <button data-del-weather="${item.id}">删除</button>
        </td>
      </tr>`;
    })
    .join('');
  document.querySelectorAll('[data-edit-weather]').forEach((button) =>
    button.addEventListener('click', () => editWeatherDict(button.dataset.editWeather))
  );
  document.querySelectorAll('[data-del-weather]').forEach((button) =>
    button.addEventListener('click', () => removeWeatherDict(button.dataset.delWeather))
  );

  const weatherDatalist = document.querySelector('#weatherDictList');
  if (weatherDatalist) {
    weatherDatalist.innerHTML = weatherDict.map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.icon)}</option>`).join('');
  }

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
      return `<tr class="${rowClass}"><td>${escapeHtml(record.date)} ${escapeHtml(record.time)}</td><td>${escapeHtml(record.place)}</td><td>${escapeHtml(record.level)}cm</td><td>${escapeHtml(record.windDir)} ${escapeHtml(record.wind)}km/h</td><td>${escapeHtml(record.weather)}</td><td>${anomalyBadges || '<span class="noAnomaly">-</span>'}</td><td><button data-edit="${record.id}">编辑</button><button data-del="${record.id}">删除</button></td></tr>`;
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
  renderRulesCenter();
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
    'windDir': 'windDir', 'winddir': 'windDir', '风向': 'windDir',
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

function detectImportDuplicates(validRows) {
  const existingKeyMap = new Map();
  records.forEach(record => {
    const key = `${record.place}|${record.date}|${record.time}`;
    if (!existingKeyMap.has(key)) {
      existingKeyMap.set(key, []);
    }
    existingKeyMap.get(key).push(record);
  });
  
  const csvKeyMap = new Map();
  validRows.forEach(row => {
    const key = `${row.data.place}|${row.data.date}|${row.data.time}`;
    if (!csvKeyMap.has(key)) {
      csvKeyMap.set(key, []);
    }
    csvKeyMap.get(key).push(row);
  });
  
  const duplicatesWithExisting = [];
  const duplicatesWithinCsv = [];
  
  csvKeyMap.forEach((rows, key) => {
    if (existingKeyMap.has(key)) {
      duplicatesWithExisting.push({
        key,
        csvRows: rows,
        existingRecords: existingKeyMap.get(key)
      });
    }
    if (rows.length > 1) {
      duplicatesWithinCsv.push({
        key,
        csvRows: rows
      });
    }
  });
  
  return {
    duplicatesWithExisting,
    duplicatesWithinCsv,
    totalDuplicateRows: duplicatesWithExisting.reduce((sum, d) => sum + d.csvRows.length, 0)
  };
}

function importCsv(event) {
  const file = event.target.files[0];
  if (!file) return;
  const csvInput = document.querySelector('#csvInput');
  file.text().then((text) => {
    const cleaned = text.replace(/^\uFEFF/, '');
    const allLines = cleaned.trim().split(/\n+/);
    const lines = allLines.filter(line => !line.trim().startsWith('#') && line.trim() !== '');
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
    
    const stationNames = stations.map(s => s.name);
    const weatherNames = weatherDict.map(w => w.name);
    const unknownStations = [...new Set(validRows.map(r => r.data.place).filter(p => !stationNames.includes(p)))];
    const unknownWeather = [...new Set(validRows.map(r => r.data.weather).filter(w => w && !weatherNames.includes(w)))];
    
    const duplicateInfo = detectImportDuplicates(validRows);
    
    importMergeStrategy = 'skip';
    importAddUnknownStations = false;
    importAddUnknownWeather = false;
    
    pendingImportData = {
      validRows,
      errorRows,
      mapping,
      headers,
      fileName: file.name,
      unknownStations,
      unknownWeather,
      duplicateInfo
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
  const { validRows, errorRows, mapping, headers, fileName, unknownStations, unknownWeather, duplicateInfo } = pendingImportData;
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
  
  let duplicateSection = '';
  if (duplicateInfo && (duplicateInfo.duplicatesWithExisting.length > 0 || duplicateInfo.duplicatesWithinCsv.length > 0)) {
    let dupList = '';
    if (duplicateInfo.duplicatesWithExisting.length > 0) {
      const dupRows = duplicateInfo.duplicatesWithExisting.slice(0, 5).map(d => {
        const [place, date, time] = d.key.split('|');
        return `<div class="dupRow"><span class="dupKey">${escapeHtml(place)} · ${date} ${time}</span><span class="dupBadge">与现有 ${d.existingRecords.length} 条重复 · CSV中 ${d.csvRows.length} 条</span></div>`;
      }).join('');
      const moreDup = duplicateInfo.duplicatesWithExisting.length > 5 ? `<div class="moreErrors">...还有 ${duplicateInfo.duplicatesWithExisting.length - 5} 组重复未显示</div>` : '';
      dupList += `<div class="dupGroupTitle">🔄 与现有记录重复 (${duplicateInfo.totalDuplicateRows} 条)</div>${dupRows}${moreDup}`;
    }
    if (duplicateInfo.duplicatesWithinCsv.length > 0) {
      const csvDupRows = duplicateInfo.duplicatesWithinCsv.slice(0, 3).map(d => {
        const [place, date, time] = d.key.split('|');
        const lineNums = d.csvRows.map(r => r.lineNum).join(', ');
        return `<div class="dupRow"><span class="dupKey">${escapeHtml(place)} · ${date} ${time}</span><span class="dupBadge">CSV内重复 · 第${lineNums}行 (${d.csvRows.length}条)</span></div>`;
      }).join('');
      const moreCsvDup = duplicateInfo.duplicatesWithinCsv.length > 3 ? `<div class="moreErrors">...还有 ${duplicateInfo.duplicatesWithinCsv.length - 3} 组内部重复未显示</div>` : '';
      dupList += `<div class="dupGroupTitle">📋 CSV内部重复 (${duplicateInfo.duplicatesWithinCsv.length} 组)</div>${csvDupRows}${moreCsvDup}`;
    }
    duplicateSection = `
      <div class="previewSection warnSection">
        <h3 class="warnTitle">⚠️ 疑似重复记录</h3>
        <div class="dupList">${dupList}</div>
        <div class="strategySelect">
          <div class="strategyLabel">合并策略：</div>
          <label class="strategyOption"><input type="radio" name="mergeStrategy" value="skip" ${importMergeStrategy === 'skip' ? 'checked' : ''}><span>跳过重复</span></label>
          <label class="strategyOption"><input type="radio" name="mergeStrategy" value="overwrite" ${importMergeStrategy === 'overwrite' ? 'checked' : ''}><span>覆盖已有</span></label>
          <label class="strategyOption"><input type="radio" name="mergeStrategy" value="append" ${importMergeStrategy === 'append' ? 'checked' : ''}><span>作为新记录追加</span></label>
        </div>
      </div>
    `;
  }
  
  let unknownStationSection = '';
  if (unknownStations && unknownStations.length > 0) {
    const stationTags = unknownStations.map(s => `<span class="unknownTag">📍 ${escapeHtml(s)}</span>`).join('');
    unknownStationSection = `
      <div class="previewSection warnSection">
        <h3 class="warnTitle">📍 未知站点 (${unknownStations.length} 个)</h3>
        <div class="unknownList">${stationTags}</div>
        <label class="checkOption">
          <input type="checkbox" id="addUnknownStations" ${importAddUnknownStations ? 'checked' : ''}>
          <span>确认导入时自动将这些站点添加到站点列表</span>
        </label>
      </div>
    `;
  }
  
  let unknownWeatherSection = '';
  if (unknownWeather && unknownWeather.length > 0) {
    const weatherTags = unknownWeather.map(w => `<span class="unknownTag">🌤️ ${escapeHtml(w)}</span>`).join('');
    unknownWeatherSection = `
      <div class="previewSection warnSection">
        <h3 class="warnTitle">🌤️ 未知天气 (${unknownWeather.length} 种)</h3>
        <div class="unknownList">${weatherTags}</div>
        <label class="checkOption">
          <input type="checkbox" id="addUnknownWeather" ${importAddUnknownWeather ? 'checked' : ''}>
          <span>确认导入时自动将这些天气添加到天气词典</span>
        </label>
      </div>
    `;
  }
  
  const previewRows = validRows.slice(0, 5).map(r => {
    const key = `${r.data.place}|${r.data.date}|${r.data.time}`;
    const isDup = duplicateInfo && duplicateInfo.duplicatesWithExisting.some(d => d.key === key);
    const rowClass = isDup ? 'dupPreviewRow' : '';
    return `
    <tr class="${rowClass}">
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
  `}).join('');
  const morePreview = validRows.length > 5 ? `<div class="morePreview">...还有 ${validRows.length - 5} 条有效数据</div>` : '';
  
  const importSummary = calculateImportSummary();
  
  const html = `
    <div class="previewHeader">
      <div class="fileName">📄 ${escapeHtml(fileName)}</div>
    </div>
    <div class="previewStats">
      <div class="statCard total"><span class="statLabel">解析总行数</span><span class="statValue">${validRows.length + errorRows.length}</span></div>
      <div class="statCard valid"><span class="statLabel">有效行数</span><span class="statValue">${validRows.length}</span></div>
      <div class="statCard error"><span class="statLabel">错误行数</span><span class="statValue">${errorRows.length}</span></div>
      <div class="statCard new"><span class="statLabel">预计新增</span><span class="statValue">${importSummary.newRecordsCount}</span></div>
      ${importSummary.overwrittenCount > 0 ? `<div class="statCard overwrite"><span class="statLabel">预计覆盖</span><span class="statValue">${importSummary.overwrittenCount}</span></div>` : ''}
      ${importSummary.skippedCount > 0 ? `<div class="statCard skip"><span class="statLabel">预计跳过</span><span class="statValue">${importSummary.skippedCount}</span></div>` : ''}
    </div>
    <div class="previewSection">
      <h3>🔗 字段映射</h3>
      <div class="mappingGrid">${mappingHtml}</div>
    </div>
    ${errorSummary}
    ${duplicateSection}
    ${unknownStationSection}
    ${unknownWeatherSection}
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
  
  document.querySelectorAll('input[name="mergeStrategy"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      importMergeStrategy = e.target.value;
      renderCsvPreview();
    });
  });
  const addStationsCheckbox = document.querySelector('#addUnknownStations');
  if (addStationsCheckbox) {
    addStationsCheckbox.addEventListener('change', (e) => {
      importAddUnknownStations = e.target.checked;
    });
  }
  const addWeatherCheckbox = document.querySelector('#addUnknownWeather');
  if (addWeatherCheckbox) {
    addWeatherCheckbox.addEventListener('change', (e) => {
      importAddUnknownWeather = e.target.checked;
    });
  }
  
  if (validRows.length > 0) {
    confirmBtn.disabled = false;
    const parts = [`预计新增 ${importSummary.newRecordsCount} 条`];
    if (importSummary.overwrittenCount > 0) {
      parts.push(`覆盖 ${importSummary.overwrittenCount} 条`);
    }
    if (importSummary.skippedCount > 0) {
      parts.push(`跳过 ${importSummary.skippedCount} 条`);
    }
    confirmBtn.textContent = `确认导入 (${parts.join('，')})`;
  } else {
    confirmBtn.disabled = true;
    confirmBtn.textContent = '没有可导入的有效数据';
  }
}

function calculateImportSummary() {
  if (!pendingImportData) {
    return { newRecordsCount: 0, overwrittenCount: 0, skippedCount: 0 };
  }
  const { validRows } = pendingImportData;

  if (importMergeStrategy === 'append') {
    return { newRecordsCount: validRows.length, overwrittenCount: 0, skippedCount: 0 };
  } else if (importMergeStrategy === 'skip') {
    const uniqueKeys = new Set();
    const existingKeys = new Set(records.map(r => `${r.place}|${r.date}|${r.time}`));
    let count = 0;
    let skippedCount = 0;
    validRows.forEach(r => {
      const key = `${r.data.place}|${r.data.date}|${r.data.time}`;
      if (!existingKeys.has(key) && !uniqueKeys.has(key)) {
        uniqueKeys.add(key);
        count++;
      } else {
        skippedCount++;
      }
    });
    return { newRecordsCount: count, overwrittenCount: 0, skippedCount };
  } else if (importMergeStrategy === 'overwrite') {
    const existingKeys = new Set(records.map(r => `${r.place}|${r.date}|${r.time}`));
    const overwrittenKeys = new Set();
    const newKeys = new Set();
    validRows.forEach(r => {
      const key = `${r.data.place}|${r.data.date}|${r.data.time}`;
      if (existingKeys.has(key)) {
        overwrittenKeys.add(key);
      } else {
        newKeys.add(key);
      }
    });
    return {
      newRecordsCount: newKeys.size,
      overwrittenCount: overwrittenKeys.size,
      skippedCount: validRows.length - overwrittenKeys.size - newKeys.size
    };
  }
  return { newRecordsCount: validRows.length, overwrittenCount: 0, skippedCount: 0 };
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
  const { validRows, errorRows, unknownStations, unknownWeather } = pendingImportData;
  
  let addedStations = 0;
  let addedWeather = 0;
  
  if (importAddUnknownStations && unknownStations && unknownStations.length > 0) {
    unknownStations.forEach(name => {
      if (!stations.find(s => s.name === name)) {
        stations.unshift({
          id: crypto.randomUUID(),
          name: name,
          seaArea: '未知',
          longitude: 0,
          latitude: 0,
          note: 'CSV导入时自动添加'
        });
        addedStations++;
      }
    });
    if (addedStations > 0) {
      persistStations();
    }
  }
  
  if (importAddUnknownWeather && unknownWeather && unknownWeather.length > 0) {
    unknownWeather.forEach(name => {
      if (!weatherDict.find(w => w.name === name)) {
        weatherDict.unshift({
          id: crypto.randomUUID(),
          name: name,
          icon: '🌤️'
        });
        addedWeather++;
      }
    });
    if (addedWeather > 0) {
      persistWeatherDict();
    }
  }
  
  let newRecords = [];
  let skippedCount = 0;
  let overwrittenCount = 0;
  
  if (importMergeStrategy === 'append') {
    newRecords = validRows.map(r => ({
      id: crypto.randomUUID(),
      ...r.data
    }));
    records = [...newRecords, ...records];
  } else if (importMergeStrategy === 'skip') {
    const existingKeySet = new Set(records.map(r => `${r.place}|${r.date}|${r.time}`));
    const nonDuplicateRows = validRows.filter(r => {
      const key = `${r.data.place}|${r.data.date}|${r.data.time}`;
      if (existingKeySet.has(key)) {
        skippedCount++;
        return false;
      }
      return true;
    });
    
    const seenKeys = new Set();
    const uniqueRows = [];
    nonDuplicateRows.forEach(r => {
      const key = `${r.data.place}|${r.data.date}|${r.data.time}`;
      if (seenKeys.has(key)) {
        skippedCount++;
      } else {
        seenKeys.add(key);
        uniqueRows.push(r);
      }
    });
    
    newRecords = uniqueRows.map(r => ({
      id: crypto.randomUUID(),
      ...r.data
    }));
    records = [...newRecords, ...records];
  } else if (importMergeStrategy === 'overwrite') {
    const overwriteKeyMap = new Map();
    validRows.forEach(r => {
      const key = `${r.data.place}|${r.data.date}|${r.data.time}`;
      overwriteKeyMap.set(key, r);
    });
    
    const overwrittenIds = new Set();
    records = records.map(record => {
      const key = `${record.place}|${record.date}|${record.time}`;
      if (overwriteKeyMap.has(key)) {
        overwrittenIds.add(key);
        const row = overwriteKeyMap.get(key);
        return {
          ...record,
          level: row.data.level,
          windDir: row.data.windDir,
          wind: row.data.wind,
          weather: row.data.weather,
          note: row.data.note
        };
      }
      return record;
    });
    overwrittenCount = overwrittenIds.size;
    
    const existingKeySet = new Set(records.map(r => `${r.place}|${r.date}|${r.time}`));
    const newRows = validRows.filter(r => {
      const key = `${r.data.place}|${r.data.date}|${r.data.time}`;
      return !existingKeySet.has(key);
    });
    
    const seenKeys = new Set();
    const uniqueNewRows = [];
    newRows.forEach(r => {
      const key = `${r.data.place}|${r.data.date}|${r.data.time}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueNewRows.push(r);
      }
    });
    
    newRecords = uniqueNewRows.map(r => ({
      id: crypto.randomUUID(),
      ...r.data
    }));
    records = [...newRecords, ...records];
  }
  
  persist();
  render();
  closeCsvModal();
  
  const totalImported = newRecords.length + overwrittenCount;
  const totalSkipped = errorRows.length + skippedCount;
  let message = `✅ 导入完成\n`;
  message += `• 新增记录: ${newRecords.length} 条\n`;
  if (overwrittenCount > 0) {
    message += `• 覆盖更新: ${overwrittenCount} 条\n`;
  }
  if (skippedCount > 0) {
    message += `• 跳过重复: ${skippedCount} 条\n`;
  }
  if (errorRows.length > 0) {
    message += `• 错误行跳过: ${errorRows.length} 条\n`;
  }
  if (addedStations > 0) {
    message += `\n📍 新增站点: ${addedStations} 个`;
  }
  if (addedWeather > 0) {
    message += `\n🌤️ 新增天气: ${addedWeather} 种`;
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

function downloadCsvTemplate() {
  const lines = [
    '# 潮汐观测数据导入模板 - 请在下方填写您的数据',
    '# ================================================',
    '# 格式说明：',
    '#   1. 以 # 开头的行为注释行，导入时会自动忽略',
    '#   2. 请从第14行（表头行）开始填写数据，不要修改表头文字',
    '#   3. 日期格式必须为 YYYY-MM-DD（如 2026-06-10），不支持 2026/06/10 或 06-10-2026',
    '#   4. 时间建议使用 HH:MM 格式（如 06:30）',
    '#   5. 潮位和风速必须为有效数字（整数或小数均可）',
    '#   6. 必填字段：地点、日期、时间、潮位、风向、风速、天气；备注为选填',
    '#   7. 列名支持中英文（不区分大小写）：地点/站点/place、日期/date、时间/time、潮位/水位/level、风向/windDir、风速/wind、天气/weather、备注/说明/note',
    '#   8. 非法日历日期（如 6月31日、2月30日、非闰年2月29日）会被拒绝导入',
    '# ',
    '# 示例数据（请删除示例行后填写您的真实数据）：',
    '地点,日期,时间,潮位,风向,风速,天气,备注',
    '东极青浜,2026-06-10,06:30,156,东北,12,晴,浪面平稳',
    '嵊泗基湖,2026-06-10,12:15,312,东南,18,多云,午前涨潮'
  ];
  const csv = lines.join('\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'tide-import-template.csv' });
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

      if (timeDiffHours <= anomalyRules.levelJumpTimeWindowHours && levelDiff >= anomalyRules.levelJumpThreshold) {
        const reason = `潮位跳变异常：${prev.level}cm → ${curr.level}cm（${levelDiff >= 0 ? '+' : ''}${levelDiff}cm），间隔${timeDiffHours.toFixed(1)}小时（阈值≥${anomalyRules.levelJumpThreshold}cm/${anomalyRules.levelJumpTimeWindowHours}h）`;
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
  if (!anomalyRules.enableDuplicateDetection) return anomalies;

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
    if (record.wind >= anomalyRules.highWindThreshold && (!record.note || record.note.trim() === '')) {
      const reason = `高风速无备注异常：风速 ${record.wind}km/h（≥${anomalyRules.highWindThreshold}km/h）但备注为空`;
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
  document.querySelector('#weatherDictSection').style.display = 'none';
  document.querySelector('#rulesCenterSection').style.display = 'none';
  document.querySelector('#reportViewSection').style.display = 'none';
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

function initReportDefaults() {
  const places = [...new Set(records.map((record) => record.place))].sort();
  if (places.length > 0 && reportSelectedPlaces.length === 0) {
    reportSelectedPlaces = places.slice(0, 1);
  }
  if (!reportStartDate || !reportEndDate) {
    const dates = records.map((r) => r.date).sort();
    if (dates.length > 0) {
      reportStartDate = reportStartDate || dates[0];
      reportEndDate = reportEndDate || dates[dates.length - 1];
    } else {
      const today = new Date().toISOString().slice(0, 10);
      reportStartDate = reportStartDate || today;
      reportEndDate = reportEndDate || today;
    }
  }
  const startInput = document.querySelector('#reportStartDate');
  const endInput = document.querySelector('#reportEndDate');
  if (startInput) startInput.value = reportStartDate;
  if (endInput) endInput.value = reportEndDate;
  document.querySelectorAll('input[name="reportType"]').forEach((radio) => {
    radio.checked = radio.value === reportType;
  });
}

function renderReportPlaceCheckboxes() {
  const container = document.querySelector('#reportPlaceCheckboxes');
  const places = [...new Set(records.map((record) => record.place))].sort();

  if (places.length === 0) {
    container.innerHTML = '<p class="empty">暂无观测站点数据</p>';
    return;
  }

  container.innerHTML = places.map((place) => {
    const placeInfo = getPlaceDateRange(place);
    const isChecked = reportSelectedPlaces.includes(place);
    const recordCount = placeInfo ? placeInfo.count : 0;
    return `
      <label class="placeCheckbox">
        <input type="checkbox" data-report-place="${escapeHtml(place)}" ${isChecked ? 'checked' : ''} />
        <span class="checkboxLabel">${escapeHtml(place)}</span>
        <span class="recordCount">${recordCount}条</span>
      </label>
    `;
  }).join('');

  container.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const place = e.target.dataset.reportPlace;
      if (e.target.checked) {
        if (!reportSelectedPlaces.includes(place)) {
          reportSelectedPlaces.push(place);
        }
      } else {
        reportSelectedPlaces = reportSelectedPlaces.filter((p) => p !== place);
      }
    });
  });
}

function generateReportData() {
  if (reportCache) return reportCache;

  const selectedPlaces = reportSelectedPlaces.filter((p) =>
    records.some((r) => r.place === p)
  );

  if (selectedPlaces.length === 0) {
    reportCache = { error: 'noPlaces', selectedPlaces: [] };
    return reportCache;
  }

  const overlapping = getOverlappingDateRange(selectedPlaces);
  let effectiveStart = reportStartDate;
  let effectiveEnd = reportEndDate;

  if (overlapping) {
    if (!effectiveStart || effectiveStart < overlapping.start) {
      effectiveStart = overlapping.start;
    }
    if (!effectiveEnd || effectiveEnd > overlapping.end) {
      effectiveEnd = overlapping.end;
    }
  }

  if (!effectiveStart || !effectiveEnd || effectiveStart > effectiveEnd) {
    reportCache = {
      error: 'noOverlap',
      selectedPlaces,
      placeRanges: selectedPlaces.map((p) => ({ place: p, range: getPlaceDateRange(p) }))
    };
    return reportCache;
  }

  const scopedRecords = records.filter(
    (r) =>
      selectedPlaces.includes(r.place) &&
      r.date >= effectiveStart &&
      r.date <= effectiveEnd
  );

  if (scopedRecords.length === 0) {
    reportCache = {
      error: 'emptyData',
      selectedPlaces,
      effectiveStart,
      effectiveEnd
    };
    return reportCache;
  }

  const anomalies = detectAllAnomalies(scopedRecords);
  const anomalyRecords = scopedRecords.filter((r) => anomalies.has(r.id));

  const stats = calculateCompareStats(selectedPlaces, effectiveStart, effectiveEnd);

  const levels = scopedRecords.map((r) => r.level);
  const winds = scopedRecords.map((r) => r.wind);

  const weatherCount = {};
  scopedRecords.forEach((r) => {
    weatherCount[r.weather] = (weatherCount[r.weather] || 0) + 1;
  });
  const weatherDistribution = Object.entries(weatherCount)
    .map(([name, count]) => ({ name, count, icon: getWeatherDictIcon(name) }))
    .sort((a, b) => b.count - a.count);

  const totalRecords = scopedRecords.length;
  const maxLevel = Math.max(...levels);
  const avgWind = avg(winds);
  const anomalyCount = anomalyRecords.length;

  const anomalyByType = { jump: 0, duplicate: 0, wind: 0 };
  anomalies.forEach((anomalyList) => {
    anomalyList.forEach((a) => {
      if (anomalyByType[a.type] !== undefined) {
        anomalyByType[a.type]++;
      }
    });
  });

  const groupedByPlace = {};
  selectedPlaces.forEach((place) => {
    const placeRecords = scopedRecords.filter((r) => r.place === place);
    const placeLevels = placeRecords.map((r) => r.level);
    const placeWinds = placeRecords.map((r) => r.wind);
    groupedByPlace[place] = {
      recordCount: placeRecords.length,
      maxLevel: placeLevels.length ? Math.max(...placeLevels) : 0,
      avgLevel: placeLevels.length ? avg(placeLevels) : 0,
      avgWind: placeWinds.length ? avg(placeWinds) : 0
    };
  });

  reportCache = {
    error: null,
    selectedPlaces,
    effectiveStart,
    effectiveEnd,
    totalRecords,
    maxLevel,
    avgWind,
    anomalyCount,
    anomalyByType,
    anomalyRecords,
    anomalies,
    weatherDistribution,
    stats,
    groupedByPlace,
    scopedRecords,
    reportType
  };

  return reportCache;
}

function renderReportView() {
  document.querySelector('#formSection').style.display = 'none';
  document.querySelector('#calendarViewSection').style.display = 'none';
  document.querySelector('#listViewSection').style.display = 'none';
  document.querySelector('#mapSection').style.display = 'none';
  document.querySelector('#stationSection').style.display = 'none';
  document.querySelector('#snapshotSection').style.display = 'none';
  document.querySelector('#weatherDictSection').style.display = 'none';
  document.querySelector('#rulesCenterSection').style.display = 'none';
  document.querySelector('#compareViewSection').style.display = 'none';
  document.querySelector('#oplogSection').style.display = '';
  document.querySelector('#reportViewSection').style.display = '';

  initReportDefaults();
  renderReportPlaceCheckboxes();

  const content = document.querySelector('#reportContent');
  const statusBadge = document.querySelector('#reportStatusBadge');
  const exportBtn = document.querySelector('#exportReportHtmlBtn');

  if (!reportGenerated) {
    statusBadge.textContent = '';
    exportBtn.style.display = 'none';
    content.innerHTML = `
      <div class="reportEmpty">
        <div class="reportEmptyIcon">📋</div>
        <h3>尚未生成报告</h3>
        <p>请在左侧选择报告类型、日期范围和观测站点，然后点击「生成报告」</p>
      </div>
    `;
    renderOpLog();
    return;
  }

  const data = generateReportData();
  exportBtn.style.display = data.error ? 'none' : 'block';

  if (data.error === 'noPlaces') {
    statusBadge.textContent = '缺少站点';
    statusBadge.className = 'countBadge compareQualityError';
    content.innerHTML = `
      <div class="reportEmpty">
        <div class="reportEmptyIcon">⚠️</div>
        <h3>未选择有效站点</h3>
        <p>请在左侧至少选择一个有观测记录的站点</p>
      </div>
    `;
    renderOpLog();
    return;
  }

  if (data.error === 'noOverlap') {
    statusBadge.textContent = '日期不重叠';
    statusBadge.className = 'countBadge compareQualityError';
    const ranges = data.placeRanges.map((pr) => {
      if (pr.range) {
        return `<div class="compareDateRangeItem"><strong>${escapeHtml(pr.place)}</strong>：${pr.range.min} ~ ${pr.range.max}（${pr.range.count}条记录）</div>`;
      }
      return `<div class="compareDateRangeItem"><strong>${escapeHtml(pr.place)}</strong>：无数据</div>`;
    }).join('');
    content.innerHTML = `
      <div class="reportEmpty">
        <div class="reportEmptyIcon">📅</div>
        <h3>所选站点在指定日期范围内无共同观测数据</h3>
        <div class="compareDateRangeList">${ranges}</div>
        <p>请调整日期范围或更换站点</p>
      </div>
    `;
    renderOpLog();
    return;
  }

  if (data.error === 'emptyData') {
    statusBadge.textContent = '无数据';
    statusBadge.className = 'countBadge compareQualityError';
    content.innerHTML = `
      <div class="reportEmpty">
        <div class="reportEmptyIcon">📭</div>
        <h3>日期范围内无观测记录</h3>
        <p>所选站点在 ${data.effectiveStart} 至 ${data.effectiveEnd} 期间没有任何观测记录</p>
        <p>请调整日期范围或选择其他站点</p>
      </div>
    `;
    renderOpLog();
    return;
  }

  statusBadge.textContent = '报告已生成';
  statusBadge.className = 'countBadge compareQualityGood';

  const {
    selectedPlaces,
    effectiveStart,
    effectiveEnd,
    totalRecords,
    maxLevel,
    avgWind,
    anomalyCount,
    anomalyByType,
    anomalyRecords,
    anomalies,
    weatherDistribution,
    groupedByPlace,
    reportType
  } = data;

  const reportTitle = reportType === 'daily' ? '潮汐观测日报' : '潮汐观测周报';
  const dateRangeText = `${effectiveStart} 至 ${effectiveEnd}`;
  const placesText = selectedPlaces.join('、');

  let anomalySummaryHtml = '';
  if (anomalyCount > 0) {
    const topAnomalies = anomalyRecords.slice(0, 5).map((r) => {
      const recordAnomalies = anomalies.get(r.id) || [];
      const anomalyBadges = recordAnomalies.map((a) =>
        `<span class="${getAnomalyBadgeClass(a.type)}">${getAnomalyTypeLabel(a.type)}</span>`
      ).join(' ');
      return `
        <tr>
          <td>${escapeHtml(r.date)} ${escapeHtml(r.time)}</td>
          <td>${escapeHtml(r.place)}</td>
          <td>${r.level}cm</td>
          <td>${escapeHtml(r.windDir)} ${r.wind}km/h</td>
          <td>${anomalyBadges}</td>
          <td>${escapeHtml(recordAnomalies[0]?.reason || '')}</td>
        </tr>
      `;
    }).join('');

    anomalySummaryHtml = `
      <div class="reportSection">
        <div class="reportSectionHead">
          <h3>⚠️ 异常记录摘要</h3>
          <span class="countBadge" style="background:#fee2e2;color:#dc2626;">${anomalyCount} 条异常</span>
        </div>
        <div class="anomalyTypeSummary">
          <span class="anomalyBadge jump">潮位跳变: ${anomalyByType.jump || 0}条</span>
          <span class="anomalyBadge duplicate">重复记录: ${anomalyByType.duplicate || 0}条</span>
          <span class="anomalyBadge wind">高风速无备注: ${anomalyByType.wind || 0}条</span>
        </div>
        <div class="tableWrap">
          <table>
            <thead>
              <tr><th>时间</th><th>地点</th><th>潮位</th><th>风</th><th>异常类型</th><th>详情</th></tr>
            </thead>
            <tbody>${topAnomalies}</tbody>
          </table>
        </div>
        ${anomalyRecords.length > 5 ? `<p class="reportMore">...还有 ${anomalyRecords.length - 5} 条异常记录</p>` : ''}
      </div>
    `;
  } else {
    anomalySummaryHtml = `
      <div class="reportSection">
        <div class="reportSectionHead">
          <h3>⚠️ 异常记录摘要</h3>
          <span class="countBadge" style="background:#dcfce7;color:#166534;">无异常</span>
        </div>
        <p class="reportNoAnomaly">✅ 在选定的时间范围内，未检测到任何异常记录。数据质量良好。</p>
      </div>
    `;
  }

  const weatherHtml = weatherDistribution.map((w) => {
    const pct = Math.round((w.count / totalRecords) * 100);
    return `
      <div class="weatherBarRow">
        <div class="weatherBarLabel">
          <span class="weatherBarIcon">${escapeHtml(w.icon)}</span>
          <span>${escapeHtml(w.name)}</span>
        </div>
        <div class="weatherBarTrack">
          <div class="weatherBarFill" style="width: ${pct}%;"></div>
        </div>
        <div class="weatherBarValue">${w.count}次 (${pct}%)</div>
      </div>
    `;
  }).join('');

  const placeStatsHtml = selectedPlaces.map((place) => {
    const ps = groupedByPlace[place];
    return `
      <div class="reportPlaceStat">
        <div class="reportPlaceName">${escapeHtml(place)}</div>
        <div class="reportPlaceMetrics">
          <div><span>记录数</span><strong>${ps.recordCount}</strong></div>
          <div><span>最高潮位</span><strong>${ps.maxLevel}cm</strong></div>
          <div><span>平均潮位</span><strong>${Math.round(ps.avgLevel)}cm</strong></div>
          <div><span>平均风速</span><strong>${ps.avgWind.toFixed(1)}km/h</strong></div>
        </div>
      </div>
    `;
  }).join('');

  const trendChartData = generateTrendChartData(data);
  const donutChartSvg = generateWeatherDonutForReport(data);

  content.innerHTML = `
    <div class="reportPreview" id="reportPreview">
      <div class="reportHeader">
        <h1>${reportTitle}</h1>
        <div class="reportMeta">
          <span><strong>报告期：</strong>${dateRangeText}</span>
          <span><strong>观测站点：</strong>${placesText}</span>
          <span><strong>生成时间：</strong>${new Date().toLocaleString('zh-CN')}</span>
        </div>
      </div>

      <div class="reportSection">
        <h3>📊 核心指标</h3>
        <div class="reportStats">
          <div class="reportStatCard">
            <span class="reportStatLabel">观测记录数</span>
            <strong class="reportStatValue">${totalRecords}</strong>
            <span class="reportStatUnit">条</span>
          </div>
          <div class="reportStatCard reportStatCard-teal">
            <span class="reportStatLabel">最高潮位</span>
            <strong class="reportStatValue">${maxLevel}</strong>
            <span class="reportStatUnit">cm</span>
          </div>
          <div class="reportStatCard reportStatCard-blue">
            <span class="reportStatLabel">平均风速</span>
            <strong class="reportStatValue">${avgWind.toFixed(1)}</strong>
            <span class="reportStatUnit">km/h</span>
          </div>
          <div class="reportStatCard ${anomalyCount > 0 ? 'reportStatCard-red' : 'reportStatCard-green'}">
            <span class="reportStatLabel">异常记录</span>
            <strong class="reportStatValue">${anomalyCount}</strong>
            <span class="reportStatUnit">条</span>
          </div>
        </div>
      </div>

      <div class="reportSection">
        <h3>📍 各站点统计</h3>
        <div class="reportPlaceStats">${placeStatsHtml}</div>
      </div>

      <div class="reportSection">
        <div class="reportSectionHead">
          <h3>📈 潮位趋势变化</h3>
          <span class="chartSubtitle">每日平均潮位</span>
        </div>
        <div class="reportChart">${trendChartData}</div>
      </div>

      <div class="reportTwoCol">
        <div class="reportSection">
          <h3>🌤️ 天气分布</h3>
          <div class="reportWeatherBars">${weatherHtml}</div>
        </div>
        <div class="reportSection">
          <div class="reportSectionHead">
            <h3>🥧 天气分布环形图</h3>
            <span class="chartSubtitle">各天气类型占比</span>
          </div>
          <div class="reportChart reportChartSmall">${donutChartSvg}</div>
        </div>
      </div>

      ${anomalySummaryHtml}

      <div class="reportFooter">
        <p>本报告由 hxwl-10 潮汐观察系统自动生成 · 数据来源于本地观测记录</p>
      </div>
    </div>
  `;

  renderOpLog();
}

function generateTrendChartData(data) {
  const { selectedPlaces, effectiveStart, effectiveEnd, stats } = data;
  const allDates = getDatesInRange(effectiveStart, effectiveEnd);
  if (allDates.length === 0) return '<p class="empty">暂无趋势数据</p>';

  const allLevels = [];
  selectedPlaces.forEach((place) => {
    const s = stats[place];
    if (s && s.dailyRecords) {
      s.dailyRecords.forEach((dayRecords) => {
        dayRecords.forEach((r) => allLevels.push(r.level));
      });
    }
  });

  if (allLevels.length === 0) return '<p class="empty">暂无潮位数据</p>';

  const maxLevel = Math.max(...allLevels) * 1.1;
  const minLevel = Math.min(...allLevels) * 0.9;
  const levelRange = maxLevel - minLevel || 1;

  const chartWidth = 700;
  const chartHeight = 260;
  const padding = { top: 30, right: 20, bottom: 50, left: 55 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

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

  selectedPlaces.forEach((place, pIdx) => {
    const s = stats[place];
    if (!s) return;
    const color = compareColors[pIdx % compareColors.length];

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
        dots += `<circle cx="${x}" cy="${y}" r="4" fill="${color}" stroke="white" stroke-width="1.5"><title>${escapeHtml(place)} · ${d.date} · ${Math.round(d.value)}cm</title></circle>`;
      }
    });

    if (points.trim()) {
      lines += `<polyline points="${points.trim()}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    }

    legend += `
      <g transform="translate(${padding.left + pIdx * 120}, 10)">
        <line x1="0" y1="6" x2="18" y2="6" stroke="${color}" stroke-width="2.5"/>
        <circle cx="9" cy="6" r="3.5" fill="${color}" stroke="white" stroke-width="1"/>
        <text x="28" y="10" class="legendText" style="font-size:11px;">${escapeHtml(place)}</text>
      </g>
    `;
  });

  const yTicks = 4;
  let yAxis = '';
  for (let i = 0; i <= yTicks; i++) {
    const value = minLevel + (levelRange / yTicks) * (yTicks - i);
    const y = getY(value);
    yAxis += `<line x1="${padding.left}" y1="${y}" x2="${chartWidth - padding.right}" y2="${y}" stroke="#e0efec" stroke-width="1"/>`;
    yAxis += `<text x="${padding.left - 6}" y="${y + 4}" text-anchor="end" class="chartLabel" style="font-size:11px;">${Math.round(value)}cm</text>`;
  }

  let xLabels = '';
  const labelStep = Math.max(1, Math.floor(allDates.length / 6));
  allDates.forEach((date, idx) => {
    if (idx % labelStep === 0 || idx === allDates.length - 1) {
      const x = getX(date);
      if (x !== null) {
        xLabels += `<text x="${x}" y="${chartHeight - 30}" text-anchor="middle" class="chartLabel" style="font-size:11px;">${date.slice(5)}</text>`;
      }
    }
  });

  return `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight}" style="width:100%;height:auto;" xmlns="http://www.w3.org/2000/svg">
      ${yAxis}
      ${lines}
      ${dots}
      ${xLabels}
      ${legend}
    </svg>
  `;
}

function generateWeatherDonutForReport(data) {
  const { weatherDistribution, totalRecords } = data;
  if (weatherDistribution.length === 0) return '<p class="empty">暂无天气数据</p>';

  const weatherColors = {
    '晴': '#fbbf24', '多云': '#94a3b8', '阴': '#64748b',
    '小雨': '#60a5fa', '中雨': '#3b82f6', '大雨': '#1d4ed8',
    '雷阵雨': '#7c3aed', '雪': '#e0e7ff', '雾': '#9ca3af', '大风': '#8b5cf6'
  };

  const chartWidth = 320;
  const chartHeight = 240;
  const centerX = chartWidth / 2;
  const centerY = chartHeight / 2 - 10;
  const outerRadius = 80;
  const innerRadius = 48;

  let currentAngle = -Math.PI / 2;
  let segments = '';
  let legend = '';

  weatherDistribution.forEach((w, idx) => {
    const count = w.count;
    if (count === 0) return;

    const angle = (count / totalRecords) * Math.PI * 2;
    const endAngle = currentAngle + angle;
    const color = weatherColors[w.name] || '#999';

    const x1 = centerX + outerRadius * Math.cos(currentAngle);
    const y1 = centerY + outerRadius * Math.sin(currentAngle);
    const x2 = centerX + outerRadius * Math.cos(endAngle);
    const y2 = centerY + outerRadius * Math.sin(endAngle);
    const x3 = centerX + innerRadius * Math.cos(endAngle);
    const y3 = centerY + innerRadius * Math.sin(endAngle);
    const x4 = centerX + innerRadius * Math.cos(currentAngle);
    const y4 = centerY + innerRadius * Math.sin(currentAngle);

    const largeArc = angle > Math.PI ? 1 : 0;
    const pct = Math.round((count / totalRecords) * 100);

    const path = `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;

    segments += `<path d="${path}" fill="${color}"><title>${escapeHtml(w.name)}: ${count}次 (${pct}%)</title></path>`;

    currentAngle = endAngle;

    const legendY = chartHeight - 20 - Math.floor(idx / 3) * 20;
    const legendX = 20 + (idx % 3) * 100;
    legend += `
      <g transform="translate(${legendX}, ${legendY})">
        <rect x="0" y="0" width="10" height="10" fill="${color}" rx="2"/>
        <text x="15" y="9" class="legendText" style="font-size:11px;">${escapeHtml(w.icon)} ${escapeHtml(w.name)} ${pct}%</text>
      </g>
    `;
  });

  return `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight}" style="width:100%;height:auto;" xmlns="http://www.w3.org/2000/svg">
      ${segments}
      <circle cx="${centerX}" cy="${centerY}" r="${innerRadius}" fill="white"/>
      <text x="${centerX}" y="${centerY - 5}" text-anchor="middle" class="chartValue" style="font-size:18px;font-weight:700;">${totalRecords}</text>
      <text x="${centerX}" y="${centerY + 12}" text-anchor="middle" class="chartLabel" style="font-size:11px;">条记录</text>
      ${legend}
    </svg>
  `;
}

function exportReportAsHtml() {
  const preview = document.querySelector('#reportPreview');
  if (!preview) {
    alert('请先生成报告');
    return;
  }

  const reportStyles = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
        background: #f0f9f7;
        color: #17324d;
        padding: 40px 20px;
        line-height: 1.6;
      }
      .reportPreview {
        max-width: 900px;
        margin: 0 auto;
        background: white;
        border-radius: 12px;
        padding: 40px;
        box-shadow: 0 10px 40px rgba(22, 76, 92, 0.1);
      }
      .reportHeader {
        border-bottom: 3px solid #0d9488;
        padding-bottom: 20px;
        margin-bottom: 28px;
      }
      .reportHeader h1 {
        font-size: 28px;
        color: #0d9488;
        margin-bottom: 12px;
      }
      .reportMeta {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        font-size: 14px;
        color: #557084;
      }
      .reportSection {
        margin-bottom: 28px;
      }
      .reportSection h3 {
        font-size: 17px;
        color: #17324d;
        margin-bottom: 16px;
        padding-left: 12px;
        border-left: 4px solid #0d9488;
      }
      .reportSectionHead {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
      }
      .reportSectionHead h3 {
        margin-bottom: 0;
      }
      .reportStats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
      }
      .reportStatCard {
        background: #f8fafb;
        border-radius: 10px;
        padding: 20px;
        text-align: center;
        border: 1px solid #e0efec;
      }
      .reportStatCard-teal { background: #e6faf6; }
      .reportStatCard-blue { background: #eff6ff; }
      .reportStatCard-red { background: #fef2f2; }
      .reportStatCard-green { background: #f0fdf4; }
      .reportStatLabel {
        display: block;
        font-size: 13px;
        color: #64748b;
        margin-bottom: 6px;
      }
      .reportStatValue {
        display: block;
        font-size: 30px;
        font-weight: 700;
        color: #0f3f4d;
      }
      .reportStatUnit {
        font-size: 13px;
        color: #64748b;
      }
      .reportPlaceStats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 14px;
      }
      .reportPlaceStat {
        background: #fafdfc;
        border: 1px solid #e0efec;
        border-radius: 8px;
        padding: 16px;
      }
      .reportPlaceName {
        font-weight: 700;
        font-size: 15px;
        color: #0d9488;
        margin-bottom: 10px;
      }
      .reportPlaceMetrics {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .reportPlaceMetrics > div {
        font-size: 12px;
      }
      .reportPlaceMetrics span {
        display: block;
        color: #64748b;
        font-size: 11px;
      }
      .reportPlaceMetrics strong {
        color: #17324d;
        font-size: 15px;
      }
      .reportChart {
        background: #fafdfc;
        border: 1px solid #e0efec;
        border-radius: 8px;
        padding: 12px;
      }
      .reportChart svg {
        width: 100%;
        height: auto;
      }
      .reportTwoCol {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
      }
      .reportChartSmall svg {
        max-height: 240px;
      }
      .weatherBarRow {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 10px;
      }
      .weatherBarLabel {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 80px;
        font-size: 13px;
      }
      .weatherBarIcon {
        font-size: 18px;
      }
      .weatherBarTrack {
        flex: 1;
        height: 20px;
        background: #eef7f5;
        border-radius: 10px;
        overflow: hidden;
      }
      .weatherBarFill {
        height: 100%;
        background: linear-gradient(90deg, #0d9488, #14b8a6);
        border-radius: 10px;
        transition: width 0.3s;
      }
      .weatherBarValue {
        min-width: 90px;
        text-align: right;
        font-size: 12px;
        color: #557084;
        font-weight: 500;
      }
      .anomalyTypeSummary {
        margin-bottom: 14px;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .anomalyBadge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
      }
      .anomalyBadge.jump { background: #fee2e2; color: #dc2626; }
      .anomalyBadge.duplicate { background: #fef3c7; color: #92400e; }
      .anomalyBadge.wind { background: #ede9fe; color: #7c3aed; }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      th, td {
        padding: 10px;
        text-align: left;
        border-bottom: 1px solid #e0efec;
      }
      th {
        background: #d9f3ed;
        color: #0d9488;
        font-weight: 600;
        font-size: 12px;
      }
      tbody tr:hover {
        background: #f0faf8;
      }
      .reportMore {
        color: #8899a6;
        font-size: 12px;
        text-align: center;
        margin-top: 10px;
      }
      .reportNoAnomaly {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #166534;
        padding: 14px 18px;
        border-radius: 8px;
        font-size: 14px;
      }
      .countBadge {
        background: #d9f3ed;
        color: #0d9488;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 600;
      }
      .chartSubtitle {
        font-size: 12px;
        color: #8899a6;
        font-weight: normal;
      }
      .reportFooter {
        border-top: 1px solid #e0efec;
        padding-top: 18px;
        margin-top: 32px;
        text-align: center;
        color: #8899a6;
        font-size: 12px;
      }
      .legendText { fill: #526b79; font-size: 12px; }
      .chartLabel { fill: #526b79; font-size: 12px; text-anchor: middle; }
      .chartValue { fill: #17324d; font-size: 12px; text-anchor: middle; }
      @media (max-width: 700px) {
        .reportStats, .reportTwoCol { grid-template-columns: 1fr; }
        .reportPreview { padding: 20px; }
      }
    </style>
  `;

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>潮汐观测报告</title>
  ${reportStyles}
</head>
<body>
  ${preview.outerHTML}
</body>
</html>`;

  const data = generateReportData();
  const fileName = `潮汐观测${data.reportType === 'daily' ? '日' : '周'}报_${data.effectiveStart}_${data.effectiveEnd}.html`;

  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: fileName
  });
  a.click();
  URL.revokeObjectURL(url);
}

let goalFilterMode = 'active';

function loadGoals() {
  try {
    return JSON.parse(localStorage.getItem(goalsStorageKey) || '[]');
  } catch (e) {
    return [];
  }
}

function persistGoals() {
  localStorage.setItem(goalsStorageKey, JSON.stringify(goals));
}

function loadPracticeRecords() {
  try {
    return JSON.parse(localStorage.getItem(practiceRecordsStorageKey) || '[]');
  } catch (e) {
    return [];
  }
}

function persistPracticeRecords() {
  localStorage.setItem(practiceRecordsStorageKey, JSON.stringify(practiceRecords));
}

function getStartOfWeek(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function getEndOfWeek(dateStr) {
  const start = new Date(getStartOfWeek(dateStr));
  start.setDate(start.getDate() + 6);
  return start.toISOString().slice(0, 10);
}

function getWeekPracticeMinutes(goalId, dateStr) {
  const weekStart = getStartOfWeek(dateStr);
  const weekEnd = getEndOfWeek(dateStr);
  return practiceRecords
    .filter(r => r.goalId === goalId && r.date >= weekStart && r.date <= weekEnd)
    .reduce((sum, r) => sum + r.durationMinutes, 0);
}

function getTotalWeekPracticeMinutes(dateStr) {
  const weekStart = getStartOfWeek(dateStr);
  const weekEnd = getEndOfWeek(dateStr);
  return practiceRecords
    .filter(r => r.date >= weekStart && r.date <= weekEnd)
    .reduce((sum, r) => sum + r.durationMinutes, 0);
}

function getGoalProgress(goal) {
  const today = new Date().toISOString().slice(0, 10);
  const weekMinutes = getWeekPracticeMinutes(goal.id, today);
  const maxBPMReached = getGoalMaxBPM(goal.id);
  let bpmProgress = 0;
  let durationProgress = 0;
  if (goal.targetBPM && goal.startBPM) {
    const current = Math.max(maxBPMReached, Number(goal.startBPM) || 0);
    const range = (Number(goal.targetBPM) || 1) - (Number(goal.startBPM) || 0);
    if (range > 0) {
      bpmProgress = Math.min(100, Math.round(((current - Number(goal.startBPM)) / range) * 100));
    } else if (maxBPMReached >= Number(goal.targetBPM)) {
      bpmProgress = 100;
    }
  }
  if (goal.weeklyMinutes) {
    durationProgress = Math.min(100, Math.round((weekMinutes / Number(goal.weeklyMinutes)) * 100));
  }
  let overallProgress;
  if (goal.goalType === 'bpm') {
    overallProgress = bpmProgress;
  } else if (goal.goalType === 'duration') {
    overallProgress = durationProgress;
  } else {
    overallProgress = Math.round((bpmProgress + durationProgress) / 2);
  }
  return {
    bpmProgress,
    durationProgress,
    overallProgress,
    weekMinutes,
    maxBPMReached,
    targetBPM: Number(goal.targetBPM) || 0,
    startBPM: Number(goal.startBPM) || 0,
    weeklyMinutes: Number(goal.weeklyMinutes) || 0
  };
}

function getGoalMaxBPM(goalId) {
  const records = practiceRecords.filter(r => r.goalId === goalId && r.avgBPM);
  if (records.length === 0) return 0;
  return Math.max(...records.map(r => Number(r.avgBPM) || 0));
}

function isGoalOverdue(goal) {
  if (!goal.deadline) return false;
  const today = new Date().toISOString().slice(0, 10);
  return today > goal.deadline && !goal.completed;
}

function isGoalNearDeadline(goal, days = 7) {
  if (!goal.deadline || goal.completed) return false;
  const today = new Date();
  const deadline = new Date(goal.deadline);
  const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
}

function getDaysUntilDeadline(goal) {
  if (!goal.deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(goal.deadline);
  deadline.setHours(0, 0, 0, 0);
  return Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
}

function checkGoalBPMGoal(goal, achievedBPM) {
  if (!goal || !goal.targetBPM) return false;
  return achievedBPM >= Number(goal.targetBPM);
}

function autoUpdateGoalOnPracticeEnd(goalId, avgBPM, durationMinutes) {
  const goalIdx = goals.findIndex(g => g.id === goalId);
  if (goalIdx === -1) return null;
  const goal = goals[goalIdx];
  let updates = { ...goal };
  let achievedGoal = false;
  if (!goal.completed && checkGoalBPMGoal(goal, avgBPM)) {
    updates.completed = true;
    updates.completedAt = new Date().toISOString();
    updates.completedBy = 'auto';
    achievedGoal = true;
  }
  goals[goalIdx] = updates;
  persistGoals();
  return { goal: updates, achievedGoal };
}

function manuallyUndoGoalCompletion(goalId) {
  const goalIdx = goals.findIndex(g => g.id === goalId);
  if (goalIdx === -1) return false;
  if (!goals[goalIdx].completed) return false;
  goals[goalIdx].completed = false;
  goals[goalIdx].completedAt = null;
  goals[goalIdx].completedBy = null;
  persistGoals();
  return true;
}

function manuallyMarkGoalComplete(goalId) {
  const goalIdx = goals.findIndex(g => g.id === goalId);
  if (goalIdx === -1) return false;
  goals[goalIdx].completed = true;
  goals[goalIdx].completedAt = new Date().toISOString();
  goals[goalIdx].completedBy = 'manual';
  persistGoals();
  return true;
}

function generateTodayPlanSuggestions() {
  const today = new Date().toISOString().slice(0, 10);
  const suggestions = [];
  const activeGoals = goals.filter(g => !g.completed);

  activeGoals.forEach(goal => {
    const progress = getGoalProgress(goal);
    const daysUntil = getDaysUntilDeadline(goal);

    if (isGoalNearDeadline(goal, 7)) {
      const urgency = daysUntil <= 2 ? 'urgent' : (daysUntil <= 5 ? 'warning' : 'info');
      suggestions.push({
        id: `${goal.id}-deadline`,
        goalId: goal.id,
        type: 'deadline',
        urgency,
        title: `🎯 目标临近截止：${goal.title}`,
        message: daysUntil === 0
          ? `今天是截止日期！距离目标质量分还差 ${Math.max(0, progress.targetBPM - progress.maxBPMReached)} 分，进度 ${progress.overallProgress}%`
          : `还有 ${daysUntil} 天截止，当前进度 ${progress.overallProgress}%，建议今日加强观测`,
        action: { label: '立即去观测', view: 'practice', goalId: goal.id }
      });
    }

    if (goal.weeklyMinutes && progress.durationProgress < 60) {
      const remaining = Number(goal.weeklyMinutes) - progress.weekMinutes;
      if (remaining > 0) {
        const urgency = progress.durationProgress < 25 ? 'urgent' : (progress.durationProgress < 50 ? 'warning' : 'info');
        suggestions.push({
          id: `${goal.id}-duration`,
          goalId: goal.id,
          type: 'duration',
          urgency,
          title: `⏱️ 周观测时长不足：${goal.title}`,
          message: `本周仅完成 ${progress.weekMinutes} 分钟（目标 ${goal.weeklyMinutes} 分钟），还差 ${remaining} 分钟，建议今日至少观测 ${Math.ceil(remaining / 3)} 分钟`,
          action: { label: '开始计时观测', view: 'practice', goalId: goal.id }
        });
      }
    }

    if (goal.targetBPM && progress.bpmProgress < 50 && !isGoalOverdue(goal)) {
      suggestions.push({
        id: `${goal.id}-bpm`,
        goalId: goal.id,
        type: 'bpm',
        urgency: 'info',
        title: `📊 质量分进展较慢：${goal.title}`,
        message: `当前最高质量分 ${progress.maxBPMReached || '尚未记录'}，目标 ${goal.targetBPM} 分，建议今日专注准确观测逐步提升`,
        action: { label: '设置质量分去观测', view: 'practice', goalId: goal.id, bpm: Math.max(Number(goal.startBPM) || 60, progress.maxBPMReached || Number(goal.startBPM) || 60) }
      });
    }
  });

  const sortOrder = { urgent: 0, warning: 1, info: 2 };
  suggestions.sort((a, b) => sortOrder[a.urgency] - sortOrder[b.urgency]);
  return suggestions;
}

const goalForm = document.querySelector('#goalForm');
const cancelGoalEditBtn = document.querySelector('#cancelGoalEdit');
const goalFormTitle = document.querySelector('#goalFormTitle');
const practiceGoalSelect = document.querySelector('#practiceGoalSelect');

goalForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(goalForm).entries());
  const goal = {
    id: editingGoalId || crypto.randomUUID(),
    title: data.title,
    goalType: data.goalType,
    priority: data.priority,
    targetBPM: data.targetBPM ? Number(data.targetBPM) : null,
    startBPM: data.startBPM ? Number(data.startBPM) : null,
    weeklyMinutes: data.weeklyMinutes ? Number(data.weeklyMinutes) : null,
    deadline: data.deadline || null,
    description: data.description || '',
    completed: false,
    completedAt: null,
    completedBy: null,
    createdAt: editingGoalId ? (goals.find(g => g.id === editingGoalId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
  };

  if (editingGoalId) {
    const idx = goals.findIndex(g => g.id === editingGoalId);
    if (idx !== -1) {
      goal.completed = goals[idx].completed;
      goal.completedAt = goals[idx].completedAt;
      goal.completedBy = goals[idx].completedBy;
      goals[idx] = goal;
    }
  } else {
    goals.unshift(goal);
  }
  editingGoalId = null;
  goalForm.reset();
  cancelGoalEditBtn.style.display = 'none';
  goalFormTitle.textContent = '🎯 新增观测目标';
  persistGoals();
  render();
});

cancelGoalEditBtn && cancelGoalEditBtn.addEventListener('click', () => {
  editingGoalId = null;
  goalForm.reset();
  cancelGoalEditBtn.style.display = 'none';
  goalFormTitle.textContent = '🎯 新增观测目标';
});

function editGoal(id) {
  const goal = goals.find(g => g.id === id);
  if (!goal) return;
  editingGoalId = id;
  goalFormTitle.textContent = '✏️ 编辑观测目标';
  cancelGoalEditBtn.style.display = 'inline-block';
  Object.entries(goal).forEach(([key, value]) => {
    if (goalForm.elements[key] && value !== null && value !== undefined) {
      goalForm.elements[key].value = value;
    }
  });
  render();
}

function removeGoal(id) {
  if (!confirm('确定要删除这个目标吗？关联的观测记录将保留，但目标将不再显示在看板中。')) return;
  goals = goals.filter(g => g.id !== id);
  if (editingGoalId === id) {
    editingGoalId = null;
    goalForm.reset();
    cancelGoalEditBtn.style.display = 'none';
    goalFormTitle.textContent = '🎯 新增观测目标';
  }
  persistGoals();
  render();
}

document.addEventListener('click', (e) => {
  const filterBtn = e.target.closest('.goalFilterTab');
  if (filterBtn) {
    goalFilterMode = filterBtn.dataset.filter;
    document.querySelectorAll('.goalFilterTab').forEach(btn => {
      btn.classList.toggle('active', btn === filterBtn);
    });
    renderGoalList();
    return;
  }

  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;
  const action = actionEl.dataset.action;
  const goalId = actionEl.dataset.goalId;

  switch (action) {
    case 'edit-goal':
      editGoal(goalId);
      break;
    case 'delete-goal':
      removeGoal(goalId);
      break;
    case 'complete-goal':
      if (manuallyMarkGoalComplete(goalId)) {
        alert('✅ 已手动标记目标为达成状态');
        render();
      }
      break;
    case 'undo-goal':
      if (manuallyUndoGoalCompletion(goalId)) {
        alert('↩️ 已撤销目标达成状态，您可以继续努力！');
        render();
      }
      break;
    case 'go-practice': {
      const bpm = actionEl.dataset.bpm;
      currentView = 'practice';
      render();
      if (bpm) {
        setTimeout(() => {
          const input = document.querySelector('#practiceBPMInput');
          if (input) input.value = bpm;
        }, 50);
      }
      break;
    }
    case 'select-goal-practice': {
      currentView = 'practice';
      const gid = actionEl.dataset.goalId;
      render();
      setTimeout(() => {
        const sel = document.querySelector('#practiceGoalSelect');
        if (sel && gid) sel.value = gid;
        const event = new Event('change');
        sel && sel.dispatchEvent(event);
      }, 50);
      break;
    }
  }
});

const practiceStartBtn = document.querySelector('#practiceStartBtn');
const practicePauseBtn = document.querySelector('#practicePauseBtn');
const practiceStopBtn = document.querySelector('#practiceStopBtn');
const practiceBPMInput = document.querySelector('#practiceBPMInput');
const tapBtn = document.querySelector('#tapBtn');
const metronomeToggleBtn = document.querySelector('#metronomeToggleBtn');

let tapTimes = [];
let metronomeEnabled = false;
let metronomeAudioCtx = null;
let metronomeInterval = null;

function updateTimerDisplay() {
  const total = practiceTimerState.elapsedSeconds;
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  document.querySelector('#timerDigits').textContent = `${h}:${m}:${s}`;
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}小时${m}分${s}秒`;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
}

practiceStartBtn && practiceStartBtn.addEventListener('click', () => {
  if (practiceTimerState.isRunning) return;
  practiceTimerState.isRunning = true;
  practiceTimerState.startTime = Date.now() - practiceTimerState.elapsedSeconds * 1000;
  practiceTimerState.timerInterval = setInterval(() => {
    practiceTimerState.elapsedSeconds = Math.floor((Date.now() - practiceTimerState.startTime) / 1000);
    updateTimerDisplay();
  }, 1000);
  practiceStartBtn.textContent = '▶️ 观测中';
  practiceStartBtn.disabled = true;
  practicePauseBtn.disabled = false;
  practiceStopBtn.disabled = false;
  document.querySelector('#practiceStatusBadge').textContent = '观测中';
  document.querySelector('#practiceStatusBadge').className = 'countBadge compareQualityGood';
  if (metronomeEnabled) startMetronome();
});

practicePauseBtn && practicePauseBtn.addEventListener('click', () => {
  if (!practiceTimerState.isRunning) return;
  practiceTimerState.isRunning = false;
  clearInterval(practiceTimerState.timerInterval);
  practiceStartBtn.textContent = '▶️ 继续观测';
  practiceStartBtn.disabled = false;
  practicePauseBtn.disabled = true;
  document.querySelector('#practiceStatusBadge').textContent = '已暂停';
  document.querySelector('#practiceStatusBadge').className = 'countBadge compareQualityWarning';
  stopMetronome();
});

practiceStopBtn && practiceStopBtn.addEventListener('click', () => {
  if (!confirm(`确定结束本次观测吗？\n\n已观测：${formatDuration(practiceTimerState.elapsedSeconds)}`)) return;
  finishPracticeSession();
});

function finishPracticeSession() {
  clearInterval(practiceTimerState.timerInterval);
  practiceTimerState.isRunning = false;
  const durationSeconds = practiceTimerState.elapsedSeconds;
  stopMetronome();

  if (durationSeconds < 5) {
    alert('观测时间太短，不保存记录（至少5秒）');
    resetPracticeState();
    return;
  }

  const goalId = practiceGoalSelect ? practiceGoalSelect.value : '';
  const goal = goalId ? goals.find(g => g.id === goalId) : null;
  const durationMinutes = Math.round(durationSeconds / 60 * 10) / 10;
  const bpmInput = Number(practiceBPMInput?.value) || 60;

  const tapBPMs = tapTimes.map(t => t.bpm).filter(b => b > 0);
  const avgBPM = tapBPMs.length > 0
    ? Math.round(tapBPMs.reduce((a, b) => a + b, 0) / tapBPMs.length)
    : bpmInput;
  const maxBPM = tapBPMs.length > 0 ? Math.max(...tapBPMs) : bpmInput;

  const record = {
    id: crypto.randomUUID(),
    goalId: goalId || null,
    goalTitle: goal ? goal.title : '自由观测',
    date: new Date().toISOString().slice(0, 10),
    startTime: new Date(Date.now() - durationSeconds * 1000).toISOString(),
    endTime: new Date().toISOString(),
    durationSeconds,
    durationMinutes,
    practiceBPM: bpmInput,
    avgBPM,
    maxBPM,
    tapCount: tapTimes.length,
    note: ''
  };

  practiceRecords.unshift(record);
  persistPracticeRecords();

  let resultMsg = `✅ 观测记录已保存！\n\n观测时长：${formatDuration(durationSeconds)}\n设置质量分：${bpmInput}\n平均质量分：${avgBPM}\n最高质量分：${maxBPM}\n评估次数：${tapTimes.length}`;

  if (goalId) {
    const result = autoUpdateGoalOnPracticeEnd(goalId, avgBPM, durationMinutes);
    if (result && result.achievedGoal) {
      resultMsg += `\n\n🎉 恭喜！本次观测达到了目标质量分 ${goal.targetBPM}，目标 "${goal.title}" 已自动标记为达成！\n（可在目标看板中手动撤销达成状态）`;
    } else if (goal) {
      const progress = getGoalProgress(goal);
      resultMsg += `\n\n📊 目标进度更新：${progress.overallProgress}%\n质量分进度：${progress.bpmProgress}%\n时长进度：${progress.durationProgress}%`;
    }
  }

  alert(resultMsg);
  resetPracticeState();
  render();
}

function resetPracticeState() {
  practiceTimerState.isRunning = false;
  practiceTimerState.elapsedSeconds = 0;
  practiceTimerState.startTime = null;
  tapTimes = [];
  practiceStartBtn.textContent = '▶️ 开始观测';
  practiceStartBtn.disabled = false;
  practicePauseBtn.disabled = true;
  practiceStopBtn.disabled = true;
  document.querySelector('#practiceStatusBadge').textContent = '准备中';
  document.querySelector('#practiceStatusBadge').className = 'countBadge';
  document.querySelector('#practiceStatusBadge').style.background = '#e0f2fe';
  document.querySelector('#practiceStatusBadge').style.color = '#075985';
  document.querySelector('#tapBPM').textContent = '--';
  document.querySelector('#tapAvgBPM').textContent = '--';
  document.querySelector('#tapCount').textContent = '0';
  updateTimerDisplay();
}

practiceBPMInput && practiceBPMInput.addEventListener('change', () => {
  const val = Number(practiceBPMInput.value);
  if (val >= 20 && val <= 100) {
    document.querySelector('#timerBPMDisplay').textContent = `质量分: ${val}`;
    if (metronomeEnabled && practiceTimerState.isRunning) {
      stopMetronome();
      startMetronome();
    }
  }
});

['bpmMinus10', 'bpmMinus5', 'bpmPlus5', 'bpmPlus10'].forEach(id => {
  const btn = document.querySelector('#' + id);
  if (!btn) return;
  btn.addEventListener('click', () => {
    const delta = Number(id.replace(/bpm/, ''));
    const cur = Number(practiceBPMInput.value) || 60;
    const newVal = Math.max(20, Math.min(100, cur + delta));
    practiceBPMInput.value = newVal;
    document.querySelector('#timerBPMDisplay').textContent = `质量分: ${newVal}`;
    if (metronomeEnabled && practiceTimerState.isRunning) {
      stopMetronome();
      startMetronome();
    }
  });
});

tapBtn && tapBtn.addEventListener('click', () => {
  const now = Date.now();
  if (tapTimes.length > 0) {
    const lastTime = tapTimes[tapTimes.length - 1].time;
    if (now - lastTime > 3000) {
      tapTimes = [];
    }
  }
  tapTimes.push({ time: now, bpm: 0 });
  if (tapTimes.length >= 2) {
    const intervals = [];
    for (let i = 1; i < tapTimes.length; i++) {
      intervals.push(tapTimes[i].time - tapTimes[i - 1].time);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = Math.round(60000 / avgInterval);
    tapTimes[tapTimes.length - 1].bpm = bpm;
    document.querySelector('#tapBPM').textContent = bpm;
    const validBPMs = tapTimes.map(t => t.bpm).filter(b => b > 0);
    if (validBPMs.length > 0) {
      const avg = Math.round(validBPMs.reduce((a, b) => a + b, 0) / validBPMs.length);
      document.querySelector('#tapAvgBPM').textContent = avg;
    }
  }
  document.querySelector('#tapCount').textContent = tapTimes.length;
  tapBtn.style.transform = 'scale(0.95)';
  setTimeout(() => { tapBtn.style.transform = ''; }, 80);
});

metronomeToggleBtn && metronomeToggleBtn.addEventListener('click', () => {
  metronomeEnabled = !metronomeEnabled;
  if (metronomeEnabled) {
    metronomeToggleBtn.textContent = '🔕 关闭提醒';
    metronomeToggleBtn.style.background = '#d9f3ed';
    metronomeToggleBtn.style.color = '#0d9488';
    if (practiceTimerState.isRunning) startMetronome();
  } else {
    metronomeToggleBtn.textContent = '🔔 开启提醒';
    metronomeToggleBtn.style.background = '';
    metronomeToggleBtn.style.color = '';
    stopMetronome();
  }
});

function startMetronome() {
  if (!metronomeEnabled) return;
  if (!metronomeAudioCtx) {
    try {
      metronomeAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return; }
  }
  if (metronomeAudioCtx.state === 'suspended') {
    metronomeAudioCtx.resume();
  }
  const bpm = Number(practiceBPMInput?.value) || 60;
  const intervalMs = (60 / bpm) * 1000;
  let beat = 0;
  playClick();
  metronomeInterval = setInterval(() => {
    beat++;
    playClick(beat % 4 === 0);
  }, intervalMs);
}

function playClick(accent = false) {
  if (!metronomeAudioCtx) return;
  const osc = metronomeAudioCtx.createOscillator();
  const gain = metronomeAudioCtx.createGain();
  osc.connect(gain);
  gain.connect(metronomeAudioCtx.destination);
  osc.frequency.value = accent ? 1200 : 800;
  osc.type = 'sine';
  gain.gain.setValueAtTime(accent ? 0.2 : 0.1, metronomeAudioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, metronomeAudioCtx.currentTime + 0.05);
  osc.start();
  osc.stop(metronomeAudioCtx.currentTime + 0.05);
}

function stopMetronome() {
  if (metronomeInterval) {
    clearInterval(metronomeInterval);
    metronomeInterval = null;
  }
}

practiceGoalSelect && practiceGoalSelect.addEventListener('change', () => {
  const goalId = practiceGoalSelect.value;
  const goal = goals.find(g => g.id === goalId);
  const disp = document.querySelector('#timerGoalDisplay');
  if (!disp) return;
  if (goal) {
    disp.textContent = `目标：${goal.title} (目标质量分: ${goal.targetBPM || '-'})`;
    if (goal.targetBPM) {
      const maxBPM = getGoalMaxBPM(goalId);
      const suggested = maxBPM > 0 ? Math.min(maxBPM + 5, Number(goal.targetBPM)) : (Number(goal.startBPM) || Number(goal.targetBPM) - 20);
      if (practiceBPMInput) {
        practiceBPMInput.value = Math.max(20, suggested);
        document.querySelector('#timerBPMDisplay').textContent = `质量分: ${practiceBPMInput.value}`;
      }
    }
  } else {
    disp.textContent = '未绑定目标';
  }
});

function renderGoalList() {
  const container = document.querySelector('#goalListContainer');
  if (!container) return;

  let list = goals;
  const today = new Date().toISOString().slice(0, 10);

  if (goalFilterMode === 'active') {
    list = goals.filter(g => !g.completed && !isGoalOverdue(g));
  } else if (goalFilterMode === 'completed') {
    list = goals.filter(g => g.completed);
  } else if (goalFilterMode === 'overdue') {
    list = goals.filter(g => isGoalOverdue(g));
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  list.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  if (list.length === 0) {
    container.innerHTML = '<p class="empty" style="text-align:center;padding:40px 16px;">暂无目标，快去创建第一个观测目标吧！🎯</p>';
    return;
  }

  container.innerHTML = list.map(goal => {
    const progress = getGoalProgress(goal);
    const overdue = isGoalOverdue(goal);
    const nearDeadline = isGoalNearDeadline(goal, 7);
    const daysUntil = getDaysUntilDeadline(goal);
    const priorityMap = { high: { text: '🔴 高', cls: 'goalPriHigh' }, medium: { text: '🟡 中', cls: 'goalPriMedium' }, low: { text: '🟢 低', cls: 'goalPriLow' } };
    const pri = priorityMap[goal.priority] || priorityMap.medium;

    let statusBadge = '';
    if (goal.completed) {
      statusBadge = `<span class="goalBadge goalBadgeSuccess">✅ 已达成${goal.completedBy === 'auto' ? '（自动）' : goal.completedBy === 'manual' ? '（手动）' : ''}</span>`;
    } else if (overdue) {
      statusBadge = `<span class="goalBadge goalBadgeError">⏰ 已逾期${daysUntil !== null ? ` ${Math.abs(daysUntil)}天` : ''}</span>`;
    } else if (nearDeadline) {
      statusBadge = `<span class="goalBadge goalBadgeWarning">⏳ ${daysUntil === 0 ? '今日截止' : `还剩${daysUntil}天`}</span>`;
    }

    const bpmBar = (goal.targetBPM && progress.targetBPM > 0)
      ? `<div class="goalSubProgress">
          <div class="goalSubLabel">📊 质量分进度：${progress.maxBPMReached || 0} / ${progress.targetBPM} 分</div>
          <div class="progressBar"><div class="progressFill" style="width:${progress.bpmProgress}%;background:linear-gradient(90deg,#0d9488,#14b8a6);"></div></div>
        </div>` : '';

    const durBar = goal.weeklyMinutes
      ? `<div class="goalSubProgress">
          <div class="goalSubLabel">⏱️ 本周时长：${progress.weekMinutes} / ${progress.weeklyMinutes} 分钟</div>
          <div class="progressBar"><div class="progressFill" style="width:${progress.durationProgress}%;background:linear-gradient(90deg,#6366f1,#8b5cf6);"></div></div>
        </div>` : '';

    const undoButton = goal.completed
      ? `<button class="ghost goalActionBtn" data-action="undo-goal" data-goal-id="${goal.id}" title="撤销达成状态">↩️ 撤销</button>`
      : `<button class="ghost goalActionBtn" data-action="complete-goal" data-goal-id="${goal.id}" title="手动标记完成">✅ 标记达成</button>`;

    return `
      <div class="goalCard ${goal.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''}">
        <div class="goalCardHeader">
          <div class="goalTitleRow">
            <h3 class="goalTitle">${escapeHtml(goal.title)}</h3>
            <span class="goalPriority ${pri.cls}">${pri.text}</span>
          </div>
          <div class="goalMetaRow">
            <span class="goalTypeTag">${goal.goalType === 'bpm' ? '质量分目标' : goal.goalType === 'duration' ? '时长目标' : '综合目标'}</span>
            ${goal.deadline ? `<span class="goalDeadline">📅 ${goal.deadline}</span>` : ''}
            ${statusBadge}
          </div>
        </div>
        ${goal.description ? `<p class="goalDesc">${escapeHtml(goal.description)}</p>` : ''}
        <div class="goalMainProgress">
          <div class="goalMainLabel">综合进度：<strong>${progress.overallProgress}%</strong></div>
          <div class="progressBar large">
            <div class="progressFill" style="width:${progress.overallProgress}%;"></div>
          </div>
        </div>
        ${bpmBar}
        ${durBar}
        <div class="goalCardActions">
          ${!goal.completed ? `<button class="primary goalActionBtn primary-action" data-action="select-goal-practice" data-goal-id="${goal.id}">▶️ 去观测</button>` : ''}
          ${undoButton}
          <button class="ghost goalActionBtn" data-action="edit-goal" data-goal-id="${goal.id}">✏️ 编辑</button>
          <button class="ghost goalActionBtn" data-action="delete-goal" data-goal-id="${goal.id}" style="color:#dc2626;background:#fee2e2;">🗑️ 删除</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderGoalStats() {
  const container = document.querySelector('#goalStatsRow');
  if (!container) return;
  const active = goals.filter(g => !g.completed && !isGoalOverdue(g)).length;
  const completed = goals.filter(g => g.completed).length;
  const overdue = goals.filter(g => isGoalOverdue(g)).length;
  const total = goals.length;
  const today = new Date().toISOString().slice(0, 10);
  const weekMin = getTotalWeekPracticeMinutes(today);
  container.innerHTML = `
    <span class="countBadge" style="background:#d9f3ed;color:#0d9488;">进行中 ${active}</span>
    <span class="countBadge" style="background:#dcfce7;color:#166534;">已达成 ${completed}</span>
    <span class="countBadge" style="background:#fee2e2;color:#dc2626;">逾期 ${overdue}</span>
    <span class="countBadge" style="background:#dbeafe;color:#1e40af;">本周 ${weekMin}分钟</span>
    <span class="countBadge" style="background:#fef3c7;color:#92400e;">共 ${total}</span>
  `;
}

function renderTodayPlan(containerId) {
  const container = document.querySelector(containerId);
  if (!container) return;
  const today = new Date().toISOString().slice(0, 10);
  const badgeId = containerId === '#todayPlanContent' ? '#todayDateBadge' : '#planDateBadge2';
  const badgeEl = document.querySelector(badgeId);
  if (badgeEl) {
    const d = new Date();
    badgeEl.textContent = `${d.getMonth() + 1}月${d.getDate()}日`;
  }

  const todayPractices = practiceRecords.filter(r => r.date === today);
  const todayMinutes = todayPractices.reduce((s, r) => s + r.durationMinutes, 0);
  const suggestions = generateTodayPlanSuggestions();

  let summaryHtml = `<div class="planSummary">
    <div class="planSumItem"><span>今日观测</span><strong>${todayMinutes.toFixed(1)} 分钟</strong></div>
    <div class="planSumItem"><span>本周累计</span><strong>${getTotalWeekPracticeMinutes(today).toFixed(1)} 分钟</strong></div>
    <div class="planSumItem"><span>今日观测次</span><strong>${todayPractices.length} 次</strong></div>
  </div>`;

  if (todayPractices.length > 0) {
    summaryHtml += `<div class="todayPracticeTinyList">
      <div class="tinyListTitle">今日观测记录</div>
      ${todayPractices.slice(0, 3).map(r => `
        <div class="tinyPracticeItem">
          <span class="tinyTime">${new Date(r.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
          <span class="tinyTitle">${escapeHtml(r.goalTitle || '自由观测')}</span>
          <span class="tinyMin">${r.durationMinutes.toFixed(1)}分</span>
          <span class="tinyBPM">${r.avgBPM}分</span>
        </div>
      `).join('')}
    </div>`;
  }

  let suggestionsHtml = '';
  if (suggestions.length > 0) {
    suggestionsHtml = `<div class="planSuggestions">
      <div class="suggestionTitle">💡 补练建议</div>
      ${suggestions.map(s => {
        const bgClass = s.urgency === 'urgent' ? 'sug-urgent' : (s.urgency === 'warning' ? 'sug-warning' : 'sug-info');
        return `<div class="planSuggestionItem ${bgClass}">
          <div class="sugTitle">${s.title}</div>
          <div class="sugMsg">${s.message}</div>
          ${s.action ? `<button class="primary sugActionBtn" data-action="${s.action.view === 'practice' ? 'select-goal-practice' : 'go-practice'}" data-goal-id="${s.action.goalId}" ${s.action.bpm ? `data-bpm="${s.action.bpm}"` : ''}>🏃 ${s.action.label}</button>` : ''}
        </div>`;
      }).join('')}
    </div>`;
  } else {
    suggestionsHtml = `<div class="planSuggestionItem sug-success">
      <div class="sugTitle">✨ 今日状态良好</div>
      <div class="sugMsg">所有目标进度正常，暂无紧急补测建议。继续保持！🎉</div>
    </div>`;
  }

  container.innerHTML = summaryHtml + suggestionsHtml;
}

function renderPracticeGoalSelect() {
  const sel = document.querySelector('#practiceGoalSelect');
  if (!sel) return;
  const activeGoals = goals.filter(g => !g.completed);
  const prevVal = sel.value;
  sel.innerHTML = `<option value="">-- 无目标自由观测 --</option>` +
    activeGoals.map(g => `<option value="${g.id}">${escapeHtml(g.title)}${g.targetBPM ? ` (目标${g.targetBPM}分)` : ''}</option>`).join('');
  if (prevVal && goals.find(g => g.id === prevVal)) sel.value = prevVal;
}

function renderPracticeStats() {
  const sumContainer = document.querySelector('#practiceStatsSummary');
  const cntContainer = document.querySelector('#practiceRecordCount');
  if (!sumContainer || !cntContainer) return;

  const today = new Date().toISOString().slice(0, 10);
  const weekMin = getTotalWeekPracticeMinutes(today);
  const todayMin = practiceRecords.filter(r => r.date === today).reduce((s, r) => s + r.durationMinutes, 0);
  const totalMin = practiceRecords.reduce((s, r) => s + r.durationMinutes, 0);
  const avgBPM = practiceRecords.length > 0
    ? Math.round(practiceRecords.filter(r => r.avgBPM).reduce((s, r) => s + r.avgBPM, 0) / Math.max(1, practiceRecords.filter(r => r.avgBPM).length))
    : 0;

  sumContainer.innerHTML = `
    <div class="practiceStatCard">
      <span>今日</span>
      <strong>${todayMin.toFixed(1)}<small>分</small></strong>
    </div>
    <div class="practiceStatCard">
      <span>本周</span>
      <strong>${weekMin.toFixed(1)}<small>分</small></strong>
    </div>
    <div class="practiceStatCard">
      <span>累计</span>
      <strong>${totalMin.toFixed(0)}<small>分</small></strong>
    </div>
    <div class="practiceStatCard">
      <span>平均质量分</span>
      <strong>${avgBPM}</strong>
    </div>
  `;
  cntContainer.textContent = `${practiceRecords.length} 条记录`;
}

function renderPracticeRecordList() {
  const container = document.querySelector('#practiceRecordList');
  if (!container) return;
  if (practiceRecords.length === 0) {
    container.innerHTML = '<p class="empty" style="text-align:center;padding:32px 16px;">暂无观测记录，开始您的第一次观测吧！</p>';
    return;
  }
  const list = practiceRecords.slice(0, 30);
  container.innerHTML = `
    <div class="tableWrap">
      <table>
        <thead>
          <tr>
            <th>日期</th><th>时长</th><th>关联目标</th><th>设置质量分</th><th>平均/最高</th><th>评估次数</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(r => `
            <tr>
              <td>${r.date}<br><small style="color:#8899a6;">${new Date(r.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</small></td>
              <td><strong>${r.durationMinutes.toFixed(1)}</strong>分</td>
              <td>${escapeHtml(r.goalTitle || '-')}</td>
              <td>${r.practiceBPM}</td>
              <td>${r.avgBPM || '-'} / ${r.maxBPM || '-'}</td>
              <td>${r.tapCount || 0}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ${practiceRecords.length > 30 ? `<p class="reportMore">显示最近30条，共${practiceRecords.length}条记录</p>` : ''}
  `;
}

function renderGoalsView() {
  document.querySelector('#formSection').style.display = 'none';
  document.querySelector('#calendarViewSection').style.display = 'none';
  document.querySelector('#listViewSection').style.display = 'none';
  document.querySelector('#mapSection').style.display = 'none';
  document.querySelector('#stationSection').style.display = 'none';
  document.querySelector('#snapshotSection').style.display = 'none';
  document.querySelector('#weatherDictSection').style.display = 'none';
  document.querySelector('#rulesCenterSection').style.display = 'none';
  document.querySelector('#compareViewSection').style.display = 'none';
  document.querySelector('#reportViewSection').style.display = 'none';
  document.querySelector('#practiceViewSection').style.display = 'none';
  document.querySelector('#oplogSection').style.display = '';
  document.querySelector('#goalsViewSection').style.display = '';

  renderGoalStats();
  document.querySelectorAll('.goalFilterTab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === goalFilterMode);
  });
  renderGoalList();
  renderTodayPlan('#todayPlanContent');
  renderOpLog();
}

function renderPracticeView() {
  document.querySelector('#formSection').style.display = 'none';
  document.querySelector('#calendarViewSection').style.display = 'none';
  document.querySelector('#listViewSection').style.display = 'none';
  document.querySelector('#mapSection').style.display = 'none';
  document.querySelector('#stationSection').style.display = 'none';
  document.querySelector('#snapshotSection').style.display = 'none';
  document.querySelector('#weatherDictSection').style.display = 'none';
  document.querySelector('#rulesCenterSection').style.display = 'none';
  document.querySelector('#compareViewSection').style.display = 'none';
  document.querySelector('#reportViewSection').style.display = 'none';
  document.querySelector('#goalsViewSection').style.display = 'none';
  document.querySelector('#oplogSection').style.display = '';
  document.querySelector('#practiceViewSection').style.display = '';

  renderPracticeGoalSelect();
  renderPracticeStats();
  renderPracticeRecordList();
  renderTodayPlan('#todayPlanInPracticeContent');
  updateTimerDisplay();
  document.querySelector('#timerBPMDisplay').textContent = `质量分: ${practiceBPMInput?.value || 60}`;
  const sel = document.querySelector('#practiceGoalSelect');
  if (sel) {
    const disp = document.querySelector('#timerGoalDisplay');
    if (disp && sel.value) {
      const g = goals.find(x => x.id === sel.value);
      disp.textContent = g ? `目标：${g.title} (目标质量分: ${g.targetBPM || '-'})` : '未绑定目标';
    } else if (disp) {
      disp.textContent = '未绑定目标';
    }
  }
  renderOpLog();
}

render();
