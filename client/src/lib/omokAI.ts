/**
 * omokAI.ts — 오목 AI 모듈
 *
 * 프론트엔드 미니맥스 구현체입니다.
 * 백엔드 연동 시 `getAiMove` 함수만 교체하면 됩니다.
 *
 * 백엔드 교체 예시:
 *   export async function getAiMove(board, color, difficulty) {
 *     const res = await fetch('/api/ai/move', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ board, color, difficulty }),
 *     })
 *     const { row, col } = await res.json()
 *     return [row, col] as [number, number]
 *   }
 *
 * 백엔드 요청/응답 스펙:
 *   POST /api/ai/move
 *   Request:  { board: (null|'black'|'white')[][], color: 'black'|'white', difficulty: 'easy'|'normal'|'hard' }
 *   Response: { row: number, col: number }
 */

export type Cell = 'black' | 'white' | null
export type Difficulty = 'easy' | 'normal' | 'hard'

export const SIZE = 15
const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]] as const

// ── Utility ──────────────────────────────────────────────────────────────────

export function createBoard(): Cell[][] {
  return Array.from({ length: SIZE }, () => Array<Cell>(SIZE).fill(null))
}

export function checkWin(board: Cell[][], r: number, c: number, color: Cell): boolean {
  if (!color) return false
  for (const [dr, dc] of DIRS) {
    let n = 1
    for (let s = 1; s < 5; s++) {
      const nr = r + dr * s, nc = c + dc * s
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || board[nr][nc] !== color) break
      n++
    }
    for (let s = 1; s < 5; s++) {
      const nr = r - dr * s, nc = c - dc * s
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || board[nr][nc] !== color) break
      n++
    }
    if (n >= 5) return true
  }
  return false
}

export function getWinLine(board: Cell[][], r: number, c: number, color: Cell): [number, number][] {
  if (!color) return []
  for (const [dr, dc] of DIRS) {
    const line: [number, number][] = [[r, c]]
    for (let s = 1; s < 5; s++) {
      const nr = r + dr * s, nc = c + dc * s
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || board[nr][nc] !== color) break
      line.push([nr, nc])
    }
    for (let s = 1; s < 5; s++) {
      const nr = r - dr * s, nc = c - dc * s
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || board[nr][nc] !== color) break
      line.push([nr, nc])
    }
    if (line.length >= 5) return line
  }
  return []
}

// ── Evaluation ────────────────────────────────────────────────────────────────

/**
 * 한 방향으로 연속 돌 수, 앞뒤 열린 공간 수를 계산
 */
function scanDir(
  board: Cell[][], r: number, c: number, dr: number, dc: number, color: Cell
): { count: number; open: number } {
  let count = 0
  let open = 0
  let nr = r + dr, nc = c + dc
  while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === color) {
    count++; nr += dr; nc += dc
  }
  if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !board[nr][nc]) open++
  return { count, open }
}

/**
 * 특정 셀에 color 돌을 놓았을 때의 패턴 점수
 * 이미 해당 셀에 color 돌이 있다고 가정하고 호출
 */
function scoreCell(board: Cell[][], r: number, c: number, color: Cell): number {
  let score = 0
  for (const [dr, dc] of DIRS) {
    const f = scanDir(board, r, c, dr, dc, color)
    const b = scanDir(board, r, c, -dr, -dc, color)
    const total = f.count + b.count + 1
    const opens = f.open + b.open

    if (total >= 5)          score += 1_000_000
    else if (total === 4 && opens === 2) score += 100_000
    else if (total === 4 && opens === 1) score += 10_000
    else if (total === 3 && opens === 2) score += 10_000
    else if (total === 3 && opens === 1) score += 1_000
    else if (total === 2 && opens === 2) score += 1_000
    else if (total === 2 && opens === 1) score += 100
    else if (total === 1 && opens === 2) score += 10
  }
  return score
}

/**
 * 보드 전체 정적 평가: AI 점수 - 상대 점수
 * aiColor 기준 양수일수록 AI에 유리
 */
function evaluateBoard(board: Cell[][], aiColor: Cell): number {
  const humanColor: Cell = aiColor === 'white' ? 'black' : 'white'
  let score = 0
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === aiColor) score += scoreCell(board, r, c, aiColor)
      else if (board[r][c] === humanColor) score -= scoreCell(board, r, c, humanColor)
    }
  }
  return score
}

// ── Candidate generation ──────────────────────────────────────────────────────

function getCandidates(board: Cell[][], color: Cell, limit = 20): [number, number][] {
  let hasStone = false
  const seen = new Set<number>()
  const raw: [number, number][] = []

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!board[r][c]) continue
      hasStone = true
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const nr = r + dr, nc = c + dc
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !board[nr][nc]) {
            const key = nr * SIZE + nc
            if (!seen.has(key)) { seen.add(key); raw.push([nr, nc]) }
          }
        }
      }
    }
  }
  if (!hasStone) return [[7, 7]]

  const opponent: Cell = color === 'black' ? 'white' : 'black'

  // 공격 점수(내가 두면 얼마나 좋은지)와 수비 점수(상대가 두면 얼마나 위협적인지)를
  // 둘 다 계산해서 더 큰 쪽으로 후보를 정렬한다. 이렇게 해야 "상대가 다음 수에 이기는
  // 자리"를 후보 목록에서 놓치지 않고 항상 상위권에 올려서 막을 수 있다.
  return raw
    .map(([r, c]) => {
      board[r][c] = color
      const attack = scoreCell(board, r, c, color)
      board[r][c] = opponent
      const defense = scoreCell(board, r, c, opponent)
      board[r][c] = null
      return { pos: [r, c] as [number, number], score: Math.max(attack, defense * 0.9) }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.pos)
}

// ── Minimax with Alpha-Beta Pruning ───────────────────────────────────────────

/**
 * 미니맥스 알고리즘 (알파-베타 가지치기)
 * @param board  현재 보드 상태
 * @param depth  탐색 깊이 (easy:2 / normal:3 / hard:4)
 * @param alpha  알파값
 * @param beta   베타값
 * @param isMax  최대화 플레이어(AI) 차례 여부
 * @param aiColor AI 돌 색상
 */
function minimax(
  board: Cell[][],
  depth: number,
  alpha: number,
  beta: number,
  isMax: boolean,
  aiColor: Cell,
): number {
  if (depth === 0) return evaluateBoard(board, aiColor)

  const humanColor: Cell = aiColor === 'white' ? 'black' : 'white'
  const mover = isMax ? aiColor : humanColor
  const candidates = getCandidates(board, mover, depth >= 3 ? 12 : 20)
  if (candidates.length === 0) return 0

  if (isMax) {
    let best = -Infinity
    for (const [r, c] of candidates) {
      board[r][c] = aiColor
      if (checkWin(board, r, c, aiColor)) { board[r][c] = null; return 1_000_000 + depth }
      const val = minimax(board, depth - 1, alpha, beta, false, aiColor)
      board[r][c] = null
      best = Math.max(best, val)
      alpha = Math.max(alpha, best)
      if (beta <= alpha) break // 가지치기
    }
    return best
  } else {
    let best = Infinity
    for (const [r, c] of candidates) {
      board[r][c] = humanColor
      if (checkWin(board, r, c, humanColor)) { board[r][c] = null; return -1_000_000 - depth }
      const val = minimax(board, depth - 1, alpha, beta, true, aiColor)
      board[r][c] = null
      best = Math.min(best, val)
      beta = Math.min(beta, best)
      if (beta <= alpha) break
    }
    return best
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * AI의 다음 수를 계산합니다.
 *
 * 백엔드 연동 시 이 함수를 API 호출로 교체하세요 (위 파일 상단 주석 참고).
 *
 * @param board      현재 보드 (15x15, null|'black'|'white')
 * @param aiColor    AI 돌 색상
 * @param difficulty 난이도 ('easy' | 'normal' | 'hard')
 * @returns          [row, col] 착수 위치
 */
export async function getAiMove(
  board: Cell[][],
  aiColor: Cell,
  difficulty: Difficulty,
): Promise<[number, number]> {
  // 보드 deep copy — 미니맥스 내부에서 in-place mutation
  const b = board.map((row) => [...row])

  const depthMap: Record<Difficulty, number> = { easy: 2, normal: 3, hard: 4 }
  const depth = depthMap[difficulty]

  const candidates = getCandidates(b, aiColor, depth >= 3 ? 12 : 20)
  if (candidates.length === 0) return [7, 7]

  // Easy: 상위 후보 중 랜덤 (실력 약하게)
  if (difficulty === 'easy') {
    const pool = candidates.slice(0, 5)
    return pool[Math.floor(Math.random() * pool.length)]
  }

  let bestScore = -Infinity
  let bestMove = candidates[0]

  for (const [r, c] of candidates) {
    b[r][c] = aiColor
    if (checkWin(b, r, c, aiColor)) { b[r][c] = null; return [r, c] } // 즉시 승리
    const score = minimax(b, depth - 1, -Infinity, Infinity, false, aiColor)
    b[r][c] = null
    if (score > bestScore) { bestScore = score; bestMove = [r, c] }
  }

  return bestMove
}
