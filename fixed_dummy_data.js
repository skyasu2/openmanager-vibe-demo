// fixed_dummy_data.js

function getFixedDummyData() {
    const servers = [];
    const serverTypes = ['WEB', 'WAS', 'DB', 'BATCH', 'MONITORING', 'SEARCH', 'API', 'CACHE']; // 서버 타입 다양화
    const locations = ['Seoul-IDC', 'Busan-IDC', 'US-West-Oregon', 'EU-Frankfurt', 'APAC-Singapore']; // 위치 정보

    for (let i = 1; i <= 30; i++) {
        servers.push({
            serverHostname: `server-${String(i).padStart(2, '0')}.opm.internal`, // 호스트네임 변경
            ip: `10.1.${Math.floor(i / 10)}.${(i % 100) + 10}`, // IP 주소 패턴 약간 변경
            serverType: serverTypes[i % serverTypes.length],
            location: locations[i % locations.length]
        });
    }

    const data = [];
    const endDate = new Date(); // 현재 시간을 기준으로 마지막 데이터 시점
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7); // 7일 전부터 시작

    let currentTime = new Date(startDate);

    // 경고 메시지 및 타입 풀
    const alertPool = [
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


    while (currentTime <= endDate) {
        servers.forEach((server, serverIndex) => {
            // 기본 사용률 및 패턴
            let cpuUsage = 10 + (Math.sin(currentTime.getHours() * Math.PI / 12 + serverIndex / 5) * 35) + Math.random() * 20;
            let memoryUsage = 15 + (Math.cos(currentTime.getHours() * Math.PI / 12 + serverIndex / 5) * 30) + Math.random() * 25;
            let diskUsage = Math.max(5, 20 + Math.sin(serverIndex / 2 + currentTime.getDate() / 2) * 25 + Math.random() * 15);
            let networkTrafficOut = Math.floor(20 + Math.abs(Math.cos(currentTime.getHours() * Math.PI / 6 + serverIndex / 3)) * 150 + Math.random() * 80); // Mbps
            let networkTrafficIn = Math.floor(10 + Math.abs(Math.sin(currentTime.getHours() * Math.PI / 6 + serverIndex / 3)) * 100 + Math.random() * 50); // Mbps
            let processCount = 40 + Math.floor(Math.random() * 60) + (server.serverType === 'WAS' || server.serverType === 'BATCH' ? 30 : 0);

            cpuUsage = Math.max(1, Math.min(99.9, parseFloat(cpuUsage.toFixed(1))));
            memoryUsage = Math.max(1, Math.min(99.9, parseFloat(memoryUsage.toFixed(1))));
            diskUsage = Math.max(1, Math.min(99.5, parseFloat(diskUsage.toFixed(1))));

            const currentAlerts = [];
            let currentStatus = 'Normal';
            let highestSeverityScore = 0; // Normal:0, Info:1, Warning:2, Error:3, Critical:4

            // 경고 발생 로직 (시나리오 기반)
            if (server.serverHostname === 'server-05.opm.internal' && (currentTime.getHours() % 12 >= 8 && currentTime.getHours() % 12 <= 10)) {
                const alert = JSON.parse(JSON.stringify(alertPool[0])); 
                alert.message = alert.message.replace("90%", `${(90 + Math.random()*9).toFixed(1)}%`);
                alert.timestamp = currentTime.toISOString();
                currentAlerts.push(alert);
            }
            if (server.serverHostname === 'server-12.opm.internal' && server.serverType === 'DB' && diskUsage > 80 && (currentTime.getHours() % 6 === 0 )) { // 특정 시간에만 디스크 경고 발생
                const alert = JSON.parse(JSON.stringify(alertPool[4])); 
                alert.message = alert.message.replace("95%", `${diskUsage.toFixed(1)}%`);
                alert.timestamp = currentTime.toISOString();
                currentAlerts.push(alert);
            }

            if (cpuUsage > 90 && Math.random() < 0.5) { // 50% 확률로 Critical
                const alert = JSON.parse(JSON.stringify(alertPool[0]));
                alert.message = alert.message.replace("90%", `${cpuUsage}%`);
                alert.timestamp = currentTime.toISOString();
                currentAlerts.push(alert);
            } else if (cpuUsage > 75 && Math.random() < 0.3) { 
                const alert = JSON.parse(JSON.stringify(alertPool[1]));
                alert.message = alert.message.replace("75%", `${cpuUsage}%`);
                alert.timestamp = currentTime.toISOString();
                currentAlerts.push(alert);
            }

            if (memoryUsage > 90 && Math.random() < 0.4) { // 40% 확률로 Critical
                const alert = JSON.parse(JSON.stringify(alertPool[2]));
                alert.message = alert.message.replace("5% 미만", `${(100-memoryUsage).toFixed(1)}% 미만`);
                alert.timestamp = currentTime.toISOString();
                currentAlerts.push(alert);
            } else if (memoryUsage > 80 && Math.random() < 0.25) {
                const alert = JSON.parse(JSON.stringify(alertPool[3]));
                alert.message = alert.message.replace("80%", `${memoryUsage}%`);
                alert.timestamp = currentTime.toISOString();
                currentAlerts.push(alert);
            }
            
            if (server.serverType === 'WAS' && Math.random() < 0.03) {
                const alert = JSON.parse(JSON.stringify(alertPool[10])); 
                alert.timestamp = currentTime.toISOString();
                currentAlerts.push(alert);
            }
            if (server.serverType === 'DB' && Math.random() < 0.05 && currentTime.getHours() > 20) { // 저녁시간 DB 슬로우쿼리
                const alert = JSON.parse(JSON.stringify(alertPool[15])); 
                alert.timestamp = currentTime.toISOString();
                currentAlerts.push(alert);
            }
            if (server.serverType === 'MONITORING' && Math.random() < 0.02) {
                const alert = JSON.parse(JSON.stringify(alertPool[12])); 
                alert.timestamp = currentTime.toISOString();
                currentAlerts.push(alert);
            }
            if (server.serverType === 'API' && (networkTrafficOut > 200 || networkTrafficIn > 150) && Math.random() < 0.1) {
                const alert = JSON.parse(JSON.stringify(alertPool[7])); // 외부 네트워크 트래픽 급증
                alert.timestamp = currentTime.toISOString();
                currentAlerts.push(alert);
            }


            const finalAlerts = [];
            const alertKeys = new Set();
            currentAlerts.forEach(al => { // 같은 시간, 같은 서버에 동일 타입/심각도 경고 중복 제거 (메시지는 다를 수 있음)
               const key = `${al.type}-${al.severity}`;
               if (!alertKeys.has(key)) {
                   finalAlerts.push(al);
                   alertKeys.add(key);
               } else { // 이미 같은 타입/심각도 경고가 있다면, 메시지만 업데이트 시도 (더 심각한 메시지로)
                   const existingAlertIndex = finalAlerts.findIndex(fa => fa.type === al.type && fa.severity === al.severity);
                   if (existingAlertIndex !== -1 && al.message.length > finalAlerts[existingAlertIndex].message.length) { // 간단한 로직: 더 긴 메시지로
                       finalAlerts[existingAlertIndex] = al;
                   }
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
