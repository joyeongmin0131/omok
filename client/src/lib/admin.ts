// 이 이메일들로 로그인하면 관리자 권한(진행 중인 게임 중단, 대기 중인 방 삭제)을 갖는다.
// 실제 권한 검사는 firestore.rules에도 똑같이 들어있다 — 여기 목록은 "버튼을 보여줄지"만
// 결정하고, 진짜 쓰기 권한은 서버(Firestore 규칙) 쪽에서 최종적으로 막아준다.
const ADMIN_EMAILS = [
  'zlzmsrlfls08@gmail.com',
  'aaaaaangaa@gmail.com',
  'kal571074@gmail.com',
  'sineunju414@gmail.com',
  'seohyun4452@naver.com',
]

export function isAdmin(email: string): boolean {
  return ADMIN_EMAILS.includes(email)
}
