## 바이브 코딩 사용 예시

### 📌 프롬프트
"100개의 서버에서 발생한 경고 로그에서 가장 자주 경고가 발생한 서버 상위 5개를 출력하는 자바스크립트 함수를 만들어줘."

### 🧑‍💻 결과 코드 (요약)
```js
const count = {};
data.forEach(log => {
  count[log.host] = (count[log.host] || 0) + 1;
});
const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
```

이 코드를 기반으로 summary.js를 구성했습니다.
