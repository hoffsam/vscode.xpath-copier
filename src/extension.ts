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
  // console.log('XPath Copier: Extension activating');
  // Extension now activates and registers commands.
  // Runtime checks for document symbols will be done when commands are executed.

  /**
   * Update context for skip rules availability based on current document
   */
  function updateSkipRulesContext() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.commands.executeCommand('setContext', 'xpathCopier.hasApplicableSkipRules', false);
      return;
    }

    const document = editor.document;
    const config = vscode.workspace.getConfiguration('xpathCopier');
    const enableSkipping: boolean = config.get('enableElementSkipping', false);
    const allSkipRules: SkipRule[] = config.get('skipRules', []);

    if (!enableSkipping || allSkipRules.length === 0) {
      vscode.commands.executeCommand('setContext', 'xpathCopier.hasApplicableSkipRules', false);
      return;
    }

    const applicableSkipRules = matchSkipRules(document.uri.fsPath, allSkipRules);
    const hasRules = applicableSkipRules.length > 0;
    vscode.commands.executeCommand('setContext', 'xpathCopier.hasApplicableSkipRules', hasRules);
  }

  // Update context on activation
  updateSkipRulesContext();

  // Update context when active editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      updateSkipRulesContext();
    })
  );

  // Update context when configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('xpathCopier.enableElementSkipping') || 
          e.affectsConfiguration('xpathCopier.skipRules')) {
        updateSkipRulesContext();
      }
    })
  );

  /**
   * Helper to register a copy command bound to a specific format and options.
   */
  function registerCopyCommand(cmd: string, fmt: XPathFormat, enableSkip: boolean = false) {
    // console.log(`XPath Copier: Registering command ${cmd}`);
    const disposable = vscode.commands.registerCommand(cmd, async () => {
      // console.log(`XPath Copier: Command ${cmd} executed`);
      await copyXPaths(fmt, enableSkip);
    });
    context.subscriptions.push(disposable);
  }

  // Register copy commands for all format combinations
  // Non-skipping variants
  registerCopyCommand('xpathCopier.copyXPathBreadcrumbFull', XPathFormat.BreadcrumbFull, false);
  registerCopyCommand('xpathCopier.copyXPathBreadcrumbFullNamesOnly', XPathFormat.BreadcrumbFullNamed, false);
  registerCopyCommand('xpathCopier.copyXPathBreadcrumbCompact', XPathFormat.BreadcrumbCompact, false);
  registerCopyCommand('xpathCopier.copyXPathBreadcrumbCompactNamesOnly', XPathFormat.BreadcrumbCompactNamed, false);
  registerCopyCommand('xpathCopier.copyXPathFull', XPathFormat.Full, false);
  registerCopyCommand('xpathCopier.copyXPathFullNamesOnly', XPathFormat.FullNamed, false); 
  registerCopyCommand('xpathCopier.copyXPathCompact', XPathFormat.Compact, false);
  registerCopyCommand('xpathCopier.copyXPathCompactNamesOnly', XPathFormat.CompactNamed, false);
  
  // Skipping variants
  registerCopyCommand('xpathCopier.copyXPathBreadcrumbFullSkip', XPathFormat.BreadcrumbFull, true);
  registerCopyCommand('xpathCopier.copyXPathBreadcrumbFullNamesOnlySkip', XPathFormat.BreadcrumbFullNamed, true);
  registerCopyCommand('xpathCopier.copyXPathBreadcrumbCompactSkip', XPathFormat.BreadcrumbCompact, true);
  registerCopyCommand('xpathCopier.copyXPathBreadcrumbCompactNamesOnlySkip', XPathFormat.BreadcrumbCompactNamed, true);
  registerCopyCommand('xpathCopier.copyXPathFullSkip', XPathFormat.Full, true);
  registerCopyCommand('xpathCopier.copyXPathFullNamesOnlySkip', XPathFormat.FullNamed, true);
  registerCopyCommand('xpathCopier.copyXPathCompactSkip', XPathFormat.Compact, true);
  registerCopyCommand('xpathCopier.copyXPathCompactNamesOnlySkip', XPathFormat.CompactNamed, true);

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
  
  // console.log('XPath Copier: Extension activation completed');
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
 * Handle XPath output based on user configuration settings.
 * Can copy to clipboard, show in quick pick, and/or open in new editor.
 */
async function handleXPathOutput(output: string, resultCount: number): Promise<void> {
  const config = vscode.workspace.getConfiguration('xpathCopier');
  const copyToClipboard: boolean = config.get('copyToClipboard', true);
  const showInQuickPick: boolean = config.get('showInQuickPick', false);
  const openInNewEditor: boolean = config.get('openInNewEditor', false);

  const actions: Promise<void>[] = [];

  if (copyToClipboard) {
    actions.push(Promise.resolve(vscode.env.clipboard.writeText(output)));
  }

  if (showInQuickPick) {
    const pickAction = Promise.resolve(vscode.window.showQuickPick([output], {
      placeHolder: 'XPath copied - click to copy again',
      canPickMany: false
    })).then(selected => {
      if (selected) {
        return vscode.env.clipboard.writeText(selected);
      }
    });
    actions.push(pickAction);
  }

  if (openInNewEditor) {
    const editorAction = Promise.resolve(vscode.workspace.openTextDocument({
      content: output,
      language: 'xpath'
    })).then(doc => {
      return vscode.window.showTextDocument(doc);
    }).then(() => {});
    actions.push(editorAction);
  }

  await Promise.all(actions);

  // Show status message
  const messages: string[] = [];
  if (copyToClipboard) {
    messages.push('copied to clipboard');
  }
  if (openInNewEditor) {
    messages.push('opened in editor');
  }

  if (messages.length > 0) {
    const message = `✓ XPath${resultCount > 1 ? 's' : ''} ${messages.join(' and ')}`;
    vscode.window.setStatusBarMessage(message, 3000);
  }
}

/**
 * Copy XPaths for the current selections using the given format.  Handles
 * multi‑cursor selection, clipboard writing and optionally shows a peek
 * window to provide context.
 */
async function copyXPaths(format: XPathFormat, forceSkipping: boolean = false): Promise<void> {
  // console.log(`XPath Copier: copyXPaths called with format: ${format}`);
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    // console.log('XPath Copier: No active editor');
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
  const enableSkipping: boolean = forceSkipping || config.get('enableElementSkipping', false);
  const allSkipRules: SkipRule[] = config.get('skipRules', []);

  // Read name attribute configuration
  const nameAttributes: string[] = config.get('nameAttributes', ['name']);

  // Match skip rules against current document path
  const applicableSkipRules = enableSkipping
    ? matchSkipRules(document.uri.fsPath, allSkipRules)
    : [];

  // If the requested format is disabled skip the operation
  if (format !== XPathFormat.Custom && enableFormats && enableFormats[format] === false) {
    vscode.window.showWarningMessage(`The ${format} format is disabled in settings.`);
    return;
  }
  // console.log(`XPath Copier: Document language: ${document.languageId}, selections: ${selections.length}`);
  // console.log(`XPath Copier: Element skipping enabled: ${enableSkipping}, applicable rules: ${applicableSkipRules.length}`);

  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Window,
    title: 'Copying XPath...',
    cancellable: false
  }, async () => {
    const results: string[] = [];
    for (const sel of selections) {
      const pos = sel.active;
      // console.log(`XPath Copier: Computing XPath for position: line ${pos.line}, char ${pos.character}`);
      const xpath = await computeXPathForPosition(document, pos, format, {
        customTemplates,
        skipRules: applicableSkipRules,
        enableSkipping,
        nameAttributes
      });
      // console.log(`XPath Copier: Computed XPath: ${xpath}`);
      if (xpath) {
        results.push(xpath);
      }
    }
    // console.log(`XPath Copier: Results: ${results.length} XPaths computed`);
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
    // console.log(`XPath Copier: Generated output: ${output}`);
    await handleXPathOutput(output, results.length);
  });
}

/**
 * Present a QuickPick listing all enabled formats organized into sections.
 * Shows normal commands and optionally "with skipping" commands if applicable.
 */
async function showQuickPick(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  const document = editor.document;
  const config = vscode.workspace.getConfiguration('xpathCopier');
  const enableSkipping: boolean = config.get('enableElementSkipping', false);
  const allSkipRules: SkipRule[] = config.get('skipRules', []);
  
  // Check if current document matches any skip rules
  const applicableSkipRules = enableSkipping 
    ? matchSkipRules(document.uri.fsPath, allSkipRules)
    : [];
  const showSkipCommands = applicableSkipRules.length > 0;

  interface PickItem extends vscode.QuickPickItem {
    format?: XPathFormat;
    skipEnabled?: boolean;
  }

  const items: PickItem[] = [];

  // Non-skipping commands
  items.push({ label: 'Breadcrumb - Full', format: XPathFormat.BreadcrumbFull, skipEnabled: false });
  items.push({ label: 'Breadcrumb - Full - Names Only', format: XPathFormat.BreadcrumbFullNamed, skipEnabled: false });
  items.push({ label: 'Breadcrumb - Compact', format: XPathFormat.BreadcrumbCompact, skipEnabled: false });
  items.push({ label: 'Breadcrumb - Compact - Names Only', format: XPathFormat.BreadcrumbCompactNamed, skipEnabled: false });
  items.push({ label: 'Full', format: XPathFormat.Full, skipEnabled: false });
  items.push({ label: 'Full - Names Only', format: XPathFormat.FullNamed, skipEnabled: false });
  items.push({ label: 'Compact', format: XPathFormat.Compact, skipEnabled: false });
  items.push({ label: 'Compact - Names Only', format: XPathFormat.CompactNamed, skipEnabled: false });

  // Add skipping commands if applicable
  if (showSkipCommands) {
    items.push({ label: '', kind: vscode.QuickPickItemKind.Separator });
    items.push({ label: 'w/ skipping: Breadcrumb - Full', format: XPathFormat.BreadcrumbFull, skipEnabled: true });
    items.push({ label: 'w/ skipping: Breadcrumb - Full - Names Only', format: XPathFormat.BreadcrumbFullNamed, skipEnabled: true });
    items.push({ label: 'w/ skipping: Breadcrumb - Compact', format: XPathFormat.BreadcrumbCompact, skipEnabled: true });
    items.push({ label: 'w/ skipping: Breadcrumb - Compact - Names Only', format: XPathFormat.BreadcrumbCompactNamed, skipEnabled: true });
    items.push({ label: 'w/ skipping: Full', format: XPathFormat.Full, skipEnabled: true });
    items.push({ label: 'w/ skipping: Full - Names Only', format: XPathFormat.FullNamed, skipEnabled: true });
    items.push({ label: 'w/ skipping: Compact', format: XPathFormat.Compact, skipEnabled: true });
    items.push({ label: 'w/ skipping: Compact - Names Only', format: XPathFormat.CompactNamed, skipEnabled: true });
  }

  const pick = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select XPath format',
    canPickMany: false
  });

  if (!pick || pick.kind === vscode.QuickPickItemKind.Separator) {
    return;
  }

  if (pick.format) {
    await copyXPaths(pick.format, pick.skipEnabled || false);
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
  const config = vscode.workspace.getConfiguration('xpathCopier');
  const nameAttributes: string[] = config.get('nameAttributes', ['name']);
  const multicursorFormat: string = config.get('multicursorFormat', 'lines');

  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Window,
    title: 'Copying XPath...',
    cancellable: false
  }, async () => {
    const results: string[] = [];
    for (const sel of selections) {
      const pos = sel.active;
      const xpath = await computeXPathForPosition(document, pos, XPathFormat.Custom, {
        customTemplates,
        nameAttributes
      });
      if (xpath) {
        results.push(xpath);
      }
    }
    if (results.length === 0) {
      vscode.window.showWarningMessage('Unable to compute custom XPath for the current selection.');
      return;
    }
    let output: string;
    if (results.length === 1) {
      output = results[0];
    } else {
      output = multicursorFormat === 'json' ? JSON.stringify(results, null, 2) : results.join('\n');
    }
    // console.log(`XPath Copier: Generated output: ${output}`);
    await handleXPathOutput(output, results.length);
  });
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