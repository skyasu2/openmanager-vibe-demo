// data_processor.js (수정 예시)

class ServerDataProcessor {
  constructor(data) {
    this.rawData = data; // 이제 getFixedDummyData()의 결과가 들어옴
    // this.serverNames = this.getUniqueServers(); // serverHostname 기준으로 변경
    // this.timeRange = this.getTimeRange(); // timestamp 필드는 동일
  }

  // 모든 고유 서버 호스트네임 가져오기
  getUniqueServers() {
    return [...new Set(this.rawData.map(item => item.serverHostname))];
  }

  // 데이터의 시간 범위 가져오기
  getTimeRange() {
    const timestamps = this.rawData.map(item => new Date(item.timestamp));
    return {
      start: new Date(Math.min(...timestamps)),
      end: new Date(Math.max(...timestamps))
    };
  }

  // 지정된 시간 범위 내의 데이터만 필터링
  filterByTimeRange(hours = 24) {
    // ... (기존 로직 유지 가능, this.timeRange.end가 정의되어야 함. 생성자에서 호출하거나, 데이터 로드 후 설정)
    // 또는 endTime을 현재 데이터의 최신 시간으로 설정
    if (this.rawData.length === 0) return [];
    const allTimestamps = this.rawData.map(item => new Date(item.timestamp).getTime());
    const maxTime = Math.max(...allTimestamps);
    const endTime = new Date(maxTime);

    const startTime = new Date(endTime);
    startTime.setHours(endTime.getHours() - hours);
    
    return this.rawData.filter(item => {
      const timestamp = new Date(item.timestamp);
      return timestamp >= startTime && timestamp <= endTime;
    });
  }

  // 특정 서버 타입으로 필터링
  filterByServerType(serverType) {
    if (serverType === 'all' || !serverType) return this.rawData;
    return this.rawData.filter(item => item.serverType && item.serverType.toLowerCase() === serverType.toLowerCase());
  }

  // 특정 경고 심각도(severity) 또는 메시지 내용으로 필터링 (수정 필요)
  filterByAlertType(alertFilter) { // alertFilter는 객체 {severity: 'critical', messageContent: 'CPU'} 또는 문자열
    if (alertFilter === 'all' || !alertFilter) {
        // 모든 종류의 '경고가 있는' 데이터를 반환하려면 alerts 배열이 비어있지 않은 것을 필터링
        return this.rawData.filter(item => item.alerts && item.alerts.length > 0);
    }
    // 예시: 심각도로만 필터링
    if (typeof alertFilter === 'string') { // 기존처럼 문자열로 경고 메시지 타입이 온다면
        return this.rawData.filter(item => 
            item.alerts && item.alerts.some(alert => alert.message.includes(alertFilter))
        );
    } else if (typeof alertFilter === 'object') {
        return this.rawData.filter(item => 
            item.alerts && item.alerts.some(alert => 
                (!alertFilter.severity || alert.severity === alertFilter.severity) &&
                (!alertFilter.messageContent || alert.message.includes(alertFilter.messageContent))
            )
        );
    }
    return this.rawData;
  }

  // 모든 필터 조합 적용 (필요시 filterByAlertType 인자 수정)
  applyFilters(timeRange = 24, serverType = 'all', alertType = 'all') {
    let filteredData = this.rawData; // 전체 데이터에서 시작
    
    // 시간 필터
    if (timeRange) { // timeRange가 주어졌을 때만 필터링
        const allTimestamps = filteredData.map(item => new Date(item.timestamp).getTime());
        const maxTime = Math.max(...allTimestamps);
        const endTime = new Date(maxTime);
        const startTime = new Date(endTime);
        startTime.setHours(endTime.getHours() - parseInt(timeRange));
        
        filteredData = filteredData.filter(item => {
          const timestamp = new Date(item.timestamp);
          return timestamp >= startTime && timestamp <= endTime;
        });
    }

    // 서버 타입 필터
    if (serverType !== 'all' && serverType) {
      filteredData = filteredData.filter(item => item.serverType && item.serverType.toLowerCase() === serverType.toLowerCase());
    }
    
    // 경고 필터 (위 filterByAlertType 참고하여 수정)
    if (alertType !== 'all' && alertType) {
      filteredData = filteredData.filter(item => 
          item.alerts && item.alerts.some(alert => alert.message.includes(alertType)) // 단순 메시지 포함으로 가정
      );
    }
    
    return filteredData;
  }
  
  // 서버별 경고 횟수 집계 (alerts 배열 구조에 맞게 수정)
  countAlertsByServer(filteredData) {
    const counts = {};
    
    filteredData.forEach(item => {
      if (item.alerts && item.alerts.length > 0) {
        if (!counts[item.serverHostname]) {
          counts[item.serverHostname] = { count: 0, mainIssues: [], serverType: item.serverType };
        }
        counts[item.serverHostname].count += item.alerts.length; // 각 경고를 카운트하거나, 경고가 있는 데이터포인트만 카운트할지 결정
        item.alerts.forEach(al => {
            if(!counts[item.serverHostname].mainIssues.includes(al.message.split(' ')[0])) { // 주요 이슈 메시지 (앞 단어)
                 counts[item.serverHostname].mainIssues.push(al.message.split(' ')[0]);
            }
        });
      }
    });
    
    return Object.entries(counts)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([serverHostname, data]) => ({ 
        name: serverHostname, 
        count: data.count,
        type: data.serverType,
        mainIssue: data.mainIssues.slice(0,2).join(', ') || '정보 확인 필요' // 상위 2개 이슈
      }));
  }

  // (중요) CPU 사용률 분석 등 stats 필드를 사용하는 메소드들 수정
  // 예: item.metrics.cpu -> item.stats.cpuUsage
  analyzeServerCpu(filteredData) {
    const cpuData = {};
    filteredData.forEach(item => {
      if (!cpuData[item.serverHostname]) {
        cpuData[item.serverHostname] = [];
      }
      if (item.stats && item.stats.cpuUsage !== undefined) {
        cpuData[item.serverHostname].push(item.stats.cpuUsage);
      }
    });

    const result = [];
    for (const [server, values] of Object.entries(cpuData)) {
      if (values.length > 0) {
        const avgCpu = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
        const maxCpu = Math.max(...values);
        // CPU 관련 경고만 필터링
        const cpuAlerts = filteredData.filter(item => 
          item.serverHostname === server && 
          item.alerts && item.alerts.some(al => al.message.toLowerCase().includes('cpu'))
        ).length;
        
        let status;
        if (avgCpu >= 90) status = '심각';
        else if (avgCpu >= 75) status = '주의';
        else status = '정상';
        
        result.push({
          serverHostname: server, // 필드명 일관성
          avgCpu,
          maxCpu,
          alertCount: cpuAlerts,
          status
        });
      }
    }
    return result.sort((a, b) => b.avgCpu - a.avgCpu);
  }

  // summarizeCpuAnalysis, getCpuUsageByHour, getCpuDistributionByServer 등 다른 메소드들도
  // item.server -> item.serverHostname
  // item.metrics.cpu -> item.stats.cpuUsage
  // item.alert (단일 문자열) -> item.alerts (객체 배열) 구조 변경에 맞춰 수정 필요합니다.
  // 예를 들어, CPU 경고는 item.alerts.some(alert => alert.message.includes('CPU')) 와 같이 확인해야 합니다.

  // 예시: 시간대별 시스템 상태 (평균 CPU, 메모리 등) - summary.js, cpu-analysis.html 등에서 사용
  getHourlySystemStatus(filteredData = this.rawData) {
    const hourlySummary = {};

    filteredData.forEach(item => {
        const timestamp = new Date(item.timestamp);
        // 시간까지만 포함 (YYYY-MM-DDTHH)
        const hourKey = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}T${String(timestamp.getHours()).padStart(2, '0')}:00:00`;

        if (!hourlySummary[hourKey]) {
            hourlySummary[hourKey] = {
                timestamp: hourKey, // 대표 타임스탬프
                totalCpu: 0,
                totalMemory: 0,
                count: 0,
            };
        }
        hourlySummary[hourKey].totalCpu += item.stats.cpuUsage;
        hourlySummary[hourKey].totalMemory += item.stats.memoryUsage;
        hourlySummary[hourKey].count++;
    });

    return Object.values(hourlySummary).map(summary => ({
        timestamp: summary.timestamp.replace('T', ' '), // "YYYY-MM-DD HH:00:00" 형태로
        avgCpu: parseFloat((summary.totalCpu / summary.count).toFixed(1)),
        avgMemory: parseFloat((summary.totalMemory / summary.count).toFixed(1)),
    })).sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  // 서버 상태별 카운트 (Normal, Warning, Critical) - summary.js 에서 사용
  getServerCountByStatus(filteredData = this.rawData) {
    const statusCounts = { normal: 0, warning: 0, critical: 0 };
    // 가장 최근 시간대의 데이터만 사용하거나, 특정 시간 범위의 평균/최악 상태를 기준으로 해야 함
    // 여기서는 가장 최근 시간대의 각 서버 상태를 기준으로 집계
    const latestTimestamp = Math.max(...filteredData.map(d => new Date(d.timestamp).getTime()));
    const latestData = filteredData.filter(d => new Date(d.timestamp).getTime() === latestTimestamp);
    
    // 만약 latestData가 없다면 (filteredData가 비었거나 시간대가 다양하지 않다면)
    // 전체 서버의 가장 마지막 상태를 기준으로 하는 로직이 필요
    // 여기서는 우선 latestData 기준으로
    const serverLastStatus = {};
    filteredData.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)) // 최신순 정렬
        .forEach(d => {
            if(!serverLastStatus[d.serverHostname]) {
                serverLastStatus[d.serverHostname] = d.status;
            }
        });

    Object.values(serverLastStatus).forEach(status => {
        if (status === 'Critical') statusCounts.critical++;
        else if (status === 'Warning') statusCounts.warning++;
        else if (status === 'Normal') statusCounts.normal++;
    });
    return statusCounts;
  }

  // (추가) 서버 유형별 목록 - summary.js, cpu-analysis.html 등에서 사용
  getServersByType(filteredData = this.rawData) {
    const serversByType = {};
    filteredData.forEach(item => {
        if (!serversByType[item.serverType]) {
            serversByType[item.serverType] = new Set();
        }
        serversByType[item.serverType].add(item.serverHostname);
    });
    // Set을 Array로 변환
    for (const type in serversByType) {
        serversByType[type] = Array.from(serversByType[type]);
    }
    return serversByType;
  }

  // (추가) 알림 유형(메시지 기반)별 카운트 - summary.js 에서 사용
  getAlertCountByType(filteredData = this.rawData) {
    const alertCounts = {};
    filteredData.forEach(item => {
        item.alerts.forEach(alert => {
            // 메시지에서 주요 키워드 추출 (예: "CPU", "메모리")
            const alertTypeKeyword = alert.message.split(" ")[0]; // 단순 첫 단어 사용
            if (!alertCounts[alertTypeKeyword]) {
                alertCounts[alertTypeKeyword] = 0;
            }
            alertCounts[alertTypeKeyword]++;
        });
    });
    return alertCounts;
  }
    // (추가) 현재 상태 요약 (각 서버의 가장 마지막 상태) - summary.js, cpu-analysis.html 등에서 사용
    getCurrentStatusSummary(filteredData = this.rawData) {
        const serverStatus = {};
        // 각 서버의 가장 최신 데이터를 찾음
        const uniqueServers = [...new Set(filteredData.map(item => item.serverHostname))];
        uniqueServers.forEach(hostname => {
            const serverSpecificData = filteredData
                .filter(item => item.serverHostname === hostname)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // 최신순 정렬
            if (serverSpecificData.length > 0) {
                serverStatus[hostname] = serverSpecificData[0]; // 가장 최신 데이터
            }
        });
        return serverStatus;
    }
    // (추가) 위치별 상태 (데모 데이터에 위치 정보가 없으므로, 필요시 추가하거나 serverType 등으로 대체)
    getStatusByLocation(filteredData = this.rawData) {
        // 현재 fixed_dummy_data.js에는 location 필드가 없습니다.
        // 만약 location 필드를 추가한다면, 해당 필드를 기준으로 그룹화하고 평균 CPU 등을 계산할 수 있습니다.
        // 예시 (serverType을 location 대신 사용):
        const statusByServerType = {};
        const serversByType = this.getServersByType(filteredData);

        for (const type in serversByType) {
            let totalCpu = 0;
            let serverCount = 0;
            serversByType[type].forEach(hostname => {
                const latestServerData = this.getCurrentStatusSummary(filteredData)[hostname];
                if (latestServerData) {
                    totalCpu += latestServerData.stats.cpuUsage;
                    serverCount++;
                }
            });
            if (serverCount > 0) {
                statusByServerType[type] = {
                    avgCpu: parseFloat((totalCpu / serverCount).toFixed(1)),
                    serverCount: serverCount
                };
            }
        }
        return statusByServerType;
    }

    // (추가) 서버별 평균 CPU 사용률 - cpu-analysis.html 에서 사용
    getAverageCpuUsageByServer(filteredData = this.rawData) {
        const avgCpuByServer = {};
        const uniqueServers = [...new Set(filteredData.map(item => item.serverHostname))];

        uniqueServers.forEach(hostname => {
            const serverSpecificData = filteredData.filter(item => item.serverHostname === hostname);
            if (serverSpecificData.length > 0) {
                const totalCpu = serverSpecificData.reduce((sum, item) => sum + item.stats.cpuUsage, 0);
                avgCpuByServer[hostname] = parseFloat((totalCpu / serverSpecificData.length).toFixed(1));
            }
        });
        return avgCpuByServer;
    }

}

// 브라우저 환경에서는 전역 객체로 등록 (기존 코드 유지)
if (typeof window !== 'undefined') {
  window.ServerDataProcessor = ServerDataProcessor;
}
