import { strict as assert } from 'assert';
import { buildXPath, XPathFormat, parseXPath } from '../src/xpathUtil';

describe('XPath Utilities', () => {
  it('builds new format paths correctly', () => {
    const segments = [
      { tag: 'Project', index: 1 },
      { tag: 'EntityDefs', index: 1 },
      { tag: 'EntityDef', index: 1, nameAttr: 'Doc' },
      { tag: 'Attributes', index: 1 },
      { tag: 'Attribute', index: 2, nameAttr: 'TurnoverName' }
    ];
    
    // Full format: all indexes
    assert.equal(
      buildXPath(segments, XPathFormat.Full),
      '/Project[1]/EntityDefs[1]/EntityDef[1]/Attributes[1]/Attribute[2]'
    );
    
    // FullNamed: indexes with [@name='value'] where available
    assert.equal(
      buildXPath(segments, XPathFormat.FullNamed),
      "/Project[1]/EntityDefs[1]/EntityDef[@name='Doc']/Attributes[1]/Attribute[@name='TurnoverName']"
    );
    
    // Compact: omit [1] indexes
    assert.equal(
      buildXPath(segments, XPathFormat.Compact),
      '/Project/EntityDefs/EntityDef/Attributes/Attribute[2]'
    );
    
    // CompactNamed: use name values as element names
    assert.equal(
      buildXPath(segments, XPathFormat.CompactNamed),
      '/Project/EntityDefs/Doc/Attributes/TurnoverName'
    );
    
    // BreadcrumbFull: tags with indexes
    assert.equal(
      buildXPath(segments, XPathFormat.BreadcrumbFull),
      'Project[1] > EntityDefs[1] > EntityDef[1] > Attributes[1] > Attribute[2]'
    );
    
    // BreadcrumbFullNamed: tags with names in parentheses
    assert.equal(
      buildXPath(segments, XPathFormat.BreadcrumbFullNamed),
      'Project > EntityDefs > EntityDef (Doc) > Attributes > Attribute (TurnoverName)'
    );
    
    // BreadcrumbCompact: only tags
    assert.equal(
      buildXPath(segments, XPathFormat.BreadcrumbCompact),
      'Project > EntityDefs > EntityDef > Attributes > Attribute'
    );
    
    // BreadcrumbCompactNamed: only name values
    assert.equal(
      buildXPath(segments, XPathFormat.BreadcrumbCompactNamed),
      'Project > EntityDefs > Doc > Attributes > TurnoverName'
    );
  });
  
  it('builds legacy format paths correctly', () => {
    const segments = [
      { tag: 'Project', index: 1 },
      { tag: 'EntityDefs', index: 1 },
      { tag: 'EntityDef', index: 1, nameAttr: 'Doc' },
      { tag: 'Attributes', index: 1 },
      { tag: 'Attribute', index: 2, nameAttr: 'TurnoverName' }
    ];
    
    assert.equal(
      buildXPath(segments, XPathFormat.NamesOnly),
      '/Project/EntityDefs/Doc/Attributes/TurnoverName'
    );
    assert.equal(
      buildXPath(segments, XPathFormat.NamedFull),
      "/Project/EntityDefs/EntityDef[@name='Doc']/Attributes/Attribute[@name='TurnoverName']"
    );
    assert.equal(
      buildXPath(segments, XPathFormat.NamedCompact),
      "/Project/EntityDefs/EntityDef[@name='Doc']/Attributes/Attribute[@name='TurnoverName']"
    );
    assert.equal(
      buildXPath(segments, XPathFormat.Breadcrumb),
      'Project > EntityDefs > EntityDef (Doc) > Attributes > Attribute (TurnoverName)'
    );
  });

  it('parses XPath strings into tag/index/name descriptors', () => {
    const parsed = parseXPath(
      "/Project/EntityDefs/EntityDef[2]/Attributes/Attribute[@name='Foo']"
    );
    assert.deepStrictEqual(parsed, [
      { tag: 'Project' },
      { tag: 'EntityDefs' },
      { tag: 'EntityDef', index: 2 },
      { tag: 'Attributes' },
      { tag: 'Attribute', name: 'Foo' }
    ]);
  });
});