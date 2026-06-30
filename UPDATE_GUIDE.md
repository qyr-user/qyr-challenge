# Hướng dẫn cập nhật từ Version 1 → Version 2

> **⚠️ Cảnh báo quan trọng**: Schema database thay đổi hoàn toàn (xóa bảng cũ, tạo bảng mới, đổi kiểu ID).
> **Toàn bộ dữ liệu cũ sẽ bị xóa** khi chạy migration. Backup nếu cần trước khi thực hiện.

---

## Tổng quan thay đổi

| Hạng mục | V1 | V2 |
|---|---|---|
| Auth người dùng | Strava OAuth (NextAuth) | Không có |
| Auth admin | Đăng nhập bằng Strava + email whitelist | Username/password (admin/admin) |
| Dữ liệu | Đồng bộ qua Strava API (OAuth token) | Cào từ Strava Club feed |
| Thành viên | User tự đăng nhập bằng Strava | Admin tạo tay bằng tên |
| Avatar | Ảnh từ Strava | Chữ cái đầu (initials) |
| Nhịp tim | Có | Bỏ |
| ID các bảng | String (cuid) | Int (auto increment) |
| Cron | 1 lần/ngày | 2 lần/ngày (8h sáng + 8h tối) |

---

## Bước 1: Cập nhật code trên GitHub

```bash
git add .
git commit -m "v2: replace OAuth with club scraping, admin auth, athlete model"
git push origin main
```

Vercel sẽ tự động build lại sau khi push.

---

## Bước 2: Cập nhật biến môi trường trên Vercel

Vào **Vercel Dashboard → Project → Settings → Environment Variables**:

### Xóa các biến cũ (không còn dùng):
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `ADMIN_EMAILS`
- `GOOGLE_CLIENT_ID` *(nếu có)*
- `GOOGLE_CLIENT_SECRET` *(nếu có)*

### Thêm biến mới:
| Key | Value |
|-----|-------|
| `ADMIN_JWT_SECRET` | Chuỗi random 32 ký tự (tạo bằng `openssl rand -base64 32`) |

### Giữ nguyên:
- `DATABASE_URL` ✓
- `DIRECT_URL` ✓
- `CRON_SECRET` ✓ *(đã có từ v1)*

---

## Bước 3: Reset database

> ⚠️ Lệnh này **xóa toàn bộ dữ liệu cũ** và tạo lại schema mới.

Chạy trên máy local (đã có `.env.local` với `DATABASE_URL` và `DIRECT_URL` của production):

```bash
npx prisma db push --force-reset
```

Nếu chưa có `.env.local` production, pull từ Vercel trước:
```bash
npx vercel env pull .env.local
npx prisma db push --force-reset
```

---

## Bước 4: Seed dữ liệu ban đầu

```bash
npm run db:seed
```

Lệnh này tạo:
- Tài khoản admin: **`admin` / `admin`**
- 1 challenge mẫu + 3 team (có thể xóa sau)

---

## Bước 5: Trigger redeploy trên Vercel

Sau khi đổi env vars, Vercel cần redeploy để áp dụng:

**Vercel Dashboard → Deployments → chọn deployment mới nhất → Redeploy**

Hoặc push thêm 1 commit nhỏ để trigger build mới.

---

## Bước 6: Kiểm tra sau khi deploy

1. Vào `https://your-app.vercel.app` → trang chủ hiện challenge, không có nút login ✓
2. Nhấn **"Admin"** trên header → chuyển tới `/admin/login` ✓
3. Đăng nhập: `admin` / `admin` ✓
4. Vào **Admin → Cài đặt** → nhập Strava session cookie ✓
5. Vào **Admin → Thử thách** → tạo challenge mới với **Strava Club ID** ✓
6. Vào **Admin → Vận động viên** → thêm VĐV với tên chính xác như Strava ✓
7. Vào **Admin → Nhóm** → tạo team và phân VĐV vào nhóm ✓
8. Vào **Admin → Cào dữ liệu** → nhấn "Cào ngay" để test ✓

---

## Lấy Strava Session Cookie

1. Đăng nhập [strava.com](https://strava.com) trên Chrome
2. F12 → **Application** → **Cookies** → `https://www.strava.com`
3. Copy giá trị cookie `_strava4_session`
4. Dán vào **Admin → Cài đặt**

---

## Lưu ý vận hành

- **Strava Club ID**: Lấy từ URL club của bạn: `strava.com/clubs/XXXXXXX`
- **Tên VĐV**: Phải khớp chính xác với tên trên Strava (phân biệt hoa/thường, dấu)
- **Session cookie** hết hạn sau vài ngày → banner vàng cảnh báo sẽ hiện khi cần update
- **Cron tự động**: chạy 8h sáng và 8h tối (giờ VN), chỉ cào hoạt động trong ngày
