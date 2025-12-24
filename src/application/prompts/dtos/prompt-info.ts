/**
 * 提示词信息DTO接口定义
 */

export interface PromptInfo {
  /** 提示词ID */
  promptId: string;
  /** 提示词名称 */
  name: string;
  /** 提示词类别 */
  category: string;
  /** 提示词描述 */
  description?: string;
  /** 提示词内容 */
  content: string;
  /** 标签 */
  tags: string[];
  /** 元数据 */
  metadata: Record<string, unknown>;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

export interface PromptSummary {
  /** 提示词ID */
  promptId: string;
  /** 提示词名称 */
  name: string;
  /** 提示词类别 */
  category: string;
  /** 提示词描述 */
  description?: string;
  /** 标签 */
  tags: string[];
  /** 创建时间 */
  createdAt: string;
}

export interface PromptSearchRequest {
  /** 搜索关键词 */
  keyword?: string;
  /** 类别过滤 */
  category?: string;
  /** 标签过滤 */
  tags?: string[];
  /** 搜索范围 */
  searchIn?: 'name' | 'content' | 'description' | 'all';
  /** 分页参数 */
  pagination?: {
    page: number;
    size: number;
  };
  /** 排序参数 */
  sortBy?: 'name' | 'category' | 'createdAt' | 'updatedAt';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

export interface PromptSearchResult {
  /** 搜索结果列表 */
  prompts: PromptInfo[] | PromptSummary[];
  /** 总数量 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 页面大小 */
  size: number;
}

export interface PromptStatistics {
  /** 总提示词数量 */
  totalPrompts: number;
  /** 按类别分组的数量 */
  promptsByCategory: Record<string, number>;
  /** 按标签分组的数量 */
  promptsByTag: Record<string, number>;
  /** 最近创建的提示词 */
  recentlyCreated: PromptSummary[];
  /** 最常用的提示词 */
  mostUsed: PromptSummary[];
}