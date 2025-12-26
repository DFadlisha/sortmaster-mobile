# Supabase Database Setup Guide

This guide will help you set up your Supabase database from scratch for the SortMaster Mobile app.

## Step 1: Create a Supabase Account and Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up for a free account (or log in if you already have one)
3. Click **"New Project"**
4. Fill in the project details:
   - **Name**: `sortmaster-mobile` (or your preferred name)
   - **Database Password**: Create a strong password (save it securely!)
   - **Region**: Choose the closest region to your users
   - **Pricing Plan**: Free tier is fine for development
5. Click **"Create new project"** and wait for it to be ready (1-2 minutes)

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, click on **"Settings"** (gear icon) in the left sidebar
2. Click on **"API"** under Project Settings
3. Copy the following values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

## Step 3: Set Up Environment Variables

1. In your project root, create a file named `.env.local` (or `.env`)
2. Add the following content:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-public-key-here
```

Replace:
- `https://your-project-id.supabase.co` with your **Project URL** from Step 2
- `your-anon-public-key-here` with your **anon public** key from Step 2

**Important**: Never commit `.env.local` to Git! It should already be in `.gitignore`.

## Step 4: Run Database Migrations

You have two options to run the migrations:

### Option A: Using Supabase Dashboard SQL Editor (Easiest)

1. In your Supabase dashboard, go to **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Run each migration file **in order**:

#### Migration 1: Create Tables
Copy and paste the contents of `supabase/migrations/20251117135218_e084c3c6-eb39-41a4-8bd9-7c0d20d0d6a4.sql` and click **"Run"**

#### Migration 2: Enable Realtime
Copy and paste the contents of `supabase/migrations/20251117135430_36ff5131-18ff-4214-a3d3-c68c50e6fc4f.sql` and click **"Run"**

#### Migration 3: Add Image URL Column
Copy and paste the contents of `supabase/migrations/20251117140000_add_reject_image_url.sql` and click **"Run"**

#### Migration 4: Create Storage Bucket
Copy and paste the contents of `supabase/migrations/20251117140100_create_storage_bucket.sql` and click **"Run"**

#### Migration 5: Add Operator Tracking & Hourly Output View
Copy and paste the contents of `supabase/migrations/20251117141000_add_operator_tracking.sql` and click **"Run"**

### Option B: Using Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run all migrations
supabase db push
```

## Step 5: Verify Database Setup

1. Go to **"Table Editor"** in your Supabase dashboard
2. You should see two tables:
   - `parts_master` - with 10 sample parts
   - `sorting_logs` - empty table with columns including `reject_image_url`
3. Click on `sorting_logs` to verify it has these columns:
   - `id`
   - `part_no`
   - `part_name`
   - `quantity_all_sorting`
   - `quantity_ng`
   - `reject_image_url` ✅
   - `logged_at`
   - `created_at`

## Step 6: Verify Storage Bucket

1. Go to **"Storage"** in your Supabase dashboard
2. You should see a bucket named **"reject-images"**
3. Click on it to verify:
   - It's **Public** (should show a green checkmark)
   - File size limit: 5MB
   - Allowed types: image/jpeg, image/jpg, image/png, image/webp

If the bucket doesn't exist:
- Go back to SQL Editor
- Re-run the storage bucket migration
- Or manually create it:
  1. Click **"New bucket"**
  2. Name: `reject-images`
  3. Make it **Public**
  4. Click **"Create bucket"**
  5. Go to **"Policies"** tab and add these policies:
     - Policy 1 (SELECT): `Public can view reject images` - Allow SELECT for public
     - Policy 2 (INSERT): `Anyone can upload reject images` - Allow INSERT for public

## Step 7: Test the Connection

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your app in the browser
3. Try navigating to the Scan page
4. The app should connect to Supabase without errors

## Troubleshooting

### "Missing environment variables" error
- Check that `.env.local` file exists in the project root
- Verify the variable names are exactly: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- Restart your dev server after creating/modifying `.env.local`

### "Failed to fetch" or connection errors
- Verify your Supabase URL and key are correct
- Check that your Supabase project is active (not paused)
- Ensure there are no typos in the `.env.local` file

### Storage upload fails
- Verify the `reject-images` bucket exists
- Check that storage policies allow public access
- Ensure the bucket is set to Public

### Migration errors
- Run migrations in the correct order (by timestamp)
- If a table already exists, you may need to drop it first (be careful!)
- Check the Supabase dashboard for specific error messages

## Next Steps

Once your database is set up:
1. ✅ Your app can now log sorting data
2. ✅ Images can be uploaded for rejects
3. ✅ You can view data in the Dashboard
4. ✅ Parts master data is pre-populated with 10 sample parts

## Sample Data

The migration includes 10 sample parts. You can test with these part numbers:
- `P001-A123`
- `P002-B456`
- `P003-C789`
- `P004-D012`
- `P005-E345`
- `P006-F678`
- `P007-G901`
- `P008-H234`
- `P009-I567`
- `P010-J890`

Or add your own parts in the Supabase Table Editor!

