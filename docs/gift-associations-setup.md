# 赠品关联功能设置指南

## Metafield定义

### 创建Metafield

在Shopify后台创建产品metafield：

- **命名空间**: `custom`
- **键**: `option_gift_association`
- **类型**: `JSON`
- **描述**: 产品选项与赠品的关联配置

### JSON模式

```json
{
  "associations": [
    {
      "option_name": "选项名称（必须完全匹配产品选项名）",
      "option_value": "选项值（必须完全匹配）",
      "gift_product_handle": "赠品产品handle",
      "gift_variant_id": "赠品变体ID（可选，null则使用第一个可用变体）"
    }
  ]
}
```

## 测试产品设置示例

### 主商品：测试戒指

1. **产品名称**: 测试戒指
2. **Handle**: `test-ring`
3. **选项**:
   - 颜色: 黑色、银色、金色
   - 尺寸: 6、7、8、未确认尺寸
4. **变体**: 创建所有组合（12个变体）
5. **价格**: 例如 $137.00
6. **库存**: 为每个变体设置库存

### 赠品：戒指指模套装

1. **产品名称**: 戒指指模套装
2. **Handle**: `ring-sizing-kit`
3. **变体**: 单个变体
4. **价格**: $0.00
5. **描述**: "免费指模套装，帮助您找到完美尺寸"

### 配置Metafield

为"测试戒指"产品添加metafield `custom.option_gift_association`：

```json
{
  "associations": [
    {
      "option_name": "尺寸",
      "option_value": "未确认尺寸",
      "gift_product_handle": "ring-sizing-kit",
      "gift_variant_id": null
    }
  ]
}
```

## 验证

1. 访问测试戒指产品页面
2. 应该看到"戒指指模套装"的可选择行
3. 尺寸选项中不应该出现"未确认尺寸"按钮
4. 选中赠品复选框后，选择颜色，点击"加入购物车"
5. 购物车应包含两个商品：
   - 测试戒指（选定颜色 + 未确认尺寸）
   - 戒指指模套装

## 实际应用场景

### 戒指产品

```json
{
  "associations": [
    {
      "option_name": "Size",
      "option_value": "Pending Confirmation",
      "gift_product_handle": "ring-sizing-kit",
      "gift_variant_id": null
    }
  ]
}
```

### 注意事项

1. **选项名称区分大小写**：必须完全匹配产品选项名
2. **赠品必须存在**：确保赠品handle对应的产品已发布
3. **赠品价格**：通常设为$0.00以显示"免费"标记
4. **赠品数量**：始终为1，不受主商品数量影响

## 故障排除

### 赠品行不显示

- 检查metafield JSON格式是否正确
- 确认`option_name`和`option_value`完全匹配
- 确认赠品handle对应的产品存在且已发布

### 选项值仍然显示

- 检查选项名称是否大小写匹配
- 清除浏览器缓存重新加载页面

### 加入购物车失败

- 检查赠品变体是否存在
- 查看浏览器控制台的错误消息
- 确认赠品有库存（或允许超卖）
