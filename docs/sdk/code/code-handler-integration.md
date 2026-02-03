# Code Handler Integration Plan

## Overview

This document outlines the integration plan for replacing the mock implementation in [`sdk/core/execution/handlers/node-handlers/code-handler.ts`](sdk/core/execution/handlers/node-handlers/code-handler.ts) with the new code execution framework.

## Current Implementation Analysis

### Current Structure
The current `code-handler.ts` contains:

1. **Execution state check** (`canExecute`)
2. **Risk validation** (`validateRiskLevel`) 
3. **Mock execution** (`executeScript`)
4. **Retry mechanism**
5. **Result recording**

### Limitations
- Mock execution doesn't actually run code
- Limited security validation
- No integration with application layer
- No proper error handling for real execution scenarios

## Integration Strategy

### Step 1: Update Handler Function Signature

Change the `codeHandler` function to accept a `CodeHandlerContext`:

```typescript
// Before
export async function codeHandler(thread: Thread, node: Node, context?: any): Promise<any>

// After  
export async function codeHandler(
  thread: Thread, 
  node: Node, 
  context: CodeHandlerContext
): Promise<CodeExecutionResult>
```

### Step 2: Replace Mock Execution

Replace the `executeScript` function call with actual code execution:

```typescript
// Before (mock execution)
const result = await executeScript(config, timeout);

// After (real execution)
const result = await context.codeExecutor.execute(
  config.scriptName,
  {
    scriptType: config.scriptType,
    risk: config.risk,
    timeout: timeout,
    retries: retries,
    retryDelay: retryDelay,
    inline: config.inline,
    // Additional context from thread if needed
    context: {
      threadId: thread.id,
      workflowId: thread.workflowId,
      variables: thread.variableScopes
    }
  }
);
```

### Step 3: Enhanced Error Handling

Update error handling to work with real execution errors:

```typescript
// Before
catch (error) {
  lastError = error instanceof Error ? error : new Error(String(error));
  // ... retry logic
}

// After
catch (error) {
  if (error instanceof SecurityValidationError) {
    // Handle security validation errors specifically
    throw new ValidationError(
      error.message,
      'code.security',
      { code: config.scriptName, risk: config.risk }
    );
  } else if (error instanceof CodeExecutionError) {
    // Handle execution errors
    lastError = error;
  } else if (error instanceof TimeoutError) {
    // Handle timeout errors (already exists in SDK)
    lastError = error;
  } else {
    // Handle unexpected errors
    lastError = new CodeExecutionError(
      `Unexpected error during code execution: ${error}`,
      config.scriptName,
      {
        scriptType: config.scriptType,
        risk: config.risk,
        timeout: timeout
      },
      error instanceof Error ? error : undefined
    );
  }
  
  // ... retry logic remains the same
}
```

### Step 4: Result Formatting

Ensure the result format matches the expected `NodeExecutionResult` structure:

```typescript
// The CodeExecutionResult should be compatible with existing result structure
thread.nodeResults.push({
  step: thread.nodeResults.length + 1,
  nodeId: node.id,
  nodeType: node.type,
  status: result.success ? 'COMPLETED' : 'FAILED',
  timestamp: now(),
  data: result, // Full execution result
  error: result.error,
  executionTime: result.executionTime
});
```

## Context Integration

### ThreadContext Integration

The `CodeHandlerContext` should be available through the existing `ThreadContext`. Update the `ThreadContext` class to include code execution capabilities:

```typescript
// In ThreadContext class
private codeExecutor?: CodeExecutor;

/**
 * Set code executor for CODE node execution
 */
setCodeExecutor(codeExecutor: CodeExecutor): void {
  this.codeExecutor = codeExecutor;
}

/**
 * Get code executor
 */
getCodeExecutor(): CodeExecutor | undefined {
  return this.codeExecutor;
}
```

### NodeExecutionCoordinator Integration

Update the `NodeExecutionCoordinator` to provide the `CodeExecutor` to the code handler:

```typescript
// In NodeExecutionCoordinator.executeNodeLogic()
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
```

### Constructor Updates

Update the `NodeExecutionCoordinator` constructor to accept `CodeExecutor`:

```typescript
constructor(
  private eventManager: EventManager,
  private llmCoordinator: LLMExecutionCoordinator,
  private codeExecutor?: CodeExecutor, // Add this parameter
  private userInteractionHandler?: UserInteractionHandler,
  private humanRelayHandler?: HumanRelayHandler
) { }
```

## Application Layer Integration

### Dependency Injection Pattern

Applications should inject the `CodeExecutor` when creating the execution coordinator:

```typescript
// Application layer setup
const codeRunner = new MyCodeRunner();
const sandboxManager = new MySandboxManager(); 
const codeExecutor = new CodeExecutor(codeRunner, sandboxManager);

const nodeExecutionCoordinator = new NodeExecutionCoordinator(
  eventManager,
  llmCoordinator,
  codeExecutor, // Inject code executor
  userInteractionHandler,
  humanRelayHandler
);
```

### Configuration Options

Applications can configure the code execution behavior through the `CodeExecutionOptions`:

```typescript
// Custom security rules
const securityRules: SecurityValidationRules = {
  low: {
    forbiddenPaths: ['..', '~/.ssh', '/etc/passwd'],
    maxCodeLength: 5000
  },
  medium: {
    dangerousCommands: ['rm -rf', 'del /f', 'format', 'shutdown', 'mkfs'],
    networkRestricted: true,
    fileSystemRestricted: true
  }
};

const validator = new SecurityValidator(securityRules);
const codeExecutor = new CodeExecutor(codeRunner, sandboxManager, validator);
```

## Backward Compatibility

### Configuration Mapping

The existing `CodeNodeConfig` maps directly to `CodeExecutionOptions`:

| CodeNodeConfig | CodeExecutionOptions | Notes |
|----------------|---------------------|-------|
| scriptName | code parameter | File path or inline code |
| scriptType | scriptType | Same values |
| risk | risk | Same values |
| timeout | timeout | Convert seconds to milliseconds |
| retries | retries | Same values |
| retryDelay | retryDelay | Convert seconds to milliseconds |
| inline | inline | Same values |

### Result Compatibility

The `CodeExecutionResult` maintains compatibility with existing result expectations:

- `success` → determines `status` ('COMPLETED' or 'FAILED')
- `output` → stored in `data.output`
- `executionTime` → stored in `executionTime`
- `error` → stored in `error`

## Error Handling Strategy

### Error Type Mapping

| SDK Error | Application Error | Handler Action |
|-----------|------------------|----------------|
| ValidationError | SecurityValidationError | Convert to ValidationError with 'code.security' field |
| TimeoutError | TimeoutError | Pass through as-is |
| ExecutionError | CodeExecutionError | Wrap in ExecutionError with node context |
| Other errors | Unexpected errors | Wrap in CodeExecutionError |

### Retry Logic Preservation

The existing retry logic remains unchanged and works with the new error types:

```typescript
while (attempt <= retries) {
  try {
    const result = await context.codeExecutor.execute(/* ... */);
    // Success handling
  } catch (error) {
    lastError = normalizeError(error, config); // Convert to standard error format
    
    if (attempt < retries) {
      await sleep(retryDelay);
      attempt++;
    } else {
      throw lastError;
    }
  }
}
```

## Testing Strategy

### Unit Tests

1. **Mock CodeExecutor**: Test handler logic with mocked executor
2. **Error scenarios**: Test various error conditions
3. **Retry logic**: Verify retry behavior with different error types
4. **Result formatting**: Ensure proper result structure

### Integration Tests

1. **Real CodeExecutor**: Test with actual code execution implementations
2. **Security validation**: Verify security rules are enforced
3. **Sandbox execution**: Test high-risk code in sandboxed environments
4. **Performance**: Measure execution overhead

## Migration Path

### Phase 1: Interface Definition
- Create type definitions
- Implement core classes
- Update exports

### Phase 2: Handler Integration  
- Update code-handler.ts
- Update NodeExecutionCoordinator
- Update ThreadContext

### Phase 3: Application Integration
- Provide example implementations
- Update documentation
- Create migration guide

### Phase 4: Testing and Validation
- Write comprehensive tests
- Validate backward compatibility
- Performance testing

## Performance Considerations

### Caching Strategy
- Cache compiled code for repeated executions
- Reuse sandbox environments when possible
- Connection pooling for external execution services

### Resource Management
- Proper cleanup of sandbox resources
- Memory management for large code executions
- CPU and memory limits for high-risk executions

### Async Execution
- Non-blocking execution for better concurrency
- Proper error propagation in async contexts
- Timeout handling for long-running executions

## Security Best Practices

### Input Validation
- Always validate code input before execution
- Sanitize file paths and command arguments
- Validate environment variables and working directories

### Execution Isolation
- Use appropriate isolation levels based on risk
- Restrict network and file system access
- Implement resource limits and quotas

### Monitoring and Logging
- Log all code executions with metadata
- Monitor for suspicious patterns
- Alert on security violations

This integration plan ensures a smooth transition from the mock implementation to a production-ready code execution framework while maintaining backward compatibility and following the established SDK architecture patterns.