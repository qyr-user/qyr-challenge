# 🏃 RunChallenge — Hướng dẫn Setup Chi Tiết

> Stack: Next.js 14 · Prisma · PostgreSQL (Neon) · NextAuth · Strava API · Vercel

---

## 📋 Tổng quan kiến trúc

```
running-challenge/
├── app/
│   ├── api/              # API Routes
│   │   ├── auth/[...nextauth]/   # NextAuth (Strava OAuth)
│   │   ├── challenges/           # CRUD challenges + leaderboard
│   │   ├── teams/                 # CRUD teams + team activities
│   │   ├── users/                 # User list for admin
│   │   ├── team-members/          # Assign users to teams
│   │   └── strava/sync/           # Sync Strava activities
│   ├── admin/             # Admin pages (protected)
│   ├── challenges/[id]/   # Public challenge detail + leaderboard
│   ├── login/             # Login page
│   ├── lib/               # prisma.ts, auth.ts, strava.ts, utils.ts
│   └── components/        # Navbar, AdminSidebar
├── prisma/schema.prisma   # Database schema
├── scripts/seed.ts        # Seed sample data
└── vercel.json            # Cron config (auto sync)
```

---

## BƯỚC 1 — Tạo Database miễn phí trên Neon

1. Truy cập **https://neon.tech** → Sign up (miễn phí)
2. Click **New Project**
   - Project name: `running-challenge`
   - Region: `Singapore` (gần VN nhất)
3. Vào **Dashboard → Connection Details**
4. Copy 2 connection string:
   - **DATABASE_URL**: bản `pooled connection` (có `?pgbouncer=true`)
   - **DIRECT_URL**: bản `direct connection`

> 💡 Neon free tier: 0.5GB storage — đủ dùng cho ~50 người dùng

---

## BƯỚC 2 — Tạo Strava Developer App

1. Đăng nhập **https://www.strava.com/settings/api**
2. Click **Create App**:
   - **Application Name**: RunChallenge (hoặc tên cộng đồng bạn)
   - **Category**: Training
   - **Website**: điền tạm `https://example.com` (sửa lại sau khi có domain Vercel)
   - **Authorization Callback Domain**: điền tạm `localhost` (sửa lại sau)
3. Lưu lại **Client ID** và **Client Secret**

> ⚠️ Callback Domain chỉ ghi domain, KHÔNG có `https://` ở đầu.
> - ✅ `your-app.vercel.app`
> - ❌ `https://your-app.vercel.app`

---

## BƯỚC 3 — Đẩy code lên GitHub

```bash
cd running-challenge
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/running-challenge.git
git push -u origin main
```

---

## BƯỚC 4 — Deploy lên Vercel (miễn phí)

1. Vào **https://vercel.com** → Sign up bằng GitHub
2. **New Project** → Import repo `running-challenge`
3. Framework Preset: **Next.js** (tự nhận diện)
4. Mở **Environment Variables**, thêm:

```
DATABASE_URL         = postgresql://...?pgbouncer=true
DIRECT_URL           = postgresql://...
NEXTAUTH_URL         = https://your-app.vercel.app
NEXTAUTH_SECRET      = <chạy: openssl rand -base64 32>
STRAVA_CLIENT_ID     = <từ Strava>
STRAVA_CLIENT_SECRET = <từ Strava>
ADMIN_EMAILS         = your-email@gmail.com
CRON_SECRET          = <random string dài, ví dụ: openssl rand -hex 16>
```

5. Click **Deploy** → đợi build (~2 phút)
6. Copy URL Vercel cấp, ví dụ: `running-challenge-xyz.vercel.app`

---

## BƯỚC 5 — Cập nhật lại Strava App + Vercel URL

1. Quay lại **Strava API Settings**:
   - **Website**: `https://running-challenge-xyz.vercel.app`
   - **Authorization Callback Domain**: `running-challenge-xyz.vercel.app`
   - Save
2. Vào Vercel → Project → Settings → Environment Variables:
   - Sửa `NEXTAUTH_URL` = `https://running-challenge-xyz.vercel.app`
3. Vào tab **Deployments** → bấm **... → Redeploy**

---

## BƯỚC 6 — Khởi tạo Database Schema

Từ máy local:

```bash
npm install
cp .env.example .env.local
# Điền DATABASE_URL, DIRECT_URL vào .env.local (copy từ Vercel env hoặc Neon)

npx prisma db push        # Tạo tables theo schema.prisma
npm run db:seed           # (tùy chọn) tạo challenge + team mẫu
npx prisma studio         # (tùy chọn) xem database qua GUI
```

---

## BƯỚC 7 — Đăng nhập và cấp quyền Admin

1. Mở `https://your-app.vercel.app`
2. Click **Đăng nhập với Strava** → Authorize
3. Lưu lại email Strava của bạn (Strava → Settings → My Account)
4. Vào Vercel → Environment Variables → set:
   ```
   ADMIN_EMAILS = email-strava-cua-ban@gmail.com
   ```
   (nhiều admin: `email1@gmail.com,email2@gmail.com`)
5. **Redeploy** → Đăng xuất → Đăng nhập lại → Menu **Admin** sẽ xuất hiện

---

## BƯỚC 8 — Sử dụng hệ thống

### Workflow Admin
```
1. Admin → Tạo Challenge (quy tắc: max km/activity, HR range, pace range, ngày bắt đầu/kết thúc)
2. Admin → Tạo Teams trong Challenge đó
3. Mời thành viên đăng nhập Strava trên app
4. Admin → Members → Assign từng người vào Team tương ứng
5. Admin → Sync Strava → Kéo activities về (tự động phân loại hợp lệ/không hợp lệ)
6. Mọi người xem Leaderboard tại trang chủ → click vào Challenge
```

### Workflow User
```
1. Vào app → Đăng nhập với Strava (OAuth, không cần tạo password)
2. Xem danh sách Challenge ở trang chủ
3. Click vào Challenge → xem bảng xếp hạng Team + tổng km
4. Đợi Admin assign vào Team → activities tự động được tính
```

---

## BƯỚC 9 — Tên miền (tùy chọn, miễn phí)

**Cách đơn giản nhất**: dùng luôn subdomain Vercel (`*.vercel.app`) — miễn phí, không cần làm gì thêm.

**Muốn domain riêng miễn phí:**
1. **Freenom** (`.tk`, `.ml`, `.ga`, `.cf`) — đăng ký tại freenom.com
2. Vercel → Project → Settings → Domains → Add Domain
3. Trỏ DNS theo hướng dẫn Vercel hiện ra
4. Cập nhật lại `NEXTAUTH_URL` và Strava Callback Domain theo domain mới

---

## 🔧 Bảng biến môi trường

| Biến | Mô tả | Bắt buộc |
|---|---|---|
| `DATABASE_URL` | Postgres pooled connection | ✅ |
| `DIRECT_URL` | Postgres direct connection | ✅ |
| `NEXTAUTH_URL` | URL app (HTTPS) | ✅ |
| `NEXTAUTH_SECRET` | Secret ký session | ✅ |
| `STRAVA_CLIENT_ID` | Strava App Client ID | ✅ |
| `STRAVA_CLIENT_SECRET` | Strava App Client Secret | ✅ |
| `ADMIN_EMAILS` | Email admin (phân cách bởi dấu phẩy) | ✅ |
| `CRON_SECRET` | Bảo vệ endpoint cron auto-sync | Khuyến nghị |
| `GOOGLE_CLIENT_ID` / `SECRET` | Login Google bổ sung | ❌ |

---

## 🐛 Lỗi thường gặp

**"redirect_uri_mismatch" khi login Strava**
→ `NEXTAUTH_URL` phải khớp domain thật. Strava **Authorization Callback Domain** phải đúng domain (không `https://`). Đợi vài phút sau khi sửa Strava settings.

**PrismaClientInitializationError**
→ Kiểm tra lại `DATABASE_URL`/`DIRECT_URL`, chạy lại `npx prisma db push`.

**Không thấy menu Admin**
→ Email trong `ADMIN_EMAILS` phải khớp chính xác email Strava account, sau khi sửa env nhớ **Redeploy**.

**Sync không ra activity**
→ Token Strava hết hạn → user cần đăng nhập lại. Kiểm tra scope OAuth có `activity:read_all`.

---

## 📊 Giới hạn Free Tier (đủ cho ~50 người)

| Service | Free Tier |
|---|---|
| Vercel | 100GB bandwidth/tháng |
| Neon | 0.5GB storage, ~190h compute/tháng |
| Strava API | 100 req/15min · 1000 req/ngày |

50 người × ~30 activities/tháng ≈ 1500 req/tháng đồng bộ → an toàn nếu sync 4-6 lần/ngày.

---

*Chúc cộng đồng chạy bộ của bạn có một mùa challenge thật vui! 🏃‍♂️🏃‍♀️*
