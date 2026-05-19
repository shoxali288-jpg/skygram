ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url text;

-- Storage policies for media bucket
DROP POLICY IF EXISTS "media_insert" ON storage.objects;
CREATE POLICY "media_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media');

DROP POLICY IF EXISTS "media_select" ON storage.objects;
CREATE POLICY "media_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

DROP POLICY IF EXISTS "media_delete" ON storage.objects;
CREATE POLICY "media_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'media');
