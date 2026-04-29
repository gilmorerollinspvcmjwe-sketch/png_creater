"""Basic tests for Heya Studio Backend."""

import pytest
from src.main import app
from src.config import config
from src.models.page import BackendPageConfig, create_default_page_config
from src.models.profile import UserProfile
from src.memory.session import SessionMemory, Session, SessionState


@pytest.fixture
def session_memory():
    """Create session memory."""
    return SessionMemory(use_redis=False)


def test_config():
    """Test configuration."""
    assert isinstance(config.llm.mock, bool)
    assert config.security.max_components > 0
    assert config.security.max_components <= 20


def test_session_memory(session_memory):
    """Test session memory."""
    # Create session
    session = session_memory.create_session()
    assert session.id is not None
    assert session.state == SessionState.INITIAL
    
    # Add message
    session.add_message("user", "你好")
    assert len(session.messages) == 1
    
    # Save and retrieve
    session_memory.save_session(session)
    retrieved = session_memory.get_session(session.id)
    assert retrieved is not None
    assert len(retrieved.messages) == 1


def test_default_page_config():
    """Test default page config."""
    config = create_default_page_config(theme_id="sakura", title="测试主页")
    
    assert config.version == "1.0"
    assert config.theme.id == "sakura"
    assert config.layout.width == 680
    assert len(config.components) > 0


def test_user_profile():
    """Test user profile."""
    profile = UserProfile(
        oshi=[{"name": "测试推", "from_work": "测试作品"}],
        personality={"mbti": "INFP"},
        interests={"hobbies": ["看动漫", "听音乐"]}
    )
    
    assert len(profile.oshi) == 1
    assert profile.is_incomplete() == False


@pytest.mark.asyncio
async def test_mock_chat():
    """Test mock chat flow."""
    from src.llm.client import MockLLMClient, Message
    
    client = MockLLMClient()
    
    messages = [
        Message(role="user", content="帮我生成一个樱花风的主页")
    ]
    
    response = await client.chat(messages)
    assert response.content is not None
    assert "intent" in response.content


# Run with: pytest tests/test_agent.py