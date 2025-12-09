# Archive Folder

This folder contains old, backup, and deprecated files that are no longer actively used but are kept for reference.

**Archived on:** December 9, 2025

## Contents

### Root Files
- `WHATS_NEW.txt` - Development notes from a previous implementation session
- `sitemap-static.xml` - Original static sitemap (replaced by dynamic `/api/sitemap.xml`)

### js/
- `app-backup.js` - Backup of the main application file

### database/
Diagnostic and check scripts that were used during development:
- `00_DIAGNOSTIC_CHECK.sql` - Database diagnostic queries
- `CHECK_TABLES.sql` - Table verification script
- `CHECK_TRIGGER_ONLY.sql` - Trigger verification
- `QUICK_FIX_add_missing_columns.sql` - One-time migration fix
- `08_BACKFILL_USERS.sql` - User data backfill script
- `09_VERIFY_USER_SETUP.sql` - User setup verification
- `10_CHECK_CLIENT_RECORDS.sql` - Client records check
- `12_CHECK_EMAIL_SETTINGS.sql` - Email settings check
- `FIX_RLS_POLICY.sql` - RLS policy fix script
- `fix-storage-rls.sql` - Storage RLS fix

### old-docs/
Previous session notes and documentation (superseded by `/docs/`):
- `API_DOCUMENTATION.md` - Old API docs (now in ARCHITECTURE.md)
- `COMPLETE_PRODUCTION_FEATURES.md` - Old feature list (now in FEATURES.md)
- `IMPLEMENTATION_SUMMARY.md` - Session notes
- `LATEST_UPDATE.md` - Session notes
- `OVERNIGHT_IMPROVEMENT_PLAN.md` - Old dev planning
- `OVERNIGHT_PROGRESS_SUMMARY.md` - Session notes
- `OVERNIGHT_WORK_SUMMARY.md` - Session notes
- `PRODUCTION_READY_SUMMARY.md` - Session notes
- `SESSION_NOTES_GUIDE.md` - Session docs
- `SESSION_NOTES_NOV26.md` - Session notes
- `STORAGE_UPLOAD_FIX.md` - Fix documentation
- `SUPABASE_QUICK_FIX.md` - Fix documentation
- `SUPABASE_SETUP_COMPLETE.md` - Setup notes
- `SUPABASE_SETUP_GUIDE.md` - Setup guide
- `UPDATE_Nov26.md` - Session notes

### old-schemas/
Feature-specific schema files (consolidated into main `schema.sql`):
- `schema-booking.sql` - Booking feature schema
- `schema-discovery.sql` - Discovery feature schema
- `schema-trust-building.sql` - Trust building schema
- `update-schema.sql` - Schema updates

## Current Documentation

All current documentation is in `/docs/`:
- `CODEBASE_AUDIT.md` - Complete codebase analysis
- `ARCHITECTURE.md` - System architecture
- `FEATURES.md` - Feature inventory
- `AI_DEVELOPMENT_GUIDE.md` - Development guide for AI assistants
- `MASTER_PLAN.md` - Production roadmap
- `CHANGELOG.md` - Version history
- `PRODUCTION_CHECKLIST.md` - Deployment checklist

## Current Schema

The main database schema is at `/schema.sql` in the project root.
Additional migration files are in `/database/`.

## Restoration

If any of these files are needed again, they can be copied back to their original locations. The git history also contains all previous versions.
