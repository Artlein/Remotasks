# Remotasks Personal Time Tracking System

A full-featured, responsive time tracking web application built specifically for **Remotasks/Scale AI EQC Quality Assurance Auditors**. Designed to replace manual Excel timesheets with automated rollups, project lifecycle management, trends visualization, and one-click Excel import/export. Ready for instant deployment to **Vercel**.

---

## 🌟 Key Features

1. **Today's Live Target Banner**:
   - Live progress indicator tracking logged hours against your daily target (default **8.0 hours**).
   - Per-project pill counters giving an immediate breakdown of time spent today.

2. **Logical Workday Boundary Rule**:
   - Resets at **12:00 AM (midnight)** by default.
   - User-configurable cutoff hour in settings (e.g. 4:00 AM) if working overnight shifts, automatically assigning late night tasks to the correct logical workday.

3. **No Timer Friction**:
   - All task durations are entered manually as `H:MM` (e.g. `1:30`, `0:45`), matching the exact workflow of external platform tracking.

4. **Dynamic Project Lifecycle Management**:
   - Add new projects, rename projects (automatically updates historical tasks under the new name), and retire/reactivate projects from the UI.
   - Pre-seeded with active projects: `FNA1`, `Crane_Gamer`, `Ego_VLM`, `Duck`, `Aloha_OTS`, `Cobra`.

5. **Live Daily & Weekly Pivot Summaries**:
   - **Daily Rollup**: Automatically calculated pivot table per logical date and project with target variance (`+0.5h` / `-1.2h`).
   - **Weekly Rollup**: Grouped Monday–Sunday with week-over-week totals.

6. **Interactive Trend Visualizations**:
   - **Daily Total vs 8h Target**: Bar chart with target reference line.
   - **Project Share**: Donut chart showing time distribution.
   - **Stacked Project Trends**: Visual breakdown of project hours over time.

7. **Excel Import & Export**:
   - **One-click Export**: Download task log in `.xlsx` or `.csv` format.
   - **Historical Import**: Upload existing timesheet workbooks (`Task_Log_TimeSheet_Automated.xlsx`) to seamlessly migrate historical data.

---

## 🚀 Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Sync database schema (SQLite)
npx --package=prisma@5.22.0 prisma db push

# 3. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deployment to Vercel

1. Push this repository to GitHub / GitLab / Bitbucket.
2. Import the repository into [Vercel](https://vercel.com).
3. Set your environment variable:
   - For SQLite (Turso / LibSQL) or Vercel Postgres / Supabase: set `DATABASE_URL`.
4. Click **Deploy**. Vercel will automatically build and host the application!
