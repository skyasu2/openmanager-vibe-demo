// fixed_dummy_data.js

function getFixedDummyData() {
    const servers = [];
    const serverTypes = ['WEB', 'WAS', 'DB', 'CACHE', 'API'];
    for (let i = 1; i <= 30; i++) {
        servers.push({
            serverHostname: `server-${String(i).padStart(2, '0')}.example.com`,
            ip: `192.168.0.${i}`,
            serverType: serverTypes[i % serverTypes.length], // 순환하며 타입 지정
        });
    }

    const data = [];
    const endDate = new Date(); // 현재 시간을 기준으로 마지막 데이터 시점 설정
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7); // 7일 전부터 시작

    let currentTime = new Date(startDate);

    while (currentTime <= endDate) {
        servers.forEach((server, serverIndex) => {
            // 서버별 기본 사용률 및 패턴 설정
            const baseCpu = 20 + (serverIndex * 2) % 50; // 서버마다 다른 기본 CPU (20-68%)
            const baseMemory = 30 + (serverIndex * 3) % 40; // (30-67%)
            const baseDisk = 40 + (serverIndex * 1) % 30; // (40-69%)
            const baseNetwork = 10 + (serverIndex * 2) % 20; // (10-28%)

            const hour = currentTime.getHours();
            const day = currentTime.getDay(); // 0 (일요일) - 6 (토요일)

            // 시간대별, 요일별 사용량 변동 (간단한 패턴)
            let cpuUsage = baseCpu + (Math.sin(hour / 3) * 10) + (day >= 1 && day <= 5 ? 10 : 0) + (Math.random() * 10 - 5);
            let memoryUsage = baseMemory + (Math.cos(hour / 4) * 10) + (day >= 1 && day <= 5 ? 5 : 0) + (Math.random() * 8 - 4);
            let diskUsage = baseDisk + Math.random() * 5; // 디스크는 비교적 꾸준
            let networkUsage = baseNetwork + (Math.sin(hour / 2) * 15) + (Math.random() * 10 - 5);

            // 특정 서버는 항상 높은 부하를 갖도록 설정 (예: server-05, server-15)
            if (server.serverHostname === 'server-05.example.com' || server.serverHostname === 'server-15.example.com') {
                cpuUsage += 20;
                memoryUsage += 15;
            }
            
            // 사용률 0~100% 범위 제한 및 소수점 한 자리
            cpuUsage = Math.max(0, Math.min(100, parseFloat(cpuUsage.toFixed(1))));
            memoryUsage = Math.max(0, Math.min(100, parseFloat(memoryUsage.toFixed(1))));
            diskUsage = Math.max(0, Math.min(100, parseFloat(diskUsage.toFixed(1))));
            networkUsage = Math.max(0, Math.min(100, parseFloat(networkUsage.toFixed(1))));

            // 상태 값 결정 및 경고 메시지
            const alerts = [];
            let status = 'Normal';
            if (cpuUsage > 90 || memoryUsage > 90) {
                status = 'Critical';
                if (cpuUsage > 90) alerts.push({ severity: 'critical', message: `CPU 사용률 ${cpuUsage}% 초과` });
                if (memoryUsage > 90) alerts.push({ severity: 'critical', message: `메모리 사용률 ${memoryUsage}% 초과` });
            } else if (cpuUsage > 75 || memoryUsage > 75 || diskUsage > 85) {
                status = 'Warning';
                if (cpuUsage > 75) alerts.push({ severity: 'warning', message: `CPU 사용률 ${cpuUsage}%으로 높음` });
                if (memoryUsage > 75) alerts.push({ severity: 'warning', message: `메모리 사용률 ${memoryUsage}%으로 높음` });
                if (diskUsage > 85) alerts.push({ severity: 'warning', message: `디스크 사용률 ${diskUsage}% 초과` });
            }

            data.push({
                serverHostname: server.serverHostname,
                ip: server.ip,
                serverType: server.serverType, // 서버 타입 추가
                timestamp: currentTime.toISOString(),
                stats: {
                    cpuUsage: cpuUsage,
                    memoryUsage: memoryUsage,
                    diskUsage: diskUsage,
                    networkUsage: networkUsage,
                },
                status: status, // 서버의 전반적인 상태
                alerts: alerts, // 개별 경고 메시지 배열
                // 기존 'alert' 필드 (메인 경고 유형)는 alerts 배열로 대체되거나, alerts[0].message 등으로 표현 가능
            });
        });
        currentTime.setHours(currentTime.getHours() + 1);
    }
    return data;
}

// 필요한 경우, 이 데이터를 전역으로 노출시키거나, CommonJS/ESM 모듈 방식으로 export 할 수 있습니다.
// 예시: window.fixedServerData = getFixedDummyData(); (브라우저 전역)
// 또는 export default getFixedDummyData; (ESM)
