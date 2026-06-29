'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  content: string
  children: React.ReactNode
}

export function Tooltip({ content, children }: TooltipProps) {
  const [show, setShow] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLSpanElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  function handleEnter() {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      setCoords({
        top: rect.top - 8, // 8px gap above trigger
        left: rect.left + rect.width / 2,
      })
    }
    setShow(true)
  }

  if (!content) return <>{children}</>

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        className="inline-flex"
      >
        {children}
      </span>

      {mounted && show && createPortal(
        <div
          className="fixed z-[9999] -translate-x-1/2 -translate-y-full px-3 py-2 rounded-lg
                     bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs
                     whitespace-normal w-max max-w-[240px] shadow-lg shadow-black/40 pointer-events-none"
          style={{ top: coords.top, left: coords.left }}
        >
          {content}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 -mt-px
                       border-4 border-transparent border-t-zinc-700"
          />
        </div>,
        document.body
      )}
    </>
  )
}