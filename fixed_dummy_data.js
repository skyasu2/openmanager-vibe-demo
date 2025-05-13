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
    const endDate = new Date(); 
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7); 

    let currentTime = new Date(startDate);

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

    const criticalDayOffset = 3; 
    const criticalHourStart = 14; 
    const criticalHourEnd = 16;   

    const problematicServerHostnames = [
        servers[2].serverHostname, 
        servers[5].serverHostname, 
        servers[10].serverHostname 
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

            const dateForCheck = new Date(currentTime);
            const referenceEndDate = new Date(endDate); 
            const isCriticalTime = 
                ( (referenceEndDate.getTime() - dateForCheck.getTime()) / (1000 * 60 * 60 * 24) >= criticalDayOffset -1 && // 정확한 날짜 차이 계산
                  (referenceEndDate.getTime() - dateForCheck.getTime()) / (1000 * 60 * 60 * 24) < criticalDayOffset ) &&
                (dateForCheck.getHours() >= criticalHourStart && dateForCheck.getHours() < criticalHourEnd);

            if (problematicServerHostnames.includes(server.serverHostname) && isCriticalTime) {
                if (server.serverType === 'DB') {
                    cpuUsage = Math.random() * 10 + 85; 
                    memoryUsage = Math.random() * 5 + 90; 
                    const alert1 = JSON.parse(JSON.stringify(alertPool[14])); 
                    alert1.timestamp = currentTime.toISOString();
                    currentAlerts.push(alert1);
                    if(Math.random() < 0.5){ 
                         diskUsage = Math.random() * 5 + 90;
                         const alert2 = JSON.parse(JSON.stringify(alertPool[4])); 
                         alert2.message = alert2.message.replace("95%", `${diskUsage.toFixed(1)}%`);
                         alert2.timestamp = currentTime.toISOString();
                         currentAlerts.push(alert2);
                    }
                } else if (server.serverType === 'WAS') {
                    cpuUsage = Math.random() * 15 + 80; 
                    memoryUsage = Math.random() * 10 + 88; 
                    const alert1 = JSON.parse(JSON.stringify(alertPool[2])); 
                    alert1.message = alert1.message.replace("5% 미만", `${(100-memoryUsage).toFixed(1)}% 미만`);
                    alert1.timestamp = currentTime.toISOString();
                    currentAlerts.push(alert1);
                    if(Math.random() < 0.6){ 
                        const alert2 = JSON.parse(JSON.stringify(alertPool[10]));
                        alert2.timestamp = currentTime.toISOString();
                        currentAlerts.push(alert2);
                    }
                } else if (server.serverType === 'API') {
                    cpuUsage = Math.random() * 5 + 90; 
                    networkTrafficOut += 300; 
                    networkTrafficIn += 150;
                    const alert1 = JSON.parse(JSON.stringify(alertPool[0])); 
                    alert1.message = alert1.message.replace("90%", `${cpuUsage}%`);
                    alert1.timestamp = currentTime.toISOString();
                    currentAlerts.push(alert1);
                    const alert2 = JSON.parse(JSON.stringify(alertPool[7])); 
                    alert2.severity = 'Error'; 
                    alert2.timestamp = currentTime.toISOString();
                    currentAlerts.push(alert2);
                }
            } else { 
                if (cpuUsage > 90 && Math.random() < 0.15) { 
                    const alert = JSON.parse(JSON.stringify(alertPool[0]));
                    alert.message = alert.message.replace("90%", `${cpuUsage.toFixed(1)}%`);
                    alert.timestamp = currentTime.toISOString(); currentAlerts.push(alert);
                } else if (cpuUsage > 75 && Math.random() < 0.1) { 
                    const alert = JSON.parse(JSON.stringify(alertPool[1]));
                    alert.message = alert.message.replace("75%", `${cpuUsage.toFixed(1)}%`);
                    alert.timestamp = currentTime.toISOString(); currentAlerts.push(alert);
                }
                if (memoryUsage > 90 && Math.random() < 0.1) { 
                    const alert = JSON.parse(JSON.stringify(alertPool[2]));
                    alert.message = alert.message.replace("5% 미만", `${(100-memoryUsage).toFixed(1)}% 미만`);
                    alert.timestamp = currentTime.toISOString(); currentAlerts.push(alert);
                } else if (memoryUsage > 80 && Math.random() < 0.08) { 
                    const alert = JSON.parse(JSON.stringify(alertPool[3]));
                    alert.message = alert.message.replace("80%", `${memoryUsage.toFixed(1)}%`);
                    alert.timestamp = currentTime.toISOString(); currentAlerts.push(alert);
                }
                if (server.serverType === 'WEB' && cpuUsage > 85 && Math.random() < 0.2) {
                    const alert = JSON.parse(JSON.stringify(alertPool[8])); 
                    alert.timestamp = currentTime.toISOString();
                    currentAlerts.push(alert);
                }
            }

            cpuUsage = Math.max(1, Math.min(99.9, parseFloat(cpuUsage.toFixed(1))));
            memoryUsage = Math.max(1, Math.min(99.9, parseFloat(memoryUsage.toFixed(1))));
            diskUsage = Math.max(1, Math.min(99.5, parseFloat(diskUsage.toFixed(1))));

            const finalAlerts = [];
            const alertKeys = new Set();
            currentAlerts.forEach(al => { 
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
