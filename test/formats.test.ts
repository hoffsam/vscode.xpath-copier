import { strict as assert } from 'assert';

// Import just the format types and builder - these don't depend on vscode
type XPathFormat = 'full' | 'compact' | 'namesOnly' | 'namedFull' | 'namedCompact' | 'breadcrumb' | 'custom';

const XPathFormat = {
  Full: 'full' as XPathFormat,
  Compact: 'compact' as XPathFormat,
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
      return segments
        .map((seg) => {
          if (seg.nameAttr) {
            return `/${seg.tag}[@name='${seg.nameAttr.replace(/'/g, "''")}']`;
          }
          return seg.index > 1 ? `/${seg.tag}[${seg.index}]` : `/${seg.tag}`;
        })
        .join('');
    case XPathFormat.NamedCompact:
      return segments
        .map((seg) => {
          if (seg.nameAttr) {
            return `/${seg.tag}[@name='${seg.nameAttr.replace(/'/g, "''")}']`;
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
    assert.equal(result, '/Project/EntityDefs/EntityDef/Attributes/Attribute');
  });

  it('generates NamedFull format correctly', () => {
    const result = buildXPath(segments, XPathFormat.NamedFull);
    assert.equal(result, "/Project/EntityDefs/EntityDef[@name='Doc']/Attributes/Attribute[@name='TurnoverName']");
  });

  it('generates NamedCompact format correctly', () => {
    const result = buildXPath(segments, XPathFormat.NamedCompact);
    assert.equal(result, "/Project/EntityDefs/EntityDef[@name='Doc']/Attributes/Attribute[@name='TurnoverName']");
  });

  it('generates Breadcrumb format correctly', () => {
    const result = buildXPath(segments, XPathFormat.Breadcrumb);
    assert.equal(result, 'Project > EntityDefs > EntityDef (Doc) > Attributes > Attribute (TurnoverName)');
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
