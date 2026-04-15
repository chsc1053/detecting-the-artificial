/**
 * File: components/participant/AutoTextarea.jsx
 * Purpose: Auto-growing textarea for open-ended responses (height follows content, capped).
 */

import { useRef, useLayoutEffect, useCallback } from 'react'

export function AutoTextarea({
  id,
  value,
  onChange,
  placeholder,
  'aria-label': ariaLabel,
  minHeightPx = 52,
  maxHeightPx = 280,
  className = '',
}) {
  const ref = useRef(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    const scrollH = el.scrollHeight
    const next = Math.max(minHeightPx, Math.min(scrollH, maxHeightPx))
    el.style.height = `${next}px`
    el.style.overflowY = scrollH > maxHeightPx ? 'auto' : 'hidden'
  }, [minHeightPx, maxHeightPx])

  useLayoutEffect(() => {
    resize()
  }, [value, resize])

  return (
    <textarea
      ref={ref}
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      aria-label={ariaLabel}
      rows={1}
      className={`participant-auto-textarea ${className}`.trim()}
      onInput={resize}
    />
  )
}
