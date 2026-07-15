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
    function onResize() {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
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
