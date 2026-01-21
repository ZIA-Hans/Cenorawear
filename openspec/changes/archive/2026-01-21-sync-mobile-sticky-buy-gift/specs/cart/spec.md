# 规格：吸底按钮多商品加购

**能力:** `cart`  
**变更ID:** `sync-mobile-sticky-buy-gift`

## 概述

定义移动端吸底按钮在存在赠品关联时的加购行为，确保其与主商品表单的加购体验完全一致。

**实施状态:** ✅ 已完成（2026-01-22）

---

## 技术实现摘要

### 核心修改
1. **`assets/custom-async.js`：** 在 `addCartItem` 函数中添加对 `-sticky` 后缀表单的赠品识别支持
2. **`snippets/product-sticky-buy-button.liquid`：** 添加 `f8pr` 类名并实现基于 `themeVariantUpdated` 事件的状态同步

### 关键逻辑
```javascript
// 赠品识别：条件分流策略
if (radioFormId === formId) {
    // 主表单路径（不变）
    selectedGiftRadios.push(radio);
} else if (formId.endsWith('-sticky') && radioFormId === formId.replace('-sticky', '')) {
    // 吸底表单路径（新增）
    selectedGiftRadios.push(radio);
}
```

详细实施文档请参阅：[IMPLEMENTATION.md](../IMPLEMENTATION.md)

---

## ADDED Requirements

### Requirement: 支持吸底表单的多商品识别

`ajaxCart.addCartItem` MUST 能够识别并收集属于其对应主表单的赠品单选按钮状态，即使提交的是带有 `-sticky` 后缀的吸底表单。

**ID:** `GIFT-STK-001`  
**Priority:** MUST

#### Scenario: 通过吸底按钮加购主商品及其赠品
**假设**：
- 主表单 ID 为 `product-form-123`
- 吸底表单 ID 为 `product-form-123-sticky`
- 选中的赠品 radio 具有属性 `form="product-form-123"` 且 `data-gift-variant-id-attr="456"`

**当** 用户提交吸底表单时

**那么** 系统应识别到赠品 ID `456`，并向 `/cart/add.js` 发送包含主商品及赠品的 `items` 数组。

---

### Requirement: 吸底按钮状态实时同步

吸底按钮组件 MUST 实时监听主表单的赠品选择变化，并同步其内部状态。

**ID:** `GIFT-STK-002`  
**Priority:** MUST

#### Scenario: 同步主表单的赠品选中状态
**假设** 用户在页面顶部点击选中了赠品。

**当** 用户滚动到页面底部显示吸底按钮时

**那么** 吸底按钮的提交逻辑应已准备好包含该赠品，且如果有价格变动逻辑，应同步显示。
