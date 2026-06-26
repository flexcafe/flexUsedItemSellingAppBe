import { normalizeEmail } from './normalize-email.js';

describe('normalizeEmail', () => {
  it('trims whitespace and lowercases the address', () => {
    expect(normalizeEmail('  JOHN@Example.COM ')).toBe('john@example.com');
  });
});
