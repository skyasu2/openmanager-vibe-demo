// fixed_dummy_data.js (substring 오류 수정)

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
    startDate.setHours(baseEndDate.getHours() - 24); 

    let currentTime = new Date(startDate);

    const alertPool = [ 
        { type: 'CPU', severity: 'Critical', message: "CPU 사용률 임계치(90%) 초과", keywords: ["cpu", "critical", "사용률", "초과"] },
        { type: 'CPU', severity: 'Warning', message: "CPU 부하 지속적 높음 (75% 이상)", keywords: ["cpu", "warning", "부하", "높음"] },
        { type: 'Memory', severity: 'Critical', message: "사용 가능 메모리 매우 부족 (5% 미만)", keywords: ["memory", "critical", "메모리", "부족"] },
        { type: 'Memory', severity: 'Warning', message: "메모리 사용률 높음 (80% 이상)", keywords: ["memory", "warning", "사용률", "높음"] }, 
        { type: 'Disk', severity: 'Critical', message: "디스크 공간 부족 (/data 95% 사용)", keywords: ["disk", "critical", "공간", "부족", "/data"] }, 
        { type: 'Disk', severity: 'Warning', message: "디스크 I/O 응답 시간 지연", keywords: ["disk", "warning", "i/o", "지연"] },
        { type: 'Network', severity: 'Error', message: "네트워크 외부 트래픽 비정상적 급증", keywords: ["network", "error", "트래픽", "급증"] }, 
        { type: 'Process', severity: 'Critical', message: "주요 프로세스(OrderService) 응답 없음", keywords: ["process", "critical", "OrderService", "응답없음"] }, 
        { type: 'Security', severity: 'Critical', message: "비정상 로그인 시도 감지 (Admin 계정, 다수 IP)", keywords: ["security", "critical", "login", "admin"] }, 
        { type: 'Batch', severity: 'Error', message: "야간 배치 작업(id: BATCH_USER_SYNC_01) 실패", keywords: ["batch", "error", "실패"] }, 
        { type: 'Database', severity: 'Critical', message: "DB 연결 풀 고갈 (prod-db-mysql-master-01)", keywords: ["database", "critical", "prod-db-mysql-master-01", "고갈"] } 
    ];

    const criticalTimeStartHoursAgo = 2; 
    const criticalTimeEndHoursAgo = 1;   

    const problematicServerHostnames = [
        servers[2].serverHostname, 
        servers[5].serverHostname, 
        servers[10].serverHostname 
    ];

    while (currentTime <= baseEndDate) {
        servers.forEach((server, serverIndex) => {
            let cpu = 10 + (Math.sin(currentTime.getHours() * Math.PI / 12 + currentTime.getMinutes()/60 * Math.PI/12 + serverIndex / 5) * 30) + Math.random() * 15;
            let mem = 15 + (Math.cos(currentTime.getHours() * Math.PI / 12 + currentTime.getMinutes()/60 * Math.PI/12 + serverIndex / 5) * 25) + Math.random() * 20;
            let disk = Math.max(5, 20 + Math.sin(serverIndex / 2 + (currentTime.getMinutes()%6)) * 25 + Math.random()*10); 
            let netOut = Math.floor(20 + Math.abs(Math.cos(currentTime.getHours()*Math.PI/6 + currentTime.getMinutes()/30 * Math.PI/6 + serverIndex/3)) * 100 + Math.random()*50);
            let netIn = Math.floor(10 + Math.abs(Math.sin(currentTime.getHours()*Math.PI/6 + currentTime.getMinutes()/30 * Math.PI/6 + serverIndex/3)) * 70 + Math.random()*30);
            let proc = 40 + Math.floor(Math.random() * 60) + (server.serverType === 'WAS' || server.serverType === 'BATCH' ? 30 : 0);
            
            let currentServerAlerts = [];
            let serverStatus = 'Normal';
            let serverHighestSeverityScore = 0;

            const hoursAgo = (baseEndDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
            const isCriticalTimeWindow = (hoursAgo >= criticalTimeEndHoursAgo && hoursAgo < criticalTimeStartHoursAgo);

            if (problematicServerHostnames.includes(server.serverHostname) && isCriticalTimeWindow) {
                if (server.serverType === 'DB') { 
                    cpu = Math.random() * 10 + 88; mem = Math.random() * 5 + 92; disk = Math.random() * 3 + 94;
                    const alert1 = JSON.parse(JSON.stringify(alertPool[10])); // DB 연결 풀
                    alert1.timestamp = currentTime.toISOString();
                    currentServerAlerts.push(alert1);
                    if(Math.random() < 0.6){ 
                         const alert2 = JSON.parse(JSON.stringify(alertPool[4])); 
                         alert2.message = (alert2.message || "").replace("95%", `${disk.toFixed(1)}%`); // message 존재 확인
                         alert2.timestamp = currentTime.toISOString();
                         currentServerAlerts.push(alert2);
                    }
                } else if (server.serverType === 'WAS') {
                    cpu = Math.random() * 15 + 82; mem = Math.random() * 10 + 90;
                    const alert1 = JSON.parse(JSON.stringify(alertPool[2])); 
                    alert1.message = (alert1.message || "").replace("5% 미만", `${(100-mem).toFixed(1)}% 미만`);
                    alert1.timestamp = currentTime.toISOString();
                    currentServerAlerts.push(alert1);
                    if(Math.random() < 0.5) {
                        const alert2 = JSON.parse(JSON.stringify(alertPool[7])); // Process 응답 없음 (OrderService)
                        alert2.timestamp = currentTime.toISOString();
                        currentServerAlerts.push(alert2);
                    }
                } else if (server.serverType === 'API') {
                    cpu = Math.random() * 5 + 93; netOut += 250; netIn += 120;
                    const alert1 = JSON.parse(JSON.stringify(alertPool[0])); 
                    alert1.message = (alert1.message || "").replace("90%", `${cpu.toFixed(1)}%`);
                    alert1.timestamp = currentTime.toISOString();
                    currentServerAlerts.push(alert1);
                    const alert2 = JSON.parse(JSON.stringify(alertPool[6])); 
                    alert2.severity = 'Error'; 
                    alert2.timestamp = currentTime.toISOString();
                    currentServerAlerts.push(alert2);
                }
                serverStatus = (currentServerAlerts.some(al => al.severity === 'Critical') ? 'Critical' : 'Error');
            } else { 
                if (cpu > 80 && Math.random() < 0.05) {
                    const alert = JSON.parse(JSON.stringify(alertPool[1]));
                    alert.message = (alert.message || "").replace("75%", `${cpu.toFixed(1)}%`);
                    alert.timestamp = currentTime.toISOString(); currentServerAlerts.push(alert);
                }
                if (mem > 85 && Math.random() < 0.03) {
                    const alert = JSON.parse(JSON.stringify(alertPool[3]));
                    alert.message = (alert.message || "").replace("80%", `${mem.toFixed(1)}%`);
                    alert.timestamp = currentTime.toISOString(); currentServerAlerts.push(alert);
                }
                if (server.serverType === 'API' && server.serverHostname.includes('authsvc') && Math.random() < 0.01) {
                     currentServerAlerts.push({...alertPool[8], timestamp: currentTime.toISOString()}); // Security 로그인 시도
                }
            }

            cpu = Math.max(1, Math.min(99.9, parseFloat(cpu.toFixed(1))));
            mem = Math.max(1, Math.min(99.9, parseFloat(mem.toFixed(1))));
            disk = Math.max(1, Math.min(99.5, parseFloat(disk.toFixed(1))));

            const finalAlerts = [];
            const alertKeys = new Set();
            currentServerAlerts.forEach(al => { 
               // *** 오류 수정 지점: al.message가 undefined일 경우를 대비 ***
               const messagePart = (al.message && typeof al.message === 'string') ? al.message.substring(0,10) : 'no_message';
               const key = `${al.type}-${al.severity}-${messagePart}`; 
               if (!alertKeys.has(key)) {
                   finalAlerts.push(al);
                   alertKeys.add(key);
               } else { 
                   const existingAlertIndex = finalAlerts.findIndex(fa => fa.type === al.type && fa.severity === al.severity);
                   if (existingAlertIndex !== -1 && 
                       al.message && typeof al.message === 'string' && // 방어 코드
                       finalAlerts[existingAlertIndex].message && typeof finalAlerts[existingAlertIndex].message === 'string' && // 방어 코드
                       al.message.length > finalAlerts[existingAlertIndex].message.length) { 
                       finalAlerts[existingAlertIndex] = al;
                   }
               }
            });

            if (serverStatus === 'Normal') { // 시나리오에서 상태가 직접 지정되지 않은 경우
                serverHighestSeverityScore = 0; // 매번 초기화
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
            } else { // 시나리오에서 Critical 또는 Error로 상태가 이미 설정된 경우
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
