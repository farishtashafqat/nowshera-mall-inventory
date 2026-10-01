# Nowshera Shopping Mall Inventory System

A secure inventory workspace for Nowshera Shopping Mall. It provides live catalogue and stock control, reporting, staff/manager administration, and a grounded Gemini-powered assistant that proposes—rather than directly applies—inventory changes.

## Technology

- React, TypeScript and Vite frontend
- FastAPI backend
- Supabase Auth, PostgreSQL, RLS and SQL functions
- Gemini API, called only by the backend

## Main features

- Products, categories with doodles, suppliers, search, archive state and dashboard counts
- Atomic Stock In, Sale and Damage operations with immutable history
- Inventory, low-stock, out-of-stock, movement and category reports with CSV export
- Staff and Manager invitation management
- AI questions grounded in live inventory, with stored Confirm/Cancel proposals

## Roles

| Capability | Manager | Staff |
|---|---:|---:|
| View permitted inventory, reports, history and AI Assistant | Yes | Yes |
| Perform Stock In, Sale and Damage | Yes | Yes |
| View cost, profit, margin and valuation | Yes | No |
| Create/edit/archive products | Yes | No |
| Manage categories and suppliers | Yes | No |
| Invite/manage Staff or Managers | Yes | No |

The backend validates every access token and obtains the role from the trusted `profiles` table. Frontend navigation is never treated as authorization.

## Local setup

Copy the templates, then enter values by name only in local files (never commit secrets):

```powershell
Copy-Item frontend\.env.example frontend\.env
Copy-Item backend\.env.example backend\.env
```

Frontend environment variable names:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_API_URL
```

Backend environment variable names:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
GEMINI_MODEL
CORS_ORIGINS
INVITE_REDIRECT_URL
```

Run the frontend:

```powershell
cd C:\Users\HBLinks\Desktop\nowshera-mall-inventory\frontend
npm install
npm run dev
```

Run the backend in another terminal:

```powershell
cd C:\Users\HBLinks\Desktop\nowshera-mall-inventory\backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

## Supabase migrations

Apply the SQL files in `supabase/migrations/` in filename order using the Supabase SQL Editor. For a new deployment, this includes `20261001000100` through `20261001001000`.

Disable public email signup in Supabase Auth. Create only the initial manager directly, then promote that known account once in SQL. All later Staff and Manager accounts must be invited through the application.

For invitation links, set `INVITE_REDIRECT_URL` to the exact frontend `/accept-invitation` address and add the same URL in **Supabase Auth → URL Configuration → Redirect URLs**.

## Staff invitation flow

1. A Manager opens **Staff Management** and enters name and email.
2. The backend verifies the Manager, creates a private pending Staff invitation, and asks Supabase Auth to send the invite email.
3. The Staff member opens the link, sets a password at `/accept-invitation`, and is activated only after the database verifies their private invitation.
4. They then sign in normally as Staff.

Directly created Supabase Auth users receive an inactive profile and cannot access application APIs without a matching invitation.

## Gemini setup and AI safety

Set `GEMINI_API_KEY` and optionally `GEMINI_MODEL` only in `backend/.env`. No Gemini key or service-role key belongs in the frontend.

The assistant reads role-filtered inventory context. Financial requests from Staff are denied before any restricted data is sent to Gemini. A stock-change request creates a `PENDING` proposal; it cannot change stock until confirmation.

Confirmation calls the atomic database function, records source `AI`, revalidates stock and permissions, and is idempotent. Cancelled proposals never change inventory.

## Final verification

```powershell
cd C:\Users\HBLinks\Desktop\nowshera-mall-inventory\frontend
npm run build

cd ..\backend
.\.venv\Scripts\python.exe -m compileall -q app
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Then test Manager and Staff sessions in a browser: login/logout, invitation acceptance, catalogue management, stock operations, reports, AI proposal cancel/confirm, role restrictions, and mobile layout.
