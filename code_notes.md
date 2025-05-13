# Vibe Coding 및 LLM 기반 코드 설명

## 사용된 LLM 도구
- Claude: XML 구조 이해 및 요약 처리
- Gemini: 조건 필터링 및 코드 구성

## 사용 프롬프트 예시
```
"100개의 서버에서 발생한 경고 로그에서 가장 자주 경고가 발생한 서버 TOP5를 출력하는 자바스크립트 함수를 만들어줘."
```

## 생성된 코드 예시
```js
const count = {};
data.forEach(log => {
  count[log.host] = (count[log.host] || 0) + 1;
});
const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
```
