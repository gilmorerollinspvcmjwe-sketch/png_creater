-- 003_templates.sql
-- Templates table with vector embeddings for similarity search

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  tags TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  preview_url TEXT,
  template_config JSONB NOT NULL DEFAULT '{}',
  is_official BOOLEAN DEFAULT false,
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  use_count INTEGER DEFAULT 0,
  rating_average DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  embedding vector(1536), -- OpenAI ada-002 embedding dimension
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_is_official ON templates(is_official);
CREATE INDEX IF NOT EXISTS idx_templates_creator_id ON templates(creator_id);
CREATE INDEX IF NOT EXISTS idx_templates_tags ON templates USING GIN (tags);

-- Vector similarity index (IVFFlat for approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS idx_templates_embedding ON templates
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Trigger for updated_at
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- All templates are readable by everyone
CREATE POLICY "Templates readable by all" ON templates
  FOR SELECT USING (true);

-- Only admins can create official templates (handled via service role)
-- Creators can create their own templates
CREATE POLICY "Users can create templates" ON templates
  FOR INSERT WITH CHECK (auth.uid() = creator_id OR creator_id IS NULL);

-- Creators can update their own templates
CREATE POLICY "Users can update own templates" ON templates
  FOR UPDATE USING (auth.uid() = creator_id);

-- Creators can delete their own templates
CREATE POLICY "Users can delete own templates" ON templates
  FOR DELETE USING (auth.uid() = creator_id);

-- Function to search templates by vector similarity
CREATE OR REPLACE FUNCTION search_templates(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  description TEXT,
  category VARCHAR(50),
  tags TEXT[],
  thumbnail_url TEXT,
  template_config JSONB,
  similarity FLOAT
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.description,
    t.category,
    t.tags,
    t.thumbnail_url,
    t.template_config,
    1 - (t.embedding <=> query_embedding) AS similarity
  FROM templates t
  WHERE 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Function to increment use count
CREATE OR REPLACE FUNCTION increment_template_use(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE templates SET use_count = use_count + 1 WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE templates IS 'Page templates with vector embeddings for similarity search';
COMMENT ON COLUMN templates.template_config IS 'Complete JSON configuration for the template';
COMMENT ON COLUMN templates.embedding IS 'Vector embedding for semantic similarity search';
COMMENT ON COLUMN templates.category IS 'Template category: style, scene, mood, etc.';