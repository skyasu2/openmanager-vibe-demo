// dummy_data_generator.js
// 100대 서버의 7일간 시간별 상태값을 생성하는 스크립트

function generateDummyData() {
  const serverTypes = ['db', 'app', 'web', 'cache', 'auth', 'file', 'api'];
  const alertTypes = ['CPU 사용률', '메모리 누수', '디스크 경고', '네트워크 지연', '접속 오류', 
                    '프로세스 비정상 종료', '서비스 다운', 'I/O 대기', '로드 밸런싱 이상', '파일시스템 경고'];
  
  // 서버 100대 생성
  const servers = [];
  for (let i = 1; i <= 100; i++) {
    const serverType = serverTypes[Math.floor(Math.random() * serverTypes.length)];
    const serverNumber = i.toString().padStart(2, '0');
    servers.push(`${serverType}${serverNumber}`);
  }
  
  // 현재 시간 기준 7일 전 시작
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 7);
  
  // 7일 * 24시간 = 168개 시간대 생성
  const timePoints = [];
  const currentTime = new Date(startDate);
  while (currentTime <= endDate) {
    timePoints.push(new Date(currentTime));
    currentTime.setHours(currentTime.getHours() + 1);
  }
  
  // 모든 데이터 포인트 생성
  const data = [];
  
  servers.forEach(server => {
    // 기본 서버 사용률 패턴 (각 서버마다 다르게 설정)
    const baselineCpu = 20 + Math.floor(Math.random() * 40); // 20~60% 기본 CPU 사용률
    const baselineMemory = 30 + Math.floor(Math.random() * 30); // 30~60% 기본 메모리 사용률
    const baselineDisk = 40 + Math.floor(Math.random() * 30); // 40~70% 기본 디스크 사용률
    const baselineNetwork = 10 + Math.floor(Math.random() * 20); // 10~30% 기본 네트워크 사용률
    
    // 일일 패턴 (아침/저녁 피크 시간)
    const dayPattern = [0.7, 0.6, 0.5, 0.5, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2,  // 0시~12시
                        1.1, 1.0, 0.9, 0.9, 0.8, 0.9, 1.0, 1.1, 1.0, 0.9, 0.8, 0.7];  // 12시~24시
    
    // 주간 패턴 (주중 > 주말)
    const weekPattern = [0.8, 0.9, 1.0, 1.0, 1.0, 0.7, 0.6]; // 일~토
    
    timePoints.forEach(time => {
      const hour = time.getHours();
      const dayOfWeek = time.getDay(); // 0(일)~6(토)
      
      // 서버 사용률 계산 - 기본값 * 시간 패턴 * 요일 패턴 * 임의성
      const randomFactor = 0.8 + (Math.random() * 0.4); // 0.8~1.2 임의 변동
      
      const cpuUsage = Math.min(100, Math.round(baselineCpu * dayPattern[hour] * weekPattern[dayOfWeek] * randomFactor));
      const memoryUsage = Math.min(100, Math.round(baselineMemory * dayPattern[hour] * weekPattern[dayOfWeek] * randomFactor));
      const diskUsage = Math.min(100, Math.round(baselineDisk * (0.9 + Math.random() * 0.2))); // 디스크는 꾸준히 증가 경향
      const networkUsage = Math.min(100, Math.round(baselineNetwork * dayPattern[hour] * weekPattern[dayOfWeek] * randomFactor * 1.5));
      
      // 경고 이벤트 생성 (임계치 초과 시)
      const alerts = [];
      
      if (cpuUsage > 80) {
        alerts.push('CPU 사용률');
      }
      if (memoryUsage > 85) {
        alerts.push('메모리 누수');
      }
      if (diskUsage > 90) {
        alerts.push('디스크 경고');
      }
      if (networkUsage > 75) {
        alerts.push('네트워크 지연');
      }
      
      // 가끔 임의로 다른 경고도 발생
      if (Math.random() < 0.05) { // 5% 확률
        const randomAlert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
        if (!alerts.includes(randomAlert)) {
          alerts.push(randomAlert);
        }
      }
      
      // 데이터 포인트 추가
      if (alerts.length > 0 || Math.random() < 0.3) { // 경고가 있거나 30% 확률로 기록
        alerts.forEach(alert => {
          data.push({
            server: server,
            timestamp: time.toISOString(),
            alert: alert,
            metrics: {
              cpu: cpuUsage,
              memory: memoryUsage,
              disk: diskUsage,
              network: networkUsage
            }
          });
        });
        
        // 경고가 없어도 일정 확률로 메트릭만 기록
        if (alerts.length === 0) {
          data.push({
            server: server,
            timestamp: time.toISOString(),
            alert: null,
            metrics: {
              cpu: cpuUsage,
              memory: memoryUsage,
              disk: diskUsage,
              network: networkUsage
            }
          });
        }
      }
    });
  });
  
  return data;
}

// 데이터 생성 및 저장
const dummyData = generateDummyData();
console.log(`총 ${dummyData.length}개의 데이터 포인트가 생성되었습니다.`);

// Node.js 환경에서 실행 시 파일로 저장할 수 있음
// 브라우저에서는 다음 코드를 제거하거나 주석 처리
// const fs = require('fs');
// fs.writeFileSync('server_metrics_7days.json', JSON.stringify(dummyData, null, 2));
// console.log('데이터가 server_metrics_7days.json 파일로 저장되었습니다.');

// 데이터 샘플 출력 (처음 5개)
console.log('데이터 샘플:');
console.log(JSON.stringify(dummyData.slice(0, 5), null, 2));
