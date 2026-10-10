export interface LatencySummary {
  samples: number;
  p50: number | null;
  p95: number | null;
  max: number | null;
}

export function percentile(
  sortedValues: readonly number[],
  percentileValue: number,
): number | null {
  if (sortedValues.length === 0) return null;
  const index = Math.ceil((percentileValue / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)] ?? null;
}

function roundToTenthMs(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10;
}

export function summarizeLatency(values: readonly number[]): LatencySummary {
  const sorted = [...values].sort((left, right) => left - right);
  return {
    samples: sorted.length,
    p50: roundToTenthMs(percentile(sorted, 50)),
    p95: roundToTenthMs(percentile(sorted, 95)),
    max: roundToTenthMs(sorted.at(-1) ?? null),
  };
}

/** Client-observed round trips: the time between sending a command and receiving its acknowledgement. */
export class LatencyRecorder {
  private readonly samples = new Map<string, number[]>();

  record(label: string, elapsedMs: number): void {
    const existing = this.samples.get(label);
    if (existing) existing.push(elapsedMs);
    else this.samples.set(label, [elapsedMs]);
  }

  summaries(): Record<string, LatencySummary> {
    return Object.fromEntries(
      [...this.samples].map(([label, values]) => [label, summarizeLatency(values)]),
    );
  }
}
