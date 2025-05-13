// data_processor.js

class ServerDataProcessor {
    constructor(data) {
        this.rawData = data;
        this.allServerHostnames = [...new Set(this.rawData.map(item => item.serverHostname))];
    }

    // 필터링된 데이터 반환 (주요 필터 로직)
    applyFilters(timeRangeHours = 24, serverTypeFilter = 'all', alertFilterValue = 'all', locationFilter = 'all') {
        let filteredData = this.rawData;

        // 1. 시간 범위 필터
        if (timeRangeHours && Number.isInteger(parseInt(timeRangeHours))) {
            const endTime = this.rawData.length > 0 ? new Date(Math.max(...this.rawData.map(d => new Date(d.timestamp).getTime()))) : new Date();
            const startTime = new Date(endTime);
            startTime.setHours(endTime.getHours() - parseInt(timeRangeHours));
            filteredData = filteredData.filter(item => {
                const itemTime = new Date(item.timestamp);
                return itemTime >= startTime && itemTime <= endTime;
            });
        }

        // 2. 서버 타입 필터
        if (serverTypeFilter && serverTypeFilter !== 'all') {
            filteredData = filteredData.filter(item => item.serverType === serverTypeFilter);
        }

        // 3. 위치 필터
        if (locationFilter && locationFilter !== 'all') {
            filteredData = filteredData.filter(item => item.location === locationFilter);
        }

        // 4. 경고 필터 (alertFilterValue는 select의 value값)
        if (alertFilterValue && alertFilterValue !== 'all') {
            const severities = ['Critical', 'Error', 'Warning', 'Info'];
            if (severities.includes(alertFilterValue)) { // 심각도로 필터링
                filteredData = filteredData.filter(item =>
                    item.alerts && item.alerts.some(alert => alert.severity === alertFilterValue)
                );
            } else { // 경고 타입 (CPU, Memory 등) 문자열로 필터링 (alertPool의 type 필드와 매칭)
                filteredData = filteredData.filter(item =>
                    item.alerts && item.alerts.some(alert => alert.type === alertFilterValue)
                );
            }
        }
        return filteredData;
    }

    // 서버별 경고 요약 (demo.html 테이블용)
    getAlertSummaryByServer(filteredData) {
        const serverSummary = {};

        this.allServerHostnames.forEach(hostname => {
             // 각 서버에 대한 기본 구조 초기화 (경고가 없더라도 모든 서버 표시 위함)
            const serverInfo = this.rawData.find(d => d.serverHostname === hostname); // 서버타입, 위치 등 정보 가져오기
            serverSummary[hostname] = {
                name: hostname,
                type: serverInfo ? serverInfo.serverType : 'N/A',
                location: serverInfo ? serverInfo.location : 'N/A',
                totalAlertPoints: 0, // 경고가 발생한 데이터 포인트 수
                criticalCount: 0,    // Critical 경고 총 개수
                errorCount: 0,
                warningCount: 0,
                infoCount: 0,
                distinctAlertMessages: new Set(), // 발생한 고유 경고 메시지 (요약용)
                mainIssueMessage: "정상",
                highestSeverityCode: 0, // Normal:0, Info:1, Warning:2, Error:3, Critical:4
                lastStatus: 'Normal' // 가장 최근 상태
            };
        });


        filteredData.forEach(item => {
            if (!serverSummary[item.serverHostname]) return; // 혹시 모를 경우 대비

            // 가장 최근 상태 업데이트
            if (new Date(item.timestamp) >= new Date(serverSummary[item.serverHostname].lastTimestamp || 0)) {
                serverSummary[item.serverHostname].lastStatus = item.status;
                serverSummary[item.serverHostname].lastTimestamp = item.timestamp;
            }


            if (item.alerts && item.alerts.length > 0) {
                serverSummary[item.serverHostname].totalAlertPoints++;
                item.alerts.forEach(alert => {
                    let currentSeverityCode = 0;
                    if (alert.severity === 'Critical') {
                        serverSummary[item.serverHostname].criticalCount++;
                        currentSeverityCode = 4;
                    } else if (alert.severity === 'Error') {
                        serverSummary[item.serverHostname].errorCount++;
                        currentSeverityCode = 3;
                    } else if (alert.severity === 'Warning') {
                        serverSummary[item.serverHostname].warningCount++;
                        currentSeverityCode = 2;
                    } else if (alert.severity === 'Info') {
                        serverSummary[item.serverHostname].infoCount++;
                        currentSeverityCode = 1;
                    }
                    serverSummary[item.serverHostname].distinctAlertMessages.add(alert.message);

                    if (currentSeverityCode > serverSummary[item.serverHostname].highestSeverityCode) {
                        serverSummary[item.serverHostname].highestSeverityCode = currentSeverityCode;
                        serverSummary[item.serverHostname].mainIssueMessage = `${alert.type}: ${alert.message.substring(0, 35)}${alert.message.length > 35 ? '...' : ''}`;
                    } else if (currentSeverityCode === serverSummary[item.serverHostname].highestSeverityCode && serverSummary[item.serverHostname].mainIssueMessage === "정상") {
                        serverSummary[item.serverHostname].mainIssueMessage = `${alert.type}: ${alert.message.substring(0, 35)}${alert.message.length > 35 ? '...' : ''}`;
                    }
                });
            }
        });
        
        // "정상" 상태인 서버의 mainIssueMessage가 "정상"으로 유지되도록.
        Object.values(serverSummary).forEach(summary => {
            if(summary.highestSeverityCode === 0) {
                 summary.mainIssueMessage = summary.lastStatus === 'Normal' ? '정상' : summary.lastStatus;
            }
        });


        return Object.values(serverSummary)
            .sort((a, b) => {
                if (b.highestSeverityCode !== a.highestSeverityCode) return b.highestSeverityCode - a.highestSeverityCode;
                if (b.criticalCount !== a.criticalCount) return b.criticalCount - a.criticalCount;
                if (b.errorCount !== a.errorCount) return b.errorCount - a.errorCount;
                if (b.warningCount !== a.warningCount) return b.warningCount - a.warningCount;
                return b.totalAlertPoints - a.totalAlertPoints;
            });
    }

    // ---- summary.js 및 cpu-analysis.html 에서 사용할 수 있는 추가 헬퍼 메소드들 ----

    // 고유 서버 타입 목록
    getUniqueServerTypes() {
        return [...new Set(this.rawData.map(item => item.serverType))].sort();
    }

    // 고유 위치 목록
    getUniqueLocations() {
        return [...new Set(this.rawData.map(item => item.location))].sort();
    }

    // 고유 경고 타입 목록 (alertPool의 type과 일치)
    getUniqueAlertTypes() {
        const alertTypes = new Set();
        this.rawData.forEach(item => {
            item.alerts.forEach(alert => alertTypes.add(alert.type));
        });
        return [...alertTypes].sort();
    }
    
    // (이하 summary.js, cpu-analysis.html 등에서 사용하던 메소드들을 새 데이터 구조에 맞게 수정)
    // 예: getHourlySystemStatus, getServerCountByStatus, getServersByType, getAverageCpuUsageByServer 등
    // getCurrentStatusSummary 등... (이전 답변의 data_processor.js 내용 참고하여 새 데이터 구조에 맞게 수정)
}

// 브라우저 환경에서 전역 객체로 등록
if (typeof window !== 'undefined') {
    window.ServerDataProcessor = ServerDataProcessor;
}
