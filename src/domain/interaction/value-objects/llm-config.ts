import { ValueObject } from '../../common/value-objects/value-object';

/**
 * LLM 配置值对象
 */
export interface LLMConfigProps {
  provider: string;
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  stream?: boolean;
}

export class LLMConfig extends ValueObject<LLMConfigProps> {
  constructor(props: LLMConfigProps) {
    super(props);
  }

  get provider(): string { return this.props.provider; }
  get model(): string { return this.props.model; }
  get prompt(): string { return this.props.prompt; }
  get systemPrompt(): string | undefined { return this.props.systemPrompt; }
  get temperature(): number | undefined { return this.props.temperature; }
  get maxTokens(): number | undefined { return this.props.maxTokens; }
  get topP(): number | undefined { return this.props.topP; }
  get frequencyPenalty(): number | undefined { return this.props.frequencyPenalty; }
  get presencePenalty(): number | undefined { return this.props.presencePenalty; }
  get stopSequences(): string[] | undefined { return this.props.stopSequences; }
  get stream(): boolean | undefined { return this.props.stream; }

  validate(): void {
    if (!this.props.provider) {
      throw new Error('LLMConfig provider is required');
    }
    if (!this.props.model) {
      throw new Error('LLMConfig model is required');
    }
    if (!this.props.prompt) {
      throw new Error('LLMConfig prompt is required');
    }
  }
}