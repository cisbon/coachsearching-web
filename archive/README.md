# Archive Folder

This folder contains old, backup, and deprecated files that are no longer actively used but are kept for reference.

**Archived on:** December 9, 2025

## Contents

### Root Files
- `WHATS_NEW.txt` - Development notes from a previous implementation session. Now superseded by comprehensive documentation in `/docs/`
- `sitemap-static.xml` - Original static sitemap. Now replaced by dynamic sitemap at `/api/sitemap.xml`

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

## Current Documentation

All current documentation is in `/docs/`:
- `CODEBASE_AUDIT.md` - Complete codebase analysis
- `ARCHITECTURE.md` - System architecture
- `FEATURES.md` - Feature inventory
- `AI_DEVELOPMENT_GUIDE.md` - Development guide for AI assistants
- `MASTER_PLAN.md` - Production roadmap
- `CHANGELOG.md` - Version history
- `PRODUCTION_CHECKLIST.md` - Deployment checklist

## Restoration

If any of these files are needed again, they can be copied back to their original locations. The git history also contains all previous versions.
