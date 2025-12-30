# Prompts模块架构分析报告

## 1. 当前架构分析

### 1.1 领域层 (src/domain/prompts/)

**实体和值对象**:
- `entities/prompt.ts` - Prompt实体，包含完整的业务逻辑
  - 创建、激活、禁用、弃用等业务方法
  - 内容更新、元数据更新等操作
  - 完整的验证规则
- `value-objects/` - PromptId, PromptType, PromptStatus等值对象

**问题**:
- ❌ **缺少PromptRepository接口定义**
- ❌ 与其他模块（如WorkflowRepository）的架构模式不一致

### 1.2 基础设施层 (src/infrastructure/persistence/repositories/)

**PromptRepository实现**:
- 直接实现了具体类，而不是实现领域层的接口
- 基于ConfigLoadingModule加载提示词配置
- 提供查询功能：findById, findByCategory, listAll, search, exists
- save和delete操作抛出异常（配置只读）

**问题**:
- ❌ 没有实现领域层接口（因为接口不存在）
- ❌ 技术细节（ConfigLoadingModule）直接暴露

### 1.3 应用层 (src/application/prompts/)

**PromptService**:
- 提供基本的查询功能：
  - `getPrompt(id)` - 获取单个提示词
  - `getPromptsByCategory(category)` - 按类别获取
  - `listPrompts(category?)` - 列出所有提示词
  - `searchPrompts(criteria)` - 搜索提示词
  - `loadPromptContent(category, name)` - 加载提示词内容
  - `promptExists(category, name)` - 检查提示词是否存在
- 直接依赖基础设施层的PromptRepository具体类

**问题**:
- ❌ 违反依赖倒置原则：直接依赖基础设施层的具体类
- ❌ 只是简单转发调用，没有提供额外的业务逻辑
- ❌ 职责不清晰，与PromptRepository功能重复

## 2. 架构问题总结

### 2.1 违反分层架构原则

| 问题 | 描述 | 影响 |
|------|------|------|
| 缺少领域层接口 | PromptRepository没有在领域层定义接口 | 无法实现依赖倒置 |
| 直接依赖具体类 | 应用层直接依赖基础设施层的PromptRepository | 违反依赖倒置原则 |
| 职责重复 | PromptService和PromptRepository功能高度重复 | 代码冗余，维护困难 |

### 2.2 与其他模块不一致

对比Workflow模块的架构：

| 模块 | 领域层接口 | 基础设施层实现 | 应用层服务 |
|------|-----------|---------------|-----------|
| Workflow | ✅ WorkflowRepository接口 | ✅ 实现接口 | ✅ 业务编排 |
| Prompts | ❌ 无接口 | ❌ 直接实现类 | ❌ 简单转发 |

### 2.3 职责不清

**PromptService的问题**:
- `getPrompt` → 直接调用 `promptRepository.findById`
- `getPromptsByCategory` → 直接调用 `promptRepository.findByCategory`
- `listPrompts` → 直接调用 `promptRepository.listAll`
- `searchPrompts` → 直接调用 `promptRepository.search`
- `loadPromptContent` → 调用 `getPromptsByCategory` 后查找
- `promptExists` → 调用 `getPromptsByCategory` 后检查

**结论**: PromptService几乎没有提供任何业务价值，只是简单的转发层。

## 3. 重构方案

### 3.1 方案A：最小改动方案

**改动内容**:
1. 在领域层创建PromptRepository接口
2. 修改基础设施层的PromptRepository实现该接口
3. 修改应用层的PromptService依赖接口而非具体类

**优点**:
- 改动最小
- 符合依赖倒置原则

**缺点**:
- PromptService仍然职责不清
- 没有解决代码冗余问题

### 3.2 方案B：彻底重构方案（推荐）

**改动内容**:
1. **领域层**:
   - 创建 `PromptRepository` 接口
   - 定义业务导向的查询方法

2. **基础设施层**:
   - 修改 `PromptRepository` 实现类实现领域层接口
   - 保持基于ConfigLoadingModule的实现

3. **应用层**:
   - **删除** `PromptService`（职责不清，无业务价值）
   - 直接在需要的地方使用 `PromptRepository`

**优点**:
- ✅ 符合依赖倒置原则
- ✅ 消除代码冗余
- ✅ 职责清晰
- ✅ 与其他模块架构一致
- ✅ 简化代码结构

**缺点**:
- 需要更新所有使用PromptService的地方

### 3.3 方案C：保留PromptService但增强职责

**改动内容**:
1. 在领域层创建PromptRepository接口
2. 修改基础设施层的PromptRepository实现该接口
3. 增强PromptService的业务逻辑：
   - 添加提示词模板渲染功能
   - 添加提示词变量替换功能
   - 添加提示词版本管理功能
   - 添加提示词缓存功能

**优点**:
- 保留应用层服务
- 增加业务价值

**缺点**:
- 需要明确业务需求
- 可能过度设计

## 4. 推荐方案：方案B

### 4.1 推荐理由

1. **符合DDD原则**: Prompt是领域实体，PromptRepository是仓储接口，应该在领域层定义
2. **消除冗余**: PromptService只是简单转发，没有业务价值
3. **架构一致**: 与Workflow等其他模块保持一致的架构模式
4. **简化维护**: 减少一层抽象，代码更清晰

### 4.2 重构步骤

#### 步骤1: 创建领域层PromptRepository接口
```typescript
// src/domain/prompts/repositories/prompt-repository.ts
export interface PromptRepository extends Repository<Prompt, PromptId> {
  findByCategory(category: string): Promise<Prompt[]>;
  listAll(): Promise<Prompt[]>;
  search(criteria: PromptSearchCriteria): Promise<Prompt[]>;
  exists(id: PromptId): Promise<boolean>;
}
```

#### 步骤2: 修改基础设施层PromptRepository
- 实现领域层接口
- 保持现有实现逻辑

#### 步骤3: 删除应用层PromptService
- 删除 `src/application/prompts/services/prompt-service.ts`
- 更新 `src/application/prompts/index.ts`

#### 步骤4: 更新依赖注入配置
- 绑定PromptRepository接口到实现类

#### 步骤5: 更新所有使用PromptService的地方
- 直接使用PromptRepository

### 4.3 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 破坏现有功能 | 高 | 全面测试，确保所有功能正常 |
| 需要更新多处代码 | 中 | 逐步替换，确保每一步都通过测试 |
| 缺少业务逻辑 | 低 | 如需业务逻辑，可在后续添加 |

## 5. 架构对比

### 5.1 重构前

```
应用层
  └── PromptService (简单转发)
       └── PromptRepository (基础设施层具体类)
            └── ConfigLoadingModule

领域层
  └── Prompt实体
  └── PromptId, PromptType, PromptStatus
  └── ❌ 无PromptRepository接口
```

### 5.2 重构后

```
应用层
  └── ❌ 无PromptService（直接使用PromptRepository）

领域层
  └── Prompt实体
  └── PromptId, PromptType, PromptStatus
  └── ✅ PromptRepository接口

基础设施层
  └── PromptRepository实现
       └── ConfigLoadingModule
```

## 6. 下一步行动

1. ✅ 创建领域层PromptRepository接口
2. ✅ 修改基础设施层PromptRepository实现接口
3. ✅ 删除应用层PromptService
4. ✅ 更新依赖注入配置
5. ✅ 更新所有使用PromptService的地方
6. ✅ 运行类型检查和测试

## 7. 总结

Prompts模块当前存在以下主要问题：
1. 缺少领域层PromptRepository接口
2. 应用层直接依赖基础设施层具体类
3. PromptService职责不清，只是简单转发

推荐采用方案B进行彻底重构，消除冗余，使架构与其他模块保持一致。重构后将：
- 符合依赖倒置原则
- 消除代码冗余
- 职责清晰
- 架构一致
- 简化维护