/**
 * Hook 实现示例
 * 
 * 本文档提供应用层如何使用 BEFORE_EXECUTE Hook 
 * 实现节点执行前检查的具体代码示例
 */

# Hook 实现示例

## 一、基础示例：线程状态检查

### 1.1 简单条件判断

```typescript
import { HookType, NodeType } from '@modular-agent/types';
import type { Node, CodeNodeConfig } from '@modular-agent/types';

/**
 * 创建线程状态检查 Hook
 * 仅允许 RUNNING 状态的线程执行节点
 */
function createThreadStateCheckHook() {
  return {
    hookType: HookType.BEFORE_EXECUTE,
    eventName: 'validation.thread_status_check',
    weight: 200, // 高优先级，最先执行
    enabled: true,
    // 使用条件表达式过滤（可选）
    condition: {
      expression: "thread.status === 'PAUSED' || thread.status === 'COMPLETED'"
    },
    eventPayload: {
      description: 'Validate thread is in executable state',
      // 仅当上述条件为真时才执行 handler
      handler: async (context) => {
        throw new ThreadInterruptedException(
          `Cannot execute node: thread is in ${context.thread.status} state`,
          context.thread.status === 'PAUSED' ? 'PAUSE' : 'STOP',
          context.thread.id,
          context.node.id
        );
      }
    }
  };
}
```

### 1.2 使用 Hook 配置节点

```typescript
// 在工作流定义中使用
const workflowNode: Node = {
  id: 'process-data',
  type: NodeType.CODE,
  name: 'Process Data',
  config: {
    scriptName: 'data-processor.js',
    scriptType: 'javascript',
    risk: 'low'
  } as CodeNodeConfig,
  incomingEdgeIds: ['start'],
  outgoingEdgeIds: ['end'],
  // 添加 Hook 配置
  hooks: [
    createThreadStateCheckHook()
  ]
};
```

---

## 二、进阶示例：风险等级验证

### 2.1 风险等级策略检查

```typescript
import { RuntimeValidationError } from '@modular-agent/types';
import type { HookExecutionContext } from '@modular-agent/types';

/**
 * 根据风险等级实现不同的验证策略
 */
function createRiskValidationHook() {
  return {
    hookType: HookType.BEFORE_EXECUTE,
    eventName: 'security.risk_level_check',
    weight: 150,
    enabled: true,
    // 仅对 CODE 节点执行
    condition: {
      expression: "node.type === 'CODE'"
    },
    eventPayload: {
      description: 'Validate script based on risk level',
      handler: async (context: HookExecutionContext) => {
        const config = context.node.config as CodeNodeConfig;
        const risk = config.risk || 'none';

        switch (risk) {
          case 'none':
            // 无风险，无需检查
            break;

          case 'low':
            // 低风险：检查脚本名称中的路径遍历尝试
            validateLowRiskScript(config.scriptName);
            break;

          case 'medium':
            // 中等风险：检查危险命令
            validateMediumRiskScript(config.scriptName);
            break;

          case 'high':
            // 高风险：记录警告但允许执行
            console.warn(
              `[HIGH-RISK] Executing script: ${config.scriptName}`,
              {
                timestamp: new Date(),
                threadId: context.thread.id,
                nodeId: context.node.id,
                user: context.thread.variableScopes.thread?.userId
              }
            );
            break;

          default:
            throw new RuntimeValidationError(
              `Unknown risk level: ${risk}`,
              { operation: 'validate', field: 'code.risk' }
            );
        }
      }
    }
  };
}

/**
 * 低风险脚本验证：检查路径字符
 */
function validateLowRiskScript(scriptName: string): void {
  const invalidPatterns = ['..', '~', '/etc/', '/sys/'];
  
  for (const pattern of invalidPatterns) {
    if (scriptName.includes(pattern)) {
      throw new RuntimeValidationError(
        `Script path contains invalid pattern: "${pattern}"`,
        {
          operation: 'validate',
          field: 'code.scriptName',
          context: { scriptName, invalidPattern: pattern }
        }
      );
    }
  }
}

/**
 * 中等风险脚本验证：检查危险命令
 */
function validateMediumRiskScript(scriptName: string): void {
  const dangerousCommands = [
    'rm -rf',
    'rm -r',
    'del /f',
    'del /s',
    'format',
    'shutdown',
    'reboot',
    'kill -9'
  ];

  const lowerName = scriptName.toLowerCase();
  
  for (const cmd of dangerousCommands) {
    if (lowerName.includes(cmd.toLowerCase())) {
      throw new RuntimeValidationError(
        `Script contains potentially dangerous command: "${cmd}"`,
        {
          operation: 'validate',
          field: 'code.scriptName',
          severity: ErrorSeverity.WARNING,
          context: { scriptName, dangerousCommand: cmd }
        }
      );
    }
  }
}
```

### 2.2 脚本白名单检查

```typescript
/**
 * 脚本白名单验证
 * 只允许执行预批准的脚本
 */
function createWhitelistCheckHook(whitelistedScripts: string[]) {
  return {
    hookType: HookType.BEFORE_EXECUTE,
    eventName: 'security.whitelist_check',
    weight: 180,
    enabled: true,
    condition: {
      expression: "node.type === 'CODE'"
    },
    eventPayload: {
      whitelistedScripts,
      description: 'Validate script is in whitelist',
      handler: async (context: HookExecutionContext) => {
        const config = context.node.config as CodeNodeConfig;
        
        if (!whitelistedScripts.includes(config.scriptName)) {
          throw new ExecutionError(
            `Script "${config.scriptName}" is not in approved whitelist`,
            context.node.id
          );
        }
      }
    }
  };
}

// 使用方式
const node: Node = {
  id: 'safe-code',
  type: NodeType.CODE,
  config: {
    scriptName: 'approved-script',
    risk: 'medium'
  } as CodeNodeConfig,
  incomingEdgeIds: [],
  outgoingEdgeIds: [],
  hooks: [
    createWhitelistCheckHook([
      'approved-script',
      'data-processor',
      'report-generator'
    ])
  ]
};
```

---

## 三、业务逻辑示例：权限和配额检查

### 3.1 权限检查

```typescript
import type { HookExecutionContext } from '@modular-agent/types';

/**
 * 权限检查 Hook
 * 验证用户是否有权执行该节点
 */
function createPermissionCheckHook(requiredPermissions: string[]) {
  return {
    hookType: HookType.BEFORE_EXECUTE,
    eventName: 'business.permission_check',
    weight: 100,
    enabled: true,
    eventPayload: {
      requiredPermissions,
      description: 'Check user permissions',
      handler: async (context: HookExecutionContext) => {
        // 从线程变量中获取用户信息
        const userId = context.thread.variableScopes.thread?.userId;
        const userPermissions = context.thread.variableScopes.thread?.permissions || [];

        // 检查是否有所有必需权限
        const hasPermission = requiredPermissions.every(
          (perm) => userPermissions.includes(perm)
        );

        if (!hasPermission) {
          const missingPerms = requiredPermissions.filter(
            (perm) => !userPermissions.includes(perm)
          );

          throw new ExecutionError(
            `User ${userId} lacks permissions: ${missingPerms.join(', ')}`,
            context.node.id
          );
        }
      }
    }
  };
}

// 使用方式
const adminOnlyNode: Node = {
  id: 'admin-only-script',
  type: NodeType.CODE,
  config: {
    scriptName: 'admin-cleanup.sh',
    risk: 'high'
  } as CodeNodeConfig,
  incomingEdgeIds: [],
  outgoingEdgeIds: [],
  hooks: [
    createPermissionCheckHook(['admin', 'system-maintenance'])
  ]
};
```

### 3.2 配额检查

```typescript
/**
 * 配额检查 Hook
 * 验证用户是否超过使用配额
 */
function createQuotaCheckHook(quotaService: QuotaService) {
  return {
    hookType: HookType.BEFORE_EXECUTE,
    eventName: 'business.quota_check',
    weight: 110,
    enabled: true,
    eventPayload: {
      description: 'Check user quota limit',
      handler: async (context: HookExecutionContext) => {
        const userId = context.thread.variableScopes.thread?.userId;
        
        // 查询用户当前使用情况
        const usage = await quotaService.getUserUsage(userId);
        const limit = await quotaService.getUserLimit(userId);

        if (usage.scriptExecutions >= limit.maxScriptExecutions) {
          throw new ExecutionError(
            `User ${userId} has exceeded script execution quota (${usage.scriptExecutions}/${limit.maxScriptExecutions})`,
            context.node.id
          );
        }

        // 检查 CPU 配额
        if (usage.cpuMinutes >= limit.maxCpuMinutes) {
          throw new ExecutionError(
            `User ${userId} has exceeded CPU quota`,
            context.node.id
          );
        }
      }
    }
  };
}

// 接口定义
interface QuotaService {
  getUserUsage(userId: string): Promise<{
    scriptExecutions: number;
    cpuMinutes: number;
    memoryGb: number;
  }>;
  
  getUserLimit(userId: string): Promise<{
    maxScriptExecutions: number;
    maxCpuMinutes: number;
    maxMemoryGb: number;
  }>;
  
  recordExecution(userId: string, duration: number): Promise<void>;
}
```

---

## 四、监控和审计示例

### 4.1 执行前日志

```typescript
/**
 * 审计日志 Hook
 * 记录所有节点执行前的信息
 */
function createAuditLoggingHook(auditService: AuditService) {
  return {
    hookType: HookType.BEFORE_EXECUTE,
    eventName: 'monitoring.execution_audit',
    weight: 50, // 低优先级，最后执行
    enabled: true,
    eventPayload: {
      description: 'Log execution attempt for audit',
      handler: async (context: HookExecutionContext) => {
        const config = context.node.config as CodeNodeConfig;
        
        await auditService.log({
          eventType: 'NODE_EXECUTION_ATTEMPT',
          timestamp: new Date(),
          threadId: context.thread.id,
          nodeId: context.node.id,
          nodeName: context.node.name,
          nodeType: context.node.type,
          userId: context.thread.variableScopes.thread?.userId,
          scriptName: config.scriptName,
          riskLevel: config.risk,
          metadata: {
            inputVariables: Object.keys(context.thread.variableScopes.thread || {}),
            threadStatus: context.thread.status
          }
        });
      }
    }
  };
}

// 接口定义
interface AuditService {
  log(event: AuditEvent): Promise<void>;
}

interface AuditEvent {
  eventType: string;
  timestamp: Date;
  threadId: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  userId?: string;
  scriptName?: string;
  riskLevel?: string;
  metadata?: Record<string, any>;
}
```

### 4.2 执行后验证

```typescript
/**
 * 执行后验证 Hook
 * 在节点执行完成后进行验证和后处理
 */
function createExecutionVerificationHook() {
  return {
    hookType: HookType.AFTER_EXECUTE,
    eventName: 'verification.post_execution_check',
    weight: 100,
    enabled: true,
    eventPayload: {
      description: 'Verify execution results',
      handler: async (context: HookExecutionContext) => {
        if (!context.result) {
          throw new SystemExecutionError(
            'Execution result is missing',
            'VerificationHook',
            'executeHook'
          );
        }

        const config = context.node.config as CodeNodeConfig;

        // 检查执行是否成功
        if (context.result.status === 'FAILED') {
          console.error(
            `Script execution failed: ${config.scriptName}`,
            {
              error: context.result.error,
              timestamp: context.result.timestamp
            }
          );

          // 可选：触发告警
          if (config.risk === 'high') {
            await notifyOps({
              level: 'CRITICAL',
              message: `High-risk script failed: ${config.scriptName}`,
              nodeId: context.node.id
            });
          }
        }

        // 记录执行统计
        await recordExecutionMetrics({
          nodeId: context.node.id,
          status: context.result.status,
          duration: context.result.timestamp,
          scriptName: config.scriptName
        });
      }
    }
  };
}
```

---

## 五、组合多个 Hook 的示例

### 5.1 创建完整的节点定义

```typescript
/**
 * 创建一个带有完整检查的 CODE 节点
 */
function createFullCheckedCodeNode(
  nodeId: string,
  scriptName: string,
  riskLevel: string,
  requiredPermissions: string[],
  whitelistedScripts: string[]
): Node {
  return {
    id: nodeId,
    type: NodeType.CODE,
    name: `Execute: ${scriptName}`,
    config: {
      scriptName,
      scriptType: 'javascript',
      risk: riskLevel as any
    } as CodeNodeConfig,
    incomingEdgeIds: [],
    outgoingEdgeIds: [],
    hooks: [
      // 1. 最高优先级：检查线程状态
      createThreadStateCheckHook(),
      
      // 2. 权限检查
      createPermissionCheckHook(requiredPermissions),
      
      // 3. 配额检查
      createQuotaCheckHook(injectedQuotaService),
      
      // 4. 白名单检查
      createWhitelistCheckHook(whitelistedScripts),
      
      // 5. 风险等级检查
      createRiskValidationHook(),
      
      // 6. 审计日志（最低优先级）
      createAuditLoggingHook(injectedAuditService)
    ]
  };
}

// 使用方式
const node = createFullCheckedCodeNode(
  'process-sensitive-data',
  'financial-report.js',
  'high',
  ['financial_access', 'reporting'],
  ['financial-report.js', 'data-validator.js']
);
```

### 5.2 Hook 执行顺序

```
权重 200: 线程状态检查       ✓ 必须通过
权重 180: 白名单检查         ✓ 必须通过
权重 150: 风险等级验证       ✓ 必须通过
权重 110: 配额检查           ✓ 必须通过
权重 100: 权限检查           ✓ 必须通过
权重 50:  审计日志           (不影响执行)
          ↓
      执行节点逻辑
          ↓
权重 100: AFTER_EXECUTE Hook (执行后处理)
```

---

## 六、环境特定的配置

### 6.1 根据环境调整检查

```typescript
/**
 * 根据环境（开发/测试/生产）调整 Hook 配置
 */
function createEnvironmentAwareHooks(environment: 'dev' | 'test' | 'prod') {
  const hooks = [];

  // 所有环境都需要的基础检查
  hooks.push(createThreadStateCheckHook());

  if (environment === 'prod') {
    // 生产环境：严格检查
    hooks.push(
      createPermissionCheckHook(['production_access']),
      createQuotaCheckHook(productionQuotaService),
      createWhitelistCheckHook(productionWhitelist),
      createRiskValidationHook(),
      createAuditLoggingHook(productionAuditService)
    );
  } else if (environment === 'test') {
    // 测试环境：宽松检查
    hooks.push(
      createAuditLoggingHook(testAuditService)
    );
  } else {
    // 开发环境：最小检查
    // 仅保留线程状态检查
  }

  return hooks;
}

// 使用方式
const node: Node = {
  id: 'env-aware-script',
  type: NodeType.CODE,
  config: {
    scriptName: 'process-data.js',
    risk: 'medium'
  } as CodeNodeConfig,
  incomingEdgeIds: [],
  outgoingEdgeIds: [],
  hooks: createEnvironmentAwareHooks(process.env.NODE_ENV as 'dev' | 'test' | 'prod')
};
```

---

## 七、错误处理最佳实践

### 7.1 Hook 中的错误分类

```typescript
/**
 * Hook 中应使用适当的错误类型
 */
function createCarefulErrorHandlingHook() {
  return {
    hookType: HookType.BEFORE_EXECUTE,
    eventName: 'validation.careful_errors',
    weight: 100,
    eventPayload: {
      handler: async (context: HookExecutionContext) => {
        try {
          // 验证逻辑
          const config = context.node.config as CodeNodeConfig;

          // 配置验证错误 → ValidationError
          if (!config.scriptName) {
            throw new ValidationError('scriptName is required', {
              operation: 'validate',
              field: 'config.scriptName'
            });
          }

          // 运行时验证错误 → RuntimeValidationError
          if (config.risk === 'unknown') {
            throw new RuntimeValidationError(
              'Unknown risk level',
              {
                operation: 'validate',
                field: 'config.risk',
                value: config.risk
              }
            );
          }

          // 业务逻辑错误 → BusinessLogicError
          const userId = context.thread.variableScopes.thread?.userId;
          if (!userId) {
            throw new BusinessLogicError(
              'User ID not found in thread context',
              'hook_validation',
              'missing_user_id'
            );
          }

          // 执行错误 → ExecutionError
          const hasAccess = await checkUserAccess(userId);
          if (!hasAccess) {
            throw new ExecutionError(
              `User ${userId} does not have access`,
              context.node.id
            );
          }
        } catch (error) {
          // 捕获其他未预期的错误
          throw new SystemExecutionError(
            'Hook execution failed',
            'ErrorHandlingHook',
            'executeHook',
            context.node.id,
            undefined,
            { originalError: error }
          );
        }
      }
    }
  };
}
```

---

## 八、完整工作流示例

```typescript
// 定义工作流
const workflowDefinition = {
  id: 'data-processing-workflow',
  name: 'Data Processing Workflow',
  version: '1.0.0',
  nodes: [
    {
      id: 'start',
      type: NodeType.START,
      incomingEdgeIds: [],
      outgoingEdgeIds: ['validate-input']
    },
    {
      id: 'validate-input',
      type: NodeType.CODE,
      name: 'Validate Input Data',
      config: {
        scriptName: 'validate-data.js',
        risk: 'low'
      } as CodeNodeConfig,
      incomingEdgeIds: ['start'],
      outgoingEdgeIds: ['process-data'],
      hooks: [
        createThreadStateCheckHook(),
        createWhitelistCheckHook(['validate-data.js']),
        createAuditLoggingHook(auditService)
      ]
    },
    {
      id: 'process-data',
      type: NodeType.CODE,
      name: 'Process Data',
      config: {
        scriptName: 'process-data.js',
        risk: 'medium'
      } as CodeNodeConfig,
      incomingEdgeIds: ['validate-input'],
      outgoingEdgeIds: ['generate-report'],
      hooks: [
        createThreadStateCheckHook(),
        createPermissionCheckHook(['data_processing']),
        createQuotaCheckHook(quotaService),
        createWhitelistCheckHook(['process-data.js']),
        createRiskValidationHook(),
        createAuditLoggingHook(auditService)
      ]
    },
    {
      id: 'generate-report',
      type: NodeType.CODE,
      name: 'Generate Report',
      config: {
        scriptName: 'generate-report.js',
        risk: 'high'
      } as CodeNodeConfig,
      incomingEdgeIds: ['process-data'],
      outgoingEdgeIds: ['end'],
      hooks: [
        createThreadStateCheckHook(),
        createPermissionCheckHook(['reporting', 'admin']),
        createWhitelistCheckHook(['generate-report.js']),
        createRiskValidationHook(),
        createAuditLoggingHook(auditService)
      ]
    },
    {
      id: 'end',
      type: NodeType.END,
      incomingEdgeIds: ['generate-report'],
      outgoingEdgeIds: []
    }
  ],
  edges: [
    { id: 'edge1', source: 'start', target: 'validate-input' },
    { id: 'edge2', source: 'validate-input', target: 'process-data' },
    { id: 'edge3', source: 'process-data', target: 'generate-report' },
    { id: 'edge4', source: 'generate-report', target: 'end' }
  ]
};

// 执行工作流
async function runWorkflow(workflow, input, userId) {
  const executor = new WorkflowExecutor(workflow);
  
  try {
    const result = await executor.execute({
      input,
      variables: {
        userId,
        permissions: await getUserPermissions(userId),
        timestamp: new Date()
      }
    });
    
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

---

## 总结

通过 Hook 机制，应用层可以：

1. **在节点执行前** 进行灵活的检查和验证
2. **在节点执行后** 进行审计和后处理
3. **跨节点复用** 相同的检查逻辑
4. **环境特定配置** 不同环境的不同策略
5. **清晰分离** 业务逻辑和执行引擎

这样 SDK 保持纯净的执行能力，应用层拥有完整的决策权。
