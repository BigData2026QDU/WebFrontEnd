# 前端风格指南

## 色彩方案

### 日间主题
- 主色调：#1890ff
- 辅助色：#52c41a
- 成功：#52c41a
- 警告：#faad14
- 错误：#f5222d
- 背景色：#ffffff
- 文本色：#333333
- 边框色：#e0e0e0

### 夜间主题
- 主色调：#40a9ff
- 辅助色：#73d13d
- 背景色：#1a1a1a
- 文本色：#ffffff
- 边框色：#333333

## 布局

- 最大宽度：1200px
- 响应式断点：768px / 1024px
- 栅格系统：CSS Grid + Flexbox

## 组件

- 按钮圆角：4px
- 卡片阴影：0 2px 8px rgba(0,0,0,0.1)
- 输入框边框：1px solid var(--border-color)

## 动画

- 过渡时长：0.3s
- 缓动函数：ease-in-out
- 页面切换动画：淡入淡出

## 字体

- 标题字体：system-ui, -apple-system, sans-serif
- 正文字体：system-ui, -apple-system, sans-serif
- 字号：14px (正文) / 16px (标题)
- 行高：1.6

## CSS 变量命名

```css
:root {
  --primary-color: #1890ff;
  --success-color: #52c41a;
  --warning-color: #faad14;
  --error-color: #f5222d;
  --bg-color: #ffffff;
  --text-color: #333333;
  --border-color: #e0e0e0;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --border-radius: 4px;
}
```
