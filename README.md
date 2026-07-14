# 오목왕 — 온라인 오목 대전 사이트

React(프론트엔드) + Firebase(Authentication/Firestore)로 만든, 별도 서버 없는(서버리스) 오목 대전 웹사이트. 무료 요금제(Spark)만으로 동작한다.

- 회원가입/로그인
- 캐릭터 선택 + 사진 업로드로 얼굴 커스터마이징 (대기/승리/패배 모션)
- 1:1 실시간 대전 (방 생성 → 다른 사용자가 목록에서 방을 골라 입장)
- AI 대전 (미니맥스 + 알파-베타 가지치기, 난이도 3단계)
- 대전 결과 저장 (승/패 기록, 랭킹)
- GitHub Actions로 push하면 Firebase Hosting에 자동 배포

## 폴더 구조

```
client/             프론트엔드 (React + Vite) — 이 프로젝트의 전부
firestore.rules     Firestore 보안 규칙
firebase.json       Firebase Hosting/Firestore 설정
.github/workflows/  GitHub Actions 자동 배포 워크플로
```

서버가 따로 없다. 회원가입/로그인은 Firebase Authentication이, 대국방/전적/프로필 사진까지 전부 Firestore가 담당한다. 실시간 동기화(상대방과 돌이 동시에 보이는 것)는 Firestore의 실시간 구독 기능으로 처리한다.

> **Storage를 왜 안 쓰나요?** Firebase Storage는 이제 유료(Blaze) 요금제로 업그레이드해야만 켤 수 있다. 그래서 프로필 사진은 업로드할 때 브라우저에서 작은 정사각형 이미지로 줄이고 압축해서(`client/src/lib/image.ts`) Firestore 문서 안에 직접 저장한다. 무료 요금제로 충분하다.

## 1. Firebase 프로젝트 만들기

1. [Firebase 콘솔](https://console.firebase.google.com/)에 접속해 구글 계정으로 로그인한다.
2. **프로젝트 추가** → 원하는 이름 입력(예: `omok-game`) → 애널리틱스는 꺼도 된다 → 프로젝트 만들기.
3. 프로젝트 화면 왼쪽 위 **⚙️ (프로젝트 설정)** → 아래로 스크롤해서 **내 앱** 섹션 → **</> (웹 앱 추가)** 아이콘 클릭 → 앱 닉네임 아무거나 입력 → 앱 등록.
4. 그러면 `firebaseConfig = { apiKey: "...", authDomain: "...", ... }` 같은 코드가 보인다. 이 값들을 잠시 후 `.env` 파일에 넣을 것이므로 이 화면을 열어둔다 (나중에 프로젝트 설정 페이지에서 다시 볼 수도 있다).

### Authentication(로그인) 켜기

왼쪽 메뉴 **빌드 > Authentication** → **시작하기** → **로그인 방법** 탭 → **이메일/비밀번호** 선택 → 사용 설정 켜고 저장.

로그인 화면의 "게스트로 체험하기" 버튼(회원가입 없이 바로 시작)을 쓰려면, 같은 **로그인 방법** 탭에서 **익명** 항목도 사용 설정으로 켜야 한다. 안 켜면 게스트 버튼을 눌렀을 때 에러가 뜬다.

### Firestore(데이터베이스) 만들기

왼쪽 메뉴 **빌드 > Firestore Database** → **데이터베이스 만들기** → 위치는 아무거나(가까운 지역 추천, 예: `asia-northeast3`) → 처음엔 **테스트 모드**로 시작해도 되고, 잠금 모드로 시작해도 상관없다 (이 저장소의 `firestore.rules`를 배포하면 그 규칙으로 덮어써진다).

(Storage는 켤 필요 없다 — 프로필 사진은 Firestore에 직접 저장한다.)

## 2. 로컬에서 실행하기

Node.js가 설치되어 있어야 한다 (18 버전 이상 권장).

```bash
cd client
npm install
cp .env.example .env   # 그다음 .env를 열어서 Firebase 설정값을 채워넣는다
npm run dev
```

브라우저에서 http://localhost:8443 접속.

1:1 대전을 테스트하려면 브라우저 창 2개(또는 일반 창 + 시크릿 창)를 열어 서로 다른 계정으로 각각 회원가입한 뒤, 한쪽에서 방을 만들고 다른 쪽에서 그 방에 입장하면 된다.

## 3. 보안 규칙 배포하기

Firestore에 "누가 뭘 읽고 쓸 수 있는지"를 정하는 규칙(`firestore.rules`)은 콘솔에서 기본값으로 시작하면 반영되지 않는다. Firebase CLI로 한 번 배포해야 한다.

```bash
npm install -g firebase-tools   # 최초 1회
firebase login                  # 구글 계정 로그인
```

`.firebaserc` 파일을 열어 `"default": "여기에-내-firebase-project-id-입력"` 부분을 실제 프로젝트 ID(프로젝트 설정 화면에 보이는 `projectId`)로 바꾼 뒤:

```bash
firebase deploy --only firestore:rules
```

## 4. GitHub Actions로 자동 배포하기

1. GitHub에 새 저장소를 만들고 이 프로젝트를 push한다.
2. **서비스 계정 키 만들기**: Firebase 콘솔 → 프로젝트 설정 → **서비스 계정** 탭 → **새 비공개 키 생성** → 다운로드된 JSON 파일을 텍스트 에디터로 열어 전체 내용을 복사해둔다.
3. GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret**에서 아래 항목들을 등록한다:
   - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` — `.env`에 넣은 값과 동일
   - `FIREBASE_SERVICE_ACCOUNT` — 2번에서 복사한 JSON 전체를 그대로 붙여넣기
4. `main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 자동으로 빌드해서 Firebase Hosting에 배포한다. 배포된 주소는 Firebase 콘솔 **Hosting** 메뉴에서 확인할 수 있다 (보통 `https://<project-id>.web.app`).

## 데이터는 어디에 저장되나요?

- 계정/로그인: Firebase **Authentication**
- 프로필(닉네임, 캐릭터, 승/패), 프로필 사진, 대국방 상태: **Firestore** (`users`, `rooms` 컬렉션) — 사진은 작게 압축한 base64 문자열로 `users` 문서의 `photoUrl` 필드에 저장된다.

## 서버 없이 만들었을 때의 한계 (알아두면 좋은 점)

- **온라인 목록은 정확하지 않을 수 있다**: 실시간 "접속 끊김 감지"가 없어서, 로비에 있는 동안 15초마다 "나 아직 있어요" 신호를 보내는 방식(하트비트)으로 흉내낸다. 최근 30초 안에 신호를 보낸 사람만 온라인으로 표시된다.
- **상대가 탭을 꺼버리면**: 서버가 없어서 즉시 알아챌 수 없다. 대신 매 턴마다 60초 타이머가 있고, 시간이 지나면 상대 클라이언트가 자동으로 기권 처리를 걸어준다.
- **부정행위 방지가 약하다**: 오목이 완성됐는지, 승패가 맞는지를 최종 검증해줄 서버가 없다. Firestore 보안 규칙로 "이상한 값 쓰기"는 최대한 막아뒀지만, 진짜 서버만큼 완벽하게 막을 수는 없다. 학교 프로젝트 규모에서는 감수할 만한 트레이드오프로 보고 진행했다.
