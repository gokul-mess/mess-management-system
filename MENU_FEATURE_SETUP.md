# Menu Photo Feature - Setup Guide

## Database Setup

1. **Run the SQL migration** in your Supabase SQL Editor:
   ```bash
   # Execute the file: supabase/menu_settings.sql
   ```

2. **Create Storage Bucket** in Supabase Dashboard:
   - Go to Storage section
   - Create a new bucket named: `menu-photos`
   - Set it to **Public** access
   - Enable file upload

## Features Added

### For Owners (Settings Panel):
- Upload/update daily menu photo
- Remove menu photo
- Real-time preview
- Automatic storage management

### For Students (Dashboard):
- View today's menu card
- Click to view full-screen
- Real-time updates when owner changes menu
- Auto-hide when no menu is uploaded

## Usage

### Owner:
1. Go to Settings → General tab
2. Find "Mess Menu Photo" section
3. Click to upload or drag & drop image
4. Menu appears instantly on all student dashboards

### Student:
1. Menu card appears automatically on dashboard
2. Click card to view full-size image
3. Updates in real-time when owner changes menu

## Technical Details

- **Storage**: Supabase Storage (`menu-photos` bucket)
- **Database**: `mess_settings` table with `menu_photo_url` column
- **Real-time**: Postgres changes subscription for instant updates
- **File Types**: All image formats (jpg, png, webp, etc.)
