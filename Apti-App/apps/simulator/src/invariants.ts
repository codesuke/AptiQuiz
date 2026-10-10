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
  private readonly reported: string[] = [];
  private failed = 0;

  check(condition: boolean, message: string): void {
    if (condition) return;
    this.failed += 1;
    if (this.reported.length < MAX_REPORTED) this.reported.push(message);
  }

  /** Every failed check, including those past the reporting cap. */
  get count(): number {
    return this.failed;
  }

  throwIfBroken(): void {
    if (this.failed === 0) return;
    const omitted = this.failed - this.reported.length;
    const note = omitted > 0 ? [`${omitted} more violation(s) not listed`] : [];
    throw new InvariantFailure([...this.reported, ...note]);
  }
}
