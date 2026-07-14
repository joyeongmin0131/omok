import { useEffect, useRef, useState } from 'react'
import type { User } from '../App'
import * as api from '../lib/api'
import { CHARACTERS, CharacterAvatar, type CharacterId } from '../lib/characters'

interface Props {
  user: User
  onComplete: (user: User) => void
  // 있으면 "프로필 수정" 모드로 취급 (취소 버튼이 나타나고, 완료 버튼 문구가 바뀜)
  onCancel?: () => void
}

export default function ProfileSetupScreen({ user, onComplete, onCancel }: Props) {
  const isEdit = !!onCancel

  const [selected, setSelected] = useState<CharacterId>((user.character as CharacterId) ?? 'bear')
  const [nickname, setNickname] = useState(user.nickname)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(user.photoUrl)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const selectedChar = CHARACTERS.find((c) => c.id === selected)!

  // 컴포넌트가 사라질 때 카메라가 켜져 있었다면 꺼준다
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [cameraOpen])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function openCamera() {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      streamRef.current = stream
      setCameraOpen(true)
    } catch {
      setCameraError('카메라를 사용할 수 없어요. 브라우저에서 카메라 권한을 허용했는지 확인해 주세요.')
    }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOpen(false)
  }

  function capturePhoto() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // 미리보기와 똑같이 좌우 반전해서 찍는다 (셀카 느낌 그대로 저장)
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' })
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
      closeCamera()
    }, 'image/jpeg', 0.9)
  }

  async function handleComplete() {
    if (!nickname.trim()) {
      setError('닉네임을 입력해 주세요!')
      return
    }
    if (nickname.trim().length < 2) {
      setError('닉네임은 2자 이상이어야 해요.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const { user: afterProfile } = await api.updateProfile(user.id, {
        nickname: nickname.trim(),
        character: selected,
      })
      const finalUser = photoFile ? (await api.uploadPhoto(user.id, photoFile)).user : afterProfile
      onComplete(finalUser)
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했어요.')
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
      {/* Background grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(139,94,60,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(139,94,60,0.07) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }}
      />

      {/* Decorative stones */}
      {[
        { top: 40, left: 60, size: 52, color: 'black', opacity: 0.12 },
        { bottom: 60, right: 70, size: 68, color: 'white', opacity: 0.35 },
        { top: '35%', right: 44, size: 36, color: 'black', opacity: 0.08 },
        { bottom: '30%', left: 28, size: 44, color: 'white', opacity: 0.28 },
      ].map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: s.top,
            bottom: s.bottom,
            left: s.left,
            right: s.right,
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            background:
              s.color === 'black'
                ? 'radial-gradient(circle at 35% 35%, #555, #1A1A1A)'
                : 'radial-gradient(circle at 35% 35%, #FFF8EC, #E0D4C0)',
            opacity: s.opacity,
            border: s.color === 'white' ? '1.5px solid rgba(201,168,124,0.4)' : 'none',
            boxShadow: '3px 5px 10px rgba(0,0,0,0.15)',
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Card */}
      <div
        style={{
          background: 'rgba(255,248,236,0.96)',
          backdropFilter: 'blur(8px)',
          borderRadius: 28,
          padding: '44px 40px 40px',
          width: '100%',
          maxWidth: 520,
          boxShadow: '0 20px 60px rgba(61,43,31,0.15), 0 4px 16px rgba(61,43,31,0.08)',
          border: '1px solid rgba(201,168,124,0.35)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {!isEdit && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
            {[1, 2].map((step) => (
              <div
                key={step}
                style={{
                  width: step === 2 ? 28 : 10,
                  height: 10,
                  borderRadius: 5,
                  background: step === 2 ? '#E85D40' : '#D4B896',
                  transition: 'width 0.3s',
                }}
              />
            ))}
          </div>
        )}

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h2
            style={{
              fontFamily: "'Noto Serif KR', serif",
              fontSize: 26,
              fontWeight: 900,
              color: '#3D2B1F',
              margin: '0 0 8px',
            }}
          >
            {isEdit ? '프로필 수정 ✏️' : '캐릭터를 선택해보장 🐾'}
          </h2>
          <p style={{ fontSize: 14, color: '#9A7A62', margin: 0 }}>
            {isEdit ? '캐릭터, 사진, 닉네임을 언제든 바꿀 수 있어요' : '오목판에서 나를 대표할 친구를 골라보세요!'}
          </p>
        </div>

        {/* Character row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 14,
            marginBottom: 12,
            flexWrap: 'wrap',
          }}
        >
          {CHARACTERS.map((char) => {
            const isSelected = selected === char.id
            return (
              <button
                key={char.id}
                onClick={() => setSelected(char.id)}
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  border: isSelected ? '3px solid #E85D40' : '3px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  background: 'none',
                  transform: isSelected ? 'scale(1.12) translateY(-4px)' : 'scale(1)',
                  transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
                  boxShadow: isSelected ? '0 8px 20px rgba(232,93,64,0.3)' : '0 3px 10px rgba(61,43,31,0.12)',
                  outline: 'none',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.transform = 'scale(1.06) translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(61,43,31,0.18)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = '0 3px 10px rgba(61,43,31,0.12)'
                  }
                }}
              >
                <CharacterAvatar character={char.id} size={68} />
                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: '#E85D40',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      color: 'white',
                      fontWeight: 700,
                      boxShadow: '0 2px 6px rgba(232,93,64,0.4)',
                    }}
                  >
                    ✓
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Selected label */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 16px',
              borderRadius: 20,
              background: selectedChar.bg,
              fontSize: 13,
              fontWeight: 600,
              color: '#5C3D28',
            }}
          >
            {selectedChar.label} 선택됨
          </span>
        </div>

        {/* Photo upload */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <CharacterAvatar character={selected} photoUrl={photoPreview} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label
                htmlFor="photo-input"
                style={{
                  display: 'inline-block',
                  padding: '9px 14px',
                  borderRadius: 10,
                  border: '1.5px solid #C9A87C',
                  background: '#FFF8EC',
                  color: '#5C3D28',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                📁 {photoPreview ? '사진 변경' : '사진 올리기'}
              </label>
              <input id="photo-input" type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />

              <button
                type="button"
                onClick={openCamera}
                style={{
                  padding: '9px 14px',
                  borderRadius: 10,
                  border: '1.5px solid #C9A87C',
                  background: '#FFF8EC',
                  color: '#5C3D28',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                📸 카메라로 촬영
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#9A7A62', margin: '6px 0 0' }}>
              올린 사진은 캐릭터 얼굴 자리에 동그랗게 나타나요 (선택사항)
            </p>
            {cameraError && (
              <p style={{ fontSize: 11, color: '#C0401F', margin: '4px 0 0' }}>{cameraError}</p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#EDE0CC', marginBottom: 24 }} />

        {/* Nickname input */}
        <div style={{ marginBottom: 8 }}>
          <label
            style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: '#5C3D28',
              marginBottom: 8,
            }}
          >
            닉네임
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value)
              setError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleComplete()}
            placeholder="오목고수, 돌려돌려, 오목왕..."
            maxLength={12}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 12,
              border: error ? '1.5px solid #E85D40' : '1.5px solid #C9A87C',
              background: '#FBF4E6',
              fontSize: 15,
              color: '#3D2B1F',
              fontFamily: "'Noto Sans KR', sans-serif",
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#E85D40'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = error ? '#E85D40' : '#C9A87C'
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 6,
            }}
          >
            {error ? (
              <span style={{ fontSize: 12, color: '#C0401F' }}>{error}</span>
            ) : (
              <span style={{ fontSize: 12, color: '#9A7A62' }}>
                친구들에게 보여질 이름이에요
              </span>
            )}
            <span style={{ fontSize: 12, color: '#C9A87C' }}>{nickname.length}/12</span>
          </div>
        </div>

        {/* Complete / Cancel buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          {isEdit && (
            <button
              onClick={onCancel}
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: 14,
                border: 'none',
                background: '#EDE0CC',
                color: '#5C3D28',
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? 'default' : 'pointer',
              }}
            >
              취소
            </button>
          )}
          <button
            onClick={handleComplete}
            disabled={loading}
            style={{
              flex: isEdit ? 1 : undefined,
              width: isEdit ? undefined : '100%',
              padding: '14px',
              borderRadius: 14,
              border: 'none',
              background:
                nickname.trim().length >= 2 && !loading
                  ? 'linear-gradient(135deg, #E85D40, #C94C2E)'
                  : '#D4B896',
              color: nickname.trim().length >= 2 && !loading ? '#FFF8EC' : '#9A7A62',
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: '0.3px',
              boxShadow:
                nickname.trim().length >= 2 && !loading ? '0 4px 16px rgba(232,93,64,0.35)' : 'none',
              transition: 'all 0.2s',
              cursor: nickname.trim().length >= 2 && !loading ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? '저장 중...' : isEdit ? '저장하기' : '오목판으로 출발! 🎮'}
          </button>
        </div>
      </div>

      {/* 카메라 촬영 모달 */}
      {cameraOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(61,43,31,0.7)',
            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 200, padding: 24,
          }}
        >
          <div style={{ background: '#FFF8EC', borderRadius: 20, padding: 24, maxWidth: 380, width: '100%' }}>
            <h3 style={{ margin: '0 0 12px', fontFamily: "'Noto Serif KR', serif", fontSize: 18, fontWeight: 800, color: '#3D2B1F', textAlign: 'center' }}>
              사진 촬영
            </h3>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', borderRadius: 12, background: '#000', transform: 'scaleX(-1)', display: 'block' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                onClick={closeCamera}
                style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', background: '#EDE0CC', color: '#5C3D28', fontWeight: 700, cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={capturePhoto}
                style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#E85D40,#C94C2E)', color: '#FFF8EC', fontWeight: 700, cursor: 'pointer' }}
              >
                📸 촬영
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
