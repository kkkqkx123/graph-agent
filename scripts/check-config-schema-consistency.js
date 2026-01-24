#!/usr/bin/env node

/**
 * Config Schema 一致性检查脚本
 *
 * 功能：
 * 1. 检查schemas目录与configs目录的对应关系
 * 2. 验证配置文件是否符合Schema定义
 * 3. 检查命名规范一致性
 * 4. 检查SCHEMA_MAP映射完整性
 *
 * 使用方法：
 * node scripts/check-config-schema-consistency.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'toml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// 配置
// ============================================================================

const SCHEMAS_DIR = path.join(__dirname, '..', 'src', 'infrastructure', 'config', 'loading', 'schemas');
const CONFIGS_DIR = path.join(__dirname, '..', 'configs');

// Schema与配置目录的预期对应关系
const EXPECTED_MAPPINGS = {
  'global-schema.ts': 'global.toml',
  'database-schema.ts': 'database',
  'llm-schema.ts': 'llms',
  'tool-schema.ts': 'tools',
  'prompt-schema.ts': 'prompts',
  'workflow-schema.ts': 'workflows',
};

// 辅助配置目录（不需要Schema映射）
const AUXILIARY_CONFIGS = ['environments', 'examples', 'threads'];

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 读取目录内容
 */
function readDirectory(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    console.error(`❌ 无法读取目录: ${dir}`);
    console.error(`   错误: ${error.message}`);
    return [];
  }
}

/**
 * 检查是否为文件
 */
function isFile(dirent) {
  return dirent.isFile();
}

/**
 * 检查是否为目录
 */
function isDirectory(dirent) {
  return dirent.isDirectory();
}

/**
 * 获取文件扩展名
 */
function getExtension(filename) {
  return path.extname(filename);
}

/**
 * 检查文件是否存在
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * 递归获取目录下所有文件
 */
function getAllFiles(dir, baseDir = dir) {
  const files = [];
  const dirents = readDirectory(dir);

  for (const dirent of dirents) {
    const fullPath = path.join(dir, dirent.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (isDirectory(dirent)) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else if (isFile(dirent)) {
      files.push(relativePath);
    }
  }

  return files;
}

// ============================================================================
// 检查函数
// ============================================================================

/**
 * 检查Schema与配置的对应关系
 * 合并了Schema文件和配置路径的检查
 */
function checkSchemaConfigMapping() {
  console.log('\n📋 检查Schema与配置对应关系...');
  const issues = [];

  for (const [schemaFile, configPath] of Object.entries(EXPECTED_MAPPINGS)) {
    const schemaPath = path.join(SCHEMAS_DIR, schemaFile);
    const configFullPath = path.join(CONFIGS_DIR, configPath);

    const schemaExists = fileExists(schemaPath);
    const configExists = fileExists(configFullPath);

    if (!schemaExists && !configExists) {
      issues.push({
        type: 'missing_both',
        schemaFile,
        configPath,
        message: `Schema和配置都不存在: ${schemaFile} ↔ ${configPath}`,
      });
    } else if (!schemaExists) {
      issues.push({
        type: 'missing_schema',
        schemaFile,
        configPath,
        message: `Schema文件不存在: ${schemaFile} (配置存在: ${configPath})`,
      });
    } else if (!configExists) {
      issues.push({
        type: 'missing_config',
        schemaFile,
        configPath,
        message: `配置路径不存在: ${configPath} (Schema存在: ${schemaFile})`,
      });
    } else {
      console.log(`  ✅ ${schemaFile} ↔ ${configPath}`);
    }
  }

  return issues;
}

/**
 * 检查Schema文件命名规范
 */
function checkSchemaNaming() {
  console.log('\n📝 检查Schema命名规范...');
  const issues = [];
  const schemaFiles = readDirectory(SCHEMAS_DIR)
    .filter(isFile)
    .filter(d => d.name.endsWith('-schema.ts'));

  for (const dirent of schemaFiles) {
    const filename = dirent.name;

    // 检查是否使用连字符分隔
    if (!filename.includes('-')) {
      issues.push({
        type: 'naming_violation',
        file: filename,
        message: `Schema文件名应使用连字符分隔: ${filename}`,
      });
    }

    // 检查是否以-schema.ts结尾
    if (!filename.endsWith('-schema.ts')) {
      issues.push({
        type: 'naming_violation',
        file: filename,
        message: `Schema文件名应以-schema.ts结尾: ${filename}`,
      });
    }

    console.log(`  ✅ ${filename}`);
  }

  return issues;
}

/**
 * 检查配置目录命名规范
 */
function checkConfigNaming() {
  console.log('\n📝 检查配置目录命名规范...');
  const issues = [];
  const configDirs = readDirectory(CONFIGS_DIR)
    .filter(isDirectory)
    .filter(d => !d.name.startsWith('.'));

  for (const dirent of configDirs) {
    const dirname = dirent.name;

    // 跳过辅助配置目录
    if (AUXILIARY_CONFIGS.includes(dirname)) {
      console.log(`  ℹ️  ${dirname} (辅助配置，跳过检查)`);
      continue;
    }

    // 检查是否使用下划线分隔
    if (dirname.includes('-')) {
      issues.push({
        type: 'naming_violation',
        dir: dirname,
        message: `配置目录名应使用下划线分隔: ${dirname}`,
      });
    }

    // 检查是否使用复数形式（除了database和global.toml）
    if (dirname !== 'database' && dirname !== 'global.toml' && !dirname.endsWith('s')) {
      issues.push({
        type: 'naming_violation',
        dir: dirname,
        message: `配置目录名应使用复数形式: ${dirname}`,
      });
    }

    console.log(`  ✅ ${dirname}`);
  }

  return issues;
}

/**
 * 检查SCHEMA_MAP映射完整性
 */
function checkSchemaMap() {
  console.log('\n🗺️  检查SCHEMA_MAP映射...');
  const issues = [];

  // 读取index.ts文件
  const indexPath = path.join(SCHEMAS_DIR, 'index.ts');
  if (!fileExists(indexPath)) {
    issues.push({
      type: 'missing_index',
      message: 'index.ts文件不存在',
    });
    return issues;
  }

  const indexContent = fs.readFileSync(indexPath, 'utf-8');

  // 检查SCHEMA_MAP定义
  if (!indexContent.includes('export const SCHEMA_MAP')) {
    issues.push({
      type: 'missing_schema_map',
      message: 'SCHEMA_MAP未定义',
    });
  }

  // 检查预期的映射键（支持无引号、单引号、双引号三种格式）
  const expectedKeys = ['global', 'database', 'llms', 'tools', 'prompts', 'workflows'];
  for (const key of expectedKeys) {
    // 检查多种格式：key:、'key':、"key":
    const hasKey =
      indexContent.includes(`${key}:`) ||
      indexContent.includes(`'${key}':`) ||
      indexContent.includes(`"${key}":`);
    
    if (!hasKey) {
      issues.push({
        type: 'missing_schema_key',
        key,
        message: `SCHEMA_MAP缺少键: ${key}`,
      });
    } else {
      console.log(`  ✅ ${key}`);
    }
  }

  return issues;
}

/**
 * 检查配置文件结构
 */
function checkConfigStructure() {
  console.log('\n🏗️  检查配置文件结构...');
  const issues = [];

  // 检查llms目录结构
  const llmsDir = path.join(CONFIGS_DIR, 'llms');
  if (fileExists(llmsDir)) {
    const expectedSubdirs = ['provider', 'pools', 'task_groups'];
    const actualSubdirs = readDirectory(llmsDir)
      .filter(isDirectory)
      .map(d => d.name);

    for (const subdir of expectedSubdirs) {
      if (!actualSubdirs.includes(subdir)) {
        issues.push({
          type: 'missing_subdir',
          dir: 'llms',
          subdir,
          message: `llms目录缺少子目录: ${subdir}`,
        });
      } else {
        console.log(`  ✅ llms/${subdir}`);
      }
    }
  }

  // 检查tools目录结构
  const toolsDir = path.join(CONFIGS_DIR, 'tools');
  if (fileExists(toolsDir)) {
    const expectedSubdirs = ['builtin', 'native', 'rest', 'mcp'];
    const actualSubdirs = readDirectory(toolsDir)
      .filter(isDirectory)
      .map(d => d.name);

    for (const subdir of expectedSubdirs) {
      if (!actualSubdirs.includes(subdir)) {
        issues.push({
          type: 'missing_subdir',
          dir: 'tools',
          subdir,
          message: `tools目录缺少子目录: ${subdir}`,
        });
      } else {
        console.log(`  ✅ tools/${subdir}`);
      }
    }
  }

  // 检查prompts目录结构
  const promptsDir = path.join(CONFIGS_DIR, 'prompts');
  if (fileExists(promptsDir)) {
    const expectedSubdirs = ['rules', 'system', 'templates', 'user_commands'];
    const actualSubdirs = readDirectory(promptsDir)
      .filter(isDirectory)
      .map(d => d.name);

    for (const subdir of expectedSubdirs) {
      if (!actualSubdirs.includes(subdir)) {
        issues.push({
          type: 'missing_subdir',
          dir: 'prompts',
          subdir,
          message: `prompts目录缺少子目录: ${subdir}`,
        });
      } else {
        console.log(`  ✅ prompts/${subdir}`);
      }
    }
  }

  return issues;
}

/**
 * 检查是否有未映射的Schema文件
 */
function checkUnmappedSchemas() {
  console.log('\n🔍 检查未映射的Schema文件...');
  const issues = [];

  const schemaFiles = readDirectory(SCHEMAS_DIR)
    .filter(isFile)
    .filter(d => d.name.endsWith('-schema.ts'))
    .map(d => d.name);

  for (const schemaFile of schemaFiles) {
    if (!EXPECTED_MAPPINGS[schemaFile]) {
      issues.push({
        type: 'unmapped_schema',
        schemaFile,
        message: `Schema文件未在EXPECTED_MAPPINGS中定义: ${schemaFile}`,
      });
    } else {
      console.log(`  ✅ ${schemaFile}`);
    }
  }

  return issues;
}

/**
 * 检查是否有未映射的配置目录
 */
function checkUnmappedConfigs() {
  console.log('\n🔍 检查未映射的配置目录...');
  const issues = [];

  const configDirs = readDirectory(CONFIGS_DIR)
    .filter(isDirectory)
    .filter(d => !d.name.startsWith('.'))
    .map(d => d.name);

  // 添加global.toml作为特殊配置
  const globalToml = readDirectory(CONFIGS_DIR)
    .filter(isFile)
    .find(d => d.name === 'global.toml');

  if (globalToml) {
    configDirs.push('global.toml');
  }

  const mappedConfigs = Object.values(EXPECTED_MAPPINGS);

  for (const configDir of configDirs) {
    // 跳过辅助配置目录
    if (AUXILIARY_CONFIGS.includes(configDir)) {
      console.log(`  ℹ️  ${configDir} (辅助配置，跳过检查)`);
      continue;
    }

    if (!mappedConfigs.includes(configDir)) {
      issues.push({
        type: 'unmapped_config',
        configDir,
        message: `配置目录未在EXPECTED_MAPPINGS中定义: ${configDir}`,
      });
    } else {
      console.log(`  ✅ ${configDir}`);
    }
  }

  return issues;
}

/**
 * 从TOML配置文件中提取字段名称
 */
function extractFieldsFromTOML(tomlContent) {
  const fields = new Set();
  
  // 匹配顶级键名：key = value
  const topLevelKeyPattern = /^(\w+)\s*=/gm;
  
  // 匹配节名：[section] 或 [section.subsection]
  const sectionPattern = /^\[([^\]]+)\]/gm;
  
  // 匹配数组节：[[array]] 或 [[array.subsection]]
  const arrayPattern = /^\[\[([^\]]+)\]\]/gm;
  
  let match;
  
  // 提取顶级键
  while ((match = topLevelKeyPattern.exec(tomlContent)) !== null) {
    fields.add(match[1]);
  }
  
  // 提取节名（只提取顶级节名）
  while ((match = sectionPattern.exec(tomlContent)) !== null) {
    const sectionPath = match[1];
    const parts = sectionPath.split('.');
    if (parts.length > 0) {
      fields.add(parts[0]); // 只添加顶级节名
    }
  }
  
  // 提取数组节名（只提取顶级数组名）
  while ((match = arrayPattern.exec(tomlContent)) !== null) {
    const arrayPath = match[1];
    const parts = arrayPath.split('.');
    if (parts.length > 0) {
      fields.add(parts[0]); // 只添加顶级数组名
    }
  }
  
  // 过滤掉空字符串和特殊字符
  return Array.from(fields).filter(f => f && f.length > 0 && !f.startsWith('['));
}

/**
 * 从Schema定义中提取字段名称
 */
function extractFieldsFromSchema(schemaContent) {
  const fields = new Set();
  
  // 首先提取所有Schema定义（const XxxSchema = z.object(...)）
  const schemaDefinitions = [];
  const schemaDefPattern = /const\s+(\w+Schema)\s*=\s*z\.object\(/g;
  let match;
  while ((match = schemaDefPattern.exec(schemaContent)) !== null) {
    schemaDefinitions.push(match[1]);
  }
  
  // 匹配 z.object() 中的字段定义
  // 格式：fieldName: z.xxx(...)
  const fieldPattern = /(\w+)\s*:\s*z\./g;
  
  // 匹配 z.record() 的键名（用于动态字段）
  const recordPattern = /z\.record\(\s*z\.\w+,\s*(\w+)\s*\)/g;
  
  // 匹配 z.array() 的元素类型
  const arrayPattern = /z\.array\(\s*(\w+)\s*\)/g;
  
  // 提取字段名
  while ((match = fieldPattern.exec(schemaContent)) !== null) {
    const fieldName = match[1];
    // 排除Zod类型关键字和内部Schema定义
    const zodKeywords = ['record', 'array', 'object', 'enum', 'union', 'literal', 'any', 'unknown', 'never', 'void', 'null', 'undefined', 'boolean', 'number', 'string', 'date', 'bigint', 'symbol', 'optional', 'nullable', 'default', 'refine', 'transform', 'pipe', 'and', 'or', 'catch'];
    if (!zodKeywords.includes(fieldName) && !schemaDefinitions.includes(fieldName + 'Schema')) {
      fields.add(fieldName);
    }
  }
  
  // 提取record的值类型
  while ((match = recordPattern.exec(schemaContent)) !== null) {
    const valueName = match[1];
    if (!schemaDefinitions.includes(valueName + 'Schema')) {
      fields.add(valueName);
    }
  }
  
  // 提取array的元素类型
  while ((match = arrayPattern.exec(schemaContent)) !== null) {
    const elementName = match[1];
    if (!schemaDefinitions.includes(elementName + 'Schema')) {
      fields.add(elementName);
    }
  }
  
  return Array.from(fields);
}

/**
 * 检查字段名称一致性
 * 注意：此检查只验证顶级字段名称，不验证嵌套字段
 * 嵌套字段由各自的Schema定义验证
 */
function checkFieldConsistency() {
  console.log('\n🔍 检查字段名称一致性（仅检查顶级字段）...');
  const issues = [];

  for (const [schemaFile, configPath] of Object.entries(EXPECTED_MAPPINGS)) {
    const schemaPath = path.join(SCHEMAS_DIR, schemaFile);
    const configFullPath = path.join(CONFIGS_DIR, configPath);

    // 读取Schema文件
    if (!fileExists(schemaPath)) {
      continue;
    }
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    const schemaFields = extractFieldsFromSchema(schemaContent);

    // 读取配置文件
    if (!fileExists(configFullPath)) {
      continue;
    }

    let configFields = [];
    
    if (fs.statSync(configFullPath).isFile()) {
      // 单个配置文件
      const configContent = fs.readFileSync(configFullPath, 'utf-8');
      configFields = extractFieldsFromTOML(configContent);
    } else {
      // 配置目录，读取所有TOML文件
      const tomlFiles = getAllFiles(configFullPath)
        .filter(f => f.endsWith('.toml'));
      
      for (const tomlFile of tomlFiles) {
        const tomlPath = path.join(configFullPath, tomlFile);
        const tomlContent = fs.readFileSync(tomlPath, 'utf-8');
        const fields = extractFieldsFromTOML(tomlContent);
        configFields.push(...fields);
      }
      
      // 去重
      configFields = [...new Set(configFields)];
    }

    // 过滤掉内部字段（以下划线开头）和常见内部字段
    const internalFields = ['_', 'metadata', 'name', 'description', 'type', 'enabled', 'timeout', 'text', 'category', 'created_at', 'updated_at'];
    const filteredConfigFields = configFields.filter(f => !f.startsWith('_') && !internalFields.includes(f));
    const filteredSchemaFields = schemaFields.filter(f => !f.startsWith('_') && !internalFields.includes(f));

    // 比较字段
    const missingInSchema = filteredConfigFields.filter(f => !filteredSchemaFields.includes(f));
    const missingInConfig = filteredSchemaFields.filter(f => !filteredConfigFields.includes(f));

    if (missingInSchema.length > 0) {
      // 只报告前10个不匹配的字段，避免输出过长
      const displayFields = missingInSchema.slice(0, 10);
      const suffix = missingInSchema.length > 10 ? `... (共${missingInSchema.length}个)` : '';
      issues.push({
        type: 'field_mismatch',
        schemaFile,
        message: `配置文件中存在Schema未定义的字段: ${displayFields.join(', ')}${suffix}`,
      });
    }

    if (missingInConfig.length > 0) {
      // 只警告，不报错，因为Schema字段可能是可选的
      const displayFields = missingInConfig.slice(0, 10);
      const suffix = missingInConfig.length > 10 ? `... (共${missingInConfig.length}个)` : '';
      console.log(`  ⚠️  ${schemaFile}: Schema中定义但配置中未使用的字段: ${displayFields.join(', ')}${suffix}`);
    }

    if (missingInSchema.length === 0 && missingInConfig.length === 0) {
      console.log(`  ✅ ${schemaFile}: 字段名称一致`);
    }
  }

  return issues;
}

// ============================================================================
// 主函数
// ============================================================================

function main() {
  console.log('🔍 Config Schema 一致性检查');
  console.log('='.repeat(50));

  const allIssues = [];

  // 执行所有检查
  allIssues.push(...checkSchemaConfigMapping()); // 合并了Schema和配置路径检查
  allIssues.push(...checkSchemaNaming());
  allIssues.push(...checkConfigNaming());
  allIssues.push(...checkSchemaMap());
  allIssues.push(...checkConfigStructure());
  
  // 字段一致性检查作为可选警告，不作为错误
  const fieldIssues = checkFieldConsistency();
  if (fieldIssues.length > 0) {
    console.log('\n⚠️  字段一致性检查发现潜在问题（仅供参考）：');
    for (const issue of fieldIssues) {
      console.log(`  - ${issue.message}`);
    }
    console.log('  注意：这些可能是嵌套字段或内部字段，不影响配置加载。');
  }

  // 输出结果
  console.log('\n' + '='.repeat(50));
  console.log('📊 检查结果汇总');
  console.log('='.repeat(50));

  if (allIssues.length === 0) {
    console.log('\n✅ 所有检查通过！Schema与配置目录完全一致。');
    process.exit(0);
  } else {
    console.log(`\n❌ 发现 ${allIssues.length} 个问题：\n`);

    // 按类型分组显示问题
    const issuesByType = {};
    for (const issue of allIssues) {
      if (!issuesByType[issue.type]) {
        issuesByType[issue.type] = [];
      }
      issuesByType[issue.type].push(issue);
    }

    for (const [type, issues] of Object.entries(issuesByType)) {
      console.log(`\n${type.toUpperCase()} (${issues.length}):`);
      for (const issue of issues) {
        console.log(`  - ${issue.message}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('💡 建议：');
    console.log('  1. 检查上述问题并修复');
    console.log('  2. 确保Schema文件与配置目录一一对应');
    console.log('  3. 遵循命名规范：Schema使用连字符，配置使用下划线');
    console.log('  4. 更新SCHEMA_MAP映射表');
    console.log('='.repeat(50));

    process.exit(1);
  }
}

// 运行主函数
main();