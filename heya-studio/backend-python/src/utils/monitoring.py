"""Performance monitoring - tracks generation metrics and quality scores.

Phase 3: Provides observability into the generation pipeline,
tracking latency, success rates, validation scores, and user satisfaction.
"""

import time
import statistics
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from collections import defaultdict


# ============================================================================
# Metrics models
# ============================================================================

@dataclass
class GenerationMetric:
    """Single generation attempt metrics."""
    timestamp: float
    user_id: str
    theme_id: str
    component_count: int
    latency_ms: float
    validation_score: float
    semantic_score: float
    iteration_count: int
    auto_fixes: int
    action: str  # "approve", "reject", "modify"
    error: Optional[str] = None


class PerformanceMonitor:
    """Tracks and reports generation performance metrics."""

    def __init__(self):
        self._metrics: List[GenerationMetric] = []
        self._start_time = time.time()
        self._total_generations = 0
        self._total_errors = 0
        self._latencies: List[float] = []

    def record_generation(self, metric: GenerationMetric):
        """Record a generation metric."""
        self._metrics.append(metric)
        self._total_generations += 1
        if metric.error:
            self._total_errors += 1
        self._latencies.append(metric.latency_ms)

        # Keep only last 10000 metrics
        if len(self._metrics) > 10000:
            self._metrics = self._metrics[-10000:]

    def get_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get performance summary for the last N hours."""
        cutoff = time.time() - hours * 3600
        recent = [m for m in self._metrics if m.timestamp >= cutoff]

        if not recent:
            return {"message": f"No data in the last {hours} hours"}

        latencies = [m.latency_ms for m in recent]
        validation_scores = [m.validation_score for m in recent]
        semantic_scores = [m.semantic_score for m in recent]

        # Action breakdown
        actions = defaultdict(int)
        for m in recent:
            actions[m.action] += 1

        # Theme breakdown
        themes = defaultdict(int)
        for m in recent:
            themes[m.theme_id] += 1

        # Error rate
        errors = sum(1 for m in recent if m.error)

        # Auto-fix rate
        total_auto_fixes = sum(m.auto_fixes for m in recent)
        generations_with_fixes = sum(1 for m in recent if m.auto_fixes > 0)

        return {
            "period_hours": hours,
            "total_generations": len(recent),
            "error_count": errors,
            "error_rate": round(errors / len(recent) * 100, 1) if recent else 0,

            "latency": {
                "avg_ms": round(statistics.mean(latencies), 0) if latencies else 0,
                "median_ms": round(statistics.median(latencies), 0) if latencies else 0,
                "p95_ms": round(sorted(latencies)[int(len(latencies) * 0.95)], 0) if len(latencies) > 20 else 0,
                "p99_ms": round(sorted(latencies)[int(len(latencies) * 0.99)], 0) if len(latencies) > 100 else 0,
            },

            "validation": {
                "avg_score": round(statistics.mean(validation_scores), 1) if validation_scores else 0,
                "pass_rate": round(
                    sum(1 for s in validation_scores if s >= 60) / len(validation_scores) * 100, 1
                ) if validation_scores else 0,
            },

            "semantic": {
                "avg_score": round(statistics.mean(semantic_scores), 1) if semantic_scores else 0,
            },

            "actions": dict(actions),
            "approval_rate": round(
                actions.get("approve", 0) / len(recent) * 100, 1
            ) if recent else 0,

            "themes": dict(themes),

            "auto_fix": {
                "total_fixes": total_auto_fixes,
                "generations_with_fixes": generations_with_fixes,
                "fix_rate": round(
                    generations_with_fixes / len(recent) * 100, 1
                ) if recent else 0,
            },

            "avg_iterations": round(
                statistics.mean(m.iteration_count for m in recent), 1
            ) if recent else 0,
        }

    def get_health(self) -> Dict[str, Any]:
        """Get system health status."""
        summary = self.get_summary(hours=1)

        if "message" in summary:
            return {"status": "unknown", "details": summary}

        # Determine health status
        status = "healthy"
        warnings = []

        error_rate = summary.get("error_rate", 0)
        if error_rate > 10:
            status = "degraded"
            warnings.append(f"High error rate: {error_rate}%")

        approval_rate = summary.get("approval_rate", 0)
        if approval_rate < 30:
            status = "degraded"
            warnings.append(f"Low approval rate: {approval_rate}%")

        avg_latency = summary.get("latency", {}).get("avg_ms", 0)
        if avg_latency > 10000:
            status = "degraded"
            warnings.append(f"High latency: {avg_latency}ms")

        return {
            "status": status,
            "warnings": warnings,
            "uptime_seconds": round(time.time() - self._start_time, 0),
            "total_generations": self._total_generations,
            "recent_1h": summary,
        }

    def get_trend(self, metric_name: str, hours: int = 24, buckets: int = 12) -> List[Dict[str, Any]]:
        """Get metric trend over time."""
        cutoff = time.time() - hours * 3600
        bucket_size = hours * 3600 / buckets

        trends = []
        for i in range(buckets):
            bucket_start = cutoff + i * bucket_size
            bucket_end = bucket_start + bucket_size

            bucket_metrics = [
                m for m in self._metrics
                if bucket_start <= m.timestamp < bucket_end
            ]

            if not bucket_metrics:
                continue

            values = [getattr(m, metric_name) for m in bucket_metrics]

            trends.append({
                "timestamp": bucket_start,
                "count": len(bucket_metrics),
                "avg": round(statistics.mean(values), 1) if values else 0,
                "min": min(values) if values else 0,
                "max": max(values) if values else 0,
            })

        return trends


# ============================================================================
# Global instance
# ============================================================================

_monitor: Optional[PerformanceMonitor] = None


def get_monitor() -> PerformanceMonitor:
    """Get or create global performance monitor."""
    global _monitor
    if _monitor is None:
        _monitor = PerformanceMonitor()
    return _monitor


def reset_monitor():
    """Reset global monitor (for testing)."""
    global _monitor
    _monitor = None
