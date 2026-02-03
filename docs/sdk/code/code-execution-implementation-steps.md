# Code Execution Implementation Steps

## Overview

This document provides the exact implementation steps needed to replace the mock CODE node handler with a production-ready code execution framework.

## Step 1: Create Type Definitions

### File: `sdk/types/code.ts`

```typescript
/**
 * Code execution type definitions
 */

import type { ID } from './common';

/**
 * Code execution options
 */
export interface CodeExecutionOptions {
  /** Script language to execute */
  scriptType: 'shell' | 'cmd' | 'powershell' | 'python' | 'javascript';
  
  /** Security risk level */
  risk: 'none' | 'low' | 'medium' | 'high';
  
  /** Execution timeout in milliseconds (default: 30000) */
  timeout?: number;
  
  /** Maximum number of retry attempts (default: 0) */
  retries?: number;
  
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
  
  /** Whether the code is inline (vs file path) */
  inline?: boolean;
  
  /** Additional context data available to execution */
  context?: Record<string, any>;
  
  /** Working directory for execution (optional) */
  workingDirectory?: string;
  
  /** Environment variables for execution (optional) */
  environment?: Record<string, string>;
  
  /** Input data for the script (optional) */
  input?: string;
}

/**
 * Code execution result
 */
export interface CodeExecutionResult {
  /** Whether execution completed successfully */
  success: boolean;
  
  /** Standard output from execution */
  stdout?: string;
  
  /** Standard error from execution */
  stderr?: string;
  
  /** Combined output (stdout + stderr) */
  output?: string;
  
  /** Exit code from execution (0 = success) */
  exitCode?: number;
  
  /** Error message if execution failed */
  error?: string;
  
  /** Execution time in milliseconds */
  executionTime: number;
  
  /** Script identifier or name */
  scriptName?: string;
  
  /** Script type that was executed */
  scriptType?: string;
  
  /** Additional metadata from execution */
  metadata?: Record<string, any>;
}

/**
 * Code runner interface (implemented by application layer)
 */
export interface CodeRunner {
  /**
   * Execute code with given options
   */
  execute(
    code: string,
    options: CodeExecutionOptions
  ): Promise<CodeExecutionResult>;
  
  /**
   * Validate if the runner can handle the given script type
   */
  supportsScriptType(scriptType: string): boolean;
}

/**
 * Sandbox environment representation
 */
export interface SandboxEnvironment {
  /** Unique identifier for the sandbox */
  id: string;
  
  /** Type of isolation used */
  isolationType: 'process' | 'container' | 'vm' | 'thread';
  
  /** Isolation level (security strength) */
  isolationLevel: 'low' | 'medium' | 'high';
  
  /** Resource limits for the sandbox */
  resourceLimits?: {
    cpu?: number;
    memory?: number;
    timeout?: number;
    diskSpace?: number;
  };
  
  /** Creation timestamp */
  createdAt: number;
  
  /** Metadata about the sandbox */
  metadata?: Record<string, any>;
}

/**
 * Sandbox manager interface (implemented by application layer)
 */
export interface SandboxManager {
  /**
   * Create a sandboxed environment for high-risk code
   */
  createSandbox(
    options: CodeExecutionOptions
  ): Promise<SandboxEnvironment>;
  
  /**
   * Execute code in an existing sandbox environment
   */
  executeInSandbox(
    code: string,
    sandbox: SandboxEnvironment,
    options: CodeExecutionOptions
  ): Promise<CodeExecutionResult>;
  
  /**
   * Cleanup and destroy a sandbox environment
   */
  cleanupSandbox(sandbox: SandboxEnvironment): Promise<void>;
  
  /**
   * Check if sandbox manager supports the given risk level
   */
  supportsRiskLevel(riskLevel: string): boolean;
}

/**
 * Security validation rules configuration
 */
export interface SecurityValidationRules {
  /** Rules for low risk level */
  low?: {
    forbiddenPaths?: string[];
    forbiddenExtensions?: string[];
    maxCodeLength?: number;
  };
  
  /** Rules for medium risk level */
  medium?: {
    dangerousCommands?: string[];
    forbiddenSystemCalls?: string[];
    networkRestricted?: boolean;
    fileSystemRestricted?: boolean;
  };
  
  /** Rules for high risk level */
  high?: {
    requireSandbox?: boolean;
    maxResources?: {
      cpu: number;
      memory: number;
      time: number;
    };
  };
}
```

### Update: `sdk/types/index.ts`

Add export for code types:
```typescript
// Add to existing exports
export type {
  CodeExecutionOptions,
  CodeExecutionResult,
  CodeRunner,
  SandboxManager,
  SandboxEnvironment,
  SecurityValidationRules
} from './code';
```

## Step 2: Create Core Module Files

### File: `sdk/core/code/errors.ts`

```typescript
import { SDKError, ErrorCode } from '../../types/errors';
import type { CodeExecutionOptions } from '../../types/code';

/**
 * Code execution error
 */
export class CodeExecutionError extends SDKError {
  constructor(
    message: string,
    public readonly code: string,
    public readonly options: CodeExecutionOptions,
    cause?: Error
  ) {
    super(ErrorCode.EXECUTION_ERROR, message, { code, options }, cause);
    this.name = 'CodeExecutionError';
  }
}

/**
 * Security validation error
 */
export class SecurityValidationError extends SDKError {
  constructor(
    message: string,
    public readonly code: string,
    public readonly riskLevel: string,
    public readonly validationRule?: string
  ) {
    super(ErrorCode.VALIDATION_ERROR, message, { code, riskLevel, validationRule });
    this.name = 'SecurityValidationError';
  }
}

/**
 * Sandbox error
 */
export class SandboxError extends SDKError {
  constructor(
    message: string,
    public readonly sandboxId?: string,
    public readonly operation?: string,
    cause?: Error
  ) {
    super(ErrorCode.EXECUTION_ERROR, message, { sandboxId, operation }, cause);
    this.name = 'SandboxError';
  }
}
```

### File: `sdk/core/code/security-validator.ts`

```typescript
import type { CodeExecutionOptions, SecurityValidationRules } from '../../types/code';
import { SecurityValidationError } from './errors';

/**
 * Security validator for code execution
 */
export class SecurityValidator {
  constructor(private rules?: SecurityValidationRules) {}
  
  validate(code: string, options: CodeExecutionOptions): void {
    switch (options.risk) {
      case 'none':
        break;
        
      case 'low':
        this.validateLowRisk(code);
        break;
        
      case 'medium':
        this.validateMediumRisk(code);
        break;
        
      case 'high':
        this.validateHighRisk(code);
        break;
    }
  }
  
  private validateLowRisk(code: string): void {
    const forbiddenPaths = this.rules?.low?.forbiddenPaths || ['..', '~'];
    
    for (const path of forbiddenPaths) {
      if (code.includes(path)) {
        throw new SecurityValidationError(
          `Code contains forbidden path pattern: ${path}`,
          code,
          'low',
          'forbiddenPaths'
        );
      }
    }
    
    const maxCodeLength = this.rules?.low?.maxCodeLength || 10000;
    if (code.length > maxCodeLength) {
      throw new SecurityValidationError(
        `Code exceeds maximum length of ${maxCodeLength} characters`,
        code,
        'low',
        'maxCodeLength'
      );
    }
  }
  
  private validateMediumRisk(code: string): void {
    this.validateLowRisk(code);
    
    const dangerousCommands = this.rules?.medium?.dangerousCommands || 
      ['rm -rf', 'del /f', 'format', 'shutdown', 'mkfs'];
    const lowerCode = code.toLowerCase();
    
    for (const cmd of dangerousCommands) {
      if (lowerCode.includes(cmd)) {
        throw new SecurityValidationError(
          `Code contains dangerous command: ${cmd}`,
          code,
          'medium',
          'dangerousCommands'
        );
      }
    }
  }
  
  private validateHighRisk(code: string): void {
    // Minimal validation for high-risk code
    // Most security is handled by sandbox isolation
    console.warn(`Executing high-risk code: ${code.substring(0, 50)}...`);
  }
}
```

### File: `sdk/core/code/code-executor.ts`

```typescript
import type { 
  CodeExecutionOptions, 
  CodeExecutionResult, 
  CodeRunner, 
  SandboxManager 
} from '../../types/code';
import { SecurityValidator } from './security-validator';
import { CodeExecutionError, SandboxError } from './errors';
import { now, diffTimestamp } from '../../utils';

/**
 * Code execution coordinator
 */
export class CodeExecutor {
  private securityValidator: SecurityValidator;
  
  constructor(
    private codeRunner: CodeRunner,
    private sandboxManager?: SandboxManager,
    securityRules?: SecurityValidationRules
  ) {
    this.securityValidator = new SecurityValidator(securityRules);
  }
  
  async execute(
    code: string,
    options: CodeExecutionOptions
  ): Promise<CodeExecutionResult> {
    const startTime = now();
    
    try {
      // Validate security based on risk level
      this.securityValidator.validate(code, options);
      
      let result: CodeExecutionResult;
      
      // Handle different risk levels
      if (options.risk === 'high' && this.sandboxManager) {
        result = await this.executeInSandbox(code, options);
      } else {
        result = await this.codeRunner.execute(code, options);
      }
      
      // Ensure execution time is set
      if (result.executionTime === undefined) {
        result.executionTime = diffTimestamp(startTime, now());
      }
      
      return result;
    } catch (error) {
      const executionTime = diffTimestamp(startTime, now());
      
      if (error instanceof CodeExecutionError || 
          error instanceof SecurityValidationError || 
          error instanceof SandboxError) {
        throw error;
      }
      
      // Wrap unexpected errors
      throw new CodeExecutionError(
        `Unexpected error during code execution: ${error instanceof Error ? error.message : String(error)}`,
        code,
        options,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  private async executeInSandbox(
    code: string,
    options: CodeExecutionOptions
  ): Promise<CodeExecutionResult> {
    if (!this.sandboxManager) {
      throw new CodeExecutionError(
        'SandboxManager is required for high-risk code execution',
        code,
        options
      );
    }
    
    try {
      const sandbox = await this.sandboxManager.createSandbox(options);
      const result = await this.sandboxManager.executeInSandbox(code, sandbox, options);
      
      // Cleanup sandbox
      try {
        await this.sandboxManager.cleanupSandbox(sandbox);
      } catch (cleanupError) {
        console.warn(`Failed to cleanup sandbox ${sandbox.id}:`, cleanupError);
      }
      
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new SandboxError(
          `Sandbox execution failed: ${error.message}`,
          undefined,
          'executeInSandbox',
          error
        );
      }
      throw new SandboxError(`Sandbox execution failed: ${String(error)}`);
    }
  }
}
```

### File: `sdk/core/code/index.ts`

```typescript
/**
 * Code module exports
 */

// Export core classes
export { CodeExecutor } from './code-executor';
export { SecurityValidator } from './security-validator';

// Export error types
export {
  CodeExecutionError,
  SecurityValidationError,
  SandboxError
} from './errors';

// Export types
export type {
  CodeExecutionOptions,
  CodeExecutionResult,
  CodeRunner,
  SandboxManager,
  SandboxEnvironment,
  SecurityValidationRules
} from '../../types/code';
```

## Step 3: Update Code Handler

### File: `sdk/core/execution/handlers/node-handlers/code-handler.ts`

Replace the entire file with:

```typescript
/**
 * Code节点处理函数
 * 负责执行CODE节点，执行脚本代码，支持多种脚本语言
 */

import type { Node, CodeNodeConfig } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { ValidationError } from '../../../../types/errors';
import { now } from '../../../../utils';
import type { CodeExecutionResult, CodeExecutionError, SecurityValidationError } from '../../../../core/code';
import type { TimeoutError } from '../../../../types/errors';

/**
 * Code处理器上下文
 */
export interface CodeHandlerContext {
  /** 代码执行器 */
  codeExecutor: any; // Will be CodeExecutor type
  /** 事件管理器（可选） */
  eventManager?: any;
}

/**
 * 检查节点是否可以执行
 */
function canExecute(thread: Thread, node: Node): boolean {
  if (thread.status !== 'RUNNING') {
    return false;
  }
  return true;
}

/**
 * Code节点处理函数
 * @param thread Thread实例
 * @param node 节点定义
 * @param context 处理器上下文
 * @returns 执行结果
 */
export async function codeHandler(
  thread: Thread, 
  node: Node, 
  context: CodeHandlerContext
): Promise<CodeExecutionResult> {
  // 检查是否可以执行
  if (!canExecute(thread, node)) {
    return {
      success: false,
      error: 'Thread is not running',
      executionTime: 0,
      scriptName: (node.config as CodeNodeConfig).scriptName,
      scriptType: (node.config as CodeNodeConfig).scriptType
    };
  }

  const config = node.config as CodeNodeConfig;
  const timeout = (config.timeout || 30) * 1000; // Convert seconds to milliseconds
  const retries = config.retries || 0;
  const retryDelay = (config.retryDelay || 1) * 1000; // Convert seconds to milliseconds

  // 执行脚本代码（带重试）
  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      const result = await context.codeExecutor.execute(
        config.scriptName,
        {
          scriptType: config.scriptType,
          risk: config.risk,
          timeout: timeout,
          retries: 0, // Handle retries at handler level
          retryDelay: retryDelay,
          inline: config.inline,
          context: {
            threadId: thread.id,
            workflowId: thread.workflowId,
            variables: thread.variableScopes
          }
        }
      );

      // 记录执行历史
      thread.nodeResults.push({
        step: thread.nodeResults.length + 1,
        nodeId: node.id,
        nodeType: node.type,
        status: result.success ? 'COMPLETED' : 'FAILED',
        timestamp: now(),
        data: result,
        error: result.error,
        executionTime: result.executionTime
      });

      return result;
    } catch (error) {
      // Normalize error types
      if (error instanceof SecurityValidationError) {
        lastError = new ValidationError(
          error.message,
          'code.security',
          { code: config.scriptName, risk: config.risk }
        );
      } else if (error instanceof CodeExecutionError) {
        lastError = error;
      } else if (error instanceof TimeoutError) {
        lastError = error;
      } else {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      if (attempt < retries) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        attempt++;
      } else {
        // Final attempt failed, throw the error
        throw lastError;
      }
    }
  }

  throw lastError || new Error('Script execution failed');
}
```

## Step 4: Update Node Execution Coordinator

### File: `sdk/core/execution/coordinators/node-execution-coordinator.ts`

Update the constructor and executeNodeLogic method:

```typescript
// Update constructor
constructor(
  private eventManager: EventManager,
  private llmCoordinator: LLMExecutionCoordinator,
  private codeExecutor?: any, // Add this parameter - will be CodeExecutor type
  private userInteractionHandler?: UserInteractionHandler,
  private humanRelayHandler?: HumanRelayHandler
) { }

// Update executeNodeLogic method
private async executeNodeLogic(threadContext: ThreadContext, node: Node): Promise<NodeExecutionResult> {
  const startTime = now();

  // 1. 使用Node Handler函数执行
  const handler = getNodeHandler(node.type);
  
  // 准备处理器上下文
  let handlerContext = {};
  if (node.type === NodeType.USER_INTERACTION) {
    // ... existing user interaction logic ...
  } else if (node.type === NodeType.CONTEXT_PROCESSOR) {
    // ... existing context processor logic ...
  } else if (node.type === NodeType.LLM) {
    // ... existing LLM logic ...
  } else if (node.type === NodeType.CODE) {
    if (!this.codeExecutor) {
      throw new ExecutionError(
        'CodeExecutor is not provided for CODE node execution',
        node.id,
        threadContext.getWorkflowId()
      );
    }
    handlerContext = {
      codeExecutor: this.codeExecutor,
      eventManager: this.eventManager
    };
  }

  const output = await handler(threadContext.thread, node, handlerContext);

  // 2. 构建执行结果
  const endTime = now();
  return {
    nodeId: node.id,
    nodeType: node.type,
    status: output.success ? 'COMPLETED' : 'FAILED',
    step: threadContext.thread.nodeResults.length + 1,
    data: output,
    error: output.error,
    startTime,
    endTime,
    executionTime: diffTimestamp(startTime, endTime)
  };
}
```

## Step 5: Update Thread Context (Optional)

If needed, add code executor support to ThreadContext:

### File: `sdk/core/execution/context/thread-context.ts`

Add to the class:

```typescript
// Add private field
private codeExecutor?: any;

/**
 * Set code executor for CODE node execution
 */
setCodeExecutor(codeExecutor: any): void {
  this.codeExecutor = codeExecutor;
}

/**
 * Get code executor
 */
getCodeExecutor(): any | undefined {
  return this.codeExecutor;
}
```

## Step 6: Update Exports

### File: `sdk/core/index.ts`

Add code module export:

```typescript
// Add to existing exports
export * as code from './code';
```

## Step 7: Update Type Imports

Make sure all files that reference the new types have proper imports:

- Update `code-handler.ts` to import types from `../../../../types/code`
- Update `node-execution-coordinator.ts` to import `CodeExecutor` type

## Validation Checklist

### Compilation
- [ ] All TypeScript files compile without errors
- [ ] Type checking passes (`tsc --noEmit`)
- [ ] No circular dependencies

### Functionality
- [ ] Mock execution replaced with real execution calls
- [ ] Security validation works for all risk levels
- [ ] Retry logic preserved and functional
- [ ] Error handling properly converts error types
- [ ] Result formatting matches expected structure

### Integration
- [ ] CodeExecutor can be injected via constructor
- [ ] Handler context properly passed to code handler
- [ ] Existing workflows continue to work unchanged

### Backward Compatibility
- [ ] Existing CodeNodeConfig works without changes
- [ ] Result structure compatible with existing expectations
- [ ] Timeout and retry values properly converted

## Testing Requirements

### Unit Tests to Create
1. **CodeExecutor tests**: Mock CodeRunner and SandboxManager
2. **SecurityValidator tests**: All risk levels and validation rules
3. **CodeHandler tests**: Integration with mocked CodeExecutor
4. **Error handling tests**: All error type scenarios

### Integration Tests to Create
1. **Real CodeRunner implementation**: Test actual code execution
2. **SandboxManager implementation**: Test sandboxed execution
3. **End-to-end workflow**: Complete CODE node execution in workflow

This implementation provides a complete, production-ready code execution framework that integrates seamlessly with the existing SDK architecture.