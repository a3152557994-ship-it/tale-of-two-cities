# 双城记 · 撕裂年代 — A Tale of Two Cities: Torn

> *“It was the best of times, it was the worst of times…”*
> 每一张牌，你撕向伦敦，还是巴黎？

🌐 在线试玩：**https://a3152557994-ship-it.github.io/tale-of-two-cities/**

## 玩法

- 你是 1775–1793 年往返伦敦与巴黎的泰尔森银行小职员。
- 拖动卡牌：**向左撕 = 伦敦**（隐忍 / 秩序 / 自保），**向右撕 = 巴黎**（激情 / 反抗 / 复仇）。背景里两幅逐像素对齐的油画会跟着手指实时撕开。
- 四个数值：🍞 面包 · 🪙 金币 · 🕯 良心 · 🔥 怒火。任何一个归零或爆表就会死，每种死法都是一个结局；怒火越高，巴黎就越吞没画面。
- 三卷时间线：招回人世（1775）→ 金线（1780）→ 风暴（1789–1793）。
- 79 张中英双语卡牌、14 个结局（含隐藏结局「远比我做过的一切都好」）、7 种人格。
- 结局卡：一键生成 3:4 竖图（油画底 + 死因 + 人格 + 二维码），方便分享。

## 技术

- 原生 WebGL 撕裂着色器（[`PaintedTearEngine.js`](src/engine/PaintedTearEngine.js)）：焦黑纸边、金色火线、雨雾与余烬、伪景深视差，另有铜版画模式。
- 规则层与界面层分离（[`GameCore.js`](src/game/GameCore.js) 不依赖 DOM），可以复用到只有画布的小游戏平台。
- 卡牌 / 结局 / 人格数据：[`cards.js`](src/data/cards.js)。分享卡：[`ShareCard.js`](src/game/ShareCard.js)。
- 音频为 Web Audio 实时合成。

```bash
pnpm install && pnpm dev   # 本地开发
pnpm build                 # 输出到 docs/（GitHub Pages）
```

## 素材来源

狄更斯《双城记》(1859) 为公版作品。场景油画与 10 张角色肖像于 2026-11 使用 AI 图像生成工具（gpt-image-2）制作；代码、界面与全部中文文本为本项目原创撰写，未使用任何现代出版译本。
