# Sessions模块DDD重构指南

## 概述

本文档总结了sessions模块的领域驱动设计（DDD）重构过程，为后续重构其他模块提供参考和最佳实践。

## 重构背景

### 原始问题
- **聚合边界不清**：Session、SessionDefinition、SessionActivity三个实体职责重叠
- **仓储过多**：违反"一个聚合一个仓储"的DDD原则
- **职责混乱**：领域层包含应用层逻辑（统计、报告）
- **技术细节泄露**：仓储接口包含分页、过滤等技术细节

### 重构目标
- 建立清晰的聚合边界
- 遵循DDD核心原则
- 分离关注点
- 提高代码可维护性

## 重构原则

### 1. 单一聚合根原则
每个聚合应该只有一个聚合根，其他实体或值对象通过聚合根访问。

### 2. 值对象不可变性
值对象应该是不可变的，通过创建新实例来修改状态。

### 3. 仓储接口业务导向
仓储接口应该使用业务语言而不是技术术语，表达业务意图。

### 4. 领域服务专注核心逻辑
领域服务只包含跨聚合的业务逻辑，不包含应用服务逻辑。

### 5. 清晰的层次边界
- **领域层**：纯业务逻辑和规则
- **应用层**：业务流程编排和协调
- **基础设施层**：技术实现细节

## 重构步骤

### 步骤1：识别聚合根
**分析**：
- Session是核心业务概念，代表用户会话
- SessionDefinition和SessionActivity与Session紧密相关
- Session包含完整的生命周期管理

**决策**：
- 将Session作为唯一的聚合根
- 合并SessionDefinition的功能到Session
- 将SessionActivity转换为值对象

### 步骤2：重构值对象
**原始实现问题**：
```typescript
// SessionActivity作为实体，包含业务逻辑
export class SessionActivity extends Entity {
  // 包含统计逻辑（应用层职责）
  getSuccessRate(): number {
    const totalExecutions = this.props.successCount + this.props.failureCount;
    return totalExecutions > 0 ? this.props.successCount / totalExecutions : 0;
  }
}
```

**重构后**：
```typescript
// SessionActivity作为值对象，只包含数据
export class SessionActivity extends ValueObject<SessionActivityProps> {
  // 只包含数据访问方法
  public getMessageCount(): number {
    return this.props.messageCount;
  }
  
  // 通过创建新实例修改状态
  public incrementMessageCount(): SessionActivity {
    return new SessionActivity({
      ...this.props,
      messageCount: this.props.messageCount + 1,
      lastActivityAt: Timestamp.now()
    });
  }
}
```

### 步骤3：简化仓储接口
**原始接口问题**：
```typescript
export interface SessionRepository extends Repository<Session, ID> {
  // 技术细节泄露
  findWithPagination(options: SessionQueryOptions): Promise<PaginatedResult<Session>>;
  
  // 过于技术化
  batchUpdateStatus(sessionIds: ID[], status: SessionStatus): Promise<number>;
}
```

**重构后接口**：
```typescript
export interface SessionRepository extends Repository<Session, ID> {
  // 业务导向的方法
  findActiveSessionsForUser(userId: ID): Promise<Session[]>;
  findSessionsNeedingCleanup(): Promise<Session[]>;
  findSessionsWithHighActivity(minMessageCount: number): Promise<Session[]>;
  
  // 批量操作使用业务语言
  batchUpdateSessionStatus(sessionIds: ID[], status: SessionStatus): Promise<number>;
}
```

### 步骤4：重构领域服务
**移除应用层逻辑**：
- 统计和报告逻辑移到应用层
- 复杂的查询逻辑移到应用层
- 工作流编排移到应用层

**保留核心业务逻辑**：
```typescript
export class SessionDomainService {
  // 验证业务规则
  async validateSessionCreation(userId?: ID, config?: SessionConfig): Promise<void>;
  
  // 处理跨聚合逻辑
  async handleSessionTimeout(session: Session, changedBy?: ID): Promise<Session>;
  
  // 计算业务指标
  calculateSessionTimeout(session: Session): Timestamp;
}
```

## 重构后的架构

### 领域层结构
```
src/domain/sessions/
├── entities/
│   └── session.ts              # 唯一聚合根
├── value-objects/
│   ├── session-id.ts
│   ├── session-status.ts
│   ├── session-config.ts
│   └── session-activity.ts     # 值对象
├── repositories/
│   └── session-repository.ts   # 业务导向接口
├── services/
│   └── session-domain-service.ts
└── events/
    ├── session-created-event.ts
    └── session-status-changed-event.ts
```

### 应用层结构
```
src/application/sessions/
├── interfaces/
│   ├── session-orchestration-service.interface.ts
│   └── session-resource-service.interface.ts
├── services/
│   ├── session-orchestration-service.ts
│   ├── session-resource-service.ts
│   ├── session-lifecycle-service.ts
│   ├── session-maintenance-service.ts
│   └── session-management-service.ts
└── dtos/
```

## 关键模式

### 1. 聚合根模式
```typescript
export class Session extends Entity {
  private readonly props: SessionProps;
  
  // 包含所有相关业务逻辑
  public changeStatus(newStatus: SessionStatus): void {
    // 状态转换验证
    this.validateStatusTransition(this.props.status, newStatus);
    
    // 更新状态
    const newProps = {
      ...this.props,
      status: newStatus,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };
    
    (this as any).props = Object.freeze(newProps);
    this.update();
    
    // 发布领域事件
    this.addDomainEvent(new SessionStatusChangedEvent(
      this.props.id,
      this.props.status,
      newStatus
    ));
  }
}
```

### 2. 值对象模式
```typescript
export class SessionActivity extends ValueObject<SessionActivityProps> {
  // 不可变，通过工厂方法创建
  public static create(
    lastActivityAt?: Timestamp,
    messageCount: number = 0,
    threadCount: number = 0
  ): SessionActivity {
    return new SessionActivity({
      lastActivityAt: lastActivityAt || Timestamp.now(),
      messageCount,
      threadCount
    });
  }
  
  // 通过创建新实例修改状态
  public incrementMessageCount(): SessionActivity {
    return new SessionActivity({
      ...this.props,
      messageCount: this.props.messageCount + 1,
      lastActivityAt: Timestamp.now()
    });
  }
}
```

### 3. 领域服务模式
```typescript
export class SessionDomainService {
  // 处理跨聚合的业务逻辑
  async validateSessionCreation(userId?: ID, config?: SessionConfig): Promise<void> {
    if (userId) {
      const hasActiveSession = await this.sessionRepository.hasActiveSession(userId);
      if (hasActiveSession) {
        throw new DomainError('用户已有活跃会话，无法创建新会话');
      }
    }
    
    if (config) {
      config.validate();
    }
  }
  
  // 计算业务指标
  calculateSessionTimeout(session: Session): Timestamp {
    const timeoutMinutes = session.config.getTimeoutMinutes();
    return session.lastActivityAt.addHours(timeoutMinutes / 60);
  }
}
```

## 重构收益

### 1. 代码质量提升
- **更清晰的职责分离**
- **更好的可测试性**
- **更低的耦合度**

### 2. 符合DDD原则
- **单一聚合根**
- **值对象不可变**
- **仓储接口业务导向**
- **领域服务专注核心逻辑**

### 3. 可维护性增强
- **更容易理解业务规则**
- **更容易扩展功能**
- **更容易重构**

## 常见陷阱和解决方案

### 陷阱1：聚合边界不清
**问题**：多个实体都作为聚合根
**解决**：明确业务核心，选择最合适的实体作为聚合根

### 陷阱2：值对象包含业务逻辑
**问题**：值对象包含计算或验证逻辑
**解决**：将业务逻辑移到聚合根或领域服务

### 陷阱3：仓储接口技术化
**问题**：仓储接口包含分页、排序等技术细节
**解决**：使用业务语言，让应用层处理技术细节

### 陷阱4：领域服务职责过重
**问题**：领域服务包含应用层逻辑
**解决**：明确区分核心业务逻辑和应用流程编排

## 后续重构建议

### 1. 其他模块重构
- **threads模块**：参考sessions模块的聚合设计
- **workflow模块**：简化聚合边界，专注核心流程
- **llm模块**：分离领域逻辑和技术实现

### 2. 持续改进
- **引入更多领域事件**
- **完善值对象设计**
- **优化领域服务职责**

### 3. 测试策略
- **单元测试**：专注领域逻辑测试
- **集成测试**：验证聚合间交互
- **领域事件测试**：验证业务规则

## 总结

Sessions模块的DDD重构成功实现了：
- 清晰的聚合边界
- 符合DDD原则的设计
- 更好的代码组织结构
- 更高的可维护性

这个重构过程为其他模块的重构提供了宝贵的经验和参考模式。通过遵循相同的原则和模式，我们可以逐步改善整个系统的架构质量。