"""User behavior memory - tracks user preferences across generations.

Phase 3: Learns from user actions (approve/reject/modify) to improve
future recommendations. Stores preference patterns per user.
"""

import json
import time
from typing import Dict, Any, Optional, List
from pathlib import Path
from pydantic import BaseModel, Field


# ============================================================================
# Models
# ============================================================================

class UserPreference(BaseModel):
    """Aggregated user preferences."""
    user_id: str = Field(default="anonymous")
    total_generations: int = 0
    approved_count: int = 0
    rejected_count: int = 0
    modified_count: int = 0

    # Style preferences
    preferred_themes: Dict[str, int] = Field(default_factory=dict)
    preferred_styles: Dict[str, int] = Field(default_factory=dict)

    # Component preferences
    preferred_components: Dict[str, int] = Field(default_factory=dict)
    rejected_components: Dict[str, int] = Field(default_factory=dict)

    # Text preferences
    text_style: Optional[str] = None  # e.g., "cute", "cool", "minimal"

    # MBTI correlation
    mbti_theme_correlation: Dict[str, Dict[str, int]] = Field(default_factory=dict)

    # Last updated
    last_updated: float = Field(default_factory=time.time)


class GenerationFeedback(BaseModel):
    """Single generation feedback record."""
    user_id: str = Field(default="anonymous")
    timestamp: float = Field(default_factory=time.time)
    theme_id: str
    components_used: List[str] = Field(default_factory=list)
    action: str  # "approve", "reject", "modify"
    modifications: Optional[List[str]] = None
    iteration_count: int = 1
    validation_score: float = 0.0


# ============================================================================
# Behavior Memory
# ============================================================================

class UserBehaviorMemory:
    """Tracks and learns from user behavior across generations."""

    def __init__(self, storage_path: Optional[str] = None):
        self._preferences: Dict[str, UserPreference] = {}
        self._feedback_log: List[GenerationFeedback] = []
        self._storage_path = storage_path

        # Load from storage if available
        if storage_path:
            self._load_from_file(storage_path)

    def record_feedback(self, feedback: GenerationFeedback) -> UserPreference:
        """Record a generation feedback and update preferences."""
        self._feedback_log.append(feedback)

        # Get or create preference
        pref = self.get_preferences(feedback.user_id)
        pref.total_generations += 1

        if feedback.action == "approve":
            pref.approved_count += 1
            self._record_positive(pref, feedback)
        elif feedback.action == "reject":
            pref.rejected_count += 1
            self._record_negative(pref, feedback)
        elif feedback.action == "modify":
            pref.modified_count += 1
            self._record_modification(pref, feedback)

        # Update MBTI correlation
        self._update_mbti_correlation(pref, feedback)

        pref.last_updated = time.time()
        self._preferences[feedback.user_id] = pref

        # Save if storage path set
        if self._storage_path:
            self._save_to_file(self._storage_path)

        return pref

    def get_preferences(self, user_id: str = "anonymous") -> UserPreference:
        """Get user preferences, creating default if not exists."""
        if user_id not in self._preferences:
            self._preferences[user_id] = UserPreference(user_id=user_id)
        return self._preferences[user_id]

    def get_recommended_theme(self, user_id: str = "anonymous", mbti: Optional[str] = None) -> str:
        """Get the most recommended theme for a user."""
        pref = self.get_preferences(user_id)

        # If MBTI provided, check MBTI-theme correlation
        if mbti and pref.mbti_theme_correlation.get(mbti):
            correlations = pref.mbti_theme_correlation[mbti]
            if correlations:
                return max(correlations, key=correlations.get)

        # Fallback: most approved theme
        if pref.preferred_themes:
            return max(pref.preferred_themes, key=pref.preferred_themes.get)

        return "sakura"

    def get_recommended_components(
        self,
        user_id: str = "anonymous",
        count: int = 6,
        exclude: Optional[List[str]] = None,
    ) -> List[str]:
        """Get recommended component types for a user."""
        pref = self.get_preferences(user_id)
        exclude = exclude or []

        # Score components: approved - rejected
        scores = {}
        for comp_type, approval_count in pref.preferred_components.items():
            rejection_count = pref.rejected_components.get(comp_type, 0)
            scores[comp_type] = approval_count - rejection_count * 2

        # Sort by score descending
        sorted_components = sorted(scores, key=scores.get, reverse=True)

        # Filter out excluded, return top N
        result = [c for c in sorted_components if c not in exclude][:count]

        # Always include hero-section if not excluded
        if "hero-section" not in exclude and "hero-section" not in result:
            result.insert(0, "hero-section")

        return result

    def get_user_stats(self, user_id: str = "anonymous") -> Dict[str, Any]:
        """Get user statistics."""
        pref = self.get_preferences(user_id)
        total = pref.total_generations
        if total == 0:
            return {"message": "No generations yet"}

        approval_rate = pref.approved_count / total * 100

        return {
            "total_generations": total,
            "approval_rate": round(approval_rate, 1),
            "avg_iterations": round(total / max(pref.approved_count, 1), 1),
            "favorite_theme": max(pref.preferred_themes, key=pref.preferred_themes.get) if pref.preferred_themes else "N/A",
            "favorite_component": max(pref.preferred_components, key=pref.preferred_components.get) if pref.preferred_components else "N/A",
        }

    # ========================================================================
    # Private helpers
    # ========================================================================

    def _record_positive(self, pref: UserPreference, feedback: GenerationFeedback):
        """Record positive feedback (approved)."""
        # Theme preference
        theme = feedback.theme_id
        pref.preferred_themes[theme] = pref.preferred_themes.get(theme, 0) + 1

        # Component preferences
        for comp in feedback.components_used:
            pref.preferred_components[comp] = pref.preferred_components.get(comp, 0) + 1

    def _record_negative(self, pref: UserPreference, feedback: GenerationFeedback):
        """Record negative feedback (rejected)."""
        # Components that might have caused rejection
        for comp in feedback.components_used:
            pref.rejected_components[comp] = pref.rejected_components.get(comp, 0) + 1

    def _record_modification(self, pref: UserPreference, feedback: GenerationFeedback):
        """Record modification feedback."""
        # Modifications indicate partial approval
        if feedback.modifications:
            for mod in feedback.modifications:
                # Try to extract component type from modification
                if "theme" in mod.lower() or "style" in mod.lower():
                    pref.preferred_styles[mod] = pref.preferred_styles.get(mod, 0) + 1

    def _update_mbti_correlation(self, pref: UserPreference, feedback: GenerationFeedback):
        """Update MBTI-theme correlation from feedback."""
        # This would need MBTI from profile - simplified for now
        pass

    # ========================================================================
    # Persistence
    # ========================================================================

    def _load_from_file(self, path: str):
        """Load preferences from JSON file."""
        try:
            file_path = Path(path)
            if file_path.exists():
                data = json.loads(file_path.read_text(encoding="utf-8"))
                for user_id, pref_data in data.get("preferences", {}).items():
                    self._preferences[user_id] = UserPreference(**pref_data)
                for fb_data in data.get("feedback_log", []):
                    self._feedback_log.append(GenerationFeedback(**fb_data))
        except Exception:
            pass  # Ignore load errors, start fresh

    def _save_to_file(self, path: str):
        """Save preferences to JSON file."""
        try:
            file_path = Path(path)
            file_path.parent.mkdir(parents=True, exist_ok=True)
            data = {
                "preferences": {
                    uid: pref.model_dump()
                    for uid, pref in self._preferences.items()
                },
                "feedback_log": [
                    fb.model_dump()
                    for fb in self._feedback_log[-1000:]  # Keep last 1000
                ],
            }
            file_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass  # Ignore save errors


# ============================================================================
# Global instance
# ============================================================================

_behavior_memory: Optional[UserBehaviorMemory] = None


def get_behavior_memory(storage_path: Optional[str] = None) -> UserBehaviorMemory:
    """Get or create global behavior memory instance."""
    global _behavior_memory
    if _behavior_memory is None:
        _behavior_memory = UserBehaviorMemory(storage_path=storage_path)
    return _behavior_memory


def reset_behavior_memory():
    """Reset global behavior memory (for testing)."""
    global _behavior_memory
    _behavior_memory = None
