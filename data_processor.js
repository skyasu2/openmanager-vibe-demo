// data_processor.js 의 countAlertsByServer 수정 예시
countAlertsByServer(filteredData) {
    const serverSummary = {};

    filteredData.forEach(item => {
        if (!serverSummary[item.serverHostname]) {
            serverSummary[item.serverHostname] = {
                name: item.serverHostname,
                type: item.serverType,
                location: item.location,
                totalAlerts: 0, // 해당 기간 동안 총 경고 발생 건수 (데이터 포인트 기준 아님)
                criticalCount: 0,
                warningCount: 0,
                errorCount: 0,
                infoCount: 0,
                distinctAlertTypes: new Set(), // 발생한 고유 경고 타입
                // 가장 심각도가 높거나 최근의 주요 경고 메시지를 저장할 수 있음
                mainIssueMessage: "정상 또는 정보 확인 필요",
                highestSeverityCode: 0, // 정렬 및 표시에 사용 (Normal:0, Info:1, Warning:2, Error:3, Critical:4)
            };
        }

        if (item.alerts && item.alerts.length > 0) {
            serverSummary[item.serverHostname].totalAlerts += item.alerts.length;
            item.alerts.forEach(alert => {
                serverSummary[item.serverHostname].distinctAlertTypes.add(alert.type);
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

                // 가장 높은 심각도의 경고 메시지를 mainIssueMessage 로 설정 (간단한 예)
                if (currentSeverityCode > serverSummary[item.serverHostname].highestSeverityCode) {
                    serverSummary[item.serverHostname].highestSeverityCode = currentSeverityCode;
                    serverSummary[item.serverHostname].mainIssueMessage = `${alert.type}: ${alert.message.substring(0, 30)}...`; // 메시지 일부
                } else if (currentSeverityCode === serverSummary[item.serverHostname].highestSeverityCode && serverSummary[item.serverHostname].mainIssueMessage === "정상 또는 정보 확인 필요") {
                     serverSummary[item.serverHostname].mainIssueMessage = `${alert.type}: ${alert.message.substring(0, 30)}...`;
                }
            });
        }
    });

    // Object.values로 변환 후 정렬 (예: Critical 많은 순, 그 다음 Warning 많은 순)
    return Object.values(serverSummary)
        .sort((a, b) => {
            if (b.highestSeverityCode !== a.highestSeverityCode) return b.highestSeverityCode - a.highestSeverityCode;
            if (b.criticalCount !== a.criticalCount) return b.criticalCount - a.criticalCount;
            if (b.errorCount !== a.errorCount) return b.errorCount - a.errorCount;
            if (b.warningCount !== a.warningCount) return b.warningCount - a.warningCount;
            return b.totalAlerts - a.totalAlerts;
        });
}
