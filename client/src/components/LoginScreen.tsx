import { useState } from 'react'
import type { User } from '../App'
import * as api from '../lib/api'

interface Props {
  onAuthenticated: (user: User, isNewAccount: boolean) => void
}

function StoneIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="16" fill="#8B5E3C" />
      <circle cx="22" cy="22" r="10" fill="#2A1A0E" />
      <circle cx="20" cy="20" r="3" fill="rgba(255,255,255,0.25)" />
      <circle cx="42" cy="42" r="10" fill="#F5F0E8" stroke="#C9A87C" strokeWidth="1.5" />
      <circle cx="40" cy="40" r="3" fill="rgba(255,255,255,0.6)" />
      <line x1="22" y1="8" x2="22" y2="56" stroke="#C9A87C" strokeWidth="1" opacity="0.4" />
      <line x1="42" y1="8" x2="42" y2="56" stroke="#C9A87C" strokeWidth="1" opacity="0.4" />
      <line x1="8" y1="22" x2="56" y2="22" stroke="#C9A87C" strokeWidth="1" opacity="0.4" />
      <line x1="8" y1="42" x2="56" y2="42" stroke="#C9A87C" strokeWidth="1" opacity="0.4" />
    </svg>
  )
}

export default function LoginScreen({ onAuthenticated }: Props) {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 입력해 주세요.')
      return
    }
    if (isRegister && !nickname.trim()) {
      setError('닉네임을 입력해 주세요.')
      return
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 해요.')
      return
    }

    setLoading(true)
    try {
      const { user } = isRegister
        ? await api.register(email.trim(), password, nickname.trim())
        : await api.login(email.trim(), password)
      onAuthenticated(user, isRegister)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했어요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #FBF4E6 0%, #EDD9B8 50%, #D4B896 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative board lines in background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(139,94,60,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(139,94,60,0.08) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }}
      />

      {/* Decorative stones */}
      <div
        style={{
          position: 'absolute',
          top: 48,
          left: 64,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #555, #1A1A1A)',
          opacity: 0.15,
          boxShadow: '4px 6px 12px rgba(0,0,0,0.2)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          right: 80,
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #FFF8EC, #E0D4C0)',
          opacity: 0.4,
          boxShadow: '4px 6px 12px rgba(0,0,0,0.15)',
          border: '2px solid rgba(201,168,124,0.5)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '30%',
          right: 48,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #555, #1A1A1A)',
          opacity: 0.1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '25%',
          left: 32,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #FFF8EC, #E0D4C0)',
          opacity: 0.3,
          border: '1.5px solid rgba(201,168,124,0.4)',
        }}
      />

      {/* Login Card */}
      <div
        style={{
          background: 'rgba(255, 248, 236, 0.95)',
          backdropFilter: 'blur(8px)',
          borderRadius: 24,
          padding: '48px 40px',
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 20px 60px rgba(61,43,31,0.15), 0 4px 16px rgba(61,43,31,0.1)',
          border: '1px solid rgba(201,168,124,0.4)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <StoneIcon />
          </div>
          <h1
            style={{
              fontFamily: "'Noto Serif KR', serif",
              fontSize: 32,
              fontWeight: 900,
              color: '#3D2B1F',
              margin: 0,
              letterSpacing: '-0.5px',
            }}
          >
            오목왕
          </h1>
          <p
            style={{
              fontSize: 14,
              color: '#9A7A62',
              marginTop: 6,
              fontWeight: 500,
            }}
          >
            과연 오목왕은 누구? 🏆
          </p>
        </div>

        {/* Tab: 로그인 / 회원가입 */}
        <div
          style={{
            display: 'flex',
            background: '#EDE0CC',
            borderRadius: 10,
            padding: 4,
            marginBottom: 28,
          }}
        >
          {(['login', 'register'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setIsRegister(tab === 'register'); setError('') }}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 7,
                border: 'none',
                background:
                  (tab === 'register') === isRegister ? '#FFF8EC' : 'transparent',
                color: (tab === 'register') === isRegister ? '#3D2B1F' : '#9A7A62',
                fontWeight: (tab === 'register') === isRegister ? 600 : 400,
                fontSize: 14,
                transition: 'all 0.2s',
                boxShadow:
                  (tab === 'register') === isRegister
                    ? '0 1px 4px rgba(61,43,31,0.12)'
                    : 'none',
              }}
            >
              {tab === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label
                style={{ fontSize: 13, fontWeight: 600, color: '#5C3D28', display: 'block', marginBottom: 6 }}
              >
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="omok@example.com"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 10,
                  border: '1.5px solid #C9A87C',
                  background: '#FBF4E6',
                  fontSize: 14,
                  color: '#3D2B1F',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#E85D40')}
                onBlur={(e) => (e.target.style.borderColor = '#C9A87C')}
              />
            </div>

            {isRegister && (
              <div>
                <label
                  style={{ fontSize: 13, fontWeight: 600, color: '#5C3D28', display: 'block', marginBottom: 6 }}
                >
                  닉네임
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="오목고수123"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #C9A87C',
                    background: '#FBF4E6',
                    fontSize: 14,
                    color: '#3D2B1F',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#E85D40')}
                  onBlur={(e) => (e.target.style.borderColor = '#C9A87C')}
                />
              </div>
            )}

            <div>
              <label
                style={{ fontSize: 13, fontWeight: 600, color: '#5C3D28', display: 'block', marginBottom: 6 }}
              >
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 10,
                  border: '1.5px solid #C9A87C',
                  background: '#FBF4E6',
                  fontSize: 14,
                  color: '#3D2B1F',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#E85D40')}
                onBlur={(e) => (e.target.style.borderColor = '#C9A87C')}
              />
            </div>
          </div>

          {error && (
            <div
              style={{
                marginTop: 12,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(232,93,64,0.1)',
                border: '1px solid rgba(232,93,64,0.3)',
                fontSize: 13,
                color: '#C0401F',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 24,
              width: '100%',
              padding: '14px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #E85D40, #C94C2E)',
              color: '#FFF8EC',
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: '0.3px',
              boxShadow: '0 4px 16px rgba(232,93,64,0.35)',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'default' : 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(232,93,64,0.45)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(232,93,64,0.35)'
            }}
          >
            {loading ? '처리 중...' : isRegister ? '회원가입하기' : '로그인'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#9A7A62' }}>
          {isRegister ? '이미 계정이 있나요?' : '아직 계정이 없나요?'}{' '}
          <button
            onClick={() => { setIsRegister(!isRegister); setError('') }}
            style={{
              background: 'none',
              border: 'none',
              color: '#E85D40',
              fontWeight: 600,
              fontSize: 13,
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            {isRegister ? '로그인' : '회원가입'}
          </button>
        </p>
      </div>
    </div>
  )
}
