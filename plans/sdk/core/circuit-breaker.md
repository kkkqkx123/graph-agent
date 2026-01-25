# 熔断器设计

## 文件位置
`sdk/core/http/circuit-breaker.ts`

## 设计目标
防止级联故障，当失败次数达到阈值时打开熔断器，快速失败，避免雪崩效应。

## 核心职责
- 监控请求成功和失败
- 根据失败率自动打开和关闭熔断器
- 提供三种状态：关闭、打开、半开
- 支持手动重置

## 状态定义
- CLOSED：关闭状态，正常请求
- OPEN：打开状态，拒绝所有请求
- HALF_OPEN：半开状态，允许少量请求测试服务是否恢复

## 构造函数
接收配置对象，包含：
- failureThreshold：失败阈值（默认5）
- successThreshold：成功阈值（默认3）
- resetTimeout：重置超时时间（默认60000毫秒）

## 公开方法

### execute方法
执行函数（带熔断保护）。
接收一个返回Promise的函数，执行步骤：
1. 调用isOpen检查熔断器是否打开
2. 如果打开，抛出错误
3. 尝试执行传入的函数
4. 如果成功，调用recordSuccess记录成功
5. 如果失败，调用recordFailure记录失败
6. 返回结果或抛出错误

### isOpen方法
检查熔断器是否打开。
执行步骤：
1. 如果状态是OPEN，检查是否可以尝试恢复
2. 如果当前时间大于等于nextAttempt，切换到HALF_OPEN状态
3. 重置successCount为0
4. 返回true或false

### getState方法
获取当前状态。
返回状态字符串（CLOSED、OPEN、HALF_OPEN）。

### reset方法
重置熔断器。
执行步骤：
1. 将状态设置为CLOSED
2. 重置failureCount为0
3. 重置successCount为0
4. 重置lastFailureTime为0
5. 重置nextAttempt为0

## 私有方法

### recordSuccess方法
记录成功。
执行步骤：
1. 重置failureCount为0
2. 如果状态是HALF_OPEN：
   - successCount加1
   - 如果successCount大于等于successThreshold，切换到CLOSED状态
   - 重置failureCount和successCount为0

### recordFailure方法
记录失败。
执行步骤：
1. 记录当前时间到lastFailureTime
2. 如果状态是CLOSED：
   - failureCount加1
   - 如果failureCount大于等于failureThreshold，切换到OPEN状态
   - 设置nextAttempt为当前时间加resetTimeout
3. 如果状态是HALF_OPEN：
   - 立即切换到OPEN状态
   - 设置nextAttempt为当前时间加resetTimeout
   - 重置successCount为0

## 设计要点
- 三种状态转换：CLOSED -> OPEN -> HALF_OPEN -> CLOSED
- 失败阈值达到后打开熔断器
- 超时后进入半开状态，允许少量请求测试
- 半开状态下连续成功达到阈值后关闭熔断器
- 半开状态下失败立即重新打开熔断器
- 防止级联故障，提高系统稳定性