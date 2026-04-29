"""Validator Agent - Three-layer config validation with auto-repair.

Phase 2: Replaces post-generation Self-Reflection with a systematic
validation pipeline that can automatically fix common issues.

Three layers:
- L1 Schema: Pydantic validation (structure, types, required fields)
- L2 Semantic: Component-profile matching, style consistency
- L3 Business: Component count, no overlaps, personalized copy
"""

from typing import Dict, Any, Optional, List, Tuple
from pydantic import BaseModel, Field

from .base import BaseAgent, AgentType, AgentResponse
from ..memory.session import Session, SessionState
from ..models.page import BackendPageConfig
from ..tools.config import ValidateConfigTool
from ..tools.repair_component import auto_fix_issues, REPAIR_FUNCTIONS
from ..tools.check_semantic_match import evaluate_semantic_match, SemanticMatchOutput


# ============================================================================
# Validation result model
# ============================================================================

class ValidationReport(BaseModel):
    """Comprehensive validation report."""
    # Layer results
    l1_schema_passed: bool = True
    l1_schema_issues: List[Dict[str, Any]] = Field(default_factory=list)

    l2_semantic_passed: bool = True
    l2_semantic_score: float = 10.0
    l2_semantic_issues: List[Dict[str, Any]] = Field(default_factory=list)
    l2_semantic_results: List[Any] = Field(default_factory=list)
    l2_missing_suggestions: List[str] = Field(default_factory=list)

    l3_business_passed: bool = True
    l3_business_issues: List[Dict[str, Any]] = Field(default_factory=list)

    # Overall
    passed: bool = True
    overall_score: float = 100.0
    auto_fixes_applied: List[Dict[str, Any]] = Field(default_factory=list)
    remaining_issues: List[Dict[str, Any]] = Field(default_factory=list)

    # Repair guidance (for issues that couldn't be auto-fixed)
    repair_guidance: List[str] = Field(default_factory=list)

    @property
    def can_auto_fix(self) -> bool:
        """Whether remaining issues can be auto-fixed."""
        return any(
            issue.get("code", "") in REPAIR_FUNCTIONS
            for issue in self.remaining_issues
        )


# ============================================================================
# Validator Agent
# ============================================================================

class ValidatorAgent(BaseAgent):
    """Validator Agent - Three-layer validation with auto-repair."""

    agent_type = AgentType.VALIDATION
    name = "Validator Agent"
    description = "三层校验 + 自动修复"
    max_iterations = 3
    timeout_ms = 15000

    def __init__(self, llm_client=None, memory=None, tool_registry=None):
        # ValidatorAgent doesn't require LLM for validation (pure functions)
        # But keep compatibility with BaseAgent interface
        self.llm = llm_client
        self.memory = memory
        self.tools = tool_registry

    # Thresholds
    SEMANTIC_PASS_SCORE = 6.0
    MAX_COMPONENTS = 8
    MIN_COMPONENTS = 2

    def get_system_prompt(self) -> str:
        return "Validator Agent - 评估配置质量并提供修复指导"

    async def run(
        self,
        config: Dict[str, Any],
        profile: Dict[str, Any],
        theme_id: str = "sakura",
        session: Optional[Session] = None,
        context: Optional[Dict[str, Any]] = None,
        user_input: str = "",
    ) -> AgentResponse:
        """Run three-layer validation.

        Args:
            config: Config dict to validate
            profile: User profile
            theme_id: Selected theme
            session: Optional session (for state management)

        Returns:
            AgentResponse with validation report
        """
        report = await self.validate(config, profile, theme_id)

        # If session is provided, save validation result
        if session:
            session.data["last_validation"] = report.model_dump()

        if report.passed:
            return AgentResponse(
                session_id=session.id if session else "",
                response="校验通过！配置质量良好 ✨",
                action={"type": "validate", "data": {"report": report.model_dump()}},
                current_config=config,
                state=SessionState.PREVIEW.value,
            )
        else:
            return AgentResponse(
                session_id=session.id if session else "",
                response=f"校验未通过，发现 {len(report.remaining_issues)} 个问题",
                action={
                    "type": "validate_failed",
                    "data": {
                        "report": report.model_dump(),
                        "can_auto_fix": report.can_auto_fix,
                        "repair_guidance": report.repair_guidance,
                    },
                },
                current_config=config,
                suggestions=[
                    {"type": "repair", "name": "自动修复", "description": "尝试自动修复问题"},
                    {"type": "regenerate", "name": "重新生成", "description": "重新生成配置"},
                ]
                if report.can_auto_fix
                else [
                    {"type": "regenerate", "name": "重新生成", "description": "重新生成配置"},
                ],
                state=SessionState.ITERATING.value,
            )

    async def validate(
        self,
        config: Dict[str, Any],
        profile: Dict[str, Any],
        theme_id: str = "sakura",
    ) -> ValidationReport:
        """Run three-layer validation pipeline.

        Returns:
            ValidationReport with detailed results from all layers.
        """
        report = ValidationReport()

        # ================================================================
        # L1: Schema validation
        # ================================================================
        l1_passed, l1_issues = self._validate_schema(config)
        report.l1_schema_passed = l1_passed
        report.l1_schema_issues = l1_issues

        # Auto-fix L1 issues
        if l1_issues:
            fixed_config, fixes, remaining = auto_fix_issues(config, l1_issues)
            report.auto_fixes_applied.extend(fixes)
            report.remaining_issues.extend(remaining)
            config = fixed_config

        # ================================================================
        # L2: Semantic validation (component-profile matching)
        # ================================================================
        semantic_result = evaluate_semantic_match(
            profile=profile,
            components=config.get("components", []),
            theme_id=theme_id,
        )
        report.l2_semantic_score = semantic_result.overall_score
        report.l2_semantic_passed = semantic_result.overall_score >= self.SEMANTIC_PASS_SCORE
        report.l2_semantic_results = semantic_result.component_results
        report.l2_missing_suggestions = semantic_result.missing_suggestions

        if not report.l2_semantic_passed:
            for cr in semantic_result.component_results:
                if cr.match_score < self.SEMANTIC_PASS_SCORE:
                    report.l2_semantic_issues.append({
                        "severity": "warning",
                        "code": "LOW_SEMANTIC_MATCH",
                        "message": f"组件 {cr.component_type} 匹配度低: {cr.match_score}/10",
                        "suggestion": cr.suggestion,
                    })
            report.repair_guidance.extend(semantic_result.missing_suggestions)

        # ================================================================
        # L3: Business rules validation
        # ================================================================
        l3_passed, l3_issues = self._validate_business_rules(config)
        report.l3_business_passed = l3_passed
        report.l3_business_issues = l3_issues

        # Auto-fix L3 issues
        if l3_issues:
            fixed_config, fixes, remaining = auto_fix_issues(config, l3_issues)
            report.auto_fixes_applied.extend(fixes)
            report.remaining_issues.extend(remaining)
            config = fixed_config

        # ================================================================
        # Overall result
        # ================================================================
        report.passed = (
            report.l1_schema_passed
            and report.l2_semantic_passed
            and report.l3_business_passed
            and len(report.remaining_issues) == 0
        )

        # Calculate overall score
        schema_score = 100 if report.l1_schema_passed else 100 - len(report.l1_schema_issues) * 10
        semantic_score = report.l2_semantic_score * 10
        business_score = 100 if report.l3_business_passed else 100 - len(report.l3_business_issues) * 10
        report.overall_score = round(
            (schema_score * 0.3 + semantic_score * 0.4 + business_score * 0.3), 1
        )

        return report

    def validate_sync(
        self,
        config: Dict[str, Any],
        profile: Dict[str, Any],
        theme_id: str = "sakura",
    ) -> ValidationReport:
        """Synchronous version of validate (for testing).

        This is a sync wrapper that runs the same three-layer validation.
        """
        report = ValidationReport()

        # L1: Schema validation
        l1_passed, l1_issues = self._validate_schema(config)
        report.l1_schema_passed = l1_passed
        report.l1_schema_issues = l1_issues

        if l1_issues:
            fixed_config, fixes, remaining = auto_fix_issues(config, l1_issues)
            report.auto_fixes_applied.extend(fixes)
            report.remaining_issues.extend(remaining)
            config = fixed_config

        # L2: Semantic validation
        semantic_result = evaluate_semantic_match(
            profile=profile,
            components=config.get("components", []),
            theme_id=theme_id,
        )
        report.l2_semantic_score = semantic_result.overall_score
        report.l2_semantic_passed = semantic_result.overall_score >= self.SEMANTIC_PASS_SCORE
        report.l2_semantic_results = semantic_result.component_results
        report.l2_missing_suggestions = semantic_result.missing_suggestions

        if not report.l2_semantic_passed:
            for cr in semantic_result.component_results:
                if cr.match_score < self.SEMANTIC_PASS_SCORE:
                    report.l2_semantic_issues.append({
                        "severity": "warning",
                        "code": "LOW_SEMANTIC_MATCH",
                        "message": f"组件 {cr.component_type} 匹配度低: {cr.match_score}/10",
                        "suggestion": cr.suggestion,
                    })
            report.repair_guidance.extend(semantic_result.missing_suggestions)

        # L3: Business rules validation
        l3_passed, l3_issues = self._validate_business_rules(config)
        report.l3_business_passed = l3_passed
        report.l3_business_issues = l3_issues

        if l3_issues:
            fixed_config, fixes, remaining = auto_fix_issues(config, l3_issues)
            report.auto_fixes_applied.extend(fixes)
            report.remaining_issues.extend(remaining)
            config = fixed_config

        # Overall result
        report.passed = (
            report.l1_schema_passed
            and report.l2_semantic_passed
            and report.l3_business_passed
            and len(report.remaining_issues) == 0
        )

        # Calculate overall score
        schema_score = 100 if report.l1_schema_passed else 100 - len(report.l1_schema_issues) * 10
        semantic_score = report.l2_semantic_score * 10
        business_score = 100 if report.l3_business_passed else 100 - len(report.l3_business_issues) * 10
        report.overall_score = round(
            (schema_score * 0.3 + semantic_score * 0.4 + business_score * 0.3), 1
        )

        return report

    # ========================================================================
    # L1: Schema validation
    # ========================================================================

    def _validate_schema(self, config: Dict[str, Any]) -> Tuple[bool, List[Dict[str, Any]]]:
        """L1: Pydantic schema validation."""
        issues = []

        try:
            BackendPageConfig.model_validate(config)
        except Exception as e:
            issues.append({
                "severity": "error",
                "code": "SCHEMA_VALIDATION_FAILED",
                "message": str(e),
            })

        # Additional schema checks
        components = config.get("components", [])
        for i, comp in enumerate(components):
            comp_type = comp.get("type")
            comp_id = comp.get("id")

            if not comp_type:
                issues.append({
                    "severity": "error",
                    "code": "MISSING_COMPONENT_TYPE",
                    "message": f"组件 {i} 缺少 type 字段",
                    "field": f"components[{i}].type",
                })
            elif comp_type not in self._get_valid_types():
                issues.append({
                    "severity": "error",
                    "code": "INVALID_COMPONENT_TYPE",
                    "message": f"无效组件类型: {comp_type}",
                    "field": f"components[{i}].type",
                })

            if not comp_id:
                issues.append({
                    "severity": "error",
                    "code": "MISSING_COMPONENT_ID",
                    "message": f"组件 {i} (type={comp_type}) 缺少 id 字段",
                    "field": f"components[{i}].id",
                })

        # Check theme
        theme = config.get("theme", {})
        if not theme.get("id"):
            issues.append({
                "severity": "error",
                "code": "MISSING_THEME_ID",
                "message": "缺少主题 ID",
            })

        return len(issues) == 0, issues

    def _get_valid_types(self) -> List[str]:
        """Get list of valid component types."""
        from ..models.page import ComponentType
        return [t.value for t in ComponentType]

    # ========================================================================
    # L3: Business rules validation
    # ========================================================================

    def _validate_business_rules(
        self, config: Dict[str, Any]
    ) -> Tuple[bool, List[Dict[str, Any]]]:
        """L3: Business rules validation."""
        issues = []
        components = config.get("components", [])

        # Component count check
        if len(components) < self.MIN_COMPONENTS:
            issues.append({
                "severity": "warning",
                "code": "TOO_FEW_COMPONENTS",
                "message": f"组件数量 {len(components)} 少于最小值 {self.MIN_COMPONENTS}",
            })
        elif len(components) > self.MAX_COMPONENTS:
            issues.append({
                "severity": "error",
                "code": "COMPONENT_COUNT_EXCEEDED",
                "message": f"组件数量 {len(components)} 超过最大值 {self.MAX_COMPONENTS}",
            })

        # Check for duplicate IDs
        ids = [c.get("id") for c in components if c.get("id")]
        seen = set()
        for comp_id in ids:
            if comp_id in seen:
                issues.append({
                    "severity": "error",
                    "code": "DUPLICATE_COMPONENT_ID",
                    "message": f"重复的组件 ID: {comp_id}",
                })
                break
            seen.add(comp_id)

        # Check for overlaps
        overlaps = self._check_overlaps(components)
        if overlaps:
            issues.append({
                "severity": "error",
                "code": "COMPONENT_OVERLAP",
                "message": f"发现 {overlaps} 处组件重叠",
            })

        # Check for placeholder text
        for i, comp in enumerate(components):
            props = comp.get("props", {})
            for key, value in props.items():
                if isinstance(value, str) and "{{" in value:
                    # Unfilled placeholder
                    issues.append({
                        "severity": "warning",
                        "code": "UNFILLED_PLACEHOLDER",
                        "message": f"组件 {comp.get('id')} 的 {key} 包含未填充的占位符",
                        "field": f"components[{i}].props.{key}",
                    })

        # Check hero-section exists
        types = [c.get("type") for c in components]
        if "hero-section" not in types:
            issues.append({
                "severity": "warning",
                "code": "MISSING_HERO_SECTION",
                "message": "建议添加 hero-section 组件",
            })

        return len([i for i in issues if i["severity"] == "error"]) == 0, issues

    def _check_overlaps(self, components: List[Dict]) -> int:
        """Count overlapping component pairs."""
        overlaps = 0
        positioned = []

        for comp in components:
            pos = comp.get("position", {})
            if not pos:
                continue
            x = pos.get("x", 0)
            y = pos.get("y", 0)
            w = pos.get("width", 0)
            h = pos.get("height", 0)
            positioned.append((x, y, w, h))

        for i in range(len(positioned)):
            for j in range(i + 1, len(positioned)):
                ax, ay, aw, ah = positioned[i]
                bx, by, bw, bh = positioned[j]
                if not (ax + aw <= bx or bx + bw <= ax or ay + ah <= by or by + bh <= ay):
                    overlaps += 1

        return overlaps
