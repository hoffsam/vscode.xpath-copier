# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VS Code extension called "XPath Copier" that generates XPath expressions for XML/HTML/XHTML elements. The extension provides multiple XPath formats and relies on VS Code's document symbol provider (XML language server) to understand document structure.

## Development Commands

- `npm run compile` - Compile TypeScript source code to JavaScript
- `npm run build` - Full build: compile + package extension into .vsix file
- `npm test` - Run unit tests with Mocha

## Architecture

### Core Components

- `src/extension.ts` - Main extension entry point, command registration, and VS Code integration
- `src/xpathUtil.ts` - Core XPath computation logic, format generation, and symbol tree navigation
- `test/xpathUtil.test.ts` - Unit tests for XPath generation and parsing

### Key Architecture Patterns

- **Symbol Tree Navigation**: Uses VS Code's `executeDocumentSymbolProvider` to get document structure
- **Multi-format Support**: Enum-based format system with 6 built-in formats (Full, Compact, NamesOnly, NamedFull, NamedCompact, Breadcrumb)
- **Custom Templates**: Supports user-defined XPath format templates with `${tag}`, `${index}`, `${name}` variables
- **Multi-cursor Support**: Handles multiple selections with configurable output format (lines vs JSON)

### Extension Integration Points

- **Language Server Dependency**: Works with any XML language server that provides document symbols
- **Commands**: 8 contributed commands for different XPath formats and utilities  
- **Context Menus**: All commands grouped under "XPath" submenu in editor context menu for XML/HTML/XHTML files
- **Keybindings**: Keyboard shortcuts for common XPath formats
- **Configuration**: Extensive settings under `xpathCopier` namespace

### Recent Changes

- **Removed Language Server Check**: Extension now activates without requiring specific "redhat.vscode-xml" extension
- **Simplified UI**: Removed CodeLens-like peek view popup; commands only copy to clipboard and show notification
- **Improved Context Menu**: All XPath commands grouped under single "XPath" submenu instead of scattered individual entries

## Code Structure

- Main logic flow: Position → Symbol Path → Segments → XPath String
- Symbol path represents ancestry from root to target element
- Segments contain tag name, sibling index, and optional name attribute
- Format-specific builders generate final XPath strings

## Dependencies

- VS Code API (`vscode` module)
- TypeScript compilation
- Mocha for testing
- vsce for extension packaging
- No external runtime dependencies (extension uses only VS Code APIs)