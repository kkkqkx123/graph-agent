#!/usr/bin/env python3
"""
最终修复类型导入路径脚本
只替换指向 types 包的相对路径导入，保持包内相对路径不变
"""

import os
import re
from pathlib import Path

def fix_imports_in_directory(directory):
    """
    修复指定目录中的所有TypeScript文件的导入路径
    只替换指向 types 包的相对路径导入
    """
    directory = Path(directory)
    
    # 构建匹配1-6层相对路径的正则表达式
    relative_path_pattern = r"(\.\./){1,6}"
    
    # 只处理指向 types 包的导入
    patterns = [
        # 匹配 from '../../../types/xxx' (1-6层)
        (rf"from\s+['\"]{relative_path_pattern}types/([^'\"]+)['\"]", r"from '@modular-agent/types/\2'"),
        # 匹配 import { xxx } from '../../../types/xxx'
        (rf"import\s+.*?from\s+['\"]{relative_path_pattern}types/([^'\"]+)['\"]", r"import \1from '@modular-agent/types/\2'"),
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
                print(f"✓ 修复: {ts_file}")
                
        except Exception as e:
            print(f"✗ 错误处理 {ts_file}: {e}")
    
    return modified_files

def main():
    print("开始修复类型导入路径（只替换 types 包的导入）...\n")
    
    # 修复 packages/common-utils
    print("修复 packages/common-utils:")
    common_utils_files = fix_imports_in_directory('packages/common-utils/src')
    print(f"  共修复 {len(common_utils_files)} 个文件\n")
    
    # 修复 sdk
    print("修复 sdk:")
    sdk_files = fix_imports_in_directory('sdk')
    print(f"  共修复 {len(sdk_files)} 个文件\n")
    
    total = len(common_utils_files) + len(sdk_files)
    print(f"总计修复 {total} 个文件")
    
    if total > 0:
        print("\n✓ 所有 types 包导入路径已修复为绝对路径")
    else:
        print("\n未发现需要修复的文件")

if __name__ == '__main__':
    main()