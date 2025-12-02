import { strict as assert } from 'assert';

/**
 * Test the multiple name attributes feature by simulating the logic
 * that would be used in computeSegmentsFromElements
 */
describe('Multiple Name Attributes', () => {
  // Simulate the attribute lookup logic
  function findNameAttribute(
    attributes: Map<string, string>,
    nameAttributes: string[]
  ): string | undefined {
    for (const attrName of nameAttributes) {
      const value = attributes.get(attrName);
      if (value && value.trim() !== '') {
        return value;
      }
    }
    return undefined;
  }

  it('uses first matching attribute from list', () => {
    const attributes = new Map<string, string>([
      ['id', '123'],
      ['label', 'MyLabel'],
      ['name', 'MyName']
    ]);

    // Should find 'name' when it's first in the list
    assert.equal(
      findNameAttribute(attributes, ['name', 'id', 'label']),
      'MyName'
    );

    // Should find 'id' when it's first in the list
    assert.equal(
      findNameAttribute(attributes, ['id', 'name', 'label']),
      '123'
    );

    // Should find 'label' when it's first in the list
    assert.equal(
      findNameAttribute(attributes, ['label', 'name', 'id']),
      'MyLabel'
    );
  });

  it('returns undefined when no matching attributes exist', () => {
    const attributes = new Map<string, string>([
      ['class', 'myClass'],
      ['type', 'button']
    ]);

    assert.equal(
      findNameAttribute(attributes, ['name', 'id', 'label']),
      undefined
    );
  });

  it('returns first available when some attributes missing', () => {
    const attributes = new Map<string, string>([
      ['label', 'MyLabel'],
      ['class', 'myClass']
    ]);

    // 'name' and 'id' don't exist, should find 'label'
    assert.equal(
      findNameAttribute(attributes, ['name', 'id', 'label']),
      'MyLabel'
    );
  });

  it('handles empty attributes map', () => {
    const attributes = new Map<string, string>();

    assert.equal(
      findNameAttribute(attributes, ['name', 'id', 'label']),
      undefined
    );
  });

  it('handles empty name attributes list', () => {
    const attributes = new Map<string, string>([
      ['name', 'MyName']
    ]);

    assert.equal(
      findNameAttribute(attributes, []),
      undefined
    );
  });

  it('handles single name attribute (backward compatibility)', () => {
    const attributes = new Map<string, string>([
      ['id', '123'],
      ['name', 'MyName']
    ]);

    // Simulates old behavior with just ['name']
    assert.equal(
      findNameAttribute(attributes, ['name']),
      'MyName'
    );
  });

  it('skips empty or whitespace attribute values', () => {
    const attributes = new Map<string, string>([
      ['name', ''],
      ['id', '  '],
      ['label', 'MyLabel']
    ]);

    // Empty string and whitespace should be skipped, should find 'label'
    const result = findNameAttribute(attributes, ['name', 'id', 'label']);
    assert.equal(result, 'MyLabel');
  });
});
