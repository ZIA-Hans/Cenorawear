# 赠品关联功能 - 新版实现指南

## 概述

新版赠品关联功能提供了更精美的UI设计，类似截图中的卡片样式，并实现了赠品与标准尺寸选项的互斥选择。

## 已完成的修改

### 1. Liquid模板 (`sections/main-product.liquid`)
- ✅ 解析metafield数据
- ✅ 渲染赠品卡片（精美的卡片设计，包含图片、标题、FREE徽章、描述和特性列表）
- ✅ 渲染可折叠的"I Already Know My Size"部分
- ✅ 从标准选项中过滤掉被赠品关联的选项值

### 2. CSS样式 (`assets/gift-associations-styles.css`)
- ✅ 赠品卡片样式（悬停效果、选中状态）
- ✅ 可折叠部分样式（展开/收起动画）
- ✅ 响应式设计（移动端适配）
- ✅ 已在 `layout/theme.liquid` 中引入

### 3. JavaScript逻辑 (`assets/gift-associations-script.js`)
- ✅ 赠品选择时自动设置关联的选项值
- ✅ 表单拦截，实现多SKU同时加购
- ✅ 已在 `layout/theme.liquid` 中引入

### 4. 主题布局 (`layout/theme.liquid`)
- ✅ 引入新的CSS文件
- ✅ 引入新的JS文件

## 配置步骤

### 步骤1：创建Metafield定义

1. 进入 Shopify Admin → **Settings** → **Custom data** → **Products**
2. 点击 **Add definition**
3. 配置如下：
   - **Name**: `赠品相关`
   - **Namespace and key**: `custom.option_gift_association`
   - **Type**: **JSON**
4. 保存

### 步骤2：为产品配置赠品关联数据

1. 进入 **Products** → 选择目标产品（例如：Cenora Wear S2 Smart Ring）
2. 在产品编辑页面，向下滚动找到 **Metafields** 部分
3. 找到 **赠品相关** 字段
4. 输入以下JSON格式的数据：

```json
{
  "associations": [
    {
      "option_name": "Size",
      "option_value": "未确认",
      "gift_product_handle": "ring-sizer",
      "gift_variant_id": null
    }
  ]
}
```

**字段说明：**
- `option_name`: 必须与产品的实际选项名称完全匹配（如 "Size"）
- `option_value`: 要关联赠品的选项值（如 "未确认"）
- `gift_product_handle`: 赠品商品的handle（在赠品商品URL中找到，如 `products/ring-sizer` 中的 `ring-sizer`）
- `gift_variant_id`: 可设为 `null`，系统会自动使用第一个可用variant

5. 点击 **Save** 保存产品

### 步骤3：创建赠品商品

1. 创建一个新商品作为赠品（例如："Sizing Kit" 或 "指模"）
2. 设置商品handle（例如：`ring-sizer`）
3. 设置价格为 **$0.00**（显示为FREE）
4. 添加商品图片和描述
5. 确保商品可用且有库存

### 步骤4：测试功能

1. 访问产品页面：`http://127.0.0.1:9292/products/cenora-wear-s2-smart-ring`
2. 应该看到：
   - 一个精美的赠品卡片（"Sizing Kit"），带有FREE徽章
   - 下方有一个可折叠的"I Already Know My Size"部分
   - 标准的Size选项中不再显示"未确认"
3. 选择赠品卡片，应该高亮显示选中状态
4. 展开"I Already Know My Size"，选择具体尺寸
5. 选择赠品后点击"Add to Cart"，购物车应同时包含：
   - 主产品（颜色+未确认尺寸）
   - 赠品（Sizing Kit）

## UI特性

### 赠品卡片设计
- 80x80px 商品图片（移动端 60x60px）
- 商品标题和FREE徽章（绿色）
- 商品描述（最多20个单词）
- 特性列表：
  - ✓ Perfect ring fit—no guesswork
  - ✓ Yours to keep and share—no returns required
- 悬停效果和选中状态的边框/背景变化

### 可折叠部分
- "I Already Know My Size" 标签
- 向下箭头图标（展开时旋转180度）
- 平滑的展开/收起动画
- 展开后显示标准的尺寸选择器

### 互斥选择
- 赠品和"已知尺寸"通过radio按钮实现互斥
- 选择赠品时，"已知尺寸"部分自动折叠
- 选择"已知尺寸"时，赠品卡片取消选中

## 多SKU加购逻辑

当用户选择赠品并点击"Add to Cart"时：

1. JavaScript拦截表单提交
2. 收集主产品variant ID和赠品variant ID
3. 使用 `/cart/add.js` API发送单个请求，包含两个items
4. 成功后跳转到购物车页面

```javascript
{
  "items": [
    {
      "id": 主产品variant_id,
      "quantity": 1
    },
    {
      "id": 赠品variant_id,
      "quantity": 1
    }
  ]
}
```

## 注意事项

1. **Metafield namespace必须正确**：`custom.option_gift_association`（单数）
2. **Option名称必须匹配**：确保JSON中的 `option_name` 与产品实际选项名称一致
3. **赠品商品必须存在**：`gift_product_handle` 必须指向一个有效的商品
4. **价格设置**：赠品价格设为 $0.00 会显示FREE徽章
5. **移动端适配**：在小屏幕上自动调整布局和字体大小

## 故障排查

### 问题：赠品卡片没有显示
- 检查metafield数据是否正确配置
- 检查 `gift_product_handle` 是否指向有效商品
- 在浏览器控制台查看是否有JavaScript错误

### 问题：点击加购后没有反应
- 检查浏览器控制台的错误信息
- 确认 `/cart/add.js` API可用
- 检查variant ID是否有效

### 问题：样式不对
- 清除浏览器缓存
- 确认 `gift-associations-styles.css` 已正确上传
- 检查 `layout/theme.liquid` 中的CSS引用

## 未来改进

- 支持多个赠品选项
- 添加自定义特性列表（从metafield读取）
- 支持赠品数量选择
- 添加赠品库存检查
