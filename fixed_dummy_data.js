// fixed_dummy_data.js (장애 시나리오 강화 버전)

function getFixedDummyData() {
    const servers = [];
    const environments = ['prod', 'stg', 'dev'];
    const rolesByType = {
        WEB: ['nginx', 'apache', 'lb'],
        WAS: ['tomcat', 'node', 'spring'],
        DB: ['mysql-master', 'mysql-slave', 'pgsql', 'mongo-primary'],
        BATCH: ['worker', 'scheduler'],
        MONITORING: ['prometheus', 'grafana'],
        SEARCH: ['elasticsearch', 'solr'],
        API: ['gateway', 'authsvc', 'usersvc'],
        CACHE: ['redis', 'memcached']
    };
    const serverTypes = Object.keys(rolesByType); // ['WEB', 'WAS', ...]
    const locations = ['Seoul-IDC', 'Busan-IDC', 'US-West-Oregon', 'EU-Frankfurt', 'APAC-Singapore'];

    // 30개 서버 생성 (역할과 환경을 좀 더 명확히 분배)
    for (let i = 0; i < 30; i++) {
        const env = environments[i % environments.length]; // prod, stg, dev 순환
        const serverType = serverTypes[Math.floor(i / environments.length) % serverTypes.length]; // 타입별로 환경별 서버 할당 시도
        const roleArray = rolesByType[serverType];
        const role = roleArray[i % roleArray.length];
        const instanceNum = Math.floor(i / (environments.length * serverTypes.length)) + 1; // 같은 타입/환경/역할 내에서의 번호
        
        // 예: prod-web-nginx-01.opm-cloud.com
        // 예: stg-db-mysql-master-01.opm-cloud.com
        const hostname = `${env}-${serverType.toLowerCase()}-${role}-${String(instanceNum).padStart(2, '0')}.opm-cloud.com`;
        
        servers.push({
            serverHostname: hostname,
            ip: `10.${i % 8}.${Math.floor(i / 8)}.${(i % 50) + 10}`, // IP 주소 패턴
            serverType: serverType,
            location: locations[i % locations.length]
        });
    }

    const data = [];
    const endDate = new Date(); 
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7); 

    let currentTime = new Date(startDate);

    const alertPool = [ // 이전과 동일한 alertPool 사용
        { type: 'CPU', severity: 'Critical', message: "CPU 사용률 임계치(90%) 초과", keywords: ["cpu", "critical", "사용률", "초과"] },
        { type: 'CPU', severity: 'Warning', message: "CPU 부하 지속적 높음 (75% 이상)", keywords: ["cpu", "warning", "부하", "높음"] },
        { type: 'Memory', severity: 'Critical', message: "사용 가능 메모리 매우 부족 (5% 미만)", keywords: ["memory", "critical", "메모리", "부족"] },
        { type: 'Memory', severity: 'Warning', message: "메모리 사용률 높음 (80% 이상)", keywords: ["memory", "warning", "사용률", "높음"] },
        { type: 'Disk', severity: 'Critical', message: "디스크 공간 부족 (/data 95% 사용)", keywords: ["disk", "critical", "공간", "부족", "/data"] },
        { type: 'Disk', severity: 'Warning', message: "디스크 I/O 응답 시간 지연", keywords: ["disk", "warning", "i/o", "지연"] },
        { type: 'Network', severity: 'Warning', message: "네트워크 패킷 유실율 증가", keywords: ["network", "warning", "패킷", "유실"] },
        { type: 'Network', severity: 'Info', message: "외부 네트워크 트래픽 급증", keywords: ["network", "info", "트래픽", "급증"] },
        { type: 'Process', severity: 'Critical', message: "주요 프로세스(nginx) 응답 없음", keywords: ["process", "critical", "nginx", "응답없음"] },
        { type: 'Process', severity: 'Warning', message: "프로세스(batch_worker_03) 재시작됨", keywords: ["process", "warning", "batch_worker_03", "재시작"] },
        { type: 'Application', severity: 'Error', message: "애플리케이션 오류 발생 (OrderService: NullPointerException)", keywords: ["application", "error", "OrderService", "NullPointerException"] },
        { type: 'Application', severity: 'Warning', message: "애플리케이션 응답 시간 지연 (PaymentAPI)", keywords: ["application", "warning", "PaymentAPI", "응답지연"] },
        { type: 'Security', severity: 'Critical', message: "비정상 로그인 시도 감지 (Admin 계정)", keywords: ["security", "critical", "login", "admin"] },
        { type: 'Security', severity: 'Warning', message: "방화벽 정책 위반 트래픽 차단", keywords: ["security", "warning", "firewall", "차단"] },
        { type: 'Database', severity: 'Critical', message: "DB 연결 풀 고갈", keywords: ["database", "critical", "connection pool", "고갈"] },
        { type: 'Database', severity: 'Warning', message: "DB 슬로우 쿼리 다수 발생", keywords: ["database", "warning", "slow query", "슬로우쿼리"] }
    ];

    // 특정 서버에 장애 시나리오를 명확히 주입하기 위한 설정
    // 예: 3일 전 오후 2시 ~ 4시에 특정 서버들에 집중 장애 발생
    const criticalDayOffset = 3; // 3일 전
    const criticalHourStart = 14; // 오후 2시
    const criticalHourEnd = 16;   // 오후 4시

    const problematicServerHostnames = [
        servers[2].serverHostname, // 예: prod-db-mysql-master-01 (DB 장애)
        servers[5].serverHostname, // 예: stg-was-node-01 (WAS 장애)
        servers[10].serverHostname // 예: dev-api-gateway-01 (API 장애)
    ];


    while (currentTime <= endDate) {
        servers.forEach((server, serverIndex) => {
            let cpuUsage = 10 + (Math.sin(currentTime.getHours() * Math.PI / 12 + serverIndex / 5) * 35) + Math.random() * 20;
            let memoryUsage = 15 + (Math.cos(currentTime.getHours() * Math.PI / 12 + serverIndex / 5) * 30) + Math.random() * 25;
            let diskUsage = Math.max(5, 20 + Math.sin(serverIndex / 2 + currentTime.getDate() / 2) * 25 + Math.random() * 15);
            let networkTrafficOut = Math.floor(20 + Math.abs(Math.cos(currentTime.getHours() * Math.PI / 6 + serverIndex / 3)) * 150 + Math.random() * 80); 
            let networkTrafficIn = Math.floor(10 + Math.abs(Math.sin(currentTime.getHours() * Math.PI / 6 + serverIndex / 3)) * 100 + Math.random() * 50); 
            let processCount = 40 + Math.floor(Math.random() * 60) + (server.serverType === 'WAS' || server.serverType === 'BATCH' ? 30 : 0);

            const currentAlerts = [];
            let currentStatus = 'Normal';
            let highestSeverityScore = 0; 

            // --- 의도적인 장애 주입 로직 ---
            const dateForCheck = new Date(currentTime);
            const referenceEndDate = new Date(endDate); // endDate를 기준으로 비교
            const isCriticalTime = 
                (referenceEndDate.getDate() - dateForCheck.getDate() === criticalDayOffset) && // 3일 전인지 확인 (월이 바뀌는 경우 등 고려 필요 시 로직 복잡해짐)
                (dateForCheck.getHours() >= criticalHourStart && dateForCheck.getHours() < criticalHourEnd);

            if (problematicServerHostnames.includes(server.serverHostname) && isCriticalTime) {
                // 이 서버들은 지정된 시간에 높은 부하와 Critical 경고 발생
                if (server.serverType === 'DB') {
                    cpuUsage = Math.random() * 10 + 85; // 85-95%
                    memoryUsage = Math.random() * 5 + 90; // 90-95%
                    const alert1 = JSON.parse(JSON.stringify(alertPool[14])); // DB 연결 풀 고갈
                    alert1.timestamp = currentTime.toISOString();
                    currentAlerts.push(alert1);
                    if(Math.random() < 0.5){ // 추가로 디스크 문제도 발생 가능
                         diskUsage = Math.random() * 5 + 90;
                         const alert2 = JSON.parse(JSON.stringify(alertPool[4])); 
                         alert2.message = alert2.message.replace("95%", `${diskUsage.toFixed(1)}%`);
                         alert2.timestamp = currentTime.toISOString();
                         currentAlerts.push(alert2);
                    }
                } else if (server.serverType === 'WAS') {
                    cpuUsage = Math.random() * 15 + 80; // 80-95%
                    memoryUsage = Math.random() * 10 + 88; // 88-98%
                    const alert1 = JSON.parse(JSON.stringify(alertPool[2])); // 메모리 Critical
                    alert1.message = alert1.message.replace("5% 미만", `${(100-memoryUsage).toFixed(1)}% 미만`);
                    alert1.timestamp = currentTime.toISOString();
                    currentAlerts.push(alert1);
                    if(Math.random() < 0.6){ // 추가로 앱 에러 발생
                        const alert2 = JSON.parse(JSON.stringify(alertPool[10]));
                        alert2.timestamp = currentTime.toISOString();
                        currentAlerts.push(alert2);
                    }
                } else if (server.serverType === 'API') {
                    cpuUsage = Math.random() * 5 + 90; // 90-95%
                    networkTrafficOut += 300; // 트래픽 급증
                    networkTrafficIn += 150;
                    const alert1 = JSON.parse(JSON.stringify(alertPool[0])); // CPU Critical
                    alert1.message = alert1.message.replace("90%", `${cpuUsage}%`);
                    alert1.timestamp = currentTime.toISOString();
                    currentAlerts.push(alert1);
                    const alert2 = JSON.parse(JSON.stringify(alertPool[7])); // 네트워크 트래픽 급증 Info -> Warning/Error로 변경 가능
                    alert2.severity = 'Error'; // 심각도 조정
                    alert2.timestamp = currentTime.toISOString();
                    currentAlerts.push(alert2);
                }
            } else { // 일반적인 상황에서의 경고 발생 (확률 기반)
                if (cpuUsage > 90 && Math.random() < 0.15) { /* ... (이하 일반 경고 발생 로직은 이전과 유사하게 유지) ... */ }
                else if (cpuUsage > 75 && Math.random() < 0.1) { /* ... */ }
                if (memoryUsage > 90 && Math.random() < 0.1) { /* ... */ }
                else if (memoryUsage > 80 && Math.random() < 0.08) { /* ... */ }
                // ... (기타 Disk, Network, Process, Application, Security, Database 경고 발생 로직)
                // 여기서는 간략화를 위해 몇 가지만 남기고, 필요시 이전 답변의 경고 로직을 참고하여 추가합니다.
                if (server.serverType === 'WEB' && cpuUsage > 85 && Math.random() < 0.2) {
                    const alert = JSON.parse(JSON.stringify(alertPool[8])); // 프로세스 응답 없음
                    alert.timestamp = currentTime.toISOString();
                    currentAlerts.push(alert);
                }
            }
            // --- 장애 주입 로직 끝 ---

            // 값 범위 보정
            cpuUsage = Math.max(1, Math.min(99.9, parseFloat(cpuUsage.toFixed(1))));
            memoryUsage = Math.max(1, Math.min(99.9, parseFloat(memoryUsage.toFixed(1))));
            diskUsage = Math.max(1, Math.min(99.5, parseFloat(diskUsage.toFixed(1))));


            // 중복 제거 및 상태 결정 로직 (이전과 동일)
            const finalAlerts = [];
            const alertKeys = new Set();
            currentAlerts.forEach(al => { 
               const key = `${al.type}-${al.severity}-${al.message.substring(0,10)}`; // 메시지 일부 포함하여 완전 동일 메시지 중복 방지
               if (!alertKeys.has(key)) {
                   finalAlerts.push(al);
                   alertKeys.add(key);
               }
            });

            finalAlerts.forEach(al => {
                if (al.severity === 'Critical') highestSeverityScore = Math.max(highestSeverityScore, 4);
                else if (al.severity === 'Error') highestSeverityScore = Math.max(highestSeverityScore, 3);
                else if (al.severity === 'Warning') highestSeverityScore = Math.max(highestSeverityScore, 2);
                else if (al.severity === 'Info') highestSeverityScore = Math.max(highestSeverityScore, 1);
            });

            if (highestSeverityScore === 4) currentStatus = 'Critical';
            else if (highestSeverityScore === 3) currentStatus = 'Error';
            else if (highestSeverityScore === 2) currentStatus = 'Warning';
            else if (highestSeverityScore === 1) currentStatus = 'Info';
            else currentStatus = 'Normal';

            data.push({
                serverHostname: server.serverHostname,
                ip: server.ip,
                serverType: server.serverType,
                location: server.location,
                timestamp: currentTime.toISOString(),
                stats: {
                    cpuUsage: cpuUsage,
                    memoryUsage: memoryUsage,
                    diskUsage: diskUsage,
                    networkTrafficIn: networkTrafficIn,
                    networkTrafficOut: networkTrafficOut,
                    processCount: processCount,
                },
                status: currentStatus,
                alerts: finalAlerts 
            });
        });
        currentTime.setHours(currentTime.getHours() + 1);
    }
    return data;
}
