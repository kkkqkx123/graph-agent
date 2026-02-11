#!/usr/bin/env python3
"""
修复 SDK 模块中的 types 导入
将相对路径导入改为从 @modular-agent/types 包导入
"""

import os
import re
from pathlib import Path

def fix_types_imports(file_path):
    """修复单个文件中的 types 导入"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 匹配 from '../../types' 或 from '../../../types' 等相对路径
    pattern = r"from ['\"](\.\.?/)+types['\"]"
    
    def replace_import(match):
        return "from '@modular-agent/types'"
    
    content = re.sub(pattern, replace_import, content)
    
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ 修复: {file_path}")
        return True
    return False

def main():
    """主函数"""
    sdk_dir = Path("sdk")
    
    if not sdk_dir.exists():
        print("❌ sdk 目录不存在")
        return
    
    fixed_count = 0
    
    # 遍历所有 TypeScript 文件
    for ts_file in sdk_dir.rglob("*.ts"):
        if fix_types_imports(ts_file):
            fixed_count += 1
    
    print(f"\n✅ 完成！共修复 {fixed_count} 个文件")

if __name__ == "__main__":
    main()