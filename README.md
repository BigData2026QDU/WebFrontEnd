# HiveHBase Web 前端

HiveHBase 大数据分析平台的前端模块。

## 功能特性

- 用户认证（登录/注册）
- 报告管理（查看/编辑/删除）
- 数据可视化（ECharts 图表）
- 日间/夜间主题切换
- 响应式布局

## 环境要求

- 现代浏览器（Chrome 90+, Firefox 88+, Safari 14+, Edge 90+）
- 后端 API 服务

## 项目结构

```
hivehbase-web/
├── css/                    # 样式文件
│   ├── theme.css          # 主题变量
│   ├── login.css          # 登录页样式
│   ├── report.css         # 报告样式
│   └── request-capsule.css # 请求提示样式
├── js/                     # JavaScript 模块
│   ├── api.js             # Axios 封装
│   ├── request.js         # Request 类
│   ├── theme-manager.js   # 主题管理
│   ├── chart-factory.js   # 图表工厂
│   ├── chart-parser.js    # 图表解析
│   ├── report-renderer.js # 报告渲染
│   └── blog-editor.js     # 编辑器逻辑
├── html/                   # HTML 页面
│   ├── login.html         # 登录页
│   ├── register.html      # 注册页
│   ├── show-report.html   # 报告展示
│   ├── manage.html        # 管理中心
│   ├── blog-editor.html   # 编辑器
│   └── ...
├── WEB-INF/                # Servlet 配置
│   └── web.xml
├── package.json
├── Architecture.md
├── README.md
├── File_Index.md
└── STYLE_GUIDE.md
```

## 快速开始

1. 确保后端 API 服务已启动
2. 将前端文件部署到 Web 服务器
3. 访问 `login.html` 开始使用

## 开发指南

- 所有网络请求必须通过 `api.js` 封装
- 所有颜色必须使用 CSS 变量（参考 `theme.css`）
- 禁止使用 jQuery、Bootstrap 等第三方库

## 贡献指南

1. 创建功能分支
2. 遵循 STYLE_GUIDE.md 风格规范
3. 提交代码前运行 `npm run ci`
