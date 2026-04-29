"""Guestbook tool for visitor messages."""

from typing import List, Optional, Dict
from datetime import datetime
from pydantic import BaseModel, Field
from .base import BaseTool, ToolType, ToolPermission


class GuestbookMessage(BaseModel):
    """A guestbook message."""
    id: str = Field(..., description="留言ID")
    author: str = Field(..., description="留言者昵称")
    avatar: Optional[str] = Field(None, description="留言者头像URL")
    content: str = Field(..., description="留言内容")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat(), description="留言时间")
    is_owner_reply: bool = Field(default=False, description="是否为主人回复")
    reply_to: Optional[str] = Field(None, description="回复的留言ID")


class AddMessageInput(BaseModel):
    """Input for adding a guestbook message."""
    page_id: str = Field(..., description="页面ID")
    author: str = Field(..., description="留言者昵称")
    content: str = Field(..., description="留言内容")
    avatar: Optional[str] = Field(None, description="留言者头像URL")
    is_owner_reply: bool = Field(default=False, description="是否为主人回复")
    reply_to: Optional[str] = Field(None, description="回复的留言ID")


class AddMessageOutput(BaseModel):
    """Output for adding a guestbook message."""
    message: GuestbookMessage
    success: bool


class GetMessagesInput(BaseModel):
    """Input for getting guestbook messages."""
    page_id: str = Field(..., description="页面ID")
    limit: int = Field(default=50, description="最大返回数量")
    offset: int = Field(default=0, description="偏移量")


class GetMessagesOutput(BaseModel):
    """Output for getting guestbook messages."""
    page_id: str
    messages: List[GuestbookMessage]
    total: int


class DeleteMessageInput(BaseModel):
    """Input for deleting a guestbook message."""
    page_id: str = Field(..., description="页面ID")
    message_id: str = Field(..., description="留言ID")


class DeleteMessageOutput(BaseModel):
    """Output for deleting a guestbook message."""
    success: bool
    message: str


# 内存存储（Mock 模式）
_guestbook_store: Dict[str, List[GuestbookMessage]] = {}


def _get_page_messages(page_id: str) -> List[GuestbookMessage]:
    """Get or create message list for a page."""
    if page_id not in _guestbook_store:
        # 初始化一些示例留言
        _guestbook_store[page_id] = [
            GuestbookMessage(
                id="msg-1",
                author="小樱花",
                avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=sakura",
                content="主页好可爱呀！设计很有感觉 ✨",
                timestamp="2024-01-15T10:30:00",
                is_owner_reply=False
            ),
            GuestbookMessage(
                id="msg-2",
                author="主人",
                avatar=None,
                content="谢谢喜欢！欢迎常来玩~",
                timestamp="2024-01-15T12:00:00",
                is_owner_reply=True,
                reply_to="msg-1"
            ),
            GuestbookMessage(
                id="msg-3",
                author="星空旅人",
                avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=star",
                content="推的番剧好有品味，芙莉莲确实神作！",
                timestamp="2024-01-16T08:45:00",
                is_owner_reply=False
            ),
            GuestbookMessage(
                id="msg-4",
                author="夜猫子",
                avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=night",
                content="音乐播放器好喜欢，BGM是什么呀？",
                timestamp="2024-01-17T02:30:00",
                is_owner_reply=False
            ),
        ]
    return _guestbook_store[page_id]


def _generate_message_id() -> str:
    """Generate a unique message ID."""
    return f"msg-{datetime.now().strftime('%Y%m%d%H%M%S')}-{id(object()) % 10000}"


class AddGuestbookMessageTool(BaseTool[AddMessageInput, AddMessageOutput]):
    """Tool for adding a guestbook message."""
    
    name = "add_guestbook_message"
    description = "添加留言板消息"
    tool_type = ToolType.WRITE
    permission = ToolPermission.PUBLIC
    
    async def execute(self, input_data: AddMessageInput) -> AddMessageOutput:
        """Add a message to guestbook."""
        messages = _get_page_messages(input_data.page_id)
        
        new_message = GuestbookMessage(
            id=_generate_message_id(),
            author=input_data.author,
            avatar=input_data.avatar,
            content=input_data.content,
            timestamp=datetime.now().isoformat(),
            is_owner_reply=input_data.is_owner_reply,
            reply_to=input_data.reply_to
        )
        
        messages.append(new_message)
        
        return AddMessageOutput(
            message=new_message,
            success=True
        )
    
    def get_input_schema(self) -> type[AddMessageInput]:
        return AddMessageInput
    
    def get_output_schema(self) -> type[AddMessageOutput]:
        return AddMessageOutput


class GetGuestbookMessagesTool(BaseTool[GetMessagesInput, GetMessagesOutput]):
    """Tool for getting guestbook messages."""
    
    name = "get_guestbook_messages"
    description = "获取留言板消息列表"
    tool_type = ToolType.READ
    permission = ToolPermission.PUBLIC
    
    async def execute(self, input_data: GetMessagesInput) -> GetMessagesOutput:
        """Get messages from guestbook."""
        messages = _get_page_messages(input_data.page_id)
        
        # 按时间倒序排列
        sorted_messages = sorted(
            messages,
            key=lambda m: m.timestamp,
            reverse=True
        )
        
        # 分页
        paginated = sorted_messages[input_data.offset:input_data.offset + input_data.limit]
        
        return GetMessagesOutput(
            page_id=input_data.page_id,
            messages=paginated,
            total=len(messages)
        )
    
    def get_input_schema(self) -> type[GetMessagesInput]:
        return GetMessagesInput
    
    def get_output_schema(self) -> type[GetMessagesOutput]:
        return GetMessagesOutput


class DeleteGuestbookMessageTool(BaseTool[DeleteMessageInput, DeleteMessageOutput]):
    """Tool for deleting a guestbook message."""
    
    name = "delete_guestbook_message"
    description = "删除留言板消息"
    tool_type = ToolType.WRITE
    permission = ToolPermission.AUTHENTICATED  # 需要登录才能删除
    
    async def execute(self, input_data: DeleteMessageInput) -> DeleteMessageOutput:
        """Delete a message from guestbook."""
        messages = _get_page_messages(input_data.page_id)
        
        for i, msg in enumerate(messages):
            if msg.id == input_data.message_id:
                messages.pop(i)
                return DeleteMessageOutput(
                    success=True,
                    message="留言已删除"
                )
        
        return DeleteMessageOutput(
            success=False,
            message="留言不存在"
        )
    
    def get_input_schema(self) -> type[DeleteMessageInput]:
        return DeleteMessageInput
    
    def get_output_schema(self) -> type[DeleteMessageOutput]:
        return DeleteMessageOutput