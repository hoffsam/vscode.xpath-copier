import { strict as assert } from 'assert';

// Define SkipRule locally to avoid importing vscode-dependent modules
interface SkipRule {
  filePattern: string;
  elementsToSkip: string[];
}

interface ComputeOptions {
  skipRules?: SkipRule[];
  enableSkipping?: boolean;
}

// Copy of getSkipElements function for testing without vscode dependency
function getSkipElements(options?: ComputeOptions): Set<string> {
  if (!options?.enableSkipping || !options?.skipRules || options.skipRules.length === 0) {
    return new Set();
  }

  const skipSet = new Set<string>();
  options.skipRules.forEach(rule => {
    rule.elementsToSkip.forEach(elem => skipSet.add(elem));
  });
  return skipSet;
}

describe('Element Skipping', () => {
  describe('getSkipElements', () => {
    it('returns empty set when skipping is disabled', () => {
      const options = {
        enableSkipping: false,
        skipRules: [{
          filePattern: '**/*.xsd',
          elementsToSkip: ['xs:sequence', 'xs:choice']
        }]
      };

      const result = getSkipElements(options);
      assert.equal(result.size, 0);
    });

    it('returns empty set when no skip rules provided', () => {
      const options = {
        enableSkipping: true,
        skipRules: []
      };

      const result = getSkipElements(options);
      assert.equal(result.size, 0);
    });

    it('returns elements from skip rules when enabled', () => {
      const options = {
        enableSkipping: true,
        skipRules: [{
          filePattern: '**/*.xsd',
          elementsToSkip: ['xs:sequence', 'xs:choice', 'xs:any']
        }]
      };

      const result = getSkipElements(options);
      assert.equal(result.size, 3);
      assert.ok(result.has('xs:sequence'));
      assert.ok(result.has('xs:choice'));
      assert.ok(result.has('xs:any'));
    });

    it('combines elements from multiple rules', () => {
      const options = {
        enableSkipping: true,
        skipRules: [
          {
            filePattern: '**/*.xsd',
            elementsToSkip: ['xs:sequence', 'xs:choice']
          },
          {
            filePattern: '**/*.xml',
            elementsToSkip: ['metadata', 'annotation']
          }
        ]
      };

      const result = getSkipElements(options);
      assert.equal(result.size, 4);
      assert.ok(result.has('xs:sequence'));
      assert.ok(result.has('xs:choice'));
      assert.ok(result.has('metadata'));
      assert.ok(result.has('annotation'));
    });

    it('handles duplicate elements across rules', () => {
      const options = {
        enableSkipping: true,
        skipRules: [
          {
            filePattern: '**/*.xsd',
            elementsToSkip: ['xs:sequence', 'xs:choice']
          },
          {
            filePattern: '**/*.xml',
            elementsToSkip: ['xs:sequence', 'metadata']
          }
        ]
      };

      const result = getSkipElements(options);
      assert.equal(result.size, 3);
      assert.ok(result.has('xs:sequence'));
      assert.ok(result.has('xs:choice'));
      assert.ok(result.has('metadata'));
    });

    it('returns empty set when options are undefined', () => {
      const result = getSkipElements(undefined);
      assert.equal(result.size, 0);
    });

    it('returns empty set when options object is empty', () => {
      const result = getSkipElements({});
      assert.equal(result.size, 0);
    });
  });

  describe('Skip Rule Format', () => {
    it('validates skip rule structure', () => {
      const rule: SkipRule = {
        filePattern: '**/*.xsd',
        elementsToSkip: ['xs:sequence', 'xs:choice', 'xs:any', 'xs:all']
      };

      assert.ok(rule.filePattern);
      assert.ok(Array.isArray(rule.elementsToSkip));
      assert.equal(rule.elementsToSkip.length, 4);
    });

    it('supports namespace-prefixed elements', () => {
      const options = {
        enableSkipping: true,
        skipRules: [{
          filePattern: '**/*.xsd',
          elementsToSkip: ['xs:sequence', 'xsd:choice', 'custom:element']
        }]
      };

      const result = getSkipElements(options);
      assert.ok(result.has('xs:sequence'));
      assert.ok(result.has('xsd:choice'));
      assert.ok(result.has('custom:element'));
    });
  });
});
