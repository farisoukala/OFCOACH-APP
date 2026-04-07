-- ============================================================
-- OfCoach – Corrige RLS Storage avatars (2e changement de photo)
-- Remplace storage.foldername(name) par split_part (plus fiable selon environnements).
-- Exécuter dans Supabase → SQL Editor après supabase_migration_storage_avatars.sql
-- ============================================================

DROP POLICY IF EXISTS "Avatars insert own folder" ON storage.objects;
CREATE POLICY "Avatars insert own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "Avatars update own folder" ON storage.objects;
CREATE POLICY "Avatars update own folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "Avatars delete own folder" ON storage.objects;
CREATE POLICY "Avatars delete own folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
