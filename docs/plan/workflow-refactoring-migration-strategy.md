# Workflow架构重构迁移策略

## 迁移概述

本文档详细描述了从当前架构到简化架构的迁移策略，包括具体的实施步骤、数据迁移方案和风险控制措施。

## 迁移目标

### 架构目标
- 移除Workflow中的状态管理逻辑
- 将Graph模块完全合并到Workflow模块
- 消除概念重叠，简化架构层次

### 业务目标
- 保持功能完整性
- 提升开发效率
- 降低维护成本
- 改善性能表现

## 迁移策略

### 总体策略
采用**渐进式迁移**策略，分三个阶段实施：
1. **准备阶段**：环境准备和依赖分析
2. **实施阶段**：代码重构和数据迁移
3. **验证阶段**：测试验证和性能优化

### 迁移原则
- **最小化风险**：每个阶段都可以独立回滚
- **功能优先**：确保业务功能不受影响
- **性能保障**：迁移过程中性能不降级
- **数据安全**：确保数据完整性和一致性

## 详细实施计划

### 阶段一：环境准备和依赖分析（第1-2天）

#### 1.1 代码库分析
- 识别所有依赖Workflow和Graph的模块
- 分析外部API接口
- 梳理数据流和调用关系

#### 1.2 测试环境准备
- 搭建独立的测试环境
- 准备测试数据集
- 建立性能基准测试

#### 1.3 依赖关系梳理
创建依赖关系图，识别：
- 直接依赖Workflow的模块
- 直接依赖Graph的模块
- 间接依赖的模块
- 外部系统接口

### 阶段二：移除Workflow状态管理（第3-5天）

#### 2.1 Workflow实体重构
**操作内容**：
- 移除执行状态相关属性
- 移除执行统计相关方法
- 简化状态枚举

**影响范围**：
- src/domain/workflow/entities/workflow.ts
- src/domain/workflow/value-objects/workflow-status.ts
- 相关测试文件

**风险评估**：
- **低风险**：主要是移除代码，不影响核心功能
- **缓解措施**：保留原有测试用例，确保基础功能正常

#### 2.2 领域服务重构
**操作内容**：
- 移除WorkflowDomainService中的执行相关方法
- 创建独立的ExecutionStatsService
- 更新服务依赖关系

**影响范围**：
- src/domain/workflow/services/workflow-domain-service.ts
- 新建src/domain/execution/services/execution-stats-service.ts
- 相关依赖注入配置

**风险评估**：
- **中风险**：可能影响统计功能
- **缓解措施**：创建兼容层，确保统计功能正常

#### 2.3 数据库模型调整
**操作内容**：
- 从workflow表中移除执行统计字段
- 创建独立的execution_stats表
- 编写数据迁移脚本

**影响范围**：
- src/infrastructure/database/models/workflow.model.ts
- 新建src/infrastructure/database/models/execution-stats.model.ts
- 数据库迁移脚本

**风险评估**：
- **中风险**：数据迁移可能导致数据丢失
- **缓解措施**：完整备份，分步迁移，验证数据完整性

### 阶段三：Graph合并到Workflow（第6-10天）

#### 3.1 Workflow实体扩展
**操作内容**：
- 将Graph属性合并到Workflow实体
- 迁移Graph方法到Workflow实体
- 更新创建和修改方法

**影响范围**：
- src/domain/workflow/entities/workflow.ts
- src/domain/workflow/graph/entities/graph.ts（将被移除）
- 相关测试文件

**风险评估**：
- **高风险**：核心实体变更，影响范围广
- **缓解措施**：渐进式迁移，保持接口兼容性

#### 3.2 数据库模型重构
**操作内容**：
- 修改workflow表结构，添加nodes和edges字段
- 迁移graph表数据到workflow表
- 移除graph表和相关外键约束

**影响范围**：
- src/infrastructure/database/models/workflow.model.ts
- src/infrastructure/database/models/graph.model.ts（将被移除）
- 数据库迁移脚本

**风险评估**：
- **高风险**：数据库结构变更，可能导致数据丢失
- **缓解措施**：完整备份，分步迁移，数据验证

#### 3.3 执行引擎重构
**操作内容**：
- 重命名GraphExecutor为WorkflowExecutor
- 更新ExecutionContext，移除Graph依赖
- 修改执行策略和节点执行器

**影响范围**：
- src/infrastructure/workflow/engine/
- src/infrastructure/workflow/strategies/
- src/infrastructure/workflow/nodes/

**风险评估**：
- **中风险**：执行逻辑变更，可能影响执行结果
- **缓解措施**：详细测试，对比执行结果

#### 3.4 仓储和服务合并
**操作内容**：
- 合并WorkflowRepository和GraphRepository
- 更新WorkflowDomainService，集成图操作
- 移除Graph相关服务

**影响范围**：
- src/infrastructure/database/repositories/
- src/domain/workflow/services/
- 依赖注入配置

**风险评估**：
- **中风险**：仓储变更可能影响数据访问
- **缓解措施**：保持接口兼容性，渐进式替换

### 阶段四：验证和优化（第11-14天）

#### 4.1 功能测试
**测试内容**：
- 工作流创建和编辑功能
- 节点和边操作功能
- 工作流执行功能
- 统计查询功能

**验收标准**：
- 所有原有功能正常工作
- 新架构下功能表现一致
- 无功能回归

#### 4.2 性能测试
**测试内容**：
- 工作流加载性能
- 执行引擎性能
- 数据库查询性能
- 内存使用情况

**验收标准**：
- 性能不低于重构前水平
- 关键指标有所提升
- 资源使用合理

#### 4.3 集成测试
**测试内容**：
- 与外部系统集成
- API接口兼容性
- 数据一致性
- 错误处理

**验收标准**：
- 外部集成正常
- API接口向后兼容
- 数据完整一致

## 数据迁移方案

### 迁移前准备
1. **完整备份**：备份所有相关数据
2. **环境隔离**：在独立环境中进行迁移
3. **工具准备**：准备数据迁移和验证工具

### 迁移步骤

#### 步骤1：执行统计数据迁移
```sql
-- 创建新的执行统计表
CREATE TABLE execution_stats (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL,
    execution_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    average_execution_time DECIMAL(10,2),
    last_executed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);

-- 迁移数据
INSERT INTO execution_stats (
    id, workflow_id, execution_count, success_count, 
    failure_count, average_execution_time, last_executed_at,
    created_at, updated_at
)
SELECT 
    gen_random_uuid(),
    id,
    execution_count,
    success_count,
    failure_count,
    average_execution_time,
    last_executed_at,
    created_at,
    updated_at
FROM workflows
WHERE execution_count > 0;
```

#### 步骤2：Graph数据迁移到Workflow
```sql
-- 添加nodes和edges字段到workflow表
ALTER TABLE workflows 
ADD COLUMN nodes JSONB,
ADD COLUMN edges JSONB,
ADD COLUMN definition JSONB,
ADD COLUMN layout JSONB;

-- 迁移Graph数据到Workflow
UPDATE workflows w
SET 
    nodes = g.nodes,
    edges = g.edges,
    definition = g.definition,
    layout = g.layout
FROM graphs g
WHERE w.graph_id = g.id;
```

#### 步骤3：清理旧数据
```sql
-- 移除workflow表中的执行统计字段
ALTER TABLE workflows 
DROP COLUMN execution_count,
DROP COLUMN success_count,
DROP COLUMN failure_count,
DROP COLUMN average_execution_time,
DROP COLUMN last_executed_at,
DROP COLUMN graph_id;

-- 删除graph表
DROP TABLE graphs;
```

### 数据验证
1. **完整性验证**：确保所有数据都已正确迁移
2. **一致性验证**：验证数据关系和约束
3. **性能验证**：测试查询性能是否满足要求

## 风险控制措施

### 技术风险

#### 风险1：数据丢失
**概率**：中等
**影响**：高
**缓解措施**：
- 完整数据备份
- 分步迁移验证
- 回滚方案准备

#### 风险2：功能回归
**概率**：中等
**影响**：高
**缓解措施**：
- 完整测试覆盖
- 自动化测试
- 分阶段验证

#### 风险3：性能下降
**概率**：低
**影响**：中等
**缓解措施**：
- 性能基准测试
- 持续监控
- 优化预案

### 业务风险

#### 风险1：服务中断
**概率**：低
**影响**：高
**缓解措施**：
- 蓝绿部署
- 快速回滚
- 监控告警

#### 风险2：用户体验影响
**概率**：低
**影响**：中等
**缓解措施**：
- 向后兼容
- 渐进式发布
- 用户通知

## 回滚计划

### 回滚触发条件
1. 关键功能异常
2. 性能严重下降
3. 数据一致性问题
4. 安全漏洞

### 回滚步骤
1. **停止服务**：立即停止相关服务
2. **数据回滚**：恢复到迁移前状态
3. **代码回滚**：切换到迁移前版本
4. **验证恢复**：确保系统正常
5. **问题分析**：分析失败原因

### 回滚时间目标
- **检测时间**：5分钟内
- **决策时间**：10分钟内
- **回滚时间**：30分钟内
- **总时间**：45分钟内

## 监控和告警

### 关键指标
1. **功能指标**：成功率、错误率
2. **性能指标**：响应时间、吞吐量
3. **资源指标**：CPU、内存、磁盘
4. **业务指标**：用户活跃度、任务完成率

### 告警规则
1. **错误率超过5%**：立即告警
2. **响应时间超过基准2倍**：警告
3. **资源使用超过80%**：警告
4. **关键功能异常**：严重告警

## 成功标准

### 技术标准
1. 所有功能正常工作
2. 性能不低于重构前
3. 代码复杂度降低20%
4. 测试覆盖率保持90%以上

### 业务标准
1. 用户体验无影响
2. 业务流程正常运行
3. 数据完整准确
4. 系统稳定可靠

## 后续优化

### 短期优化（1-2周）
1. 性能调优
2. 监控完善
3. 文档更新
4. 培训准备

### 中期优化（1-2月）
1. API简化
2. 功能增强
3. 用户体验优化
4. 开发工具改进

### 长期优化（3-6月）
1. 架构进一步演进
2. 新功能开发
3. 生态建设
4. 最佳实践总结

---

*本迁移策略确保了架构重构的安全性和可控性，通过详细的计划和风险控制措施，最大化降低迁移风险，确保项目成功。*