# XPath Copier for VS Code

**XPath Copier** is a Visual Studio Code extension that makes it simple to generate and copy XPaths for elements in XML‑like documents.  It works with XML, HTML and XHTML files (or any other languages you configure) and offers several formats including full paths with indexes, compact paths without unnecessary indexes, name‑based paths and human‑readable breadcrumbs.  A unified *Quick Pick* makes it easy to choose a format on the fly, and a reverse command lets you paste an XPath and jump directly to the referenced element.

## Features

### 🧩 Copy XPaths in Multiple Formats

Six built‑in formats are supported:

| Format          | Example                                                                                                      |
|-----------------|---------------------------------------------------------------------------------------------------------------|
| **Full**        | `/Project/EntityDefs/EntityDef[1]/Attributes/Attribute[2]`                                                    |
| **Compact**     | `/Project/EntityDefs/EntityDef/Attributes/Attribute[2]`                                                      |
| **Names Only**  | `/Project/EntityDefs/EntityDef/Attributes/Attribute`                                                         |
| **Named Full**  | `/Project/EntityDefs/EntityDef[@name='Doc']/Attributes/Attribute[@name='TurnoverName']`                      |
| **Named Compact** | `/Project/EntityDefs/EntityDef[@name='Doc']/Attributes/Attribute[@name='TurnoverName']`                   |
| **Breadcrumb**  | `Project > EntityDefs > EntityDef (Doc) > Attributes > Attribute (TurnoverName)`                             |

You can trigger any of these commands directly from the Command Palette, a context menu in the editor or via optional keybindings.  A single *“XPath: Copy…”* command displays a Quick Pick where you can choose the desired format.

### 📄 Paste & Go

The **“XPath: Go To…”** command lets you paste an XPath string (such as one that was generated previously) and the extension will move the cursor to the matching element.  If no element matches the path, you will be notified.

### 🔍 Multi‑Cursor Friendly

When you have multiple selections or cursors active, XPath Copier will generate a list of XPaths.  You can choose whether multiple results are joined with newlines or encoded as a JSON array via the `xpathCopier.multicursorFormat` setting.

### 🧠 Uses the  LemMinX XML Language Server via Red Hat's XML Extension for Accurate Paths

XPath Copier relies on VS Code’s document symbol provider (powered by the [Red Hat XML Language Server](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-xml)) to understand the structure of your document.  Make sure you have an XML language server installed and running—such as [redhat.vscode‑xml](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-xml) or another extension that provides XML support.  If no language server is available the extension will warn you on activation and immediately disable itself.

### ⚙️ Configuration

Settings can be adjusted in your user or workspace settings under the `xpathCopier` namespace:

| Setting                                   | Description                                                                |
|-------------------------------------------|----------------------------------------------------------------------------|
| `enableContextMenu`                       | Show commands in the editor context menu (default `true`).                |
| `languages`                               | An array of language IDs that activate the extension (`xml`, `html`, `xhtml` by default). |
| `enableQuickPick`                         | Enables the unified Quick Pick for choosing a format (default `true`).    |
| `enableFormats.full|compact|…`            | Toggle individual formats on or off.                                      |
| `multicursorFormat`                       | How to present multiple XPaths (`lines` or `json`).                       |
| `customFormatTemplates`                   | Array of template strings for creating your own XPath formats.            |

See [`package.json`](package.json) for the full schema.  To add or remove languages just set `xpathCopier.languages` to a list of language IDs; commands and context menus will follow your configuration.

### 🧪 Testing

Unit tests live in the `test` directory and use [Mocha](https://mochajs.org/).  They verify the XPath generation logic, including indexing and name handling.  You can run the tests with:

```bash
npm test
```

### 🔨 Building & Packaging

The source code lives under `src/` and compiles to `dist/` via TypeScript.  To compile and package the extension into a `.vsix` file run:

```bash
npm install
npm run build
```

This uses the [`vsce`](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#vsce) tool internally to create a ready‑to‑install package.

### 📦 Icon & Licence

The file `icon.png` contains a free‑to‑use icon included with this repository.  The extension is published under the [MIT Licence](LICENSE).

## Known Limitations

* XPath Copier depends on a language server to provide document symbols.  Without one, it cannot compute meaningful XPaths.
* Only elements represented by `DocumentSymbol` entries are considered.  Attributes and text nodes are not supported.
* Custom format templates must use the variables `${tag}`, `${index}` and `${name}`.  If a variable is undefined for a given segment it will be replaced with an empty string.

## Contributing

Pull requests and issues are welcome!  Please provide detailed steps to reproduce any problems, along with example input files when applicable.