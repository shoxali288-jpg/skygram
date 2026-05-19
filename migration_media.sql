ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url text;

-- Storage policies for media bucket
CREATE POLICY IF NOT EXISTS "media_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media');

CREATE POLICY IF NOT EXISTS "media_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

CREATE POLICY IF NOT EXISTS "media_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'media');
