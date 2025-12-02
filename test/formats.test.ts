import { strict as assert } from 'assert';

// Import just the format types and builder - these don't depend on vscode
type XPathFormat = 'full' | 'fullNamed' | 'compact' | 'compactNamed' | 'breadcrumbFull' | 'breadcrumbFullNamed' | 'breadcrumbCompact' | 'breadcrumbCompactNamed' | 'namesOnly' | 'namedFull' | 'namedCompact' | 'breadcrumb' | 'custom';

const XPathFormat = {
  Full: 'full' as XPathFormat,
  FullNamed: 'fullNamed' as XPathFormat,
  Compact: 'compact' as XPathFormat,
  CompactNamed: 'compactNamed' as XPathFormat,
  BreadcrumbFull: 'breadcrumbFull' as XPathFormat,
  BreadcrumbFullNamed: 'breadcrumbFullNamed' as XPathFormat,
  BreadcrumbCompact: 'breadcrumbCompact' as XPathFormat,
  BreadcrumbCompactNamed: 'breadcrumbCompactNamed' as XPathFormat,
  NamesOnly: 'namesOnly' as XPathFormat,
  NamedFull: 'namedFull' as XPathFormat,
  NamedCompact: 'namedCompact' as XPathFormat,
  Breadcrumb: 'breadcrumb' as XPathFormat,
  Custom: 'custom' as XPathFormat
};

interface SegmentInfo {
  tag: string;
  index: number;
  nameAttr?: string;
}

function buildXPath(segments: SegmentInfo[], format: XPathFormat): string {
  function escapeXPathString(str: string): string {
    return str.replace(/'/g, "''");
  }

  switch (format) {
    case XPathFormat.Full:
      return segments.map((seg) => `/${seg.tag}[${seg.index}]`).join('');
    case XPathFormat.FullNamed:
      return segments
        .map((seg) => {
          if (seg.nameAttr) {
            return `/${seg.tag}[@name='${escapeXPathString(seg.nameAttr)}']`;
          }
          return `/${seg.tag}[${seg.index}]`;
        })
        .join('');
    case XPathFormat.Compact:
      return segments
        .map((seg) => `/${seg.tag}${seg.index > 1 ? `[${seg.index}]` : ''}`)
        .join('');
    case XPathFormat.CompactNamed:
      return segments.map((seg) => `/${seg.nameAttr || seg.tag}`).join('');
    case XPathFormat.BreadcrumbFull:
      return segments
        .map((seg) => `${seg.tag}[${seg.index}]`)
        .join(' > ');
    case XPathFormat.BreadcrumbFullNamed:
      return segments
        .map((seg) => {
          const namePart = seg.nameAttr ? ` (${seg.nameAttr})` : '';
          return `${seg.tag}${namePart}`;
        })
        .join(' > ');
    case XPathFormat.BreadcrumbCompact:
      return segments.map((seg) => seg.tag).join(' > ');
    case XPathFormat.BreadcrumbCompactNamed:
      return segments.map((seg) => seg.nameAttr || seg.tag).join(' > ');
    case XPathFormat.NamesOnly:
      return segments.map((seg) => `/${seg.nameAttr || seg.tag}`).join('');
    case XPathFormat.NamedFull:
      // Legacy: behaves like FullNamed
      return segments
        .map((seg) => {
          if (seg.nameAttr) {
            return `/${seg.nameAttr}`;
          }
          return seg.index > 1 ? `/${seg.tag}[${seg.index}]` : `/${seg.tag}`;
        })
        .join('');
    case XPathFormat.NamedCompact:
      // Legacy: behaves like CompactNamed
      return segments
        .map((seg) => {
          if (seg.nameAttr) {
            return `/${seg.nameAttr}`;
          }
          return seg.index > 1 ? `/${seg.tag}[${seg.index}]` : `/${seg.tag}`;
        })
        .join('');
    case XPathFormat.Breadcrumb:
      // Legacy: behaves like BreadcrumbCompactNamed
      return segments.map((seg) => seg.nameAttr || seg.tag).join(' > ');
    default:
      return segments.map((seg) => `/${seg.tag}`).join('');
  }
}

function parseXPath(xpath: string): { tag: string; index?: number; name?: string }[] {
  const trimmed = xpath.trim();
  const body = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  if (!body) return [];
  return body.split('/')
    .filter((p) => p.length > 0)
    .map((segment) => {
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

describe('XPath Format Generation', () => {
  const segments: SegmentInfo[] = [
    { tag: 'Project', index: 1 },
    { tag: 'EntityDefs', index: 1 },
    { tag: 'EntityDef', index: 1, nameAttr: 'Doc' },
    { tag: 'Attributes', index: 1 },
    { tag: 'Attribute', index: 2, nameAttr: 'TurnoverName' }
  ];

  it('generates Full format correctly', () => {
    const result = buildXPath(segments, XPathFormat.Full);
    assert.equal(result, '/Project[1]/EntityDefs[1]/EntityDef[1]/Attributes[1]/Attribute[2]');
  });

  it('generates Compact format correctly', () => {
    const result = buildXPath(segments, XPathFormat.Compact);
    assert.equal(result, '/Project/EntityDefs/EntityDef/Attributes/Attribute[2]');
  });

  it('generates NamesOnly format correctly', () => {
    const result = buildXPath(segments, XPathFormat.NamesOnly);
    assert.equal(result, '/Project/EntityDefs/Doc/Attributes/TurnoverName');
  });

  it('generates legacy NamedFull format (now behaves like FullNamed)', () => {
    const result = buildXPath(segments, XPathFormat.NamedFull);
    assert.equal(result, '/Project/EntityDefs/Doc/Attributes/TurnoverName');
  });

  it('generates legacy NamedCompact format (now behaves like CompactNamed)', () => {
    const result = buildXPath(segments, XPathFormat.NamedCompact);
    assert.equal(result, '/Project/EntityDefs/Doc/Attributes/TurnoverName');
  });

  it('generates legacy Breadcrumb format (now behaves like BreadcrumbCompactNamed)', () => {
    const result = buildXPath(segments, XPathFormat.Breadcrumb);
    assert.equal(result, 'Project > EntityDefs > Doc > Attributes > TurnoverName');
  });

  it('parses XPath with indexes correctly', () => {
    const parsed = parseXPath('/Project/EntityDefs/EntityDef[2]/Attributes/Attribute[3]');
    assert.deepStrictEqual(parsed, [
      { tag: 'Project' },
      { tag: 'EntityDefs' },
      { tag: 'EntityDef', index: 2 },
      { tag: 'Attributes' },
      { tag: 'Attribute', index: 3 }
    ]);
  });

  it('parses XPath with name attributes correctly', () => {
    const parsed = parseXPath("/Project/EntityDefs/EntityDef[@name='Doc']/Attributes/Attribute[@name='Foo']");
    assert.deepStrictEqual(parsed, [
      { tag: 'Project' },
      { tag: 'EntityDefs' },
      { tag: 'EntityDef', name: 'Doc' },
      { tag: 'Attributes' },
      { tag: 'Attribute', name: 'Foo' }
    ]);
  });

  it('handles deeply nested paths', () => {
    const deepSegments: SegmentInfo[] = [
      { tag: 'L1', index: 1 },
      { tag: 'L2', index: 1 },
      { tag: 'L3', index: 1 },
      { tag: 'L4', index: 1 },
      { tag: 'L5', index: 1 },
      { tag: 'L6', index: 1 },
      { tag: 'L7', index: 1 },
      { tag: 'L8', index: 1 },
      { tag: 'L9', index: 1 },
      { tag: 'L10', index: 1 }
    ];

    const result = buildXPath(deepSegments, XPathFormat.Full);
    assert.equal(result, '/L1[1]/L2[1]/L3[1]/L4[1]/L5[1]/L6[1]/L7[1]/L8[1]/L9[1]/L10[1]');
  });

  it('handles multiple siblings correctly', () => {
    const siblingSegments: SegmentInfo[] = [
      { tag: 'root', index: 1 },
      { tag: 'item', index: 3 }
    ];

    const full = buildXPath(siblingSegments, XPathFormat.Full);
    assert.equal(full, '/root[1]/item[3]');

    const compact = buildXPath(siblingSegments, XPathFormat.Compact);
    assert.equal(compact, '/root/item[3]');
  });
});

describe('XPath Name Only Feature', () => {
  const segments: SegmentInfo[] = [
    { tag: 'Project', index: 1 },
    { tag: 'EntityDefs', index: 1 },
    { tag: 'EntityDef', index: 1, nameAttr: 'Doc' },
    { tag: 'Attributes', index: 1 },
    { tag: 'Attribute', index: 2, nameAttr: 'TurnoverName' }
  ];

  it('generates legacy NamedFull format (now always shows name values)', () => {
    const result = buildXPath(segments, XPathFormat.NamedFull);
    assert.equal(result, '/Project/EntityDefs/Doc/Attributes/TurnoverName');
  });

  it('generates legacy NamedCompact format (now always shows name values)', () => {
    const result = buildXPath(segments, XPathFormat.NamedCompact);
    assert.equal(result, '/Project/EntityDefs/Doc/Attributes/TurnoverName');
  });

  it('generates legacy Breadcrumb format (now always shows name values)', () => {
    const result = buildXPath(segments, XPathFormat.Breadcrumb);
    assert.equal(result, 'Project > EntityDefs > Doc > Attributes > TurnoverName');
  });

  it('legacy Breadcrumb handles mixed elements with and without names', () => {
    const mixedSegments: SegmentInfo[] = [
      { tag: 'xs:schema', index: 1 },
      { tag: 'xs:element', index: 1, nameAttr: 'Person' },
      { tag: 'xs:complexType', index: 1 },
      { tag: 'xs:element', index: 2, nameAttr: 'FirstName' }
    ];

    const result = buildXPath(mixedSegments, XPathFormat.Breadcrumb);
    assert.equal(result, 'xs:schema > Person > xs:complexType > FirstName');
  });

  it('legacy Breadcrumb handles elements without name attributes', () => {
    const noNameSegments: SegmentInfo[] = [
      { tag: 'root', index: 1 },
      { tag: 'item', index: 3 }
    ];

    const result = buildXPath(noNameSegments, XPathFormat.Breadcrumb);
    assert.equal(result, 'root > item');
  });

  it('Full format is not affected by legacy formats', () => {
    const result = buildXPath(segments, XPathFormat.Full);
    assert.equal(result, '/Project[1]/EntityDefs[1]/EntityDef[1]/Attributes[1]/Attribute[2]');
  });

  it('Compact format is not affected by legacy formats', () => {
    const result = buildXPath(segments, XPathFormat.Compact);
    assert.equal(result, '/Project/EntityDefs/EntityDef/Attributes/Attribute[2]');
  });

  it('NamesOnly format behaves consistently', () => {
    const result = buildXPath(segments, XPathFormat.NamesOnly);
    assert.equal(result, '/Project/EntityDefs/Doc/Attributes/TurnoverName');
  });
});

describe('New XPath Formats', () => {
  const segments: SegmentInfo[] = [
    { tag: 'App', index: 1, nameAttr: 'kahua_aec_rfi_extension' },
    { tag: 'WorkflowDefs', index: 1 },
    { tag: 'WorkflowDef', index: 1, nameAttr: 'BasicWorkflow' },
    { tag: 'Resources', index: 1 },
    { tag: 'App.Reports', index: 1 },
    { tag: 'LegacyReport', index: 1, nameAttr: 'RFITaskViewReport' },
    { tag: 'LegacyReport.ReportXml', index: 1, nameAttr: 'RFITaskViewReport' },
    { tag: 'Designer', index: 1 }
  ];

  it('generates Full format correctly', () => {
    const result = buildXPath(segments, XPathFormat.Full);
    assert.equal(result, '/App[1]/WorkflowDefs[1]/WorkflowDef[1]/Resources[1]/App.Reports[1]/LegacyReport[1]/LegacyReport.ReportXml[1]/Designer[1]');
  });

  it('generates FullNamed format correctly', () => {
    const result = buildXPath(segments, XPathFormat.FullNamed);
    assert.equal(result, "/App[@name='kahua_aec_rfi_extension']/WorkflowDefs[1]/WorkflowDef[@name='BasicWorkflow']/Resources[1]/App.Reports[1]/LegacyReport[@name='RFITaskViewReport']/LegacyReport.ReportXml[@name='RFITaskViewReport']/Designer[1]");
  });

  it('generates Compact format correctly', () => {
    const result = buildXPath(segments, XPathFormat.Compact);
    assert.equal(result, '/App/WorkflowDefs/WorkflowDef/Resources/App.Reports/LegacyReport/LegacyReport.ReportXml/Designer');
  });

  it('generates CompactNamed format correctly', () => {
    const result = buildXPath(segments, XPathFormat.CompactNamed);
    assert.equal(result, '/kahua_aec_rfi_extension/WorkflowDefs/BasicWorkflow/Resources/App.Reports/RFITaskViewReport/RFITaskViewReport/Designer');
  });

  it('generates BreadcrumbFull format correctly', () => {
    const result = buildXPath(segments, XPathFormat.BreadcrumbFull);
    assert.equal(result, 'App[1] > WorkflowDefs[1] > WorkflowDef[1] > Resources[1] > App.Reports[1] > LegacyReport[1] > LegacyReport.ReportXml[1] > Designer[1]');
  });

  it('generates BreadcrumbFullNamed format correctly', () => {
    const result = buildXPath(segments, XPathFormat.BreadcrumbFullNamed);
    assert.equal(result, 'App (kahua_aec_rfi_extension) > WorkflowDefs > WorkflowDef (BasicWorkflow) > Resources > App.Reports > LegacyReport (RFITaskViewReport) > LegacyReport.ReportXml (RFITaskViewReport) > Designer');
  });

  it('generates BreadcrumbCompact format correctly', () => {
    const result = buildXPath(segments, XPathFormat.BreadcrumbCompact);
    assert.equal(result, 'App > WorkflowDefs > WorkflowDef > Resources > App.Reports > LegacyReport > LegacyReport.ReportXml > Designer');
  });

  it('generates BreadcrumbCompactNamed format correctly', () => {
    const result = buildXPath(segments, XPathFormat.BreadcrumbCompactNamed);
    assert.equal(result, 'kahua_aec_rfi_extension > WorkflowDefs > BasicWorkflow > Resources > App.Reports > RFITaskViewReport > RFITaskViewReport > Designer');
  });
});
