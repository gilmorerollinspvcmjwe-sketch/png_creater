"""Structured logging module using loguru.

Provides a production-grade logger with:
- Structured format: time | level | module | message | optional context
- Environment variable LOG_LEVEL control (default: INFO)
- Contextual binding (session_id, user_id)
- Replaces all print() calls with proper log levels

Log Level Guidelines:
- DEBUG: Development debugging (LLM I/O, tool call details)
- INFO: Normal business flow (routing results, generation complete)
- WARNING: Abnormal but recoverable (LLM fallback, low quality score)
- ERROR: Errors requiring attention (parse failure, LLM call exception)

Usage:
    from src.utils.logger import logger

    logger.info("Router dispatched", session_id="abc123", intent="new_page")
    logger.debug("LLM input", messages=messages)
    logger.warning("LLM fallback triggered", reason="timeout")
    logger.error("Parse failed", error=str(e))
"""

import sys
import os

from loguru import logger as _loguru_logger

# Remove default loguru handler
_loguru_logger.remove()

# Determine log level from environment
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

# Define format: time | level | module:line | message | context
_LOG_FORMAT = (
    "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
    "<level>{level: <8}</level> | "
    "<cyan>{module}:{line}</cyan> | "
    "<level>{message}</level>"
    "{extra_str}"
)

def _format_extra(record) -> str:
    """Format extra context fields into a readable string."""
    extra = record.get("extra", {})
    if not extra:
        return ""
    parts = [f" | {k}={v}" for k, v in extra.items() if v is not None]
    return "".join(parts)


# Configure loguru with custom format
_loguru_logger.add(
    sys.stderr,
    format=_LOG_FORMAT,
    level=LOG_LEVEL,
    colorize=True,
    filter=lambda record: _format_extra(record) or True,
)

# Patch: inject extra_str into format string at runtime
# loguru doesn't support callable in format natively, so we use a simpler approach
_loguru_logger.remove()

_LOG_FORMAT_PLAIN = (
    "{time:YYYY-MM-DD HH:mm:ss.SSS} | "
    "{level: <8} | "
    "{module}:{line} | "
    "{message}"
)


class _ContextualLogger:
    """Wrapper around loguru logger that appends extra context to messages.

    This allows calling:
        logger.info("message", session_id="abc", user_id="123")

    Which produces output like:
        2026-04-22 17:00:00.000 | INFO     | module:10 | message | session_id=abc | user_id=123
    """

    def __init__(self, _logger):
        self._logger = _logger

    def _format_msg(self, msg: str, kwargs: dict) -> str:
        """Append extra context to message string."""
        extra = {k: v for k, v in kwargs.items() if k not in ("colorize",)}
        if extra:
            ctx = " | ".join(f"{k}={v}" for k, v in extra.items())
            return f"{msg} | {ctx}"
        return msg

    def debug(self, msg: str, **kwargs):
        self._logger.debug(self._format_msg(msg, kwargs))

    def info(self, msg: str, **kwargs):
        self._logger.info(self._format_msg(msg, kwargs))

    def warning(self, msg: str, **kwargs):
        self._logger.warning(self._format_msg(msg, kwargs))

    def error(self, msg: str, **kwargs):
        self._logger.error(self._format_msg(msg, kwargs))

    def critical(self, msg: str, **kwargs):
        self._logger.critical(self._format_msg(msg, kwargs))

    def exception(self, msg: str, **kwargs):
        self._logger.exception(self._format_msg(msg, kwargs))


# Add handler with plain format (no color codes in context string)
_loguru_logger.add(
    sys.stderr,
    format=_LOG_FORMAT_PLAIN,
    level=LOG_LEVEL,
    colorize=True,
)

# Export contextual logger
logger = _ContextualLogger(_loguru_logger)
