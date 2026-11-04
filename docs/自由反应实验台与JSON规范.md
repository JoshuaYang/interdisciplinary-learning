# 自由化学反应实验台与 JSON 规范说明 (Free Chemical Reaction Workbench & JSON Specification)

本文档详细说明「**Free Chemical Reaction Workbench（自由化学反应实验台）**」（模式二）的三步交互设计、全屏 118 元素周期表分子构建器、ZIP 压缩包批量导入/导出机制、统一拓扑 JSON 格式规范以及三维反应动画的自动解算原理。

---

## 一、 顶层导航与全局交互规范

1. **每次进入实验台从 Step 1 开始**：
   - 在首页点击进入 `Free Chemical Reaction Workbench`（或 `Radical Substitution of Methane`）时，状态机自动重置 `screen = 'gate'`（即 `Step 1 · Molecules`），确保每次进入都有清晰一致的起点。
2. **Header 顶栏布局**：
   - **左上角返回箭头（`.header-back-arrow`）**：仅保留简洁左箭头图标，无文字、无按钮边框，点击直接返回首页。
   - **最右侧步骤切换器（`.header-stepper-right`）**：`1. Molecules`、`2. Reaction Stages`、`3. 3D Reaction Stage` 三个步骤 Tab 置于 Header 最右侧，支持随时点击切换。
3. **底部固定步骤切换栏（`.fixed-bottom-bar`）**：
   - 在 Step 1 和 Step 2 页面底部，切换栏采用 `position: fixed; bottom: 0; left: 0; right: 0` 固定在视口底部并撑满全宽，左侧展示当前分子/阶段统计，右侧提供上一步/下一步主操作按钮。

---

## 二、 三步实验流程详解

### Step 1: Molecular Structure Library（分子结构构建与管理）

- **右上角分组操作栏（`.gate-toolbar-group`）**：
  1. **`+ Add Chemical Substance`（主按钮）**：打开全屏交互式分子构建器。与网格末尾虚线新增卡片的文案完全统一。
  2. **`Upload Files`（次级描边按钮）**：支持一次选择或拖拽上传任意数量的 `.json` 分子配置文件。
  3. **`Library Actions ▾`（下拉菜单）**：将批量与辅助操作收纳在精致的下拉菜单中，避免右上角按钮堆砌：
     - **`Export All as ZIP (N)`**：调用 [`createZipBlob()`](file:///Users/joshua/work-big-bridge/学科融合/src/engine/zipExporter.ts#L31-L116) 将当前分子库中所有化学物质一键打包为标准 `.zip` 压缩包（`molecules-library.zip`）下载，每张分子卡片不再单独放置导出按钮，界面更清爽。
     - **`Load Sample Library`**：一键恢复预设的 7 种示例化学物质。
     - **`Clear All Substances`**：清空当前分子库。

- **全屏交互式分子构建器（[`MoleculeBuilderModal.tsx`](file:///Users/joshua/work-big-bridge/学科融合/src/components/FreeMode/MoleculeBuilderModal.tsx)）**：
  - **全屏大尺寸视野**：弹框尺寸为 `calc(100vw - 32px) × calc(100vh - 32px)`，内部字号、按钮、周期表原子格与 2D 拓扑画布全面放大。
  - **118 元素全周期表**：支持完整 **Periods 1–7 + Lanthanides/Actinides（共 118 种元素）**分类筛选及常用元素快捷栏（`Common: H, C, N, O, F, Cl, Br, I, S, P, Na, Fe, Cu`）。点击元素即可向 2D 画布添加原子；若画布已有选中原子，会自动建立共价单键。
  - **2D 拓扑画布交互**：
    - `Bond / Select` 模式：从一个原子拖拽到另一个原子即可连键；点击已有化学键可在 `Single (1) → Double (2) → Triple (3)` 间切换键级，或点击 `Delete Bond` 断键。
    - `Move Layout` 模式（或按住 `Shift` 拖动）：自由调整 2D 原子排布。
    - `+ Auto Fill H`：按选中原子的常见共价键数自动补齐氢原子。
    - `· Radical`：切换选中原子的未成对电子（`radical: 0 | 1`）标记。
  - **参数配置与 `Auto-Fill Recommended Defaults`**：
    - 新建分子时，右侧的 `Geometry (VSEPR)`、`Hybridization`、`Bond Lengths (Å)` 与 `Bond Angles (°)` 默认留空，方便教学练习。
    - 点击顶部 **`Auto-Fill Recommended Defaults`** 按钮，系统会根据 2D 拓扑自动推算化学式、英文名称、VSEPR 构型、杂化方式及标准共价键长/键角，并在左下角实时渲染 3D 球棍模型。
  - **3D 实时预览尺寸隔离机制**：
    - 左下角 3D 预览卡片采用 `.builder-3d-stage-box`（`flex: 1; position: relative; overflow: hidden`）包裹绝对定位的 `.builder-3d-viewport`（`position: absolute; inset: 0`），配合 `grid-template-columns: minmax(0, 1.12fr) minmax(0, 1fr)` 与 `>= 1px` 尺寸守卫，确保编辑任意已有分子时 3D 视口宽度恒定不膨胀。

---

### Step 2: Reaction Stages（动态反应阶段编排）

- **顶部物质池（`Chemical Substance Pool`）**：自动汇总 Step 1 中的所有分子，支持拖拽或点击填入下方槽位。
- **胶囊式阶段导航栏（`.stage-bar-header`）**：
  - 左侧 `.stage-pills-track` 以圆角分段胶囊展示各个反应阶段 Tab；
  - 右侧 `.stage-add-pill-btn`（`+ Add Stage`）作为独立胶囊按钮与左侧对齐，视觉层次清晰美观；
  - 删除当前阶段按钮文案简化为 **`Delete`**。
- **无残影拖拽装配**：
  - `<DragOverlay dropAnimation={null}>` 禁用了松手后向原位飞回的默认动画，拖入反应槽位松手即刻完成放置。
  - 每个阶段仅需配置 `[Reactants (Before)] ➔ [Products (After)]`，中间以反应箭头连接，支持任意次数重复放入同种微粒。

---

### Step 3: 3D Reaction Stage（全自动三维结构与结合/分离过渡动画）

- **三段式反应动力学插值（[`sampleFreeStage()`](file:///Users/joshua/work-big-bridge/学科融合/src/engine/freeReactionEngine.ts#L569-L645)）**：
  1. **`0% ~ 35%`（Reactants Approaching）**：反应前各分子从初始位置向反应中心平滑靠拢，并自动旋转使即将断键/成键的活性原子朝向反应中心。
  2. **`35% ~ 68%`（Bond Breaking & Forming）**：断裂的共价键平滑淡出，新生成的共价键平滑淡入，转移原子跨越反应中心，未成对电子（`·`）与中心原子三维构型同步完成平滑过渡（如四面体 $\leftrightarrow$ 平面三角形）。
  3. **`68% ~ 100%`（Products Separating）**：反应生成的产物分子向两侧平滑分离定型，3D 悬浮标签平滑切换为产物化学式。
- **右侧机理分析面板**：实时展示当前阶段的反应方程式、**Bonds Broken**、**Bonds Formed** 以及反应前后物质清单。

---

## 三、 统一分子拓扑 JSON 格式规范

自由化学反应实验台采用统一的 **`nodes + bonds` 拓扑 JSON 结构**，可表达单原子、双原子、单中心分子以及任意多中心链状/支链/环状分子（如乙烷 $\text{CH}_3\text{CH}_3$、乙烯 $\text{C}_2\text{H}_4$、甲醇 $\text{CH}_3\text{OH}$ 等）。

### 字段定义

| 字段名 | 类型 | 必填 | 说明 |
| :--- | :--- | :---: | :--- |
| `name` | `string` | 是 | 化学物质名称（如 `"Bromomethane"`、`"Ethane"`） |
| `formula` | `string` | 是 | 化学式，自由基末尾带 `·`（如 `"CH4"`、`"CH3·"`、`"CH3CH3"`） |
| `geometry` | `string` | 是 | 空间构型标识：`atomic` \| `diatomic` \| `linear` \| `bent` \| `trigonalPlanar` \| `trigonalPyramidal` \| `regularTetrahedral` \| `tetrahedral` \| `squarePlanar` \| `trigonalBipyramidal` \| `octahedral` |
| `hybridization` | `string` | 否 | 中心原子杂化方式：`none` \| `sp` \| `sp2` \| `sp3` \| `sp3d` \| `sp3d2` |
| `bondLengths` | `Record<string, number>` | 是 | 各共价键键长（单位 Å），键名按字母序或连接序如 `"C-H": 1.09`、`"C-C": 1.54` |
| `bondAngles` | `Record<string, number>` | 是 | 各共价键夹角（单位 °），键名如 `"H-C-H": 109.5`（单原子/双原子可为空对象 `{}`） |
| `description` | `string` | 否 | 结构或反应特性简要说明 |
| `nodes` | `Array<Node>` | 是 | 原子节点数组：`{ id: string, element: string, radical: 0 \| 1, x?: number, y?: number }` |
| `bonds` | `Array<Bond>` | 是 | 化学键连接数组：`{ id: string, from: string, to: string, order: 1 \| 2 \| 3, length?: number }` |

### 示例：双中心分子（Ethane `CH3CH3.json`）

```json
{
  "name": "Ethane",
  "formula": "CH3CH3",
  "geometry": "tetrahedral",
  "hybridization": "sp3",
  "bondLengths": {
    "C-C": 1.54,
    "C-H": 1.09
  },
  "bondAngles": {
    "H-C-H": 109.5,
    "H-C-C": 109.5
  },
  "description": "Two methyl radicals couple via a C—C single bond to form a stable ethane molecule.",
  "nodes": [
    { "id": "c1", "element": "C", "radical": 0, "x": 185, "y": 165 },
    { "id": "c2", "element": "C", "radical": 0, "x": 295, "y": 165 },
    { "id": "h1", "element": "H", "radical": 0, "x": 185, "y": 82 },
    { "id": "h2", "element": "H", "radical": 0, "x": 105, "y": 165 },
    { "id": "h3", "element": "H", "radical": 0, "x": 185, "y": 248 },
    { "id": "h4", "element": "H", "radical": 0, "x": 295, "y": 82 },
    { "id": "h5", "element": "H", "radical": 0, "x": 375, "y": 165 },
    { "id": "h6", "element": "H", "radical": 0, "x": 295, "y": 248 }
  ],
  "bonds": [
    { "id": "b1", "from": "c1", "to": "c2", "order": 1, "length": 1.54 },
    { "id": "b2", "from": "c1", "to": "h1", "order": 1, "length": 1.09 },
    { "id": "b3", "from": "c1", "to": "h2", "order": 1, "length": 1.09 },
    { "id": "b4", "from": "c1", "to": "h3", "order": 1, "length": 1.09 },
    { "id": "b5", "from": "c2", "to": "h4", "order": 1, "length": 1.09 },
    { "id": "b6", "from": "c2", "to": "h5", "order": 1, "length": 1.09 },
    { "id": "b7", "from": "c2", "to": "h6", "order": 1, "length": 1.09 }
  ]
}
```
