import { ArrowLeft, Shield } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Chính sách bảo mật — QYR RunChallenge',
  description: 'Chính sách bảo mật dữ liệu của RunChallenge, bao gồm cách chúng tôi sử dụng dữ liệu từ Strava.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-orange-500/15 rounded-xl flex items-center justify-center border border-orange-500/20">
            <Shield className="w-5 h-5 text-orange-400" />
          </div>
          <h1 className="font-display text-4xl tracking-wider text-orange-400">CHÍNH SÁCH BẢO MẬT</h1>
        </div>
        <p className="text-zinc-500 text-sm mb-10">Cập nhật lần cuối: 25/06/2026</p>

        <div className="space-y-8 text-zinc-300 text-[15px] leading-relaxed">
          <section>
            <p>
              QYR RunChallenge ("chúng tôi", "ứng dụng") là một ứng dụng web phi thương mại được xây dựng
              để phục vụ cộng đồng chạy bộ nội bộ, giúp tổ chức các thử thách (challenge) chạy bộ theo nhóm
              và theo dõi tiến trình thông qua dữ liệu từ Strava. Chính sách này giải thích cách chúng tôi
              thu thập, sử dụng, lưu trữ và bảo vệ dữ liệu cá nhân của bạn.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-100 mb-3">1. Dữ liệu chúng tôi thu thập</h2>
            <p className="mb-3">Khi bạn đăng nhập và kết nối tài khoản Strava, chúng tôi thu thập:</p>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-400">
              <li>Thông tin hồ sơ cơ bản: tên, ảnh đại diện, ID vận động viên (athlete ID) từ Strava</li>
              <li>
                Dữ liệu hoạt động chạy bộ (Run activities): quãng đường, thời gian, tốc độ (pace),
                nhịp tim trung bình/tối đa, thời điểm bắt đầu hoạt động
              </li>
              <li>Mã truy cập OAuth (access token, refresh token) để đồng bộ dữ liệu hoạt động mới</li>
            </ul>
            <p className="mt-3 text-zinc-400">
              Chúng tôi <strong className="text-zinc-200">không thu thập</strong> dữ liệu vị trí GPS chi tiết
              (bản đồ tuyến đường), ảnh hoạt động, bình luận, hay bất kỳ dữ liệu cá nhân nhạy cảm nào khác
              ngoài những gì cần thiết để tính toán bảng xếp hạng.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-100 mb-3">2. Mục đích sử dụng dữ liệu</h2>
            <p className="mb-3">Dữ liệu được sử dụng duy nhất cho các mục đích sau, trong phạm vi nội bộ cộng đồng:</p>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-400">
              <li>Tính tổng quãng đường (km) của từng thành viên và từng nhóm (team) trong một thử thách</li>
              <li>Kiểm tra hoạt động có hợp lệ hay không dựa trên quy tắc do quản trị viên CLB đặt ra (quãng đường tối đa/hoạt động, khoảng nhịp tim, khoảng pace cho phép)</li>
              <li>Hiển thị bảng xếp hạng (leaderboard) công khai trong nội bộ thành viên đã tham gia thử thách</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-100 mb-3">3. Chia sẻ dữ liệu với bên thứ ba</h2>
            <p>
              Chúng tôi <strong className="text-zinc-200">không bán, không cho thuê, không chia sẻ</strong>{' '}
              dữ liệu cá nhân hoặc dữ liệu hoạt động Strava của bạn cho bất kỳ bên thứ ba nào ngoài mục đích
              vận hành ứng dụng đã nêu ở Mục 2. Dữ liệu chỉ được hiển thị cho các thành viên khác trong
              cùng cộng đồng/thử thách mà bạn đã đăng ký tham gia.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-100 mb-3">4. Lưu trữ và bảo mật</h2>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-400">
              <li>Dữ liệu được lưu trữ trên cơ sở dữ liệu PostgreSQL (Neon), có mã hóa kết nối (SSL)</li>
              <li>Access token/refresh token Strava được lưu trữ riêng biệt, chỉ dùng để gọi API đồng bộ hoạt động, không hiển thị cho bất kỳ ai</li>
              <li>Chúng tôi áp dụng các biện pháp bảo mật hợp lý để ngăn chặn truy cập trái phép, nhưng không thể đảm bảo an toàn tuyệt đối 100% như mọi hệ thống trên Internet</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-100 mb-3">5. Quyền của bạn</h2>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-400">
              <li>
                Bạn có thể <strong className="text-zinc-200">ngắt kết nối Strava bất kỳ lúc nào</strong>{' '}
                thông qua trang quản lý ứng dụng kết nối của Strava
                (<a href="https://www.strava.com/settings/apps" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">strava.com/settings/apps</a>)
              </li>
              <li>Bạn có thể yêu cầu xóa toàn bộ dữ liệu cá nhân của mình khỏi hệ thống bằng cách liên hệ quản trị viên CLB</li>
              <li>Sau khi ngắt kết nối, hệ thống sẽ ngừng đồng bộ hoạt động mới của bạn từ Strava</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-100 mb-3">6. Tuân thủ chính sách Strava API</h2>
            <p>
              Việc sử dụng dữ liệu Strava của chúng tôi tuân thủ{' '}
              <a href="https://www.strava.com/legal/api" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">
                Strava API Agreement
              </a>{' '}
              và Brand Guidelines của Strava. Dữ liệu Strava không được sử dụng để huấn luyện mô hình AI/machine learning,
              không được bán hoặc dùng cho mục đích quảng cáo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-100 mb-3">7. Liên hệ</h2>
            <p>
              Nếu bạn có câu hỏi về chính sách bảo mật này hoặc muốn yêu cầu xóa dữ liệu, vui lòng liên hệ
              quản trị viên của ứng dụng qua thông tin được cung cấp trong cộng đồng/CLB của bạn.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
