"""Session memory management.

Tier 3 改进项 #1: 修复 datetime.now() 默认值 Bug
- created_at/updated_at 已使用 Field(default_factory=datetime.now)
- 避免所有 Session 实例共享同一个创建时间戳
"""

import json
import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class SessionState(str, Enum):
    """Conversation state."""
    INITIAL = "initial"
    COLLECTING = "collecting"
    CONFIRMING = "confirming"
    GENERATING = "generating"
    PREVIEW = "preview"
    ITERATING = "iterating"
    DONE = "done"


class SessionMessage(BaseModel):
    """Session message."""
    role: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)


class Session(BaseModel):
    """Session data."""
    id: str
    state: SessionState = SessionState.INITIAL
    messages: List[SessionMessage] = []
    extracted_profile: Dict[str, Any] = {}
    current_config: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    def add_message(self, role: str, content: str):
        """Add message to session."""
        self.messages.append(SessionMessage(role=role, content=content))
        self.updated_at = datetime.now()
    
    def get_profile(self) -> Dict[str, Any]:
        """Get extracted profile."""
        return self.extracted_profile
    
    def save_profile(self, profile: Dict[str, Any]):
        """Save profile."""
        self.extracted_profile = profile
        self.updated_at = datetime.now()
    
    def get_config(self) -> Optional[Dict[str, Any]]:
        """Get current config."""
        return self.current_config
    
    def save_config(self, config: Dict[str, Any]):
        """Save current config."""
        self.current_config = config
        self.updated_at = datetime.now()


class SessionMemory:
    """Session memory store (Redis or in-memory)."""
    
    def __init__(self, use_redis: bool = False, redis_url: str = None):
        self.use_redis = use_redis
        self.redis_url = redis_url
        self._sessions: Dict[str, Session] = {}
        self._redis = None
        
        if use_redis:
            self._init_redis()
    
    def _init_redis(self):
        """Initialize Redis connection."""
        try:
            import redis
            self._redis = redis.from_url(self.redis_url)
        except ImportError:
            self.use_redis = False
            self._redis = None
    
    def create_session(self, session_id: Optional[str] = None) -> Session:
        """Create new session."""
        id = session_id or str(uuid.uuid4())
        session = Session(id=id)
        
        if self.use_redis and self._redis:
            self._redis.setex(
                f"session:{id}",
                86400,  # 24 hours TTL
                json.dumps(session.model_dump(), default=str)
            )
        else:
            self._sessions[id] = session
        
        return session
    
    def get_session(self, session_id: str) -> Optional[Session]:
        """Get session by ID."""
        if self.use_redis and self._redis:
            data = self._redis.get(f"session:{session_id}")
            if data:
                return Session(**json.loads(data))
            return None
        else:
            return self._sessions.get(session_id)
    
    def save_session(self, session: Session):
        """Save session."""
        session.updated_at = datetime.now()
        
        if self.use_redis and self._redis:
            self._redis.setex(
                f"session:{session.id}",
                86400,
                json.dumps(session.model_dump(), default=str)
            )
        else:
            self._sessions[session.id] = session
    
    def get_conversation_history(self, session_id: str, limit: int = 10) -> List[dict]:
        """Get recent conversation history."""
        session = self.get_session(session_id)
        if not session:
            return []
        
        messages = session.messages[-limit:]
        return [{"role": m.role, "content": m.content} for m in messages]
    
    def update_state(self, session_id: str, state: SessionState):
        """Update session state."""
        session = self.get_session(session_id)
        if session:
            session.state = state
            self.save_session(session)
    
    def clear_session(self, session_id: str):
        """Clear session."""
        if self.use_redis and self._redis:
            self._redis.delete(f"session:{session_id}")
        else:
            self._sessions.pop(session_id, None)


# Global session memory instance
session_memory: Optional[SessionMemory] = None


def get_session_memory() -> SessionMemory:
    """Get session memory instance."""
    global session_memory
    if session_memory is None:
        from ..config import config
        session_memory = SessionMemory(
            use_redis=config.redis.enabled,
            redis_url=config.redis.url
        )
    return session_memory