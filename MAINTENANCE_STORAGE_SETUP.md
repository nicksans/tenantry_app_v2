# Maintenance Photos Storage Setup

## Step 1: Create Storage Bucket in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Set the following:
   - **Name**: `maintenance-photos`
   - **Public bucket**: ✅ Enable (so photos can be viewed)
   - Click **"Create bucket"**

## Step 2: Set Up Storage Policies (Optional but Recommended)

If you want to restrict who can upload/view photos, you can set up policies. For now, since it's a public bucket, anyone can view photos, but only authenticated users can upload.

To add policies:
1. Click on the `maintenance-photos` bucket
2. Click **"Policies"** tab
3. Add these policies:

### Upload Policy (INSERT)
```sql
CREATE POLICY "Users can upload maintenance photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'maintenance-photos');
```

### View Policy (SELECT)
```sql
CREATE POLICY "Anyone can view maintenance photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'maintenance-photos');
```

### Delete Policy (DELETE)
```sql
CREATE POLICY "Users can delete their own maintenance photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'maintenance-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
```

## How Photos Work

### Upload Process:
1. When a user submits a maintenance request with photos:
   - Each photo is uploaded to Supabase Storage in the `maintenance-photos` bucket
   - Files are organized by user ID: `{user_id}/{timestamp}-{random}.{extension}`
   - The public URLs are stored in the database in the `photos` column (TEXT[] array)

### Display:
- Photos are displayed as thumbnails (80x80px) in the maintenance request card
- Clicking a photo opens it in a new tab at full size
- Photos are horizontally scrollable if there are many

### Webhook:
The n8n webhook receives:
- `photo_urls` - JSON array of all photo URLs in Supabase Storage
- `photo_0`, `photo_1`, etc. - The actual binary files
- `photo_count` - Number of photos attached

## Storage Organization

Files are stored with this structure:
```
maintenance-photos/
  ├── {user-id-1}/
  │   ├── 1699123456789-abc123.jpg
  │   ├── 1699123457890-def456.png
  │   └── ...
  ├── {user-id-2}/
  │   └── ...
```

This keeps each user's photos organized in their own folder.

## Notes
- Photos are stored permanently in Supabase Storage
- The `photos` field in the database only stores URLs, not the actual files
- If you delete a maintenance request, the photos remain in storage (you may want to add cleanup logic later)
- Maximum file size depends on your Supabase plan (default is usually 50MB per file)

