# 代码执行节点实现指南

## 概述

本文档提供了代码执行节点的详细实现指南，包括具体的代码示例和实现步骤。

## 实现步骤

### 1. 节点类型定义

#### 1.1 更新节点类型枚举

修改 `src/domain/workflow/graph/value-objects/node-type.ts`：

```typescript
/**
 * 节点类型枚举
 */
export enum NodeTypeValue {
  START = 'start',
  END = 'end',
  TASK = 'task',
  DECISION = 'decision',
  MERGE = 'merge',
  FORK = 'fork',
  JOIN = 'join',
  SUBGRAPH = 'subgraph',
  CUSTOM = 'custom',
  CONDITION = 'condition',
  LLM = 'llm',
  TOOL = 'tool',
  WAIT = 'wait',
  CODE = 'code'  // 新增代码执行节点类型
}
```

#### 1.2 添加工厂方法

在同一个文件中添加代码节点的工厂方法：

```typescript
/**
 * 创建代码执行节点类型
 * @returns 代码执行节点类型实例
 */
public static code(): NodeType {
  return new NodeType({ value: NodeTypeValue.CODE });
}

/**
 * 检查是否为代码执行节点
 * @returns 是否为代码执行节点
 */
public isCode(): boolean {
  return this.props.value === NodeTypeValue.CODE;
}
```

#### 1.3 更新类型检查方法

修改 `isExecutable()` 方法：

```typescript
/**
 * 检查是否为执行节点
 * @returns 是否为执行节点
 */
public isExecutable(): boolean {
  return this.isTask() || this.isSubgraph() || this.isCustom() ||
    this.isCondition() || this.isLLM() || this.isTool() || this.isWait() || this.isCode();
}
```

#### 1.4 更新类型描述

在 `getDescription()` 方法中添加代码节点的描述：

```typescript
const descriptions: Record<NodeTypeValue, string> = {
  [NodeTypeValue.START]: '开始节点，表示图的入口点',
  [NodeTypeValue.END]: '结束节点，表示图的出口点',
  [NodeTypeValue.TASK]: '任务节点，表示具体的执行任务',
  [NodeTypeValue.DECISION]: '决策节点，根据条件选择执行路径',
  [NodeTypeValue.MERGE]: '合并节点，合并多个输入路径',
  [NodeTypeValue.FORK]: '分支节点，分支出多个执行路径',
  [NodeTypeValue.JOIN]: '连接节点，等待多个输入路径完成',
  [NodeTypeValue.SUBGRAPH]: '子图节点，表示一个子图的执行',
  [NodeTypeValue.CONDITION]: '条件节点，根据状态进行条件判断和路由决策',
  [NodeTypeValue.LLM]: 'LLM节点，调用大语言模型进行文本生成',
  [NodeTypeValue.TOOL]: '工具节点，执行工具调用并处理结果',
  [NodeTypeValue.WAIT]: '等待节点，处理等待和延迟逻辑',
  [NodeTypeValue.CUSTOM]: '自定义节点，根据特定逻辑执行',
  [NodeTypeValue.CODE]: '代码执行节点，执行指定语言的代码并返回结果'
};
```

### 2. 代码执行节点执行器

#### 2.1 创建基础接口

创建 `src/infrastructure/external/code-execution/interfaces/code-execution.interface.ts`：

```typescript
export interface CodeExecutionContext {
  parameters: Record<string, any>;
  environment: Record<string, string>;
  workingDirectory: string;
  timeout: number;
  security: SecurityConfig;
}

export interface SecurityConfig {
  allowFileSystemAccess: boolean;
  allowNetworkAccess: boolean;
  maxMemory: number;
  maxCpuTime: number;
  allowedPaths?: string[];
  blockedCommands?: string[];
}

export interface CodeExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  error?: string;
  data?: any;
}

export interface CodeExecutor {
  execute(code: string, context: CodeExecutionContext): Promise<CodeExecutionResult>;
  validate(code: string): Promise<{ valid: boolean; errors: string[] }>;
  getSupportedLanguage(): string;
}
```

#### 2.2 创建代码执行引擎

创建 `src/infrastructure/external/code-execution/code-execution-engine.ts`：

```typescript
import { injectable, inject } from 'inversify';
import { CodeExecutor, CodeExecutionContext, CodeExecutionResult } from './interfaces/code-execution.interface';

@injectable()
export class CodeExecutionEngine {
  private executors: Map<string, CodeExecutor> = new Map();

  constructor(
    @inject('JavaScriptExecutor') private jsExecutor: CodeExecutor,
    @inject('PythonExecutor') private pythonExecutor: CodeExecutor,
    @inject('BashExecutor') private bashExecutor: CodeExecutor,
    @inject('PowerShellExecutor') private psExecutor: CodeExecutor,
    @inject('CmdExecutor') private cmdExecutor: CodeExecutor
  ) {
    this.registerExecutor('javascript', this.jsExecutor);
    this.registerExecutor('python', this.pythonExecutor);
    this.registerExecutor('bash', this.bashExecutor);
    this.registerExecutor('powershell', this.psExecutor);
    this.registerExecutor('cmd', this.cmdExecutor);
  }

  registerExecutor(language: string, executor: CodeExecutor): void {
    this.executors.set(language.toLowerCase(), executor);
  }

  async execute(
    language: string,
    code: string,
    context: CodeExecutionContext
  ): Promise<CodeExecutionResult> {
    const executor = this.executors.get(language.toLowerCase());
    
    if (!executor) {
      throw new Error(`Unsupported code language: ${language}`);
    }

    // 验证代码
    const validation = await executor.validate(code);
    if (!validation.valid) {
      throw new Error(`Code validation failed: ${validation.errors.join(', ')}`);
    }

    // 执行代码
    return await executor.execute(code, context);
  }

  getSupportedLanguages(): string[] {
    return Array.from(this.executors.keys());
  }

  hasSupport(language: string): boolean {
    return this.executors.has(language.toLowerCase());
  }
}
```

#### 2.3 创建代码节点执行器

创建 `src/infrastructure/workflow/nodes/executors/code-node-executor.ts`：

```typescript
import { injectable, inject } from 'inversify';
import { Node } from '../../../../domain/workflow/graph/entities/nodes/base/node';
import { ExecutionContext } from '../../engine/execution-context';
import { INodeExecutor } from '../../../../domain/workflow/graph/interfaces/node-executor.interface';
import { CodeExecutionEngine } from '../../../external/code-execution/code-execution-engine';
import { SecurityController } from '../../../external/code-execution/security/security-controller';
import { CodeExecutionContext, CodeExecutionResult } from '../../../external/code-execution/interfaces/code-execution.interface';

@injectable()
export class CodeNodeExecutor implements INodeExecutor {
  constructor(
    @inject('CodeExecutionEngine') private codeExecutionEngine: CodeExecutionEngine,
    @inject('SecurityController') private securityController: SecurityController
  ) {}

  async execute(node: Node, context: ExecutionContext): Promise<any> {
    try {
      // 提取代码配置
      const config = this.extractCodeConfig(node);
      
      // 安全性检查
      await this.securityController.validateExecution(config, context);
      
      // 准备执行上下文
      const executionContext = this.prepareExecutionContext(node, context);
      
      // 执行代码
      const result = await this.codeExecutionEngine.execute(
        config.language,
        config.code,
        executionContext
      );
      
      // 处理结果
      const processedResult = this.processResult(result, node, context);
      
      // 存储结果到上下文
      context.setVariable(`code_result_${node.id.value}`, processedResult);
      context.setVariable(`code_execution_${node.id.value}`, {
        language: config.language,
        executionTime: result.executionTime,
        success: result.success,
        exitCode: result.exitCode
      });
      
      if (!result.success) {
        throw new Error(`Code execution failed: ${result.error}`);
      }
      
      return processedResult;
    } catch (error) {
      throw new Error(`Code node execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private extractCodeConfig(node: Node): any {
    const config = node.properties;
    
    if (!config['language']) {
      throw new Error('Code node requires language configuration');
    }
    
    if (!config['code']) {
      throw new Error('Code node requires code configuration');
    }
    
    return {
      language: config['language'],
      code: config['code'],
      timeout: config['timeout'] || 30000,
      environment: config['environment'] || {},
      workingDirectory: config['workingDirectory'] || process.cwd(),
      security: config['security'] || {
        allowFileSystemAccess: false,
        allowNetworkAccess: false,
        maxMemory: 128 * 1024 * 1024, // 128MB
        maxCpuTime: 5000 // 5 seconds
      },
      output: config['output'] || {
        format: 'text',
        captureStdout: true,
        captureStderr: true
      }
    };
  }

  private prepareExecutionContext(node: Node, context: ExecutionContext): CodeExecutionContext {
    const config = node.properties;
    
    // 准备参数
    const parameters = this.prepareParameters(node, context);
    
    return {
      parameters,
      environment: config['environment'] || {},
      workingDirectory: config['workingDirectory'] || process.cwd(),
      timeout: config['timeout'] || 30000,
      security: config['security'] || {
        allowFileSystemAccess: false,
        allowNetworkAccess: false,
        maxMemory: 128 * 1024 * 1024,
        maxCpuTime: 5000
      }
    };
  }

  private prepareParameters(node: Node, context: ExecutionContext): Record<string, any> {
    const config = node.properties;
    let parameters: any = {};
    
    // 使用静态参数
    if (config['parameters']) {
      parameters = { ...config['parameters'] };
    }
    
    // 从上下文覆盖参数
    if (config['parameterMappings']) {
      for (const [targetParam, sourcePath] of Object.entries(config['parameterMappings'])) {
        const value = this.getContextValue(sourcePath as string, context);
        if (value !== undefined) {
          parameters[targetParam] = value;
        }
      }
    }
    
    return parameters;
  }

  private getContextValue(path: string, context: ExecutionContext): any {
    const parts = path.split('.');
    let current: any = context;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        current = context.getVariable(part);
        if (current === undefined) {
          return undefined;
        }
      }
    }
    
    return current;
  }

  private processResult(result: CodeExecutionResult, node: Node, context: ExecutionContext): any {
    const config = node.properties;
    let processedResult: any;
    
    // 根据输出格式处理结果
    switch (config['output']?.format) {
      case 'json':
        try {
          processedResult = JSON.parse(result.stdout);
        } catch (error) {
          processedResult = { raw: result.stdout, parseError: error instanceof Error ? error.message : String(error) };
        }
        break;
      case 'binary':
        processedResult = Buffer.from(result.stdout, 'base64');
        break;
      default:
        processedResult = result.stdout;
    }
    
    // 存储原始输出
    if (config['output']?.captureStdout) {
      context.setVariable(`code_stdout_${node.id.value}`, result.stdout);
    }
    
    if (config['output']?.captureStderr) {
      context.setVariable(`code_stderr_${node.id.value}`, result.stderr);
    }
    
    return processedResult;
  }

  async canExecute(node: Node, context: ExecutionContext): Promise<boolean> {
    const config = node.properties;
    
    if (!config['language'] || !config['code']) {
      return false;
    }
    
    return this.codeExecutionEngine.hasSupport(config['language']);
  }

  async validate(node: Node): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const config = node.properties;
    
    // 检查必需字段
    if (!config['language']) {
      errors.push('Code node requires language configuration');
    }
    
    if (!config['code']) {
      errors.push('Code node requires code configuration');
    }
    
    // 检查语言支持
    if (config['language'] && !this.codeExecutionEngine.hasSupport(config['language'])) {
      errors.push(`Unsupported language: ${config['language']}`);
    }
    
    // 检查超时配置
    if (config['timeout'] && (typeof config['timeout'] !== 'number' || config['timeout'] <= 0)) {
      errors.push('Timeout must be a positive number');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  getSupportedNodeTypes(): string[] {
    return ['code'];
  }
}
```

### 3. 语言特定执行器

#### 3.1 JavaScript执行器

创建 `src/infrastructure/external/code-execution/executors/javascript-executor.ts`：

```typescript
import { injectable } from 'inversify';
import { CodeExecutor, CodeExecutionContext, CodeExecutionResult } from '../interfaces/code-execution.interface';
import { VM } from 'vm2';

@injectable()
export class JavaScriptExecutor implements CodeExecutor {
  async execute(code: string, context: CodeExecutionContext): Promise<CodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      // 创建安全的VM环境
      const vm = new VM({
        timeout: context.timeout,
        sandbox: {
          context: context.parameters,
          console: {
            log: (...args: any[]) => {
              // 捕获console.log输出
              return args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
            }
          },
          require: undefined, // 禁用require
          process: undefined // 禁用process访问
        }
      });
      
      // 执行代码
      const result = vm.run(code);
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        stdout: typeof result === 'object' ? JSON.stringify(result) : String(result),
        stderr: '',
        exitCode: 0,
        executionTime,
        data: result
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1,
        executionTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async validate(code: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // 基本语法检查
      new Function(code);
      
      // 检查危险操作
      const dangerousPatterns = [
        /require\s*\(/,
        /import\s+.*\s+from/,
        /process\./,
        /global\./,
        /eval\s*\(/,
        /Function\s*\(/,
        /setTimeout/,
        /setInterval/
      ];
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(code)) {
          errors.push(`Potentially dangerous operation detected: ${pattern.source}`);
        }
      }
    } catch (error) {
      errors.push(`Syntax error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  getSupportedLanguage(): string {
    return 'javascript';
  }
}
```

#### 3.2 Python执行器

创建 `src/infrastructure/external/code-execution/executors/python-executor.ts`：

```typescript
import { injectable } from 'inversify';
import { CodeExecutor, CodeExecutionContext, CodeExecutionResult } from '../interfaces/code-execution.interface';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@injectable()
export class PythonExecutor implements CodeExecutor {
  async execute(code: string, context: CodeExecutionContext): Promise<CodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      // 创建临时文件
      const tempDir = os.tmpdir();
      const scriptFileName = `script_${Date.now()}_${Math.random().toString(36).substring(7)}.py`;
      const scriptPath = path.join(tempDir, scriptFileName);
      
      // 准备Python代码
      const wrappedCode = this.wrapCode(code, context);
      
      // 写入临时文件
      fs.writeFileSync(scriptPath, wrappedCode);
      
      try {
        // 执行Python脚本
        const result = await this.executePythonScript(scriptPath, context);
        
        const executionTime = Date.now() - startTime;
        
        return {
          success: result.exitCode === 0,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          executionTime,
          data: this.parseOutput(result.stdout)
        };
      } finally {
        // 清理临时文件
        try {
          fs.unlinkSync(scriptPath);
        } catch (error) {
          // 忽略清理错误
        }
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1,
        executionTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private wrapCode(code: string, context: CodeExecutionContext): string {
    // 包装代码以提供上下文和安全限制
    return `
import sys
import json
import traceback

# 设置上下文
context = ${JSON.stringify(context.parameters)}

# 捕获输出
class OutputCapture:
    def __init__(self):
        self.stdout = []
        self.stderr = []
    
    def write(self, text):
        self.stdout.append(text)
    
    def flush(self):
        pass

# 重定向输出
import io
original_stdout = sys.stdout
original_stderr = sys.stderr

stdout_capture = OutputCapture()
stderr_capture = OutputCapture()

sys.stdout = stdout_capture
sys.stderr = stderr_capture

try:
    # 用户代码
${code}
    
    # 恢复输出
    sys.stdout = original_stdout
    sys.stderr = original_stderr
    
    # 输出结果
    result = locals().get('result', None)
    if result is not None:
        if isinstance(result, (dict, list, tuple)):
            print(json.dumps(result))
        else:
            print(str(result))
    
    # 输出捕获的内容
    if stdout_capture.stdout:
        print("\\n=== STDOUT ===")
        print(''.join(stdout_capture.stdout))
    
    if stderr_capture.stderr:
        print("\\n=== STDERR ===")
        print(''.join(stderr_capture.stderr), file=sys.stderr)
        
except Exception as e:
    # 恢复输出
    sys.stdout = original_stdout
    sys.stderr = original_stderr
    
    print(f"Error: {str(e)}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
`;
  }

  private async executePythonScript(scriptPath: string, context: CodeExecutionContext): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      
      const args = [scriptPath];
      const options = {
        cwd: context.workingDirectory,
        env: { ...process.env, ...context.environment },
        timeout: context.timeout
      };
      
      const childProcess: ChildProcess = spawn('python', args, options);
      
      if (childProcess.stdout) {
        childProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });
      }
      
      if (childProcess.stderr) {
        childProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }
      
      childProcess.on('close', (code) => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0
        });
      });
      
      childProcess.on('error', (error) => {
        reject(new Error(`Failed to execute Python script: ${error.message}`));
      });
      
      // 处理超时
      if (context.timeout) {
        setTimeout(() => {
          childProcess.kill();
          reject(new Error(`Python script timed out after ${context.timeout}ms`));
        }, context.timeout);
      }
    });
  }

  private parseOutput(output: string): any {
    try {
      // 尝试解析JSON
      return JSON.parse(output);
    } catch (error) {
      // 如果不是JSON，返回原始字符串
      return output;
    }
  }

  async validate(code: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // 创建临时文件进行语法检查
      const tempDir = os.tmpdir();
      const scriptFileName = `validate_${Date.now()}_${Math.random().toString(36).substring(7)}.py`;
      const scriptPath = path.join(tempDir, scriptFileName);
      
      try {
        fs.writeFileSync(scriptPath, code);
        
        // 使用Python -m py_compile进行语法检查
        const result = await this.executePythonScript('-m py_compile', {
          parameters: {},
          environment: {},
          workingDirectory: tempDir,
          timeout: 5000,
          security: {
            allowFileSystemAccess: true,
            allowNetworkAccess: false,
            maxMemory: 64 * 1024 * 1024,
            maxCpuTime: 2000
          }
        });
        
        if (result.exitCode !== 0) {
          errors.push(`Python syntax error: ${result.stderr}`);
        }
      } finally {
        try {
          fs.unlinkSync(scriptPath);
        } catch (error) {
          // 忽略清理错误
        }
      }
      
      // 检查危险操作
      const dangerousPatterns = [
        /import\s+os/,
        /import\s+subprocess/,
        /import\s+shutil/,
        /exec\s*\(/,
        /eval\s*\(/,
        /__import__\s*\(/,
        /open\s*\(/,
        /file\s*\(/,
        /input\s*\(/,
        /raw_input\s*\(/
      ];
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(code)) {
          errors.push(`Potentially dangerous operation detected: ${pattern.source}`);
        }
      }
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  getSupportedLanguage(): string {
    return 'python';
  }
}
```

### 4. 安全性控制

#### 4.1 安全控制器

创建 `src/infrastructure/external/code-execution/security/security-controller.ts`：

```typescript
import { injectable, inject } from 'inversify';
import { CodeExecutionConfig } from '../interfaces/code-execution.interface';
import { ExecutionContext } from '../../../../infrastructure/workflow/engine/execution-context';
import { ResourceLimiter } from './resource-limiter';
import { PermissionChecker } from './permission-checker';
import { SandboxManager } from './sandbox-manager';

@injectable()
export class SecurityController {
  constructor(
    @inject('ResourceLimiter') private resourceLimiter: ResourceLimiter,
    @inject('PermissionChecker') private permissionChecker: PermissionChecker,
    @inject('SandboxManager') private sandboxManager: SandboxManager
  ) {}

  async validateExecution(config: CodeExecutionConfig, context: ExecutionContext): Promise<void> {
    // 检查执行权限
    await this.permissionChecker.checkExecutionPermission(config, context);
    
    // 检查资源限制
    await this.resourceLimiter.checkResourceLimits(config);
    
    // 检查代码安全性
    await this.sandboxManager.validateCode(config.code, config.language);
    
    // 检查执行频率限制
    await this.permissionChecker.checkRateLimit(context);
  }
}
```

### 5. 更新节点执行器工厂

修改 `src/infrastructure/workflow/nodes/factories/node-executor-factory.ts`：

```typescript
import { injectable, inject } from 'inversify';
import { INodeExecutor } from '../../../../domain/workflow/graph/interfaces/node-executor.interface';
import { LLMNodeExecutor } from '../executors/llm-node-executor';
import { ToolNodeExecutor } from '../executors/tool-node-executor';
import { ConditionNodeExecutor } from '../executors/condition-node-executor';
import { WaitNodeExecutor } from '../executors/wait-node-executor';
import { CodeNodeExecutor } from '../executors/code-node-executor';

@injectable()
export class NodeExecutorFactory {
  private executors: Map<string, INodeExecutor> = new Map();

  constructor(
    @inject('LLMNodeExecutor') private llmNodeExecutor: LLMNodeExecutor,
    @inject('ToolNodeExecutor') private toolNodeExecutor: ToolNodeExecutor,
    @inject('ConditionNodeExecutor') private conditionNodeExecutor: ConditionNodeExecutor,
    @inject('WaitNodeExecutor') private waitNodeExecutor: WaitNodeExecutor,
    @inject('CodeNodeExecutor') private codeNodeExecutor: CodeNodeExecutor
  ) {
    this.registerDefaultExecutors();
  }

  // ... 其他方法保持不变

  private registerDefaultExecutors(): void {
    this.executors.set('llm', this.llmNodeExecutor);
    this.executors.set('tool', this.toolNodeExecutor);
    this.executors.set('condition', this.conditionNodeExecutor);
    this.executors.set('wait', this.waitNodeExecutor);
    this.executors.set('code', this.codeNodeExecutor); // 新增代码执行器
  }
}
```

### 6. 依赖注入配置

在适当的依赖注入配置文件中注册新的服务：

```typescript
// 在 DI 容器中注册新服务
container.bind<CodeNodeExecutor>('CodeNodeExecutor').to(CodeNodeExecutor);
container.bind<CodeExecutionEngine>('CodeExecutionEngine').to(CodeExecutionEngine);
container.bind<JavaScriptExecutor>('JavaScriptExecutor').to(JavaScriptExecutor);
container.bind<PythonExecutor>('PythonExecutor').to(PythonExecutor);
container.bind<BashExecutor>('BashExecutor').to(BashExecutor);
container.bind<PowerShellExecutor>('PowerShellExecutor').to(PowerShellExecutor);
container.bind<CmdExecutor>('CmdExecutor').to(CmdExecutor);
container.bind<SecurityController>('SecurityController').to(SecurityController);
container.bind<ResourceLimiter>('ResourceLimiter').to(ResourceLimiter);
container.bind<PermissionChecker>('PermissionChecker').to(PermissionChecker);
container.bind<SandboxManager>('SandboxManager').to(SandboxManager);
```

## 测试用例

### 单元测试示例

创建 `src/infrastructure/workflow/nodes/executors/__tests__/code-node-executor.test.ts`：

```typescript
import { CodeNodeExecutor } from '../code-node-executor';
import { Node } from '../../../../domain/workflow/graph/entities/nodes/base/node';
import { ExecutionContext } from '../../../engine/execution-context';
import { CodeExecutionEngine } from '../../../external/code-execution/code-execution-engine';
import { SecurityController } from '../../../external/code-execution/security/security-controller';

describe('CodeNodeExecutor', () => {
  let executor: CodeNodeExecutor;
  let mockCodeExecutionEngine: jest.Mocked<CodeExecutionEngine>;
  let mockSecurityController: jest.Mocked<SecurityController>;
  let mockNode: jest.Mocked<Node>;
  let mockContext: jest.Mocked<ExecutionContext>;

  beforeEach(() => {
    mockCodeExecutionEngine = {
      execute: jest.fn(),
      hasSupport: jest.fn()
    } as any;

    mockSecurityController = {
      validateExecution: jest.fn()
    } as any;

    executor = new CodeNodeExecutor(mockCodeExecutionEngine, mockSecurityController);

    mockNode = {
      id: { value: 'test-node' },
      properties: {
        language: 'javascript',
        code: 'return context.input * 2;',
        parameters: {
          input: 5
        }
      }
    } as any;

    mockContext = {
      setVariable: jest.fn(),
      getVariable: jest.fn()
    } as any;
  });

  it('should execute JavaScript code successfully', async () => {
    mockSecurityController.validateExecution.mockResolvedValue(undefined);
    mockCodeExecutionEngine.hasSupport.mockReturnValue(true);
    mockCodeExecutionEngine.execute.mockResolvedValue({
      success: true,
      stdout: '10',
      stderr: '',
      exitCode: 0,
      executionTime: 100
    });

    const result = await executor.execute(mockNode, mockContext);

    expect(result).toBe('10');
    expect(mockContext.setVariable).toHaveBeenCalledWith('code_result_test-node', '10');
  });

  it('should handle execution errors', async () => {
    mockSecurityController.validateExecution.mockResolvedValue(undefined);
    mockCodeExecutionEngine.hasSupport.mockReturnValue(true);
    mockCodeExecutionEngine.execute.mockResolvedValue({
      success: false,
      stdout: '',
      stderr: 'ReferenceError: input is not defined',
      exitCode: 1,
      executionTime: 50,
      error: 'ReferenceError: input is not defined'
    });

    await expect(executor.execute(mockNode, mockContext)).rejects.toThrow('Code node execution failed');
  });
});
```

## 总结

本实现指南提供了代码执行节点的完整实现方案，包括：

1. 节点类型定义和扩展
2. 代码执行引擎和语言特定执行器
3. 安全性控制机制
4. 依赖注入配置
5. 测试用例示例

该实现遵循了现有的架构模式，提供了灵活、安全、可扩展的代码执行能力。通过分层架构和模块化设计，可以轻松添加新的语言支持和功能扩展。