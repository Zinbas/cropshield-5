import { describe, expect, it } from "vitest";
import { getDistributionPercentages } from "./analytics";

describe("analytics distribution", () => {
  it("returns a truthful zero state when there are no approved scans", () => {
    expect(getDistributionPercentages(0, { healthy: 0, monitoring: 0, critical: 0 })).toEqual({ healthyPct: 0, monitoringPct: 0, criticalPct: 0 });
  });

  it("keeps percentages bounded and fills the remainder as critical", () => {
    expect(getDistributionPercentages(4, { healthy: 2, monitoring: 1, critical: 1 })).toEqual({ healthyPct: 50, monitoringPct: 25, criticalPct: 25 });
  });
});
