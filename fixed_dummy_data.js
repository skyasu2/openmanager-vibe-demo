// fixed_dummy_data.js (시간 기준 변경 및 장애 시나리오 조정)

function getFixedDummyData() {
    const servers = [];
    // (서버 이름 생성 로직은 이전 답변과 동일하게 유지 - 다채로운 호스트 이름)
    const environments = ['prod', 'stg', 'dev'];
    const rolesByType = {
        WEB: ['nginx', 'apache', 'lb'], WAS: ['tomcat', 'node', 'spring'],
        DB: ['mysql-master', 'mysql-slave', 'pgsql'], BATCH: ['worker', 'scheduler'],
        MONITORING: ['prometheus', 'grafana'], SEARCH: ['elasticsearch'],
        API: ['gateway', 'authsvc', 'ordersvc', 'paymentsvc'], CACHE: ['redis', 'memcached']
    };
    const serverTypes = Object.keys(rolesByType);
    const locations = ['Seoul-IDC', 'Busan-IDC', 'US-West-Oregon', 'EU-Frankfurt', 'APAC-Singapore'];

    for (let i = 0; i < 30; i++) {
        const env = environments[i % environments.length];
        const serverType = serverTypes[Math.floor(i / environments.length) % serverTypes.length];
        const roleArray = rolesByType[serverType];
        const role = roleArray[i % roleArray.length];
        const instanceNum = Math.floor(i / (environments.length * serverTypes.length)) + 1;
        const hostname = `${env}-${serverType.toLowerCase()}-${role}-${String(instanceNum).padStart(2, '0')}.opm-cloud.com`;
        servers.push({
            serverHostname: hostname,
            ip: `10.${i % 8}.${Math.floor(i / 8)}.${(i % 50) + 10}`,
            serverType: serverType,
            location: locations[i % locations.length]
        });
    }

    const data = [];
    // --- 데이터 생성 기준 시간 및 기간 변경 ---
    const baseEndDate = new Date(); // 페이지 로드 시점의 현재 시간
    const startDate = new Date(baseEndDate);
    startDate.setHours(baseEndDate.getHours() - 24); // 최근 24시간 (1일치) 데이터

    let currentTime = new Date(startDate);

    const alertPool = [ /* 이전 답변의 alertPool 사용 */
        { type: 'CPU', severity: 'Critical', message: "CPU 사용률 임계치(90%) 초과", keywords: ["cpu", "critical", "사용률", "초과"] },
        { type: 'CPU', severity: 'Warning', message: "CPU 부하 지속적 높음 (75% 이상)", keywords: ["cpu", "warning", "부하", "높음"] },
        { type: 'Memory', severity: 'Critical', message: "사용 가능 메모리 매우 부족 (5% 미만)", keywords: ["memory", "critical", "메모리", "부족"] },
        { type: 'Memory', severity: 'Warning', message: "메모리 사용률 높음 (80% 이상)", keywords: ["memory", "warning", "사용률", "높음"] },
        { type: 'Disk', severity: 'Critical', message: "디스크 공간 부족 (/data 95% 사용)", keywords: ["disk", "critical", "공간", "부족", "/data"] },
        { type: 'Network', severity: 'Error', message: "네트워크 외부 트래픽 비정상적 급증", keywords: ["network", "error", "트래픽", "급증"] },
        { type: 'Process', severity: 'Critical', message: "주요 프로세스(OrderService) 응답 없음", keywords: ["process", "critical", "OrderService", "응답없음"] },
        { type: 'Security', severity: 'Critical', message: "비정상 로그인 시도 감지 (Admin 계정, 다수 IP)", keywords: ["security", "critical", "login", "admin"] },
        { type: 'Batch', severity: 'Error', message: "야간 배치 작업(id: BATCH_USER_SYNC_01) 실패", keywords: ["batch", "error", "실패"] },
        { type: 'Database', severity: 'Critical', message: "DB 연결 풀 고갈 (prod-db-mysql-master-01)", keywords: ["database", "critical", "prod-db-mysql-master-01", "고갈"] }
    ];

    // --- 장애 시나리오: 최근 몇 시간 이내에 발생하도록 조정 ---
    // 예: 2시간 전 ~ 1시간 전 사이에 특정 서버들에 집중 장애
    const criticalTimeStartHoursAgo = 2; // 2시간 전부터
    const criticalTimeEndHoursAgo = 1;   // 1시간 전까지 (즉, 1시간 동안 장애)

    // 장애를 주입할 서버 (이전과 동일하게 유지하거나, 새로운 호스트 이름에 맞게 선택)
    const problematicServerHostnames = [
        servers[2].serverHostname, // 예: prod-db-mysql-master-01
        servers[5].serverHostname, // 예: stg-was-node-01
        servers[10].serverHostname // 예: dev-api-gateway-01
    ];

    // 10분 간격 데이터 생성 (24시간 * 6 = 144개의 데이터 포인트)
    while (currentTime <= baseEndDate) {
        servers.forEach((server, serverIndex) => {
            let cpu = 10 + (Math.sin(currentTime.getHours() * Math.PI / 12 + currentTime.getMinutes()/60 * Math.PI/12 + serverIndex / 5) * 30) + Math.random() * 15;
            let mem = 15 + (Math.cos(currentTime.getHours() * Math.PI / 12 + currentTime.getMinutes()/60 * Math.PI/12 + serverIndex / 5) * 25) + Math.random() * 20;
            let disk = Math.max(5, 20 + Math.sin(serverIndex / 2 + (currentTime.getMinutes()%6)) * 25 + Math.random()*10); // 분 단위 변동 추가
            let netOut = Math.floor(20 + Math.abs(Math.cos(currentTime.getHours()*Math.PI/6 + currentTime.getMinutes()/30 * Math.PI/6 + serverIndex/3)) * 100 + Math.random()*50);
            let netIn = Math.floor(10 + Math.abs(Math.sin(currentTime.getHours()*Math.PI/6 + currentTime.getMinutes()/30 * Math.PI/6 + serverIndex/3)) * 70 + Math.random()*30);
            let proc = 40 + Math.floor(Math.random() * 60) + (server.serverType === 'WAS' || server.serverType === 'BATCH' ? 30 : 0);
            
            let currentServerAlerts = [];
            let serverStatus = 'Normal';
            let serverHighestSeverityScore = 0;

            // 의도적인 장애 주입 로직 (시간 기준 변경)
            const hoursAgo = (baseEndDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
            const isCriticalTimeWindow = (hoursAgo >= criticalTimeEndHoursAgo && hoursAgo < criticalTimeStartHoursAgo);

            if (problematicServerHostnames.includes(server.serverHostname) && isCriticalTimeWindow) {
                if (server.serverType === 'DB') { /* ... (이전 장애 주입 로직과 유사하게, 단 현재 시간 기준으로 발생) ... */
                    cpu = Math.random() * 10 + 88; mem = Math.random() * 5 + 92; disk = Math.random() * 3 + 94;
                    currentServerAlerts.push({...alertPool[9], timestamp: currentTime.toISOString()}); // DB 연결 풀
                    if(Math.random() < 0.6) currentServerAlerts.push({...JSON.parse(JSON.stringify(alertPool[4])).message = alertPool[4].message.replace("95%", `${disk.toFixed(1)}%`), timestamp: currentTime.toISOString()});
                } else if (server.serverType === 'WAS') {
                    cpu = Math.random() * 15 + 82; mem = Math.random() * 10 + 90;
                    currentServerAlerts.push({...JSON.parse(JSON.stringify(alertPool[2])).message = alertPool[2].message.replace("5% 미만", `${(100-mem).toFixed(1)}% 미만`), timestamp: currentTime.toISOString()});
                    if(Math.random() < 0.5) currentServerAlerts.push({...alertPool[6], timestamp: currentTime.toISOString()}); // OrderService 응답없음 (Process로 변경)
                } else if (server.serverType === 'API') {
                    cpu = Math.random() * 5 + 93; netOut += 250; netIn += 120;
                    currentServerAlerts.push({...JSON.parse(JSON.stringify(alertPool[0])).message = alertPool[0].message.replace("90%", `${cpu.toFixed(1)}%`), timestamp: currentTime.toISOString()});
                    currentServerAlerts.push({...alertPool[6], severity:'Error', timestamp: currentTime.toISOString()}); // 네트워크 트래픽
                }
                // 해당 시간에 장애가 발생한 서버는 상태를 Critical 또는 Error로 명시적 설정
                serverStatus = (currentServerAlerts.some(al => al.severity === 'Critical') ? 'Critical' : 'Error');
            } else { // 일반적인 상황
                if (cpu > 80 && Math.random() < 0.05) currentServerAlerts.push({...alertPool[1], timestamp: currentTime.toISOString()});
                if (mem > 85 && Math.random() < 0.03) currentServerAlerts.push({...alertPool[3], timestamp: currentTime.toISOString()});
                // 로그인 실패 경고 (최근 24시간 내 발생하도록 확률 조정)
                if (server.serverType === 'API' && server.serverHostname.includes('authsvc') && Math.random() < 0.01) { // 하루에 몇 번 정도 발생
                     currentServerAlerts.push({...alertPool[7], timestamp: currentTime.toISOString()});
                }
            }

            cpu = Math.max(1, Math.min(99.9, parseFloat(cpu.toFixed(1))));
            mem = Math.max(1, Math.min(99.9, parseFloat(mem.toFixed(1))));
            disk = Math.max(1, Math.min(99.5, parseFloat(disk.toFixed(1))));

            const finalAlerts = []; /* ... (이전 답변의 finalAlerts 생성 로직과 동일) ... */
            const alertKeys = new Set();
            currentServerAlerts.forEach(al => { 
               const key = `${al.type}-${al.severity}-${al.message.substring(0,10)}`; 
               if (!alertKeys.has(key)) {
                   finalAlerts.push(al);
                   alertKeys.add(key);
               } else { 
                   const existingAlertIndex = finalAlerts.findIndex(fa => fa.type === al.type && fa.severity === al.severity);
                   if (existingAlertIndex !== -1 && al.message.length > finalAlerts[existingAlertIndex].message.length) { 
                       finalAlerts[existingAlertIndex] = al;
                   }
               }
            });

            // 상태 결정: 강제 지정된 상태가 있으면 그것을 따르고, 아니면 경고 기반으로 결정
            if (serverStatus === 'Normal') {
                finalAlerts.forEach(al => {
                    if (al.severity === 'Critical') serverHighestSeverityScore = Math.max(serverHighestSeverityScore, 4);
                    else if (al.severity === 'Error') serverHighestSeverityScore = Math.max(serverHighestSeverityScore, 3);
                    else if (al.severity === 'Warning') serverHighestSeverityScore = Math.max(serverHighestSeverityScore, 2);
                    else if (al.severity === 'Info') serverHighestSeverityScore = Math.max(serverHighestSeverityScore, 1);
                });
                if (serverHighestSeverityScore === 4) serverStatus = 'Critical';
                else if (serverHighestSeverityScore === 3) serverStatus = 'Error';
                else if (serverHighestSeverityScore === 2) serverStatus = 'Warning';
                else if (serverHighestSeverityScore === 1) serverStatus = 'Info';
            } else { // 시나리오에서 status가 직접 지정된 경우 해당 심각도 코드 반영
                 if (serverStatus === 'Critical') serverHighestSeverityScore = 4;
                 else if (serverStatus === 'Error') serverHighestSeverityScore = 3;
            }


            data.push({
                serverHostname: server.serverHostname, ip: server.ip, serverType: server.serverType, location: server.location,
                timestamp: currentTime.toISOString(),
                stats: { cpuUsage: cpu, memoryUsage: mem, diskUsage: disk, networkTrafficIn: netIn, networkTrafficOut: netOut, processCount: proc },
                status: serverStatus, alerts: finalAlerts
            });
        });
        currentTime.setMinutes(currentTime.getMinutes() + 10); // --- 10분 간격으로 변경 ---
    }
    console.log(`Total dummy data points created (last 24h, 10min interval): ${data.length}`);
    return data;
}
