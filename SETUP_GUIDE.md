# Hướng dẫn Setup QYR Challenge (Version 2)

Phiên bản mới **không dùng Strava OAuth**. Dữ liệu được cào từ **Strava Club feed** bằng session cookie, không cần xin duyệt API.

---

## Yêu cầu

- Node.js 18+
- Tài khoản [Neon](https://neon.tech) hoặc [Supabase](https://supabase.com) (PostgreSQL miễn phí)
- Tài khoản [Vercel](https://vercel.com) (miễn phí)
- Tài khoản [GitHub](https://github.com)
- Là admin của một Strava Club (CLB Strava)

---

## Bước 1: Chuẩn bị Database (Neon)

1. Đăng ký [neon.tech](https://neon.tech) → tạo project mới
2. Copy 2 connection strings:
   - **Connection string** (có `pgbouncer=true`) → dùng cho `DATABASE_URL`
   - **Direct connection** (không có pgbouncer) → dùng cho `DIRECT_URL`

---

## Bước 2: Cấu hình biến môi trường

Tạo file `.env.local` ở root project (copy từ `.env.example`):

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
ADMIN_JWT_SECRET="random-chuoi-dai-32-ky-tu"
CRON_SECRET="random-chuoi-khac"
```

**Tạo ADMIN_JWT_SECRET:**
```bash
openssl rand -base64 32
```

---

## Bước 3: Cài đặt và khởi tạo DB

```bash
npm install
npx prisma db push
npm run db:seed
```

Lệnh seed sẽ tạo:
- Tài khoản admin: `admin` / `admin`
- 1 challenge mẫu với 3 team

---

## Bước 4: Chạy thử local

```bash
npm run dev
```

Truy cập `http://localhost:3000`:
- **Trang chủ**: hiển thị danh sách challenge
- **Admin**: nhấn "Admin" trên header → đăng nhập `admin/admin`

---

## Bước 5: Deploy lên Vercel

### 5.1 Push code lên GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/qyr-challenge.git
git push -u origin main
```

### 5.2 Import project trên Vercel

1. Đăng nhập [vercel.com](https://vercel.com) → **New Project**
2. Import từ GitHub repo
3. Framework: **Next.js** (tự detect)
4. Thêm **Environment Variables**:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Connection string từ Neon (có pgbouncer) |
| `DIRECT_URL` | Direct connection string từ Neon |
| `ADMIN_JWT_SECRET` | Chuỗi random 32 ký tự |
| `CRON_SECRET` | Chuỗi random khác |

5. Click **Deploy**

### 5.3 Chạy migration trên production

Sau deploy, chạy seed để tạo admin account trên DB production:
```bash
# Pull env vars từ Vercel về local
npx vercel env pull .env.local
# Push schema lên DB production
npx prisma db push
# Seed DB
npm run db:seed
```

---

## Bước 6: Cấu hình Strava

### 6.1 Tạo CLB Strava và mời VĐV

- Tạo một CLB (Club) trên Strava
- Mời tất cả vận động viên tham gia CLB
- Lấy **Club ID** từ URL: `https://www.strava.com/clubs/2224942` → ID là `2224942`

### 6.2 Lấy session cookie

1. Đăng nhập [strava.com](https://strava.com) trên Chrome/Firefox
2. Mở **DevTools** (F12)
3. Tab **Application** (Chrome) hoặc **Storage** (Firefox)
4. Mở **Cookies → https://www.strava.com**
5. Copy giá trị cookie **`_strava4_session`**

### 6.3 Nhập vào Admin Dashboard

1. Vào `https://your-app.vercel.app/admin/login`
2. Đăng nhập: `admin` / `admin`
3. Vào **Admin → Cài đặt**
4. Dán session cookie và lưu

> ⚠️ Session cookie thường hết hạn sau vài ngày. Khi hết hạn, banner cảnh báo màu vàng sẽ xuất hiện trên tất cả các trang.

---

## Bước 7: Tạo Challenge, Team, và VĐV

### 7.1 Tạo Challenge

**Admin → Thử thách → Tạo mới:**
- Tên, mô tả
- Ngày giờ bắt đầu/kết thúc
- **Strava Club ID** (Club ID của CLB ứng với challenge này)
- Các quy tắc hợp lệ (tùy chọn): max km/lần, pace nhanh/chậm nhất

### 7.2 Tạo Team

**Admin → Nhóm → Tạo nhóm mới:**
- Chọn challenge
- Nhập tên nhóm

### 7.3 Thêm Vận động viên

**Admin → Vận động viên → Thêm VĐV:**
- Nhập tên **chính xác** như trên Strava
- Tên phân biệt hoa thường và dấu (ví dụ: "Nguyễn Văn A" ≠ "nguyen van a")
- Sau đó chọn challenge và phân VĐV vào nhóm tương ứng

---

## Bước 8: Cào dữ liệu

### Tự động (2 lần/ngày)

`vercel.json` đã cấu hình 2 cron jobs:
- **8:00 sáng** (01:00 UTC)
- **8:00 tối** (13:00 UTC)

Vercel Cron tự động gọi `/api/cron/sync` với header `Authorization: Bearer CRON_SECRET`.

### Thủ công

**Admin → Cào dữ liệu → Cào ngay** (chỉ available khi challenge đang diễn ra và có Club ID)

---

## Xử lý sự cố

### Session hết hạn
- Banner màu vàng xuất hiện trên web
- Vào **Admin → Cài đặt** → cập nhật cookie mới

### VĐV không được ghi nhận
- Kiểm tra tên VĐV trong admin có khớp chính xác với Strava không
- Kiểm tra VĐV đã join CLB Strava chưa
- Kiểm tra hoạt động có trong ngày cào không (chỉ cào hôm nay)

### Build lỗi
```bash
npx prisma generate
npm run build
```

---

## Cấu trúc key files

```
app/
├── admin/
│   ├── login/         # Đăng nhập admin
│   ├── challenges/    # Quản lý thử thách
│   ├── members/       # Quản lý VĐV
│   ├── teams/         # Quản lý nhóm
│   ├── sync/          # Cào thủ công
│   └── settings/      # Strava session cookie
├── api/
│   ├── admin/         # Login/logout/settings
│   ├── athletes/      # CRUD VĐV
│   ├── scrape/        # Cào thủ công
│   └── cron/sync/     # Vercel Cron endpoint
├── lib/
│   ├── admin-auth.ts  # JWT admin session
│   └── scraper.ts     # Logic cào Strava
└── prisma/schema.prisma
```
