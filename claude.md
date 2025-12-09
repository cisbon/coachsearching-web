# Claude Instructions for CoachSearching.com

## Quick Start (Do This First)

1. **Read `/docs/STATUS.md`** - Current state in <50 lines
2. **Check `/todo/` folder** - Latest TODO file has full task list
3. **Ask user** what they want to work on today

## Project Constraints

- **Hosting**: GitHub Pages (static only, NO server-side)
- **Frontend**: Vanilla JS + React via CDN (no build process)
- **Routing**: Hash-based (`/#/route`) - required for GitHub Pages
- **Backend**: Separate PHP API (not on GitHub Pages)
- **Database**: Supabase with RLS policies

## Key Gotchas (Don't Repeat These Mistakes)

| Wrong Assumption | Reality |
|------------------|---------|
| .htaccess works | GitHub Pages ignores it |
| Can use clean URLs | Would 404 - hash routing required |
| $supabase global exists | Use `new Database()` class |
| Stripe SDK available | Manual implementation only |

## Efficient Workflow

### Before Starting Work
```
1. Read STATUS.md (30 sec)
2. Confirm task with user
3. Search only relevant files
```

### During Work
```
- Make changes incrementally
- Commit after each logical unit
- Update STATUS.md when completing items
```

### After Work
```
1. Update STATUS.md with completed items
2. Commit with clear message
3. Push to branch
```

## File Structure (What's Where)

| Need | Location |
|------|----------|
| API endpoints | `/api/endpoints/*.php` |
| React components | `/js/components/*.js` |
| Page components | `/js/pages/*.js` |
| Database class | `/api/lib/Database.php` |
| Config/CORS | `/api/config.php` |
| DB schema | `/schema.sql` |
| Full docs | `/docs/*.md` |
| Archived files | `/archive/` |

## Don't Waste Tokens On

- Reading files you won't modify
- Re-reading documentation you've seen
- Exploring "just in case"
- Long explanations (be concise)
- Creating unnecessary files

## Do Spend Tokens On

- Understanding the specific task
- Reading files you WILL modify
- Verifying changes work
- Updating STATUS.md

## Common Tasks Quick Reference

| Task | Key Files |
|------|-----------|
| Fix API endpoint | `/api/endpoints/[name].php`, `/api/lib/Database.php` |
| Modify React component | `/js/components/[Name].js` |
| Update page | `/js/pages/[Name]Page.js` |
| Change routing | `/js/components/Router.js`, `/js/app.js` |
| Database changes | `/schema.sql`, then Supabase dashboard |
| Styling | `/css/styles.css` |

## Git Workflow

- Branch: Always use assigned branch
- Commits: Small, focused, clear messages
- Push: After completing logical units

## When Stuck

1. Check `/docs/AI_DEVELOPMENT_GUIDE.md` for patterns
2. Check `/docs/ARCHITECTURE.md` for system design
3. Ask user for clarification

---
*Keep this file under 100 lines. Update only if workflow changes.*
