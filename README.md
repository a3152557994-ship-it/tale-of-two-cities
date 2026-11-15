# 双城记 · A Tale of Two Cities (Act I: 1775)

> *“It was the best of times, it was the worst of times...”*  
> **1775 年，伦敦与巴黎的同一座立体剧场——亲手撕开时代裂隙，见证「招回人世（Recalled to Life）」的宿命对撞。**

🌐 **在线直接体验 / Live Playable Demo**:  
👉 **[https://a3152557994-ship-it.github.io/tale-of-two-cities/](https://a3152557994-ship-it.github.io/tale-of-two-cities/)**

---

## 核心特色 / Core Features

1. **一屏双城 · 时代裂隙（Dual-World Golden Seam）**  
   同一 3D 摄像机实时同步渲染两座空间镜像的 1775 八角西洋镜剧场：左侧为**伦敦**（冷青斜雨、多佛皇家驿马车、苏豪区壁炉暖灯、圣保罗大教堂与泰尔森银行），右侧为**巴黎**（炽红余烬、圣埃弗雷蒙德侯爵倾覆鎏金马车、圣安东尼碎裂红酒桶与 `BLOOD` 残墙、巴士底狱 105 号北塔与断头台）。左右拖动中央鎏金裂隙，不仅实时撕裂视觉与声场，更会触发同一坐标上 4 处宿命信物的**实时双向翻转**。
2. **古斯塔夫·多雷（Gustave Doré）铜版画明暗着色器**  
   自研 GLSL 全屏合成着色器（[`CompositeTearShader.js`](src/engine/CompositeTearShader.js)），融合 FBM 有机羊皮纸撕裂边缘、热折射色散、Sobel 钢笔轮廓描边、多向铜版画交叉排线（Cross-hatching）与 ACES 明暗油彩调色，支持一键切换 **「油彩铜刻」** 与 **「纯素版画」** 两种馆藏风格。
3. **世界空间程序化材质 + Blender 5.2 无头建模管线**  
   由 [`scripts/build_diorama_glb.py`](scripts/build_diorama_glb.py) 通过 Blender 5.2.2 LTS 无头脚本自动化构建镜像双城 `.glb` 资产，并在 Three.js 端注入三向盒式投影 UV（Box Projection）与程序化鹅卵石湿滑反光、石砌墙面及板岩木纹凹凸贴图。
4. **程序化 18 世纪古典室内乐声场 & 原著双语精读**  
   [`ChamberScore.js`](src/audio/ChamberScore.js) 基于 Web Audio API 实时合成大厅卷积混响、D 小调大提琴/中提琴持续音（伦敦）与低音管风琴/闷响定音鼓（巴黎），随裂隙位置等功率无缝混音；内置狄更斯 1859 原版英文与精校中译，支持点击词汇弹出羊皮纸精读词卡与火漆密信破译终章。

---

## 技术栈与目录结构 / Architecture

```text
tale-of-two-cities/
├── scripts/build_diorama_glb.py     # Blender 5.2.2 headless builder -> london_act1.glb & paris_act1.glb
├── public/models/                   # Exported mirrored 3D diorama GLB assets
├── src/
│   ├── engine/
│   │   ├── DualWorldEngine.js       # Dual WebGLRenderTarget scenes, rain/embers & procedural bump/roughness maps
│   │   └── CompositeTearShader.js   # FBM Golden Seam, Sobel ink edges, ACES chiaroscuro & Doré cross-hatching
│   ├── audio/ChamberScore.js        # Procedural Web Audio chamber synthesizer & foley cues
│   ├── data/act1Content.js          # Act I bilingual Dickens corpus, gloss lexicon & 8 mirrored dossiers
│   ├── main.js                      # 3-beat narrative loop (Prologue -> Dual-Anchor Diorama -> Wax Seal Cipher)
│   └── style.css                    # Museum serif UI, parchment drawers & mobile safe-area layout
└── docs/                            # Production static bundle served directly via GitHub Pages
```

---

## 本地运行与复现 / Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. (Optional) Regenerate 3D GLB dioramas via Blender 5.2+
pnpm models

# 3. Start local dev server
pnpm dev

# 4. Build production bundle into docs/
pnpm build
```

---

## 版权与开源协议 / License

- **原著文本 / Source Text**: Charles Dickens, *A Tale of Two Cities* (1859) — 全球公版（Public Domain）。
- **代码与三维脚本 / Code & Blender Pipeline**: 依据 **MIT License** 开源。
