# SDK Module Developer Guide

This document provides essential information for AI agents working with the SDK module.

## Project Overview

The SDK module is a TypeScript workflow execution engine featuring:
- Workflow execution engine with 15 node types
- Multi-model LLM integration (OpenAI, Anthropic, Gemini, Mock)
- Flexible tool system (built-in, native, REST, MCP)
- Fork/Join support for parallel execution
- Checkpoint mechanism for state snapshots and resumption
- Event-driven architecture for extensibility

## Development Environment Setup

### Prerequisites

Node.js v22.14.0

### Type Check
```bash
cd sdk
tsc --noEmit 2>&1 | Select-Object -First 100
```

### Testing
```bash
cd sdk
# Run specific test file
npm test <test_file_path>
```
**DO NOT RUN FULL TEST SUITE**

## Code Architecture

### Module Structure

The SDK module uses a simplified two-layer architecture:

**Types Layer** (`sdk/types/`)
- Defines all types and interfaces
- Contains workflow, node, edge, thread, tool, LLM types
- Provides type definitions and validation rules
- No implementation logic

**Core Layer** (`sdk/core/`)
- Implements core execution logic
- Contains state management, execution engine, LLM integration, tool execution
- Depends on Types layer
- Provides complete execution functionality

**API Layer** (`sdk/api/`)
- Provides external API interfaces
- Depends on Core layer and Types layer
- Offers simple and easy-to-use APIs

**Utils Layer** (`sdk/utils/`)
- Provides utility functions
- Depends on Types layer
- Offers ID generation, error handling, etc.

### Directory Structure

```
sdk/
├── types/          # Type definitions
├── core/           # Core execution logic
│   ├── execution/  # Execution engine
│   ├── llm/        # LLM integration
│   ├── tools/      # Tool execution
│   ├── validation/ # Validation
│   └── storage/    # Checkpoint storage
├── api/            # External API interfaces
└── utils/          # Utility functions
```

## Dependency Rules

### Strict Dependency Constraints

**Types Layer**
- No dependencies on other layers
- Provides all type definitions
- Used by all other layers

**Utils Layer**
- Depends only on Types layer
- Provides utility functions
- Used by Core and API layers

**Core Layer**
- Depends only on Types and Utils layers
- Implements core execution logic
- Used by API layer

**API Layer**
- Depends only on Core and Types layers
- Provides external API interfaces
- Not used by other layers

### Dependency Flow

Types ← Utils ← Core ← API

## Development Process

### 1. Feature Development
- Follow dependency rules strictly
- Define types in Types layer first
- Implement logic in Core layer
- Provide interfaces in API layer
- Use utility functions from Utils layer

### 2. Testing Strategy
- **Unit tests**: Create `__tests__` folder in the same directory as the code
- **Integration tests**: Place in global tests folder
- **End-to-end tests**: Place in `e2e` subfolder of global tests folder

### 3. Code Quality Standards
- Follow TypeScript strict type checking
- Use dependency injection pattern
- Implement appropriate abstraction layers
- Provide clear error messages

### 4. Documentation Requirements
- Each module must have clear documentation
- Use natural language for descriptions
- Keep documentation concise and clear

## Design Principles

### 1. Separation of Concerns
- Types layer: type definitions only
- Core layer: execution logic only
- API layer: external interfaces only
- Utils layer: utility functions only

### 2. Avoid Circular Dependencies
- Use ID references, not object references
- Associate through intermediate objects
- Keep dependency direction unidirectional

### 3. Configuration Reuse
- Use Profile concept to avoid duplicate configuration
- Use Registry pattern for resource management
- Support configuration registration and query

### 4. Event-Driven
- Provide extension points through events
- Support asynchronous event handling
- All events associated with threadId

### 5. Error Handling
- Provide clear error messages
- Support error chains
- Unified error types

## Important Notes

1. **Type Safety**: Leverage TypeScript type system fully
2. **Avoid Circular Dependencies**: Use ID references, not object references
3. **Separation of Concerns**: SDK focuses on execution, application layer handles persistence
4. **Configuration Reuse**: Use Profile concept to avoid duplicate configuration
5. **Event-Driven**: Provide extension points through events
6. **Complete Documentation**: Each module must have clear documentation
7. **Test Coverage**: Ensure core functions have complete tests

## Language Guidelines

- Code comments and documentation in Chinese
- LLM-related configurations and code in English (mainly prompts)
- Variable and function names in English
- Comments in Chinese

## Reference Documentation

- SDK Architecture: `plans/sdk/sdk-architecture.md`
- SDK Implementation Plan: `plans/sdk/sdk-implementation-plan.md`
- Types Layer Design: `plans/sdk/types/`
- Core Layer Design: `plans/sdk/core/`
- Execution Logic Details: `plans/sdk/core/execution/`