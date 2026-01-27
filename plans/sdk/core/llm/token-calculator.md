# token-calculator.ts - Token计算器逻辑设计

## 需求分析

Token计算器需要提供以下核心能力：
1. 从API响应解析Token统计
2. 使用tiktoken库进行本地计算
3. 提供估算方法作为回退方案
4. 支持消息级别的Token计算

参考application/infrastructure/llm/token-calculators的设计。

## 核心职责

1. API响应Token解析
2. 本地Token计算
3. Token估算
4. Token使用统计

## 主要方法逻辑

### 1. parseApiResponseTokens方法 - 从API响应解析Token

从LLM API响应中解析Token使用信息。

执行步骤：

步骤1：检查响应格式
- 检查响应是否包含usage字段
- 检查usage是否包含prompt_tokens、completion_tokens、total_tokens

步骤2：提取Token信息
- 提取prompt_tokens
- 提取completion_tokens
- 提取total_tokens
- 提取reasoning_tokens（如果存在）

步骤3：构建Token使用对象
- 创建TokenUsage对象
- 设置promptTokens
- 设置completionTokens
- 设置totalTokens
- 设置reasoningTokens（如果存在）
- 保存原始响应的详细信息

步骤4：返回Token使用对象
- 返回TokenUsage对象

### 2. calculateTokensFromMessages方法 - 从消息计算Token

使用tiktoken库从消息计算Token数量。

执行步骤：

步骤1：初始化tiktoken编码器
- 尝试导入tiktoken库
- 使用cl100k_base编码器

步骤2：计算消息Token
- 遍历所有消息
- 对每条消息：
  - 添加消息开销（3个token）
  - 计算消息内容的token
  - 如果有名称，添加名称的token

步骤3：添加回复token
- 添加3个token用于回复

步骤4：返回总Token数量
- 返回计算出的Token数量

### 3. estimateTokensFromString方法 - 从字符串估算Token

使用tiktoken库或估算方法从字符串计算Token数量。

执行步骤：

步骤1：使用tiktoken库（如果可用）
- 尝试导入tiktoken库
- 如果可用，使用cl100k_base编码器
- 对字符串进行编码
- 返回编码后的token数量

步骤2：使用备用估算方法
- 如果tiktoken不可用：
  - 计算字符串的字符数
  - 使用公式：token数量 = 字符数 / 2.5
  - 返回估算的token数量

步骤3：返回Token数量
- 返回计算出的Token数量

### 4. estimateTokensFromMessages方法 - 从消息估算Token

使用tiktoken库或估算方法从消息计算Token数量。

执行步骤：

步骤1：初始化Token计数器
- 设置totalTokens为0

步骤2：遍历所有消息
- 对每条消息：
  - 调用estimateMessageTokens方法
  - 传入消息内容
  - 将返回的Token数量加到totalTokens

步骤3：添加消息元数据开销
- 每条消息大约4个Token的开销
- totalTokens += 消息数量 * 4

步骤4：返回总Token数量
- 返回totalTokens

### 5. estimateMessageTokens方法 - 估算单条消息的Token数量

估算单条消息的Token数量。

执行步骤：

步骤1：检查消息内容类型
- 如果是字符串：
  - 调用estimateTokensFromString方法
- 如果是数组：
  - 遍历数组中的每个元素
  - 对每个元素调用estimateMessageTokens方法
  - 累加Token数量

步骤2：返回Token数量
- 返回计算出的Token数量

### 6. extractMessageContent方法 - 提取消息内容

从消息对象中提取文本内容。

执行步骤：

步骤1：检查内容类型
- 如果content是字符串，直接返回
- 如果content是数组，提取文本部分

步骤2：处理数组内容
- 遍历数组中的每个元素
- 如果元素是字符串，添加到结果
- 如果元素是对象且有text属性，提取text属性

步骤3：返回提取的内容
- 返回提取的文本内容

### 7. calculateCost方法 - 计算Token使用成本

根据Token使用情况计算成本。

执行步骤：

步骤1：获取模型定价
- 根据模型名称获取定价信息
- 定价信息包含prompt和completion的价格

步骤2：计算成本
- prompt成本 = promptTokens * prompt价格
- completion成本 = completionTokens * completion价格
- 总成本 = prompt成本 + completion成本

步骤3：返回成本
- 返回计算出的成本

### 8. getStats方法 - 获取统计信息

获取Token计算的统计信息。

执行步骤：

步骤1：返回统计对象
- 返回包含计算次数、成功次数、失败次数等统计信息

步骤2：返回最后一次使用情况
- 返回最后一次API响应的Token使用情况

## 错误处理

1. API响应解析失败：返回null，记录错误
2. tiktoken加载失败：使用估算方法
3. Token计算失败：返回null，记录错误
4. 成本计算失败：返回null，记录错误

## 性能考虑

1. tiktoken编码器初始化后缓存，避免重复初始化
2. Token计算结果可以缓存，避免重复计算
3. 批量计算可以优化性能

## 扩展点

1. 自定义定价信息
2. 自定义统计信息
定价信息不要硬编码，完全从外部提供

## 使用场景

1. 在Conversation中使用：统计Token使用情况
2. 在LLM节点中使用：计算Token成本
3. 在应用层中使用：监控Token使用

## 注意事项

1. Token统计优先使用API响应，本地计算和估算作为回退方案
2. tiktoken库需要单独安装(默认作为依赖)
3. Token估算只是近似值，不是精确值