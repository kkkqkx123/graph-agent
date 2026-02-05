# LLM模块内部工具审批机制设计方案（V2）

## 1. 背景与目标

当前项目中，LLM节点将工具执行完全托管给LLM模块内部处理，这种设计简化了工作流配置，但缺乏对敏感工具调用的人工干预能力。本方案旨在设计一个专用于LLM模块内部的工具审批机制，实现以下目标：

- **保持架构简洁**：不通过额外的USER_INTERACTION节点处理，而是直接在LLM模块内部触发USER_INTERACTION事件
- **支持工具审批**：允许对特定工具调用进行人工审批
- **允许注入用户指令**：支持用户在审批过程中提供额外指令
- **配置灵活**：通过工作流配置定义审批工具列表（白名单模式）
- **向后兼容**：不影响现有功能和工作流
- **复用现有机制**：基于现有的USER_INTERACTION事件系统，不复用HumanRelay

## 2. 核心设计原则

### 2.1 审批机制
- **白名单模式**：提供自动批准的工具注册表，只有不在白名单中的工具才需要人工审批
- **工作流级别配置**：审批工具列表定义在工作流配置中，运行时不可变
- **LLM模块内部处理**：审批逻辑完全在LLM执行协调器内部实现，直接触发USER_INTERACTION事件

### 2.2 用户交互
- **复用USER_INTERACTION事件系统**：使用现有的USER_INTERACTION_REQUESTED/RESPONDED/PROCESSED事件
- **专用操作类型**：为工具审批定义专用的操作类型
- **支持用户指令注入**：允许用户在审批时提供额外的上下文或指令

## 3. 技术实现方案

### 3.1 工作流配置扩展

在`WorkflowConfig`中添加工具审批配置：

```typescript
/**
 * 工具审批配置
 */
export interface ToolApprovalConfig {
  /** 
   * 自动批准的工具列表（白名单）
   * 工具ID或名称数组，这些工具调用无需人工审批
   */
  autoApprovedTools: string[];
  
  /**
   * 审批超时时间（毫秒）
   * 默认30秒
   */
  approvalTimeout?: number;
}

/**
 * 扩展工作流配置类型
 */
export interface WorkflowConfig {
  // ... 现有配置
  /** 工具审批配置 */
  toolApproval?: ToolApprovalConfig;
}
```

### 3.2 新增USER_INTERACTION操作类型

扩展`UserInteractionOperationType`枚举：

```typescript
/**
 * 用户交互操作类型
 */
export enum UserInteractionOperationType {
  /** 更新工作流变量 */
  UPDATE_VARIABLES = 'UPDATE_VARIABLES',
  /** 添加用户消息到 LLM 对话 */
  ADD_MESSAGE = 'ADD_MESSAGE',
  /** 工具调用审批 */
  TOOL_APPROVAL = 'TOOL_APPROVAL'
}
```

### 3.3 工具审批专用配置结构

定义工具审批的专用配置：

```typescript
/**
 * 工具审批配置
 */
export interface ToolApprovalConfig {
  /** 工具名称 */
  toolName: string;
  /** 工具描述 */
  toolDescription: string;
  /** 工具参数 */
  toolParameters: Record<string, any>;
  /** 是否批准 */
  approved: boolean;
  /** 编辑后的参数（可选） */
  editedParameters?: Record<string, any>;
  /** 用户指令（可选） */
  userInstruction?: string;
}
```

### 3.4 LLM执行协调器增强

修改`LLMExecutionCoordinator`以支持工具审批：

```typescript
class LLMExecutionCoordinator {
  private async executeToolCalls(
    toolCalls: any[], 
    conversationState: ConversationManager, 
    threadId: string, 
    nodeId: string,
    workflowConfig: WorkflowConfig // 新增：传入工作流配置
  ) {
    for (const toolCall of toolCalls) {
      const tool = this.toolService.getTool(toolCall.name);
      
      // 检查是否需要人工审批
      if (this.requiresHumanApproval(toolCall.name, workflowConfig)) {
        const approvalResult = await this.requestToolApproval(
          toolCall,
          tool,
          workflowConfig.toolApproval!,
          threadId,
          nodeId,
          conversationState
        );
        
        if (!approvalResult.approved) {
          // 用户拒绝，跳过此工具调用
          continue;
        }
        
        // 如果用户提供了编辑后的参数
        if (approvalResult.editedParameters) {
          toolCall.arguments = JSON.stringify(approvalResult.editedParameters);
        }
        
        // 如果用户提供了额外指令，添加到对话历史
        if (approvalResult.userInstruction) {
          conversationState.addMessage({
            role: 'user',
            content: approvalResult.userInstruction
          });
        }
      }
      
      // 执行工具调用
      await this.executeSingleToolCall(toolCall, conversationState, threadId, nodeId);
    }
  }
  
  private requiresHumanApproval(
    toolName: string, 
    workflowConfig: WorkflowConfig
  ): boolean {
    const autoApproved = workflowConfig.toolApproval?.autoApprovedTools || [];
    return !autoApproved.includes(toolName);
  }
  
  private async requestToolApproval(
    toolCall: any,
    tool: Tool,
    approvalConfig: ToolApprovalConfig,
    threadId: string,
    nodeId: string,
    conversationState: ConversationManager
  ): Promise<{
    approved: boolean;
    editedParameters?: Record<string, any>;
    userInstruction?: string;
  }> {
    const interactionId = generateId();
    const timeout = approvalConfig.approvalTimeout || 30000;
    
    // 创建工具审批请求
    const toolApprovalData: ToolApprovalConfig = {
      toolName: tool.name,
      toolDescription: tool.description,
      toolParameters: JSON.parse(toolCall.arguments),
      approved: false
    };
    
    // 触发USER_INTERACTION_REQUESTED事件
    await this.eventManager.emit({
      type: EventType.USER_INTERACTION_REQUESTED,
      timestamp: now(),
      workflowId: '',
      threadId,
      nodeId,
      interactionId,
      operationType: UserInteractionOperationType.TOOL_APPROVAL,
      prompt: `是否批准调用工具 "${tool.name}"?`,
      timeout,
      metadata: {
        toolApproval: toolApprovalData
      }
    });
    
    // 等待USER_INTERACTION_RESPONDED事件
    const response = await this.waitForUserInteractionResponse(interactionId);
    
    // 解析审批结果
    const approvalResult = response.inputData as ToolApprovalConfig;
    
    // 触发USER_INTERACTION_PROCESSED事件
    await this.eventManager.emit({
      type: EventType.USER_INTERACTION_PROCESSED,
      timestamp: now(),
      workflowId: '',
      threadId,
      interactionId,
      operationType: UserInteractionOperationType.TOOL_APPROVAL,
      results: approvalResult
    });
    
    return {
      approved: approvalResult.approved,
      editedParameters: approvalResult.editedParameters,
      userInstruction: approvalResult.userInstruction
    };
  }
  
  private waitForUserInteractionResponse(interactionId: string): Promise<UserInteractionRespondedEvent> {
    // 实现等待用户响应的逻辑
    // 可以通过Promise + 事件监听器实现
    return new Promise((resolve) => {
      const handler = (event: UserInteractionRespondedEvent) => {
        if (event.interactionId === interactionId) {
          resolve(event);
          // 移除事件监听器
        }
      };
      this.eventManager.on(EventType.USER_INTERACTION_RESPONDED, handler);
    });
  }
}
```

### 3.5 应用层处理逻辑

应用层需要监听USER_INTERACTION_REQUESTED事件并处理工具审批：

```typescript
// 应用层事件处理器
class AppUserInteractionEventHandler {
  constructor(private eventManager: EventManager) {
    this.eventManager.on(EventType.USER_INTERACTION_REQUESTED, this.handleUserInteractionRequest.bind(this));
  }
  
  private async handleUserInteractionRequest(event: UserInteractionRequestedEvent) {
    if (event.operationType === UserInteractionOperationType.TOOL_APPROVAL) {
      // 显示工具审批UI
      const approvalResult = await this.showToolApprovalDialog(event);
      
      // 触发USER_INTERACTION_RESPONDED事件
      this.eventManager.emit({
        type: EventType.USER_INTERACTION_RESPONDED,
        interactionId: event.interactionId,
        inputData: approvalResult
      });
    }
  }
  
  private async showToolApprovalDialog(event: UserInteractionRequestedEvent): Promise<ToolApprovalConfig> {
    // 实现UI逻辑，返回审批结果
    const toolApproval = event.metadata?.toolApproval as ToolApprovalConfig;
    
    // 显示审批对话框，获取用户输入
    const userResponse = await this.displayApprovalUI(toolApproval);
    
    return {
      ...toolApproval,
      approved: userResponse.approved,
      editedParameters: userResponse.editedParameters,
      userInstruction: userResponse.userInstruction
    };
  }
}
```

### 3.6 USER_INTERACTION_HANDLER适配

现有的`UserInteractionHandler`需要支持新的操作类型：

```typescript
@injectable()
export class UserInteractionHandler implements IUserInteractionHandler {
  async handle(
    config: UserInteractionConfig,
    context: IInteractionContext
  ): Promise<UserInteractionResult> {
    // 这个handler主要用于USER_INTERACTION节点
    // 工具审批由LLM模块直接触发事件处理
    // 所以这里不需要特殊处理
    
    switch (config.interactionType) {
      case 'input':
        return this.handleInput(config, context);
      case 'confirmation':
        return this.handleConfirmation(config, context);
      case 'selection':
        return this.handleSelection(config, context);
      default:
        throw new Error(`Unknown interaction type: ${config.interactionType}`);
    }
  }
}
```

### 3.7 检查点和恢复支持

为支持长时间审批，需要在LLM执行协调器中创建检查点：

```typescript
private async requestToolApproval(...) {
  // 创建检查点，保存当前执行状态
  await this.checkpointService.createCheckpoint(
    threadId,
    nodeId,
    'WAITING_TOOL_APPROVAL',
    {
      currentToolCall: toolCall,
      conversationState: conversationState.getState(),
      workflowConfig: workflowConfig
    }
  );
  
  try {
    const result = await this.performToolApproval(...);
    return result;
  } finally {
    // 清理检查点
    await this.checkpointService.removeCheckpoint(threadId, nodeId);
  }
}
```

## 4. 使用示例

### 4.1 工作流配置

```toml
# workflow.toml
[[workflow.config]]
timeout = 60000
maxSteps = 100

[workflow.config.toolApproval]
autoApprovedTools = ["get_weather", "search_web"]
approvalTimeout = 60000
```

### 4.2 应用层事件处理

```typescript
// 应用层初始化
class Application {
  constructor() {
    const eventManager = container.get<EventManager>('EventManager');
    new AppUserInteractionEventHandler(eventManager);
  }
}

// 工具审批UI处理
class AppUserInteractionEventHandler {
  private async showToolApprovalDialog(event: UserInteractionRequestedEvent) {
    const toolApproval = event.metadata?.toolApproval as ToolApprovalConfig;
    
    // 创建审批UI
    const dialog = new ToolApprovalDialog({
      toolName: toolApproval.toolName,
      toolDescription: toolApproval.toolDescription,
      parameters: toolApproval.toolParameters,
      allowParameterEdit: true,
      allowUserInstruction: true
    });
    
    const result = await dialog.show();
    
    return {
      toolName: toolApproval.toolName,
      toolDescription: toolApproval.toolDescription,
      toolParameters: toolApproval.toolParameters,
      approved: result.approved,
      editedParameters: result.editedParameters,
      userInstruction: result.userInstruction
    };
  }
}
```

## 5. 实施计划

### 阶段一：核心功能实现
- [ ] 扩展WorkflowConfig添加toolApproval配置
- [ ] 扩展UserInteractionOperationType添加TOOL_APPROVAL
- [ ] 定义ToolApprovalConfig数据结构
- [ ] 修改LLMExecutionCoordinator支持工具审批

### 阶段二：事件系统集成
- [ ] 实现USER_INTERACTION事件的等待和响应机制
- [ ] 提供应用层事件处理示例
- [ ] 更新事件文档和类型定义

### 阶段三：检查点和恢复支持
- [ ] 增强检查点机制支持工具审批状态
- [ ] 实现长时间暂停和恢复功能
- [ ] 添加超时处理和错误恢复

### 阶段四：测试和文档
- [ ] 编写完整的单元测试和集成测试
- [ ] 更新API文档和使用指南
- [ ] 提供完整的使用示例

## 6. 优势总结

1. **架构简洁**：审批逻辑完全在LLM模块内部，不增加额外的节点类型
2. **复用现有机制**：基于现有的USER_INTERACTION事件系统，不引入新概念
3. **配置灵活**：通过工作流配置定义审批策略，运行时不可变保证安全性
4. **向后兼容**：现有工作流无需修改即可继续工作
5. **功能完整**：支持批准、拒绝、参数编辑和用户指令注入
6. **易于集成**：应用层只需监听标准事件并提供UI实现
7. **性能优化**：白名单模式减少不必要的审批开销