/**
 * ReportRenderer - 报告渲染器
 * 用于渲染“简化报告协议”：基本信息 + sections(type/data) 内容块
 * 版本: 5.0 - sections 驱动渲染（旧结构会被转换为内容块）
 */
(function() {
  'use strict';

  // 依赖检查
  if (typeof window === 'undefined' || !window.Request) {
    console.error('ReportRenderer 依赖 Request 封装，请确认 request.js 已加载。');
    return;
  }
  if (!window.echarts) {
    console.error('ReportRenderer 依赖 ECharts，请在 report-renderer.js 之前引入 echarts.min.js。');
  }
  if (!window.ChartParser) {
    console.warn('ReportRenderer 未检测到 ChartParser（chart-parser.js）。纯文本报告仍可渲染，但图表功能不可用。');
  }
  if (!window.ChartFactory) {
    console.warn('ReportRenderer 未检测到 ChartFactory（chart-factory.js）。纯文本报告仍可渲染，但图表功能不可用。');
  }

  class ReportRenderer {
    constructor(options = {}) {
      this.container = options.container;
      this.statusElement = options.statusElement || null;
      this.requestFactory = options.requestFactory || ((reportId) => new Request(`加载报告:${reportId}`, `reports/${reportId}`));
      this.chartInstances = [];
      this.blockElements = new Map();
      this.currentBlocks = [];
      this.currentReport = null;

      if (!this.container) {
        throw new Error('ReportRenderer 需要传入 container DOM 节点。');
      }

      // 监听主题变化
      document.addEventListener('theme:themeChanged', () => {
        this.refreshCharts();
      });
    }

    /**
     * 设置状态显示
     */
    setStatus(type, message) {
      if (!this.statusElement) return;
      const dot = this.statusElement.querySelector('.status-dot');
      const text = this.statusElement.querySelector('.status-text');
      if (dot) {
        dot.classList.toggle('error', type === 'error');
      }
      if (text) {
        text.textContent = message || '';
      }
    }

    /**
     * 显示加载骨架屏
     */
    showSkeleton() {
      const skeleton = document.createElement('div');
      skeleton.className = 'report-section';
      skeleton.innerHTML = `
        <div class="report-header">
          <div class="report-title skeleton" style="width: 180px; height: 20px;"></div>
          <div class="report-badge skeleton" style="width: 120px; height: 20px;"></div>
        </div>
        <div class="report-grid">
          <div class="report-card skeleton" style="height: 90px;"></div>
          <div class="report-card skeleton" style="height: 90px;"></div>
          <div class="report-card skeleton" style="height: 90px;"></div>
        </div>
      `;
      this.container.innerHTML = '';
      this.container.appendChild(skeleton);
    }

    /**
     * 解码报告数据（支持base64或直接对象）
     */
    decodePayload(payload) {
      if (!payload) {
        throw new Error('报告数据为空，无法解码。');
      }

      // 兼容后端统一响应包装：{ code, message, data }
      if (typeof payload === 'object' && payload !== null && 'code' in payload && 'data' in payload) {
        payload = payload.data;
      }

      // 支持 base64 编码的 JSON
      if (payload.base64) {
        try {
          const jsonString = atob(payload.base64);
          return JSON.parse(jsonString);
        } catch (e) {
          throw new Error('报告解码失败：base64 内容无法解析为 JSON。');
        }
      }

      // 支持直接传入报告对象
      if (payload.report) {
        return payload.report;
      }

      if (typeof payload === 'object') {
        return payload;
      }

      throw new Error('报告数据格式不受支持。');
    }

    /**
     * 从报告ID加载报告
     */
    async load(reportId) {
      if (!reportId) {
        throw new Error('reportId 不能为空。');
      }
      this.setStatus('loading', `正在加载报告：${reportId}`);
      this.showSkeleton();

      try {
        const request = this.requestFactory(reportId);
        const response = await request.get({}, { responseType: 'json' });
        const decoded = this.decodePayload(response.data);
        this.renderReport(decoded);
        this.setStatus('ready', `报告 ${reportId} 加载完成`);
      } catch (err) {
        console.error(err);
        this.renderError(err);
        this.setStatus('error', '加载失败，请检查网络或数据格式');
      }
    }

    /**
     * 从数据对象直接渲染报告
     */
    renderFromPayload(payload) {
      try {
        const decoded = this.decodePayload(payload);
        this.renderReport(decoded);
        this.setStatus('ready', '报告已加载');
      } catch (err) {
        console.error(err);
        this.renderError(err);
        this.setStatus('error', '报告加载失败');
      }
    }

    /**
     * 渲染报告（优先使用简化协议：sections(type/data)）
     */
    renderReport(report) {
      if (!report) {
        this.renderEmpty();
        return;
      }

      this.disposeCharts();
      this.blockElements.clear();
      this.currentBlocks = [];
      this.currentReport = report;
      this.container.innerHTML = '';

      const wrapper = document.createElement('div');
      wrapper.className = 'report-body';

      // 1. 头部（标题、元数据、摘要）
      const header = document.createElement('div');
      header.className = 'report-section';
      header.appendChild(this.buildHeader(report));
      wrapper.appendChild(header);

      // 2. 内容块：统一转为 [{type, data}] 再渲染（不再按旧结构渲染 metrics/notes 等复杂结构）
      const blocks = this.normalizeToBlocks(report);
      this.currentBlocks = blocks.slice();
      if (blocks.length > 0) {
        blocks.forEach(block => {
          const blockEl = this.buildBlock(block);
          wrapper.appendChild(blockEl);
          const key = this.getBlockKey(block);
          if (key) {
            this.blockElements.set(key, blockEl);
          }
        });
      } else {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = '报告没有可渲染的 sections 内容。';
        wrapper.appendChild(empty);
      }

      this.container.appendChild(wrapper);
    }

    /**
     * 规范化：把任意历史结构转换为简化内容块数组
     * 目标输出：[{ type: 'text'|'chart', data: ... }]
     */
    normalizeToBlocks(report) {
      const blocks = [];

      // 1) 优先：sections 已经是新协议
      if (Array.isArray(report.sections)) {
        const sections = report.sections;
        const hasTyped = sections.some(s => s && typeof s === 'object' && typeof s.type === 'string');

        if (hasTyped) {
          sections.forEach(s => {
            if (!s || typeof s !== 'object') return;
            blocks.push(this.normalizeBlock(s));
          });
          return blocks;
        }

        // 2) 兼容：sections 如果是字符串数组，当作纯文本段落数组
        const allStrings = sections.every(s => typeof s === 'string');
        if (allStrings) {
          sections.forEach(text => blocks.push(this.normalizeBlock({ type: 'text', data: text })));
          return blocks;
        }

        // 3) 兼容：旧 section 结构（title/paragraphs/list/...），降级为纯文本块
        sections.forEach(section => {
          if (!section || typeof section !== 'object') return;
          const lines = [];
          if (section.title) lines.push(String(section.title));

          if (Array.isArray(section.paragraphs)) {
            section.paragraphs.forEach(p => {
              if (p != null && String(p).trim() !== '') lines.push(String(p));
            });
          }
          if (Array.isArray(section.list)) {
            section.list.forEach(item => {
              if (item != null && String(item).trim() !== '') lines.push(String(item));
            });
          }
          if (Array.isArray(section.orderedList)) {
            section.orderedList.forEach(item => {
              if (item != null && String(item).trim() !== '') lines.push(String(item));
            });
          }
          if (section.code) lines.push(String(section.code));
          if (section.quote) lines.push(String(section.quote));

          lines.forEach(t => blocks.push(this.normalizeBlock({ type: 'text', data: t })));
        });
      }

      // 4) 兼容：旧字段 charts，转为 chart block（保持你要求的“只用 sections”渲染逻辑）
      if (Array.isArray(report.charts)) {
        report.charts.forEach(chart => {
          if (!chart || typeof chart !== 'object') return;
          blocks.push(this.normalizeBlock({ type: 'chart', data: chart }));
        });
      }

      // 5) 兼容：notes 降级为纯文本段落
      if (Array.isArray(report.notes)) {
        report.notes.forEach(t => {
          if (t != null && String(t).trim() !== '') blocks.push(this.normalizeBlock({ type: 'text', data: String(t) }));
        });
      }

      // 6) 兼容：metrics 降级为纯文本段落（避免旧接口直接空白）
      if (Array.isArray(report.metrics)) {
        report.metrics.forEach(m => {
          if (!m || typeof m !== 'object') return;
          const label = m.label != null ? String(m.label) : '指标';
          const value = m.value != null ? String(m.value) : '-';
          blocks.push(this.normalizeBlock({ type: 'text', data: `${label}: ${value}` }));
        });
      }

      return blocks;
    }

    normalizeBlock(block) {
      const normalized = {
        type: block && block.type ? String(block.type).toLowerCase() : 'text',
        data: block ? block.data : null,
        id: block && block.id != null ? block.id : (block && block.bid != null ? block.bid : null),
        paragraph: block && block.paragraph != null ? block.paragraph : null,
        realtime: !!(block && block.realtime),
        refreshIntervalMs: this.normalizeRefreshInterval(block && block.refreshIntervalMs),
        query: block && typeof block === 'object' ? (block.query || null) : null
      };

      if (!normalized.realtime) {
        normalized.refreshIntervalMs = null;
      } else if (!normalized.refreshIntervalMs) {
        normalized.refreshIntervalMs = 1000;
      }

      return normalized;
    }

    normalizeRefreshInterval(value) {
      const parsed = parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
      }
      return parsed;
    }

    getBlockKey(block) {
      if (!block || block.id == null || block.id === '') {
        return null;
      }
      return String(block.id);
    }

    getRealtimeBlocks() {
      return this.currentBlocks
        .filter(block => block && block.realtime && this.getBlockKey(block))
        .map(block => ({ ...block }));
    }

    replaceBlock(nextBlock) {
      const normalized = this.normalizeBlock(nextBlock);
      const key = this.getBlockKey(normalized);
      if (!key) {
        return false;
      }

      const currentEl = this.blockElements.get(key);
      if (!currentEl || !currentEl.parentNode || !currentEl.parentNode.replaceChild) {
        return false;
      }

      const nextEl = this.buildBlock(normalized);
      this.disposeChartsForBlock(key);
      currentEl.parentNode.replaceChild(nextEl, currentEl);
      this.blockElements.set(key, nextEl);

      const index = this.currentBlocks.findIndex(block => this.getBlockKey(block) === key);
      if (index >= 0) {
        this.currentBlocks[index] = normalized;
      }
      return true;
    }

    /**
     * 构建统一内容块：{ type: "text" | "chart", data: any }
     */
    buildBlock(block) {
      const type = block && typeof block === 'object' ? String(block.type || '').toLowerCase() : '';
      const data = block && typeof block === 'object' ? block.data : null;
      let rendered;

      if (type === 'text') {
        rendered = this.buildTextBlock(data);
      } else if (type === 'chart') {
        rendered = this.buildChartBlock(data, block);
      } else {
        const fallback = document.createElement('div');
        fallback.className = 'report-section content-section';
        const p = document.createElement('p');
        p.className = 'section-paragraph';
        p.textContent = `未知内容块类型：${type || '(empty)'}，已跳过渲染。`;
        fallback.appendChild(p);
        rendered = fallback;
      }

      this.decorateBlock(rendered, block);
      return rendered;
    }

    buildTextBlock(data) {
      const block = document.createElement('div');
      block.className = 'report-section content-section';

      const texts = Array.isArray(data) ? data : [data];
      texts
        .filter(t => t != null && String(t).trim() !== '')
        .forEach(t => {
          const p = document.createElement('p');
          p.className = 'section-paragraph';
          p.textContent = String(t);
          block.appendChild(p);
        });

      if (!block.children.length) {
        const p = document.createElement('p');
        p.className = 'section-paragraph';
        p.textContent = '';
        block.appendChild(p);
      }

      return block;
    }

    buildChartBlock(data, blockMeta) {
      const block = document.createElement('div');
      block.className = 'report-section';

      // 兼容：允许 data = { charts: [...] } 或 data = { title, columns, rows, ... }
      const charts = (data && typeof data === 'object' && Array.isArray(data.charts)) ? data.charts : [data];

      charts
        .filter(c => c && typeof c === 'object')
        .forEach(chart => {
          block.appendChild(this.buildChart(chart, blockMeta));
        });

      if (!block.children.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = '图表数据为空，无法渲染。';
        block.appendChild(empty);
      }

      return block;
    }

    decorateBlock(blockEl, blockMeta) {
      const key = this.getBlockKey(blockMeta);
      if (key) {
        blockEl.setAttribute('data-block-id', key);
      }
      if (!blockMeta || !blockMeta.realtime) {
        return;
      }

      const badgeRow = document.createElement('div');
      badgeRow.className = 'report-header';
      badgeRow.style.marginBottom = '12px';

      const badge = document.createElement('span');
      badge.className = 'report-badge';
      badge.textContent = '实时';
      badgeRow.appendChild(badge);

      blockEl.insertBefore ? blockEl.insertBefore(badgeRow, blockEl.firstChild) : blockEl.appendChild(badgeRow);
    }

    /**
     * 构建报告头部
     */
    buildHeader(report) {
      const header = document.createElement('div');

      // 标题行
      const headerTop = document.createElement('div');
      headerTop.className = 'report-header';

      const title = document.createElement('h2');
      title.className = 'report-title';
      title.textContent = report.title || '未命名报告';
      headerTop.appendChild(title);

      if (report.tag) {
        const badge = document.createElement('div');
        badge.className = 'report-badge';
        badge.textContent = report.tag;
        headerTop.appendChild(badge);
      }

      header.appendChild(headerTop);

      // 元数据行
      const meta = document.createElement('div');
      meta.className = 'report-meta';

      if (report.updatedAt) {
        const m = document.createElement('span');
        const label = document.createElement('strong');
        label.textContent = '更新时间：';
        m.appendChild(label);
        const value = document.createElement('span');
        value.textContent = report.updatedAt;
        m.appendChild(value);
        meta.appendChild(m);
      }

      if (report.source) {
        const s = document.createElement('span');
        const label = document.createElement('strong');
        label.textContent = '数据源：';
        s.appendChild(label);
        const value = document.createElement('span');
        value.textContent = report.source;
        s.appendChild(value);
        meta.appendChild(s);
      }

      if (report.range) {
        const r = document.createElement('span');
        const label = document.createElement('strong');
        label.textContent = '区间：';
        r.appendChild(label);
        const value = document.createElement('span');
        value.textContent = report.range;
        r.appendChild(value);
        meta.appendChild(r);
      }

      header.appendChild(meta);

      // 摘要
      if (report.summary) {
        const summary = document.createElement('p');
        summary.textContent = report.summary;
        summary.className = 'report-summary';
        header.appendChild(summary);
      }

      return header;
    }

    /**
     * 构建指标卡片
     */
    buildMetricCard(metric) {
      const card = document.createElement('div');
      card.className = 'metric-card';

      const label = document.createElement('div');
      label.className = 'metric-label';
      label.textContent = metric.label || '指标';
      card.appendChild(label);

      const value = document.createElement('div');
      value.className = 'metric-value';
      value.textContent = metric.value != null ? metric.value : '-';
      card.appendChild(value);

      if (metric.trend) {
        const trend = document.createElement('span');
        trend.className = 'metric-trend';
        trend.textContent = metric.trend;
        card.appendChild(trend);
      }

      if (metric.note) {
        const note = document.createElement('p');
        note.textContent = metric.note;
        note.className = 'metric-note';
        card.appendChild(note);
      }

      return card;
    }

    /**
     * 构建文章段落（增强版）
     */
    buildSection(section) {
      const block = document.createElement('div');
      block.className = 'report-section content-section';

      // 标题
      if (section.title) {
        const title = document.createElement('h3');
        title.textContent = section.title;
        title.className = 'section-title';
        block.appendChild(title);
      }

      // 段落
      if (Array.isArray(section.paragraphs) && section.paragraphs.length > 0) {
        section.paragraphs.forEach(text => {
          const p = document.createElement('p');
          p.textContent = text;
          p.className = 'section-paragraph';
          block.appendChild(p);
        });
      }

      // 列表
      if (Array.isArray(section.list) && section.list.length > 0) {
        const ul = document.createElement('ul');
        ul.className = 'section-list';
        section.list.forEach(item => {
          const li = document.createElement('li');
          li.textContent = item;
          ul.appendChild(li);
        });
        block.appendChild(ul);
      }

      // 有序列表
      if (Array.isArray(section.orderedList) && section.orderedList.length > 0) {
        const ol = document.createElement('ol');
        ol.className = 'section-list';
        section.orderedList.forEach(item => {
          const li = document.createElement('li');
          li.textContent = item;
          ol.appendChild(li);
        });
        block.appendChild(ol);
      }

      // 代码块
      if (section.code) {
        const pre = document.createElement('pre');
        pre.className = 'section-code';
        const code = document.createElement('code');
        code.textContent = section.code;
        pre.appendChild(code);
        block.appendChild(pre);
      }

      // 引用块
      if (section.quote) {
        const blockquote = document.createElement('blockquote');
        blockquote.className = 'section-quote';
        blockquote.textContent = section.quote;
        block.appendChild(blockquote);
      }

      return block;
    }

    /**
     * 构建图表（支持新旧格式）
     */
    buildChart(chart, blockMeta) {
      const chartBlock = document.createElement('div');
      chartBlock.className = 'chart-block';

      // 创建标题和控制栏容器
      const headerRow = document.createElement('div');
      headerRow.className = 'chart-header';

      if (chart.title) {
        const title = document.createElement('div');
        title.className = 'chart-title';
        title.textContent = chart.title;
        headerRow.appendChild(title);
      }

      // 创建图表类型选择器
      const typeSelector = this.buildChartTypeSelector(chart);
      if (typeSelector) {
        headerRow.appendChild(typeSelector);
      }

      chartBlock.appendChild(headerRow);

      const canvas = document.createElement('div');
      canvas.className = 'chart-canvas';
      canvas.style.height = chart.height || '400px';
      chartBlock.appendChild(canvas);

      // 延迟初始化图表，等待DOM渲染完成
      if (window.echarts) {
        setTimeout(() => {
          try {
            const instance = echarts.init(canvas);
            const option = this.buildChartOption(chart);
            instance.setOption(option);
            this.chartInstances.push({
              instance,
              chart,
              canvas,
              typeSelector,
              blockKey: this.getBlockKey(blockMeta)
            });
          } catch (error) {
            console.error('图表渲染失败:', error);
            const errorMsg = document.createElement('div');
            errorMsg.className = 'empty-state';
            errorMsg.textContent = `图表渲染失败: ${error.message}`;
            canvas.innerHTML = '';
            canvas.appendChild(errorMsg);
          }
        }, 0);
      } else {
        const fallback = document.createElement('div');
        fallback.className = 'empty-state';
        fallback.textContent = 'ECharts 未加载，无法渲染图表。';
        chartBlock.appendChild(fallback);
      }

      return chartBlock;
    }

    /**
     * 构建图表类型选择器
     */
    buildChartTypeSelector(chart) {
      if (!window.ChartFactory || !window.ChartFactory.getSupportedTypes) {
        return null;
      }
      const selectorWrapper = document.createElement('div');
      selectorWrapper.className = 'chart-type-selector';

      const label = document.createElement('label');
      label.textContent = '图表类型：';
      label.className = 'selector-label';
      selectorWrapper.appendChild(label);

      const select = document.createElement('select');
      select.className = 'selector-dropdown';

      // 获取支持的图表类型
      const supportedTypes = window.ChartFactory.getSupportedTypes();
      const currentType = chart.chartType || 'bar';

      supportedTypes.forEach(typeInfo => {
        const option = document.createElement('option');
        option.value = typeInfo.type;
        option.textContent = typeInfo.name;
        option.title = typeInfo.description;
        if (typeInfo.type === currentType) {
          option.selected = true;
        }
        select.appendChild(option);
      });

      // 绑定切换事件
      select.addEventListener('change', (e) => {
        const newType = e.target.value;
        this.switchChartType(chart, newType);
      });

      selectorWrapper.appendChild(select);
      return selectorWrapper;
    }

    /**
     * 切换图表类型
     */
    switchChartType(chart, newType) {
      // 更新图表配置
      chart.chartType = newType;

      // 查找对应的图表实例
      const chartInfo = this.chartInstances.find(item => item.chart === chart);
      if (!chartInfo) {
        console.error('未找到对应的图表实例');
        return;
      }

      try {
        // 重新构建图表配置
        const option = this.buildChartOption(chart);

        // 更新图表（使用notMerge=true完全替换配置）
        chartInfo.instance.setOption(option, true);
      } catch (error) {
        console.error('图表切换失败:', error);

        // 显示错误提示
        const errorMsg = document.createElement('div');
        errorMsg.className = 'chart-error-tip';
        errorMsg.textContent = `切换失败: ${error.message}`;
        errorMsg.style.cssText = 'color: #ef4444; padding: 8px; background: #fee; border-radius: 4px; margin-top: 8px;';

        chartInfo.canvas.parentNode.insertBefore(errorMsg, chartInfo.canvas);

        // 3秒后移除错误提示
        setTimeout(() => {
          if (errorMsg.parentNode) {
            errorMsg.parentNode.removeChild(errorMsg);
          }
        }, 3000);
      }
    }

    /**
     * 构建图表配置（仅支持新格式）
     */
    buildChartOption(chart) {
      if (!window.ChartParser || !window.ChartFactory) {
        throw new Error('图表模块未加载（ChartParser/ChartFactory 缺失），无法渲染图表。');
      }

      const colors = this.getThemeColors();
      const chartType = chart.chartType || 'bar';
      const config = chart.config || {};

      // 验证数据格式
      const validation = window.ChartParser.validate(chart);
      if (!validation.valid) {
        throw new Error(`图表数据验证失败: ${validation.errors.join(', ')}`);
      }

      // 解析数据
      let parsedData;
      if (chartType === 'pie') {
        parsedData = window.ChartParser.parsePie(chart, config);
      } else if (chartType === 'scatter') {
        parsedData = window.ChartParser.parseScatter(chart, config);
      } else {
        parsedData = window.ChartParser.parse(chart, config);
      }

      // 生成图表配置
      const chartOptions = config.chartOptions || {};
      return window.ChartFactory.create(chartType, parsedData, colors, chartOptions);
    }

    /**
     * 获取主题颜色
     */
    getThemeColors() {
      const style = getComputedStyle(document.documentElement);
      return {
        bgPrimary: style.getPropertyValue('--bg-primary').trim() || '#ffffff',
        bgSecondary: style.getPropertyValue('--bg-secondary').trim() || '#f5f5f5',
        textPrimary: style.getPropertyValue('--text-primary').trim() || '#1a1a1a',
        textSecondary: style.getPropertyValue('--text-secondary').trim() || '#4a4a4a',
        border: style.getPropertyValue('--border-color').trim() || '#d0d0d0',
        accentPrimary: style.getPropertyValue('--accent-primary').trim() || '#3b82f6',
        accentSecondary: style.getPropertyValue('--accent-secondary').trim() || '#60a5fa',
        seriesColors: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4']
      };
    }

    /**
     * 刷新所有图表（主题变化时）
     */
    refreshCharts() {
      if (!this.chartInstances.length) return;
      this.chartInstances.forEach(({ instance, chart }) => {
        const option = this.buildChartOption(chart);
        instance.setOption(option, true);
      });
    }

    /**
     * 销毁所有图表实例
     */
    disposeCharts() {
      this.chartInstances.forEach(({ instance }) => {
        if (instance && instance.dispose) {
          instance.dispose();
        }
      });
      this.chartInstances = [];
    }

    disposeChartsForBlock(blockKey) {
      if (!blockKey) {
        return;
      }

      const remain = [];
      this.chartInstances.forEach(chartInfo => {
        if (chartInfo.blockKey === blockKey) {
          if (chartInfo.instance && chartInfo.instance.dispose) {
            chartInfo.instance.dispose();
          }
          return;
        }
        remain.push(chartInfo);
      });
      this.chartInstances = remain;
    }

    /**
     * 渲染空状态
     */
    renderEmpty() {
      this.disposeCharts();
      this.blockElements.clear();
      this.currentBlocks = [];
      this.currentReport = null;
      this.container.innerHTML = '';
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = '暂无报告数据，请先加载。';
      this.container.appendChild(empty);
    }

    /**
     * 渲染错误状态
     */
    renderError(error) {
      this.disposeCharts();
      this.blockElements.clear();
      this.currentBlocks = [];
      this.container.innerHTML = '';
      const err = document.createElement('div');
      err.className = 'error-state';

      const title = document.createElement('strong');
      title.textContent = '加载失败：';
      err.appendChild(title);

      const msg = document.createElement('span');
      msg.textContent = error && error.message ? error.message : '未知错误';
      err.appendChild(msg);

      this.container.appendChild(err);
    }
  }

  // 导出到全局
  window.ReportRenderer = ReportRenderer;
})();
