# 시스템 구조 설명 (실제 vs 데모)

## 실제 OpenManager 통합 구조 (예상)
- 로그 수집 → Kafka/Fluentd
- 요약 모듈: Python or Java, 백엔드 연동
- DB 저장 후 보고서 생성
- OpenManager UI에 통합

## 데모 구조
- HTML + JS + mock JSON 파일로 구성
- summary.js가 클라이언트에서 직접 요약 처리
- 정적 사이트로 Netlify 배포 (서버리스)

## 요약
> 데모는 실제 구현의 핵심 아이디어(요약 알고리즘, 시각화)를 보여주기 위한 최소 구성입니다.
