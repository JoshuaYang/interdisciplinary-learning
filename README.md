# 微观化学反应三维交互实验台 (3D Interactive Chemical Reaction Workbench)

> **化学 × 信息技术 学科融合项目（全英文界面版 · Full English UI Edition）**  
> 基于 **React 18 + TypeScript + Three.js + Zustand + @dnd-kit + Radix UI** 构建的分子三维构型建模与微观断键/成键机理可视化平台。

---

## 一、 双模式实验台架构

平台启动后提供双卡片模式入口（`HomeEntry`），支持**「标准教学闯关（Guided Inquiry）」**与**「自由构建实验（Custom Sandbox）」**两种独立工作流。每次从首页点击进入任一实验台时，均自动从 **Step 1** 开始；顶栏左上角提供极简返回箭头图标（`←`），可随时返回模式选择首页。

| 维度 | 模式一：`Radical Substitution of Methane`（定题探究） | 模式二：`Free Chemical Reaction Workbench`（自由构建模式） |
| :--- | :--- | :--- |
| **适用场景** | 高中化学「甲烷与溴光照自由基取代」定题探究 | 任意无机/有机分子三维构建与自定义多阶段反应演示 |
| **Step 1：分子结构** | 上传并核验 6 种核心微粒（$\text{CH}_4, \text{CH}_3\cdot, \text{CH}_3\text{Br}, \text{Br}_2, \text{HBr}, \text{Br}\cdot$）的 JSON 参数 | **全屏 118 元素周期表交互式连键构建器**（支持一键补氢、一键填入推荐默认值、批量导入 JSON、一键打包导出 `.zip` 压缩包），无数量与校验门禁限制 |
| **Step 2：反应编排** | 拖拽微粒完成「Initiation、Propagation ①、Propagation ②、Termination（3 条成键反应）」四阶段装配并校验 | **动态增删阶段、自由命名阶段**，每个阶段仅需指定 `[Reactants (Before)] ➔ [Products (After)]` |
| **Step 3：三维动画** | 7 步三维反应动画 + 右侧四维机理推演问答解锁 | **全阶段直接解锁**；引擎自动完成同元素原子配对追踪，生成「靠近碰撞 $\to$ 断键重组 $\to$ 产物分离」三维动画及断键/成键摘要 |

---

## 二、 核心交互与视觉规范亮点

1. **全英文界面（Full English Interface）**：
   - 首页、模式一（甲烷自由基取代）、模式二（自由化学反应实验台）、118 元素周期表、VSEPR 构型字典及所有弹窗、提示全部采用标准英文术语。
2. **顶栏与底栏布局规范**：
   - **Header 顶栏**：左上角采用极简无边框返回箭头（`.header-back-arrow`），紧随实验台标题与副标题；3 个核心步骤切换 Tab 靠最右侧对齐（`.header-stepper-right`）。
   - **固定底栏（Fixed Full-Width Bottom Bar）**：Step 1 与 Step 2 底部的步骤切换栏固定在视口底部（`.fixed-bottom-bar`），撑满全宽，毛玻璃背景悬浮展示当前状态与下一步主操作按钮。
3. **舒适字号梯度**：
   - 全局采用清晰易读的字号体系（正文基准 `16px`，卡片参数与按钮 `14px~15px`，周期表原子格与 2D 拓扑画布标签同步放大），确保投影教学与桌面操作均清晰可读。
4. **Step 1 分子库与全屏构建器**：
   - **右上角分组操作栏**：主按钮 `+ Add Chemical Substance`、次级描边按钮 `Upload Files`，以及收纳在 `Library Actions ▾` 下拉菜单中的批量操作（**`Export All as ZIP (.zip)`**、**`Load Sample Library`**、**`Clear All Substances`**）。
   - **统一新增文案**：右上角新增主按钮与卡片网格末尾的虚线新增卡片统一使用 `Add Chemical Substance`。
   - **全屏分子构建器（Full-Screen Builder Modal）**：占满视口（`calc(100vw - 32px) × calc(100vh - 32px)`），左侧集成 118 元素周期表、2D 拓扑画布与**自适应隔离尺寸的 3D 实时球棍模型预览框**（通过绝对定位视口容器与尺寸变化守卫彻底杜绝 Canvas `ResizeObserver` 宽度增长循环）。
5. **Step 2 反应阶段编排优化**：
   - **胶囊式阶段导航栏（`.stage-bar-header`）**：左侧为分段式阶段切换胶囊槽（`.stage-pills-track`），右侧为独立虚线转实线的新增阶段胶囊按钮（`+ Add Stage`），彻底告别贴底线拥挤感。
   - **无飞回拖拽体验**：基于 `@dnd-kit` 配置 `<DragOverlay dropAnimation={null}>`，从顶部物质池拖入下方反应槽位松手即刻落位，无视觉飞回残影。
   - **精简删除按钮**：阶段删除按钮文案精简为 `Delete`。

---

## 三、 快速开始与常用命令

### 环境要求
- **Node.js** `>= 18`
- **pnpm** `>= 9`

### 开发与构建命令

```bash
# 1. 安装依赖
pnpm install

# 2. 启动本地开发服务器 (默认 http://localhost:5173)
pnpm dev

# 3. 运行 Vitest 单元测试套件 (含三维引擎、推演题库、118 元素构建与 ZIP 打包测试)
pnpm test

# 4. TypeScript 类型检查与生产环境打包 (输出至 dist/)
pnpm build

# 5. 预览生产构建产物
pnpm preview
```

---

## 四、 目录结构规范

```text
学科融合/
├── README.md                          # 项目总览与开发指南（本文档）
├── index.html                         # HTML 入口（全英文标题与 lang="en"）
├── package.json                       # 依赖与脚本配置
├── vite.config.ts                     # Vite 构建与 Vitest 测试配置
├── docs/
│   └── 自由反应实验台与JSON规范.md      # 自由反应实验台交互指南、架构说明与统一拓扑 JSON 规范
├── public/
│   ├── 教师配置/                       # 模式一（甲烷取代）参考数据与配置归档
│   └── 学生任务/                       # 模式一（甲烷取代）学生任务模板与字段文档
├── src/
│   ├── main.tsx                       # 应用挂载入口
│   ├── App.tsx                        # 顶层模式路由与全局键盘快捷键分发
│   ├── types/
│   │   └── chem.ts                    # 核心数据结构与 TypeScript 类型定义
│   ├── engine/
│   │   ├── cpkPalette.ts              # 118 元素全周期表英文元数据与国际标准 CPK 配色/共价半径
│   │   ├── core.ts                    # 模式一三维状态编译、几何测量与插值核心
│   │   ├── configFiles.ts             # 模式一分子配置解析与校验
│   │   ├── deduction.ts               # 模式一反应链路校验与步骤推演题库（英文版）
│   │   ├── defaultBundle.ts           # 模式一默认离线数据包（英文版）
│   │   ├── freeReactionEngine.ts      # 模式二通用 VSEPR 三维构型解算器与自动原子追踪动画引擎
│   │   ├── zipExporter.ts             # 零依赖标准 ZIP (Store + CRC32) 批量打包导出工具
│   │   └── __tests__/
│   │       └── chem.test.ts           # 核心引擎与 ZIP 导出自动化单元测试（10 项测试套件）
│   ├── store/
│   │   ├── useChemStore.ts            # 模式一（甲烷取代）Zustand 状态仓库
│   │   └── useFreeChemStore.ts        # 模式二（自由反应实验台）Zustand 状态仓库
│   ├── components/
│   │   ├── HomeEntry.tsx              # 双卡片模式选择首页
│   │   ├── Header.tsx                 # 模式一顶栏（左侧纯箭头 + 右侧步骤切换器）
│   │   ├── Step1Gate/                 # 模式一 Step 1：6 分子结构核验与 3D 预览弹窗
│   │   ├── Step2Pipeline/             # 模式一 Step 2：四阶段反应链路拖拽装配
│   │   ├── Step3Stage/                # 模式一 Step 3：7 步三维舞台与机理推演面板
│   │   └── FreeMode/                  # 模式二：自由化学反应实验台全套组件
│   │       ├── FreeHeader.tsx         # 模式二顶栏（左侧纯箭头 + 右侧无锁步骤切换器）
│   │       ├── FreeGateScreen.tsx     # 模式二 Step 1：分子卡片网格 + ZIP 批量导出下拉菜单
│   │       ├── MoleculeBuilderModal.tsx # 全屏 118 元素周期表 + 2D 拓扑连键 + 3D 实时预览构建器
│   │       ├── FreeMoleculePreviewModal.tsx # 模式二分子 3D 结构与详情弹窗
│   │       ├── FreePipelineScreen.tsx # 模式二 Step 2：胶囊式阶段栏 + 动态阶段增删改名与物质编排
│   │       └── FreeStageScreen.tsx    # 模式二 Step 3：自动原子追踪三维动画与成键分析
│   └── styles/
│       └── app.css                    # 全局设计令牌、字号梯度与响应式布局样式
└── legacy/                            # 历史原生 HTML/JS 旧版归档留存
```

---

## 五、 核心文档索引

1. [**自由反应实验台与 JSON 规范 (`docs/自由反应实验台与JSON规范.md`)**](file:///Users/joshua/work-big-bridge/学科融合/docs/自由反应实验台与JSON规范.md)：详解模式二的全屏周期表分子构建器、ZIP 批量打包导出、拓扑 JSON 结构及三维动画自动配对算法。
2. [**定题模式教师维护说明 (`public/教师配置/说明.md`)**](file:///Users/joshua/work-big-bridge/学科融合/public/教师配置/说明.md)：详解模式一（甲烷自由基取代）的教学设计、NIST 参考键长键角数据及配置维护方式。
3. [**定题模式学生任务指南 (`public/学生任务/开始这里.md`)**](file:///Users/joshua/work-big-bridge/学科融合/public/学生任务/开始这里.md) 与 [**字段说明 (`public/学生任务/字段说明.md`)**](file:///Users/joshua/work-big-bridge/学科融合/public/学生任务/字段说明.md)：面向学生的课堂任务指引与分子参数字典。
