# CodeNodeExecutor执行逻辑

## 概述
CodeNodeExecutor负责执行CODE节点，执行脚本代码，支持多种脚本语言，处理超时和重试。

## 核心职责
1. 验证代码配置
2. 根据风险等级选择执行策略
3. 执行脚本代码
4. 处理超时和重试
5. 返回执行结果

## doExecute方法执行逻辑

### 步骤1：获取代码配置
- 从节点配置获取scriptName
- 从节点配置获取scriptType
- 从节点配置获取risk
- 从节点配置获取timeout
- 从节点配置获取retries
- 从节点配置获取retryDelay

### 步骤2：验证代码配置
- 检查scriptName是否存在且不为空
- 检查scriptType是否合法（shell、cmd、powershell、python、javascript）
- 检查risk是否合法（none、low、medium、high）
- 检查timeout是否存在且大于0
- 检查retries是否存在且大于等于0
- 检查retryDelay是否存在且大于等于0
- 如果配置不合法，抛出ValidationError

### 步骤3：根据风险等级选择执行策略
- 如果risk为none：
  - 直接执行脚本，不进行任何安全检查
- 如果risk为low：
  - 进行基本的安全检查
  - 限制脚本执行权限
- 如果risk为medium：
  - 进行严格的安全检查
  - 在受限环境中执行
- 如果risk为high：
  - 在沙箱环境中执行
  - 限制网络访问和文件系统访问

### 步骤4：执行脚本代码
- 根据scriptType选择执行方式：
  - shell：使用bash执行
  - cmd：使用cmd.exe执行
  - powershell：使用powershell执行
  - python：使用python解释器执行
  - javascript：使用Node.js执行
- 设置超时时间为timeout
- 执行脚本代码
- 等待执行完成

### 步骤5：处理执行结果
- 如果执行成功：
  - 获取标准输出
  - 获取退出码
  - 如果退出码为0，执行成功
  - 如果退出码不为0，执行失败
- 如果执行失败：
  - 获取错误输出
  - 获取退出码
  - 记录错误信息

### 步骤6：处理重试
- 如果执行失败且retries > 0：
  - 减少retries计数
  - 等待retryDelay时间
  - 重新执行脚本
  - 重复步骤4-6
- 如果retries用完，抛出ExecutionError

### 步骤7：记录执行历史
- 创建ExecutionHistory记录
- 设置nodeId为CODE节点ID
- 设置timestamp为当前时间戳
- 设置action为"code"
- 设置details为{scriptName, scriptType, risk, exitCode, output}
- 添加到Thread的executionHistory

### 步骤8：返回执行结果
- 创建NodeExecutionResult
- 设置nodeId为CODE节点ID
- 设置success为执行是否成功
- 设置output为{stdout, stderr, exitCode}
- 设置executionTime为执行时间
- 设置metadata为节点元数据
- 返回NodeExecutionResult

## validate方法执行逻辑

### 步骤1：验证节点类型
- 检查节点类型是否为CODE
- 如果不是，抛出ValidationError

### 步骤2：验证代码配置
- 检查scriptName是否存在且不为空
- 检查scriptType是否合法
- 检查risk是否合法
- 检查timeout是否存在且大于0
- 检查retries是否存在且大于等于0
- 检查retryDelay是否存在且大于等于0
- 如果配置不合法，抛出ValidationError

### 步骤3：返回验证结果
- 返回true

## canExecute方法执行逻辑

### 步骤1：检查Thread状态
- 检查Thread状态是否为RUNNING
- 如果不是，返回false

### 步骤2：检查脚本是否存在
- 检查脚本文件是否存在
- 如果不存在，返回false

### 步骤3：返回执行结果
- 返回true

## 脚本执行逻辑

### shell脚本执行
- 使用bash执行脚本
- 命令：bash scriptName
- 捕获标准输出和错误输出
- 获取退出码

### cmd脚本执行
- 使用cmd.exe执行脚本
- 命令：cmd /c scriptName
- 捕获标准输出和错误输出
- 获取退出码

### powershell脚本执行
- 使用powershell执行脚本
- 命令：powershell -File scriptName
- 捕获标准输出和错误输出
- 获取退出码

### python脚本执行
- 使用python解释器执行脚本
- 命令：python scriptName
- 捕获标准输出和错误输出
- 获取退出码

### javascript脚本执行
- 使用Node.js执行脚本
- 命令：node scriptName
- 捕获标准输出和错误输出
- 获取退出码

## 风险等级处理逻辑

### none风险等级
- 直接执行脚本
- 不进行任何安全检查
- 不限制执行权限
- 适用于可信的脚本

### low风险等级
- 进行基本的安全检查
- 检查脚本路径是否合法
- 限制脚本执行权限
- 适用于低风险脚本

### medium风险等级
- 进行严格的安全检查
- 检查脚本内容是否包含危险命令
- 在受限环境中执行
- 限制网络访问和文件系统访问
- 适用于中等风险脚本

### high风险等级
- 在沙箱环境中执行
- 完全隔离执行环境
- 限制所有系统资源访问
- 适用于高风险脚本

## 超时控制逻辑

### 步骤1：设置超时定时器
- 创建超时定时器
- 设置定时器时间为timeout

### 步骤2：执行脚本
- 执行脚本代码
- 等待执行完成

### 步骤3：处理超时
- 如果在超时时间内完成，清除定时器
- 如果超时，终止脚本进程
- 抛出TimeoutError

## 重试逻辑

### 步骤1：初始化重试计数器
- 设置retryCount为0

### 步骤2：执行脚本
- 执行脚本代码
- 等待执行完成

### 步骤3：处理执行失败
- 如果执行失败：
  - 检查retryCount是否小于retries
  - 如果是，增加retryCount
  - 等待retryDelay时间
  - 重新执行脚本
  - 重复步骤2-3
  - 如果否，抛出ExecutionError

### 步骤4：返回执行结果
- 如果执行成功，返回执行结果
- 如果重试次数用完，抛出ExecutionError

## 错误处理逻辑

### 代码配置错误
- 如果scriptName、scriptType或risk缺失，抛出ValidationError
- 错误消息："Code node must have scriptName, scriptType, and risk"

### 脚本不存在错误
- 如果脚本文件不存在，抛出NotFoundError
- 错误消息："Script not found: {scriptName}"

### 脚本执行错误
- 如果脚本执行失败，抛出ExecutionError
- 错误消息："Script execution failed with exit code {exitCode}"

### 超时错误
- 如果脚本执行超时，抛出TimeoutError
- 错误消息："Script execution timeout after {timeout} seconds"

## 注意事项

1. **配置验证**：严格验证代码配置
2. **风险控制**：根据风险等级选择执行策略
3. **超时控制**：严格控制执行时间
4. **重试策略**：合理设置重试次数和延迟
5. **错误处理**：妥善处理各种错误情况
6. **安全检查**：进行必要的安全检查
7. **资源清理**：及时清理不再使用的资源