import * as vscode from 'vscode';
import { minimatch } from 'minimatch';
import {
  XPathFormat,
  computeXPathForPosition,
  parseXPath,
  SkipRule
} from './xpathUtil';
import { findElementByXPath } from './xmlParser';

/**
 * This method is called when your extension is activated.  VS Code will
 * activate the extension the first time a file of the configured languages is
 * opened or any of the contributed commands is invoked.  We register all
 * commands here and perform runtime checks for document symbols when needed.
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('XPath Copier: Extension activating');
  // Extension now activates and registers commands.
  // Runtime checks for document symbols will be done when commands are executed.

  /**
   * Helper to register a simple copy command bound to a specific format.
   */
  function registerCopyCommand(cmd: string, fmt: XPathFormat) {
    console.log(`XPath Copier: Registering command ${cmd}`);
    const disposable = vscode.commands.registerCommand(cmd, async () => {
      console.log(`XPath Copier: Command ${cmd} executed`);
      await copyXPaths(fmt);
    });
    context.subscriptions.push(disposable);
  }

  // Register copy commands for each built‑in format
  registerCopyCommand('xpathCopier.copyXPathFull', XPathFormat.Full);
  registerCopyCommand('xpathCopier.copyXPathCompact', XPathFormat.Compact);
  registerCopyCommand('xpathCopier.copyXPathNamesOnly', XPathFormat.NamesOnly);
  registerCopyCommand('xpathCopier.copyXPathNamedFull', XPathFormat.NamedFull);
  registerCopyCommand('xpathCopier.copyXPathNamedCompact', XPathFormat.NamedCompact);
  registerCopyCommand('xpathCopier.copyXPathBreadcrumb', XPathFormat.Breadcrumb);

  // Unified QuickPick command
  const quickPickDisposable = vscode.commands.registerCommand(
    'xpathCopier.copyXPathQuickPick',
    async () => {
      await showQuickPick();
    }
  );
  context.subscriptions.push(quickPickDisposable);

  // Reverse (paste & go) command
  const reverseDisposable = vscode.commands.registerCommand(
    'xpathCopier.copyXPathReverse',
    async () => {
      await pasteAndGo();
    }
  );
  context.subscriptions.push(reverseDisposable);
  
  console.log('XPath Copier: Extension activation completed');
}

/**
 * Filter skip rules to only those matching the given file path.
 * Uses minimatch for glob pattern matching.
 */
function matchSkipRules(filePath: string, rules: SkipRule[]): SkipRule[] {
  return rules.filter(rule => {
    try {
      return minimatch(filePath, rule.filePattern);
    } catch (error) {
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
async function copyXPaths(format: XPathFormat): Promise<void> {
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
  const multicursorFormat: string = config.get('multicursorFormat', 'lines');
  const customTemplates: string[] = config.get('customFormatTemplates', []);
  const enableFormats: { [key: string]: boolean } = config.get('enableFormats', {} as any);

  // Read element skipping configuration
  const enableSkipping: boolean = config.get('enableElementSkipping', false);
  const allSkipRules: SkipRule[] = config.get('skipRules', []);

  // Match skip rules against current document path
  const applicableSkipRules = enableSkipping
    ? matchSkipRules(document.uri.fsPath, allSkipRules)
    : [];

  // If the requested format is disabled skip the operation
  if (format !== XPathFormat.Custom && enableFormats && enableFormats[format] === false) {
    vscode.window.showWarningMessage(`The ${format} format is disabled in settings.`);
    return;
  }
  console.log(`XPath Copier: Document language: ${document.languageId}, selections: ${selections.length}`);
  console.log(`XPath Copier: Element skipping enabled: ${enableSkipping}, applicable rules: ${applicableSkipRules.length}`);

  const results: string[] = [];
  for (const sel of selections) {
    const pos = sel.active;
    console.log(`XPath Copier: Computing XPath for position: line ${pos.line}, char ${pos.character}`);
    const xpath = await computeXPathForPosition(document, pos, format, {
      customTemplates,
      skipRules: applicableSkipRules,
      enableSkipping
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
  let output: string;
  if (results.length === 1) {
    output = results[0];
  } else {
    if (multicursorFormat === 'json') {
      output = JSON.stringify(results, null, 2);
    } else {
      output = results.join('\n');
    }
  }
  await vscode.env.clipboard.writeText(output);
  console.log(`XPath Copier: Successfully copied to clipboard: ${output}`);
  vscode.window.setStatusBarMessage(`✓ Copied XPath${results.length > 1 ? 's' : ''} to clipboard`, 3000);
}

/**
 * Present a QuickPick listing all enabled formats and any custom templates.
 * The user's selection will determine which XPath string is generated.
 */
async function showQuickPick(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  const config = vscode.workspace.getConfiguration('xpathCopier');
  const enableFormats: { [key: string]: boolean } = config.get('enableFormats', {} as any);
  const customTemplates: string[] = config.get('customFormatTemplates', []);
  // Build items for built‑in formats
  const items: Array<vscode.QuickPickItem & { format?: XPathFormat; template?: string }> = [];
  const pushIfEnabled = (fmt: XPathFormat, label: string) => {
    if (!enableFormats || enableFormats[fmt] !== false) {
      items.push({ label, format: fmt });
    }
  };
  pushIfEnabled(XPathFormat.Full, 'Full');
  pushIfEnabled(XPathFormat.Compact, 'Compact');
  pushIfEnabled(XPathFormat.NamesOnly, 'Names Only');
  pushIfEnabled(XPathFormat.NamedFull, 'Named Full');
  pushIfEnabled(XPathFormat.NamedCompact, 'Named Compact');
  pushIfEnabled(XPathFormat.Breadcrumb, 'Breadcrumb');
  // Add custom templates as additional items
  if (customTemplates && customTemplates.length > 0) {
    customTemplates.forEach((tmpl, index) => {
      const label = `Custom ${index + 1}`;
      const description = tmpl;
      items.push({ label, description, format: XPathFormat.Custom, template: tmpl });
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
  if (pick.format === XPathFormat.Custom && pick.template) {
    // Temporarily put chosen template at front of array so computeXPath uses it
    const allTemplates: string[] = [pick.template];
    await copyXPathsCustom(allTemplates);
  } else if (pick.format) {
    await copyXPaths(pick.format);
  }
}

/**
 * Copy XPaths using an explicit list of custom templates.  This helper is
 * invoked from the QuickPick when a custom template entry is selected.
 */
async function copyXPathsCustom(customTemplates: string[]): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  const document = editor.document;
  const selections = editor.selections;
  const results: string[] = [];
  for (const sel of selections) {
    const pos = sel.active;
    const xpath = await computeXPathForPosition(document, pos, XPathFormat.Custom, { customTemplates });
    if (xpath) {
      results.push(xpath);
    }
  }
  if (results.length === 0) {
    vscode.window.showWarningMessage('Unable to compute custom XPath for the current selection.');
    return;
  }
  const config = vscode.workspace.getConfiguration('xpathCopier');
  const multicursorFormat: string = config.get('multicursorFormat', 'lines');
  let output: string;
  if (results.length === 1) {
    output = results[0];
  } else {
    output = multicursorFormat === 'json' ? JSON.stringify(results, null, 2) : results.join('\n');
  }
  await vscode.env.clipboard.writeText(output);
  console.log(`XPath Copier: Successfully copied to clipboard: ${output}`);
  vscode.window.setStatusBarMessage(`✓ Copied XPath${results.length > 1 ? 's' : ''} to clipboard`, 3000);
}

/**
 * Reverse lookup: prompt the user for an XPath and, if it matches an
 * element in the current document, jump to that location.  If no
 * matching element is found, display an informational message.
 */
async function pasteAndGo(): Promise<void> {
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
  const parsed = parseXPath(input);
  if (parsed.length === 0) {
    vscode.window.showWarningMessage('Invalid or empty XPath.');
    return;
  }

  const position = findElementByXPath(document, parsed);
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
export function deactivate() {}