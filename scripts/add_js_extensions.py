#!/usr/bin/env python3
"""
批量为TypeScript文件的相对路径导入添加.js后缀
避免重复添加.js后缀
"""

import os
import re
from pathlib import Path

def add_js_extensions_to_file(file_path):
    """为单个文件添加.js后缀"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # 匹配相对路径导入语句，但不包括已经有.js后缀的
        # 匹配模式：from './path' 或 from '../path'，但不包括 from './path.js'
        pattern = r"from\s+['\"](\.\.?/[^'\"]+)['\"](?!\.js)"
        
        def replace_func(match):
            path = match.group(1)
            # 确保不重复添加.js
            if not path.endswith('.js'):
                return f"from '{path}.js'"
            return match.group(0)
        
        content = re.sub(pattern, replace_func, content)
        
        # 只在内容有变化时才写入文件
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Updated: {file_path}")
            return True
        return False
    except Exception as e:
        print(f"✗ Error processing {file_path}: {e}")
        return False

def process_directory(root_dir):
    """递归处理目录中的所有.ts文件"""
    root_path = Path(root_dir)
    updated_count = 0
    
    for ts_file in root_path.rglob('*.ts'):
        if add_js_extensions_to_file(ts_file):
            updated_count += 1
    
    print(f"\n总计更新了 {updated_count} 个文件")

if __name__ == '__main__':
    # 获取项目根目录
    project_root = Path(__file__).parent.parent
    
    # 需要处理的目录列表
    directories = [
        project_root / 'packages' / 'tool-executors' / 'src',
        project_root / 'packages' / 'common-utils' / 'src',
        project_root / 'packages' / 'types' / 'src',
        project_root / 'sdk' / 'core',
        project_root / 'sdk' / 'api',
        project_root / 'sdk' / 'utils',
        project_root / 'apps' / 'cli-app' / 'src',
        project_root / 'apps' / 'web-app' / 'src',
    ]
    
    total_updated = 0
    for directory in directories:
        if directory.exists():
            print(f"\n处理目录: {directory}")
            process_directory(directory)
        else:
            print(f"目录不存在: {directory}")
    
    print(f"\n所有目录处理完成！")