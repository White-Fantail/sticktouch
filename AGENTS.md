# AGENTS.md — StickTouch 개발 에이전트 지침

> 이 문서는 StickTouch의 제품 결정, 개발 원칙, 브랜치 운영 규칙을 기록한다. 새 작업을 시작하는 AI 에이전트와 기여자는 이 파일을 먼저 읽고 `README.md` 및 `docs/PRODUCT_SPEC.md`를 참고할 것.
> 상태: **웹 MVP 확장판 (`dev`: 게임 18종)**. 아래 항목의 초창기 계획/당시 상태는 변경 이력으로 남긴다. 실제 현황은 문서 마지막의 최신 항목과 소스를 우선한다. PC/모바일 실기기 검증은 아직 필요하다.

## 1. 제품 목적

**StickTouch**는 Mac/노트북 웹캠 또는 모바일/태블릿 카메라 앞에서 자신의 몸을 컨트롤러로 사용하는, 브라우저 우선 카메라 모션 미니게임 플랫폼이다. 플레이어의 실제 모습(카메라 원본)을 게임에 활용하고, 관절/손/발/머리 등의 추정 위치를 가상 오브젝트와 충돌시키는 **2D 기반 실시간 게임**을 제공한다.

- 외부 모션 컨트롤러, 깊이 카메라, VR 헤드셋은 **필수 조건이 아니다**.
- 기본 입력은 웹캠/스마트폰 카메라 + 실시간 자세 추정(Pose Estimation).
- **배경 제거/사람 세그멘테이션은 MVP 필수 항목이 아니다.** 촬영 공간이 그대로 보여도 된다.
- 실제 3D 신체 복원이나 정교한 손가락 집기는 후속 연구 항목이며 초기 범위에서 제외한다.
- 게임마다 화면 배치와 활성화할 신체 터치 포인트가 달라질 수 있다.

## 2. 확정된 사용자 경험

### 2.1 세 가지 표시 모드 (실행 중 전환 가능하도록 설계)

1. **Camera**: 카메라 원본 + 게임 오브젝트/UI, 스틱맨 연결선은 숨김. 내부 포즈 추정·충돌 판정은 지속.
2. **Camera + Stickman**: 동일한 영상 위에 추적 관절/연결선으로 만든 스틱맨 표시. 개발 초기 권장 기본값.
3. **Stickman + Virtual Background**: 카메라 원본 화면은 숨기고 추적 스틱맨을 **가상 배경** 위에 표시. 실제 카메라는 내부 추적용으로만 사용.

**중요:** 표시 모드는 렌더링만 바꾸며 입력 좌표·게임 상태·충돌 판정·점수는 바꾸지 않는다. 카메라가 숨겨져도 권한/사용 여부를 명확히 알릴 것. 스틱맨 모드에서 선택/게임별 배경은 필수이다.

### 2.2 원형 터치 포인트 (Hitpoints)

- 관절 및 파생 앵커를 원형 충돌 영역으로 취급한다. **손, 발, 머리**는 우선 지원하며 게임에 따라 손목·팔꿈치·무릎·몸통도 활성화한다.
- 각 원의 중심은 신뢰 가능한 추정 좌표, 반지름은 **부위별 기본값 × 사용자가 고른 배율**로 계산한다.
- 크기 배율 프리셋: **정밀(예: 70%), 기본(100%), 넉넉(150%)**. 조절 가능한 프로토타입 범위는 **50~200%**를 제안하며 실제 수치는 테스트로 보정한다. 기기 픽셀 고정값만 사용하지 말고 플레이 영역/감지된 신체 크기 기준으로 정규화한다.
- **원 표시 ON/OFF**와 **실제 판정 영역 크기**는 반드시 별개 설정이다. 표시하지 않아도 충돌 판정은 동일해야 한다.
- 게임별로 활성 신체 부위를 선택하고, 방어/회피 게임에서는 판정 영역 확대가 난이도를 **높일 수도** 있음을 고려한다. UI에서 반지름을 무조건 Easy/Hard와 동치로 취급하지 않는다.
- 타격 중복 이벤트를 방지하기 위해 입장 판정, 쿨다운, 인식 신뢰도, 좌표 스무딩 등을 설계한다.

### 2.3 영상 합성과 좌표 정합성

- 카메라 입력 영상 → 포즈 추정 → 화면 좌표 변환 → 게임 충돌 → 렌더링 단계로 분리한다.
- 정규화된 좌표/타임스탬프/신뢰도를 기준으로 처리하며 **미러링, 종횡비, crop/contain/cover, 화면 크기, 회전**을 한 곳에서 일관되게 적용한다.
- 사용자 화면과 충돌 영역이 어긋나지 않도록 *동일한 좌표 변환*을 스틱맨, 터치 원, 카메라 오버레이, 게임 앵커에 적용한다.
- 게임마다 전체 화면 카메라뿐 아니라 **화면 아래 작은 카메라 영역** 같은 구성도 가능하게 한다. 그 경우 추적 좌표는 축소된 카메라 영역으로 변환하고, 게임 오브젝트는 전체 게임 화면 좌표에 배치한다.

## 3. 초기 미니게임 기획

### A. 사방에서 날아오는 물체 터뜨리기 (우선순위 1)

- 플레이어/실제 영상은 중앙에 배치. 상·하·좌·우에서 풍선 또는 물체가 들어옴.
- 활성 부위: 기본 양손(필요시 발/머리).
- 원형 터치 포인트와 가상 물체의 2D 충돌 시 터지는 효과·점수·사운드.
- 속도, 생성 빈도, 목표물 크기, 위험 물체, 제한 시간 등 단계적 난이도.

### B. 과일 바구니 받기 (우선순위 2)

- 플레이어(카메라 영상 **전체 직사각형**)를 화면 아래에 작게 배치하고, 상단 게임 영역에서 과일이 아래로 낙하. **배경 분리는 불필요**.
- 손목 두 점의 중간에 가상 바구니를 배치하거나 몸통 중심에 부착하는 입력 방식을 선택/폴백.
- 바구니와 과일 충돌로 득점. 떨어뜨린 과일, 폭탄 등 규칙 추가 가능.
- 카메라 축소·미러링·바구니 좌표 매핑·원형 히트박스 판정을 일치시킬 것.

### C. 포즈/리듬 맞추기 (우선순위 3)

- 손, 머리, 발의 터치 위치 또는 자세를 맞춰 점수를 얻는 간단한 게임.
- 입력 오차 허용 반경과 인식 지연을 고려해 플레이를 공정하게 한다.

향후 후보: 공 막기/피하기, 프리스비 던지기(손목 동작·속도 기반 게임용 근사), 간단한 2.5D 집기. **정밀한 3D 컵 쌓기/깊이 복원은 MVP에 포함하지 않는다.**

## 4. 권장 아키텍처 (아직 구현된 기술 스택으로 간주하지 말 것)

브라우저 우선, TypeScript를 권장한다. UI는 React + Vite 등 가벼운 구성, 포즈 추정은 **MediaPipe Pose Landmarker (Web)**, 초기 렌더링은 **Canvas 2D**로 검증한다. 3D/고급 물리 처리가 실제 필요해지면 Three.js/Rapier 같은 라이브러리의 도입을 별도로 평가한다.

모듈 경계:
- **CameraService**: 권한, 장치 선택, 프레임 스트림, 시작/정지/오류.
- **PoseTracker**: 관절 추정, 신뢰도, 프레임 타임스탬프, 추적 실패.
- **CoordinateMapper**: 카메라 화면 ↔ 게임 화면 변환, 미러/비율/레이아웃.
- **HitpointEngine**: 부위별 앵커, 반지름/배율, 활성화/비활성화, 충돌, 디바운스.
- **GameEngine**: 시간 기반 업데이트, 오브젝트, 점수, 라운드, 난이도.
- **Renderer**: Camera / Camera+Stickman / Stickman+Virtual Background; 포인트 표시 별도 설정.
- **GameModules**: 공통 입력 이벤트와 렌더링 API를 사용하는 독립 미니게임.
- **Settings/Calibration**: 카메라 방향·좌우 반전·표시 모드·터치 크기·신체 크기 보정.

관절 추정의 `z` 값은 일반 카메라 기반의 **절대 거리 센서 측정값이 아니다**. 후속 게임도 먼저 2D 또는 2.5D 매핑으로 구현하고 정밀한 3D 깊이를 가정하지 말 것.

## 5. 품질, 성능, 개인정보 및 안전

- **실시간 반응성 최우선.** 포즈 추정과 렌더링의 주기를 분리하고 기기 성능에 따라 추정 해상도/FPS를 조정할 것. 지연과 좌표 흔들림을 실제 기기에서 측정한다.
- HTTPS/localhost에서 카메라 권한을 요청하고, 거부/미지원/카메라 없음/장치 회전/탭 전환에 대응한다.
- **카메라 영상은 기본적으로 로컬 처리**. 영상·스켈레톤·관절 데이터를 서버로 업로드/보관하거나 녹화하지 않는다. 기능상 필요하면 별도의 명시적 사용자 동의를 먼저 설계한다.
- 플레이 전에 카메라 범위·적정 거리 보정, 주변 장애물 정리 안내 및 일시 정지를 제공한다.
- 키보드/터치로 메뉴 접근이 가능하게 하고, 인식 실패 시 명확히 안내한다. 어린이도 사용할 수 있도록 큰 컨트롤과 충분한 판정 여유를 고려한다.
- 최소 검증: 다양한 화면비, 거울 보기, 좌우 손 정합, 몸 일부가 프레임 밖일 때, 여러 사람, 조명, 기기 회전, 낮은 FPS 및 입력 끊김.
- 추정되지 않은 관절의 좌표를 무비판적으로 충돌에 사용하지 않는다.

## 6. 개발 단계

1. **Foundation:** 소스 현황 파악, 프로젝트/빌드/테스트 구성, 카메라 프리뷰.
2. **Tracking:** 실시간 Pose Landmarker, 좌표/미러링 보정, 디버그 스틱맨.
3. **Presentation:** 3가지 렌더링 모드 + 가상 배경 + 터치 원 표시 토글.
4. **Hitpoints:** 부위별 앵커·원 반지름·배율(50~200% 제안)·스무딩·충돌 검증.
5. **Minigames:** 사방 터뜨리기 → 과일 바구니 → 포즈/리듬.
6. **Polish:** 캘리브레이션, 모바일 기기 최적화, UX·접근성·안전, 실제 기기 테스트.

정확한 수치와 구성은 구현/테스트 이후 업데이트한다. 상세 수용 기준은 `docs/PRODUCT_SPEC.md` 참고.

## 7. **필수 Git 브랜치 규칙: dev 개발, main에는 fast-forward만**

이 정책은 향후 모든 에이전트/개발자에게 적용한다.

1. **기능 구현 및 문서 수정은 `dev` 브랜치에서만 한다.** 작업 시작 시 현재 브랜치/커밋 및 uncommitted changes 확인. `main`에 개발 커밋을 직접 만들지 않는다.
2. `main` 반영은 사용자가 요청한 때에만 한다.
3. `main`을 전진시킬 때는 **진짜 fast-forward-only**여야 한다. `main` 커밋이 `dev`의 조상임을 검증하고, 검증된 `dev` SHA로 `main` ref를 **비강제(force=false)** 업데이트하거나 다음을 실행한다.

```bash
git fetch origin
git merge-base --is-ancestor origin/main origin/dev || {
  echo "STOP: main is not an ancestor of dev"; exit 1;
}
git switch main                 # 로컬 미커밋 변경이 없는지 확인 후
git pull --ff-only origin main # 로컬 main을 원격 main과 안전하게 동기화
git merge --ff-only origin/dev
git push origin main
```

4. **금지:** `main`에 merge commit 생성, squash merge, GitHub의 rebase-merge로 fast-forward를 대체, `--no-ff`, force push/force update. GitHub PR의 Merge 버튼은 Git 자체의 strict fast-forward와 동일하지 않을 수 있으니 **자동으로 사용하지 말 것**.
5. 브랜치가 갈라졌거나 검사에 실패했다면 **중지하고** dev 쪽에서 안전한 동기화 방법을 검토한다. 공유 브랜치 이력 재작성은 임의로 하지 않는다.
6. 반영 후 `main`과 `dev`의 HEAD SHA 일치를 다시 확인한다. 문서만 변경하는 작업이라도 이 규칙을 따른다.

## 8. 에이전트 작업 수칙

- 착수 전 실제 파일/의존성/테스트 유무를 확인하고, **기획 내용을 구현된 기능으로 서술하지 말 것**.
- 공통 카메라·좌표 매핑·충돌 엔진을 게임 모듈과 분리하고, 기능을 다른 게임이 재사용할 수 있게 만든다.
- 표시 설정을 바꿔도 입력 및 충돌 판정에 영향을 주지 않도록 테스트한다.
- 새로운 기능 추가/기술 변경/결정 확정 시 `README.md`, 이 파일, `docs/PRODUCT_SPEC.md`의 관련 부분을 함께 갱신한다.
- 가능하면 작은 단위로 구현·테스트하고 결과 및 남은 이슈를 정리한다. 실제 검증한 것과 아직 검증하지 않은 것을 구분한다.
- 명시적 요청 없이 배포, 서비스 비용 발생, 영상 수집, `main` 병합을 하지 않는다.


## 웹 앱 구현 결정 (2026-10-21)

- **확정 기술 스택:** React + TypeScript + Vite, HTML5 getUserMedia, MediaPipe Pose Landmarker, Canvas 2D.
- **단일 웹 코드베이스:** PC/Mac 내장·외장 웹캠과 iOS/Android 카메라는 동일한 PoseTracker / CoordinateMapper / HitpointEngine / GameEngine / Renderer를 사용한다. 기기별 차이는 카메라 선택·화면 배치·성능 조절로 격리한다.
- **실행 환경:** 개발 중 localhost, 공개 테스트 및 배포 시 HTTPS. 백엔드 없이 정적 Vite 빌드(`dist/`)를 Vercel에 배포 가능. 영상/포즈 데이터는 기본 로컬 처리. WASM 및 모델은 초기 로딩 시 외부 정적 서버에서 다운로드한다.
- **MVP 1차 구현:** 카메라 시작/끄기, 전후면 전환, Pose Landmarker Lite (GPU 실패 시 CPU 폴백), 3가지 화면 모드, 미러/cover 좌표 보정, 스틱맨·원형 히트박스, 크기 50–200% 조절, 60초 풍선 터뜨리기, 중복 타격 방지(소멸), 반응형 웹 화면.
- **미구현/추후:** PWA 오프라인 캐시, 멀티플레이, 기록 저장, 사운드, 과일 바구니/포즈 리듬, 별도 설치형 앱, 상세 모델 성능 자동 벤치마크. manifest는 준비했지만 오프라인 동작은 보장하지 않는다.
- **테스트 원칙:** 자동 테스트로 미러·crop·신뢰도·충돌을 검증하고 PC 및 실제 iOS/Android 브라우저에서 직접 카메라 권한/전신 인식/성능 확인해야 출시 가능. CI 및 타입 검사/빌드 통과와 실기기 검증은 구분한다.
- **개발/병합:** 모든 작업은 `dev`에서. `main` 업데이트는 사용자 요청 후 **fast-forward-only** (merge commit, squash, 강제 업데이트 금지).


개발 중 웹 테스트에는 로컬 `localhost` 외에 `.devcontainer/devcontainer.json`을 이용한 Codespaces 임시 HTTPS 포트 포워딩을 사용할 수 있다. 공개 배포와 Codespaces 프리뷰는 구별할 것.

## 2026-10-21 — Hand Landmarker 통합

기본 입력은 Pose + Hand Landmarker를 함께 사용한다. `src/hands.ts`에서 모델의 21개 손 지점을 손바닥 중심으로 계산하고, Pose 손목과 최단 거리로 왼손/오른손을 대응시킨다. MediaPipe 모델의 handedness 문자열만 믿거나 미러링된 화면 좌표에서 신체 방향을 결정하지 않는다. `src/core.ts`에서 손바닥 중심을 원형 판정 입력으로 사용하며, 손 인식이 실패할 경우 Pose 손/전완 방향 기반 추정으로 폴백하고 프레임 간 약한 보간을 적용한다. Pose 손목이 충분히 추적되지 않는 경우 외부/잘못된 손을 임의로 게임 입력에 연결하지 않는다.

Hand 추론은 Pose와 독립적으로 제한된 빈도로 동작하며 저사양 장치에서는 더 느리게 한다. Hand 모델 로드 실패는 카메라/게임 시작 전체의 실패가 아니다. 손바닥 정밀 추적 토글로 부담을 비교할 수 있어야 한다. 추적 전환·미러링·정규화/화면 잘림·스코어링 테스트 유지. **main 병합은 별도 요청 후 ff-only**.


## 손바닥 추적 ON/OFF 동작과 진단 표시 (2026-10-21)

**Hand 모델 사용 ON**은 `Hand Landmarker`를 실행해 손당 21개 랜드마크 기반 손바닥 중심을 우선 적용하며, 인식에 실패하면 Pose로 추정합니다. **OFF**는 Hand 추론을 멈추지만, Pose의 손목·손가락·팔꿈치 좌표를 이용해 **계속 손바닥 중심을 추정합니다**. 따라서 둘 다 손바닥에 터치 원이 표시되는 것이 정상입니다.

실제 비교를 위해 각 손의 현재 입력 소스(HAND / POSE / 인식 없음)를 설정 패널에 표시합니다. **손의 터치 원이 청록색이면 HAND, 주황색이면 POSE 추정**입니다. 이는 모델이 로드됐는지 여부가 아니라 그 프레임의 실제 게임 앵커 선택을 기준으로 합니다. 스틱맨 선은 계속 Pose에서 가져오며, 토글을 꺼도 정밀 모델 객체는 현재 카메라 세션 동안 메모리에 있지만 추론은 중단됩니다.

평소 자세에서 두 모델의 위치가 비슷할 수 있으며, 추가 손 모델의 필요성은 다양한 각도/가림/반응속도/FPS를 실기기에서 비교해 판단합니다. `main` 병합은 별도 요청에 따른 fast-forward-only 규칙을 유지합니다.

## Vercel 자동 배포 정책 (2026-10-21)

저장소 루트 `vercel.json`에서 **`git.deploymentEnabled.dev = false`**, **`git.deploymentEnabled.main = true`**로 고정합니다. `dev` 푸시는 **Vercel에서 자동 Deployment/Build를 생성하지 않고**, `main` 푸시만 자동 프로덕션 배포합니다. 이는 단순 `ignoreCommand` (빌드 요청 후 skip)보다 낭비가 적습니다.

- 기능 개발: `dev`에서 작업하고 **GitHub Actions 테스트·TypeScript 검사·빌드는 계속 실행**합니다(이 CI는 Vercel 빌드 쿼터와 별개).
- 실기기 개발 테스트: localhost / GitHub Codespaces HTTPS / 사용자에게 승인된 임시 HTTPS 터널. `dev` 자동 Vercel Preview 링크는 만들어지지 않습니다.
- 릴리스: 검증된 `dev` SHA를 사용자가 승인하면 `main`으로 **fast-forward-only** 반영하고 Vercel 자동 배포합니다.
- 보충: 해당 규칙은 이 프로젝트의 Git 연동 자동 배포 정책입니다. **명시적 수동 배포, Deployment Hook, 다른 프로젝트의 자동 빌드**까지 차단하는 것은 아닙니다.

근거: [Vercel Git configuration](https://vercel.com/docs/project-configuration/git-configuration).

릴리스 정책: `dev` Vercel 자동 배포 비활성화 상태를 유지하고, `main` 반영 직전에 GitHub Actions 성공 및 strict fast-forward 관계를 확인한다. `vercel.json`의 `git.deploymentEnabled` 설정을 임의로 삭제·변경하면 안 된다.

## 2026-10-21 — 멀티게임 페이지 구조 결정

- 제품은 **4개 독립 화면**으로 구성: 홈 `/`, 게임 탐색 `/games`, 플레이 `/play/:gameId`, 설정 `/settings`. PC/모바일은 단일 React + Vite 코드베이스를 공유.
- 설정값은 `src/settings/settings.ts`와 `SettingsContext.tsx`를 통해 관리하며 `localStorage`로 저장. 표시 모드(카메라 / 카메라+스틱맨 / 스틱맨), 원 표시, 터치 크기, Hand 정밀 추적, 기본 카메라 방향, 진단 표시. 이전의 판정/시각 옵션 독립성 보장.
- `src/games/registry.ts`는 게임 메타데이터 및 출시 상태의 단일 소스. **현 단계에서 `balloon-pop`만 available**. 미완성 게임은 coming-soon. 없는 구현을 가동 중이라고 주장하지 말 것.
- 홈/목록/설정 페이지에서는 카메라를 켜지 않고, `GameStage` 마운트 후 사용자 클릭으로만 카메라 시작. 플레이 이탈 시 `getUserMedia` 트랙, Pose/Hand Landmarker, rAF를 모두 해제.
- `GameStage`가 카메라와 인식 수명주기를 관리하고, `engine/renderer.ts`는 Canvas 표현, `games/balloon-pop/game.ts`는 게임 시간·스폰·충돌·점수 규칙을 관리한다. 공통 `core.ts`와 `hands.ts`는 종전과 동일한 판정 알고리즘을 유지.
- 플레이 UI는 몰입형으로 최소화하고 일시정지/재개/종료·결과·전체 화면을 제공. 표시 모드 변경은 ⚙ 인게임 간편 설정과 전체 설정 페이지에서만 허용. 게임 진행 중 탭이 숨겨지면 자동 일시정지하며 사용자가 재개.
- 설정 페이지의 게임별 시간·난이도, 사운드, 리더보드는 **미구현**이며 향후 독립 게임 설정 UI로 추가. 자동 저장은 표시/카메라 공통 옵션에 한정.
- Vercel SPA 라우팅 fallback 사용 시 기존 `git.deploymentEnabled.dev=false` 와 `main=true`를 변경하지 말 것.
- 새로운 게임을 추가할 때 `registry.ts` 상태를 변경하기 전에 실제 게임 로직, 카메라 레이아웃, 입력 부위, 테스트를 먼저 구현하고 검증.
- 검증: `npm run test && npm run check && npm run build`, 브라우저 Back/Forward, URL 직접 접속, 카메라 재진입/언마운트, 모바일 화면, 정확도/프레임 지표 확인. 자동 CI 통과가 실기기 검증을 뜻하지 않는다.


## 2026-10-21 Game Feel Engine 공통 개발 규칙

게임 모듈은 성공/실패 GameEvent만 발행하며 점수·콤보·사운드·파티클·최고 기록을 직접 계산하거나 출력하지 않는다. 공통 엔진은 src/engine/game-feel.ts, audio.ts, effects.ts, records.ts에 있다. 풍선 게임에서 먼저 통합했고 향후 신규 게임도 같은 이벤트 계약을 사용해야 한다. 카메라 인식 손실로 miss를 발생시키지 않으며 중복 대상/이벤트 점수는 차단한다. Web Audio는 사용자 게임 시작 제스처에서 활성화하고 일시정지/탭 비활성화 및 종료 리소스를 처리한다. 구현/확장 상세: docs/GAME_FEEL_ENGINE.md. 테스트와 실기기 검증을 구분하고 main은 별도 요청 때만 strict fast-forward로 반영한다.


### 2026-10-21 — Audio output and quick-settings pause semantics

- src/engine/audio.ts exposes volumeToGain() for independently scaled linear BGM and SFX gains. Audio graph updates happen immediately via setPreferences(), using a short gain ramp. Music synthesis has longer/more frequent notes, and new-user default music volume is 55%; preserve existing local preferences.
- src/components/QuickSettingsOverlay.tsx is the **in-game** compact settings dialog. Do not navigate to /settings from the game gear; this would unmount GameStage and discard the round. Keep the full settings route/page unchanged for non-game use.
- The dialog is inside the fullscreen-capable stage, pauses gameplay without stopping the camera or resetting stats, and remembers whether to resume on close. A preexisting manual pause and tab-background pause must NOT auto-resume. ESC and Close restore focus. Helper semantics live in src/engine/quick-pause.ts.
- All quick controls must write to the exact existing SettingsContext update() so they persist to the same localStorage settings as the full page. Sound volume previews use an audio preview bus independent of gameplay mute, and controls apply immediately to the running audio graph; quick-mute is cleared when explicitly editing sound preferences.
- Maintain reduced motion, mobile scrollable dialog, and Web Audio user gesture unlock. See tests/audio.test.ts and tests/quick-settings.test.ts. Strict dev-first, main only after user's merge request.

## 2026-10-21 — 게임 화면 하단 중복 UI 제거

- `src/components/GameStage.tsx`의 DISPLAY 바로가기 및 상시 HAND/POSE 추적 진단 줄은 일반·전체화면 모두 렌더링하지 않는다. 게임 하단에는 상황 안내와 시작/일시정지/종료/카메라 끄기 같은 플레이 조작만 유지한다.
- 화면 모드와 판정 크기 등 공통 옵션은 기존 `/settings` 또는 플레이를 멈추는 ⚙ `QuickSettingsOverlay`에서 설정하며 같은 SettingsContext/localStorage를 사용한다.
- 고급 설정의 `diagnostics` 옵션은 유지한다. 활성화된 경우에만 게임 중 간편 설정 모달 내부에서 모델 상태 및 좌우 손 HAND/POSE 앵커 출처를 확인할 수 있다. 디버그 UI를 플레이 화면 하단에 다시 배치하지 않는다.
- fullscreen 진입/해제와 모바일 반응형 모두 같은 원칙을 유지한다. 게임 점수·콤보 HUD, 카메라/추적/타이머 및 빠른 설정의 일시정지/복귀 의미는 변경하지 않는다.


## 2026-10-21 — 과일 바구니·포즈 챌린지 (dev)

- `src/games/fruit-catch/game.ts`: 60초 낙하 게임, 양손/한 손의 가로 위치로 바구니를 조작, 과일 수집/실패/폭탄 피해 GameEvent. 추적 상실 시 라운드의 시간과 물체 물리가 멈추며 실패를 만들지 않음.
- `src/games/pose-challenge/game.ts`: 5가지 상대적 2D 관절 자세, 0.85초 유지, 8초 제한, Perfect/Good/Miss 사건. 필요한 관절이 신뢰할 수 없으면 점수/타이머 진행을 멈춤.
- `src/games/runtime.ts`: 등록 게임별 상태 생성·시간 갱신·추적 상태·카메라 viewport 분기. `src/engine/game-scenes.ts`: 과일 게임의 하단 축소 카메라, 바구니/과일과 포즈 가이드 그림. `src/core.ts`는 기존 cover 기본값을 유지하면서 `fit: contain`을 추가해 축소된 카메라의 미러와 히트포인트 매핑 일치.
- `src/components/GameStage.tsx`는 한 게임 전용이 아닌 세 게임의 공통 라이프사이클(카메라/추론, 일시정지, 음악과 효과, 점수, 기록)을 실행. 게임별 규칙은 공통 GameFeel 점수 계산에 직접 관여하지 않음.
- 카탈로그 `src/games/registry.ts`: `fruit-catch`와 `pose-challenge`의 출시 상태를 `available`로 변경, 시간 60초. 실기기 검증은 별도이며 dev 브랜치 작업을 main에 직접 커밋하거나 자동 병합하지 말 것.
- 이전 절의 'balloon-pop만 available', '미구현' 표기는 **당시의 이력**으로 유지되며 지금 dev의 실제 상태는 본 절을 기준으로 판단할 것.

## 2026-10-21 — 과일 바구니 좌우 이동 감도 보정

- 플레이어가 카메라 양 끝까지 이동해야 바구니가 화면 끝에 도달하던 문제를 해결한다. `src/games/runtime.ts`에서 실제 `contain` 영상 영역의 손 좌표를 산출한 **후** `FRUIT_BASKET_REACH.min=0.30`, `max=0.70`을 전체 바구니 트랙 0~1에 대응한다(가로 이동 감도 2.5배). 범위를 넘어가면 안전하게 0/1에 고정한다.
- 양손 평균 / 한손 폴백과 미러링, 레터박싱 처리, 손 추적 중단 시 게임 정지, 바구니 화면 경계 클램프는 유지한다. 직접 터치하는 다른 게임의 좌표 및 히트박스 크기는 변경하지 않는다.
- `tests/fruit-catch.test.ts`에서 중앙, 양끝, 중간값, 미러/비미러, 한손/양손, 비정상 입력, 실제 바구니 경계에 관한 회귀 검증. 최종 체감과 실기기 카메라 검증은 아직 필요. dev 개발만, main은 별도 승인 후 fast-forward-only.

## 2026-10-21 — 경량 카메라 게임 5종 추가

`src/games/mini-arcade/game.ts`에 두더지 잡기(`mole-whack`), 색깔 맞히기(`color-match`), 별 사냥(`star-hunt`), 운석 피하기(`meteor-dodge`), 얼음땡(`freeze-dance`)의 순수 게임 규칙을 추가. 시각 표현은 `scene.ts`에 분리, 기존 GameStage 및 GameFeelEngine을 재사용한다. 등록 주소는 `/play/:gameId` 패턴이며 60초 라운드/양손 팔름 포인트/세 가지 카메라 표시 모드/콤보/효과음/일시정지/간편 설정/최고 기록을 공통 적용한다.

- `GAMES` 레지스트리가 전체 8종을 나열하는 유일한 소스. 홈페이지는 앞 6개를 추천, 카탈로그는 8개 전부 및 `dodge`, `move` 카테고리를 지원한다. 오래된 문서의 '3개만 available' 표현은 이력이다.
- 각 게임은 손바닥 추적 실패 시 시간과 실패 이벤트를 발생시키지 않는다. 두더지/색 게임은 접촉 위치를 벗어나야 같은 자리에서 재판정 가능. 회피 게임은 운석을 피해 화면을 통과시키면 성공으로 계산하며 단순 정지 상태가 정답인 게임은 아님.
- `tests/mini-arcade.test.ts`로 게임별 동작을 검사. 추가 게임을 개발할 때 반드시 `registry.ts`, 런타임, 화면 렌더러, 테스트를 동기화한다. 로컬/Actions CI가 통과해도 실제 카메라 FPS·미러링·세로 화면 사용성 검증은 완료로 표현하지 않는다.
- **브랜치 원칙:** 모든 구현 dev, main 적용은 반드시 조상 관계를 확인한 strict ff-only ref update(`force:false`). Vercel dev 자동 빌드 비활성화 유지.

## 중급 난이도 5개 게임 추가 (2026-10-21, dev)

기존 8개에 더해 **리듬 패드 / 에너지 실드 / 기억력 패턴 / 레이저 통로 / 택배 분류**를 구현해 총 13개 게임을 등록했습니다. 모든 신작은 60초, 양손 카메라 입력, 공통 Game Feel(점수·콤보·음악·파티클·기록), 3종 표시 모드, 간편 설정·일시정지를 그대로 사용합니다.

| 게임 | 기존 게임과 다른 핵심 규칙 |
| --- | --- |
| 리듬 패드 | 4레인에서 내려오는 노트를 판정선 통과 타이밍에 **패드에 새로 진입**해 PERFECT/GOOD로 맞힘. 누르고 있기만 해서는 점수 없음 |
| 에너지 실드 | 사방에서 중앙 코어로 날아오는 구슬을 손바닥 충돌로 요격. 코어에 닿으면 대미지 |
| 기억력 패턴 | 네 색상의 깜빡이는 순서를 보고 그대로 재현. 정답 시 시퀀스 길이 증가, 오답/시간 초과 시 초기화 |
| 레이저 통로 | 위험한 레이저를 예고 후 스윕. 초록색 안전 틈에 손을 두면 통과 성공, 닿으면 한 번만 대미지 |
| 택배 분류 | 중앙 상자에 손을 넣어 집고, **손을 이동시켜** 같은 색 배송함에 넣기. 틀린 배송함은 오답 |

신규 게임 로직은 `src/games/advanced-arcade/game.ts`, 화면은 `scene.ts`에 독립 구현하여 런타임·레지스트리에 연결했습니다. 손 추적이 사라지면 타이머와 게임 로직이 정지하며, 점수 계산은 Game Feel Engine만 처리합니다. `tests/advanced-arcade.test.ts`에 재진입·연속 누르기·충돌·시간 초과·추적 소실 테스트를 추가했습니다. **PC / 모바일 카메라 실기기 검증은 아직 별도로 필요합니다.** 기존 정책대로 main 반영은 명시적인 요청에 따라 strict fast-forward-only로 진행합니다.


## 2026-10-21 — 고급 모션 게임 5종 (dev)

기존 13종에 고급 5종을 추가해 **총 18종**: 보스 레이드(`boss-raid`), 중력 미로(`gravity-lab`), 그림자 싱크(`shadow-sync`), 별자리 그리기(`constellation-trace`), 듀얼 포털(`dual-portals`).

- **보스 레이드:** 경고→약점 개방→공격/회복 사이클, 한 사이클 한 번 타격, 체력과 페이즈, 공격 범위별 한 번만 피해.
- **중력 미로:** 두 손의 높이 차로 수평 가속, 평균 높이로 수직 가속, 속도/감쇠/벽 반발/이동형 위험물/왕복 목표.
- **그림자 싱크:** 2초 시연 후 두 손으로 움직이는 목표를 동시 추종해 유지, 시간 제한/연속 유지.
- **별자리 그리기:** 한 손으로 다섯 노드를 순서대로 통과, 동작 순서·소유 손·제한 시간 검증.
- **듀얼 포털:** 서로 이동하는 두 목표에 양손을 동시에 유지해야 차지, 단계별 전송과 재활성화 규칙.

규칙은 `src/games/expert-arcade/game.ts`, 시각화는 `scene.ts`에 분리하고 `registry.ts`, `runtime.ts`, 공통 카메라 renderer에 연결합니다. **실패/성공 이벤트만** 발행해 점수·콤보·음악·효과·최고 기록은 공통 Game Feel 엔진이 소유합니다. 필수 손이 사라지면 타이머/물리/실패 판정 정지; 카메라 3종 모드와 간편 설정/일시정지 적용. `tests/expert-arcade.test.ts`에서 각 규칙 및 추적 손실·중복 득점·라운드 종료 회귀 검사. 실기기(특히 모바일 화면/추적 정밀도) 검증은 별도로 필요하며, `main` 반영은 사용자 별도 요청 및 strict fast-forward-only 원칙을 따릅니다.
