export type DistributionCounts = { healthy: number; monitoring: number; critical: number };

export function getDistributionPercentages(total: number, distribution: DistributionCounts) {
  if (!total) return { healthyPct: 0, monitoringPct: 0, criticalPct: 0 };
  const healthyPct = Math.round((distribution.healthy / total) * 100);
  const monitoringPct = Math.round((distribution.monitoring / total) * 100);
  return { healthyPct, monitoringPct, criticalPct: Math.max(0, 100 - healthyPct - monitoringPct) };
}
