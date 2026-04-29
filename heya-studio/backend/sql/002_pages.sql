-- 002_pages.sql
-- Pages table for storing user homepage configurations

-- Pages table
CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT 'My Page',
  slug VARCHAR(100) UNIQUE NOT NULL,
  page_config JSONB NOT NULL DEFAULT '{}',
  theme_id VARCHAR(50),
  is_public BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  password_hash VARCHAR(255),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pages_user_id ON pages(user_id);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_is_public ON pages(is_public);
CREATE INDEX IF NOT EXISTS idx_pages_theme_id ON pages(theme_id);

-- Full-text search on page_config
CREATE INDEX IF NOT EXISTS idx_pages_config_search ON pages USING GIN (page_config);

-- Trigger for updated_at
CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Users can read their own pages
CREATE POLICY "Users can read own pages" ON pages
  FOR SELECT USING (auth.uid() = user_id);

-- Public pages are readable by all
CREATE POLICY "Public pages readable by all" ON pages
  FOR SELECT USING (is_public = true AND is_published = true);

-- Users can create pages
CREATE POLICY "Users can create pages" ON pages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update own pages
CREATE POLICY "Users can update own pages" ON pages
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete own pages
CREATE POLICY "Users can delete own pages" ON pages
  FOR DELETE USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE pages IS 'User homepage configurations';
COMMENT ON COLUMN pages.page_config IS 'Complete JSON configuration for the page layout, components, styles';
COMMENT ON COLUMN pages.slug IS 'URL slug for the page (e.g., username.heya.studio/s/slug)';
COMMENT ON COLUMN pages.password_hash IS 'Optional password protection hash';

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_page_view(page_slug VARCHAR)
RETURNS void AS $$
BEGIN
  UPDATE pages SET view_count = view_count + 1 WHERE slug = page_slug;
END;
$$ LANGUAGE plpgsql;