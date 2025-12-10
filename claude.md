# Claude Instructions for CoachSearching.com

## Workflow (Follow These Steps Every Session)

### Step 1: Initialize
```
1. Read this file (claude.md)
2. Read /docs/STATUS.md
```

### Step 2: Research
```
1. Understand user's task
2. Search ONLY files relevant to the task
3. Identify what needs to change
```

### Step 3: Create Guidance File
```
1. Create /guidance/YYYY-MM-DD_HHMM.md
2. List specific tasks to complete
3. Keep it concise (<30 lines)
```

### Step 4: Execute
```
1. Follow tasks in guidance file
2. Mark tasks complete as you go
3. Update /docs/STATUS.md when done
4. Increment version in footer (see below)
5. Commit and push
```

---

## Required: Version Increment

**After ANY code change, increment the version number:**

| File | Line | Current |
|------|------|---------|
| `/js/app.js` | ~253 | `v1.11.0` |

**Format:** `vMAJOR.MINOR.PATCH`
- PATCH: Bug fixes, CSS changes, small tweaks
- MINOR: New features, significant changes
- MAJOR: Breaking changes, major rewrites

---

## Guidance File Template

```markdown
# Guidance: [Brief Description]
**Created:** YYYY-MM-DD HH:MM

## Goal
[One sentence]

## Tasks
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## Files to Modify
- /path/to/file1.js
- /path/to/file2.php

## Notes
[Any gotchas or constraints]
```

---

## Project Constraints

| Constraint | Reality |
|------------|---------|
| Hosting | GitHub Pages (static only) |
| Routing | Hash-based required (`/#/route`) |
| Frontend | React via CDN + Vite build |
| Backend | Separate PHP API server |
| Database | Supabase + RLS |
| Stripe | Manual implementation (no SDK) |
| Build | `npm run build` → `dist/` folder |

## Key Gotchas

| Wrong | Right |
|-------|-------|
| .htaccess works | Ignored on GitHub Pages |
| Clean URLs possible | Would 404 |
| `$supabase` global | Use `new Database()` |

## File Locations

| Need | Path |
|------|------|
| API endpoints | `/api/endpoints/*.php` |
| React components | `/js/components/*.js` |
| Pages | `/js/pages/*.js` |
| Database class | `/api/lib/Database.php` |
| Config | `/api/config.php` |
| Schema | `/schema.sql` |
| Docs | `/docs/*.md` |
| Session guidance | `/guidance/*.md` |

## Token Efficiency Rules

**DO:**
- Read only files you'll modify
- Be concise in responses
- Use guidance file for tracking

**DON'T:**
- Explore "just in case"
- Re-read files unnecessarily
- Write long explanations

---
*Last updated: 2025-12-10*
