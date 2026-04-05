# Super IME 官网原型

基于 Next.js 的单页官网，包含：
- 左右对比输入动画（macOS 系统输入法 vs 你的输入法）
- 每个动画下方虚拟键盘按键高亮
- 候选词列表动态变化回放
- “立即体验”接口调用区（连接你的模型后端）

## 本地启动

```bash
npm install
cp .env.example .env.local
npm run dev
```

打开 `http://localhost:3000`。

## 环境变量

`.env.local`:

```bash
IME_PREVIEW_API_URL=http://127.0.0.1:8000/predict
```

说明：
- 前端调用 `/api/preview`
- 服务端路由会把请求透传到 `IME_PREVIEW_API_URL`
- 默认请求体：`{ "input": "..." }`

## 生产构建

```bash
npm run lint
npm run build
npm start
```
