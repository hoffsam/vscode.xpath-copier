# XPath Copier for VS Code

**XPath Copier** makes it simple to generate and copy XPaths for elements in XML‑like documents.  It works with XML, HTML and XHTML files (or any other languages you configure) and offers several formats including full paths with indexes, compact paths without unnecessary indexes, name‑based paths and human‑readable breadcrumbs.  A unified *Quick Pick* makes it easy to choose a format on the fly, and a reverse command lets you paste an XPath and jump directly to the referenced element.

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
| `nameAttribute`                           | The attribute to use for extracting element names (default `name`).       |
| `nameOnly`                                | Show only the attribute value instead of `tag (value)` format (default `false`). |
| `enableElementSkipping`                   | Enable skipping specific elements in XPath output (default `false`).     |
| `skipRules`                               | Array of rules specifying which elements to skip for different file patterns. |

See [`package.json`](package.json) for the full schema.  To add or remove languages just set `xpathCopier.languages` to a list of language IDs; commands and context menus will follow your configuration.

### 🎯 Element Skipping

XPath Copier can skip specific XML elements when generating XPaths, which is sometimes useful for schema files (XSD) where structural elements like `xs:sequence`, `xs:choice`, `xs:any`, and `xs:all` are sometimes not desired in the XPath.

**Example Configuration:**

```json
{
  "xpathCopier.enableElementSkipping": true,
  "xpathCopier.skipRules": [
    {
      "filePattern": "**/*.xsd",
      "elementsToSkip": ["xs:sequence", "xs:choice", "xs:any", "xs:all"]
    },
    {
      "filePattern": "**/schema/**/*.xml",
      "elementsToSkip": ["metadata", "annotation"]
    }
  ]
}
```

**Before** (with `xs:sequence` included):
```
/xs:schema[1]/xs:element[1]/xs:complexType[1]/xs:sequence[1]/xs:element[2]
```

**After** (with `xs:sequence` skipped):
```
/xs:schema[1]/xs:element[1]/xs:complexType[1]/xs:element[2]
```

Each skip rule consists of:
- **`filePattern`**: A glob pattern (e.g., `**/*.xsd`, `**/schema/*.xml`) that matches files where the rule applies
- **`elementsToSkip`**: An array of element names to omit from XPath output (supports namespace prefixes like `xs:sequence`)

### 🏷️ Name Attribute Configuration

By default, XPath Copier looks for the `name` attribute on XML elements to provide more meaningful XPath expressions. You can customize which attribute to use and how it's displayed.

**Configuration Options:**

- **`nameAttribute`** (default: `"name"`): Specifies which attribute to extract from elements. You can change this to any attribute like `id`, `key`, `ref`, etc.
- **`nameOnly`** (default: `false`): When enabled, shows only the attribute value instead of the `tag (value)` format.

**Example Configuration:**

```json
{
  "xpathCopier.nameAttribute": "name",
  "xpathCopier.nameOnly": true
}
```

**Example with `nameOnly: false` (default):**
```
Breadcrumb: xs:schema > xs:element (Person) > xs:complexType > xs:element (FirstName)
Named Full: /xs:schema/xs:element[@name='Person']/xs:complexType/xs:element[@name='FirstName']
```

**Example with `nameOnly: true`:**
```
Breadcrumb: xs:schema > Person > xs:complexType > FirstName
Named Full: /xs:schema/Person/xs:complexType/FirstName
```

This feature is particularly useful when working with schema definitions where element names provide clearer navigation paths than technical tag names. Elements without the configured attribute will still display their tag name normally.

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

* Custom format templates must use the variables `${tag}`, `${index}` and `${name}`.  If a variable is undefined for a given segment it will be replaced with an empty string.

## Contributing

Pull requests and issues are welcome!  Please provide detailed steps to reproduce any problems, along with example input files when applicable.