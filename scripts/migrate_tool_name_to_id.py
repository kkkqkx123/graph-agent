#!/usr/bin/env python3
"""
批量替换toolName为toolId的迁移脚本
用于统一使用ID作为工具标识符
"""

import os
import re
from pathlib import Path
from typing import List, Tuple

# 需要处理的文件扩展名
TARGET_EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx', '.json', '.md'}

# 需要排除的目录
EXCLUDE_DIRS = {
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.next',
    '.turbo'
}

# 替换规则
REPLACEMENTS = [
    # 参数名替换
    (r'\btoolName\b', 'toolId'),
    (r'\btool_name\b', 'tool_id'),
    
    # 变量名替换
    (r'\btoolName\b', 'toolId'),
    
    # 属性名替换
    (r'\.name(?!\s*:)', '.id'),
    
    # 方法名替换
    (r'\bgetById\b', 'get'),
    (r'\bhasById\b', 'has'),
    (r'\bremoveById\b', 'remove'),
    (r'\bunregisterToolById\b', 'unregisterTool'),
    (r'\bgetToolById\b', 'getTool'),
    (r'\bhasToolById\b', 'hasTool'),
    
    # 字符串中的替换（需要更谨慎）
    (r"'([^']*)toolName([^']*)'", r"'\1toolId\2'"),
    (r'"([^"]*)toolName([^"]*)"', r'"\1toolId\2"'),
    (r'`([^`]*)toolName([^`]*)`', r'`\1toolId\2`'),
]

def should_process_file(file_path: Path) -> bool:
    """判断文件是否需要处理"""
    # 检查扩展名
    if file_path.suffix not in TARGET_EXTENSIONS:
        return False
    
    # 检查是否在排除目录中
    for part in file_path.parts:
        if part in EXCLUDE_DIRS:
            return False
    
    return True

def apply_replacements(content: str) -> Tuple[str, List[Tuple[int, str, str]]]:
    """应用替换规则"""
    changes = []
    lines = content.split('\n')
    new_lines = []
    
    for line_num, line in enumerate(lines, 1):
        new_line = line
        line_changes = []
        
        for pattern, replacement in REPLACEMENTS:
            if re.search(pattern, new_line):
                old_line = new_line
                new_line = re.sub(pattern, replacement, new_line)
                if old_line != new_line:
                    line_changes.append((pattern, old_line, new_line))
        
        if line_changes:
            changes.append((line_num, line, new_line))
        
        new_lines.append(new_line)
    
    return '\n'.join(new_lines), changes

def process_file(file_path: Path, dry_run: bool = True) -> bool:
    """处理单个文件"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content, changes = apply_replacements(content)
        
        if changes:
            print(f"\n{'='*60}")
            print(f"文件: {file_path}")
            print(f"{'='*60}")
            
            for line_num, old_line, new_line in changes:
                print(f"行 {line_num}:")
                print(f"  - {old_line}")
                print(f"  + {new_line}")
            
            if not dry_run:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"✓ 已更新文件: {file_path}")
            else:
                print(f"[预览] 将更新文件: {file_path}")
            
            return True
        
        return False
    
    except Exception as e:
        print(f"✗ 处理文件失败 {file_path}: {e}")
        return False

def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='批量替换toolName为toolId')
    parser.add_argument('--dry-run', action='store_true', help='预览模式，不实际修改文件')
    parser.add_argument('--path', type=str, default='.', help='要处理的目录路径')
    args = parser.parse_args()
    
    root_path = Path(args.path)
    
    if not root_path.exists():
        print(f"错误: 路径不存在: {root_path}")
        return
    
    print(f"开始处理目录: {root_path}")
    print(f"模式: {'预览' if args.dry_run else '实际修改'}")
    print(f"{'='*60}")
    
    total_files = 0
    modified_files = 0
    
    # 遍历所有文件
    for file_path in root_path.rglob('*'):
        if file_path.is_file() and should_process_file(file_path):
            total_files += 1
            if process_file(file_path, args.dry_run):
                modified_files += 1
    
    print(f"\n{'='*60}")
    print(f"处理完成!")
    print(f"总文件数: {total_files}")
    print(f"修改文件数: {modified_files}")
    
    if args.dry_run and modified_files > 0:
        print(f"\n提示: 使用 --no-dry-run 参数来实际修改文件")

if __name__ == '__main__':
    main()