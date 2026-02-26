# Gokul Mess Management System - AI Developer Instructions

Welcome to the Gokul Mess Management System codebase. These instructions will help you understand the architecture, conventions, and patterns used in this project to be immediately productive.

## 🏗️ Architecture & Tech Stack

- **Framework**: Next.js (App Router, React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4, Shadcn UI
- **Backend/Database**: Supabase (PostgreSQL, Auth, RLS)
- **Server State**: TanStack Query (React Query)
- **Client State**: Zustand

## 📂 Project Structure & Routing

- **Role-Based Routing**: The app is split into `/owner` and `/student` routes. `app/page.tsx` handles the initial redirect based on the user's role.
- **Component Organization**:
  - `components/ui/`: Reusable, generic UI components (Shadcn).
  - `components/shared/`: Components used across both roles (e.g., `dashboard-sidebar.tsx`, `dashboard-header.tsx`).
  - `components/owner/` & `components/student/`: Role-specific feature components.
- **Supabase Clients**: Use `lib/supabase/client.ts` for client components and `lib/supabase/server.ts` for server components/actions.

## 🔄 Data Fetching & State Management

- **TanStack Query**: Use React Query for all server state (fetching, caching, invalidation).
  - **Centralized Keys**: Always use `lib/query-keys.ts` for query keys to ensure consistent cache invalidation.
  - **Custom Hooks**: Encapsulate queries in custom hooks (e.g., `hooks/use-profile.ts`, `hooks/use-daily-logs.ts`). Export `queryOptions` for potential prefetching.
- **Zustand**: Use Zustand for global client state (e.g., `store/ui-store.ts` for sidebar/tab state, `store/auth-store.ts` for user session).

## 🛡️ Error Handling (Critical Pattern)

Do not use generic `try/catch` blocks with `console.error` for user-facing actions. Use the centralized error handling system:

1. **Async Operations**: Use the `useAsyncOperation` hook from `hooks/use-error-handler.ts` for mutations or complex actions. It automatically parses Supabase errors into user-friendly messages.
   ```typescript
   const { loading, error, execute } = useAsyncOperation('Verify Meal')
   
   const handleAction = async () => {
     await execute(async () => {
       // Your Supabase logic here
       // Throw standard errors, they will be parsed by lib/error-handler.ts
     })
   }
   ```
2. **UI Display**: Display errors using `<ErrorMessage error={error} />` or `<EnhancedAlert type="error" ... />`.

## 🔐 Authentication & Authorization

- **Middleware**: `utils/supabase/middleware.ts` protects routes and refreshes sessions.
- **RLS Policies**: Database access is strictly controlled via Row Level Security in `supabase/schema.sql`. Ensure queries respect these policies (e.g., Owners can see all, Students only their own).
- **Triggers**: Note that user profiles are auto-created in `public.users` via a database trigger (`supabase/triggers.sql`) when a new Supabase Auth user signs up.

## 🎨 Styling Conventions

- Use Tailwind CSS v4 utility classes.
- Always support dark mode using `dark:` variants (e.g., `bg-white dark:bg-zinc-900`).
- Use the `cn()` utility from `lib/utils.ts` for conditional class merging.
- For loading states, prefer the custom components in `components/ui/loading-state.tsx` over generic spinners.
