# 🏃 RunChallenge

Web app quản lý thử thách chạy bộ cộng đồng, tích hợp Strava API.

## Tính năng

**Admin:**
- Bảng thống kê các team theo thứ hạng / tổng km
- Xem hoạt động chi tiết từng thành viên (kể cả hoạt động không hợp lệ), sort theo thời gian
- Tạo challenge với đầy đủ rule: số hoạt động tối đa/tối thiểu mỗi ngày/tuần, max km/activity, heart rate range, pace range
- Tạo team theo từng challenge
- Xem danh sách user đã connect Strava, assign vào team + challenge cụ thể

**User:**
- Đăng nhập / kết nối Strava (OAuth, 1 click)
- Xem danh sách challenge ở trang chủ, click vào để xem bảng xếp hạng team + tổng km

## Quick Start (local)

```bash
npm install
cp .env.example .env.local   # điền các biến môi trường
npx prisma db push
npm run db:seed              # optional — tạo data mẫu
npm run dev
```

👉 **Hướng dẫn deploy đầy đủ (Vercel + Strava + Neon)**: xem [SETUP_GUIDE.md](./SETUP_GUIDE.md)

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Prisma ORM + PostgreSQL (Neon — free tier)
- NextAuth.js (Strava OAuth provider)
- TailwindCSS
- Vercel (hosting + Cron Jobs cho auto-sync)

## Cấu trúc thư mục

```
app/
  api/                → API routes (challenges, teams, users, sync...)
  admin/               → Admin dashboard (route-protected)
  challenges/[id]/     → Public challenge detail + leaderboard
  login/               → Login page (Strava OAuth)
  lib/                 → prisma client, auth config, strava helpers, utils
  components/          → Navbar, AdminSidebar
prisma/
  schema.prisma        → DB schema (User, StravaToken, Challenge, Team, TeamMember, Activity)
scripts/
  seed.ts              → seed sample challenge + teams
vercel.json            → Cron config cho auto-sync Strava mỗi 6h
```

## License

MIT — Free để dùng cho cộng đồng chạy bộ của bạn.
