# HiveHBase Web 前端

HiveHBase 大数据分析平台的前端仓库，负责页面资源、浏览器端交互逻辑，以及前端仓库内自带的结构检查和测试 CI。

## 功能特性

- 用户认证页面：登录、注册
- 报告展示与管理页面
- 图表解析与可视化渲染
- 请求状态胶囊提示
- 日间 / 夜间主题切换

## 环境要求

- Node.js 20+
- npm 10+
- 现代浏览器（Chrome / Edge / Firefox / Safari）
- 已部署的后端 Servlet API

## 快速开始

1. 准备后端接口服务。
2. 将 `html/`、`css/`、`js/` 资源部署到 Web 容器，或通过主仓库的 WAR 一并打包。
3. 在仓库根目录执行前端自检：

```bash
npm run check:structure
npm run test
npm run ci
```

## 质量检查

本仓库不再依赖外部前端测试骨架。结构检查、单元测试、集成测试和 HTML 冒烟检查全部直接维护在当前仓库。

| 命令 | 作用 |
|------|------|
| `npm run check:structure` | 校验目录、文档、工作流、HTML 资源引用、废弃仓库引用 |
| `npm run test` | 运行全部 Node 内建测试 |
| `npm run test:unit` | 运行 `ChartParser`、`ThemeManager` 等单元测试 |
| `npm run test:integration` | 运行 `api.js` 的浏览器环境集成测试 |
| `npm run test:e2e` | 运行 HTML 页面资源冒烟检查 |
| `npm run ci` | 执行结构检查和全部测试 |

## CI

- 工作流文件：`.github/workflows/ci.yml`
- 触发条件：`push`、`pull_request`、`workflow_dispatch`
- 执行内容：
  - `npm run check:structure`
  - `npm run test:unit`
  - `npm run test:integration`
  - `npm run test:e2e`

## 项目结构

```text
web/
├── .github/workflows/ci.yml     # 前端 CI
├── css/                         # 样式文件
├── html/                        # 页面文件
├── js/                          # 浏览器端脚本
├── scripts/                     # 结构检查与测试入口脚本
├── tests/                       # Node 内建测试
│   ├── e2e/
│   ├── helpers/
│   ├── integration/
│   └── unit/
├── WEB-INF/web.xml              # Web 配置
├── package.json                 # npm 脚本
├── Architecture.md              # 架构文档
├── README.md                    # 项目说明
├── File_Index.md                # 文件索引
└── STYLE_GUIDE.md               # 前端风格规范
```

## 开发约束

- 所有网络请求统一通过 `js/api.js` 和 `js/request.js`
- 所有颜色统一走 `css/theme.css` 中的 CSS 变量
- 主题默认跟随系统；用户手动切换后再写入 `localStorage`
- 结构检查会阻止重新引入已删除的外部测试骨架或无关模块依赖

## 许可证

本项目仅供课程学习使用。
