-- 004_assets.sql
-- Assets table for user uploads and system assets

-- Asset types enum
CREATE TYPE asset_type AS ENUM (
  'background',
  'decoration',
  'icon',
  'sticker',
  'divider',
  'font',
  'music',
  'other'
);

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type asset_type NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  storage_path VARCHAR(500),
  file_size INTEGER,
  mime_type VARCHAR(100),
  width INTEGER,
  height INTEGER,
  tags TEXT[] DEFAULT '{}',
  is_premium BOOLEAN DEFAULT false,
  is_official BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_tags ON assets USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_assets_is_official ON assets(is_official);
CREATE INDEX IF NOT EXISTS idx_assets_is_premium ON assets(is_premium);

-- Trigger for updated_at
CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Official assets are readable by everyone
CREATE POLICY "Official assets readable by all" ON assets
  FOR SELECT USING (is_official = true);

-- Users can read their own assets
CREATE POLICY "Users can read own assets" ON assets
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create assets
CREATE POLICY "Users can create assets" ON assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update own assets
CREATE POLICY "Users can update own assets" ON assets
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete own assets
CREATE POLICY "Users can delete own assets" ON assets
  FOR DELETE USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE assets IS 'User and system assets (images, icons, decorations)';
COMMENT ON COLUMN assets.storage_path IS 'Path in Supabase Storage bucket';
COMMENT ON COLUMN assets.metadata IS 'Additional metadata like dominant colors, animation properties';

-- Asset collections (for grouping related assets)
CREATE TABLE IF NOT EXISTS asset_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asset collection items (many-to-many)
CREATE TABLE IF NOT EXISTS asset_collection_items (
  collection_id UUID REFERENCES asset_collections(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (collection_id, asset_id)
);

-- Indexes for collections
CREATE INDEX IF NOT EXISTS idx_asset_collection_items_asset ON asset_collection_items(asset_id);