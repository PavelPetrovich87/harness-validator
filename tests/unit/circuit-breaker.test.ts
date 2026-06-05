import { describe, it, expect } from 'vitest';
import { CircuitBreaker } from '../../src/circuit-breaker.js';

describe('Unit: CircuitBreaker', () => {
  it('increments failure counter per feature', () => {
    const cb = new CircuitBreaker();

    expect(cb.recordFailure('F01')).toBe(1);
    expect(cb.recordFailure('F01')).toBe(2);
    expect(cb.getState('F01')).toEqual({ failures: 2, open: false });
  });

  it('returns isOpen=false after 2 failures and true after 3', () => {
    const cb = new CircuitBreaker();

    cb.recordFailure('F01');
    cb.recordFailure('F01');
    expect(cb.isOpen('F01')).toBe(false);
    expect(cb.canAttempt('F01')).toBe(true);

    cb.recordFailure('F01');
    expect(cb.isOpen('F01')).toBe(true);
    expect(cb.canAttempt('F01')).toBe(false);
  });

  it('resets counter to 0 on recordSuccess', () => {
    const cb = new CircuitBreaker();

    cb.recordFailure('F01');
    cb.recordFailure('F01');
    cb.recordSuccess('F01');

    expect(cb.getState('F01')).toEqual({ failures: 0, open: false });
    expect(cb.isOpen('F01')).toBe(false);
  });

  it('isolates state between features', () => {
    const cb = new CircuitBreaker();

    cb.recordFailure('F02');
    cb.recordFailure('F02');
    cb.recordFailure('F02');
    expect(cb.isOpen('F02')).toBe(true);

    expect(cb.getState('F03')).toEqual({ failures: 0, open: false });
    expect(cb.isOpen('F03')).toBe(false);

    cb.recordFailure('F03');
    expect(cb.getState('F03')).toEqual({ failures: 1, open: false });
  });

  it('manually resets state for a feature', () => {
    const cb = new CircuitBreaker();

    cb.recordFailure('F01');
    cb.recordFailure('F01');
    cb.reset('F01');

    expect(cb.getState('F01')).toEqual({ failures: 0, open: false });
  });

  it('exposes ATTEMPTS_LIMIT as 3', () => {
    expect(CircuitBreaker.ATTEMPTS_LIMIT).toBe(3);
  });
});
