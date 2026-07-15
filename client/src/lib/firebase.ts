// Firebase 앱을 한 번만 초기화하고, 여기서 만든 auth/db를 다른 파일에서 가져다 쓴다.
// 설정값은 .env 파일에서 읽는다 (README의 "Firebase 설정하기" 참고).
//
// Storage는 일부러 안 쓴다 — Firebase Storage는 유료(Blaze) 요금제로 업그레이드해야 켤 수 있어서,
// 프로필 사진은 작게 압축한 뒤 Firestore 문서 안에 직접 저장한다 (client/src/lib/image.ts 참고).

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)

// 아이패드 사파리 등 일부 브라우저/네트워크(공용 와이파이, 방화벽 등)에서는 Firestore가 기본으로
// 쓰는 실시간 스트리밍(WebChannel) 연결이 조용히 끊긴 채로 남아있는 경우가 있다. 그러면 "쓰기"는
// 정상적으로 되는데(내 화면엔 반영됨) 상대방에게 실시간으로 오는 변경 알림(onSnapshot)만 멈춰서,
// 상대가 돌을 둬도 내 화면에는 안 보이는 것처럼 보인다. long polling을 자동 감지해서 필요할 때
// 대체 연결 방식으로 전환하도록 설정하면 이 문제가 해결된다.
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
})
