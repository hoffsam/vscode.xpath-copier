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
exports.XPathFormat = void 0;
exports.computeXPathForPosition = computeXPathForPosition;
exports.computeSymbolForPosition = computeSymbolForPosition;
exports.computeSegments = computeSegments;
exports.buildXPath = buildXPath;
exports.parseXPath = parseXPath;
exports.findSymbolByXPath = findSymbolByXPath;
const vscode = __importStar(require("vscode"));
const xmlParser_1 = require("./xmlParser");
/**
 * Enumeration of the built‑in XPath formats supported by the extension.
 */
var XPathFormat;
(function (XPathFormat) {
    XPathFormat["Full"] = "full";
    XPathFormat["Compact"] = "compact";
    XPathFormat["NamesOnly"] = "namesOnly";
    XPathFormat["NamedFull"] = "namedFull";
    XPathFormat["NamedCompact"] = "namedCompact";
    XPathFormat["Breadcrumb"] = "breadcrumb";
    XPathFormat["Custom"] = "custom";
})(XPathFormat || (exports.XPathFormat = XPathFormat = {}));
/**
 * Compute an XPath string for a given cursor position.  If the document
 * does not contain symbols provided by the language server, `undefined`
 * will be returned.
 *
 * @param document The text document containing the XML/HTML/XHTML.
 * @param position The position within the document for which to compute the XPath.
 * @param format    The desired output format.
 * @param options   Additional options such as custom format templates.
 */
async function computeXPathForPosition(document, position, format, options = {}) {
    console.log(`XPath Copier: computeXPathForPosition called for ${document.uri.toString()}`);
    // Use direct XML parsing instead of language server
    const elementPath = (0, xmlParser_1.findElementPathAtPosition)(document, position);
    if (!elementPath || elementPath.length === 0) {
        console.log('XPath Copier: No element path found for position');
        return undefined;
    }
    console.log(`XPath Copier: Found element path with ${elementPath.length} elements`);
    const segments = computeSegmentsFromElements(elementPath, document);
    console.log(`XPath Copier: Computed ${segments.length} segments`);
    if (format === XPathFormat.Custom) {
        const templates = options.customTemplates ?? [];
        if (templates.length === 0) {
            return undefined;
        }
        const template = templates[0];
        return buildCustomXPath(segments, template);
    }
    return buildXPath(segments, format);
}
/**
 * Compute the selection range for a given position.  Used to show the
 * element in a Peek view.
 *
 * @param document The text document.
 * @param position The position to find a symbol for.
 */
async function computeSymbolForPosition(document, position) {
    const symbols = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', document.uri);
    if (!symbols || symbols.length === 0) {
        return undefined;
    }
    const path = findSymbolPath(symbols, position);
    return path ? path[path.length - 1] : undefined;
}
/**
 * Recursively traverse the symbol tree to find the deepest symbol whose
 * range contains the given position.  Returns an array representing the
 * path from the root symbol to the leaf symbol.  If no matching symbol
 * is found the returned value is `undefined`.
 */
function findSymbolPath(symbols, position, ancestors = []) {
    for (const sym of symbols) {
        if (contains(sym.range, position)) {
            console.log(`XPath Copier: Found matching symbol: ${sym.name}, children: ${sym.children?.length || 0}, level: ${ancestors.length}`);
            // Descend into children to find a deeper match.
            if (sym.children && sym.children.length > 0) {
                const deeper = findSymbolPath(sym.children, position, [...ancestors, sym]);
                if (deeper) {
                    console.log(`XPath Copier: Returning deeper path with ${deeper.length} elements`);
                    return deeper;
                }
                console.log(`XPath Copier: No deeper match found in children of ${sym.name}`);
            }
            else {
                console.log(`XPath Copier: Symbol ${sym.name} has no children (children=${sym.children})`);
            }
            return [...ancestors, sym];
        }
    }
    return undefined;
}
/**
 * Determine whether a range contains a position.  DocumentSymbol.range
 * includes the entire element start and end tags as well as children.
 */
function contains(range, position) {
    return range.start.isBeforeOrEqual(position) && range.end.isAfterOrEqual(position);
}
/**
 * Build the list of SegmentInfo objects from XmlElement path.
 * Computes sibling indexes and extracts name attributes.
 */
function computeSegmentsFromElements(elementPath, document) {
    const segments = [];
    for (let i = 0; i < elementPath.length; i++) {
        const element = elementPath[i];
        const index = (0, xmlParser_1.computeSiblingIndex)(elementPath, i, document);
        const nameAttr = element.attributes.get('name');
        segments.push({ tag: element.name, index, nameAttr });
    }
    return segments;
}
/**
 * Build the list of SegmentInfo objects for a given symbol path.  This
 * computes the sibling index and reads the `name` attribute value if
 * present.  This function is exported for unit testing.
 */
function computeSegments(symbolPath, document) {
    const segments = [];
    for (let i = 0; i < symbolPath.length; i++) {
        const sym = symbolPath[i];
        const parent = i > 0 ? symbolPath[i - 1] : undefined;
        const index = computeSiblingIndex(sym, parent);
        const nameAttr = extractNameAttribute(document, sym);
        segments.push({ tag: sym.name, index, nameAttr });
    }
    return segments;
}
/**
 * Compute the 1‑based index of a symbol among its siblings with the same
 * name.  When no parent exists the index is always 1.  Siblings are
 * determined by comparing the ranges of children on the parent.
 */
function computeSiblingIndex(symbol, parent) {
    if (!parent || !parent.children) {
        return 1;
    }
    // Filter siblings that have the same name and kind as the target
    const sameNamed = parent.children.filter((child) => child.name === symbol.name && child.kind === symbol.kind);
    for (let i = 0; i < sameNamed.length; i++) {
        const candidate = sameNamed[i];
        if (rangesEqual(candidate.range, symbol.range)) {
            return i + 1;
        }
    }
    return 1;
}
/**
 * Compare two ranges for equality.  Both start and end positions must match.
 */
function rangesEqual(a, b) {
    return a.start.isEqual(b.start) && a.end.isEqual(b.end);
}
/**
 * Extract the value of the `name` attribute from the start tag of the given
 * element.  Returns `undefined` if no name attribute exists.  This
 * implementation reads a small slice of the document around the symbol’s
 * start tag and applies a regular expression.
 */
function extractNameAttribute(document, symbol) {
    try {
        const range = symbol.range;
        // Limit search to the first 200 characters of the symbol to avoid
        // scanning large child contents.  The start tag should occur near
        // the beginning of this range.
        const start = range.start;
        const end = start.translate(0, 200);
        const snippetRange = new vscode.Range(start, end);
        const snippet = document.getText(snippetRange);
        const closeIdx = snippet.indexOf('>');
        const tagContent = closeIdx >= 0 ? snippet.substring(0, closeIdx + 1) : snippet;
        const m = /\bname\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tagContent);
        if (m) {
            return m[1] ?? m[2] ?? undefined;
        }
    }
    catch {
        // Best effort only
    }
    return undefined;
}
/**
 * Build a string representation of the XPath given the segments and
 * selected format.  Exported for unit testing.
 */
function buildXPath(segments, format) {
    switch (format) {
        case XPathFormat.Full:
            return segments.map((seg) => `/${seg.tag}[${seg.index}]`).join('');
        case XPathFormat.Compact:
            return segments
                .map((seg) => `/${seg.tag}${seg.index > 1 ? `[${seg.index}]` : ''}`)
                .join('');
        case XPathFormat.NamesOnly:
            return segments.map((seg) => `/${seg.tag}`).join('');
        case XPathFormat.NamedFull:
            // Named Full behaves like Named Compact: include the name attribute when
            // present and elide indexes equal to 1.  This mirrors the examples in
            // the specification where no index was shown for EntityDef or Attribute
            // when a name attribute was present or the element was the first of its
            // siblings.
            return segments
                .map((seg) => {
                if (seg.nameAttr) {
                    return `/${seg.tag}[@name='${escapeXPathString(seg.nameAttr)}']`;
                }
                return seg.index > 1 ? `/${seg.tag}[${seg.index}]` : `/${seg.tag}`;
            })
                .join('');
        case XPathFormat.NamedCompact:
            return segments
                .map((seg) => {
                if (seg.nameAttr) {
                    return `/${seg.tag}[@name='${escapeXPathString(seg.nameAttr)}']`;
                }
                return seg.index > 1 ? `/${seg.tag}[${seg.index}]` : `/${seg.tag}`;
            })
                .join('');
        case XPathFormat.Breadcrumb:
            return segments
                .map((seg) => {
                const namePart = seg.nameAttr ? ` (${seg.nameAttr})` : '';
                return `${seg.tag}${namePart}`;
            })
                .join(' > ');
        default:
            return segments.map((seg) => `/${seg.tag}`).join('');
    }
}
/**
 * Escape single quotes in attribute values for inclusion in XPath strings.
 */
function escapeXPathString(str) {
    return str.replace(/'/g, "''");
}
/**
 * Construct a custom XPath according to a format template.  Each segment is
 * generated using the provided template and then concatenated.  Variables
 * `${tag}`, `${index}` and `${name}` will be replaced with the actual
 * values from the SegmentInfo.
 */
function buildCustomXPath(segments, template) {
    return segments
        .map((seg) => {
        let segmentStr = template;
        segmentStr = segmentStr.replace(/\$\{tag\}/g, seg.tag);
        segmentStr = segmentStr.replace(/\$\{index\}/g, seg.index.toString());
        segmentStr = segmentStr.replace(/\$\{name\}/g, seg.nameAttr ?? '');
        return segmentStr;
    })
        .join('');
}
/**
 * Parse an XPath string into an array of descriptors containing tag name,
 * optional index and optional name attribute.  This helper is used by
 * the reverse lookup command.
 */
function parseXPath(xpath) {
    const trimmed = xpath.trim();
    // Remove leading slash if present
    const body = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
    if (!body)
        return [];
    return body.split('/')
        .filter((p) => p.length > 0)
        .map((segment) => {
        // Matches patterns like Tag[2] or Tag[@name='value'] or Tag
        const nameMatch = segment.match(/^([^\[]+)\[\s*@name\s*=\s*['"]([^'"]+)['"]\s*\]$/i);
        if (nameMatch) {
            return { tag: nameMatch[1], name: nameMatch[2] };
        }
        const idxMatch = segment.match(/^([^\[]+)\[(\d+)\]$/);
        if (idxMatch) {
            return { tag: idxMatch[1], index: parseInt(idxMatch[2], 10) };
        }
        return { tag: segment };
    });
}
/**
 * Given a symbol tree and a parsed XPath, find a matching DocumentSymbol.
 * Returns the deepest matching symbol if found; otherwise returns undefined.
 */
function findSymbolByXPath(symbols, parsed, document) {
    let candidates = symbols;
    let matchedSymbol;
    for (let level = 0; level < parsed.length; level++) {
        const part = parsed[level];
        // Filter candidates matching the current part
        const filtered = candidates.filter((s) => s.name === part.tag);
        if (filtered.length === 0) {
            return undefined;
        }
        let chosen;
        if (part.name) {
            // Name attribute specified – choose first child with matching name attribute
            chosen = filtered.find((sym) => extractNameAttribute(document, sym) === part.name);
        }
        else if (typeof part.index === 'number') {
            // Index specified – choose Nth child with same tag
            const idx = part.index - 1;
            if (idx >= 0 && idx < filtered.length) {
                chosen = filtered[idx];
            }
        }
        else {
            // No index or name – pick first occurrence
            chosen = filtered[0];
        }
        if (!chosen) {
            return undefined;
        }
        matchedSymbol = chosen;
        candidates = chosen.children || [];
    }
    return matchedSymbol;
}
//# sourceMappingURL=xpathUtil.js.map