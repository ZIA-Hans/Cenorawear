# 技术设计：吸底加购按钮赠品同步 (V2 - 安全隔离版)

**变更ID:** `sync-mobile-sticky-buy-gift`

## 核心目标
在不影响主表单 (`.f8pr`) 现有加购逻辑的前提下，为吸底表单 (`.f8pr-buy-button`) 适配多商品加购能力。

## 安全隔离设计

### 1. addCartItem 逻辑的条件扩展
修改 `assets/custom-async.js` 中的赠品收集逻辑，确保对主表单的逻辑路径保持"原封不动"。

**逻辑路径分析：**
- **Case: 主表单提交**
  - `formId` = `product-form-{{ section.id }}`
  - `formId.endsWith('-sticky')` -> `false`
  - 仅执行 `radioFormId === formId` 匹配。
  - **结论**：逻辑与修改前 100% 一致。

- **Case: 吸底表单提交**
  - `formId` = `product-form-{{ section.id }}-sticky`
  - `formId.endsWith('-sticky')` -> `true`
  - 允许匹配 `radioFormId` 为 `product-form-{{ section.id }}` 的赠品。
  - **结论**：实现了跨表单的赠品识别。

### 2. 吸底表单类名调整
在 `snippets/product-sticky-buy-button.liquid` 中，将表单类名从 `f8pr-buy-button` 更改为 `f8pr f8pr-buy-button`。
- **目的**：使其能被 `ajaxCart.init()` 发现并应用 `formOverride`。
- **安全性**：由于其 ID 的唯一性，它在 `addCartItem` 中会走专门为 sticky 设计的路径。

### 3. UI 状态实时同步
在 `snippets/product-sticky-buy-button.liquid` 的脚本中：
- 监听主表单中 `.f8pr-gift-radio` 的 `change` 事件。
- 仅做视觉同步（如价格显示调整），不干预加购数据（加购数据由 `addCartItem` 在提交瞬间实时抓取）。

## 4. 状态同步机制（V2.2 - 双重监听架构）

### 架构演进

**V1（初版）：** 单一事件监听 `themeVariantUpdated`
- 问题：用户点击到看到反馈有延迟（约 150-200ms）

**V2（当前版）：** 双重监听架构
- 改进：用户点击立即显示 loading，体验更流畅

### 双重监听架构

```
┌───────────────────────────────────────────────────────────┐
│ 监听层 1: 用户交互监听（立即反馈）                          │
├───────────────────────────────────────────────────────────┤
│ setupOptionChangeListeners()                              │
│ 监听：.f8pr-variant-selection 的 change 事件               │
│ 触发时机：用户点击 select 或 radio                          │
│ 动作：startStickyLoading() - 立即显示 loading              │
└───────────────────────────────────────────────────────────┘
                        ↓
                   用户看到 spinner
                        ↓
┌───────────────────────────────────────────────────────────┐
│ 监听层 2: 更新完成监听（同步数据）                          │
├───────────────────────────────────────────────────────────┤
│ themeVariantUpdated 事件监听                               │
│ 触发时机：主题完成 variant 切换，DOM 已更新                 │
│ 动作：                                                     │
│   1. 延迟 150ms 读取数据（确保 DOM 稳定）                   │
│   2. 同步 variant ID、选项文本、价格、按钮状态              │
│   3. endStickyLoading() - 移除 loading（至少 300ms）       │
└───────────────────────────────────────────────────────────┘
```

### Loading 状态管理（状态机模式）

**状态对象：**
```javascript
{
    isLoading: false,      // 当前是否在 loading
    startTime: null,       // loading 开始时间
    timeoutId: null,       // 超时计时器
    maxLoadingTime: 5000,  // 最大 5 秒（兜底）
    minLoadingTime: 300    // 最小 300ms（视觉反馈）
}
```

**三层保障机制：**
1. **立即触发：** 用户点击时立即 loading，无延迟
2. **正常结束：** 数据同步完成后正常移除 loading
3. **超时兜底：** 5 秒后强制恢复，防止按钮永久禁用

**状态转换：**
```
IDLE ──用户点击──> LOADING ──同步完成/超时──> IDLE
```

### 同步时序控制（完整流程）

```
T+0ms     用户点击选项（Size: 10 → 11）
          └─> startStickyLoading()
               ├─ loading=true, disabled=true
               ├─ 用户看到 spinner + "Adding..."
               └─ 启动 5 秒超时计时器

T+10ms    主题开始处理 variant 切换

T+150ms   主题派发 themeVariantUpdated 事件

T+160ms   开始同步数据：
          ├─ 读取 variant ID
          ├─ 读取选项文本（排除 name="id"）
          ├─ 读取价格信息
          └─ 更新按钮状态

T+310ms   调用 endStickyLoading(false)
          └─ 已显示 310ms，满足最小时间
             立即移除 loading

T+310ms   按钮恢复可用，用户可继续操作
```

### 数据读取策略（优化版）

**Variant ID：** 
- 从 `.f8pr-variant-selection[data-current-variant]` 属性读取
- 后备查询：通过 `form` 属性反向查找 `.f8pr-variant-selection`

**选项文本（改进）：**
```javascript
// 排除 name="id" 的变体选择器（避免重复）
var selects = variantSelection.querySelectorAll('select:not([name="id"])');
var radios = variantSelection.querySelectorAll('input[type="radio"]:checked:not([name="id"])');

// Select: 使用 option.text
// Radio: 优先使用 title 属性（图片 swatch）
```

**价格信息：** 直接克隆主表单价格容器的文本内容，区分促销价和常规价

**按钮状态：** 镜像主按钮的 `disabled` 属性和按钮文本

### 关键改进点

1. **用户体验提升：**
   - 从延迟 150-200ms 到立即反馈（0ms）
   - loading 动画确保至少显示 300ms，避免闪烁

2. **健壮性增强：**
   - 超时兜底机制（5 秒）
   - 防重入检查
   - 所有 DOM 查询都有存在性验证

3. **选项文本准确性：**
   - 排除 `name="id"` 选择器
   - 避免显示完整 variant title 导致的重复

4. **可维护性：**
   - 状态机模式清晰
   - 封装 `startStickyLoading()` 和 `endStickyLoading()` 函数
   - 详细的日志输出便于调试

## 结论

该设计通过以下核心策略实现了完整的移动端吸底按钮功能：

1. **条件分流策略：** 主表单逻辑完整保留，吸底表单作为"受控增量"接入，风险极低

2. **双重监听架构：** 用户交互监听 + 更新完成监听，实现 0 延迟的视觉反馈

3. **状态机模式：** 健壮的 loading 管理，包含三层保障（立即触发、正常结束、超时兜底）

4. **精准数据读取：** 排除干扰选择器，确保选项文本、价格、状态完全准确

**技术亮点：**
- 用户体验：从延迟 150-200ms 提升到立即反馈（0ms）
- 健壮性：超时保护 + 防重入 + DOM 验证
- 可维护性：清晰的函数封装 + 详细的日志输出

状态同步在性能、准确性和用户体验之间取得了最佳平衡。

---

**设计版本:** 2.2（双重监听架构 + 状态机模式）  
**最后更新:** 2026-01-22  
**更新内容：**
- 从单一事件监听升级到双重监听架构
- 引入状态机模式管理 loading 状态
- 优化选项文本读取逻辑（排除 name="id"）
- 添加超时兜底机制（5 秒）
