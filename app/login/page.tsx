'use client'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Image from 'next/image'

export default function LoginPage() {
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session?.user) router.push('/')
  }, [session, router])

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <Image src="/logo.png" alt="Club Logo" width={64} height={64} className="rounded-lg" />
          <h1 className="font-display text-5xl tracking-widest mb-2">
            QuảngYên<span className="text-orange-500">Runner</span>
          </h1>
          <p className="text-zinc-400 text-sm">
            Thử thách chạy bộ cộng đồng cùng QYR — Kết nối Strava để bắt đầu
          </p>
        </div>

        <div className="card p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-1">Chào mừng bạn!</h2>
            <p className="text-zinc-400 text-sm">Đăng nhập bằng tài khoản Strava để tham gia thử thách</p>
          </div>

          <button
            onClick={() => signIn('strava', { callbackUrl: '/' })}
            className="w-full flex items-center justify-center gap-3 bg-[#FC4C02] hover:bg-[#e64400] text-white font-semibold py-3 rounded-xl transition-all duration-200 active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            Đăng nhập với Strava
          </button>

          <p className="text-center text-xs text-zinc-500">
            Bằng cách đăng nhập, bạn cho phép ứng dụng đọc dữ liệu hoạt động chạy bộ từ Strava.
          </p>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6">
          Dành cho cộng đồng chạy bộ nội bộ · Powered by Strava API
        </p>
      </div>
    </div>
  )
}
