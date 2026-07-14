import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import LoginScreen from './components/LoginScreen'
import ProfileSetupScreen from './components/ProfileSetupScreen'
import LobbyScreen from './components/LobbyScreen'
import GameModeScreen from './components/GameModeScreen'
import GameScreen from './components/GameScreen'
import { auth } from './lib/firebase'
import { getUserProfile } from './lib/api'
import { startPresenceHeartbeat, stopPresenceHeartbeat } from './lib/presence'

export type Screen = 'login' | 'profile' | 'lobby' | 'gamemode' | 'game'
export type GameMode = 'pvp' | 'ai'
export type AIDifficulty = 'easy' | 'normal' | 'hard'

export interface User {
  id: string
  email: string
  nickname: string
  character: string
  photoUrl: string | null
  wins: number
  losses: number
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [user, setUser] = useState<User | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [gameMode, setGameMode] = useState<GameMode>('ai')
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('normal')
  const [pvpRoomId, setPvpRoomId] = useState<string | null>(null)

  // Firebase가 기억해둔 로그인 상태를 복원한다 (새로고침해도 로그아웃되지 않도록)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid)
        if (profile) {
          setUser(profile)
          startPresenceHeartbeat(profile.id)
          setScreen((s) => (s === 'login' ? 'lobby' : s))
        }
      }
      setCheckingSession(false)
    })
    return unsubscribe
  }, [])

  function handleAuthenticated(u: User, isNewAccount: boolean) {
    setUser(u)
    startPresenceHeartbeat(u.id)
    setScreen(isNewAccount ? 'profile' : 'lobby')
  }

  function handleProfileComplete(u: User) {
    setUser(u)
    setScreen('lobby')
  }

  function handleStartAi(difficulty: AIDifficulty) {
    setGameMode('ai')
    setAiDifficulty(difficulty)
    setScreen('game')
  }

  function handleStartPvp(roomId: string) {
    setGameMode('pvp')
    setPvpRoomId(roomId)
    setScreen('game')
  }

  function handleLeaveGame() {
    setPvpRoomId(null)
    setScreen('lobby')
  }

  async function handleLogout() {
    stopPresenceHeartbeat()
    await signOut(auth)
    setUser(null)
    setScreen('login')
  }

  // 대전 결과로 내 승/패가 바뀌면 앱 전체 상태에도 반영해서 로비/랭킹에 바로 보이게 한다
  function handleUserUpdate(patch: Partial<User>) {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  if (checkingSession) return null

  if (screen === 'login') return <LoginScreen onAuthenticated={handleAuthenticated} />
  if (screen === 'profile' && user) return <ProfileSetupScreen user={user} onComplete={handleProfileComplete} />
  if (screen === 'lobby' && user)
    return <LobbyScreen user={user} onStartGame={() => setScreen('gamemode')} onLogout={handleLogout} />
  if (screen === 'gamemode' && user)
    return (
      <GameModeScreen
        user={user}
        onStartAi={handleStartAi}
        onStartPvp={handleStartPvp}
        onBack={() => setScreen('lobby')}
      />
    )
  if (screen === 'game' && user && (gameMode === 'ai' || pvpRoomId))
    return (
      <GameScreen
        user={user}
        gameMode={gameMode}
        aiDifficulty={aiDifficulty}
        pvpRoomId={pvpRoomId}
        onLeave={handleLeaveGame}
        onUserUpdate={handleUserUpdate}
      />
    )

  return null
}
