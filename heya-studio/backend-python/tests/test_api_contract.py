"""API 契约测试，确保前端主路径调用在 Python 后端可用。"""

from fastapi.testclient import TestClient

from src.main import app


client = TestClient(app)


def test_templates_contract_matches_frontend_shape():
    """模板列表和搜索返回前端服务层需要的字段。"""
    list_response = client.get("/api/templates?limit=2")
    assert list_response.status_code == 200
    list_data = list_response.json()
    assert "templates" in list_data
    assert "count" in list_data
    assert list_data["templates"]
    first = list_data["templates"][0]
    assert "templateConfig" in first
    assert "category" in first

    search_response = client.get("/api/templates/search?q=sakura&limit=2")
    assert search_response.status_code == 200
    search_data = search_response.json()
    assert "results" in search_data
    assert "query" in search_data
    assert "count" in search_data


def test_pages_contract_supports_local_save_load_cycle():
    """本地内存 Pages API 支撑前端保存、列表和更新。"""
    page_config = {
        "version": "1.0",
        "theme": {"id": "sakura"},
        "layout": {"width": 680},
        "components": [],
    }

    create_response = client.post(
        "/api/pages",
        json={"title": "测试主页", "pageConfig": page_config, "isPublic": True},
    )
    assert create_response.status_code == 200
    created = create_response.json()
    assert created["id"]
    assert created["page_config"] == page_config

    list_response = client.get("/api/pages?limit=20")
    assert list_response.status_code == 200
    assert list_response.json()["count"] >= 1

    update_response = client.put(
        f"/api/pages/{created['id']}",
        json={"title": "测试主页 v2", "isPublished": True},
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["title"] == "测试主页 v2"
    assert updated["is_published"] is True


def test_feedback_contract_accepts_frontend_payload():
    """反馈接口接受 AIChatPanel 提交的最小 payload。"""
    response = client.post(
        "/api/feedback",
        json={"session_id": "contract-session", "feedback_text": "ok"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == "contract-session"
    assert data["feedback_text"] == "ok"
