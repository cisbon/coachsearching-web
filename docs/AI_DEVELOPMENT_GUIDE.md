# AI Development Guide for CoachSearching

This guide is specifically designed to help AI assistants (Claude, GPT, etc.) safely and effectively work on this codebase. Read this before making any changes.

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                    BEFORE ANY CHANGE                            │
├─────────────────────────────────────────────────────────────────┤
│ □ Read the relevant file(s) first                               │
│ □ Check if change affects SEO (meta tags, routes, content)     │
│ □ Check if change affects security (auth, input, CORS)         │
│ □ Check if change affects payments (Stripe, amounts)           │
│ □ Verify Supabase RLS won't be bypassed                        │
│ □ Test error states                                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    KEY FILE LOCATIONS                           │
├─────────────────────────────────────────────────────────────────┤
│ Main App:      js/app.js (WARNING: 349KB, read in parts)       │
│ Config:        js/config.js                                     │
│ API Router:    api/index.php                                    │
│ API Config:    api/config.php                                   │
│ DB Schema:     schema.sql                                       │
│ SEO Utils:     js/utils/seo.js                                  │
│ Auth:          api/lib/Auth.php                                 │
│ Sanitizer:     api/lib/Sanitizer.php                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture Overview

### Frontend (No Build Process!)

This project uses React **without** Webpack, Vite, or any bundler. React is loaded as UMD globals:

```javascript
// CORRECT - This is how the project works
const React = window.React;
const { useState, useEffect } = React;
import htm from './vendor/htm.js';
const html = htm.bind(React.createElement);

// Component using htm (JSX alternative)
const MyComponent = () => html`
    <div class="my-class">
        <button onClick=${handleClick}>Click me</button>
    </div>
`;

// WRONG - Don't use JSX or import React
import React from 'react';  // Won't work!
const MyComponent = () => <div>...</div>;  // Won't work!
```

### Key Differences from Standard React

| Standard React | This Project |
|----------------|--------------|
| `import React from 'react'` | `const React = window.React` |
| `<div className="x">` | `html\`<div class="x">\`` |
| `{condition && <Comp />}` | `${condition && html\`<${Comp} />\`}` |
| Build process required | Just save and refresh |

### File Organization

```
js/
├── app.js           # Main app (DO NOT EDIT without reading)
├── config.js        # Configuration
├── i18n.js          # Translations
├── main.js          # Entry utilities
│
├── vendor/          # Third-party (DO NOT MODIFY)
│   ├── react.js
│   ├── react-dom.js
│   └── htm.js
│
├── components/      # Reusable components
├── pages/           # Page components
├── context/         # React contexts
├── hooks/           # Custom hooks
├── utils/           # Utility functions
└── services/        # API services
```

---

## How to Modify Each Layer

### Frontend JavaScript

**Adding a new component:**

1. Create file in `js/components/` or `js/pages/`
2. Use the htm template literal syntax:

```javascript
// js/components/MyComponent.js
import htm from '../vendor/htm.js';
import { t } from '../i18n.js';

const React = window.React;
const { useState } = React;
const html = htm.bind(React.createElement);

export const MyComponent = ({ title, onAction }) => {
    const [isOpen, setIsOpen] = useState(false);

    return html`
        <div class="my-component">
            <h2>${title}</h2>
            <button
                class="btn btn-primary"
                onClick=${() => onAction()}
            >
                ${t('common.submit')}
            </button>
        </div>
    `;
};
```

3. Import in `app.js` or parent component
4. Add CSS in `css/` folder and import in `styles.css`

**Modifying existing components:**

1. **Always read the component first** - understand its structure
2. Look for where it's used (grep for component name)
3. Check for state management dependencies
4. Test changes by refreshing browser

### PHP API Endpoints

**Creating a new endpoint:**

1. Create file in `api/endpoints/`
2. Add route in `api/index.php`
3. Use consistent patterns:

```php
<?php
// api/endpoints/my-endpoint.php

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../Database.php';
require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/Sanitizer.php';
require_once __DIR__ . '/../lib/Response.php';

function handleMyEndpoint($method, $id, $action, $input) {
    switch ($method) {
        case 'GET':
            if ($id) {
                return getOne($id);
            }
            return getAll();

        case 'POST':
            return create($input);

        case 'PATCH':
            return update($id, $input);

        case 'DELETE':
            return delete($id);

        default:
            Response::error('Method not allowed', 405);
    }
}

function getAll() {
    $db = new Database();

    // ALWAYS sanitize query params
    $page = (int) ($_GET['page'] ?? 1);
    $limit = min((int) ($_GET['limit'] ?? 20), 100);

    try {
        $response = $db->from('cs_my_table')
            ->select('*')
            ->order('created_at', ['ascending' => false])
            ->range(($page - 1) * $limit, $page * $limit - 1)
            ->execute();

        return Response::success(['items' => $response]);
    } catch (Exception $e) {
        error_log("Error in getAll: " . $e->getMessage());
        return Response::error('Failed to fetch items', 500);
    }
}

function create($input) {
    // ALWAYS require auth for write operations
    $user = Auth::requireAuth();

    // ALWAYS validate and sanitize
    $required = ['field1', 'field2'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            return Response::error("Missing required field: $field", 400);
        }
    }

    $db = new Database();

    $data = [
        'field1' => Sanitizer::clean($input['field1']),
        'field2' => Sanitizer::clean($input['field2']),
        'user_id' => $user['id'],
        'created_at' => date('c')
    ];

    try {
        $result = $db->from('cs_my_table')
            ->insert($data)
            ->execute();

        return Response::success([
            'item' => $result[0],
            'message' => 'Created successfully'
        ], 201);
    } catch (Exception $e) {
        error_log("Error in create: " . $e->getMessage());
        return Response::error('Failed to create', 500);
    }
}
```

4. Register in `api/index.php`:

```php
// In the switch statement
case 'my-endpoint':
    require_once 'endpoints/my-endpoint.php';
    $response = handleMyEndpoint($method, $id, $action, $input);
    break;
```

### Supabase / Database

**Adding a new table:**

1. Add SQL to `schema.sql`
2. Include RLS policies:

```sql
-- Create table
CREATE TABLE cs_new_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    title TEXT NOT NULL,
    content TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ALWAYS enable RLS
ALTER TABLE cs_new_table ENABLE ROW LEVEL SECURITY;

-- Public can view public items
CREATE POLICY "Public can view public items"
    ON cs_new_table FOR SELECT
    USING (is_public = true);

-- Users can view own items
CREATE POLICY "Users can view own items"
    ON cs_new_table FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert own items
CREATE POLICY "Users can insert own items"
    ON cs_new_table FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update own items
CREATE POLICY "Users can update own items"
    ON cs_new_table FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete own items
CREATE POLICY "Users can delete own items"
    ON cs_new_table FOR DELETE
    USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_new_table_user ON cs_new_table(user_id);
CREATE INDEX idx_new_table_public ON cs_new_table(is_public) WHERE is_public = true;
```

3. Run migration in Supabase dashboard

---

## Common Pitfalls and Gotchas

### 1. app.js Monolith

**Problem:** `app.js` is 349KB and contains many components.

**Solution:**
- Read in chunks using `offset` and `limit`
- Search for specific functions using grep
- Don't add more code to app.js - create new files

### 2. Hash-Based Routing

**Problem:** Routes use `#` which crawlers don't process.

**Remember:**
```
✓ /#coaches          → Works but bad for SEO
✓ /#coach/123        → Works but bad for SEO
✗ /coaches           → Won't work (GitHub Pages serves index.html)
```

### 3. Global $supabase in bookings.php

**Problem:** `bookings.php` uses `global $supabase` but it's never defined.

**Fix needed:** Either initialize `$supabase` in config.php or use `new Database()` class.

### 4. JWT Without Signature Verification

**Problem:** `Auth.php` decodes JWT but doesn't verify the signature.

**Risk:** Relies entirely on Supabase RLS for security.

**When implementing auth changes:** Always ensure RLS policies are in place.

### 5. CORS Set to Wildcard

**Problem:** `config.php` has `Access-Control-Allow-Origin: *`

**Impact:** Any origin can make requests to the API.

**Fix needed:** Restrict to specific origins.

### 6. htm Template Syntax

**Common mistakes:**

```javascript
// WRONG - className doesn't work
html`<div className="my-class">...</div>`

// CORRECT - use class
html`<div class="my-class">...</div>`

// WRONG - curly braces
html`<div>{variable}</div>`

// CORRECT - dollar sign
html`<div>${variable}</div>`

// WRONG - spread props
html`<${Component} {...props} />`

// CORRECT - explicit props
html`<${Component} prop1=${props.prop1} prop2=${props.prop2} />`
```

### 7. Stripe Integration

**Never do:**
- Log full card numbers
- Store card details in database
- Modify amount after PaymentIntent created
- Skip webhook signature verification

**Always do:**
- Use test keys in development
- Verify webhook signatures
- Check payment status before confirming bookings
- Handle refund edge cases

---

## Change Verification Checklist

Before committing any change, verify:

### SEO Checks
```
□ Did you add/modify a page route?
  → Update sitemap.xml
  → Add meta tags via seo.js setPageMeta()
  → Add structured data if applicable
  → Check canonical URL

□ Did you change page content?
  → Ensure proper heading hierarchy (h1, h2, etc.)
  → Check alt text on images
  → Verify text is indexable (not in JS-only rendering)
```

### Security Checks
```
□ Did you add an API endpoint?
  → Use Sanitizer::clean() on all input
  → Add authentication if needed
  → Validate all parameters
  → Check RLS policies cover the data

□ Did you handle user input?
  → Escape output (htmlspecialchars)
  → Validate format
  → Sanitize before database

□ Did you use authentication?
  → Verify token properly
  → Check user has permission
  → Handle missing/invalid tokens
```

### Payment Checks
```
□ Did you touch payment code?
  → Test in Stripe test mode
  → Verify amounts are correct
  → Check refund handling
  → Ensure commission calculation correct
  → Test webhook handling
```

### Database Checks
```
□ Did you add/modify tables?
  → Add RLS policies
  → Create necessary indexes
  → Document in schema.sql
  → Test as different user roles

□ Did you modify queries?
  → Test with edge cases
  → Verify RLS still applies
  → Check for N+1 queries
```

### Testing Steps
```
1. Test happy path
2. Test error cases
3. Test as unauthenticated user
4. Test as wrong user (shouldn't see other's data)
5. Test with invalid input
6. Check browser console for errors
7. Check network tab for failed requests
8. Verify on mobile viewport
```

---

## Deployment Procedure

### Frontend (GitHub Pages)

```bash
# 1. Verify all changes
git status
git diff

# 2. Commit with conventional commit message
git add .
git commit -m "feat: add new feature"

# 3. Push to main
git push origin main

# GitHub Actions automatically deploys to Pages
```

### API (FTP)

```bash
# 1. Test locally first
php -S localhost:8080 -t api

# 2. Upload via FTP
# Host: clouedo.com
# Path: /coachsearching/api
# Upload only changed files

# 3. Verify deployment
curl https://clouedo.com/coachsearching/api/health
```

### Rollback Procedure

**Frontend:**
```bash
# Find last good commit
git log --oneline

# Revert to specific commit
git revert <commit-hash>
git push origin main
```

**API:**
```bash
# FTP: Replace files with backup versions
# Or: Re-upload from last good git commit
git checkout <commit-hash> -- api/
# Then FTP upload
```

---

## Project Conventions

### Naming

| Type | Convention | Example |
|------|------------|---------|
| React components | PascalCase | `CoachCard.js` |
| JS functions | camelCase | `fetchCoaches()` |
| CSS classes | kebab-case | `.coach-card` |
| PHP functions | camelCase | `getCoaches()` |
| PHP classes | PascalCase | `Database.php` |
| Database tables | snake_case with prefix | `cs_coaches` |
| API endpoints | kebab-case | `/coach-profiles` |

### File Organization

```
New feature "XYZ":
├── js/components/XYZ.js      # Component
├── css/xyz.css               # Styles
├── api/endpoints/xyz.php     # API endpoint
└── Update styles.css         # Import CSS
```

### Commit Messages

Use conventional commits:

```
feat: add coach video preview
fix: correct booking time zone handling
perf: lazy load coach images
security: fix CORS configuration
refactor: extract booking validation
docs: update API documentation
```

### Code Style

**JavaScript:**
- 4-space indentation
- Single quotes for strings
- No semicolons (project preference)
- Trailing commas in multi-line

**PHP:**
- 4-space indentation
- PSR-12 style
- Type hints where possible
- Document complex functions

**CSS:**
- BEM-like naming
- Mobile-first
- Use CSS variables from :root

---

## Translations

When adding new text:

1. Add key to `js/i18n.js`:

```javascript
const translations = {
    en: {
        'feature.newText': 'English text here',
        // ...
    },
    de: {
        'feature.newText': 'German text here',
        // ...
    },
    // etc for es, fr, it
};
```

2. Use in component:

```javascript
import { t } from '../i18n.js';

const MyComponent = () => html`
    <h1>${t('feature.newText')}</h1>
`;
```

---

## Quick Commands

```bash
# Start local frontend
npm run dev

# Start local API
cd api && php -S localhost:8080

# Search for string in codebase
grep -r "searchTerm" --include="*.js" --include="*.php"

# Find file by name
find . -name "*.js" | grep -i "coach"

# Check for console.log statements
grep -r "console.log" js/

# Validate PHP syntax
php -l api/endpoints/new-file.php
```

---

## Emergency Contacts

If something goes wrong:

1. **Payment issues:** Check Stripe Dashboard
2. **Database issues:** Check Supabase Dashboard
3. **Frontend broken:** Revert last commit
4. **API down:** Check FTP connection and server logs

---

*This guide should be updated whenever significant architectural changes are made.*

*Last Updated: December 2025*
