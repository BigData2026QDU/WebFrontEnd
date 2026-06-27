# 文件索引

## 根目录

| 文件路径 | 作用 | 说明 |
|---------|------|------|
| `README.md` | 项目说明 | 前端仓库入口文档 |
| `Architecture.md` | 架构文档 | 模块分层、测试层、CI 说明 |
| `File_Index.md` | 文件索引 | 当前文件 |
| `STYLE_GUIDE.md` | 风格规范 | 前端开发约束 |
| `package.json` | npm 脚本 | 结构检查、测试、CI 入口 |
| `.github/workflows/ci.yml` | GitHub Actions | 仓库内直接执行前端检查与测试 |

## CSS 文件

| 文件路径 | 作用 | 说明 |
|---------|------|------|
| `css/theme.css` | 主题样式 | 日间 / 夜间变量定义 |
| `css/login.css` | 登录样式 | 登录 / 注册页布局 |
| `css/report.css` | 报告样式 | 报告展示与图表区域样式 |
| `css/request-capsule.css` | 请求提示 | 请求胶囊浮层样式 |

## JavaScript 文件

| 文件路径 | 作用 | 说明 |
|---------|------|------|
| `js/api.js` | Axios 封装 | 推导 base path、请求 / 响应拦截、胶囊提示 |
| `js/request.js` | 请求类 | HTTP 方法的轻量封装 |
| `js/theme-manager.js` | 主题管理 | 跟随系统主题、持久化用户手动偏好 |
| `js/chart-parser.js` | 图表解析 | 表格数据转图表维度 / 系列 |
| `js/chart-factory.js` | 图表工厂 | 构造 ECharts 配置 |
| `js/report-renderer.js` | 报告渲染 | 渲染文本 / 图表分段 |
| `js/blog-editor.js` | 编辑器逻辑 | 报告编辑页面交互 |

## HTML 页面

| 文件路径 | 作用 | 说明 |
|---------|------|------|
| `html/login.html` | 登录页 | 用户登录入口 |
| `html/register.html` | 注册页 | 用户注册入口 |
| `html/show-report.html` | 报告展示 | 普通用户查看报告 |
| `html/manage.html` | 管理中心 | 管理员管理报告 |
| `html/blog-editor.html` | 编辑器 | 报告编辑页 |
| `html/report-demo.html` | 报告示例 | 报告展示 Demo |
| `html/family-impact-chart.html` | 图表示例 | 复杂图表页面 |
| `html/api-test.html` | 接口示例 | API 调试页 |
| `html/db-test.html` | 数据示例 | 数据回显测试页 |
| `html/simple.html` | 主题示例 | 主题切换基础示例 |

## 脚本与测试

| 文件路径 | 作用 | 说明 |
|---------|------|------|
| `scripts/check-structure.mjs` | 结构检查 | 校验目录、工作流、HTML 资源和废弃引用 |
| `scripts/run-tests.mjs` | 测试入口 | 按 `unit / integration / e2e` 调度 Node 测试 |
| `tests/helpers/browser-env.mjs` | 浏览器桩环境 | 提供 DOM、localStorage、matchMedia、Axios stub |
| `tests/unit/chart-parser.test.mjs` | 单元测试 | 覆盖 `ChartParser` |
| `tests/unit/theme-manager.test.mjs` | 单元测试 | 覆盖主题初始化、跟随系统、手动持久化 |
| `tests/integration/api.test.mjs` | 集成测试 | 覆盖 `api.js` base path 与请求胶囊 |
| `tests/e2e/html-smoke.test.mjs` | 冒烟测试 | 检查 HTML 标题、编码和本地资源引用 |

## 配置文件

| 文件路径 | 作用 | 说明 |
|---------|------|------|
| `WEB-INF/web.xml` | Web 配置 | Servlet / Filter 映射 |
| `.gitmodules` | 子模块配置 | 维护 `AGENTS` 子模块 |
