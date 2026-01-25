# 重试处理器设计

## 文件位置
`sdk/core/http/retry-handler.ts`

## 设计目标
提供指数退避重试策略，自动处理可重试的错误，提高请求成功率。

## 核心职责
- 执行带重试的函数
- 判断错误是否可重试
- 计算重试延迟时间
- 执行指数退避算法

## 构造函数
接收配置对象，包含：
- maxRetries：最大重试次数
- baseDelay：基础延迟时间（毫秒）
- maxDelay：最大延迟时间（毫秒，默认30000）

## 公开方法

### executeWithRetry方法
执行带重试的函数。
接收一个返回Promise的函数，执行步骤：
1. 初始化lastError变量
2. 循环从0到maxRetries（包含maxRetries）
3. 在每次循环中：
   - 尝试执行传入的函数
   - 如果成功，直接返回结果
   - 如果失败，保存错误到lastError
   - 调用shouldRetry判断是否应该重试
   - 如果不应该重试或已达到最大重试次数，抛出错误
   - 调用calculateDelay计算延迟时间
   - 调用sleep等待延迟时间
4. 循环结束后抛出lastError

## 私有方法

### shouldRetry方法
判断错误是否可重试。
执行步骤：
1. 提取错误消息（转小写）和错误码
2. 检查网络错误：消息包含network、econnrefused、enotfound、etimedout
3. 检查超时错误：消息包含timeout或错误码是ETIMEDOUT
4. 检查速率限制错误：错误码是429或消息包含rate limit
5. 检查服务器错误：错误码在500-599之间
6. 如果满足任一条件，返回true，否则返回false

### calculateDelay方法
计算重试延迟时间（指数退避）。
执行步骤：
1. 计算指数延迟：baseDelay乘以2的attempt次方
2. 返回指数延迟和maxDelay中的较小值

### sleep方法
延迟指定时间。
执行步骤：
1. 返回一个Promise，在指定时间后resolve

## 设计要点
- 使用指数退避算法，避免重试风暴
- 只重试可重试的错误（网络、超时、限流、服务器错误）
- 不重试客户端错误（4xx，除了429）
- 最大延迟时间限制为30秒
- 重试次数包含初始请求，实际重试次数为maxRetries