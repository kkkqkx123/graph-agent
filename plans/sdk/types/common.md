# Common类型需求分析与设计

## 需求分析

### 核心需求
1. 定义通用的基础类型
2. 定义ID、时间戳等值对象
3. 定义版本类型
4. 定义元数据类型

### 功能需求
1. ID类型支持字符串和UUID
2. 时间戳类型支持创建和更新
3. 版本类型支持版本管理
4. 元数据类型支持自定义扩展

### 非功能需求
1. 类型安全的基础类型
2. 不可变值对象
3. 易于使用和扩展

## 设计说明

### 核心类型

#### ID
ID值对象类型。

**属性**：
- value: ID值（字符串）

**方法**：
- toString(): 转换为字符串
- equals(other: ID): 比较是否相等
- static generate(): 生成新ID
- static fromString(value: string): 从字符串创建ID

**设计说明**：
- 使用字符串作为ID，支持UUID或其他格式
- 不可变值对象
- 提供生成和解析方法

#### Timestamp
时间戳值对象类型。

**属性**：
- value: 时间戳值（毫秒）

**方法**：
- toDate(): 转换为Date对象
- toISOString(): 转换为ISO字符串
- equals(other: Timestamp): 比较是否相等
- static now(): 创建当前时间戳
- static fromDate(date: Date): 从Date创建

**设计说明**：
- 使用毫秒时间戳
- 不可变值对象
- 提供便捷的创建方法

#### Version
版本值对象类型。

**属性**：
- value: 版本值（字符串，如"1.0.0"）

**方法**：
- toString(): 转换为字符串
- equals(other: Version): 比较是否相等
- nextMajor(): 下一个主版本
- nextMinor(): 下一个次版本
- nextPatch(): 下一个补丁版本
- static initial(): 创建初始版本（"1.0.0"）

**设计说明**：
- 遵循语义化版本规范
- 不可变值对象
- 提供版本递增方法

#### Metadata
元数据类型。

**属性**：
- data: 元数据对象（Record<string, any>）

**方法**：
- get(key: string): 获取元数据值
- set(key: string, value: any): 设置元数据值
- has(key: string): 检查是否存在
- delete(key: string): 删除元数据值
- toObject(): 转换为普通对象

**设计说明**：
- 支持任意键值对
- 提供便捷的访问方法
- 可变对象

### 设计原则

1. **不可变性**：值对象不可变，确保数据一致性
2. **类型安全**：严格的类型定义
3. **便捷性**：提供便捷的创建和操作方法
4. **可扩展**：支持自定义扩展

### 依赖关系

- 被所有其他类型引用
- 基础类型，无依赖