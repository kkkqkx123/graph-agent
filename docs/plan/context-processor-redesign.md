# 上下文处理器节点重新设计方案

## 问题分析

当前上下文处理器节点的设计存在根本性错误：
1. 将上下文处理器当作LLM调用节点，通过生成提示词让LLM处理上下文
2. 实际需求是直接操作消息数组，支持截断、插入等操作
3. 错误地归类为LLM托管节点，导致不必要的LLM调用

## 新配置结构设计

### 核心配置接口

```typescript
/**
 * 上下文处理器节点配置
 */
export interface ContextProcessorNodeConfig {
  /** 操作类型 */
  operation: 'truncate' | 'insert' | 'replace' | 'clear' | 'filter';
  
  /** 截断操作配置 */
  truncate?: {
    /** 保留前N条消息 */
    keepFirst?: number;
    /** 保留后N条消息 */  
    keepLast?: number;
    /** 删除前N条消息 */
    removeFirst?: number;
    /** 删除后N条消息 */
    removeLast?: number;
    /** 保留索引范围 [start, end) */
    range?: { start: number; end: number };
  };
  
  /** 插入操作配置 */
  insert?: {
    /** 插入位置（-1表示末尾，0表示开头） */
    position: number;
    /** 要插入的消息 */
    messages: LLMMessage[];
  };
  
  /** 替换操作配置 */
  replace?: {
    /** 要替换的消息索引 */
    index: number;
    /** 新的消息内容 */
    message: LLMMessage;
  };
  
  /** 过滤操作配置 */
  filter?: {
    /** 按角色过滤 */
    roles?: ('system' | 'user' | 'assistant' | 'tool')[];
    /** 按内容关键词过滤（包含指定关键词的消息） */
    contentContains?: string[];
    /** 按内容关键词排除（不包含指定关键词的消息） */
    contentExcludes?: string[];
  };
  
  /** 清空操作配置 */
  clear?: {
    /** 是否保留系统消息 */
    keepSystemMessage?: boolean;
  };
}
```

## 执行逻辑变更

### 1. 移除LLM托管标记
修改 `NodeExecutionCoordinator.isLLMManagedNode()` 方法，移除 `CONTEXT_PROCESSOR`：

```typescript
private isLLMManagedNode(nodeType: NodeType): boolean {
  return [
    NodeType.LLM,
    NodeType.TOOL, 
    NodeType.USER_INTERACTION
    // CONTEXT_PROCESSOR 不再是LLM托管节点
  ].includes(nodeType);
}
```

### 2. 创建专用处理器
实现 `contextProcessorHandler` 函数，直接操作 `ConversationManager`：

```typescript
export async function contextProcessorHandler(
  threadContext: ThreadContext, 
  node: Node
): Promise<NodeExecutionResult> {
  const config = node.config as ContextProcessorNodeConfig;
  const conversationManager = threadContext.getConversationManager();
  
  try {
    switch (config.operation) {
      case 'truncate':
        await handleTruncateOperation(conversationManager, config.truncate!);
        break;
      case 'insert':
        await handleInsertOperation(conversationManager, config.insert!);
        break;
      case 'replace':
        await handleReplaceOperation(conversationManager, config.replace!);
        break;
      case 'clear':
        await handleClearOperation(conversationManager, config.clear!);
        break;
      case 'filter':
        await handleFilterOperation(conversationManager, config.filter!);
        break;
      default:
        throw new Error(`Unsupported operation: ${config.operation}`);
    }
    
    return {
      status: 'COMPLETED',
      // ... 其他结果字段
    };
  } catch (error) {
    return {
      status: 'FAILED',
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
```

## 验证规则

### 配置验证函数
```typescript
export function validateContextProcessorNodeConfig(config: any): config is ContextProcessorNodeConfig {
  if (!config || typeof config !== 'object') {
    return false;
  }
  
  const validOperations = ['truncate', 'insert', 'replace', 'clear', 'filter'];
  if (!config.operation || !validOperations.includes(config.operation)) {
    return false;
  }
  
  // 验证必需的配置字段
  const requiredFieldMap: Record<string, string> = {
    'truncate': 'truncate',
    'insert': 'insert', 
    'replace': 'replace',
    'clear': 'clear',
    'filter': 'filter'
  };
  
  const requiredField = requiredFieldMap[config.operation];
  if (!config[requiredField]) {
    return false;
  }
  
  // 验证具体配置
  switch (config.operation) {
    case 'truncate':
      return validateTruncateConfig(config.truncate);
    case 'insert':
      return validateInsertConfig(config.insert);
    case 'replace':
      return validateReplaceConfig(config.replace);
    case 'clear':
      return validateClearConfig(config.clear);
    case 'filter':
      return validateFilterConfig(config.filter);
    default:
      return false;
  }
}
```

## 向后兼容性考虑

### 版本标识方案
```typescript
export interface ContextProcessorNodeConfig {
  /** 配置版本（可选，默认为1） */
  version?: number;
  // ... 其他字段
}
```

- `version: 1` - 旧格式（deprecated）
- `version: 2` - 新格式（推荐）

### 迁移策略
1. 在验证时检测旧格式配置
2. 自动转换或抛出警告
3. 提供配置迁移工具

## 测试用例设计

### 截断操作测试
- 保留前3条消息
- 删除最后2条消息  
- 保留索引范围[1, 4)

### 插入操作测试
- 在开头插入系统消息
- 在末尾追加用户消息
- 在中间位置插入多条消息

### 过滤操作测试
- 只保留user和assistant消息
- 排除包含特定关键词的消息

## 实施步骤

1. **更新类型定义** - 修改 `sdk/types/node.ts`
2. **更新验证函数** - 修改 `sdk/core/execution/handlers/node-handlers/config-utils.ts`  
3. **移除LLM托管标记** - 修改 `sdk/core/execution/coordinators/node-execution-coordinator.ts`
4. **实现处理器函数** - 创建 `sdk/core/execution/handlers/node-handlers/context-processor-handler.ts`
5. **添加单元测试** - 创建相应的测试文件
6. **文档更新** - 更新相关文档和示例