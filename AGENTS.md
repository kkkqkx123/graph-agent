# Modular Agent Framework Developer Guide

This document provides essential information for AI agents working with the Modular Agent Framework codebase.

## Project Overview

The Modular Agent Framework is a Rust-based multi-agent system built on Graph Workflow, featuring:
- **Multi-model LLM integration** (OpenAI, Gemini, Anthropic, Mock)
- **Flexible tool system** supporting native, MCP, and built-in tools
- **Configuration-driven architecture** with TOML-based configs and environment variable injection
- **Simplified 3-layer architecture**: Domain + Application + Infrastructure
- **Type-safe dependency management** with compile-time resolution
- **RESTful API** for external integration
- **Session and thread management** with checkpoint persistence
- **Workflow engine** with ReAct and other patterns
- **Memory safety and performance** through Rust's ownership system

## Development Environment Setup

### Prerequisites

- rustc: 1.88.0
- cargo: 1.88.0
- rustup:
Default host: x86_64-pc-windows-msvc

### Build commands
```bash
cargo build # Debug build (development)
cargo build --release # Release build (optimized for performance)
```

### Type check and compile check
```bash
cargo check --message-format=short # Default Type check
cargo check # Detailed Type check(Only use it when you need that. when use this, always add filter logic, like `cargo check 2>&1 | Select-String "error\[E" | Select-Object -First 10`)
```

### Testing
```bash
# Run all tests
cargo test

# Run specific test
cargo test <test_name>

# Run integration tests
cargo test --test <integration_test_file>

# Run benchmarks
cargo bench
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
- **Type-safe validation**: Strong type validation using Rust's type system
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
- **Configuration system** with complex processor chains

### Rust Architecture (New)
- **3-layer architecture**: Domain + Application + Infrastructure + Interface
- **Compile-time dependency resolution** with type safety
- **Simplified patterns** avoiding over-engineering
- **No circular dependencies** enforced by Rust's module system
- **Simplified configuration** with direct environment variable resolution

## Development Process

### 1. Feature Development
- Follow layered architecture constraints strictly
- Define domain entities and business rules in the domain layer first
- Implement application services in the application layer
- Provide external interfaces in the interface layer
- Implement infrastructure components depending only on domain
- Use configuration files for customization with environment variable support
- Write unit and integration tests with appropriate mocking
- Ensure type annotations and follow Rust type system

### 2. Testing Strategy
- **Unit tests**: Domain layer and application layer core business logic coverage ≥ 90%
- **Integration tests**: Module interaction and infrastructure component coverage ≥ 80%
- **Infrastructure tests**: Infrastructure layer implementation coverage ≥ 85%
- **End-to-end tests**: Complete workflow and user scenario coverage ≥ 70%

### 3. Code Quality Standards
- Use Rust's type system (enforced by compiler)
- Write complete documentation with parameter and return type documentation
- Follow dependency injection pattern for all service instantiation
- Use configuration-driven approach for all external dependencies
- Infrastructure components must only depend on domain layer
- Implement proper abstraction layers to enable seamless replacement

### 4. Configuration Changes
- Use the configuration system API for configuration management
- Update configuration in `Cargo.toml` and environment variables
- Create specific configuration files with environment variable support
- Validate using type system before compilation
- Ensure environment variable references use proper Rust types

### 5. Error Handling
- Use Rust's Result<T, Error> type for error handling
- Implement proper error propagation between layers
- Use structured logging with context
- Provide meaningful error messages to users
- Handle configuration errors gracefully with fallback options

## Core Components Usage

### Service Management
- Located in `src/application/`
- Manages service lifecycle through dependency injection
- Use explicit dependencies in constructors
- Resolve services via dependency injection

### Logger
- Infrastructure: `src/infrastructure/common/logging.rs`
- Application: `src/application/common/logging.rs`
- Use structured logging with tracing
- Supports console, file, and JSON outputs

### Error Handling
- Module-specific error types in `src/domain/<module>/errors.rs`
- Use Rust's Result<T, Error> type for error handling
- Implement proper error propagation between layers

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
2. **Type Safety**: Use Rust's type system to ensure compile-time correctness
3. **Unified Export**: Export all domain types through `src/domain/mod.rs`
4. **Backward Compatibility**: Each layer can re-export domain types for compatibility
5. **Infrastructure Isolation**: Infrastructure components must only depend on domain, never on application or interface layers

**Note: Sessions service module (Sessions is the top-level module in the application layer, workflow is the module for Graph interaction)**

## Language

Use Chinese in code and documentation. Use English in LLM-interact-related configuration files and code (mainly about prompts).