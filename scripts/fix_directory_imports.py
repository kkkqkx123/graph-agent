#!/usr/bin/env python3
"""
修复目录导入问题
将 './directory.js' 改为 './directory/index.js'
"""

import os
import re
from pathlib import Path

def fix_directory_imports(file_path):
    """修复单个文件中的目录导入"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # 查找所有可能的目录导入
        # 匹配模式：from './path.js' 或 from '../path.js'
        pattern = r"from\s+['\"](\.\.?/[^'\"]+)\.js['\"]"
        
        def replace_func(match):
            path = match.group(1)
            # 检查是否是目录（通过检查是否存在对应的.ts文件）
            file_dir = file_path.parent
            full_path = file_dir / path
            
            # 如果路径指向目录，则添加 /index.js
            if full_path.is_dir():
                return f"from '{path}/index.js'"
            # 如果路径指向.ts文件，保持 .js 后缀
            elif (full_path.with_suffix('.ts')).exists():
                return match.group(0)
            # 如果路径指向目录下的index.ts，也改为 /index.js
            elif (full_path / 'index.ts').exists():
                return f"from '{path}/index.js'"
            # 否则保持原样
            return match.group(0)
        
        content = re.sub(pattern, replace_func, content)
        
        # 只在内容有变化时才写入文件
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Fixed: {file_path}")
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
        if fix_directory_imports(ts_file):
            updated_count += 1
    
    print(f"\n总计修复了 {updated_count} 个文件")

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
    
    for directory in directories:
        if directory.exists():
            print(f"\n处理目录: {directory}")
            process_directory(directory)
        else:
            print(f"目录不存在: {directory}")
    
    print(f"\n所有目录处理完成！")