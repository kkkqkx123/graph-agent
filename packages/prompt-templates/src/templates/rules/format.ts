/**
 * 格式规则模板
 * 用于定义代码格式化规则
 */

import type { PromptTemplate } from '../../types/template.js';

/**
 * 格式规则模板
 */
export const FORMAT_RULE_TEMPLATE: PromptTemplate = {
  id: 'rules.format',
  name: 'Format Rules',
  description: '代码格式化规则',
  category: 'rules',
  content: `## 代码格式规则

### 基本原则
1. **一致性**：保持代码风格的一致性
2. **可读性**：优先考虑代码的可读性
3. **简洁性**：避免不必要的复杂性

### 缩进和空格
- 使用 2 个空格进行缩进
- 运算符前后添加空格
- 逗号后添加空格
- 冒号后添加空格

### 命名规范
- 变量和函数使用 camelCase
- 类和接口使用 PascalCase
- 常量使用 UPPER_SNAKE_CASE
- 私有成员使用下划线前缀

### 注释规范
- 为复杂逻辑添加注释
- 注释应说明"为什么"而非"是什么"
- 保持注释与代码同步更新

### 行长度
- 每行代码不超过 80 字符
- 长表达式应适当换行
- 保持换行的一致性

### 其他规范
- 使用单引号而非双引号
- 语句末尾添加分号
- 避免使用 var，使用 const 或 let
- 优先使用箭头函数`,
  variables: []
};