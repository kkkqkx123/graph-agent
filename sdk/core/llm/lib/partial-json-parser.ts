/**
 * 部分 JSON 解析器
 *
 * 借鉴 Anthropic SDK 的设计，用于解析不完整的 JSON 字符串。
 * 能够处理流式传输中的部分 JSON 数据，返回可用的解析结果。
 *
 * 工作原理：
 * 1. Tokenize: 将输入字符串解析为 token 流
 * 2. Strip: 移除可能导致解析失败的尾部 token
 * 3. Unstrip: 自动补全闭合符号
 * 4. Generate: 重新生成合法的 JSON 字符串
 * 5. Parse: 调用 JSON.parse 解析
 */

type Token = {
  type: string;
  value: string;
};

/**
 * 将输入字符串解析为 token 流
 */
function tokenize(input: string): Token[] {
  let current = 0;
  const tokens: Token[] = [];

  while (current < input.length) {
    let char = input[current];

    if (char === '\\') {
      current++;
      continue;
    }

    if (char === '{') {
      tokens.push({ type: 'brace', value: '{' });
      current++;
      continue;
    }

    if (char === '}') {
      tokens.push({ type: 'brace', value: '}' });
      current++;
      continue;
    }

    if (char === '[') {
      tokens.push({ type: 'paren', value: '[' });
      current++;
      continue;
    }

    if (char === ']') {
      tokens.push({ type: 'paren', value: ']' });
      current++;
      continue;
    }

    if (char === ':') {
      tokens.push({ type: 'separator', value: ':' });
      current++;
      continue;
    }

    if (char === ',') {
      tokens.push({ type: 'delimiter', value: ',' });
      current++;
      continue;
    }

    if (char === '"') {
      let value = '';
      let danglingQuote = false;

      char = input[++current];

      while (char !== '"') {
        if (current === input.length) {
          danglingQuote = true;
          break;
        }

        if (char === '\\') {
          current++;
          if (current === input.length) {
            danglingQuote = true;
            break;
          }
          value += char + input[current];
          char = input[++current];
        } else {
          value += char;
          char = input[++current];
        }
      }

      char = input[++current];

      if (!danglingQuote) {
        tokens.push({ type: 'string', value });
      }
      continue;
    }

    const WHITESPACE = /\s/;
    if (char && WHITESPACE.test(char)) {
      current++;
      continue;
    }

    const NUMBERS = /[0-9]/;
    if ((char && NUMBERS.test(char)) || char === '-' || char === '.') {
      let value = '';

      if (char === '-') {
        value += char;
        char = input[++current];
      }

      while ((char && NUMBERS.test(char)) || char === '.') {
        value += char;
        char = input[++current];
      }

      tokens.push({ type: 'number', value });
      continue;
    }

    const LETTERS = /[a-z]/i;
    if (char && LETTERS.test(char)) {
      let value = '';

      while (char && LETTERS.test(char)) {
        if (current === input.length) {
          break;
        }
        value += char;

        char = input[++current];
      }

      if (value === 'true' || value === 'false' || value === 'null') {
        tokens.push({ type: 'name', value });
      } else {
        // 未知 token，如 `nul` 还不是完整的 `null`
        current++;
        continue;
      }
      continue;
    }

    current++;
  }

  return tokens;
}

/**
 * 移除可能导致解析失败的尾部 token
 */
function strip(tokens: Token[]): Token[] {
  if (tokens.length === 0) {
    return tokens;
  }

  const lastToken = tokens[tokens.length - 1]!;

  switch (lastToken.type) {
    case 'separator':
      tokens = tokens.slice(0, tokens.length - 1);
      return strip(tokens);
    case 'number': {
      const lastCharacterOfLastToken = lastToken.value[lastToken.value.length - 1];
      if (lastCharacterOfLastToken === '.' || lastCharacterOfLastToken === '-') {
        tokens = tokens.slice(0, tokens.length - 1);
        return strip(tokens);
      }
      break;
    }
    case 'string': {
      const tokenBeforeTheLastToken = tokens[tokens.length - 2];
      if (tokenBeforeTheLastToken?.type === 'delimiter') {
        tokens = tokens.slice(0, tokens.length - 1);
        return strip(tokens);
      } else if (tokenBeforeTheLastToken?.type === 'brace' && tokenBeforeTheLastToken.value === '{') {
        tokens = tokens.slice(0, tokens.length - 1);
        return strip(tokens);
      }
      break;
    }
    case 'delimiter':
      tokens = tokens.slice(0, tokens.length - 1);
      return strip(tokens);
  }

  return tokens;
}

/**
 * 自动补全闭合符号
 */
function unstrip(tokens: Token[]): Token[] {
  const tail: string[] = [];

  for (const token of tokens) {
    if (token.type === 'brace') {
      if (token.value === '{') {
        tail.push('}');
      } else {
        tail.splice(tail.lastIndexOf('}'), 1);
      }
    }
    if (token.type === 'paren') {
      if (token.value === '[') {
        tail.push(']');
      } else {
        tail.splice(tail.lastIndexOf(']'), 1);
      }
    }
  }

  if (tail.length > 0) {
    tail.reverse().forEach((item) => {
      if (item === '}') {
        tokens.push({ type: 'brace', value: '}' });
      } else if (item === ']') {
        tokens.push({ type: 'paren', value: ']' });
      }
    });
  }

  return tokens;
}

/**
 * 从 token 流生成 JSON 字符串
 */
function generate(tokens: Token[]): string {
  let output = '';

  for (const token of tokens) {
    switch (token.type) {
      case 'string':
        output += '"' + token.value + '"';
        break;
      default:
        output += token.value;
        break;
    }
  }

  return output;
}

/**
 * 解析部分 JSON 字符串
 *
 * @param input 不完整的 JSON 字符串
 * @returns 解析后的值，如果无法解析则返回 undefined
 */
export function partialParse(input: string): unknown {
  try {
    return JSON.parse(generate(unstrip(strip(tokenize(input)))));
  } catch {
    // 如果解析失败，返回 undefined
    return undefined;
  }
}

/**
 * 检查输入是否为有效的部分 JSON（可以继续解析）
 *
 * @param input JSON 字符串
 * @returns 是否有效
 */
export function isValidPartialJson(input: string): boolean {
  try {
    const tokens = tokenize(input);
    // 如果只有一个字符串 token，可能是键名未完成
    if (tokens.length === 1 && tokens[0]!.type === 'string') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
