# 工作流合并工具处理改进计划

## 概述

本计划基于 [`workflow-merge-and-tools-analysis.md`](../workflow-merge-and-tools-analysis.md) 中识别的问题，提供详细的改进方案和实施步骤。

## 改进目标

1. **确保子图中的工具配置在合并时正确更新**
2. **提供完整的节点配置更新器支持**
3. **实现工具ID映射机制**
4. **改进工具作用域管理**
5. **增强动态工具处理的可靠性**

## 改进计划

### 阶段1：紧急修复（P0 - 立即执行）

#### 1.1 为LLM节点添加配置更新器

**目标**：确保LLM节点的工具配置在合并时正确更新

**实施步骤**：

1. **创建LLM节点配置更新器**
   
   在 [`sdk/core/graph/utils/node-config-updaters.ts`](../../sdk/core/graph/utils/node-config-updaters.ts) 中添加：

   ```typescript
   /**
    * LLM节点配置更新器
    * 处理LLM节点配置中的dynamicTools.toolIds和静态工具列表
    */
   const llmNodeConfigUpdater: NodeConfigUpdater = {
     nodeType: NodeType.LLM,
     
     containsIdReferences(config: any): boolean {
       if (!config) {
         return false;
       }
       
       // 检查动态工具配置
       if (config.dynamicTools?.toolIds && config.dynamicTools.toolIds.length > 0) {
         return true;
       }
       
       // 检查静态工具列表
       if (config.tools && config.tools.length > 0) {
         return true;
       }
       
       return false;
     },
     
     updateIdReferences(config: any, idMapping: IdMapping): any {
       if (!config) {
         return config;
       }
       
       const updatedConfig = { ...config };
       
       // 更新动态工具ID
       if (updatedConfig.dynamicTools?.toolIds) {
         updatedConfig.dynamicTools = {
           ...updatedConfig.dynamicTools,
           toolIds: updatedConfig.dynamicTools.toolIds.map((toolId: string) => {
             // 如果工具ID需要映射，则映射；否则保持原样
             // 注意：当前实现中工具ID通常不需要映射，因为工具是全局的
             // 这里保留映射接口以支持未来的工具命名空间隔离
             return toolId;
           })
         };
       }
       
       // 更新静态工具列表
       if (updatedConfig.tools) {
         updatedConfig.tools = updatedConfig.tools.map((tool: any) => {
           // 工具对象通常包含name或id字段
           const toolId = tool.name || tool.id;
           if (toolId) {
             return {
               ...tool,
               // 如果需要，可以在这里添加工具ID映射逻辑
             };
           }
           return tool;
         });
       }
       
       return updatedConfig;
     }
   };
   ```

2. **注册LLM节点配置更新器**

   ```typescript
   // sdk/core/graph/utils/node-config-updaters.ts:191-196
   const nodeConfigUpdaters: Partial<Record<NodeType, NodeConfigUpdater>> = {
     [NodeType.ROUTE]: routeNodeConfigUpdater,
     [NodeType.FORK]: forkNodeConfigUpdater,
     [NodeType.JOIN]: joinNodeConfigUpdater,
     [NodeType.SUBGRAPH]: subgraphNodeConfigUpdater,
     [NodeType.LLM]: llmNodeConfigUpdater  // 新增
   };
   ```

3. **添加单元测试**

   创建测试文件 `sdk/core/graph/utils/__tests__/llm-node-config-updater.test.ts`：

   ```typescript
   import { NodeType } from '@modular-agent/types';
   import { updateIdReferences, containsIdReferences } from '../node-config-updaters';
   import type { IdMapping } from '@modular-agent/types';

   describe('LLM Node Config Updater', () => {
     const idMapping: IdMapping = {
       nodeIds: new Map(),
       edgeIds: new Map(),
       reverseNodeIds: new Map(),
       reverseEdgeIds: new Map(),
       subgraphNamespaces: new Map()
     };

     it('should detect dynamic tools in config', () => {
       const node = {
         id: 'llm-1',
         type: NodeType.LLM,
         config: {
           profileId: 'profile1',
           dynamicTools: {
             toolIds: ['tool1', 'tool2']
           }
         }
       };

       expect(containsIdReferences(node)).toBe(true);
     });

     it('should detect static tools in config', () => {
       const node = {
         id: 'llm-1',
         type: NodeType.LLM,
         config: {
           profileId: 'profile1',
           tools: [
             { name: 'tool1', description: 'Tool 1' }
           ]
         }
       };

       expect(containsIdReferences(node)).toBe(true);
     });

     it('should update dynamic tool IDs', () => {
       const node = {
         id: 'llm-1',
         type: NodeType.LLM,
         config: {
           profileId: 'profile1',
           dynamicTools: {
             toolIds: ['tool1', 'tool2']
           }
         }
       };

       const updatedNode = updateIdReferences(node, idMapping);
       expect(updatedNode.config.dynamicTools.toolIds).toEqual(['tool1', 'tool2']);
     });

     it('should update static tools', () => {
       const node = {
         id: 'llm-1',
         type: NodeType.LLM,
         config: {
           profileId: 'profile1',
           tools: [
             { name: 'tool1', description: 'Tool 1' }
           ]
         }
       };

       const updatedNode = updateIdReferences(node, idMapping);
       expect(updatedNode.config.tools).toHaveLength(1);
       expect(updatedNode.config.tools[0].name).toBe('tool1');
     });
   });
   ```

**预期结果**：
- LLM节点的工具配置在合并时会被正确处理
- 工具配置更新器能够识别和更新工具配置
- 测试覆盖所有工具配置场景

**验证方法**：
- 运行单元测试：`pnpm test sdk/core/graph/utils/__tests__/llm-node-config-updater.test.ts`
- 运行集成测试：`pnpm test sdk/core/graph/__tests__/preprocessed-workflow-builder.test.ts`

---

### 阶段2：中期改进（P1-P2）

#### 2.1 实现工具ID映射机制

**目标**：为工具ID提供映射支持，支持未来的工具命名空间隔离

**实施步骤**：

1. **扩展IdMapping类型**

   在 `packages/types/src/subgraph.ts` 中添加工具ID映射：

   ```typescript
   export interface IdMapping {
     nodeIds: Map<ID, number>;
     edgeIds: Map<ID, number>;
     reverseNodeIds: Map<number, ID>;
     reverseEdgeIds: Map<number, ID>;
     subgraphNamespaces: Map<ID, string>;
     toolIds: Map<ID, ID>;  // 新增：工具ID映射
     reverseToolIds: Map<ID, ID>;  // 新增：反向工具ID映射
   }
   ```

2. **在合并过程中记录工具ID映射**

   在 [`GraphBuilder.mergeGraph()`](../../sdk/core/graph/graph-builder.ts:310-449) 中添加：

   ```typescript
   // 在添加子工作流节点时，收集工具ID
   const toolIdMapping = new Map<ID, ID>();
   
   for (const node of subgraph.nodes.values()) {
     if (node.type === 'LLM' as NodeType) {
       const config = node.originalNode?.config as any;
       
       // 收集动态工具ID
       if (config?.dynamicTools?.toolIds) {
         for (const toolId of config.dynamicTools.toolIds) {
           const namespacedToolId = generateNamespacedToolId(namespace, toolId);
           toolIdMapping.set(toolId, namespacedToolId);
         }
       }
       
       // 收集静态工具ID
       if (config?.tools) {
         for (const tool of config.tools) {
           const toolId = tool.name || tool.id;
           if (toolId) {
             const namespacedToolId = generateNamespacedToolId(namespace, toolId);
             toolIdMapping.set(toolId, namespacedToolId);
           }
         }
       }
     }
   }
   
   // 将工具ID映射添加到结果中
   mergeResult.toolIdMapping = toolIdMapping;
   ```

3. **添加工具ID命名空间生成函数**

   在 `packages/common-utils/src/id-utils.ts` 中添加：

   ```typescript
   /**
    * 生成命名空间的工具ID
    * @param namespace 命名空间
    * @param toolId 原始工具ID
    * @returns 命名空间的工具ID
    */
   export function generateNamespacedToolId(namespace: string, toolId: string): string {
     return `${namespace}_${toolId}`;
   }
   ```

4. **更新LLM节点配置更新器以使用工具ID映射**

   ```typescript
   updateIdReferences(config: any, idMapping: IdMapping): any {
     if (!config) {
       return config;
     }
     
     const updatedConfig = { ...config };
     
     // 更新动态工具ID
     if (updatedConfig.dynamicTools?.toolIds) {
       updatedConfig.dynamicTools = {
         ...updatedConfig.dynamicTools,
         toolIds: updatedConfig.dynamicTools.toolIds.map((toolId: string) => {
           // 使用工具ID映射
           const mappedId = idMapping.toolIds?.get(toolId);
           return mappedId || toolId;
         })
       };
     }
     
     // 更新静态工具列表
     if (updatedConfig.tools) {
       updatedConfig.tools = updatedConfig.tools.map((tool: any) => {
         const toolId = tool.name || tool.id;
         if (toolId) {
           const mappedId = idMapping.toolIds?.get(toolId);
           return {
             ...tool,
             name: mappedId || toolId,
             id: mappedId || toolId
           };
         }
         return tool;
       });
     }
     
     return updatedConfig;
   }
   ```

**预期结果**：
- 工具ID映射机制完整实现
- 支持工具的命名空间隔离
- 向后兼容（如果不需要映射，工具ID保持不变）

**验证方法**：
- 添加工具ID映射的单元测试
- 验证子图合并后工具配置的正确性

---

#### 2.2 改进工具作用域管理

**目标**：提供工作流级别的工具隔离

**实施步骤**：

1. **设计工具作用域架构**

   ```typescript
   // sdk/core/services/tool-scope-manager.ts
   export class ToolScopeManager {
     private scopes: Map<string, Set<string>> = new Map();
     
     /**
      * 创建工作流作用域
      * @param workflowId 工作流ID
      */
     createScope(workflowId: string): void {
       this.scopes.set(workflowId, new Set());
     }
     
     /**
      * 注册工具到作用域
      * @param workflowId 工作流ID
      * @param toolId 工具ID
      */
     registerTool(workflowId: string, toolId: string): void {
       const scope = this.scopes.get(workflowId);
       if (scope) {
         scope.add(toolId);
       }
     }
     
     /**
      * 获取工作流作用域的工具
      * @param workflowId 工作流ID
      * @returns 工具ID集合
      */
     getScopeTools(workflowId: string): Set<string> {
       return this.scopes.get(workflowId) || new Set();
     }
     
     /**
      * 检查工具是否在作用域中
      * @param workflowId 工作流ID
      * @param toolId 工具ID
      * @returns 是否在作用域中
      */
     isToolInScope(workflowId: string, toolId: string): boolean {
       const scope = this.scopes.get(workflowId);
       return scope ? scope.has(toolId) : false;
     }
   }
   ```

2. **集成到工作流预处理流程**

   在 [`workflow-processor.ts`](../../sdk/core/graph/workflow-processor.ts) 中：

   ```typescript
   export async function processWorkflow(
     workflow: WorkflowDefinition,
     options: ProcessOptions = {}
   ): Promise<PreprocessedGraph> {
     // ... 现有代码 ...
     
     // 创建工具作用域
     const toolScopeManager = new ToolScopeManager();
     toolScopeManager.createScope(workflow.id);
     
     // 收集工作流中使用的工具
     for (const node of expandedWorkflow.nodes) {
       if (node.type === NodeType.LLM) {
         const config = node.config as any;
         
         // 注册动态工具
         if (config?.dynamicTools?.toolIds) {
           for (const toolId of config.dynamicTools.toolIds) {
             toolScopeManager.registerTool(workflow.id, toolId);
           }
         }
         
         // 注册静态工具
         if (config?.tools) {
           for (const tool of config.tools) {
             const toolId = tool.name || tool.id;
             if (toolId) {
               toolScopeManager.registerTool(workflow.id, toolId);
             }
           }
         }
       }
     }
     
     // ... 继续处理 ...
   }
   ```

3. **在LLM执行时验证工具作用域**

   在 [`LLMExecutionCoordinator`](../../sdk/core/execution/coordinators/llm-execution-coordinator.ts) 中：

   ```typescript
   private getAvailableToolIds(workflowTools: Set<string>, dynamicTools?: any): string[] {
     const allToolIds = new Set(workflowTools);
     
     // 添加动态工具
     if (dynamicTools?.toolIds) {
       dynamicTools.toolIds.forEach((id: string) => allToolIds.add(id));
     }
     
     // 验证工具是否在当前工作流作用域中
     const currentWorkflowId = this.getCurrentWorkflowId();  // 需要实现
     const validToolIds = Array.from(allToolIds).filter(toolId => 
       this.toolScopeManager.isToolInScope(currentWorkflowId, toolId)
     );
     
     return validToolIds;
   }
   ```

**预期结果**：
- 工具作用域清晰明确
- 防止工作流之间的工具冲突
- 提供更好的工具访问控制

**验证方法**：
- 添加工具作用域的单元测试
- 验证跨工作流的工具隔离

---

### 阶段3：长期改进（P3）

#### 3.1 优化动态工具处理

**目标**：明确 `workflowTools` 的来源，提供更清晰的工具列表管理

**实施步骤**：

1. **明确workflowTools的来源**

   在 [`LLMExecutionCoordinator`](../../sdk/core/execution/coordinators/llm-execution-coordinator.ts) 中：

   ```typescript
   async executeLLM(
     params: LLMExecutionParams,
     conversationState: ConversationManager
   ): Promise<LLMExecutionResponse> {
     // ... 现有代码 ...
     
     // 明确workflowTools的来源
     const workflowTools = this.getWorkflowTools(params.threadId, params.nodeId);
     
     // 如果存在动态工具，合并静态和动态工具
     let availableToolSchemas = tools;
     if (dynamicTools?.toolIds) {
       const availableToolIds = this.getAvailableToolIds(workflowTools, dynamicTools);
       availableToolSchemas = this.toolDescriptionManager.getToolSchemas(availableToolIds);
     }
     
     // ... 继续处理 ...
   }
   
   /**
    * 获取工作流的静态工具列表
    * @param threadId 线程ID
    * @param nodeId 节点ID
    * @returns 工具ID集合
    */
   private getWorkflowTools(threadId: string, nodeId: string): Set<string> {
     const threadContext = this.executionContext?.getThreadRegistry().get(threadId);
     if (!threadContext) {
       return new Set();
     }
     
     const navigator = threadContext.getNavigator();
     const node = navigator.getGraph().getNode(nodeId);
     if (!node) {
       return new Set();
     }
     
     const config = node.originalNode?.config as any;
     const tools = config?.tools || [];
     
     return new Set(tools.map((t: any) => t.name || t.id));
   }
   ```

2. **添加工具列表验证**

   ```typescript
   /**
    * 验证工具列表
    * @param toolIds 工具ID列表
    * @returns 验证结果
    */
   private validateToolList(toolIds: string[]): { valid: boolean; missingTools: string[] } {
     const missingTools: string[] = [];
     
     for (const toolId of toolIds) {
       if (!this.toolService.hasTool(toolId)) {
         missingTools.push(toolId);
       }
     }
     
     return {
       valid: missingTools.length === 0,
       missingTools
     };
   }
   ```

**预期结果**：
- `workflowTools` 的来源清晰明确
- 工具列表管理更加可靠
- 提供工具验证机制

**验证方法**：
- 添加动态工具处理的单元测试
- 验证工具列表的完整性

---

#### 3.2 文档和测试

**目标**：完善文档和测试覆盖

**实施步骤**：

1. **添加工具处理文档**

   创建 `docs/sdk/tool/tool-handling-guide.md`：

   ```markdown
   # 工具处理指南
   
   ## 概述
   本指南描述了工作流中工具的处理机制，包括静态工具、动态工具和工具作用域。
   
   ## 工具配置
   
   ### 静态工具
   在节点配置中直接指定工具列表。
   
   ### 动态工具
   通过 `dynamicTools` 配置动态添加工具。
   
   ## 工具作用域
   工具作用域提供工作流级别的工具隔离。
   
   ## 子图中的工具
   子图中的工具配置在合并时会正确更新。
   ```

2. **增加测试覆盖**

   - 添加子图合并的集成测试
   - 添加工具配置更新的单元测试
   - 添加工具作用域的单元测试
   - 添加动态工具处理的单元测试

**预期结果**：
- 文档完整清晰
- 测试覆盖率高
- 便于维护和扩展

---

## 实施时间表

| 阶段 | 任务 | 预计时间 | 优先级 |
|------|------|---------|--------|
| 阶段1 | 为LLM节点添加配置更新器 | 2-3天 | P0 |
| 阶段1 | 添加单元测试 | 1-2天 | P0 |
| 阶段2 | 实现工具ID映射机制 | 3-4天 | P1 |
| 阶段2 | 改进工具作用域管理 | 4-5天 | P2 |
| 阶段3 | 优化动态工具处理 | 2-3天 | P3 |
| 阶段3 | 文档和测试 | 3-4天 | P3 |

**总计**：15-21天

## 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 工具ID映射破坏向后兼容性 | 高 | 中 | 提供可选的映射机制，默认不启用 |
| 工具作用域管理增加复杂度 | 中 | 中 | 提供清晰的API和文档 |
| 测试覆盖不足 | 中 | 低 | 优先编写测试，确保质量 |
| 性能影响 | 低 | 低 | 使用缓存机制优化性能 |

## 成功标准

1. **功能完整性**
   - 所有识别的问题得到解决
   - 工具配置在合并时正确更新
   - 工具作用域管理正常工作

2. **测试覆盖率**
   - 单元测试覆盖率 > 80%
   - 集成测试覆盖关键场景

3. **文档完整性**
   - API文档完整
   - 使用指南清晰
   - 示例代码可用

4. **向后兼容性**
   - 不破坏现有功能
   - 提供平滑的升级路径

## 后续优化方向

1. **性能优化**
   - 工具描述缓存优化
   - 工具查找性能优化

2. **功能扩展**
   - 支持工具版本管理
   - 支持工具依赖管理

3. **监控和调试**
   - 添加工具使用监控
   - 提供工具调试工具

---

**计划创建时间**：2025-01-XX  
**计划版本**：1.0  
**负责人**：开发团队