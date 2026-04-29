-- 005_agent_sessions.sql
-- Agent sessions for tracking AI conversations

-- Agent session status enum
CREATE TYPE agent_session_status AS ENUM (
  'active',
  'completed',
  'cancelled',
  'failed'
);

-- Agent sessions table
CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  status agent_session_status DEFAULT 'active',
  messages JSONB NOT NULL DEFAULT '[]',        -- JSON array of conversation messages
  current_config JSONB DEFAULT '{}',
  tool_calls JSONB NOT NULL DEFAULT '[]',       -- JSON array of tool call records
  model_used VARCHAR(50),
  total_tokens INTEGER DEFAULT 0,
  total_cost_usd DECIMAL(10,6) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_sessions_user_id ON agent_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_page_id ON agent_sessions(page_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_created_at ON agent_sessions(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_agent_sessions_updated_at
  BEFORE UPDATE ON agent_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read their own sessions
CREATE POLICY "Users can read own sessions" ON agent_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create sessions
CREATE POLICY "Users can create sessions" ON agent_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update own sessions
CREATE POLICY "Users can update own sessions" ON agent_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE agent_sessions IS 'AI Agent conversation sessions';
COMMENT ON COLUMN agent_sessions.messages IS 'Array of conversation messages with role and content';
COMMENT ON COLUMN agent_sessions.current_config IS 'Current page configuration being built';
COMMENT ON COLUMN agent_sessions.tool_calls IS 'History of tool calls made during the session';
COMMENT ON COLUMN agent_sessions.metadata IS 'Session metadata like user intent, extracted entities';

-- Agent tool calls log (for analytics and debugging)
CREATE TABLE IF NOT EXISTS agent_tool_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  tool_name VARCHAR(100) NOT NULL,
  tool_input JSONB NOT NULL,
  tool_output JSONB,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  duration_ms INTEGER,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_tool_logs_session_id ON agent_tool_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_tool_logs_tool_name ON agent_tool_logs(tool_name);
CREATE INDEX IF NOT EXISTS idx_agent_tool_logs_created_at ON agent_tool_logs(created_at DESC);

-- Agent feedback (for improving AI)
CREATE TABLE IF NOT EXISTS agent_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  final_config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_feedback_session_id ON agent_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_feedback_user_id ON agent_feedback(user_id);