# Modular Agent Framework Developer Guide

This document provides essential information for AI agents working with the Modular Agent Framework codebase.

## Project Overview

The Modular Agent Framework is a TypeScript-based multi-agent system built on Graph Workflow, featuring:
- **Multi-model LLM integration** (OpenAI, Gemini, Anthropic, Mock)
- **Flexible tool system** supporting built-in, native, REST, and MCP tools
- **Configuration-driven architecture** with TOML-based configs and environment variable injection
- **Simplified 3-layer architecture**: Domain + Application + Infrastructure + Interface(outside interface, not for inner usage)
- **RESTful API** for external integration
- **Session and thread management** with checkpoint persistence
- **Configuration-driven architecture** with TOML-based configs and environment variable injection

## Development Environment Setup

### Prerequisites

nodejs v22.14.0

### Type check
```bash
tsc --noEmit
```

### Testing
```bash
# Run all tests
npm test

# Run specific test file
npm test <test_name>
```

## Codebase Architecture

### Layered Architecture

The framework uses a simplified 3-layer architecture that reduces complexity while maintaining functionality:

**Architecture**: Domain + Application + Infrastructure

### Layer Descriptions

**Domain Layer** (`src/domain/`)
- Contains pure business logic and domain entities
- Provides contracts for all major components: LLM, storage, workflow, sessions, etc.
- Contains no technical implementation details, only business rules
- Includes domain modules for workflow, state, LLM, and common components

**Application Layer** (`src/application/`)
- Provides application services and business process orchestration
- Depends on domain layer only
- Includes services for workflow, session, thread, checkpoint, history, LLM, tools, state management
- Contains command/query handlers and DTOs

**Infrastructure Layer** (`src/infrastructure/`)
- Provides concrete implementations of technical concerns
- Depends on domain layer only
- Includes infrastructure for database, LLM clients, workflow execution, messaging, and configuration
- Implements low-level technical details

**Interface Layer** (`src/interfaces/`)
- Provides external interface adaptations
- Depends on application layer
- Includes adapters for HTTP API, gRPC, and CLI
- Handles integration with external systems and user interfaces

### Configuration System

The framework uses a simplified TOML-based configuration system with:
- **Environment variable injection**: Automatic resolution from environment
- **Multi-environment support**: Specific overrides for test, development, and production
- **Modular structure**: Separate configurations for LLMs, workflows, tools, etc.

## Layer Dependency Constraints

### Strict Dependency Rules

**Domain Layer**
- **Cannot depend on any other layer**
- Provides business rules and entities that all other layers use
- Contains only pure business logic

**Infrastructure Layer**
- **Can only depend on domain layer**
- Cannot depend on application or interface layers
- Implements concrete versions of domain interfaces for external dependencies

**Application Layer**
- **Can only depend on domain layer**
- Provides business logic and application services
- Coordinates between domain components

**Interface Layer**
- **Can only depend on application layer**
- Provides external interface implementations
- Handles integration with external systems

### Dependency Flow

Infrastructure depends only on Domain. Application depends on Domain. Interface depends on Application. All layers ultimately depend on Domain layer.

## Architecture Comparison: Python vs Rust

### Python Architecture (Old)
- **5-layer architecture**: Interfaces + Core + Services + Adapters + Infrastructure
- **Complex dependency injection** with runtime resolution
- **Over-engineered patterns** with excessive abstraction
- **Circular dependency risks** due to complex layer interactions

### TS Architecture (New)
- **3-layer architecture**: Domain + Application + Infrastructure + Interface
- **Simplified patterns** avoiding over-engineering

## Development Process

### 1. Feature Development
- Follow layered architecture constraints strictly
- Define domain entities and business rules in the domain layer first
- Implement application services in the application layer
- Provide external interfaces in the interface layer
- Implement infrastructure components depending only on domain
- Use configuration files for customization with environment variable support

### 2. Testing Strategy
- **Unit tests**: Domain layer and application layer core business logic coverage ≥ 90%
- **Integration tests**: Module interaction and infrastructure component coverage ≥ 80%
- **Infrastructure tests**: Infrastructure layer implementation coverage ≥ 85%
- **End-to-end tests**: Complete workflow and user scenario coverage ≥ 70%

### 3. Code Quality Standards
- Follow dependency injection pattern for all service instantiation
- Use configuration-driven approach for all external dependencies
- Infrastructure components must only depend on domain layer
- Implement proper abstraction layers to enable seamless replacement

### 4. Configuration Changes
- Use the configuration system API for configuration management
- Update configuration in `package.json`, configs folder(for complex config) and .env(for simple config like api-key)
- Ensure environment variable references use proper Rust types

## Core Components Usage

### Service Management
- Located in `src/application/`
- Manages service lifecycle through dependency injection
- Use explicit dependencies in constructors
- Resolve services via dependency injection
## Coding Specifications

Must follow Rust type specifications. Functions must be annotated with type hints.

### Domain Definition Location
- **All domain definitions must be placed in the centralized domain layer** (`src/domain/`)
- Application layer uses domain types from the domain layer
- Infrastructure layer implements domain traits
- Interface layer depends on application services
- Scattered domain files across layers are not allowed

### Domain Usage Principles
1. **Single Source of Truth**: All domain definitions are centralized in `src/domain/` directory
2. **Infrastructure Isolation**: Infrastructure components must only depend on domain, never on application or interface layers

**Note: Sessions service module (Sessions is the top-level module in the application layer, workflow is the module for Graph interaction)**

## Language

Use Chinese in code and documentation. Use English in LLM-interact-related configuration files and code (mainly about prompts).