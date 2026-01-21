# Modular Agent Framework Developer Guide

This document provides essential information for AI agents working with the Modular Agent Framework codebase.

## Project Overview

The Modular Agent Framework is a TypeScript-based multi-agent system built on Graph Workflow, featuring:
- **Multi-model LLM integration** (OpenAI, Gemini, Anthropic, Mock)
- **Flexible tool system** supporting built-in, native, REST, and MCP tools
- **Configuration-driven architecture** with TOML-based configs and environment variable injection
- **Simplified 3-layer architecture**: Domain + Services + Infrastructure + Application
- **RESTful API** for external integration
- **Session and thread management** with checkpoint persistence
- **Configuration-driven architecture** with TOML-based configs and environment variable injection

## Development Environment Setup

### Prerequisites

nodejs v22.14.0

### Type check
```bash
tsc --noEmit 2>&1 | Select-Object -First 100 //or more
tsc --noEmit //not recommended
```

### Testing
```bash
# Run specific test file
npm test <test_file_path>
```
**NEVER RUN FULL TEST SUITE**

## Codebase Architecture

### Layered Architecture

The framework uses a simplified 3-layer architecture that reduces complexity while maintaining functionality:

**Architecture**: Domain + Services + Infrastructure + Application

### Layer Descriptions

**Domain Layer** (`src/domain/`)
- Contains pure business logic and domain entities
- Provides contracts for all major components: LLM, storage, workflow, sessions, etc.
- Contains no technical implementation details, only business rules
- Includes domain modules for workflow, state, LLM, and common components
- **Contains only**:
  - Entities: Workflow, Node, Edge, Tool, Session, Thread, etc.
  - Value Objects: IDs, Status, Type, Config, Timestamp, etc.
  - Repositories (contracts only): WorkflowRepository, ToolRepository, etc.
  - Domain Events: Changes in entities that other layers need to know about

**Services Layer** (`src/services/`)
- Provides business logic and technical implementations
- Depends on domain layer and infrastructure layer
- Includes services for workflow, session, thread, checkpoint, history, LLM, tools, state management
- Contains DTOs and DTO mapping functions
- Naming convention: No "Service" suffix (e.g., WorkflowManagement, ThreadExecution)

**Infrastructure Layer** (`src/infrastructure/`)
- Provides technical infrastructure: persistence, logging, configuration
- Depends on domain layer only
- Includes database repositories, loggers, config loaders
- Implements low-level technical details

**Application Layer** (`src/application/`)
- Provides external interface adaptations (HTTP/gRPC)
- Depends on services layer only
- Includes controllers, routes, middleware
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
- Cannot depend on services or application layers
- Implements concrete versions of domain interfaces for external dependencies

**Services Layer**
- **Can only depend on domain layer and infrastructure layer**
- Provides business logic and technical implementations
- Coordinates between domain components

**Application Layer**
- **Can only depend on services layer**
- Provides external interface implementations
- Handles integration with external systems

### Dependency Flow

Infrastructure depends only on Domain. Services depends on Domain and Infrastructure. Application depends on Services. All layers ultimately depend on Domain layer.

### TS Architecture (New)
- **3-layer architecture**: Domain + Services + Infrastructure + Application
- **Simplified patterns** avoiding over-engineering

## Development Process

### 1. Feature Development
- Follow layered architecture constraints strictly
- Define domain entities and business rules in the domain layer first
- Implement services in the services layer (no "Service" suffix)
- Provide external interfaces in the application layer
- Implement infrastructure components depending only on domain
- Use configuration files for customization with environment variable support

### 2. Testing Strategy
- **Unit tests**: Create a folder named `__tests__` in the same folder as the code being tested. All unit test files should be placed in this folder.
- **Integration tests**: Place all integration test files in global tests folder.
- **End-to-end tests**: Place all integration test files in `e2e` folder of global tests folder.

### 3. Code Quality Standards
- Follow dependency injection pattern for all service instantiation
- Use configuration-driven approach for all external dependencies
- Infrastructure components must only depend on domain layer
- Implement proper abstraction layers to enable seamless replacement

### 4. Configuration Changes
- Use the configuration system API for configuration management
- Update configuration in `package.json`, configs folder(for complex config) and .env(for simple config like api-key)

## Core Components Usage

### Service Management
- Located in `src/services/`
- Manages service lifecycle through dependency injection
- Use explicit dependencies in constructors
- Resolve services via dependency injection
- Naming convention: No "Service" suffix (e.g., WorkflowManagement, ThreadExecution)

### Domain Definition Location
- **All domain definitions must be placed in the centralized domain layer** (`src/domain/`)
- Services layer uses domain types from the domain layer
- Infrastructure layer implements domain traits
- Application layer depends on services
- Scattered domain files across layers are not allowed

### Domain Usage Principles
1. **Single Source of Truth**: All domain definitions are centralized in `src/domain/` directory
2. **Infrastructure Isolation**: Infrastructure components must only depend on domain, never on services or application layers

**Note: Sessions service module (Sessions is the top-level module in the services layer, workflow is the module for Graph interaction)**

## Language

Use Chinese in code and documentation. Use English in LLM-interact-related configuration files and code (mainly about prompts).