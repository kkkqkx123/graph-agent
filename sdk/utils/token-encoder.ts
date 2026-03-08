/**
 * Token编码器工具
 * 基于tiktoken的精确token计数，支持流式响应、多模态内容和工具调用
 *
 * 功能特性：
 * - TokenizerManager 单例管理编码器生命周期
 * - StreamingTokenCounter 支持流式增量计数
 * - 支持文本、图像、工具调用、思考内容等多种消息类型
 * - 提供详细的 token 统计明细
 */

import type { MessageContent } from '@modular-agent/types';

/**
 * TokenizerManager - 管理 Tiktoken 编码器的生命周期
 *
 * 提供功能：
 * - 延迟初始化（懒加载）
 * - 显式清理以释放 WASM 内存
 * - 单例模式确保线程安全
 * - 测试友好的重置能力
 *
 * 使用示例：
 *   const encoder = TokenizerManager.getInstance()
 *   const tokens = encoder.encode(text)
 *   // ... 使用完毕后 ...
 *   TokenizerManager.dispose()
 */
export class TokenizerManager {
	private static instance: any = null;

	/**
	 * 获取单例编码器实例
	 * 首次访问时延迟创建
	 * @returns Tiktoken 编码器实例
	 */
	static getInstance(): any {
		if (!TokenizerManager.instance) {
			try {
				const tiktoken = require('tiktoken');
				TokenizerManager.instance = tiktoken.getEncoding('cl100k_base');
			} catch (error) {
				console.error('Failed to initialize tiktoken encoder:', error);
				return null;
			}
		}
		return TokenizerManager.instance;
	}

	/**
	 * 检查编码器实例是否存在
	 * @returns 如果编码器已初始化返回 true
	 */
	static hasInstance(): boolean {
		return TokenizerManager.instance !== null;
	}

	/**
	 * 释放编码器实例以释放 WASM 内存
	 * 调用后，getInstance() 将创建新实例
	 */
	static dispose(): void {
		TokenizerManager.instance = null;
	}

	/**
	 * 重置编码器实例（主要用于测试）
	 * 强制在下次调用 getInstance() 时创建新实例
	 */
	static reset(): void {
		TokenizerManager.dispose();
	}

	/**
	 * 编码文本并返回 token 数组
	 * 便捷方法，一次性获取编码器并编码
	 * @param text - 要编码的文本
	 * @returns token ID 的 Uint32Array
	 */
	static encode(text: string): Uint32Array {
		const encoder = TokenizerManager.getInstance();
		if (!encoder) {
			// 降级：平均每 2.5 个字符约 1 个 token
			return new Uint32Array([Math.ceil(text.length / 2.5)]);
		}
		return encoder.encode(text);
	}

	/**
	 * 计算文本的 token 数量，不返回 token 数组
	 * 当只需要计数时更高效
	 * @param text - 要计算 token 的文本
	 * @returns token 数量
	 */
	static countTokens(text: string): number {
		if (!text || text.length === 0) {
			return 0;
		}
		const tokens = TokenizerManager.encode(text);
		return tokens.length;
	}
}

/**
 * 流式响应的增量 token 计数器
 * 跟踪文本、推理内容和工具调用，提供准确的 token 估算
 */
export class StreamingTokenCounter {
	private accumulatedText: string = '';
	private accumulatedReasoning: string = '';
	private toolCalls: Map<string, { name: string; args: string }> = new Map();
	private textTokenCount: number = 0;
	private reasoningTokenCount: number = 0;
	private toolCallsTokenCount: number = 0;

	/**
	 * 添加文本内容并返回增量 token 计数
	 * @param text - 新增的文本
	 * @returns 新增文本中的 token 数量
	 */
	addText(text: string): number {
		if (!text || text.length === 0) {
			return 0;
		}

		this.accumulatedText += text;
		const newTotalTokens = this.countTokens(this.accumulatedText);
		const incrementalTokens = newTotalTokens - this.textTokenCount;
		this.textTokenCount = newTotalTokens;

		return incrementalTokens;
	}

	/**
	 * 添加推理内容并返回增量 token 计数
	 * @param text - 新增的推理文本
	 * @returns 新增推理文本中的 token 数量
	 */
	addReasoning(text: string): number {
		if (!text || text.length === 0) {
			return 0;
		}

		this.accumulatedReasoning += text;
		const newTotalTokens = this.countTokens(this.accumulatedReasoning);
		const incrementalTokens = newTotalTokens - this.reasoningTokenCount;
		this.reasoningTokenCount = newTotalTokens;

		return incrementalTokens;
	}

	/**
	 * 添加或更新工具调用并返回增量 token 计数
	 * @param toolCallId - 工具调用的唯一标识符（用于区分同一工具的多次调用）
	 * @param toolName - 工具名称
	 * @param args - 工具参数（部分或完整）
	 * @returns 此工具调用的增量 token 计数
	 */
	addToolCall(toolCallId: string, toolName: string, args: string): number {
		if (!toolCallId || !toolName) {
			return 0;
		}

		// 通过 ID 查找现有工具调用（支持同一工具的多次调用）
		const existingCall = this.toolCalls.get(toolCallId);
		const toolCallStr = `Tool: ${toolName}\nArguments: ${args}`;
		const newTokens = this.countTokens(toolCallStr);

		if (existingCall) {
			// 更新现有工具调用的流式参数
			const oldToolCallStr = `Tool: ${existingCall.name}\nArguments: ${existingCall.args}`;
			const oldTokens = this.countTokens(oldToolCallStr);
			this.toolCallsTokenCount -= oldTokens;

			this.toolCalls.set(toolCallId, { name: toolName, args });
			this.toolCallsTokenCount += newTokens;

			return newTokens - oldTokens;
		} else {
			// 添加新工具调用
			this.toolCalls.set(toolCallId, { name: toolName, args });
			this.toolCallsTokenCount += newTokens;
			return newTokens;
		}
	}

	/**
	 * 获取所有累积内容的总 token 计数
	 * @returns 总 token 计数（文本 + 推理 + 工具调用）
	 */
	getTotalTokens(): number {
		return this.textTokenCount + this.reasoningTokenCount + this.toolCallsTokenCount;
	}

	/**
	 * 按类别获取 token 计数明细
	 * 用于调试和理解 token 分布
	 * @returns 包含 text、reasoning、toolCalls 和 total 计数的对象
	 */
	getTokenBreakdown(): {
		text: number;
		reasoning: number;
		toolCalls: number;
		total: number;
	} {
		return {
			text: this.textTokenCount,
			reasoning: this.reasoningTokenCount,
			toolCalls: this.toolCallsTokenCount,
			total: this.getTotalTokens(),
		};
	}

	/**
	 * 重置计数器
	 */
	reset(): void {
		this.accumulatedText = '';
		this.accumulatedReasoning = '';
		this.toolCalls = new Map();
		this.textTokenCount = 0;
		this.reasoningTokenCount = 0;
		this.toolCallsTokenCount = 0;
	}

	/**
	 * 计算给定文本字符串的 token 数量
	 * 使用 TokenizerManager 进行高效的编码器生命周期管理
	 * @param text - 要计算 token 的文本
	 * @returns token 计数
	 */
	private countTokens(text: string): number {
		if (!text || text.length === 0) {
			return 0;
		}
		return TokenizerManager.countTokens(text);
	}
}

/**
 * 将 tool_use 块序列化为文本以进行 token 计数
 * 近似 API 如何看待工具调用
 */
function serializeToolUse(toolUse: {
	id: string;
	name: string;
	input: Record<string, any> | string;
}): string {
	const parts = [`Tool: ${toolUse.name}`];
	if (toolUse.input !== undefined) {
		try {
			const inputStr =
				typeof toolUse.input === 'string'
					? toolUse.input
					: JSON.stringify(toolUse.input);
			parts.push(`Arguments: ${inputStr}`);
		} catch {
			parts.push(`Arguments: [serialization error]`);
		}
	}
	return parts.join('\n');
}

/**
 * 将 tool_result 块序列化为文本以进行 token 计数
 * 处理字符串内容和数组内容
 */
function serializeToolResult(toolResult: {
	tool_use_id: string;
	content: string | Array<{ type: string; text: string }>;
}): string {
	const parts = [`Tool Result (${toolResult.tool_use_id})`];

	const content = toolResult.content;
	if (typeof content === 'string') {
		parts.push(content);
	} else if (Array.isArray(content)) {
		// 递归处理内容块数组
		for (const item of content) {
			if (item.type === 'text') {
				parts.push(item.text || '');
			} else if (item.type === 'image') {
				parts.push('[Image content]');
			} else {
				parts.push(`[Unsupported content block: ${String(item.type)}]`);
			}
		}
	}

	return parts.join('\n');
}

/**
 * 估算图像的 token 数量
 * 基于图像分辨率估算，而非文件大小
 * 近似公式：ceil(width * height / 750) + 200
 * 从 base64 数据大小估算分辨率
 */
function estimateImageTokens(imageUrl: { url: string }): number {
	const url = imageUrl.url;

	// 检查是否为 base64 编码的图像
	if (url.startsWith('data:image/')) {
		try {
			// 提取 base64 数据部分（移除 data:image/xxx;base64, 前缀）
			const base64Data = url.split(',')[1];
			if (!base64Data) {
				return 170; // 保守估计
			}

			// Base64 编码：4 个字符 = 3 字节，实际数据大小 = base64.length * 3/4
			const estimatedDataBytes = base64Data.length * 0.75;

			// 从数据大小估算分辨率（假设典型 JPEG 压缩约 0.5 字节/像素）
			// 像素 ≈ dataBytes / 0.5 = dataBytes * 2
			// Vision tokens ≈ ceil(pixels / 750) + 200
			const estimatedPixels = estimatedDataBytes * 2;
			const estimatedTokens = Math.ceil(estimatedPixels / 750) + 200;

			return estimatedTokens;
		} catch {
			return 170; // 解析失败时使用保守估计
		}
	}

	// 对于 URL 图像，使用保守估计
	// 标准估计：典型图像（VGA 640x480）约 170 tokens
	return 170;
}

/**
 * 计算消息内容的 token 数量
 * 支持文本、图像、工具调用、工具结果和思考内容
 *
 * @param content - 消息内容（字符串或内容块数组）
 * @returns token 数量
 */
export function countMessageTokens(content: MessageContent): number {
	if (!content) {
		return 0;
	}

	// 如果是字符串，直接编码
	if (typeof content === 'string') {
		return TokenizerManager.countTokens(content);
	}

	// 如果是数组，处理每个内容块
	if (Array.isArray(content)) {
		let totalTokens = 0;

		for (const block of content) {
			if (block.type === 'text') {
				const text = block.text || '';
				if (text.length > 0) {
					totalTokens += TokenizerManager.countTokens(text);
				}
			} else if (block.type === 'image_url') {
				if (block.image_url) {
					totalTokens += estimateImageTokens(block.image_url);
				} else {
					totalTokens += 170; // 保守估计
				}
			} else if (block.type === 'tool_use') {
				if (block.tool_use) {
					const serialized = serializeToolUse(block.tool_use);
					if (serialized.length > 0) {
						totalTokens += TokenizerManager.countTokens(serialized);
					}
				}
			} else if (block.type === 'tool_result') {
				if (block.tool_result) {
					const serialized = serializeToolResult(block.tool_result);
					if (serialized.length > 0) {
						totalTokens += TokenizerManager.countTokens(serialized);
					}
				}
			} else if (block.type === 'thinking') {
				const thinking = block.thinking || '';
				if (thinking.length > 0) {
					totalTokens += TokenizerManager.countTokens(thinking);
				}
			}
		}

		return totalTokens;
	}

	return 0;
}

/**
 * 编码文本并计数 token
 * 优先使用 tiktoken 精确计数，失败时降级为字符估算
 *
 * @param text - 文本内容
 * @returns Token 数量
 */
export function encodeText(text: string): number {
	return TokenizerManager.countTokens(text);
}

/**
 * 编码对象并计数 token
 * JSON 序列化后再编码
 *
 * @param obj - 对象
 * @returns Token 数量
 */
export function encodeObject(obj: any): number {
	try {
		return TokenizerManager.countTokens(JSON.stringify(obj));
	} catch {
		return Math.ceil(String(obj).length / 2.5);
	}
}

/**
 * 重置编码器（仅用于测试）
 */
export function resetEncoder(): void {
	TokenizerManager.reset();
}
