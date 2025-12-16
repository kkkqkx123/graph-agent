

理解了，您的设想是简化设计，让用户直接提供脚本，代码节点负责执行这些脚本。这是一个更直接和实用的方案。基于这个思路，我来设计一个简化的架构：

## 代码调用节点架构设计

### 核心设计理念
1. **用户提供的脚本**：用户直接提供 PowerShell、Bash、Python 或 JavaScript 脚本内容
2. **TypeScript 执行层**：Node.js/TypeScript 环境负责调用系统命令执行这些脚本
3. **无沙箱机制**：暂时不实现复杂的沙箱，直接在宿主环境执行
4. **结果返回**：捕获脚本输出、错误和退出码，返回给工作流

### 架构组件

#### 1. 代码调用节点类型 (CodeNode)
```typescript
// 在 src/domain/workflow/graph/value-objects/node-type.ts 中添加
export enum NodeTypeValue {
  // 现有类型...
  CODE = 'CODE'  // 新增代码调用节点类型
}
```

#### 2. 节点配置结构
```typescript
interface CodeNodeConfig {
  scriptType: 'bash' | 'powershell' | 'python' | 'javascript';
  scriptContent: string;  // 用户提供的脚本内容
  workingDirectory?: string;  // 可选的工作目录
  timeout?: number;  // 超时时间（毫秒）
  environmentVariables?: Record<string, string>;  // 环境变量
}
```

#### 3. 代码执行器 (CodeExecutor)
```typescript
class CodeExecutor {
  async execute(config: CodeNodeConfig): Promise<ExecutionResult> {
    // 根据脚本类型选择执行方式
    // 捕获 stdout, stderr, exit code
    // 处理超时
    // 返回结构化结果
  }
}
```

#### 4. 执行结果结构
```typescript
interface ExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  success: boolean;
  executionTime: number;  // 执行时间（毫秒）
}
```

### 执行流程

1. **节点初始化**：从节点配置中读取脚本内容和类型
2. **脚本执行**：
   - Bash: 使用 `spawn('bash', ['-c', scriptContent])`
   - PowerShell: 使用 `spawn('powershell', ['-Command', scriptContent])`
   - Python: 使用 `spawn('python', ['-c', scriptContent])`
   - JavaScript: 使用 `spawn('node', ['-e', scriptContent])`
3. **结果处理**：捕获输出、错误和退出码
4. **返回结果**：将执行结果传递给工作流中的下一个节点

### 安全考虑（简化版）

1. **路径验证**：确保工作目录在允许的范围内
2. **超时控制**：防止无限循环的脚本
3. **基础日志**：记录执行的脚本和结果

### 实现位置

1. **节点类型定义**：`src/domain/workflow/graph/value-objects/node-type.ts`
2. **执行器实现**：`src/infrastructure/workflow/nodes/executors/code-node-executor.ts`
3. **工厂注册**：`src/infrastructure/workflow/nodes/factories/node-executor-factory.ts`

这个设计简化了架构，直接让用户负责脚本内容，系统只负责执行和结果返回。这样的设计更灵活，用户可以根据需要执行任何脚本，而不需要系统预定义各种操作。
