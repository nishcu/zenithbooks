# 📍 Where to Find Document Vault in ZenithBooks

## 🎯 Main Access Points

### 1. **Sidebar Navigation Menu** (Primary Access)

**Location:** Left sidebar menu (desktop/tablet)

**Path in Menu:**
```
Sidebar Menu
  └── Document Vault 🔑 (Icon: FileKey)
      ├── My Documents 📁
      ├── Share Codes 🔐
      ├── Access Logs 📊
      └── Settings ⚙️
```

**Details:**
- **Icon:** 🔑 (FileKey icon)
- **Position:** After "Import & Export" menu item
- **Before:** "Resources" menu section
- **Visible to:** Business owners and Professional users only
- **Expands:** Click to see submenu items

---

### 2. **Dashboard Widget** (Quick Overview)

**Location:** Main Dashboard page (`/dashboard`)

**Widget Name:** "Document Vault Statistics"

**Shows:**
- Total document count
- Storage usage (used/total)
- Recent documents (last 5)
- Active share codes count
- Quick links to vault actions

**Widget Location:**
- Right sidebar section of dashboard
- Below other widgets
- Click "View All" → Goes to `/vault`

---

### 3. **Direct URL Access**

You can also access directly via URLs:

| Page | URL | Description |
|------|-----|-------------|
| **My Documents** | `/vault` | Main vault page - upload, view, manage documents |
| **Share Codes** | `/vault/sharing` | Create and manage share codes |
| **Access Logs** | `/vault/logs` | View all document access history |
| **Settings** | `/vault/settings` | Notification preferences |
| **Public Access** | `/vault/access` | For third parties to access shared documents |

---

## 📱 Mobile Access

### Mobile Bottom Navigation
On mobile devices, Document Vault is accessed via:
1. **Menu Button** (bottom navigation bar)
2. Tap "Menu" → Opens sidebar
3. Scroll to "Document Vault"
4. Tap to expand and access submenu

---

## 🔍 Step-by-Step Access Guide

### For Desktop/Tablet Users:

1. **Login** to ZenithBooks
2. **Look at Left Sidebar**
   - You'll see the menu items vertically listed
3. **Find "Document Vault"**
   - It's a collapsible menu item
   - Has a 🔑 (key) icon
   - Located between "Import & Export" and "Resources"
4. **Click "Document Vault"**
   - Menu expands to show 4 sub-items
5. **Click any sub-item:**
   - **"My Documents"** → Main vault page
   - **"Share Codes"** → Share code management
   - **"Access Logs"** → View access history
   - **"Settings"** → Notification preferences

### For Mobile Users:

1. **Login** to ZenithBooks
2. **Tap "Menu"** button (bottom right of screen)
3. **Sidebar opens** (overlay)
4. **Scroll down** to find "Document Vault"
5. **Tap "Document Vault"** to expand
6. **Tap any sub-item** to navigate

---

## 🎨 Visual Guide

### Sidebar Menu Structure:
```
┌─────────────────────────────────┐
│  ZenithBooks                    │
│  Beyond Books                   │
├─────────────────────────────────┤
│  Dashboard                      │
│  Billing                        │
│  Purchases                      │
│  ...                            │
│  Import & Export                │
│  ┌───────────────────────────┐  │
│  │ 🔑 Document Vault      ▼  │  │  ← HERE!
│  │   📁 My Documents         │  │
│  │   🔐 Share Codes          │  │
│  │   📊 Access Logs          │  │
│  │   ⚙️ Settings             │  │
│  └───────────────────────────┘  │
│  Resources                       │
│  Settings                        │
│  Admin (if super admin)          │
└─────────────────────────────────┘
```

---

## 📊 Dashboard Widget Appearance

On the dashboard (`/dashboard`), you'll see:

```
┌────────────────────────────────────┐
│  Document Vault Statistics         │
├────────────────────────────────────┤
│  📄 Documents: 12                  │
│  💾 Storage: 2.3 GB / 5 GB         │
│  ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░ 46%       │
│                                    │
│  Recent Documents:                 │
│  • ITR 2023-24.pdf                 │
│  • PAN Card.jpg                    │
│  • ...                             │
│                                    │
│  🔐 Active Share Codes: 3          │
│                                    │
│  [View All] [Upload Document]      │
└────────────────────────────────────┘
```

---

## 🔐 Access Requirements

### Who Can Access:
- ✅ **Business Owners** (`business` user type)
- ✅ **Professional Users** (`professional` user type)
- ❌ **Super Admin** (not visible - for user management only)
- ❌ **Freemium Users** (not visible - needs paid plan)

### User Role Check:
- Document Vault automatically appears for Business and Professional users
- Menu items are filtered based on user role
- If you don't see it, check your user type in Settings

---

## 🚀 Quick Access Shortcuts

### Keyboard Shortcut (if configured):
Currently, no keyboard shortcut is set. You can add one in:
- `src/app/(app)/layout.tsx` (hotkeys section)

### Bookmark These URLs:
- `/vault` - Main vault page
- `/vault/sharing` - Share codes
- `/vault/logs` - Access logs

---

## ❓ Troubleshooting

### "I don't see Document Vault in menu"

**Possible reasons:**
1. **Wrong user type** - Must be `business` or `professional`
   - Check: Settings → User Management → Your user type
2. **Not logged in** - Must be authenticated
3. **Menu collapsed** - Sidebar might be collapsed (icon-only mode)
   - Click to expand sidebar
4. **Browser cache** - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### "Document Vault shows but submenu doesn't expand"

**Fix:**
- Click the menu item directly (not just the arrow)
- Check browser console for errors
- Refresh the page

### "Dashboard widget not showing"

**Possible reasons:**
1. User type must be `business` or `professional`
2. Widget might be below scroll (scroll down)
3. Refresh dashboard page

---

## 📝 Summary

### Main Entry Point:
**Left Sidebar → Document Vault** 🔑

### Quick Access:
- **Dashboard Widget** → Click "View All"
- **Direct URL:** `/vault`
- **Mobile:** Menu button → Document Vault

### All Pages:
1. `/vault` - My Documents (main page)
2. `/vault/sharing` - Share Codes
3. `/vault/logs` - Access Logs
4. `/vault/settings` - Settings
5. `/vault/access` - Public access (for third parties)

---

**Ready to use!** Navigate to Document Vault from the sidebar menu. 🚀

