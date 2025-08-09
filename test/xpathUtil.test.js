"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = require("assert");
const xpathUtil_1 = require("../src/xpathUtil");
describe('XPath Utilities', () => {
    it('builds full, compact, names only, named and breadcrumb paths correctly', () => {
        const segments = [
            { tag: 'Project', index: 1 },
            { tag: 'EntityDefs', index: 1 },
            { tag: 'EntityDef', index: 1, nameAttr: 'Doc' },
            { tag: 'Attributes', index: 1 },
            { tag: 'Attribute', index: 2, nameAttr: 'TurnoverName' }
        ];
        assert_1.strict.equal((0, xpathUtil_1.buildXPath)(segments, xpathUtil_1.XPathFormat.Full), '/Project[1]/EntityDefs[1]/EntityDef[1]/Attributes[1]/Attribute[2]');
        assert_1.strict.equal((0, xpathUtil_1.buildXPath)(segments, xpathUtil_1.XPathFormat.Compact), '/Project/EntityDefs/EntityDef/Attributes/Attribute[2]');
        assert_1.strict.equal((0, xpathUtil_1.buildXPath)(segments, xpathUtil_1.XPathFormat.NamesOnly), '/Project/EntityDefs/EntityDef/Attributes/Attribute');
        assert_1.strict.equal((0, xpathUtil_1.buildXPath)(segments, xpathUtil_1.XPathFormat.NamedFull), "/Project/EntityDefs/EntityDef[@name='Doc']/Attributes/Attribute[@name='TurnoverName']");
        assert_1.strict.equal((0, xpathUtil_1.buildXPath)(segments, xpathUtil_1.XPathFormat.NamedCompact), "/Project/EntityDefs/EntityDef[@name='Doc']/Attributes/Attribute[@name='TurnoverName']");
        assert_1.strict.equal((0, xpathUtil_1.buildXPath)(segments, xpathUtil_1.XPathFormat.Breadcrumb), 'Project > EntityDefs > EntityDef (Doc) > Attributes > Attribute (TurnoverName)');
    });
    it('parses XPath strings into tag/index/name descriptors', () => {
        const parsed = (0, xpathUtil_1.parseXPath)("/Project/EntityDefs/EntityDef[2]/Attributes/Attribute[@name='Foo']");
        assert_1.strict.deepStrictEqual(parsed, [
            { tag: 'Project' },
            { tag: 'EntityDefs' },
            { tag: 'EntityDef', index: 2 },
            { tag: 'Attributes' },
            { tag: 'Attribute', name: 'Foo' }
        ]);
    });
});
//# sourceMappingURL=xpathUtil.test.js.map