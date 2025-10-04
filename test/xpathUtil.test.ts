import { strict as assert } from 'assert';
import { buildXPath, XPathFormat, parseXPath } from '../src/xpathUtil';

describe('XPath Utilities', () => {
  it('builds full, compact, names only, named and breadcrumb paths correctly', () => {
    const segments = [
      { tag: 'Project', index: 1 },
      { tag: 'EntityDefs', index: 1 },
      { tag: 'EntityDef', index: 1, nameAttr: 'Doc' },
      { tag: 'Attributes', index: 1 },
      { tag: 'Attribute', index: 2, nameAttr: 'TurnoverName' }
    ];
    assert.equal(
      buildXPath(segments, XPathFormat.Full),
      '/Project[1]/EntityDefs[1]/EntityDef[1]/Attributes[1]/Attribute[2]'
    );
    assert.equal(
      buildXPath(segments, XPathFormat.Compact),
      '/Project/EntityDefs/EntityDef/Attributes/Attribute[2]'
    );
    assert.equal(
      buildXPath(segments, XPathFormat.NamesOnly),
      '/Project/EntityDefs/EntityDef/Attributes/Attribute'
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