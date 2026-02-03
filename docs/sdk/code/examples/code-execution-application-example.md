# Code Execution Application Integration Example

## Overview

This document provides a complete example of how to integrate the new code execution framework into an application layer implementation.

## Application Layer Implementation

### 1. Code Runner Implementation

```typescript
// application/code-runners/nodejs-code-runner.ts
import { 
  CodeRunner, 
  CodeExecutionOptions, 
  CodeExecutionResult 
} from '@modular-agent/sdk/types/code';
import { spawn } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class NodeJsCodeRunner implements CodeRunner {
  async execute(
    code: string,
    options: CodeExecutionOptions
  ): Promise<CodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      let result: { stdout: string; stderr: string };
      
      switch (options.scriptType) {
        case 'javascript':
          // Execute JavaScript using Node.js eval (with proper sandboxing in production)
          result = await this.executeJavaScript(code, options);
          break;
          
        case 'python':
          result = await this.executePython(code, options);
          break;
          
        case 'shell':
          result = await this.executeShell(code, options);
          break;
          
        case 'cmd':
          result = await this.executeCmd(code, options);
          break;
          
        case 'powershell':
          result = await this.executePowerShell(code, options);
          break;
          
        default:
          throw new Error(`Unsupported script type: ${options.scriptType}`);
      }
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        stdout: result.stdout,
        stderr: result.stderr,
        output: result.stdout + result.stderr,
        executionTime,
        scriptName: code,
        scriptType: options.scriptType
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        scriptName: code,
        scriptType: options.scriptType
      };
    }
  }
  
  supportsScriptType(scriptType: string): boolean {
    return ['javascript', 'python', 'shell', 'cmd', 'powershell'].includes(scriptType);
  }
  
  private async executeJavaScript(code: string, options: CodeExecutionOptions): Promise<{ stdout: string; stderr: string }> {
    if (options.inline) {
      // For inline JavaScript, use vm module with context isolation
      const vm = require('vm');
      const context = vm.createContext({
        console: {
          log: (...args: any[]) => process.stdout.write(args.join(' ') + '\n'),
          error: (...args: any[]) => process.stderr.write(args.join(' ') + '\n')
        }
      });
      
      try {
        const result = vm.runInContext(code, context, {
          timeout: options.timeout || 30000,
          displayErrors: true
        });
        return { stdout: String(result), stderr: '' };
      } catch (error) {
        throw new Error(`JavaScript execution failed: ${error}`);
      }
    } else {
      // Execute JavaScript file
      return await execAsync(`node "${code}"`, {
        timeout: options.timeout || 30000,
        cwd: options.workingDirectory,
        env: { ...process.env, ...options.environment }
      });
    }
  }
  
  private async executePython(code: string, options: CodeExecutionOptions): Promise<{ stdout: string; stderr: string }> {
    if (options.inline) {
      return await execAsync(`python -c "${code.replace(/"/g, '\\"')}"`, {
        timeout: options.timeout || 30000,
        cwd: options.workingDirectory,
        env: { ...process.env, ...options.environment }
      });
    } else {
      return await execAsync(`python "${code}"`, {
        timeout: options.timeout || 30000,
        cwd: options.workingDirectory,
        env: { ...process.env, ...options.environment }
      });
    }
  }
  
  private async executeShell(code: string, options: CodeExecutionOptions): Promise<{ stdout: string; stderr: string }> {
    if (options.inline) {
      return await execAsync(code, {
        timeout: options.timeout || 30000,
        cwd: options.workingDirectory,
        env: { ...process.env, ...options.environment },
        shell: '/bin/bash'
      });
    } else {
      return await execAsync(`bash "${code}"`, {
        timeout: options.timeout || 30000,
        cwd: options.workingDirectory,
        env: { ...process.env, ...options.environment }
      });
    }
  }
  
  private async executeCmd(code: string, options: CodeExecutionOptions): Promise<{ stdout: string; stderr: string }> {
    if (options.inline) {
      return await execAsync(code, {
        timeout: options.timeout || 30000,
        cwd: options.workingDirectory,
        env: { ...process.env, ...options.environment },
        shell: 'cmd.exe'
      });
    } else {
      return await execAsync(`cmd /c "${code}"`, {
        timeout: options.timeout || 30000,
        cwd: options.workingDirectory,
        env: { ...process.env, ...options.environment }
      });
    }
  }
  
  private async executePowerShell(code: string, options: CodeExecutionOptions): Promise<{ stdout: string; stderr: string }> {
    if (options.inline) {
      return await execAsync(`powershell -Command "${code.replace(/"/g, '""')}"`, {
        timeout: options.timeout || 30000,
        cwd: options.workingDirectory,
        env: { ...process.env, ...options.environment }
      });
    } else {
      return await execAsync(`powershell -File "${code}"`, {
        timeout: options.timeout || 30000,
        cwd: options.workingDirectory,
        env: { ...process.env, ...options.environment }
      });
    }
  }
}
```

### 2. Sandbox Manager Implementation

```typescript
// application/sandbox/docker-sandbox-manager.ts
import { 
  SandboxManager, 
  SandboxEnvironment, 
  CodeExecutionOptions, 
  CodeExecutionResult 
} from '@modular-agent/sdk/types/code';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class DockerSandboxManager implements SandboxManager {
  async createSandbox(options: CodeExecutionOptions): Promise<SandboxEnvironment> {
    const sandboxId = `sandbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create Docker container with appropriate security settings
    const dockerImage = this.getDockerImageForScriptType(options.scriptType);
    const cmd = [
      'docker', 'run', '-d',
      '--name', sandboxId,
      '--memory', '512m',
      '--cpus', '0.5',
      '--network', 'none', // No network access for high-risk code
      '--read-only', // Read-only filesystem
      '--tmpfs', '/tmp:rw,noexec,nosuid,size=100m', // Writable temporary directory
      '--cap-drop', 'ALL', // Drop all capabilities
      dockerImage,
      'sleep', '3600' // Keep container running
    ].join(' ');
    
    try {
      await execAsync(cmd);
      
      return {
        id: sandboxId,
        isolationType: 'container',
        isolationLevel: 'high',
        resourceLimits: {
          cpu: 50, // 50% CPU
          memory: 512, // 512 MB
          timeout: options.timeout || 30000,
          diskSpace: 100 // 100 MB
        },
        createdAt: Date.now()
      };
    } catch (error) {
      throw new Error(`Failed to create Docker sandbox: ${error}`);
    }
  }
  
  async executeInSandbox(
    code: string,
    sandbox: SandboxEnvironment,
    options: CodeExecutionOptions
  ): Promise<CodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Copy code to sandbox
      let codePath = '/tmp/code';
      if (!options.inline) {
        // For file paths, copy the file to sandbox
        await execAsync(`docker cp "${code}" ${sandbox.id}:${codePath}`);
      } else {
        // For inline code, write to file in sandbox
        const escapedCode = code.replace(/'/g, "'\"'\"'");
        await execAsync(`docker exec ${sandbox.id} sh -c 'echo "${escapedCode}" > ${codePath}'`);
      }
      
      // Execute code in sandbox
      const executeCmd = this.getExecuteCommand(codePath, options.scriptType, options.inline);
      const result = await execAsync(`docker exec ${sandbox.id} ${executeCmd}`, {
        timeout: options.timeout || 30000
      });
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        stdout: result.stdout,
        stderr: result.stderr,
        output: result.stdout + result.stderr,
        executionTime,
        scriptName: code,
        scriptType: options.scriptType
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        scriptName: code,
        scriptType: options.scriptType
      };
    }
  }
  
  async cleanupSandbox(sandbox: SandboxEnvironment): Promise<void> {
    try {
      await execAsync(`docker rm -f ${sandbox.id}`);
    } catch (error) {
      console.warn(`Failed to cleanup sandbox ${sandbox.id}:`, error);
    }
  }
  
  supportsRiskLevel(riskLevel: string): boolean {
    return riskLevel === 'high';
  }
  
  private getDockerImageForScriptType(scriptType: string): string {
    switch (scriptType) {
      case 'python':
        return 'python:3.9-slim';
      case 'javascript':
        return 'node:16-alpine';
      case 'shell':
        return 'alpine:latest';
      case 'powershell':
        return 'mcr.microsoft.com/powershell:7.2-ubuntu-20.04';
      default:
        return 'alpine:latest';
    }
  }
  
  private getExecuteCommand(codePath: string, scriptType: string, inline: boolean): string {
    switch (scriptType) {
      case 'python':
        return `python ${codePath}`;
      case 'javascript':
        return `node ${codePath}`;
      case 'shell':
        return `sh ${codePath}`;
      case 'powershell':
        return `pwsh ${codePath}`;
      default:
        return `sh ${codePath}`;
    }
  }
}
```

### 3. SDK Integration Setup

```typescript
// application/workflow-engine.ts
import { 
  CodeExecutor, 
  SecurityValidationRules 
} from '@modular-agent/sdk/core/code';
import { NodeExecutionCoordinator } from '@modular-agent/sdk/core/execution/coordinators/node-execution-coordinator';
import { NodeJsCodeRunner } from './code-runners/nodejs-code-runner';
import { DockerSandboxManager } from './sandbox/docker-sandbox-manager';

// Create application-specific implementations
const codeRunner = new NodeJsCodeRunner();
const sandboxManager = new DockerSandboxManager();

// Configure security rules
const securityRules: SecurityValidationRules = {
  low: {
    forbiddenPaths: ['..', '~/.ssh', '/etc/passwd', '/root'],
    maxCodeLength: 5000
  },
  medium: {
    dangerousCommands: [
      'rm -rf', 'del /f', 'format', 'shutdown', 'mkfs', 
      'dd if', 'wget.*-O', 'curl.*-o', 'nc ', 'netcat '
    ],
    networkRestricted: true,
    fileSystemRestricted: true
  },
  high: {
    requireSandbox: true,
    maxResources: {
      cpu: 50,
      memory: 512,
      time: 30000
    }
  }
};

// Create code executor with custom security rules
const codeExecutor = new CodeExecutor(codeRunner, sandboxManager, securityRules);

// Integrate with workflow execution
const nodeExecutionCoordinator = new NodeExecutionCoordinator(
  eventManager,
  llmCoordinator,
  codeExecutor, // Inject the code executor
  userInteractionHandler,
  humanRelayHandler
);

// Use in workflow execution
const result = await workflowExecutor.execute(workflow, input);
```

### 4. Workflow Definition Example

```typescript
// Example workflow with CODE nodes
const workflow = {
  id: 'example-workflow',
  name: 'Code Execution Workflow',
  nodes: [
    {
      id: 'start',
      type: 'START',
      name: 'Start',
      config: {},
      outgoingEdgeIds: ['edge1']
    },
    {
      id: 'code-node-1',
      type: 'CODE',
      name: 'Safe JavaScript',
      config: {
        scriptName: 'console.log("Hello from safe code!");',
        scriptType: 'javascript',
        risk: 'low',
        inline: true,
        timeout: 10,
        retries: 2,
        retryDelay: 1
      },
      outgoingEdgeIds: ['edge2']
    },
    {
      id: 'code-node-2',
      type: 'CODE', 
      name: 'High Risk Shell Script',
      config: {
        scriptName: 'find / -name "*.txt" | head -10',
        scriptType: 'shell',
        risk: 'high',
        inline: true,
        timeout: 30,
        retries: 0
      },
      outgoingEdgeIds: ['edge3']
    },
    {
      id: 'end',
      type: 'END',
      name: 'End',
      config: {},
      outgoingEdgeIds: []
    }
  ],
  edges: [
    { id: 'edge1', sourceNodeId: 'start', targetNodeId: 'code-node-1' },
    { id: 'edge2', sourceNodeId: 'code-node-1', targetNodeId: 'code-node-2' },
    { id: 'edge3', sourceNodeId: 'code-node-2', targetNodeId: 'end' }
  ]
};
```

### 5. Error Handling in Application

```typescript
// application/error-handling.ts
import { ValidationError, ExecutionError } from '@modular-agent/sdk/types/errors';
import { SecurityValidationError } from '@modular-agent/sdk/core/code';

async function executeWorkflowWithCodeNodes() {
  try {
    const result = await workflowExecutor.execute(workflow, input);
    console.log('Workflow completed successfully:', result);
  } catch (error) {
    if (error instanceof ValidationError && error.field === 'code.security') {
      console.error('Security validation failed:', error.message);
      // Handle security violations appropriately
    } else if (error instanceof ExecutionError) {
      console.error('Code execution failed:', error.message);
      // Handle execution failures
    } else {
      console.error('Unexpected error:', error);
    }
  }
}
```

## Security Best Practices

### 1. Input Validation
- Always validate and sanitize code input
- Use allowlists for file paths and commands
- Validate environment variables and working directories

### 2. Resource Limits
- Implement CPU and memory limits for all executions
- Set reasonable timeout values
- Monitor resource usage during execution

### 3. Network Isolation
- Disable network access for high-risk code
- Use network allowlists for medium-risk code
- Monitor network activity for suspicious patterns

### 4. File System Access
- Restrict file system access based on risk level
- Use read-only filesystems where possible
- Monitor file system operations

### 5. Monitoring and Logging
- Log all code executions with metadata
- Monitor for security violations
- Alert on suspicious execution patterns

## Performance Optimization

### 1. Caching
- Cache compiled code for repeated executions
- Reuse Docker containers when possible
- Cache security validation results

### 2. Connection Pooling
- Reuse execution resources
- Pool Docker containers for similar workloads
- Manage resource cleanup efficiently

### 3. Async Execution
- Use non-blocking execution for better concurrency
- Implement proper error propagation
- Handle timeouts gracefully

This example demonstrates a complete, production-ready integration of the code execution framework with proper security, error handling, and performance considerations.