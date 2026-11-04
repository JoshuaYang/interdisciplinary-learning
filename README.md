# 微观化学反应三维交互实验台 (Chem Reaction 3D Lab)

> **化学 × 信息技术 学科融合项目**  
> 基于 **React 18 + TypeScript + Three.js + Zustand + @dnd-kit + Radix UI** 构建的分子三维构型建模与微观断键/成键机理可视化平台。

---

## 一、 双模式实验台架构

平台启动后提供双卡片模式入口，支持**「标准教学闯关」**与**「自由构建实验」**两种独立工作流（顶栏左上角支持随时一键切换模式）：

| 维度 | 模式一：甲烷的自由基取代（标准教学闯关） | 模式二：自由化学反应实验台（自定义构建模式） |
| :--- | :--- | :--- |
| **适用场景** | 高三化学「甲烷与溴光照自由基取代」定题探究 | 任意无机/有机分子三维构建与自定义多阶段反应演示 |
| **第 1 步：分子结构** | 上传并校验 6 种核心微粒（$\text{CH}_4, \text{CH}_3\cdot, \text{CH}_3\text{Br}, \text{Br}_2, \text{HBr}, \text{Br}\cdot$）的 JSON 参数 | **118 元素全周期表交互式连键构建**（支持一键补氢、一键填入推荐默认值、JSON 导入/导出），无数量与门禁限制 |
| **第 2 步：反应编排** | 拖拽微粒完成「链引发、链增长 ①、链增长 ②、链终止（3 条成键反应）」四阶段装配并校验 | **动态增删阶段、自由命名阶段**，每个阶段仅需指定 `[反应前物质] ➔ [反应后物质]` |
| **第 3 步：三维动画** | 7 步三维反应动画 + 右侧四维机理推演问答解锁 | **全阶段直接解锁**；引擎自动完成同元素原子配对追踪，生成「靠近碰撞 $\to$ 断键重组 $\to$ 产物分离」三维动画及断键/成键摘要 |

---

## 二、 快速开始与常用命令

### 环境要求
- **Node.js** `>= 18`
- **pnpm** `>= 9`

### 开发与构建命令

```bash
# 1. 安装依赖
pnpm install

# 2. 启动本地开发服务器 (默认 http://localhost:5173)
pnpm dev

# 3. 运行 Vitest 单元测试套件
pnpm test --run

# 4. 类型检查与生产环境打包 (输出至 dist/)
pnpm build

# 5. 预览生产构建产物
pnpm preview
```

---

## 三、 目录结构规范

```text
学科融合/
├── README.md                          # 项目总览与开发指南（本文档）
├── package.json                       # 依赖与脚本配置
├── vite.config.ts                     # Vite 构建与 Vitest 测试配置
├── docs/
│   └── 自由反应实验台与JSON规范.md      # 自由反应实验台交互指南与统一拓扑 JSON 规范
├── public/
│   ├── 教师配置/                       # 模式一（甲烷取代）教师参考数据、步骤配置与维护说明
│   │   ├── 说明.md
│   │   ├── 项目.json
│   │   ├── 分子参考.json
│   │   ├── 标准答案/                   # 6 种标准微粒参考 JSON
│   │   └── 步骤/                       # 01.json — 07.json 反应步骤定义
│   └── 学生任务/                       # 模式一（甲烷取代）学生任务模板与字段文档
│       ├── 开始这里.md
│       ├── 字段说明.md
│       └── *.json
├── src/
│   ├── main.tsx                       # 应用入口
│   ├── App.tsx                        # 顶层模式路由与快捷键分发
│   ├── types/
│   │   └── chem.ts                    # 核心数据结构与类型定义
│   ├── engine/
│   │   ├── cpkPalette.ts              # 118 元素全周期表元数据与国际标准 CPK 配色/半径
│   │   ├── core.ts                    # 模式一三维状态编译、几何测量与插值核心
│   │   ├── configFiles.ts             # 模式一分子配置解析与校验
│   │   ├── deduction.ts               # 模式一反应链路校验与步骤推演题库
│   │   ├── defaultBundle.ts           # 离线兜底配置包
│   │   ├── freeReactionEngine.ts      # 模式二通用三维构型解算器与自动原子追踪动画引擎
│   │   └── __tests__/
│   │       └── chem.test.ts           # 核心引擎自动化单元测试
│   ├── store/
│   │   ├── useChemStore.ts            # 模式一（甲烷取代）Zustand 状态仓库
│   │   └── useFreeChemStore.ts        # 模式二（自由反应实验台）Zustand 状态仓库
│   ├── components/
│   │   ├── HomeEntry.tsx              # 双卡片模式选择首页
│   │   ├── Header.tsx                 # 模式一顶栏与步骤导航
│   │   ├── Step1Gate/                 # 模式一第 1 步：6 分子结构核验与 3D 预览弹窗
│   │   ├── Step2Pipeline/             # 模式一第 2 步：四阶段反应链路拖拽装配
│   │   ├── Step3Stage/                # 模式一第 3 步：7 步三维舞台与机理推演面板
│   │   └── FreeMode/                  # 模式二：自由化学反应实验台全套组件
│   │       ├── FreeHeader.tsx         # 模式二顶栏与无锁步骤切换
│   │       ├── FreeGateScreen.tsx     # 模式二第 1 步：自定义分子卡片库
│   │       ├── MoleculeBuilderModal.tsx # 118 元素周期表 + 2D 拓扑连键 + 3D 实时预览构建器
│   │       ├── FreeMoleculePreviewModal.tsx # 模式二分子 3D 结构与详情弹窗
│   │       ├── FreePipelineScreen.tsx # 模式二第 2 步：动态阶段增删改名与物质编排
│   │       └── FreeStageScreen.tsx    # 模式二第 3 步：自动原子追踪三维动画与成键分析
│   └── styles/
│       └── app.css                    # 全局设计令牌（冷灰白科学实验台色系 + 7 级字号体系）
└── legacy/                            # 历史原生 HTML/JS 旧版归档留存
```

---

## 四、 核心文档索引

1. [**自由反应实验台与 JSON 规范 (`docs/自由反应实验台与JSON规范.md`)**](file:///Users/joshua/work-big-bridge/学科融合/docs/自由反应实验台与JSON规范.md)：详解模式二的交互式周期表分子构建器、拓扑 JSON 结构及三维动画自动配对算法。
2. [**定题模式教师维护说明 (`public/教师配置/说明.md`)**](file:///Users/joshua/work-big-bridge/学科融合/public/教师配置/说明.md)：详解模式一（甲烷自由基取代）的教学设计、NIST 参考键长键角数据及配置维护方式。
3. [**定题模式学生任务指南 (`public/学生任务/开始这里.md`)**](file:///Users/joshua/work-big-bridge/学科融合/public/学生任务/开始这里.md) 与 [**字段说明 (`public/学生任务/字段说明.md`)**](file:///Users/joshua/work-big-bridge/学科融合/public/学生任务/字段说明.md)：面向学生的课堂任务指引与分子参数字典。
