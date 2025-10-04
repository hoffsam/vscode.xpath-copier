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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const minimatch_1 = require("minimatch");
const xpathUtil_1 = require("./xpathUtil");
const xmlParser_1 = require("./xmlParser");
/**
 * This method is called when your extension is activated.  VS Code will
 * activate the extension the first time a file of the configured languages is
 * opened or any of the contributed commands is invoked.  We register all
 * commands here and perform runtime checks for document symbols when needed.
 */
async function activate(context) {
    console.log('XPath Copier: Extension activating');
    // Extension now activates and registers commands.
    // Runtime checks for document symbols will be done when commands are executed.
    /**
     * Helper to register a simple copy command bound to a specific format.
     */
    function registerCopyCommand(cmd, fmt) {
        console.log(`XPath Copier: Registering command ${cmd}`);
        const disposable = vscode.commands.registerCommand(cmd, async () => {
            console.log(`XPath Copier: Command ${cmd} executed`);
            await copyXPaths(fmt);
        });
        context.subscriptions.push(disposable);
    }
    // Register copy commands for each built‑in format
    registerCopyCommand('xpathCopier.copyXPathFull', xpathUtil_1.XPathFormat.Full);
    registerCopyCommand('xpathCopier.copyXPathCompact', xpathUtil_1.XPathFormat.Compact);
    registerCopyCommand('xpathCopier.copyXPathNamesOnly', xpathUtil_1.XPathFormat.NamesOnly);
    registerCopyCommand('xpathCopier.copyXPathNamedFull', xpathUtil_1.XPathFormat.NamedFull);
    registerCopyCommand('xpathCopier.copyXPathNamedCompact', xpathUtil_1.XPathFormat.NamedCompact);
    registerCopyCommand('xpathCopier.copyXPathBreadcrumb', xpathUtil_1.XPathFormat.Breadcrumb);
    // Unified QuickPick command
    const quickPickDisposable = vscode.commands.registerCommand('xpathCopier.copyXPathQuickPick', async () => {
        await showQuickPick();
    });
    context.subscriptions.push(quickPickDisposable);
    // Reverse (paste & go) command
    const reverseDisposable = vscode.commands.registerCommand('xpathCopier.copyXPathReverse', async () => {
        await pasteAndGo();
    });
    context.subscriptions.push(reverseDisposable);
    console.log('XPath Copier: Extension activation completed');
}
/**
 * Filter skip rules to only those matching the given file path.
 * Uses minimatch for glob pattern matching.
 */
function matchSkipRules(filePath, rules) {
    return rules.filter(rule => {
        try {
            return (0, minimatch_1.minimatch)(filePath, rule.filePattern);
        }
        catch (error) {
            console.error(`XPath Copier: Invalid file pattern '${rule.filePattern}':`, error);
            return false;
        }
    });
}
/**
 * Copy XPaths for the current selections using the given format.  Handles
 * multi‑cursor selection, clipboard writing and optionally shows a peek
 * window to provide context.
 */
async function copyXPaths(format) {
    console.log(`XPath Copier: copyXPaths called with format: ${format}`);
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        console.log('XPath Copier: No active editor');
        vscode.window.showWarningMessage('No active editor');
        return;
    }
    const document = editor.document;
    const selections = editor.selections;
    const config = vscode.workspace.getConfiguration('xpathCopier');
    const multicursorFormat = config.get('multicursorFormat', 'lines');
    const customTemplates = config.get('customFormatTemplates', []);
    const enableFormats = config.get('enableFormats', {});
    // Read element skipping configuration
    const enableSkipping = config.get('enableElementSkipping', false);
    const allSkipRules = config.get('skipRules', []);
    // Read name attribute configuration
    const nameAttribute = config.get('nameAttribute', 'name');
    const nameOnly = config.get('nameOnly', false);
    // Match skip rules against current document path
    const applicableSkipRules = enableSkipping
        ? matchSkipRules(document.uri.fsPath, allSkipRules)
        : [];
    // If the requested format is disabled skip the operation
    if (format !== xpathUtil_1.XPathFormat.Custom && enableFormats && enableFormats[format] === false) {
        vscode.window.showWarningMessage(`The ${format} format is disabled in settings.`);
        return;
    }
    console.log(`XPath Copier: Document language: ${document.languageId}, selections: ${selections.length}`);
    console.log(`XPath Copier: Element skipping enabled: ${enableSkipping}, applicable rules: ${applicableSkipRules.length}`);
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Window,
        title: 'Copying XPath...',
        cancellable: false
    }, async () => {
        const results = [];
        for (const sel of selections) {
            const pos = sel.active;
            console.log(`XPath Copier: Computing XPath for position: line ${pos.line}, char ${pos.character}`);
            const xpath = await (0, xpathUtil_1.computeXPathForPosition)(document, pos, format, {
                customTemplates,
                skipRules: applicableSkipRules,
                enableSkipping,
                nameAttribute,
                nameOnly
            });
            console.log(`XPath Copier: Computed XPath: ${xpath}`);
            if (xpath) {
                results.push(xpath);
            }
        }
        console.log(`XPath Copier: Results: ${results.length} XPaths computed`);
        if (results.length === 0) {
            vscode.window.showWarningMessage('Unable to compute XPath for the current selection.');
            return;
        }
        let output;
        if (results.length === 1) {
            output = results[0];
        }
        else {
            if (multicursorFormat === 'json') {
                output = JSON.stringify(results, null, 2);
            }
            else {
                output = results.join('\n');
            }
        }
        await vscode.env.clipboard.writeText(output);
        console.log(`XPath Copier: Successfully copied to clipboard: ${output}`);
        vscode.window.setStatusBarMessage(`✓ Copied XPath${results.length > 1 ? 's' : ''} to clipboard`, 3000);
    });
}
/**
 * Present a QuickPick listing all enabled formats and any custom templates.
 * The user's selection will determine which XPath string is generated.
 */
async function showQuickPick() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    const config = vscode.workspace.getConfiguration('xpathCopier');
    const enableFormats = config.get('enableFormats', {});
    const customTemplates = config.get('customFormatTemplates', []);
    // Build items for built‑in formats
    const items = [];
    const pushIfEnabled = (fmt, label) => {
        if (!enableFormats || enableFormats[fmt] !== false) {
            items.push({ label, format: fmt });
        }
    };
    pushIfEnabled(xpathUtil_1.XPathFormat.Full, 'Full');
    pushIfEnabled(xpathUtil_1.XPathFormat.Compact, 'Compact');
    pushIfEnabled(xpathUtil_1.XPathFormat.NamesOnly, 'Names Only');
    pushIfEnabled(xpathUtil_1.XPathFormat.NamedFull, 'Named Full');
    pushIfEnabled(xpathUtil_1.XPathFormat.NamedCompact, 'Named Compact');
    pushIfEnabled(xpathUtil_1.XPathFormat.Breadcrumb, 'Breadcrumb');
    // Add custom templates as additional items
    if (customTemplates && customTemplates.length > 0) {
        customTemplates.forEach((tmpl, index) => {
            const label = `Custom ${index + 1}`;
            const description = tmpl;
            items.push({ label, description, format: xpathUtil_1.XPathFormat.Custom, template: tmpl });
        });
    }
    const pick = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select XPath format',
        canPickMany: false
    });
    if (!pick) {
        return;
    }
    // Determine chosen format and optionally override custom template order
    if (pick.format === xpathUtil_1.XPathFormat.Custom && pick.template) {
        // Temporarily put chosen template at front of array so computeXPath uses it
        const allTemplates = [pick.template];
        await copyXPathsCustom(allTemplates);
    }
    else if (pick.format) {
        await copyXPaths(pick.format);
    }
}
/**
 * Copy XPaths using an explicit list of custom templates.  This helper is
 * invoked from the QuickPick when a custom template entry is selected.
 */
async function copyXPathsCustom(customTemplates) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    const document = editor.document;
    const selections = editor.selections;
    const config = vscode.workspace.getConfiguration('xpathCopier');
    const nameAttribute = config.get('nameAttribute', 'name');
    const nameOnly = config.get('nameOnly', false);
    const multicursorFormat = config.get('multicursorFormat', 'lines');
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Window,
        title: 'Copying XPath...',
        cancellable: false
    }, async () => {
        const results = [];
        for (const sel of selections) {
            const pos = sel.active;
            const xpath = await (0, xpathUtil_1.computeXPathForPosition)(document, pos, xpathUtil_1.XPathFormat.Custom, {
                customTemplates,
                nameAttribute,
                nameOnly
            });
            if (xpath) {
                results.push(xpath);
            }
        }
        if (results.length === 0) {
            vscode.window.showWarningMessage('Unable to compute custom XPath for the current selection.');
            return;
        }
        let output;
        if (results.length === 1) {
            output = results[0];
        }
        else {
            output = multicursorFormat === 'json' ? JSON.stringify(results, null, 2) : results.join('\n');
        }
        await vscode.env.clipboard.writeText(output);
        console.log(`XPath Copier: Successfully copied to clipboard: ${output}`);
        vscode.window.setStatusBarMessage(`✓ Copied XPath${results.length > 1 ? 's' : ''} to clipboard`, 3000);
    });
}
/**
 * Reverse lookup: prompt the user for an XPath and, if it matches an
 * element in the current document, jump to that location.  If no
 * matching element is found, display an informational message.
 */
async function pasteAndGo() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    const document = editor.document;
    const input = await vscode.window.showInputBox({
        prompt: 'Enter an XPath to navigate to',
        placeHolder: '/Project/EntityDefs/EntityDef[1]/Attributes/Attribute[2]'
    });
    if (!input) {
        return;
    }
    const parsed = (0, xpathUtil_1.parseXPath)(input);
    if (parsed.length === 0) {
        vscode.window.showWarningMessage('Invalid or empty XPath.');
        return;
    }
    const position = (0, xmlParser_1.findElementByXPath)(document, parsed);
    if (!position) {
        vscode.window.showInformationMessage('No element matching the specified XPath was found.');
        return;
    }
    const targetRange = new vscode.Range(position, position);
    editor.revealRange(targetRange, vscode.TextEditorRevealType.InCenter);
    editor.selection = new vscode.Selection(position, position);
    vscode.window.setStatusBarMessage('Navigated to element.', 2000);
}
// The deactivate function is kept for completeness.  It is not strictly
// necessary because VS Code disposes of subscriptions automatically when
// the extension is unloaded.
function deactivate() { }
//# sourceMappingURL=extension.js.map