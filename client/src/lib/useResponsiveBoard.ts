// 화면 크기(휴대폰 세로/가로, 태블릿, 데스크탑)에 맞춰 오목판 크기와 레이아웃 방향을 계산하는 훅.
//
// "옆에 두는 레이아웃(row)"과 "위아래로 쌓는 레이아웃(column)" 두 가지를 모두 계산해본 뒤,
// 그중 보드를 더 크게 그릴 수 있는 쪽을 자동으로 고른다. 그래서 세로로 긴 휴대폰에서도,
// 가로로 눕힌 휴대폰에서도 화면에 맞는 쪽을 알아서 선택한다.

import { useEffect, useState } from 'react'

interface ResponsiveBoardOptions {
  size: number // 오목판 한 변의 칸 수 (15)
  maxCell: number // 데스크탑 기준 칸 하나의 픽셀 크기
  maxPad: number // 데스크탑 기준 보드 테두리 여백
  minBoard: number // 아무리 화면이 작아도 이 픽셀 크기 밑으로는 줄이지 않는다
  rowReservedH: number // "옆에 두는" 레이아웃에서 보드 말고 가로로 차지하는 여백(사이드바 폭 등)
  rowReservedV: number // "옆에 두는" 레이아웃에서 보드 말고 세로로 차지하는 여백(위/아래 플레이어 바 등)
  colReservedH: number // "위아래로 쌓는" 레이아웃에서 보드 말고 가로로 차지하는 여백
  colReservedV: number // "위아래로 쌓는" 레이아웃에서 보드 말고 세로로 차지하는 여백(사이드바가 보드 아래로 내려오는 만큼 포함)
}

export function useResponsiveBoard(opts: ResponsiveBoardOptions) {
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  }))

  useEffect(() => {
    // 아이패드 등 태블릿 사파리는 스크롤/키보드/주소창 애니메이션 중에도 resize 이벤트를
    // 아주 자주(때론 초당 여러 번) 쏜다. 매번 그대로 setState 하면 보드 225칸이 통째로
    // 다시 그려져서 게임 도중 화면이 심하게 버벅인다(딜레이). 그래서
    //   1) requestAnimationFrame으로 한 프레임에 한 번만 계산하고
    //   2) 실제로 크기가 바뀌었을 때만 setState 해서 불필요한 리렌더를 건너뛴다.
    let frame = 0
    function onResize() {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        setViewport((prev) => {
          const width = window.innerWidth
          const height = window.innerHeight
          if (prev.width === width && prev.height === height) return prev
          return { width, height }
        })
      })
    }
    window.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('orientationchange', onResize, { passive: true })
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  const maxBoard = opts.maxCell * (opts.size - 1) + opts.maxPad * 2
  const rowBoard = Math.min(maxBoard, viewport.width - opts.rowReservedH, viewport.height - opts.rowReservedV)
  const colBoard = Math.min(maxBoard, viewport.width - opts.colReservedH, viewport.height - opts.colReservedV)
  const isNarrow = colBoard > rowBoard // 위아래로 쌓았을 때 보드를 더 크게 그릴 수 있으면 그 레이아웃을 쓴다
  const boardPx = Math.max(opts.minBoard, isNarrow ? colBoard : rowBoard)
  const pad = boardPx * (opts.maxPad / maxBoard)
  const cell = (boardPx - pad * 2) / (opts.size - 1)

  return { isNarrow, boardPx, pad, cell }
}
