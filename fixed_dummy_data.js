// fixed_dummy_data.js (수정 제안)

function getFixedDummyData() {
    const servers = [];
    const serverTypes = ['WEB', 'WAS', 'DB', 'BATCH', 'MONITORING', 'SEARCH']; // 서버 타입 다양화
    for (let i = 1; i <= 30; i++) {
        servers.push({
            serverHostname: `server-${String(i).padStart(2, '0')}.example.com`,
            ip: `10.0.${Math.floor(i/10)}.${i % 256}`, // IP 주소 패턴 약간 변경
            serverType: serverTypes[i % serverTypes.length],
            location: ['Seoul-IDC', 'Busan-IDC', 'US-West', 'EU-Central'][i % 4] // 위치 정보 추가
        });
    }

    const data = [];
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7); // 7일 전

    let currentTime = new Date(startDate);

    // 경고 메시지 풀 (자연어 처리에 용이하도록)
    const alertMessageTemplates = {
        CPU: [
            { severity: 'Critical', type: 'CPU', messageTemplate: "CPU 사용률이 [VALUE]%로 임계치를 초과했습니다. 즉각적인 조치가 필요합니다." },
            { severity: 'Warning', type: 'CPU', messageTemplate: "CPU 부하가 지속적으로 [VALUE]% 이상입니다. 확인이 필요합니다." }
        ],
        Memory: [
            { severity: 'Critical', type: 'Memory', messageTemplate: "사용 가능한 메모리가 [VALUE]MB 미만입니다. 시스템 OOM 가능성이 높습니다." },
            { severity: 'Warning', type: 'Memory', messageTemplate: "메모리 사용량이 [VALUE]%로 높게 유지되고 있습니다. 메모리 누수 점검이 필요합니다." }
        ],
        Disk: [
            { severity: 'Critical', type: 'Disk', messageTemplate: "디스크 공간이 [AFFECTED_RESOURCE] 파티션에서 [VALUE]% 미만 남았습니다. 서비스 중단 위험." , affectedResourcePool: ["/data", "/log", "/backup"]},
            { severity: 'Warning', type: 'Disk', messageTemplate: "디스크 I/O 대기 시간이 평균 [VALUE]ms를 초과합니다. 성능 저하가 우려됩니다." }
        ],
        Process: [
            { severity: 'Critical', type: 'Process', messageTemplate: "주요 프로세스 '[AFFECTED_RESOURCE]'가 응답하지 않거나 종료되었습니다.", affectedResourcePool: ["nginx", "tomcat_app_A", "mysql_daemon", "important_batch"]},
            { severity: 'Warning', type: 'Process', messageTemplate: "프로세스 '[AFFECTED_RESOURCE]'의 CPU 점유율이 비정상적으로 높습니다.", affectedResourcePool: ["data_sync_worker", "reporting_service"]}
        ],
        ApplicationError: [
            { severity: 'Error', type: 'ApplicationError', messageTemplate: "애플리케이션 '[AFFECTED_RESOURCE]'에서 예외 발생: [ERROR_CODE]", errorCodePool: ["NullPointerException", "TimeoutException", "DBConnectionError"], affectedResourcePool: ["OrderService", "PaymentGateway", "UserAuthModule"]},
        ],
        Security: [
            { severity: 'Critical', type: 'SecurityAlert', messageTemplate: "비정상적인 로그인 시도 다수 감지 (IP: [IP_ADDRESS])", ipAddressPool: ["1.2.3.4", "5.6.7.8"]},
            { severity: 'Warning', type: 'SecurityAlert', messageTemplate: "방화벽에서 의심스러운 트래픽 패턴 감지 (Port: [PORT])", portPool: ["8080", "22", "3306"]},
        ]
    };


    while (currentTime <= endDate) {
        servers.forEach((server, serverIndex) => {
            // 기본 사용률 (이전과 유사하게 설정하되, 조금 더 변동성 추가)
            let cpuUsage = 10 + (Math.sin(currentTime.getHours() * Math.PI / 12 + serverIndex) * 30) + Math.random() * 20;
            let memoryUsage = 20 + (Math.cos(currentTime.getHours() * Math.PI / 12 + serverIndex) * 25) + Math.random() * 30;
            let diskUsage = Math.max(10, 30 + Math.sin(serverIndex + currentTime.getDate()) * 20 + Math.random() * 10); // 일별 변동성
            let networkTraffic = Math.floor(50 + Math.abs(Math.cos(currentTime.getHours() * Math.PI / 6 + serverIndex)) * 200 + Math.random() * 100); // Mbps
            let processCount = 50 + Math.floor(Math.random() * 50) + (server.serverType === 'WAS' ? 20 : 0);
            let loggedInUsers = server.serverType.match(/WEB|WAS/) ? Math.max(0, Math.floor(Math.random() * 10 - 5 + (currentTime.getHours() > 8 && currentTime.getHours() < 20 ? 5 : 0))) : 0;

            cpuUsage = Math.max(5, Math.min(99, parseFloat(cpuUsage.toFixed(1))));
            memoryUsage = Math.max(10, Math.min(98, parseFloat(memoryUsage.toFixed(1))));
            diskUsage = Math.max(5, Math.min(95, parseFloat(diskUsage.toFixed(1))));

            const currentAlerts = [];
            let currentStatus = 'Normal';
            let highestSeverity = 0; // 0: Normal, 1: Info, 2: Warning, 3: Error, 4: Critical

            // 경고 생성 로직 (시나리오 기반)
            if (server.serverHostname === 'server-05.example.com' && (currentTime.getHours() >= 14 && currentTime.getHours() <= 16)) { // 특정 서버, 특정 시간대 집중 경고
                const templateInfo = alertMessageTemplates.CPU[0]; // Critical CPU
                currentAlerts.push({
                    severity: templateInfo.severity,
                    type: templateInfo.type,
                    message: templateInfo.messageTemplate.replace('[VALUE]', (90 + Math.random()*5).toFixed(1)),
                    timestamp: currentTime.toISOString() // 각 경고에도 타임스탬프
                });
                highestSeverity = Math.max(highestSeverity, 4);
                cpuUsage = Math.max(cpuUsage, 90 + Math.random()*5);
            }

            if (memoryUsage > 85 && Math.random() < 0.3) {
                const templateInfo = alertMessageTemplates.Memory[0]; // Critical Memory
                currentAlerts.push({
                    severity: templateInfo.severity,
                    type: templateInfo.type,
                    message: templateInfo.messageTemplate.replace('[VALUE]', (Math.random()*100 + 50).toFixed(0) ), // 50~150MB
                    timestamp: currentTime.toISOString()
                });
                highestSeverity = Math.max(highestSeverity, 4);
            } else if (memoryUsage > 70 && Math.random() < 0.2) {
                const templateInfo = alertMessageTemplates.Memory[1]; // Warning Memory
                 currentAlerts.push({
                    severity: templateInfo.severity,
                    type: templateInfo.type,
                    message: templateInfo.messageTemplate.replace('[VALUE]', memoryUsage.toFixed(1)),
                    timestamp: currentTime.toISOString()
                });
                highestSeverity = Math.max(highestSeverity, 2);
            }

            if (diskUsage > 90 && server.serverType === 'DB' && Math.random() < 0.4) {
                const templateInfo = alertMessageTemplates.Disk[0];
                const resource = templateInfo.affectedResourcePool[Math.floor(Math.random() * templateInfo.affectedResourcePool.length)];
                currentAlerts.push({
                    severity: templateInfo.severity,
                    type: templateInfo.type,
                    message: templateInfo.messageTemplate.replace('[AFFECTED_RESOURCE]', resource).replace('[VALUE]', (1 + Math.random()*4).toFixed(1)),
                    affectedResource: resource,
                    timestamp: currentTime.toISOString()
                });
                highestSeverity = Math.max(highestSeverity, 4);
            }
            
            // 애플리케이션 에러 (WAS 서버에서 가끔 발생)
            if (server.serverType === 'WAS' && Math.random() < 0.05) {
                const templateInfo = alertMessageTemplates.ApplicationError[0];
                const appResource = templateInfo.affectedResourcePool[Math.floor(Math.random() * templateInfo.affectedResourcePool.length)];
                const errCode = templateInfo.errorCodePool[Math.floor(Math.random() * templateInfo.errorCodePool.length)];
                currentAlerts.push({
                    severity: templateInfo.severity,
                    type: templateInfo.type,
                    message: templateInfo.messageTemplate.replace('[AFFECTED_RESOURCE]', appResource).replace('[ERROR_CODE]', errCode),
                    errorCode: errCode,
                    affectedResource: appResource,
                    timestamp: currentTime.toISOString()
                });
                highestSeverity = Math.max(highestSeverity, 3);
            }

            // 보안 경고 (MONITORING 서버에서 가끔 발생)
             if (server.serverType === 'MONITORING' && Math.random() < 0.1) {
                const templateInfo = alertMessageTemplates.Security[0];
                const ip = templateInfo.ipAddressPool[Math.floor(Math.random() * templateInfo.ipAddressPool.length)];
                currentAlerts.push({
                    severity: templateInfo.severity,
                    type: templateInfo.type,
                    message: templateInfo.messageTemplate.replace('[IP_ADDRESS]', ip),
                    timestamp: currentTime.toISOString()
                });
                highestSeverity = Math.max(highestSeverity, 4);
            }


            if (highestSeverity === 4) currentStatus = 'Critical';
            else if (highestSeverity === 3) currentStatus = 'Error'; // Error 상태 추가
            else if (highestSeverity === 2) currentStatus = 'Warning';
            else if (highestSeverity === 1) currentStatus = 'Info';


            data.push({
                serverHostname: server.serverHostname,
                ip: server.ip,
                serverType: server.serverType,
                location: server.location,
                timestamp: currentTime.toISOString(),
                stats: {
                    cpuUsage: parseFloat(cpuUsage.toFixed(1)),
                    memoryUsage: parseFloat(memoryUsage.toFixed(1)),
                    diskUsage: parseFloat(diskUsage.toFixed(1)),
                    networkTraffic: networkTraffic, // Mbps
                    processCount: processCount,
                    loggedInUsers: loggedInUsers
                },
                status: currentStatus,
                alerts: currentAlerts // 각 데이터 포인트에 해당 시점의 경고 목록 포함
            });
        });
        currentTime.setHours(currentTime.getHours() + 1);
    }
    return data;
}
