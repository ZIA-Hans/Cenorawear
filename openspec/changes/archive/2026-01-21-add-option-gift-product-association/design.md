# 技术设计：选项关联赠品功能

**变更ID:** `add-option-gift-product-association`  
**最后更新:** 2026-01-14

## 架构概览

该功能扩展了现有的Shopify产品变体选择系统，以支持选项值与赠品之间的关联。它在现有的Liquid + JavaScript架构中运行，该架构已用于变体选择。

```
┌─────────────────────────────────────────────────────────────┐
│                     产品页面加载                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  读取Metafield       │
          │  option_gift_        │
          │  associations        │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  解析关联关系         │
          │  按当前产品选项过滤   │
          └──────────┬───────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────┐         ┌──────────────────┐
│ 标准选项     │         │ 关联赠品行        │
│ (已过滤)     │         │ (新UI)           │
└──────┬───────┘         └────────┬─────────┘
       │                          │
       │        用户选择           │
       └──────────────┬───────────┘
                      ▼
            ┌─────────────────────┐
            │  更新变体选择状态    │
            │  (标准 & 关联)      │
            └─────────┬───────────┘
                      │
                      ▼
            ┌─────────────────────┐
            │  从组合选项值        │
            │  解析变体ID          │
            └─────────┬───────────┘
                      │
                      ▼
            ┌─────────────────────┐
            │  更新UI:            │
            │  - 价格             │
            │  - 图片             │
            │  - 库存             │
            │  - 购买按钮         │
            └─────────┬───────────┘
                      │
                      ▼ (用户点击加入购物车)
            ┌─────────────────────┐
            │  收集SKU:           │
            │  - 主变体ID         │
            │  - 赠品变体ID       │
            │    (如果选择了      │
            │     关联选项)       │
            └─────────┬───────────┘
                      │
                      ▼
            ┌─────────────────────┐
            │  加入购物车:         │
            │  POST /cart/add.js  │
            │  { items: [...] }   │
            └─────────────────────┘
```

## 组件设计

### 1. 配置层（Liquid）

**位置:** `sections/main-product.liquid`（lines ~17-104）

**职责:**
- 读取并解析 `custom.option_gift_associations` metafield
- 验证关联数据结构
- 使关联数据可用于模板逻辑

**实现:**

```liquid
{%- liquid
  assign gift_associations = product.metafields.custom.option_gift_associations.value
  assign has_gift_associations = false
  assign gift_associations_map = blank
  
  if gift_associations and gift_associations.associations.size > 0
    assign has_gift_associations = true
    comment 将关联处理成映射以便查找 endcomment
    for association in gift_associations.associations
      assign gift_product_handle = association.gift_product_handle
      assign gift_product = all_products[gift_product_handle]
      if gift_product != blank
        comment 创建查找键: option_name|option_value endcomment
        assign lookup_key = association.option_name | append: '|' | append: association.option_value
        comment 存储在映射中（需要构建基于字符串的映射） endcomment
      endif
    endfor
  endif
-%}
```

**数据结构:**

```json
{
  "associations": [
    {
      "option_name": "尺寸",
      "option_value": "未确认尺寸", 
      "gift_product_handle": "ring-sizing-kit",
      "gift_variant_id": null  // 可选，如果为null则使用第一个可用变体
    }
  ]
}
```

### 2. UI渲染层（Liquid）

**位置:** `sections/main-product.liquid` variant_selection区块（lines ~520-878）

**职责:**
- 从标准控件中过滤掉关联的选项值
- 渲染关联的赠品行
- 为JavaScript设置数据属性

**关键变更:**

#### A. 从标准选项中过滤关联值

```liquid
{%- for option in product.options_with_values -%}
  {%- for value in option.values -%}
    {%- liquid
      assign is_associated = false
      assign lookup_key = option.name | append: '|' | append: value
      if gift_associations_map contains lookup_key
        assign is_associated = true
      endif
    -%}
    
    {%- unless is_associated -%}
      <li>
        <input type="radio" ... />
        <label>{{ value }}</label>
      </li>
    {%- endunless -%}
  {%- endfor -%}
{%- endfor -%}
```

#### B. 渲染关联赠品行

**新区块位置:** 标准选项渲染之前

```liquid
{%- if has_gift_associations -%}
  <div class="f8pr-gift-associations">
    {%- for association in gift_associations.associations -%}
      {%- liquid
        assign gift_product = all_products[association.gift_product_handle]
        if gift_product == blank
          continue
        endif
        
        assign gift_variant_id = association.gift_variant_id
        if gift_variant_id == null
          assign gift_variant = gift_product.selected_or_first_available_variant
          assign gift_variant_id = gift_variant.id
        endif
      -%}
      
      <div class="f8pr-gift-association-row" 
           data-option-name="{{ association.option_name }}"
           data-option-value="{{ association.option_value }}"
           data-gift-variant-id="{{ gift_variant_id }}">
        <input type="checkbox" 
               id="gift-assoc-{{ association.option_name | handleize }}-{{ association.option_value | handleize }}"
               class="f8pr-gift-checkbox"
               data-sets-option="{{ association.option_name }}"
               data-sets-value="{{ association.option_value }}"
               form="{{ form_id }}">
        
        <label for="gift-assoc-{{ association.option_name | handleize }}-{{ association.option_value | handleize }}">
          <div class="gift-product-image">
            {% if gift_product.featured_image %}
              <img src="{{ gift_product.featured_image | image_url: width: 60 }}" 
                   alt="{{ gift_product.title }}" 
                   loading="lazy">
            {% endif %}
          </div>
          
          <div class="gift-product-info">
            <h4>{{ gift_product.title }}</h4>
            {% if gift_product.price == 0 %}
              <span class="gift-badge">{{ 'product.gift_free' | t }}</span>
            {% else %}
              <span class="price">{{ gift_product.price | money }}</span>
            {% endif %}
            {% if gift_product.description != blank %}
              <p class="gift-description">{{ gift_product.description | strip_html | truncate: 100 }}</p>
            {% endif %}
          </div>
          
          <div class="gift-product-action">
            <span class="checkmark"></span>
          </div>
        </label>
      </div>
    {%- endfor -%}
  </div>
{%- endif -%}
```

### 3. 选择逻辑层（JavaScript）

**位置:** `assets/custom-async.js`（扩展productVariantsAsync函数，lines ~5068-5327）

**职责:**
- 处理赠品关联复选框变化
- 将赠品选择与隐藏选项输入同步
- 赠品选择时触发变体更新
- 收集用于添加到购物车的赠品变体ID

**实现:**

```javascript
// 添加到productVariantsAsync函数
var gift_checkboxes = Array.from(document.querySelectorAll('.f8pr-gift-checkbox:not(.listening)'));

gift_checkboxes.forEach(function(checkbox) {
  checkbox.classList.add('listening');
  
  checkbox.addEventListener('change', function() {
    const optionName = checkbox.dataset.setsOption;
    const optionValue = checkbox.dataset.setsValue;
    const productFormTemplate = checkbox.closest('.m6pr').dataset.template;
    const productFormSection = document.querySelector('.m6pr-' + productFormTemplate);
    
    if (checkbox.checked) {
      // 找到此选项的隐藏或可见选项输入并设置其值
      const optionInput = productFormSection.querySelector(
        `select[name^="options"][name*="${optionName}"], ` +
        `input[type="radio"][name^="options"][name*="${optionName}"][value="${optionValue}"]`
      );
      
      if (optionInput) {
        if (optionInput.tagName === 'SELECT') {
          // 找到匹配值的选项
          const option = Array.from(optionInput.options).find(opt => opt.value === optionValue);
          if (option) {
            optionInput.value = optionValue;
            optionInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } else {
          optionInput.checked = true;
          optionInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      
      // 取消选中同一选项的其他赠品复选框
      const sameOptionCheckboxes = productFormSection.querySelectorAll(
        `.f8pr-gift-checkbox[data-sets-option="${optionName}"]`
      );
      sameOptionCheckboxes.forEach(cb => {
        if (cb !== checkbox) cb.checked = false;
      });
    } else {
      // 如果取消选中，选择第一个非赠品选项值
      // (实现取决于业务逻辑 - 可能需要必选)
    }
  });
});
```

### 4. 购物车添加层（JavaScript）

**位置:** `assets/custom-async.js`（修改添加到购物车处理器）

**职责:**
- 检测是否选择了赠品关联
- 收集赠品变体ID
- 提交多个商品到购物车

**实现:**

```javascript
// 扩展购物车添加逻辑
function addProductToCart(formElement) {
  const formData = new FormData(formElement);
  const mainVariantId = formData.get('id');
  const quantity = formData.get('quantity') || 1;
  
  // 检查选中的赠品关联
  const giftCheckboxes = formElement.querySelectorAll('.f8pr-gift-checkbox:checked');
  const items = [
    {
      id: mainVariantId,
      quantity: parseInt(quantity)
    }
  ];
  
  // 添加赠品变体
  giftCheckboxes.forEach(checkbox => {
    const giftRow = checkbox.closest('.f8pr-gift-association-row');
    const giftVariantId = giftRow.dataset.giftVariantId;
    items.push({
      id: giftVariantId,
      quantity: 1
    });
  });
  
  // 提交到购物车
  return fetch('/cart/add.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: items })
  })
  .then(response => response.json())
  .then(data => {
    // 处理成功
    if (window.ajaxCart && window.ajaxCart.update) {
      window.ajaxCart.update();
    }
    return data;
  })
  .catch(error => {
    console.error('购物车添加错误:', error);
    throw error;
  });
}
```

## 数据流

### 选择流程

1. **用户点击赠品关联复选框**
2. JavaScript处理器：
   - 设置复选框为选中
   - 取消选中同一选项的其他赠品复选框
   - 找到对应的选项输入（隐藏或可见）
   - 设置选项输入值
   - 触发选项输入的change事件
3. 现有变体选择逻辑：
   - 读取所有选项值（包括赠品设置的）
   - 解析到变体ID
   - 通过AJAX获取更新的产品HTML
   - 更新DOM（价格、图片、库存等）
4. 新变体HTML渲染：
   - 赠品复选框以正确的选中状态重新渲染
   - 标准选项显示更新的选择

### 购物车添加流程

1. **用户点击"加入购物车"**
2. 表单提交被JavaScript拦截
3. 从 `input[name="id"]` 收集主变体ID
4. 从选中的 `.f8pr-gift-checkbox` 元素收集赠品变体ID
5. 构建商品数组：`[{ id: main, quantity: X }, { id: gift, quantity: 1 }]`
6. POST到 `/cart/add.js` 携带商品数组
7. 处理响应：
   - 成功：更新购物车抽屉/页面
   - 错误：显示错误消息，不添加任何商品

## 状态管理

### 选择状态

- **标准选项**：由现有的radio/select输入管理
- **赠品关联**：由复选框输入管理
- **变体ID**：从组合选项值计算（标准 + 赠品设置）

### 持久化

- **页面加载**：除非URL有匹配赠品值的选项参数，否则赠品复选框默认未选中
- **变体更新**：AJAX更新期间保留赠品复选框状态
- **购物车**：主商品和赠品之间没有持久链接（用户可以独立移除）

## 错误处理

### 配置错误

- **缺少metafield**：功能禁用，不显示错误
- **无效的metafield JSON**：记录警告，功能禁用
- **找不到赠品**：跳过该关联，继续其他关联
- **赠品变体不可用**：跳过该关联或显示禁用状态

### 运行时错误

- **变体解析失败**：回退到默认变体，显示错误消息
- **购物车添加失败**：显示错误，不更新购物车UI
- **AJAX更新失败**：显示错误，保持当前状态

## 性能考虑

### 加载时间

- **Metafield解析**：最小开销（典型JSON约1-2ms）
- **赠品产品查找**：使用 `all_products[handle]`（由Shopify缓存）
- **HTML大小增加**：每个赠品关联约1KB

### 运行时性能

- **事件监听器**：每个复选框一个（可忽略）
- **变体更新**：使用现有AJAX机制（无额外请求）
- **购物车添加**：单个POST包含多个商品（比单独请求更高效）

## 浏览器兼容性

- **目标**：现代常青浏览器（Chrome、Firefox、Safari、Edge）
- **所需API**： 
  - `fetch`（如需要可用polyfill）
  - `FormData`
  - `querySelector` / `querySelectorAll`
  - 事件监听器
- **回退**：功能优雅降级 - 如果JavaScript失败，标准选项仍然工作

## 安全考虑

- **输入验证**：变体ID由Shopify购物车API在服务器端验证
- **XSS防护**：来自metafield的所有面向用户的内容必须在Liquid中转义
- **CSRF**：对购物车端点使用Shopify的内置CSRF保护
- **注入攻击**：Metafield JSON解析使用安全的JSON.parse，而非eval

## 测试策略

### 单元测试（手动）

1. 测试各种选项组合的变体解析
2. 测试有无赠品的购物车添加
3. 测试每种错误情况的错误处理

### 集成测试

1. 测试完整用户流程：选择选项 → 选择赠品 → 加入购物车
2. 测试变体更新保持赠品选择状态
3. 测试快速购买模态框中的赠品关联
4. 测试移动端布局和触摸交互

### 兼容性测试

1. 跨浏览器测试（Chrome、Firefox、Safari、Edge）
2. 移动设备测试（iOS、Android）
3. 屏幕阅读器的无障碍性测试
4. 禁用JavaScript的测试（优雅降级）

## 部署考虑

### 推出策略

1. **阶段1**：部署到staging，使用示例产品测试
2. **阶段2**：部署到生产环境，仅对测试产品启用
3. **阶段3**：为目标产品配置metafield（戒指 + 指模）
4. **阶段4**：监控分析和用户反馈
5. **阶段5**：如果成功，扩展到其他产品类别

### 回滚计划

如果出现问题：
1. 从产品中移除metafield（立即禁用功能）
2. 如果是代码问题，回滚Liquid/JS更改
3. 监控购物车放弃率和支持工单

### 监控

- **成功指标**：
  - 赠品选择率
  - 有无赠品的购物车完成率
  - 选择赠品时的平均订单价值
- **错误指标**：
  - JavaScript错误（通过错误跟踪）
  - 失败的购物车添加
  - 与功能相关的支持工单

## 关键设计决策

1. **赠品数量固定**：赠品始终以数量1添加，代码中硬编码，不提供配置选项
2. **购物车简化**：赠品作为普通SKU处理，依赖Shopify标准流程处理显示、库存、结账等
3. **独立管理**：购物车中主商品和赠品完全独立，不实现自动关联移除
4. **最小化UI**：选中状态通过标准复选框表示，不添加额外的视觉指示器
5. **错误处理基础**：初期仅处理基本错误，缺货等场景依赖Shopify API响应

## 未来增强

1. **管理UI**：构建Shopify管理应用扩展以简化配置
2. **多个赠品**：允许每个选项值关联多个赠品
3. **条件显示**：基于购物车价值、客户标签等显示赠品
4. **智能缺货处理**：添加前端库存检查，自动隐藏缺货赠品
5. **购物车链接**：实现主商品与赠品的关联移除逻辑
6. **A/B测试**：测试不同的赠品展示样式
7. **分析增强**：深度跟踪赠品提供对转化的影响
