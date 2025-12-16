# 代码执行节点使用示例和最佳实践

## 概述

本文档提供了代码执行节点的详细使用示例和最佳实践，帮助用户快速上手并有效利用代码执行节点的功能。

## 基本使用示例

### 1. JavaScript数据处理

#### 场景：数据转换和计算

```json
{
  "id": "dataTransform",
  "type": "code",
  "properties": {
    "language": "javascript",
    "code": "const input = context.input || [];\nconst result = input.map(item => {\n  return {\n    id: item.id,\n    name: item.name,\n    value: item.value * 2,\n    category: item.value > 50 ? 'high' : 'low'\n  };\n});\nreturn result;",
    "parameters": {
      "input": "{{previousNode.result}}"
    },
    "timeout": 5000,
    "output": {
      "format": "json",
      "captureStdout": true,
      "captureStderr": true
    }
  }
}
```

#### 场景：字符串处理

```json
{
  "id": "textProcessing",
  "type": "code",
  "properties": {
    "language": "javascript",
    "code": "const text = context.text || '';\nconst words = text.toLowerCase().split(/\\s+/);\nconst wordCount = words.length;\nconst uniqueWords = new Set(words).size;\nconst avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / wordCount;\n\nreturn {\n  originalText: text,\n  wordCount,\n  uniqueWords,\n  avgWordLength: Math.round(avgWordLength * 100) / 100,\n  words: words.slice(0, 10) // 返回前10个词作为示例\n};",
    "parameters": {
      "text": "{{userInput}}"
    },
    "timeout": 3000
  }
}
```

### 2. Python数据分析

#### 场景：统计分析

```json
{
  "id": "dataAnalysis",
  "type": "code",
  "properties": {
    "language": "python",
    "code": "import json\nimport statistics\n\ndata = context.get('data', [])\nif not data:\n    result = {'error': 'No data provided'}\nelse:\n    numbers = [item.get('value', 0) for item in data if isinstance(item.get('value'), (int, float))]\n    if numbers:\n        result = {\n            'count': len(numbers),\n            'sum': sum(numbers),\n            'mean': statistics.mean(numbers),\n            'median': statistics.median(numbers),\n            'min': min(numbers),\n            'max': max(numbers),\n            'std_dev': statistics.stdev(numbers) if len(numbers) > 1 else 0\n        }\n    else:\n        result = {'error': 'No valid numbers found'}\n\nprint(json.dumps(result))",
    "parameters": {
      "data": "{{dataCollection.result}}"
    },
    "timeout": 10000,
    "security": {
      "allowFileSystemAccess": false,
      "allowNetworkAccess": false,
      "maxMemory": 128000000,
      "maxCpuTime": 8000
    }
  }
}
```

#### 场景：文本分析

```json
{
  "id": "textAnalysis",
  "type": "code",
  "properties": {
    "language": "python",
    "code": "import json\nimport re\nfrom collections import Counter\n\ntext = context.get('text', '')\nwords = re.findall(r'\\b\\w+\\b', text.lower())\nword_freq = Counter(words)\nsentences = re.split(r'[.!?]+', text)\nsentences = [s.strip() for s in sentences if s.strip()]\n\nresult = {\n    'character_count': len(text),\n    'word_count': len(words),\n    'sentence_count': len(sentences),\n    'avg_words_per_sentence': len(words) / len(sentences) if sentences else 0,\n    'most_common_words': word_freq.most_common(5),\n    'unique_words': len(word_freq)\n}\n\nprint(json.dumps(result))",
    "parameters": {
      "text": "{{document.content}}"
    },
    "timeout": 15000
  }
}
```

### 3. Bash脚本执行

#### 场景：文件操作

```json
{
  "id": "fileOperations",
  "type": "code",
  "properties": {
    "language": "bash",
    "code": "#!/bin/bash\nset -e\n\nINPUT_DIR=\"$INPUT_DIR\"\nOUTPUT_DIR=\"$OUTPUT_DIR\"\nFILE_PATTERN=\"$FILE_PATTERN\"\n\n# 创建输出目录\nmkdir -p \"$OUTPUT_DIR\"\n\n# 处理文件\ncount=0\nfor file in \"$INPUT_DIR\"/$FILE_PATTERN; do\n  if [ -f \"$file\" ]; then\n    filename=$(basename \"$file\")\n    # 简单的文件处理示例：计算行数并保存\n    line_count=$(wc -l < \"$file\")\n    echo \"$filename: $line_count lines\" >> \"$OUTPUT_DIR/file_stats.txt\"\n    count=$((count + 1))\n  fi\ndone\n\necho \"Processed $count files\"\necho \"Results saved to $OUTPUT_DIR/file_stats.txt\"",
    "parameters": {
      "INPUT_DIR": "/tmp/input",
      "OUTPUT_DIR": "/tmp/output",
      "FILE_PATTERN": "*.txt"
    },
    "timeout": 30000,
    "security": {
      "allowFileSystemAccess": true,
      "allowNetworkAccess": false,
      "maxMemory": 64000000,
      "maxCpuTime": 10000,
      "allowedPaths": ["/tmp/input", "/tmp/output"]
    }
  }
}
```

#### 场景：系统信息收集

```json
{
  "id": "systemInfo",
  "type": "code",
  "properties": {
    "language": "bash",
    "code": "#!/bin/bash\n\necho \"=== System Information ===\"\necho \"Timestamp: $(date)\"\necho \"Hostname: $(hostname)\"\necho \"OS: $(uname -a)\"\necho \"Uptime: $(uptime -p)\"\necho\necho \"=== Memory Usage ===\"\nfree -h\necho\necho \"=== Disk Usage ===\"\ndf -h | head -5\necho\necho \"=== Process Count ===\"\nps aux | wc -l",
    "timeout": 10000,
    "security": {
      "allowFileSystemAccess": false,
      "allowNetworkAccess": false,
      "maxMemory": 32000000,
      "maxCpuTime": 5000
    }
  }
}
```

### 4. PowerShell脚本执行

#### 场景：Windows系统管理

```json
{
  "id": "windowsManagement",
  "type": "code",
  "properties": {
    "language": "powershell",
    "code": "# 获取系统信息\n$systemInfo = Get-ComputerInfo | Select-Object OsName, OsVersion, TotalPhysicalMemory, CsProcessors\n\n# 获取运行的服务\n$services = Get-Service | Where-Object {$_.Status -eq 'Running'} | Select-Object Name, DisplayName, Status | ConvertTo-Json -Depth 1\n\n# 获取进程信息\n$processes = Get-Process | Select-Object Name, CPU, WorkingSet | Sort-Object CPU -Descending | Select-Object -First 10 | ConvertTo-Json -Depth 1\n\n# 构建结果\n$result = @{\n    systemInfo = $systemInfo\n    serviceCount = (Get-Service | Where-Object {$_.Status -eq 'Running'}).Count\n    topProcesses = $processes\n    timestamp = Get-Date -Format \"yyyy-MM-dd HH:mm:ss\"\n}\n\n# 输出JSON结果\n$result | ConvertTo-Json -Depth 3",
    "timeout": 20000,
    "security": {
      "allowFileSystemAccess": false,
      "allowNetworkAccess": false,
      "maxMemory": 128000000,
      "maxCpuTime": 15000
    }
  }
}
```

## 高级使用场景

### 1. 数据管道处理

#### 多步骤数据处理工作流

```json
{
  "nodes": [
    {
      "id": "start",
      "type": "start",
      "properties": {}
    },
    {
      "id": "dataIngestion",
      "type": "code",
      "properties": {
        "language": "python",
        "code": "import json\nimport requests\n\n# 从API获取数据\nurl = context.get('api_url', 'https://api.example.com/data')\nresponse = requests.get(url, timeout=10)\ndata = response.json()\n\n# 数据清洗\ncleaned_data = []\nfor item in data:\n    if item.get('active', False):\n        cleaned_data.append({\n            'id': item['id'],\n            'name': item['name'].strip(),\n            'value': float(item.get('value', 0)),\n            'category': item.get('category', 'unknown').lower()\n        })\n\nresult = {\n    'total_records': len(data),\n    'cleaned_records': len(cleaned_data),\n    'data': cleaned_data\n}\n\nprint(json.dumps(result))",
        "parameters": {
          "api_url": "{{config.apiUrl}}"
        },
        "timeout": 30000,
        "security": {
          "allowNetworkAccess": true,
          "maxMemory": 256000000
        }
      }
    },
    {
      "id": "dataTransformation",
      "type": "code",
      "properties": {
        "language": "javascript",
        "code": "const data = context.data || [];\nconst transformations = context.transformations || {};\n\n// 应用转换规则\nlet result = data.map(item => {\n  let transformed = { ...item };\n  \n  // 数值转换\n  if (transformations.multiply) {\n    transformed.value = item.value * transformations.multiply;\n  }\n  \n  // 分类映射\n  if (transformations.categoryMapping && transformations.categoryMapping[item.category]) {\n    transformed.category = transformations.categoryMapping[item.category];\n  }\n  \n  // 添加计算字段\n  if (transformations.addComputedFields) {\n    transformed.score = Math.round(item.value * 0.8 + Math.random() * 20);\n  }\n  \n  return transformed;\n});\n\n// 过滤数据\nif (transformations.filter) {\n  result = result.filter(item => {\n    if (transformations.filter.minValue && item.value < transformations.filter.minValue) {\n      return false;\n    }\n    if (transformations.filter.categories && !transformations.filter.categories.includes(item.category)) {\n      return false;\n    }\n    return true;\n  });\n}\n\n// 排序\nif (transformations.sort) {\n  result.sort((a, b) => {\n    if (transformations.sort.field === 'value') {\n      return transformations.sort.order === 'desc' ? b.value - a.value : a.value - b.value;\n    }\n    return 0;\n  });\n}\n\nreturn {\n  originalCount: data.length,\n  transformedCount: result.length,\n  data: result\n};",
        "parameters": {
          "data": "{{dataIngestion.result.data}}",
          "transformations": "{{config.transformations}}"
        },
        "timeout": 15000
      }
    },
    {
      "id": "dataAnalysis",
      "type": "code",
      "properties": {
        "language": "python",
        "code": "import json\nfrom collections import defaultdict, Counter\nimport statistics\n\ndata = context.get('data', [])\n\nif not data:\n    result = {'error': 'No data to analyze'}\nelse:\n    # 基本统计\n    values = [item['value'] for item in data if 'value' in item]\n    categories = [item['category'] for item in data if 'category' in item]\n    \n    # 数值统计\n    if values:\n        value_stats = {\n            'count': len(values),\n            'sum': sum(values),\n            'mean': statistics.mean(values),\n            'median': statistics.median(values),\n            'min': min(values),\n            'max': max(values),\n            'std_dev': statistics.stdev(values) if len(values) > 1 else 0\n        }\n    else:\n        value_stats = {}\n    \n    # 分类统计\n    category_stats = Counter(categories)\n    \n    # 分组统计\n    grouped_stats = defaultdict(list)\n    for item in data:\n        category = item.get('category', 'unknown')\n        grouped_stats[category].append(item.get('value', 0))\n    \n    group_analysis = {}\n    for category, values in grouped_stats.items():\n        if values:\n            group_analysis[category] = {\n                'count': len(values),\n                'mean': statistics.mean(values),\n                'min': min(values),\n                'max': max(values)\n            }\n    \n    result = {\n        'total_records': len(data),\n        'value_statistics': value_stats,\n        'category_distribution': dict(category_stats),\n        'group_analysis': group_analysis,\n        'data_quality': {\n            'missing_values': len(data) - len(values),\n            'unique_categories': len(category_stats),\n            'completeness': len(values) / len(data) if data else 0\n        }\n    }\n\nprint(json.dumps(result, indent=2))",
        "parameters": {
          "data": "{{dataTransformation.result.data}}"
        },
        "timeout": 20000
      }
    },
    {
      "id": "end",
      "type": "end",
      "properties": {}
    }
  ],
  "edges": [
    {
      "id": "edge1",
      "fromNodeId": "start",
      "toNodeId": "dataIngestion"
    },
    {
      "id": "edge2",
      "fromNodeId": "dataIngestion",
      "toNodeId": "dataTransformation"
    },
    {
      "id": "edge3",
      "fromNodeId": "dataTransformation",
      "toNodeId": "dataAnalysis"
    },
    {
      "id": "edge4",
      "fromNodeId": "dataAnalysis",
      "toNodeId": "end"
    }
  ]
}
```

### 2. 机器学习推理

#### 模型预测工作流

```json
{
  "id": "modelPrediction",
  "type": "code",
  "properties": {
    "language": "python",
    "code": "import json\nimport numpy as np\n\n# 模拟机器学习模型预测\ndef predict(features, model_type='linear_regression'):\n    \"\"\"\n    模拟模型预测函数\n    在实际应用中，这里会加载真实的模型\n    \"\"\"\n    if model_type == 'linear_regression':\n        # 简单的线性回归模拟\n        weights = [0.5, -0.3, 0.8, 0.2]\n        bias = 1.5\n        prediction = sum(f * w for f, w in zip(features, weights)) + bias\n    elif model_type == 'classification':\n        # 简单的分类模拟\n        score = sum(features) / len(features)\n        if score > 0.7:\n            prediction = 'high'\n        elif score > 0.4:\n            prediction = 'medium'\n        else:\n            prediction = 'low'\n    else:\n        prediction = features[0]  # 默认返回第一个特征\n    \n    return prediction\n\n# 获取输入数据\ninput_data = context.get('input_data', [])\nmodel_type = context.get('model_type', 'linear_regression')\n\nif not input_data:\n    result = {'error': 'No input data provided'}\nelse:\n    predictions = []\n    for item in input_data:\n        features = item.get('features', [])\n        if not features:\n            continue\n            \n        try:\n            prediction = predict(features, model_type)\n            predictions.append({\n                'id': item.get('id'),\n                'features': features,\n                'prediction': prediction,\n                'confidence': np.random.uniform(0.7, 0.95)  # 模拟置信度\n            })\n        except Exception as e:\n            predictions.append({\n                'id': item.get('id'),\n                'error': str(e)\n            })\n    \n    # 计算预测统计\n    successful_predictions = [p for p in predictions if 'prediction' in p]\n    \n    result = {\n        'model_type': model_type,\n        'total_inputs': len(input_data),\n        'successful_predictions': len(successful_predictions),\n        'failed_predictions': len(predictions) - len(successful_predictions),\n        'predictions': predictions\n    }\n    \n    if successful_predictions:\n        # 添加预测统计\n        if model_type == 'classification':\n            pred_counts = {}\n            for p in successful_predictions:\n                pred = p['prediction']\n                pred_counts[pred] = pred_counts.get(pred, 0) + 1\n            result['prediction_distribution'] = pred_counts\n        else:\n            pred_values = [p['prediction'] for p in successful_predictions]\n            result['prediction_stats'] = {\n                'mean': sum(pred_values) / len(pred_values),\n                'min': min(pred_values),\n                'max': max(pred_values)\n            }\n\nprint(json.dumps(result, indent=2))",
    "parameters": {
      "input_data": "{{dataPreparation.result}}",
      "model_type": "{{config.modelType}}"
    },
    "timeout": 30000,
    "security": {
      "allowFileSystemAccess": false,
      "allowNetworkAccess": false,
      "maxMemory": 256000000,
      "maxCpuTime": 20000
    }
  }
}
```

## 最佳实践

### 1. 代码编写最佳实践

#### JavaScript最佳实践

```javascript
// ✅ 好的做法
const processData = (data) => {
  // 输入验证
  if (!Array.isArray(data)) {
    throw new Error('Input must be an array');
  }
  
  // 数据处理
  const result = data
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      id: item.id || 'unknown',
      value: Number(item.value) || 0,
      processed: true
    }))
    .filter(item => item.value > 0);
  
  return result;
};

const result = processData(context.input || []);
return result;

// ❌ 避免的做法
// 使用eval或Function构造函数
// eval(context.userInput);

// 直接访问全局对象
// process.exit(1);

// 无限循环
// while (true) { /* ... */ }
```

#### Python最佳实践

```python
# ✅ 好的做法
import json
import sys

def process_data(data):
    """处理输入数据"""
    if not isinstance(data, list):
        raise ValueError("Input must be a list")
    
    result = []
    for item in data:
        if isinstance(item, dict) and 'value' in item:
            try:
                processed_item = {
                    'id': item.get('id', 'unknown'),
                    'value': float(item['value']),
                    'doubled': item['value'] * 2
                }
                result.append(processed_item)
            except (ValueError, TypeError):
                continue  # 跳过无效数据
    
    return result

# 主执行逻辑
try:
    input_data = context.get('input', [])
    result = process_data(input_data)
    print(json.dumps(result))
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)

# ❌ 避免的做法
# 使用exec或eval
# exec(user_input)

# 导入危险模块
# import os
# os.system('rm -rf /')

# 无限递归
# def factorial(n):
#     return n * factorial(n-1)
```

### 2. 性能优化建议

#### 代码优化

```javascript
// ✅ 使用高效的数据结构和算法
const uniqueItems = [...new Set(items.map(item => item.id))];

// ✅ 避免不必要的计算
const expensiveValue = calculateExpensiveValue();
const result = items.map(item => ({
  ...item,
  calculated: item.value * expensiveValue
}));

// ✅ 使用适当的循环方式
for (const item of largeArray) {
  // 处理逻辑
}

// ❌ 避免在循环中进行重复计算
for (const item of items) {
  const expensive = calculateExpensiveValue(); // 每次循环都计算
  item.result = item.value * expensive;
}
```

```python
# ✅ 使用列表推导式
result = [item * 2 for item in data if item > 0]

# ✅ 使用生成器处理大数据
def process_large_data(data):
    for item in data:
        if item and item.get('active'):
            yield transform_item(item)

# ✅ 缓存计算结果
from functools import lru_cache

@lru_cache(maxsize=128)
def expensive_calculation(x):
    # 复杂计算
    return result

# ❌ 避免在循环中重复计算
for item in items:
    result = expensive_calculation(item.value)  # 每次都重新计算
```

### 3. 错误处理最佳实践

```javascript
// ✅ 全面的错误处理
try {
  const input = context.input || [];
  
  if (!Array.isArray(input)) {
    throw new Error('Input must be an array');
  }
  
  const result = input.map(item => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Invalid item: ${JSON.stringify(item)}`);
    }
    
    return {
      id: item.id || 'unknown',
      value: Number(item.value) || 0
    };
  });
  
  return result;
} catch (error) {
  // 记录错误并返回默认值
  console.error('Processing error:', error.message);
  return { error: error.message, data: [] };
}
```

```python
# ✅ 全面的错误处理
import json
import sys
import traceback

def main():
    try:
        input_data = context.get('input', [])
        
        if not isinstance(input_data, list):
            raise ValueError("Input must be a list")
        
        result = []
        for item in input_data:
            try:
                processed = process_item(item)
                result.append(processed)
            except Exception as item_error:
                # 记录单项错误但继续处理其他项
                print(f"Error processing item {item}: {str(item_error)}", file=sys.stderr)
                continue
        
        print(json.dumps(result))
        
    except Exception as e:
        print(f"Fatal error: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
```

### 4. 安全性最佳实践

#### 输入验证

```javascript
// ✅ 严格的输入验证
function validateInput(input) {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Input must be an object');
  }
  
  if (Array.isArray(input.items)) {
    if (input.items.length > 1000) {
      throw new Error('Too many items');
    }
    
    for (const item of input.items) {
      if (typeof item.value !== 'number' || item.value < 0) {
        throw new Error('Invalid item value');
      }
    }
  }
  
  return true;
}

validateInput(context.input);
```

```python
# ✅ 严格的输入验证
def validate_input(data):
    if not isinstance(data, dict):
        raise ValueError("Input must be a dictionary")
    
    if 'items' in data:
        items = data['items']
        if not isinstance(items, list):
            raise ValueError("Items must be a list")
        
        if len(items) > 1000:
            raise ValueError("Too many items")
        
        for i, item in enumerate(items):
            if not isinstance(item, dict):
                raise ValueError(f"Item {i} must be a dictionary")
            
            if 'value' in item and not isinstance(item['value'], (int, float)):
                raise ValueError(f"Item {i} value must be a number")
    
    return True

try:
    input_data = context.get('input', {})
    validate_input(input_data)
except ValueError as e:
    print(f"Validation error: {str(e)}", file=sys.stderr)
    sys.exit(1)
```

### 5. 调试和测试建议

#### 添加调试信息

```javascript
// ✅ 添加调试日志
const debug = context.debug || false;

function log(message, data) {
  if (debug) {
    console.log(`[DEBUG] ${message}:`, JSON.stringify(data));
  }
}

log('Starting processing', { itemCount: context.input?.length });

const result = processData(context.input);

log('Processing complete', { resultCount: result.length });

return result;
```

```python
# ✅ 添加调试信息
import json

debug = context.get('debug', False)

def log(message, data=None):
    if debug:
        if data:
            print(f"[DEBUG] {message}: {json.dumps(data)}")
        else:
            print(f"[DEBUG] {message}")

log('Starting processing', {'item_count': len(context.get('input', []))})

result = process_data(context.get('input', []))

log('Processing complete', {'result_count': len(result)})

print(json.dumps(result))
```

## 常见问题和解决方案

### 1. 性能问题

**问题**：代码执行超时
**解决方案**：
- 优化算法复杂度
- 减少不必要的计算
- 增加超时时间（在安全范围内）
- 分批处理大数据

### 2. 内存问题

**问题**：内存使用过高
**解决方案**：
- 使用流式处理
- 及时释放不需要的变量
- 限制数据大小
- 使用生成器（Python）

### 3. 安全问题

**问题**：代码执行安全风险
**解决方案**：
- 严格输入验证
- 使用沙箱环境
- 限制资源使用
- 禁用危险操作

### 4. 兼容性问题

**问题**：不同环境的兼容性
**解决方案**：
- 使用标准库功能
- 避免平台特定代码
- 测试不同环境
- 提供降级方案

## 总结

代码执行节点提供了强大的数据处理和计算能力，通过合理的使用和最佳实践，可以构建高效、安全、可靠的工作流。关键是要注意代码质量、性能优化、安全性和错误处理，确保工作流的稳定运行。