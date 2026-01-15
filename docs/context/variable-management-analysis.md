# 变量管理逻辑独立化分析

## 1. 当前变量处理现状

### 1.1 变量类型

根据重构后的上下文结构，系统中有以下变量类型：

1. **全局执行变量** (`ExecutionContext.variables`)
   - 作用域：整个线程执行过程
   - 生命周期：随线程创建而创建，随线程销毁而销毁
   - 用途：存储全局共享的执行数据

2. **节点局部变量** (`NodeContext.localVariables`)
   - 作用域：单个节点执行过程
   - 生命周期：随节点执行创建，节点执行结束后保留
   - 用途：存储节点内部的临时数据

3. **节点执行结果** (`ExecutionContext.nodeResults`)
   - 作用域：整个线程执行过程
   - 生命周期：节点执行完成后存储
   - 用途：存储节点的输出结果，供其他节点使用

### 1.2 变量查找顺序

根据文档 `context-structure-analysis.md` 第4.2节：

```
1. 节点局部变量（NodeContext.localVariables）
2. 全局执行变量（ExecutionContext.variables）
3. 提示词变量（从ExecutionContext.variables获取）
```

### 1.3 变量写入规则

根据文档 `context-structure-analysis.md` 第4.3节：

```
1. 节点局部变量：写入NodeContext.localVariables
2. 节点执行结果：写入ExecutionContext.nodeResults
3. 全局变量：写入ExecutionContext.variables
```

## 2. 当前变量处理逻辑分布

### 2.1 ExecutionContext中的变量方法

```typescript
// 获取变量
public get variables(): Map<string, unknown>
public getVariable(key: string): unknown | undefined
public hasVariable(key: string): boolean

// 设置变量
public setVariable(key: string, value: unknown): ExecutionContext
public setVariables(variables: Map<string, unknown>): ExecutionContext
public deleteVariable(key: string): ExecutionContext

// 验证变量
public validateVariable(key: string): { valid: boolean; error?: string }
```

### 2.2 NodeContext中的变量

```typescript
interface NodeContext {
  readonly localVariables: Map<string, unknown>;
  // 没有独立的变量方法，依赖外部访问
}
```

### 2.3 变量序列化逻辑

在 `thread-repository.ts` 中：

```typescript
// 序列化
variables: Object.fromEntries(entity.executionContext.variables)
nodeResults: Object.fromEntries(entity.executionContext.nodeResults)
localVariables: Object.fromEntries(context.localVariables)

// 反序列化
const contextVariables = new Map(Object.entries(...))
```

### 2.4 变量查找逻辑

目前没有统一的变量查找逻辑，需要手动实现：

```typescript
// 需要在多个地方重复实现
function getVariable(key: string, nodeContext: NodeContext, executionContext: ExecutionContext) {
  // 1. 查找节点局部变量
  if (nodeContext.localVariables.has(key)) {
    return nodeContext.localVariables.get(key);
  }
  // 2. 查找全局变量
  return executionContext.getVariable(key);
}
```

## 3. 问题分析

### 3.1 职责分散

- 变量查找逻辑分散在多个地方
- 变量验证逻辑只在ExecutionContext中
- 变量序列化逻辑在repository中
- 没有统一的变量作用域管理

### 3.2 代码重复

- 变量查找逻辑需要在多个地方重复实现
- 变量设置逻辑需要手动选择作用域
- 变量验证逻辑无法复用

### 3.3 可维护性差

- 添加新的变量作用域需要修改多处代码
- 变量查找顺序变更需要修改所有查找逻辑
- 变量验证规则变更需要修改多处

### 3.4 可测试性差

- 变量逻辑与上下文耦合，难以单独测试
- 变量查找逻辑分散，难以全面测试

## 4. 独立化方案设计

### 4.1 VariableScope枚举

```typescript
enum VariableScope {
  LOCAL = 'local',           // 节点局部变量
  GLOBAL = 'global',         // 全局执行变量
  NODE_RESULT = 'node_result' // 节点执行结果
}
```

### 4.2 VariableManager值对象

```typescript
interface VariableManagerProps {
  readonly globalVariables: Map<string, unknown>;
  readonly nodeResults: Map<string, unknown>;
  readonly localVariables: Map<string, unknown>;
}

export class VariableManager extends ValueObject<VariableManagerProps> {
  /**
   * 获取变量（按作用域顺序查找）
   */
  public getVariable(key: string): unknown | undefined {
    // 1. 查找节点局部变量
    if (this.props.localVariables.has(key)) {
      return this.props.localVariables.get(key);
    }
    // 2. 查找全局变量
    if (this.props.globalVariables.has(key)) {
      return this.props.globalVariables.get(key);
    }
    // 3. 查找节点执行结果
    return this.props.nodeResults.get(key);
  }

  /**
   * 设置变量（指定作用域）
   */
  public setVariable(
    key: string,
    value: unknown,
    scope: VariableScope
  ): VariableManager {
    switch (scope) {
      case VariableScope.LOCAL:
        return this.setLocalVariable(key, value);
      case VariableScope.GLOBAL:
        return this.setGlobalVariable(key, value);
      case VariableScope.NODE_RESULT:
        return this.setNodeResult(key, value);
    }
  }

  /**
   * 验证变量名
   */
  public validateVariableName(key: string): { valid: boolean; error?: string } {
    if (!key || key.trim().length === 0) {
      return { valid: false, error: '变量名不能为空' };
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      return { valid: false, error: '变量名格式不正确' };
    }
    return { valid: true };
  }

  /**
   * 获取所有变量（按作用域分组）
   */
  public getAllVariables(): {
    local: Map<string, unknown>;
    global: Map<string, unknown>;
    nodeResults: Map<string, unknown>;
  } {
    return {
      local: new Map(this.props.localVariables),
      global: new Map(this.props.globalVariables),
      nodeResults: new Map(this.props.nodeResults),
    };
  }
}
```

### 4.3 ExecutionContext集成

```typescript
export class ExecutionContext extends ValueObject<ExecutionContextProps> {
  private variableManager: VariableManager;

  constructor(props: ExecutionContextProps) {
    super(props);
    this.variableManager = VariableManager.create({
      globalVariables: props.variables,
      nodeResults: props.nodeResults,
      localVariables: new Map(), // 默认为空，由外部设置
    });
  }

  /**
   * 获取变量（使用VariableManager）
   */
  public getVariable(key: string, nodeId?: NodeId): unknown | undefined {
    if (nodeId) {
      // 如果指定了节点ID，先查找该节点的局部变量
      const nodeContext = this.props.nodeContexts.get(nodeId.toString());
      if (nodeContext) {
        const value = nodeContext.localVariables.get(key);
        if (value !== undefined) {
          return value;
        }
      }
    }
    return this.variableManager.getVariable(key);
  }

  /**
   * 设置变量（使用VariableManager）
   */
  public setVariable(
    key: string,
    value: unknown,
    scope: VariableScope = VariableScope.GLOBAL
  ): ExecutionContext {
    const newManager = this.variableManager.setVariable(key, value, scope);
    return new ExecutionContext({
      ...this.props,
      variables: newManager.globalVariables,
      nodeResults: newManager.nodeResults,
    });
  }
}
```

## 5. 优缺点分析

### 5.1 优点

1. **职责单一**
   - 变量管理逻辑集中在VariableManager中
   - ExecutionContext专注于执行上下文管理
   - NodeContext专注于节点上下文管理

2. **可复用**
   - 变量查找逻辑可以在多个地方复用
   - 变量验证逻辑统一管理
   - 变量序列化逻辑可以基于VariableManager实现

3. **可测试**
   - VariableManager可以独立测试
   - 变量查找逻辑可以单独测试
   - 变量验证规则可以单独测试

4. **可扩展**
   - 添加新的变量作用域只需修改VariableManager
   - 修改变量查找顺序只需修改VariableManager
   - 添加新的变量验证规则只需修改VariableManager

5. **类型安全**
   - 使用枚举明确变量作用域
   - 避免字符串硬编码
   - 编译时检查

### 5.2 缺点

1. **增加复杂度**
   - 需要额外的类和接口
   - 增加代码量
   - 增加理解成本

2. **性能开销**
   - 多一层抽象可能有轻微性能影响
   - 需要创建额外的对象

3. **过度设计风险**
   - 如果变量逻辑简单，可能不需要独立
   - 可能增加不必要的抽象

## 6. 实施建议

### 6.1 推荐方案

**建议独立出VariableManager**，理由如下：

1. **变量查找逻辑复杂**
   - 需要按作用域顺序查找
   - 需要处理多个作用域
   - 需要处理变量冲突

2. **变量验证逻辑需要复用**
   - 变量名格式验证
   - 变量作用域验证
   - 变量类型验证

3. **变量序列化逻辑需要统一**
   - 序列化到数据库
   - 从数据库反序列化
   - 序列化到快照

4. **未来扩展需求**
   - 可能添加新的变量作用域
   - 可能添加变量类型检查
   - 可能添加变量访问控制

### 6.2 实施步骤

1. **创建VariableScope枚举**
   - 定义变量作用域类型
   - 提供类型安全

2. **创建VariableManager值对象**
   - 实现变量查找逻辑
   - 实现变量设置逻辑
   - 实现变量验证逻辑
   - 实现变量序列化逻辑

3. **重构ExecutionContext**
   - 集成VariableManager
   - 简化变量方法
   - 保持向后兼容

4. **重构NodeContext**
   - 使用VariableManager管理局部变量
   - 简化变量访问

5. **更新Repository**
   - 使用VariableManager进行序列化
   - 使用VariableManager进行反序列化

6. **更新测试**
   - 添加VariableManager测试
   - 更新ExecutionContext测试
   - 更新NodeContext测试

### 6.3 实施优先级

**高优先级**：
1. 创建VariableScope枚举
2. 创建VariableManager值对象
3. 重构ExecutionContext集成VariableManager

**中优先级**：
4. 更新Repository序列化逻辑
5. 更新测试

**低优先级**：
6. 添加变量访问控制
7. 添加变量类型检查
8. 添加变量变更监听

## 7. 总结

### 7.1 核心结论

**建议独立出VariableManager**，原因如下：

1. **变量管理逻辑复杂**：涉及多个作用域、查找顺序、验证规则
2. **代码重复严重**：变量查找逻辑在多处重复
3. **可维护性差**：修改变量逻辑需要修改多处代码
4. **可测试性差**：变量逻辑与上下文耦合
5. **未来扩展需求**：可能添加新的变量作用域和功能

### 7.2 预期效果

1. **更好的可维护性**：变量管理逻辑集中，易于理解和维护
2. **更好的可复用性**：变量查找、验证、序列化逻辑可以复用
3. **更好的可测试性**：VariableManager可以独立测试
4. **更好的可扩展性**：添加新的变量作用域和功能更容易
5. **更好的类型安全**：使用枚举明确变量作用域

### 7.3 风险评估

1. **实施风险**：中等，需要重构现有代码
2. **性能风险**：低，性能影响可以忽略
3. **维护风险**：低，独立后更易维护
4. **兼容性风险**：低，可以保持向后兼容

### 7.4 最终建议

**推荐实施VariableManager独立化**，理由是收益大于成本，能够显著提升代码质量和可维护性。