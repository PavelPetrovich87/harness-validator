/**
 * Per-feature circuit breaker that halts further attempts after
 * ATTEMPTS_LIMIT consecutive failures.
 */
export class CircuitBreaker {
  static readonly ATTEMPTS_LIMIT = 3;

  private readonly state = new Map<string, number>();

  /**
   * Increment the failure counter for a feature and return the new count.
   */
  recordFailure(featureId: string): number {
    const count = (this.state.get(featureId) ?? 0) + 1;
    this.state.set(featureId, count);
    return count;
  }

  /**
   * Reset the failure counter for a feature to 0 (e.g. after a successful fix).
   */
  recordSuccess(featureId: string): void {
    this.state.set(featureId, 0);
  }

  /**
   * Returns true when the feature has reached ATTEMPTS_LIMIT failures.
   */
  isOpen(featureId: string): boolean {
    return this.getFailures(featureId) >= CircuitBreaker.ATTEMPTS_LIMIT;
  }

  /**
   * Inverse of isOpen().
   */
  canAttempt(featureId: string): boolean {
    return !this.isOpen(featureId);
  }

  /**
   * Get the current failure count and open state for a feature.
   */
  getState(featureId: string): { failures: number; open: boolean } {
    const failures = this.getFailures(featureId);
    return { failures, open: failures >= CircuitBreaker.ATTEMPTS_LIMIT };
  }

  /**
   * Manually clear state for a feature.
   */
  reset(featureId: string): void {
    this.state.delete(featureId);
  }

  private getFailures(featureId: string): number {
    return this.state.get(featureId) ?? 0;
  }
}
