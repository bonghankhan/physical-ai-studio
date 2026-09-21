# Physical AI Studio

로그인/회원가입 없이 바로 사용하는 **브라우저 기반 Physical AI 교육 웹앱**입니다.

> 이 프로젝트는 특정 상용 사이트의 소스나 브랜드 자산을 복사하지 않고, 공개적으로 관찰 가능한 교육 흐름을 참고해 독립적으로 구현한 clean-room 프로토타입입니다.

## 현재 기능

- 로그인/회원가입 없음
- 랜딩/대시보드
- 이미지 분류 AI Lab
  - 클래스 추가/삭제
  - 클래스별 이미지 업로드/드래그앤드롭
  - TensorFlow.js + MobileNet 특징 추출
  - KNN 분류기 학습
  - 새 이미지 예측 및 클래스별 확률 표시
- Data Lab
  - 클래스별 샘플 수 시각화
  - 데이터 균형 간단 점검
- Device Lab
  - Web Serial 장치 연결
  - ESP32 등에 `FORWARD`, `BACKWARD`, `LEFT`, `RIGHT`, `STOP` 명령 전송
  - 시리얼 콘솔 송수신
- PWA 기본 구성
- GitHub Pages 배포 워크플로 포함

## 로컬 실행

정적 파일이지만 브라우저 보안 정책과 Service Worker 때문에 `file://` 대신 로컬 서버 사용을 권장합니다.

```bash
python -m http.server 8080
```

브라우저에서 `http://localhost:8080`으로 접속하세요.

## AI Lab 사용법

1. `AI Lab`으로 이동합니다.
2. 두 개 이상의 클래스에 각각 2장 이상의 이미지를 추가합니다.
3. `모델 학습하기`를 누릅니다.
4. 테스트 이미지를 넣어 예측 결과를 확인합니다.

AI 기능은 아래 CDN 라이브러리를 사용합니다.

- TensorFlow.js 4.22.0
- MobileNet 2.1.1
- KNN Classifier 1.2.6

처음 모델을 불러올 때 인터넷 연결이 필요합니다.

## Device Lab 사용법

Web Serial은 일반적으로 Chrome/Edge + HTTPS 또는 localhost 환경에서 사용합니다.

1. ESP32를 USB로 PC에 연결합니다.
2. `Device Lab`에서 baud rate를 선택합니다. 기본값은 115200입니다.
3. `장치 연결`을 눌러 브라우저의 포트 선택 창에서 ESP32를 선택합니다.
4. 방향 버튼 또는 사용자 명령을 전송합니다.

`examples/esp32_serial_bridge.ino`에 최소 ESP32 예제가 포함돼 있습니다.

## GitHub Pages 배포

`.github/workflows/pages.yml`이 포함되어 있습니다.

1. 저장소를 GitHub에 push합니다.
2. GitHub 저장소의 `Settings → Pages`로 이동합니다.
3. Source를 `GitHub Actions`로 설정합니다.
4. `main` 브랜치 push 시 자동 배포됩니다.

## 다음 확장 후보

- IndexedDB를 이용한 프로젝트/이미지 영구 저장
- 카메라 실시간 학습/추론
- Blockly 기반 코딩 화면
- ESP32 BLE ↔ SPIKE Prime/Pybricks 브리지
- HuskyLens 데이터 입력
- 객체 탐지 / Pose / 음성 분류
- 모델 내보내기/불러오기
- 교사용 수업 모드

## 브라우저 지원

- AI Lab: 최신 Chrome / Edge / Firefox / Safari 권장
- Web Serial: Chrome / Edge 계열 권장

## 라이선스

프로토타입 코드는 교육/개발 검토용으로 작성되었습니다. 외부 라이브러리의 라이선스는 각 프로젝트의 라이선스를 따릅니다.
