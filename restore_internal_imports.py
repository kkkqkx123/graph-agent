#!/usr/bin/env python3
"""
恢复包内相对路径导入脚本
将错误的绝对路径导入恢复为正确的相对路径导入
"""

import os
import re
from pathlib import Path

def restore_imports_in_directory(directory):
    """
    恢复指定目录中的包内相对路径导入
    """
    directory = Path(directory)
    
    # 恢复 common-utils 包内的导入
    patterns = [
        # http 模块内部的导入
        (r"from\s+['\"]@modular-agent/common-utils/http/([^'\"]+)['\"]", r"from './\1'"),
        
        # llm 模块内部的导入
        (r"from\s+['\"]@modular-agent/common-utils/llm/([^'\"]+)['\"]", r"from './\1'"),
        
        # utils 模块内部的导入
        (r"from\s+['\"]@modular-agent/common-utils/([^'\"]+)['\"]", r"from '../\1'"),
    ]
    
    modified_files = []
    
    for ts_file in directory.rglob('*.ts'):
        # 跳过声明文件
        if ts_file.name.endswith('.d.ts'):
            continue
            
        try:
            with open(ts_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # 应用所有模式
            for pattern, replacement in patterns:
                content = re.sub(pattern, replacement, content)
            
            # 如果内容有变化，写回文件
            if content != original_content:
                with open(ts_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                modified_files.append(str(ts_file))
                print(f"✓ 恢复: {ts_file}")
                
        except Exception as e:
            print(f"✗ 错误处理 {ts_file}: {e}")
    
    return modified_files

def main():
    print("开始恢复包内相对路径导入...\n")
    
    # 修复 packages/common-utils
    print("恢复 packages/common-utils:")
    common_utils_files = restore_imports_in_directory('packages/common-utils/src')
    print(f"  共恢复 {len(common_utils_files)} 个文件\n")
    
    total = len(common_utils_files)
    print(f"总计恢复 {total} 个文件")
    
    if total > 0:
        print("\n✓ 所有包内导入路径已恢复为相对路径")
    else:
        print("\n未发现需要恢复的文件")

if __name__ == '__main__':
    main()