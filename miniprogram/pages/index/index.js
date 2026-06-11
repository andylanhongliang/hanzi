// 主页 - 汉字图谱
const graph = require('../../utils/graph');
const audio = require('../../utils/audio');
const storage = require('../../utils/storage');

// 里程碑定义
const milestones = [
  { count: 10, badge: '🌱', title: '识字萌芽' },
  { count: 20, badge: '🌿', title: '识字新苗' },
  { count: 50, badge: '🌳', title: '识字小树' },
  { count: 100, badge: '🏆', title: '识字达人' },
  { count: 200, badge: '🎖️', title: '识字高手' },
  { count: 300, badge: '👑', title: '识字大师' },
  { count: 400, badge: '🐉', title: '汉字龙王' },
  { count: 500, badge: '🌟', title: '汉字之神' }
];

Page({
  data: {
    ec: { lazyLoad: true },
    loading: true,
    eyeProtect: false,
    soundEnabled: true,
    unlockedCount: 1,
    totalCount: 0,
    todayCount: 0,
    dailyTarget: 3,
    showPanel: false,
    selectedNode: null,
    words: [],
    idioms: [],
    neighbors: [],
    showOnlyUnlocked: false,
    showMilestone: false,
    milestoneData: { badge: '🌟', title: '' }
  },

  chartInstance: null,
  pulseTimer: null,
  lastMilestone: 0,
  dataReady: false,
  rendering: false,

  onLoad() {
    graph.initDataStructures();
    const nodeMap = graph.getNodeMap();
    const userData = storage.getUserData();
    const unlocked = userData.unlocked || ['一'];

    this.setData({
      eyeProtect: storage.getEyeProtect(),
      soundEnabled: storage.getSoundEnabled(),
      unlockedCount: unlocked.length,
      totalCount: nodeMap.size,
      todayCount: userData.todayCount || 0,
      dailyTarget: userData.dailyTarget || 3
    });

    for (let i = milestones.length - 1; i >= 0; i--) {
      if (unlocked.length >= milestones[i].count) {
        this.lastMilestone = milestones[i].count;
        break;
      }
    }

    this.dataReady = true;
    console.log('主页初始化 | 已解锁:', unlocked.length);
  },

  onReady() {
    const ecComponent = this.selectComponent('#hanziChart');
    if (ecComponent) {
      ecComponent.init(this.initChart.bind(this));
    } else {
      console.error('未找到 ec-canvas 组件');
    }
  },

  initChart(canvas, width, height, dpr) {
    console.log('[index] initChart | canvas尺寸: ' + width + 'x' + height + ' | dpr: ' + dpr);
    try {
      const echarts = require('../../components/ec-canvas/echarts');
      // 小程序环境降低渲染压力：dpr 固定为 1
      var safeDpr = 1;
      var safeWidth = Math.min(width, 800);
      var safeHeight = Math.min(height, 1200);
      console.log('[index] initChart 实际参数 | canvas: ' + safeWidth + 'x' + safeHeight + ' | dpr: ' + safeDpr);
      const chart = echarts.init(canvas, null, {
        width: safeWidth, height: safeHeight, devicePixelRatio: safeDpr
      });
      console.log('[index] ECharts 初始化成功');

      this.chartInstance = chart;

      // 暂时注释，排查是否 click 事件导致 timeout
      // chart.on('click', (params) => {
      //   if (params.dataType === 'node') this.onNodeClick(params.data);
      // });

      // 延迟渲染，确保 canvas 完全就绪
      var that = this;
      setTimeout(function () {
        try {
          that.renderChart();
          console.log('[index] renderChart 完成');
        } catch (e) {
          console.error('[index] renderChart 异常:', e.message, e.stack);
        }
      }, 1000);

      setTimeout(function () {
        that.setData({ loading: false });
        that.locateRecommended();
      }, 800);

      return chart;
    } catch (e) {
      console.error('[index] initChart 异常:', e.message, e.stack);
      return null;
    }
  },

  renderChart() {
    if (!this.chartInstance || this.rendering) return;
    this.rendering = true;
    try {
    const userData = storage.getUserData();
    const unlocked = userData.unlocked || ['一'];
    const lastNode = userData.lastNode || '一';
    const recommendedId = graph.getRecommendedNode(unlocked, lastNode);
    const option = graph.buildChartOption(unlocked, recommendedId);
    var nodeCount = option.series[0].data.length;
    var linkCount = option.series[0].links.length;
    console.log('[index] 渲染图谱 | 节点: ' + nodeCount + ' | 连线: ' + linkCount + ' | 已解锁: ' + unlocked.length);
    this.chartInstance.setOption(option, true);

    this.setData({
      unlockedCount: unlocked.length,
      todayCount: userData.todayCount || 0
    });

    this.startPulse(recommendedId);
    } catch(e) {
      console.error('[index] renderChart 异常:', e.message);
    } finally {
      this.rendering = false;
    }
  },

  onNodeClick(nodeData) {
    const userData = storage.getUserData();
    const unlocked = userData.unlocked || ['一'];
    const nodeId = nodeData.id;

    if (!unlocked.includes(nodeId)) {
      wx.navigateTo({ url: '/pages/guess/guess?nodeId=' + nodeId });
    } else {
      this.showNodeDetail(nodeId);
    }
  },

  showNodeDetail(nodeId) {
    const nodeMap = graph.getNodeMap();
    const neighborMap = graph.getNeighborMap();
    const node = nodeMap.get(nodeId);
    if (!node) return;

    const words = (node.groupWords || '').split('|').filter(w => w);
    const idioms = (node.idioms || '').split('|').filter(w => w).map(i => i.split('::')[0]);
    const neighbors = (neighborMap.get(nodeId) || []).slice(0, 10);

    this.setData({
      showPanel: true, selectedNode: node,
      words: words, idioms: idioms, neighbors: neighbors
    });
  },

  onNeighborTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id) this.showNodeDetail(id);
  },

  locateRecommended() {
    if (!this.chartInstance) return;
    const userData = storage.getUserData();
    const unlocked = userData.unlocked || ['一'];
    const lastNode = userData.lastNode || '一';
    const rec = graph.getRecommendedNode(unlocked, lastNode);
    if (!rec) { wx.showToast({ title: '🎉 全部解锁！', icon: 'none' }); return; }
    this.tryLocateNode(rec, 8);
  },

  tryLocateNode(nodeId, retryLeft) {
    if (!this.chartInstance || retryLeft <= 0) return;
    const opt = this.chartInstance.getOption();
    if (!opt.series || !opt.series[0] || !opt.series[0].data) {
      setTimeout(() => this.tryLocateNode(nodeId, retryLeft - 1), 400);
      return;
    }
    const node = opt.series[0].data.find(d => d.id === nodeId);
    if (!node || node.x == null) {
      setTimeout(() => this.tryLocateNode(nodeId, retryLeft - 1), 400);
      return;
    }
    const cw = this.chartInstance.getWidth();
    const ch = this.chartInstance.getHeight();
    this.chartInstance.dispatchAction({
      type: 'graphRoam', seriesIndex: 0,
      dx: (cw / 2 - node.x) * 0.7, dy: (ch / 2 - node.y) * 0.7
    });
  },

  startPulse(nodeId) {
    if (this.pulseTimer) clearInterval(this.pulseTimer);
    if (!nodeId || !this.chartInstance) return;
    let big = true;
    this.pulseTimer = setInterval(() => {
      if (!this.chartInstance) { clearInterval(this.pulseTimer); return; }
      const opt = this.chartInstance.getOption();
      if (!opt.series || !opt.series[0] || !opt.series[0].data) return;
      const allData = opt.series[0].data;
      const d = allData.find(x => x.id === nodeId);
      if (!d) return;
      const size = big ? 66 : 58;
      big = !big;
      // 仅更新当前节点，避免全量数据对比
      this.chartInstance.setOption({ series: [{ data: [{ id: nodeId, symbolSize: size }] }] });
    }, 600);
  },

  toggleFilter() {
    const val = !this.data.showOnlyUnlocked;
    this.setData({ showOnlyUnlocked: val });
    this.renderChart();
  },

  zoomIn() {
    if (!this.chartInstance) return;
    const opt = this.chartInstance.getOption();
    const zoom = ((opt.series && opt.series[0] && opt.series[0].zoom) || 1) * 1.4;
    this.chartInstance.setOption({ series: [{ zoom: Math.min(5, zoom) }] });
  },

  zoomOut() {
    if (!this.chartInstance) return;
    const opt = this.chartInstance.getOption();
    const zoom = ((opt.series && opt.series[0] && opt.series[0].zoom) || 1) / 1.4;
    this.chartInstance.setOption({ series: [{ zoom: Math.max(0.2, zoom) }] });
  },

  toggleSound() {
    const val = !this.data.soundEnabled;
    storage.setSoundEnabled(val);
    this.setData({ soundEnabled: val });
  },

  toggleEye() {
    const val = !this.data.eyeProtect;
    storage.setEyeProtect(val);
    this.setData({ eyeProtect: val });
  },

  openProfile() { wx.navigateTo({ url: '/pages/profile/profile' }); },
  openUser() { wx.navigateTo({ url: '/pages/profile/profile?tab=user' }); },

  checkMilestones(count) {
    for (let i = 0; i < milestones.length; i++) {
      if (count >= milestones[i].count && milestones[i].count > this.lastMilestone) {
        this.lastMilestone = milestones[i].count;
        this.showMilestone(milestones[i]);
        audio.playMilestone();
        break;
      }
    }
  },

  showMilestone(m) {
    this.setData({ showMilestone: true, milestoneData: m });
    setTimeout(() => this.setData({ showMilestone: false }), 2800);
  },

  onShow() {
    if (!this.dataReady) return;
    const userData = storage.getUserData();
    const unlocked = userData.unlocked || ['一'];
    this.checkMilestones(unlocked.length);
    this.renderChart();
    this.setData({
      unlockedCount: unlocked.length,
      todayCount: userData.todayCount || 0,
      dailyTarget: userData.dailyTarget || 3,
      soundEnabled: storage.getSoundEnabled(),
      eyeProtect: storage.getEyeProtect()
    });
  },

  onUnload() {
    if (this.pulseTimer) clearInterval(this.pulseTimer);
    if (this.chartInstance) { this.chartInstance.dispose(); this.chartInstance = null; }
  }
});
