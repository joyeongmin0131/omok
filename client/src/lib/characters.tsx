// 5종 캐릭터 SVG 그림 데이터 + 어디서든 재사용할 수 있는 <CharacterAvatar /> 컴포넌트.
// CharacterAvatar는 캐릭터 그림 위에 (있다면) 사용자가 올린 사진을 얼굴 자리에 겹쳐 보여주고,
// animState에 따라 대기/승리/패배 애니메이션을 재생한다.

export type CharacterId = 'bear' | 'cat' | 'fox' | 'rabbit' | 'penguin'

interface CharacterDef {
  id: CharacterId
  label: string
  bg: string
  shapes: React.ReactNode
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'bear',
    label: '곰돌이',
    bg: '#FFD6D6',
    shapes: (
      <>
        <circle cx="20" cy="22" r="12" fill="#F4A8A8" />
        <circle cx="60" cy="22" r="12" fill="#F4A8A8" />
        <circle cx="20" cy="22" r="7" fill="#FFBABA" />
        <circle cx="60" cy="22" r="7" fill="#FFBABA" />
        <circle cx="40" cy="44" r="28" fill="#F9C8C8" />
        <ellipse cx="40" cy="54" rx="12" ry="9" fill="#FFB3B3" />
        <circle cx="30" cy="40" r="4.5" fill="#3D2B1F" />
        <circle cx="50" cy="40" r="4.5" fill="#3D2B1F" />
        <circle cx="31.5" cy="38.5" r="1.5" fill="white" />
        <circle cx="51.5" cy="38.5" r="1.5" fill="white" />
        <ellipse cx="40" cy="51" rx="4" ry="3" fill="#D97575" />
        <path d="M36 55 Q40 59 44 55" stroke="#D97575" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <ellipse cx="26" cy="49" rx="5" ry="3.5" fill="#FFAAA0" opacity="0.5" />
        <ellipse cx="54" cy="49" rx="5" ry="3.5" fill="#FFAAA0" opacity="0.5" />
      </>
    ),
  },
  {
    id: 'cat',
    label: '고양이',
    bg: '#D6EDFF',
    shapes: (
      <>
        <polygon points="14,28 22,8 32,28" fill="#A8CCEE" />
        <polygon points="18,26 22,12 28,26" fill="#C5DFF5" />
        <polygon points="48,28 58,8 66,28" fill="#A8CCEE" />
        <polygon points="52,26 58,12 62,26" fill="#C5DDF5" />
        <circle cx="40" cy="46" r="28" fill="#C5DCF2" />
        <ellipse cx="40" cy="55" rx="11" ry="8" fill="#B3CDE8" />
        <ellipse cx="30" cy="42" rx="4" ry="5" fill="#3D2B1F" />
        <ellipse cx="50" cy="42" rx="4" ry="5" fill="#3D2B1F" />
        <circle cx="31" cy="40" r="1.5" fill="white" />
        <circle cx="51" cy="40" r="1.5" fill="white" />
        <polygon points="40,51 37,54 43,54" fill="#88AACC" />
        <line x1="20" y1="53" x2="33" y2="55" stroke="#7AABCC" strokeWidth="1" opacity="0.7" />
        <line x1="20" y1="57" x2="33" y2="57" stroke="#7AABCC" strokeWidth="1" opacity="0.7" />
        <line x1="47" y1="55" x2="60" y2="53" stroke="#7AABCC" strokeWidth="1" opacity="0.7" />
        <line x1="47" y1="57" x2="60" y2="57" stroke="#7AABCC" strokeWidth="1" opacity="0.7" />
        <path d="M37 55 Q40 59 43 55" stroke="#88AACC" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <ellipse cx="26" cy="50" rx="5" ry="3" fill="#AACCE8" opacity="0.5" />
        <ellipse cx="54" cy="50" rx="5" ry="3" fill="#AACCE8" opacity="0.5" />
      </>
    ),
  },
  {
    id: 'fox',
    label: '여우',
    bg: '#FFE8CC',
    shapes: (
      <>
        <polygon points="12,30 20,6 36,28" fill="#F5A855" />
        <polygon points="17,28 21,10 32,27" fill="#FFCF8A" />
        <polygon points="44,28 60,6 68,30" fill="#F5A855" />
        <polygon points="48,27 59,10 63,28" fill="#FFCF8A" />
        <circle cx="40" cy="46" r="28" fill="#F5C070" />
        <ellipse cx="40" cy="50" rx="18" ry="20" fill="#FFF0D8" />
        <circle cx="30" cy="40" r="4.5" fill="#3D2B1F" />
        <circle cx="50" cy="40" r="4.5" fill="#3D2B1F" />
        <circle cx="31.5" cy="38.5" r="1.5" fill="white" />
        <circle cx="51.5" cy="38.5" r="1.5" fill="white" />
        <ellipse cx="40" cy="50" rx="3.5" ry="2.5" fill="#C07830" />
        <path d="M37 52 Q40 56 43 52" stroke="#C07830" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <ellipse cx="25" cy="48" rx="5" ry="3.5" fill="#F59040" opacity="0.4" />
        <ellipse cx="55" cy="48" rx="5" ry="3.5" fill="#F59040" opacity="0.4" />
      </>
    ),
  },
  {
    id: 'rabbit',
    label: '토끼',
    bg: '#E8D6FF',
    shapes: (
      <>
        <ellipse cx="27" cy="18" rx="9" ry="18" fill="#DDB8F5" />
        <ellipse cx="27" cy="18" rx="5" ry="13" fill="#F0D8FF" />
        <ellipse cx="53" cy="18" rx="9" ry="18" fill="#DDB8F5" />
        <ellipse cx="53" cy="18" rx="5" ry="13" fill="#F0D8FF" />
        <circle cx="40" cy="50" r="26" fill="#EDD5FF" />
        <ellipse cx="40" cy="58" rx="10" ry="7" fill="#E0C0F8" />
        <circle cx="31" cy="46" r="4" fill="#3D2B1F" />
        <circle cx="49" cy="46" r="4" fill="#3D2B1F" />
        <circle cx="32" cy="44.5" r="1.5" fill="white" />
        <circle cx="50" cy="44.5" r="1.5" fill="white" />
        <ellipse cx="40" cy="55" rx="3" ry="2" fill="#CC88EE" />
        <path d="M37 57 Q40 61 43 57" stroke="#CC88EE" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <ellipse cx="25" cy="52" rx="5" ry="3" fill="#CC99EE" opacity="0.45" />
        <ellipse cx="55" cy="52" rx="5" ry="3" fill="#CC99EE" opacity="0.45" />
      </>
    ),
  },
  {
    id: 'penguin',
    label: '펭귄',
    bg: '#D6F5E8',
    shapes: (
      <>
        <circle cx="40" cy="36" r="28" fill="#4A7A9B" />
        <ellipse cx="40" cy="42" rx="18" ry="20" fill="#E8F8F0" />
        <circle cx="31" cy="34" r="5" fill="white" />
        <circle cx="49" cy="34" r="5" fill="white" />
        <circle cx="31" cy="34" r="3" fill="#1A1A2E" />
        <circle cx="49" cy="34" r="3" fill="#1A1A2E" />
        <circle cx="32" cy="33" r="1" fill="white" />
        <circle cx="50" cy="33" r="1" fill="white" />
        <polygon points="40,42 36,48 44,48" fill="#F5A830" />
        <ellipse cx="25" cy="42" rx="5" ry="3.5" fill="#7ACCA8" opacity="0.5" />
        <ellipse cx="55" cy="42" rx="5" ry="3.5" fill="#7ACCA8" opacity="0.5" />
        <ellipse cx="18" cy="48" rx="6" ry="10" fill="#3A6A8B" opacity="0.6" />
        <ellipse cx="62" cy="48" rx="6" ry="10" fill="#3A6A8B" opacity="0.6" />
      </>
    ),
  },
]

export function getCharacter(id: string | undefined | null): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0]
}

export type CharacterAnimState = 'idle' | 'win' | 'lose'

const ANIMATIONS: Record<CharacterAnimState, string> = {
  idle: 'charIdleBob 2.4s ease-in-out infinite',
  win: 'charWinBounce 0.7s ease-in-out infinite',
  lose: 'charLoseSlump 1.6s ease-in-out infinite',
}

interface CharacterAvatarProps {
  character: string
  photoUrl?: string | null
  animState?: CharacterAnimState
  size?: number
}

// 캐릭터 그림 위에 사용자 사진을 원형으로 겹쳐서 "얼굴만 바뀐" 느낌을 준다.
// 귀/장식 같은 캐릭터의 바깥 부분은 그대로 보인다.
export function CharacterAvatar({ character, photoUrl, animState = 'idle', size = 56 }: CharacterAvatarProps) {
  const def = getCharacter(character)
  const photoSize = size * 0.56

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: def.bg,
        position: 'relative',
        flexShrink: 0,
        animation: ANIMATIONS[animState],
        transformOrigin: '50% 85%',
      }}
    >
      <svg viewBox="0 0 80 80" width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
        {def.shapes}
      </svg>
      {photoUrl && (
        <img
          src={photoUrl}
          alt=""
          style={{
            position: 'absolute',
            width: photoSize,
            height: photoSize,
            top: size * 0.34,
            left: (size - photoSize) / 2,
            borderRadius: '50%',
            objectFit: 'cover',
            border: `${Math.max(1, size * 0.03)}px solid rgba(255,255,255,0.85)`,
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          }}
        />
      )}
    </div>
  )
}
