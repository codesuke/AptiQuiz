import { SimulationError } from "./rpc.js";

const MAX_REPORTED = 20;

export class InvariantFailure extends SimulationError {
  constructor(readonly details: readonly string[]) {
    super(`${details.length} invariant violation(s)`);
    this.name = "InvariantFailure";
  }
}

/** Collects failed checks so one run reports every broken invariant instead of only the first. */
export class Invariants {
  private readonly failures: string[] = [];

  check(condition: boolean, message: string): void {
    if (!condition && this.failures.length < MAX_REPORTED) this.failures.push(message);
  }

  get count(): number {
    return this.failures.length;
  }

  throwIfBroken(): void {
    if (this.failures.length > 0) throw new InvariantFailure(this.failures);
  }
}
