"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.findElementPathAtPosition = findElementPathAtPosition;
exports.computeSiblingIndex = computeSiblingIndex;
exports.findElementByXPath = findElementByXPath;
const vscode = __importStar(require("vscode"));
/**
 * Parse XML/HTML document and find the element path at the given position.
 * Returns an array of elements from root to the target element.
 */
function findElementPathAtPosition(document, position) {
    const text = document.getText();
    const offset = document.offsetAt(position);
    console.log(`XPath Parser: Finding element at offset ${offset}, line ${position.line}, char ${position.character}`);
    // Find all opening and closing tags with their positions
    const tags = parseAllTags(text);
    // Build element tree by matching open/close tags
    // Strategy: track the stack as we parse, and whenever we find a tag containing
    // the cursor, record that path. Keep the deepest (most specific) path found.
    const stack = [];
    let cursorPath;
    for (const tag of tags) {
        if (tag.isClosing) {
            // Pop matching opening tag from stack
            if (stack.length > 0 && stack[stack.length - 1].name === tag.name) {
                stack.pop();
            }
        }
        else if (tag.isSelfClosing) {
            // Self-closing tag - check if cursor is within this tag
            if (offset >= tag.offset && offset <= tag.offset + tag.text.length) {
                const element = {
                    name: tag.name,
                    attributes: tag.attributes,
                    startOffset: tag.offset,
                    endOffset: tag.offset + tag.text.length,
                    startLine: tag.line,
                    startColumn: tag.column
                };
                // Cursor is within this self-closing tag - this is the deepest match so far
                cursorPath = [...stack.map(e => ({ ...e })), element];
            }
        }
        else {
            // Opening tag
            const element = {
                name: tag.name,
                attributes: tag.attributes,
                startOffset: tag.offset,
                endOffset: -1, // Will be determined by content/closing tag
                startLine: tag.line,
                startColumn: tag.column
            };
            // Check if cursor is within this opening tag itself
            if (offset >= tag.offset && offset <= tag.offset + tag.text.length) {
                cursorPath = [...stack.map(e => ({ ...e })), element];
            }
            // Push to stack regardless (it's an opening tag)
            stack.push(element);
        }
    }
    // If no specific tag matched, check if cursor is within content of any stacked element
    if (!cursorPath && stack.length > 0) {
        // Find the deepest element in stack that starts before cursor
        for (let i = stack.length - 1; i >= 0; i--) {
            if (offset >= stack[i].startOffset) {
                cursorPath = stack.slice(0, i + 1).map(e => ({ ...e }));
                break;
            }
        }
    }
    const path = cursorPath || [];
    console.log(`XPath Parser: Found path with ${path.length} elements: ${path.map(e => e.name).join(' > ')}`);
    return path.length > 0 ? path : undefined;
}
/**
 * Parse all XML/HTML tags from the text and return them in document order.
 */
function parseAllTags(text) {
    const tags = [];
    // Regex to match opening tags, closing tags, and self-closing tags
    // Matches: <tagname attrs>, </tagname>, <tagname attrs/>
    const tagRegex = /<\s*(\/)?\s*([a-zA-Z_][\w:.-]*)\s*([^>]*?)\s*(\/)?>/g;
    let match;
    let line = 0;
    let lineStart = 0;
    while ((match = tagRegex.exec(text)) !== null) {
        const fullMatch = match[0];
        const hasClosingSlash = !!match[1]; // Leading / means </tag>
        const hasSelfClosingSlash = !!match[4]; // Trailing / means <tag />
        const tagName = match[2];
        const attrString = match[3] || '';
        const offset = match.index;
        // Calculate line and column
        while (lineStart < text.length && lineStart <= offset) {
            const newlineIndex = text.indexOf('\n', lineStart);
            if (newlineIndex === -1 || newlineIndex > offset) {
                break;
            }
            line++;
            lineStart = newlineIndex + 1;
        }
        const column = offset - lineStart;
        // Parse attributes
        const attributes = parseAttributes(attrString);
        // Determine tag type: closing tags have leading /, self-closing have trailing /
        const isClosing = hasClosingSlash;
        const isSelfClosing = hasSelfClosingSlash && !hasClosingSlash;
        tags.push({
            name: tagName,
            attributes,
            offset,
            line,
            column,
            text: fullMatch,
            isClosing,
            isSelfClosing
        });
    }
    return tags;
}
/**
 * Parse attribute string into a Map of name->value pairs.
 */
function parseAttributes(attrString) {
    const attributes = new Map();
    // Match: attrname="value" or attrname='value' or attrname=value
    const attrRegex = /([a-zA-Z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/g;
    let match;
    while ((match = attrRegex.exec(attrString)) !== null) {
        const name = match[1];
        const value = match[2] ?? match[3] ?? match[4] ?? '';
        attributes.set(name, value);
    }
    return attributes;
}
/**
 * Count how many siblings with the same tag name come before this element.
 * Returns 1-based index.
 * Skips elements in the skipElements set when counting siblings.
 */
function computeSiblingIndex(elementPath, targetIndex, document, skipElements) {
    if (targetIndex === 0) {
        return 1; // Root element is always index 1
    }
    const target = elementPath[targetIndex];
    const parent = elementPath[targetIndex - 1];
    // Find all children of parent with the same name
    const text = document.getText();
    const parentStart = parent.startOffset;
    const parentEnd = parent.endOffset > 0 ? parent.endOffset : text.length;
    // Parse tags only within parent's range
    const tags = parseAllTags(text.substring(parentStart, parentEnd));
    let depth = 0;
    let sameNameCount = 0;
    let foundTarget = false;
    for (const tag of tags) {
        if (tag.isClosing) {
            depth--;
        }
        else if (tag.isSelfClosing) {
            // Skip counting if this element should be skipped
            const shouldSkip = skipElements && skipElements.has(tag.name);
            if (depth === 1 && tag.name === target.name && !shouldSkip) {
                sameNameCount++;
                if (parentStart + tag.offset === target.startOffset) {
                    foundTarget = true;
                    break;
                }
            }
        }
        else {
            depth++;
            // Skip counting if this element should be skipped
            const shouldSkip = skipElements && skipElements.has(tag.name);
            if (depth === 1 && tag.name === target.name && !shouldSkip) {
                sameNameCount++;
                if (parentStart + tag.offset === target.startOffset) {
                    foundTarget = true;
                    break;
                }
            }
        }
    }
    return foundTarget ? sameNameCount : 1;
}
/**
 * Find an element in the document by XPath.
 * Returns the position of the matching element's start tag, or undefined if not found.
 */
function findElementByXPath(document, parsedXPath) {
    const text = document.getText();
    const allTags = parseAllTags(text);
    // Track element stack as we parse
    const stack = [];
    let currentPathIndex = 0;
    for (const tag of allTags) {
        if (tag.isClosing) {
            // Pop from stack
            if (stack.length > 0 && stack[stack.length - 1].tag.name === tag.name) {
                stack.pop();
                if (stack.length < currentPathIndex) {
                    currentPathIndex = stack.length;
                }
            }
        }
        else if (!tag.isSelfClosing) {
            // Opening tag - check if it matches current path segment
            const currentSegment = parsedXPath[currentPathIndex];
            if (currentSegment && tag.name === currentSegment.tag) {
                // Check if this matches the criteria (index or name attribute)
                let matches = false;
                if (currentSegment.name !== undefined) {
                    // Must match name attribute
                    matches = tag.attributes.get('name') === currentSegment.name;
                }
                else if (currentSegment.index !== undefined) {
                    // Must match index - count siblings at this level
                    const siblingIndex = countPrecedingSiblings(allTags, tag, stack.length);
                    matches = siblingIndex === currentSegment.index;
                }
                else {
                    // No specific criteria - match first occurrence
                    const siblingIndex = countPrecedingSiblings(allTags, tag, stack.length);
                    matches = siblingIndex === 1;
                }
                if (matches) {
                    currentPathIndex++;
                    stack.push({ tag, pathIndex: currentPathIndex });
                    // Check if we've matched the entire path
                    if (currentPathIndex === parsedXPath.length) {
                        return new vscode.Position(tag.line, tag.column);
                    }
                }
            }
        }
    }
    return undefined;
}
/**
 * Count how many siblings with the same name come before this tag at the given depth.
 * Returns 1-based index.
 */
function countPrecedingSiblings(allTags, targetTag, targetDepth) {
    let depth = 0;
    let count = 0;
    for (const tag of allTags) {
        if (tag.offset === targetTag.offset) {
            return count + 1;
        }
        if (tag.isClosing) {
            depth--;
        }
        else if (!tag.isSelfClosing) {
            depth++;
            if (depth === targetDepth + 1 && tag.name === targetTag.name) {
                count++;
            }
        }
    }
    return count + 1;
}
//# sourceMappingURL=xmlParser.js.map