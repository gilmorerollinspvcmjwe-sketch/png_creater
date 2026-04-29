"""Human-in-the-loop interrupt mechanism.

Tier 3 改进项 #5: 实现人机交互中断（简化版）
- InterruptPoint: 中断点数据模型
- InterruptStore: 中断点存储（内存 + 可选 Redis）
- 在生成配置后，允许用户确认或修改，再继续
"""

import os
import json
import uuid
from typing import Optional, Dict, Any, List, Literal
from datetime import datetime
from pydantic import BaseModel, Field


class InterruptPoint(BaseModel):
    """中断点数据模型。
    
    在生成配置后创建，等待用户确认或修改。
    
    Attributes:
        id: 唯一标识符
        session_id: 关联的会话 ID
        stage: 中断阶段 - preview(预览) / confirm(确认) / modify(修改)
        data: 当前生成的配置摘要
        status: 状态 - pending(等待中) / approved(已批准) / rejected(已拒绝)
        modifications: 用户的修改内容（rejected 时使用）
        reason: 拒绝原因
        created_at: 创建时间
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    stage: Literal["preview", "confirm", "modify"] = "preview"
    data: Dict[str, Any] = Field(default_factory=dict)
    status: Literal["pending", "approved", "rejected"] = "pending"
    modifications: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)


class InterruptConfirmRequest(BaseModel):
    """API 请求模型：确认/拒绝中断点。"""
    action: Literal["approve", "reject"]
    modifications: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None


class InterruptStore:
    """中断点存储（内存 + 可选 Redis）。
    
    管理生成过程中的中断点，支持创建、查询、确认、拒绝。
    """
    
    def __init__(self, use_redis: bool = False, redis_url: Optional[str] = None):
        self.use_redis = use_redis
        self.redis_url = redis_url
        self._interrupts: Dict[str, List[InterruptPoint]] = {}  # session_id -> [InterruptPoint]
        self._by_id: Dict[str, InterruptPoint] = {}  # interrupt_id -> InterruptPoint
        self._redis = None
        
        if use_redis and redis_url:
            self._init_redis()
    
    def _init_redis(self):
        """Initialize Redis connection."""
        try:
            import redis
            self._redis = redis.from_url(self.redis_url)
        except (ImportError, Exception):
            self.use_redis = False
            self._redis = None
    
    def create_interrupt(
        self,
        session_id: str,
        stage: str = "preview",
        data: Optional[Dict[str, Any]] = None
    ) -> InterruptPoint:
        """创建中断点。
        
        Args:
            session_id: 会话 ID
            stage: 中断阶段
            data: 配置摘要数据
            
        Returns:
            创建的 InterruptPoint
        """
        interrupt = InterruptPoint(
            session_id=session_id,
            stage=stage,
            data=data or {},
        )
        
        if self.use_redis and self._redis:
            key = f"interrupt:{session_id}"
            self._redis.rpush(key, json.dumps(interrupt.model_dump(), default=str))
            self._redis.expire(key, 86400)  # 24h TTL
            self._redis.set(f"interrupt:id:{interrupt.id}", json.dumps(interrupt.model_dump(), default=str))
            self._redis.expire(f"interrupt:id:{interrupt.id}", 86400)
        else:
            if session_id not in self._interrupts:
                self._interrupts[session_id] = []
            self._interrupts[session_id].append(interrupt)
            self._by_id[interrupt.id] = interrupt
        
        return interrupt
    
    def get_pending(self, session_id: str) -> Optional[InterruptPoint]:
        """获取指定 session 的待确认中断点。
        
        返回最新的 pending 状态中断点。
        """
        if self.use_redis and self._redis:
            key = f"interrupt:{session_id}"
            items = self._redis.lrange(key, 0, -1)
            for item in reversed(items):
                ip = InterruptPoint(**json.loads(item))
                if ip.status == "pending":
                    return ip
            return None
        else:
            interrupts = self._interrupts.get(session_id, [])
            for ip in reversed(interrupts):
                if ip.status == "pending":
                    return ip
            return None
    
    def approve(
        self,
        interrupt_id: str,
        modifications: Optional[Dict[str, Any]] = None
    ) -> Optional[InterruptPoint]:
        """批准中断点。
        
        Args:
            interrupt_id: 中断点 ID
            modifications: 可选的修改内容
            
        Returns:
            更新后的 InterruptPoint，如果不存在返回 None
        """
        interrupt = self._get_by_id(interrupt_id)
        if not interrupt:
            return None
        
        interrupt.status = "approved"
        if modifications:
            interrupt.modifications = modifications
        
        self._save(interrupt)
        return interrupt
    
    def reject(
        self,
        interrupt_id: str,
        reason: Optional[str] = None
    ) -> Optional[InterruptPoint]:
        """拒绝中断点。
        
        Args:
            interrupt_id: 中断点 ID
            reason: 拒绝原因
            
        Returns:
            更新后的 InterruptPoint，如果不存在返回 None
        """
        interrupt = self._get_by_id(interrupt_id)
        if not interrupt:
            return None
        
        interrupt.status = "rejected"
        if reason:
            interrupt.reason = reason
        
        self._save(interrupt)
        return interrupt
    
    def get_history(self, session_id: str) -> List[InterruptPoint]:
        """获取指定 session 的所有中断点历史。"""
        if self.use_redis and self._redis:
            key = f"interrupt:{session_id}"
            items = self._redis.lrange(key, 0, -1)
            return [InterruptPoint(**json.loads(item)) for item in items]
        else:
            return self._interrupts.get(session_id, [])
    
    def _get_by_id(self, interrupt_id: str) -> Optional[InterruptPoint]:
        """根据 ID 获取中断点。"""
        if self.use_redis and self._redis:
            data = self._redis.get(f"interrupt:id:{interrupt_id}")
            if data:
                return InterruptPoint(**json.loads(data))
            return None
        else:
            return self._by_id.get(interrupt_id)
    
    def _save(self, interrupt: InterruptPoint):
        """保存更新后的中断点。"""
        if self.use_redis and self._redis:
            self._redis.set(
                f"interrupt:id:{interrupt.id}",
                json.dumps(interrupt.model_dump(), default=str)
            )
            self._redis.expire(f"interrupt:id:{interrupt.id}", 86400)
        else:
            self._by_id[interrupt.id] = interrupt


# Global interrupt store instance
_interrupt_store: Optional[InterruptStore] = None


def get_interrupt_store() -> InterruptStore:
    """Get or create the global InterruptStore instance."""
    global _interrupt_store
    if _interrupt_store is None:
        redis_url = os.environ.get("INTERRUPT_STORE_REDIS_URL")
        _interrupt_store = InterruptStore(
            use_redis=bool(redis_url),
            redis_url=redis_url
        )
    return _interrupt_store
