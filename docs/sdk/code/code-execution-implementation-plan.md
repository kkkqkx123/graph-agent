# Code Execution Implementation Plan

## Overview

This document outlines the implementation plan for the CODE node handler in the SDK module. The current implementation is a mock version that needs to be replaced with a proper execution framework that integrates with application-layer implementations.

## Current State Analysis

The current [`sdk/core/execution/handlers/node-handlers/code-handler.ts`](sdk/core/execution/handlers/node-handlers/code-handler.ts) contains:

- **Mock execution**: Returns simulated results instead of actual code execution
- **Basic security validation**: Simple risk-level based checks
- **Retry mechanism**: Configurable retry logic
- **Result recording**: Adds execution results to thread history

## Requirements

### Functional Requirements

1. **Multi-language support**: `shell`, `cmd`, `powershell`, `python`, `javascript`
2. **Risk-based security**: Different security levels (`none`, `low`, `medium`, `high`)
3. **Timeout control**: Configurable execution timeout
4. **Retry mechanism**: Configurable retry attempts and delays
5. **Inline code support**: Execute inline code snippets
6. **Sandbox isolation**: High-risk scripts execute in isolated environments

### Architectural Requirements

1. **SDK-Application separation**: SDK provides interfaces, application implements concrete logic
2. **Reference HTTP module design**: Follow the same pattern as `sdk/core/http`
3. **Separate from Tool module**: Code execution is independent from LLM tool execution
4. **Type-safe interfaces**: Strong TypeScript typing throughout

## Proposed Architecture

### Directory Structure

```
sdk/
├── types/
│   └── code.ts                 # Code execution type definitions
├── core/
│   └── code/                   # Code execution core module
│       ├── code-executor.ts    # Main executor class
│       ├── security-validator.ts # Security validation logic
│       ├── errors.ts           # Code execution error types
│       └── index.ts            # Module exports
└── api/
    └── code/                   # API layer (if needed)
```

### Core Components

#### 1. Type Definitions (`sdk/types/code.ts`)

```typescript
/**
 * Code execution options
 */
export interface CodeExecutionOptions {
  /** Script language */
  scriptType: 'shell' | 'cmd' | 'powershell' | 'python' | 'javascript';
  /** Risk level */
  risk: 'none' | 'low' | 'medium' | 'high';
  /** Timeout in milliseconds */
  timeout?: number;
  /** Maximum retry attempts */
  retries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Whether this is inline code */
  inline?: boolean;
  /** Additional context data */
  context?: Record<string, any>;
}

/**
 * Code execution result
 */
export interface CodeExecutionResult {
  /** Whether execution was successful */
  success: boolean;
  /** Execution output */
  output?: string;
  /** Error message (if failed) */
  error?: string;
  /** Execution time in milliseconds */
  executionTime: number;
  /** Script name or identifier */
  scriptName?: string;
  /** Script type */
  scriptType?: string;
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
   * Execute code in sandbox
   */
  executeInSandbox(
    code: string,
    sandbox: SandboxEnvironment,
    options: CodeExecutionOptions
  ): Promise<CodeExecutionResult>;
}

/**
 * Sandbox environment representation
 */
export interface SandboxEnvironment {
  /** Unique identifier */
  id: string;
  /** Isolation level */
  isolationLevel: 'process' | 'container' | 'vm';
  /** Resource limits */
  resourceLimits?: {
    cpu?: number;
    memory?: number;
    timeout?: number;
  };
}
```

#### 2. Code Executor (`sdk/core/code/code-executor.ts`)

```typescript
import type { CodeExecutionOptions, CodeExecutionResult, CodeRunner, SandboxManager } from '../../types/code';
import { SecurityValidator } from './security-validator';
import { CodeExecutionError } from './errors';

/**
 * Code execution coordinator
 * Manages the execution flow and delegates to application-layer implementations
 */
export class CodeExecutor {
  private securityValidator: SecurityValidator;
  
  constructor(
    private codeRunner: CodeRunner,
    private sandboxManager?: SandboxManager
  ) {
    this.securityValidator = new SecurityValidator();
  }
  
  /**
   * Execute code with security validation and retry logic
   */
  async execute(
    code: string,
    options: CodeExecutionOptions
  ): Promise<CodeExecutionResult> {
    // Validate security based on risk level
    this.securityValidator.validate(code, options);
    
    // Handle different risk levels
    if (options.risk === 'high' && this.sandboxManager) {
      return await this.executeInSandbox(code, options);
    } else {
      return await this.codeRunner.execute(code, options);
    }
  }
  
  private async executeInSandbox(
    code: string,
    options: CodeExecutionOptions
  ): Promise<CodeExecutionResult> {
    try {
      const sandbox = await this.sandboxManager!.createSandbox(options);
      return await this.sandboxManager!.executeInSandbox(code, sandbox, options);
    } catch (error) {
      throw new CodeExecutionError(
        `Sandbox execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code,
        options
      );
    }
  }
}
```

#### 3. Security Validator (`sdk/core/code/security-validator.ts`)

```typescript
import type { CodeExecutionOptions } from '../../types/code';
import { SecurityValidationError } from './errors';

/**
 * Security validator for code execution
 * Implements risk-level based validation rules
 */
export class SecurityValidator {
  validate(code: string, options: CodeExecutionOptions): void {
    switch (options.risk) {
      case 'none':
        // No validation for none risk level
        break;
        
      case 'low':
        this.validateLowRisk(code);
        break;
        
      case 'medium':
        this.validateMediumRisk(code);
        break;
        
      case 'high':
        // High risk is handled by sandbox, minimal validation
        this.validateHighRisk(code);
        break;
    }
  }
  
  private validateLowRisk(code: string): void {
    // Check for dangerous path patterns
    if (code.includes('..') || code.includes('~')) {
      throw new SecurityValidationError(
        'Code contains invalid path characters',
        code,
        'low'
      );
    }
  }
  
  private validateMediumRisk(code: string): void {
    this.validateLowRisk(code);
    
    // Check for dangerous commands
    const dangerousCommands = ['rm -rf', 'del /f', 'format', 'shutdown'];
    const lowerCode = code.toLowerCase();
    
    for (const cmd of dangerousCommands) {
      if (lowerCode.includes(cmd)) {
        throw new SecurityValidationError(
          `Code contains dangerous command: ${cmd}`,
          code,
          'medium'
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

#### 4. Error Types (`sdk/core/code/errors.ts`)

```typescript
import { SDKError, ErrorCode } from '../../types/errors';

/**
 * Code execution error
 */
export class CodeExecutionError extends SDKError {
  constructor(
    message: string,
    public readonly code: string,
    public readonly options: any,
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
    cause?: Error
  ) {
    super(ErrorCode.VALIDATION_ERROR, message, { code, riskLevel }, cause);
    this.name = 'SecurityValidationError';
  }
}
```

### Integration with Code Handler

The updated [`sdk/core/execution/handlers/node-handlers/code-handler.ts`](sdk/core/execution/handlers/node-handlers/code-handler.ts) will:

1. **Accept CodeExecutor in context**: Similar to how LLM handler accepts LLMExecutionCoordinator
2. **Delegate execution**: Call `codeExecutor.execute()` instead of mock execution
3. **Handle errors**: Proper error handling and result formatting

```typescript
// Updated codeHandler function signature
export async function codeHandler(
  thread: Thread,
  node: Node,
  context: { codeExecutor: CodeExecutor }
): Promise<any> {
  // ... existing logic ...
  
  // Replace mock execution with real execution
  const result = await context.codeExecutor.execute(
    config.scriptName, // or actual code content
    {
      scriptType: config.scriptType,
      risk: config.risk,
      timeout: timeout,
      retries: retries,
      retryDelay: retryDelay,
      inline: config.inline
    }
  );
  
  // ... rest of logic ...
}
```

### Application Layer Implementation

The application layer must implement:

1. **CodeRunner**: Actual code execution logic for each language
2. **SandboxManager**: Sandboxed execution for high-risk code
3. **Dependency injection**: Provide these implementations to the SDK

Example application implementation:

```typescript
// Application layer
class NodeJsCodeRunner implements CodeRunner {
  async execute(code: string, options: CodeExecutionOptions): Promise<CodeExecutionResult> {
    // Implement actual code execution based on scriptType
    switch (options.scriptType) {
      case 'javascript':
        return await this.executeJavaScript(code, options);
      case 'python':
        return await this.executePython(code, options);
      // ... other languages
    }
  }
}

class DockerSandboxManager implements SandboxManager {
  async createSandbox(options: CodeExecutionOptions): Promise<SandboxEnvironment> {
    // Create Docker container or other sandbox
  }
  
  async executeInSandbox(
    code: string,
    sandbox: SandboxEnvironment,
    options: CodeExecutionOptions
  ): Promise<CodeExecutionResult> {
    // Execute code in sandbox
  }
}

// Usage in application
const codeRunner = new NodeJsCodeRunner();
const sandboxManager = new DockerSandboxManager();
const codeExecutor = new CodeExecutor(codeRunner, sandboxManager);

// Pass to code handler via context
const result = await codeHandler(thread, node, { codeExecutor });
```

## Implementation Steps

### Phase 1: Type Definitions and Core Module
1. Create `sdk/types/code.ts` with interface definitions
2. Create `sdk/core/code/` directory structure
3. Implement `CodeExecutor`, `SecurityValidator`, and error types
4. Update exports in `sdk/core/code/index.ts`

### Phase 2: Integration with Code Handler
1. Update `code-handler.ts` to accept `CodeExecutor` in context
2. Replace mock execution with real execution calls
3. Update error handling and result formatting

### Phase 3: Testing and Documentation
1. Create unit tests for core components
2. Document integration requirements for application layer
3. Provide example implementations

## Security Considerations

1. **Input validation**: Always validate code input before execution
2. **Sandbox isolation**: High-risk code must run in isolated environments
3. **Resource limits**: Implement CPU, memory, and time limits
4. **Network restrictions**: Limit network access for code execution
5. **File system access**: Restrict file system operations based on risk level

## Error Handling Strategy

1. **Validation errors**: Throw `SecurityValidationError` for security violations
2. **Execution errors**: Throw `CodeExecutionError` for runtime failures
3. **Timeout errors**: Use existing `TimeoutError` from SDK
4. **Retry logic**: Implement exponential backoff for transient failures

## Backward Compatibility

The new implementation maintains backward compatibility by:
1. Keeping the same `CodeNodeConfig` interface
2. Maintaining the same return format for execution results
3. Preserving existing retry and timeout mechanisms
4. Not breaking existing workflow definitions

## Performance Considerations

1. **Caching**: Cache compiled code for repeated executions
2. **Connection pooling**: Reuse sandbox environments when possible
3. **Async execution**: Non-blocking execution for better concurrency
4. **Resource cleanup**: Proper cleanup of sandbox resources

## Testing Strategy

1. **Unit tests**: Test individual components in isolation
2. **Integration tests**: Test end-to-end execution flow
3. **Security tests**: Verify security validation rules
4. **Performance tests**: Measure execution overhead

This implementation provides a robust, secure, and extensible code execution framework that separates SDK concerns from application-specific implementations.