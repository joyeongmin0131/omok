// Firebase 앱을 한 번만 초기화하고, 여기서 만든 auth/db를 다른 파일에서 가져다 쓴다.
// 설정값은 .env 파일에서 읽는다 (README의 "Firebase 설정하기" 참고).
//
// Storage는 일부러 안 쓴다 — Firebase Storage는 유료(Blaze) 요금제로 업그레이드해야 켤 수 있어서,
// 프로필 사진은 작게 압축한 뒤 Firestore 문서 안에 직접 저장한다 (client/src/lib/image.ts 참고).

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
