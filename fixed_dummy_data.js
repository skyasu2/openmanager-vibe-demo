// fixed_dummy_data.js (장애 상황 및 리소스 사용률 상향 최종 조정)

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
    const baseEndDate = new Date(); 
    const startDate = new Date(baseEndDate);
    startDate.setHours(baseEndDate.getHours() - 24); // 최근 24시간 데이터

    let currentTime = new Date(startDate);

    const alertPool = [ /* 이전 답변의 alertPool 사용 */
        { type: 'CPU', severity: 'Critical', message: "CPU 사용률 임계치(90%) 초과", keywords: ["cpu", "critical", "사용률", "초과"] },
        { type: 'CPU', severity: 'Warning', message: "CPU 부하 지속적 높음 (75% 이상)", keywords: ["cpu", "warning", "부하", "높음"] },
        { type: 'Memory', severity: 'Critical', message: "사용 가능 메모리 매우 부족 (1GB 미만)", keywords: ["memory", "critical", "메모리", "부족"] }, // 메시지 구체화
        { type: 'Memory', severity: 'Warning', message: "메모리 사용률 높음 (85% 이상 지속)", keywords: ["memory", "warning", "사용률", "높음", "지속"] }, 
        { type: 'Disk', severity: 'Critical', message: "디스크 공간 부족 (/data 파티션 95% 사용)", keywords: ["disk", "critical", "공간", "부족", "/data"] }, 
        { type: 'Disk', severity: 'Warning', message: "디스크 I/O 응답 시간 평균 500ms 초과", keywords: ["disk", "warning", "i/o", "지연", "500ms"] },
        { type: 'Network', severity: 'Error', message: "외부 네트워크(Outbound) 트래픽 500Mbps 초과", keywords: ["network", "error", "트래픽", "outbound", "500Mbps"] }, 
        { type: 'Process', severity: 'Critical', message: "주요 프로세스(OrderService) 응답 없음 - 재시작 필요", keywords: ["process", "critical", "OrderService", "응답없음", "재시작"] }, 
        { type: 'Security', severity: 'Critical', message: "비정상 다수 로그인 시도 감지 (Admin 계정, IP:1.2.3.4)", keywords: ["security", "critical", "login", "admin", "1.2.3.4"] }, 
        { type: 'Batch', severity: 'Error', message: "야간 사용자 동기화 배치 작업(BATCH_USER_SYNC_01) 실패 - 코드: B500", keywords: ["batch", "error", "실패", "BATCH_USER_SYNC_01", "B500"] }, 
        { type: 'Database', severity: 'Critical', message: "DB 연결 풀 고갈 (prod-db-mysql-master-01) - 모든 연결 사용 중", keywords: ["database", "critical", "prod-db-mysql-master-01", "고갈"] } 
    ];

    // --- 장애 시나리오: 최근 시간대에 더 명확하고 다양하게 발생 ---
    const criticalTimeConfig = [ // 시간대별 장애 시나리오
        { startHourAgo: 0.5, endHourAgo: 0, // 지금부터 30분 전 사이 (가장 최근)
          problemServers: [servers[1].serverHostname, servers[15].serverHostname], // 예: prod-was-tomcat-01, stg-api-ordersvc-01
          scenario: 'HIGH_CPU_AND_APP_ERROR' },
        { startHourAgo: 2, endHourAgo: 1, // 2시간 전 ~ 1시간 전
          problemServers: [servers[2].serverHostname, servers[20].serverHostname], // 예: prod-db-mysql-master-01, dev-search-elasticsearch-01
          scenario: 'DB_DISK_FULL_AND_SEARCH_SLOW' },
        { startHourAgo: 5, endHourAgo: 3, // 5시간 전 ~ 3시간 전
          problemServers: [servers[5].serverHostname, servers[8].serverHostname, servers[25].serverHostname], // 예: stg-was-node-01, dev-batch-worker-01, prod-cache-redis-01
          scenario: 'WAS_MEMORY_LEAK_AND_BATCH_FAIL_AND_CACHE_LATENCY' }
    ];


    while (currentTime <= baseEndDate) {
        servers.forEach((server, serverIndex) => {
            // 기본 랜덤 사용률 (평소에는 좀 더 낮게, 장애 시에만 높게)
            let cpu = 5 + Math.random() * 45; // 5-50%
            let mem = 10 + Math.random() * 50; // 10-60%
            let disk = Math.max(5, 10 + Math.random() * 60); // 10-70%
            let netOut = Math.floor(10 + Math.random() * 80); // 10-90 Mbps
            let netIn = Math.floor(5 + Math.random() * 60);  // 5-65 Mbps
            let proc = 30 + Math.floor(Math.random() * 40) + (server.serverType === 'WAS' || server.serverType === 'BATCH' ? 20 : 0);
            
            let currentServerAlerts = [];
            let serverStatus = 'Normal';
            let serverHighestSeverityScore = 0;

            const hoursAgoCurrent = (baseEndDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60);

            // 현재 시간에 해당하는 장애 시나리오 적용
            for (const config of criticalTimeConfig) {
                if (hoursAgoCurrent >= config.endHourAgo && hoursAgoCurrent < config.startHourAgo) {
                    if (config.problemServers.includes(server.serverHostname)) {
                        let alertToPush = null;
                        switch (config.scenario) {
                            case 'HIGH_CPU_AND_APP_ERROR':
                                if (server.serverType === 'WAS' || server.serverType === 'WEB' || server.serverType === 'API') {
                                    cpu = 85 + Math.random() * 14; // 85-99%
                                    alertToPush = JSON.parse(JSON.stringify(alertPool[0])); // CPU Critical
                                    alertToPush.message = alertToPush.message.replace("90%", `${cpu.toFixed(1)}%`);
                                    if (Math.random() < 0.7) { // 앱 에러 동시 발생 확률
                                        const appErrorAlert = JSON.parse(JSON.stringify(alertPool[7]));
                                        appErrorAlert.timestamp = currentTime.toISOString();
                                        currentServerAlerts.push(appErrorAlert);
                                    }
                                }
                                break;
                            case 'DB_DISK_FULL_AND_SEARCH_SLOW':
                                if (server.serverType === 'DB') {
                                    disk = 93 + Math.random() * 6; // 93-99%
                                    mem = 70 + Math.random() * 20; // DB 메모리도 높게
                                    alertToPush = JSON.parse(JSON.stringify(alertPool[4])); // Disk Critical
                                    alertToPush.message = alertToPush.message.replace("95%", `${disk.toFixed(1)}%`);
                                } else if (server.serverType === 'SEARCH') {
                                    cpu = 70 + Math.random() * 20; // 검색엔진 CPU 부하
                                    alertToPush = JSON.parse(JSON.stringify(alertPool[1])); // CPU Warning
                                    alertToPush.message = alertToPush.message.replace("75%", `${cpu.toFixed(1)}%`);
                                    // 검색 지연 관련 Info 경고 추가 가능
                                }
                                break;
                            case 'WAS_MEMORY_LEAK_AND_BATCH_FAIL_AND_CACHE_LATENCY':
                                if (server.serverType === 'WAS') {
                                    mem = 88 + Math.random() * 11; // 88-99%
                                    alertToPush = JSON.parse(JSON.stringify(alertPool[3])); // Memory Warning (지속적 높음)
                                    alertToPush.message = alertToPush.message.replace("80%", `${mem.toFixed(1)}%`);
                                } else if (server.serverType === 'BATCH') {
                                    alertToPush = JSON.parse(JSON.stringify(alertPool[9])); // Batch Error
                                    serverStatus = 'Error'; // 배치 실패 시 명시적 에러 상태
                                } else if (server.serverType === 'CACHE') {
                                    // 캐시 지연은 별도 지표가 없으므로, CPU/MEM 약간 올리고 Info 경고
                                    cpu = 60 + Math.random()*10;
                                    // alertToPush = {type: 'Cache', severity: 'Info', message: '캐시 응답 지연 증가', keywords: ["cache", "info", "지연"]};
                                }
                                break;
                        }
                        if (alertToPush) {
                            alertToPush.timestamp = currentTime.toISOString();
                            currentServerAlerts.push(alertToPush);
                        }
                        // 장애 시나리오에 해당되면 상태를 더 높게 설정
                        if (currentServerAlerts.some(al => al.severity === 'Critical')) serverStatus = 'Critical';
                        else if (currentServerAlerts.some(al => al.severity === 'Error')) serverStatus = 'Error';
                        else if (currentServerAlerts.some(al => al.severity === 'Warning')) serverStatus = 'Warning';

                    }
                }
            }
            
            // 일반적인 확률 기반 경고 (장애 시나리오에 해당 안될 때 더 낮은 확률로)
            if(currentServerAlerts.length === 0) {
                if (cpu > 75 && Math.random() < 0.02) { // CPU Warning 확률 낮춤
                    const alert = JSON.parse(JSON.stringify(alertPool[1]));
                    alert.message = (alert.message || "").replace("75%", `${cpu.toFixed(1)}%`);
                    alert.timestamp = currentTime.toISOString(); currentServerAlerts.push(alert);
                }
                if (mem > 80 && Math.random() < 0.015) { // Memory Warning 확률 낮춤
                    const alert = JSON.parse(JSON.stringify(alertPool[3]));
                    alert.message = (alert.message || "").replace("80%", `${mem.toFixed(1)}%`);
                    alert.timestamp = currentTime.toISOString(); currentServerAlerts.push(alert);
                }
                if (disk > 85 && Math.random() < 0.02) { // Disk Warning 확률 낮춤
                     const alert = JSON.parse(JSON.stringify(alertPool[5]));
                     alert.timestamp = currentTime.toISOString(); currentServerAlerts.push(alert);
                }
                 if (server.serverHostname.includes('authsvc') && Math.random() < 0.005) { // 로그인 실패는 매우 드물게
                     currentServerAlerts.push({...alertPool[8], timestamp: currentTime.toISOString()});
                }
            }

            cpu = Math.max(1, Math.min(99.9, parseFloat(cpu.toFixed(1))));
            mem = Math.max(1, Math.min(99.9, parseFloat(mem.toFixed(1))));
            disk = Math.max(1, Math.min(99.5, parseFloat(disk.toFixed(1))));

            const finalAlerts = [];
            const alertKeys = new Set();
            currentServerAlerts.forEach(al => { 
               const messagePart = (al.message && typeof al.message === 'string') ? al.message.substring(0,15) : 'no_message_part'; // 키 생성 시 메시지 부분 길이 늘림
               const key = `${al.type}-${al.severity}-${messagePart}`; 
               if (!alertKeys.has(key)) {
                   finalAlerts.push(al);
                   alertKeys.add(key);
               }
            });

            // 최종 상태 결정
            serverHighestSeverityScore = 0; // 루프마다 초기화
            if (serverStatus === 'Normal') { // 시나리오에서 상태가 직접 지정되지 않은 경우만 경고 기반으로 재계산
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
            } else { // 시나리오에서 상태가 이미 Critical/Error로 지정된 경우 해당 심각도 코드 반영
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
        currentTime.setMinutes(currentTime.getMinutes() + 10); 
    }
    console.log(`Total dummy data points created (last 24h, 10min interval): ${data.length}`);
    return data;
}
