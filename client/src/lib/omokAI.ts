/**
 * omokAI.ts — 오목 AI 모듈
 *
 * 재귀적인 미니맥스 대신, 사람이 오목을 둘 때 실제로 생각하는 순서를 그대로 코드로 옮긴
 * "규칙 우선순위" 방식이다.
 *
 *   1) 내가 지금 두면 바로 이기는 자리가 있는가? → 있으면 무조건 그곳에 둔다.
 *   2) 상대가 다음 차례에 이길 수 있는 자리가 있는가? → 있으면 반드시 그곳을 막는다.
 *   3) 그것도 아니라면, "이 자리에 두면 내 공격력이 얼마나 세지는지 + 상대 공격을
 *      얼마나 막는지"를 점수로 매겨서 가장 높은 곳에 둔다 (evaluateBoard/scoreCell).
 *   4) 어려움 난이도는 3번에서 후보 몇 개를 추려, "내가 여기 두면 상대는 최선으로
 *      어떻게 응수할까?"까지 한 수만 더 내다보고 고른다 (재귀 없이 이중 for문으로 충분).
 *
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

/**
 * 돌이 이미 놓인 칸 주변(2칸 이내)의 빈 칸만 후보로 추리고, "공격 점수"와 "수비 점수"
 * 중 큰 쪽을 기준으로 정렬한다. 이렇게 하면 15x15 = 225칸을 전부 검사하지 않아도
 * 되고, "상대가 다음 수에 이기는 자리"도 항상 상위권에 걸려서 놓치지 않는다.
 */
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

// ── 우선순위 규칙 ────────────────────────────────────────────────────────────────

/** candidates 중에 color가 두면 바로 5줄이 완성되는 자리가 있으면 그 자리를 반환 */
function findImmediateWin(board: Cell[][], candidates: [number, number][], color: Cell): [number, number] | null {
  for (const [r, c] of candidates) {
    board[r][c] = color
    const wins = checkWin(board, r, c, color)
    board[r][c] = null
    if (wins) return [r, c]
  }
  return null
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
// 쉬움 난이도는 상대의 승리 위협을 이 확률로만 막는다 (나머지는 못 본 척 넘어감 → 훨씬 쉬움)
const EASY_BLOCK_CHANCE = 0.25

export async function getAiMove(
  board: Cell[][],
  aiColor: Cell,
  difficulty: Difficulty,
): Promise<[number, number]> {
  const b = board.map((row) => [...row]) // 원본 보드를 건드리지 않도록 복사
  const humanColor: Cell = aiColor === 'white' ? 'black' : 'white'

  const candidates = getCandidates(b, aiColor, 24)
  if (candidates.length === 0) return [7, 7]

  // 1. 내가 지금 이길 수 있으면 무조건 이긴다 (모든 난이도 공통)
  const winMove = findImmediateWin(b, candidates, aiColor)
  if (winMove) return winMove

  // 2. 상대가 다음 수에 이길 수 있으면 막는다 — 쉬움은 가끔 놓치고, 보통/어려움은 항상 막는다
  const shouldCheckBlock = difficulty !== 'easy' || Math.random() < EASY_BLOCK_CHANCE
  if (shouldCheckBlock) {
    const blockMove = findImmediateWin(b, candidates, humanColor)
    if (blockMove) return blockMove
  }

  // 3. 쉬움: 전략을 거의 안 보고 후보 중 완전히 무작위로 선택 (아주 약하게)
  if (difficulty === 'easy') {
    return candidates[Math.floor(Math.random() * candidates.length)]
  }

  // 4. 보통: 지금 당장 공격+수비 점수가 가장 높은 자리에 둔다 (앞을 내다보지 않는 1수 판단)
  if (difficulty === 'normal') {
    return candidates[0]
  }

  // 5. 어려움: "나 → 상대 최선 응수 → 나의 최선 응수"까지 세 수를 내다본다.
  //    재귀 대신 for문 3겹으로 구현해서 depth/alpha/beta 없이도 그대로 읽힌다.
  let bestMove = candidates[0]
  let bestWorstCase = -Infinity

  for (const [r1, c1] of candidates.slice(0, 10)) {
    b[r1][c1] = aiColor
    const opponentReplies = getCandidates(b, humanColor, 8)

    // 상대가 둘 수 있는 응수들 중 "내가 그다음에 최선으로 대응해도" 나에게 가장 불리한 경우를 찾는다
    let worstForMe = Infinity
    for (const [r2, c2] of opponentReplies) {
      b[r2][c2] = humanColor
      const myFollowUps = getCandidates(b, aiColor, 6)

      let bestFollowUp = -Infinity
      for (const [r3, c3] of myFollowUps) {
        b[r3][c3] = aiColor
        bestFollowUp = Math.max(bestFollowUp, evaluateBoard(b, aiColor))
        b[r3][c3] = null
      }

      worstForMe = Math.min(worstForMe, bestFollowUp)
      b[r2][c2] = null
    }

    b[r1][c1] = null

    // 상대가 최선을 다해도 그나마(=결국) 내가 가장 유리해지는 첫 수를 고른다
    if (worstForMe > bestWorstCase) {
      bestWorstCase = worstForMe
      bestMove = [r1, c1]
    }
  }

  return bestMove
}
