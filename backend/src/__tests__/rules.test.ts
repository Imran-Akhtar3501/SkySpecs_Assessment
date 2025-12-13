import { describe, it, expect } from '@jest/globals';

function priorityFromMaxSeverity(maxSeverity: number): 'LOW'|'MEDIUM'|'HIGH' {
  if (maxSeverity >= 5) return 'HIGH';
  if (maxSeverity >= 3) return 'MEDIUM';
  return 'LOW';
}

describe('priority rule', () => {
  it('HIGH if any severity 5', () => {
    expect(priorityFromMaxSeverity(5)).toBe('HIGH');
  });
  it('MEDIUM if 3-4', () => {
    expect(priorityFromMaxSeverity(4)).toBe('MEDIUM');
  });
  it('LOW otherwise', () => {
    expect(priorityFromMaxSeverity(2)).toBe('LOW');
  });
});
