# Code Execution Type Definitions

## Overview

This document provides detailed type definitions for the code execution module, ensuring clear interfaces between SDK and application layers.

## Core Types

### CodeExecutionOptions

```typescript
/**
 * Code execution options
 * Configuration for code execution behavior
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
```

### CodeExecutionResult

```typescript
/**
 * Code execution result
 * Standardized result format for all code executions
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
```

### CodeRunner Interface

```typescript
/**
 * Code runner interface
 * Implemented by application layer to provide actual code execution
 */
export interface CodeRunner {
  /**
   * Execute code with given options
   * @param code - The code to execute (file path or inline code)
   * @param options - Execution options
   * @returns Promise resolving to execution result
   * @throws CodeExecutionError if execution fails
   */
  execute(
    code: string,
    options: CodeExecutionOptions
  ): Promise<CodeExecutionResult>;
  
  /**
   * Validate if the runner can handle the given script type
   * @param scriptType - Script type to validate
   * @returns boolean indicating support
   */
  supportsScriptType(scriptType: string): boolean;
  
  /**
   * Get runner metadata
   * @returns Runner information and capabilities
   */
  getMetadata(): {
    name: string;
    version: string;
    supportedTypes: string[];
    capabilities: string[];
  };
}
```

### SandboxManager Interface

```typescript
/**
 * Sandbox manager interface
 * Implemented by application layer for secure high-risk execution
 */
export interface SandboxManager {
  /**
   * Create a sandboxed environment for high-risk code
   * @param options - Execution options including risk level
   * @returns Promise resolving to sandbox environment
   * @throws CodeExecutionError if sandbox creation fails
   */
  createSandbox(
    options: CodeExecutionOptions
  ): Promise<SandboxEnvironment>;
  
  /**
   * Execute code in an existing sandbox environment
   * @param code - The code to execute
   * @param sandbox - The sandbox environment to use
   * @param options - Execution options
   * @returns Promise resolving to execution result
   * @throws CodeExecutionError if execution fails
   */
  executeInSandbox(
    code: string,
    sandbox: SandboxEnvironment,
    options: CodeExecutionOptions
  ): Promise<CodeExecutionResult>;
  
  /**
   * Cleanup and destroy a sandbox environment
   * @param sandbox - The sandbox environment to cleanup
   * @returns Promise resolving when cleanup is complete
   */
  cleanupSandbox(sandbox: SandboxEnvironment): Promise<void>;
  
  /**
   * Check if sandbox manager supports the given risk level
   * @param riskLevel - Risk level to check
   * @returns boolean indicating support
   */
  supportsRiskLevel(riskLevel: string): boolean;
}
```

### SandboxEnvironment

```typescript
/**
 * Sandbox environment representation
 * Describes the isolated execution environment
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
    /** CPU limit as percentage (0-100) */
    cpu?: number;
    
    /** Memory limit in MB */
    memory?: number;
    
    /** Execution timeout in milliseconds */
    timeout?: number;
    
    /** Maximum file system size in MB */
    diskSpace?: number;
  };
  
  /** Network access restrictions */
  networkRestrictions?: {
    /** Whether network access is allowed */
    enabled: boolean;
    
    /** Allowed host patterns (regex) */
    allowedHosts?: string[];
    
    /** Blocked host patterns (regex) */
    blockedHosts?: string[];
  };
  
  /** File system access restrictions */
  fileSystemRestrictions?: {
    /** Whether file system access is allowed */
    enabled: boolean;
    
    /** Allowed directories (read/write) */
    allowedDirectories?: string[];
    
    /** Read-only directories */
    readOnlyDirectories?: string[];
    
    /** Blocked directories */
    blockedDirectories?: string[];
  };
  
  /** Creation timestamp */
  createdAt: number;
  
  /** Metadata about the sandbox */
  metadata?: Record<string, any>;
}
```

## Error Types

### CodeExecutionError

```typescript
/**
 * Code execution error
 * Thrown when code execution fails for any reason
 */
export class CodeExecutionError extends SDKError {
  constructor(
    message: string,
    public readonly code: string,
    public readonly options: CodeExecutionOptions,
    public readonly originalError?: Error
  ) {
    super(
      ErrorCode.EXECUTION_ERROR,
      message,
      { 
        code, 
        options,
        originalError: originalError?.message 
      },
      originalError
    );
    this.name = 'CodeExecutionError';
  }
}
```

### SecurityValidationError

```typescript
/**
 * Security validation error
 * Thrown when code fails security validation based on risk level
 */
export class SecurityValidationError extends SDKError {
  constructor(
    message: string,
    public readonly code: string,
    public readonly riskLevel: string,
    public readonly validationRule?: string
  ) {
    super(
      ErrorCode.VALIDATION_ERROR,
      message,
      { 
        code, 
        riskLevel,
        validationRule 
      }
    );
    this.name = 'SecurityValidationError';
  }
}
```

### SandboxError

```typescript
/**
 * Sandbox error
 * Thrown when sandbox operations fail
 */
export class SandboxError extends SDKError {
  constructor(
    message: string,
    public readonly sandboxId?: string,
    public readonly operation?: string,
    cause?: Error
  ) {
    super(
      ErrorCode.EXECUTION_ERROR,
      message,
      { 
        sandboxId, 
        operation 
      },
      cause
    );
    this.name = 'SandboxError';
  }
}
```

## Integration Types

### CodeHandlerContext

```typescript
/**
 * Code handler context
 * Passed to codeHandler function for execution coordination
 */
export interface CodeHandlerContext {
  /** Main code executor instance */
  codeExecutor: CodeExecutor;
  
  /** Optional event manager for logging and monitoring */
  eventManager?: EventManager;
  
  /** Optional thread context for variable access */
  threadContext?: ThreadContext;
}
```

### SecurityValidationRules

```typescript
/**
 * Security validation rules configuration
 * Allows customization of security rules per risk level
 */
export interface SecurityValidationRules {
  /** Rules for low risk level */
  low?: {
    /** Forbidden path patterns */
    forbiddenPaths?: string[];
    
    /** Forbidden file extensions */
    forbiddenExtensions?: string[];
    
    /** Maximum code length */
    maxCodeLength?: number;
  };
  
  /** Rules for medium risk level */
  medium?: {
    /** Dangerous commands to block */
    dangerousCommands?: string[];
    
    /** Forbidden system calls */
    forbiddenSystemCalls?: string[];
    
    /** Network restrictions */
    networkRestricted?: boolean;
    
    /** File system restrictions */
    fileSystemRestricted?: boolean;
  };
  
  /** Rules for high risk level */
  high?: {
    /** Always require sandbox */
    requireSandbox?: boolean;
    
    /** Maximum resource usage */
    maxResources?: {
      cpu: number;
      memory: number;
      time: number;
    };
  };
}
```

## Extension Points

### CustomValidator Interface

```typescript
/**
 * Custom validator interface
 * Allows application layer to provide custom security validation
 */
export interface CustomValidator {
  /**
   * Validate code against custom rules
   * @param code - Code to validate
   * @param options - Execution options
   * @returns Validation result
   */
  validate(code: string, options: CodeExecutionOptions): ValidationResult;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  
  /** Error messages if validation failed */
  errors: string[];
  
  /** Warning messages if validation has warnings */
  warnings: string[];
}
```

### ExecutionHook Interface

```typescript
/**
 * Execution hook interface
 * Allows application layer to intercept execution lifecycle
 */
export interface ExecutionHook {
  /** Called before code execution */
  beforeExecute?(code: string, options: CodeExecutionOptions): Promise<void>;
  
  /** Called after code execution */
  afterExecute?(result: CodeExecutionResult, options: CodeExecutionOptions): Promise<void>;
  
  /** Called on execution error */
  onError?(error: Error, code: string, options: CodeExecutionOptions): Promise<void>;
}
```

## Compatibility Considerations

### Backward Compatibility

The new types maintain compatibility with existing `CodeNodeConfig`:

```typescript
// Existing CodeNodeConfig from node.ts
export interface CodeNodeConfig {
  scriptName: string;
  scriptType: 'shell' | 'cmd' | 'powershell' | 'python' | 'javascript';
  risk: 'none' | 'low' | 'medium' | 'high';
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  inline?: boolean;
}

// Maps directly to CodeExecutionOptions
const options: CodeExecutionOptions = {
  scriptType: config.scriptType,
  risk: config.risk,
  timeout: (config.timeout || 30) * 1000, // Convert seconds to milliseconds
  retries: config.retries || 0,
  retryDelay: (config.retryDelay || 1) * 1000, // Convert seconds to milliseconds
  inline: config.inline
};
```

### Forward Compatibility

The design allows for future extensions:

- New script types can be added without breaking changes
- New risk levels can be introduced
- Additional execution options can be added
- Custom validators and hooks provide extensibility

## Usage Examples

### Basic Usage

```typescript
// Application layer implementation
const codeRunner = new MyCodeRunner();
const codeExecutor = new CodeExecutor(codeRunner);

const result = await codeExecutor.execute('console.log("Hello")', {
  scriptType: 'javascript',
  risk: 'low',
  timeout: 5000
});
```

### High-Risk Execution with Sandbox

```typescript
const codeRunner = new MyCodeRunner();
const sandboxManager = new MySandboxManager();
const codeExecutor = new CodeExecutor(codeRunner, sandboxManager);

const result = await codeExecutor.execute('rm -rf /', {
  scriptType: 'shell',
  risk: 'high',
  timeout: 10000
});
// This will automatically use sandbox due to high risk level
```

### Custom Security Rules

```typescript
const validator = new SecurityValidator({
  low: {
    forbiddenPaths: ['..', '~', '/etc'],
    maxCodeLength: 1000
  },
  medium: {
    dangerousCommands: ['rm', 'del', 'format', 'shutdown'],
    networkRestricted: true
  }
});

const codeExecutor = new CodeExecutor(codeRunner, undefined, validator);
```

This comprehensive type system ensures type safety, clear interfaces, and extensibility while maintaining the separation between SDK core logic and application-specific implementations.