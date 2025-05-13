// data_processor.js
// 더미 데이터를 로드하고 분석하는 JavaScript 모듈

class ServerDataProcessor {
  constructor(data) {
    this.rawData = data;
    this.serverNames = this.getUniqueServers();
    this.timeRange = this.getTimeRange();
  }
  
  // 모든 고유 서버 이름 가져오기
  getUniqueServers() {
    return [...new Set(this.rawData.map(item => item.server))];
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
    const endTime = new Date(this.timeRange.end);
    const startTime = new Date(endTime);
    startTime.setHours(endTime.getHours() - hours);
    
    return this.rawData.filter(item => {
      const timestamp = new Date(item.timestamp);
      return timestamp >= startTime && timestamp <= endTime;
    });
  }
  
  // 특정 서버 타입으로 필터링 (db, app, web 등)
  filterByServerType(serverType) {
    if (serverType === 'all') return this.rawData;
    
    return this.rawData.filter(item => item.server.startsWith(serverType));
  }
  
  // 특정 경고 유형으로 필터링
  filterByAlertType(alertType) {
    if (alertType === 'all') return this.rawData.filter(item => item.alert); // 모든 경고
    
    return this.rawData.filter(item => item.alert === alertType);
  }
  
  // 모든 필터 조합 적용
  applyFilters(timeRange = 24, serverType = 'all', alertType = 'all') {
    let filteredData = this.filterByTimeRange(timeRange);
    
    if (serverType !== 'all') {
      filteredData = filteredData.filter(item => item.server.startsWith(serverType));
    }
    
    if (alertType !== 'all') {
      filteredData = filteredData.filter(item => item.alert === alertType);
    }
    
    return filteredData;
  }
  
  // 서버별 경고 횟수 집계
  countAlertsByServer(filteredData) {
    const counts = {};
    
    filteredData.forEach(item => {
      if (item.alert) { // 경고가 있는 항목만 집계
        if (!counts[item.server]) {
          counts[item.server] = 0;
        }
        counts[item.server]++;
      }
    });
    
    // 경고 횟수별로 내림차순 정렬
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([server, count]) => ({ 
        name: server, 
        count: count,
        // 서버 유형 추출
        type: server.replace(/[0-9]/g, ''),
        // 주요 경고 유형 찾기
        mainIssue: this.getMainIssueForServer(server, filteredData)
      }));
  }
  
  // 특정 서버의 주요 경고 유형 찾기
  getMainIssueForServer(serverName, filteredData) {
    const alerts = filteredData
      .filter(item => item.server === serverName && item.alert)
      .map(item => item.alert);
    
    // 가장 많이 발생한 경고 유형 찾기
    const alertCounts = {};
    alerts.forEach(alert => {
      if (!alertCounts[alert]) alertCounts[alert] = 0;
      alertCounts[alert]++;
    });
    
    if (Object.keys(alertCounts).length === 0) return '정상';
    
    return Object.entries(alertCounts)
      .sort((a, b) => b[1] - a[1])[0][0]; // 가장 많은 경고 유형
  }
  
  // CPU 사용률 분석
  analyzeServerCpu(filteredData) {
    // 서버별 CPU 사용률 데이터 추출
    const cpuData = {};
    
    filteredData.forEach(item => {
      if (!cpuData[item.server]) {
        cpuData[item.server] = [];
      }
      if (item.metrics && item.metrics.cpu !== undefined) {
        cpuData[item.server].push(item.metrics.cpu);
      }
    });
    
    // 서버별 평균 및 최대 CPU 사용률 계산
    const result = [];
    for (const [server, values] of Object.entries(cpuData)) {
      if (values.length > 0) {
        const avgCpu = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
        const maxCpu = Math.max(...values);
        const cpuAlerts = filteredData.filter(item => 
          item.server === server && item.alert === 'CPU 사용률'
        ).length;
        
        // CPU 상태 판단
        let status;
        if (avgCpu >= 90) status = '심각';
        else if (avgCpu >= 75) status = '주의';
        else status = '정상';
        
        result.push({
          server,
          avgCpu,
          maxCpu,
          alertCount: cpuAlerts,
          status
        });
      }
    }
    
    // 평균 CPU 사용률 기준 내림차순 정렬
    return result.sort((a, b) => b.avgCpu - a.avgCpu);
  }
  
  // 전체 CPU 사용률 분석 요약
  summarizeCpuAnalysis(filteredData, previousPeriodData = []) {
    const cpuAlerts = filteredData.filter(item => item.alert === 'CPU 사용률');
    const totalAlerts = filteredData.filter(item => item.alert);
    
    // 모든 CPU 측정값 추출
    const allCpuValues = filteredData
      .filter(item => item.metrics && item.metrics.cpu !== undefined)
      .map(item => item.metrics.cpu);
    
    // 서버별 CPU 경고 횟수
    const serverCpuAlerts = {};
    cpuAlerts.forEach(item => {
      if (!serverCpuAlerts[item.server]) serverCpuAlerts[item.server] = 0;
      serverCpuAlerts[item.server]++;
    });
    
    // 가장 많은 CPU 경고가 발생한 서버
    let topServer = { name: 'none', count: 0 };
    for (const [server, count] of Object.entries(serverCpuAlerts)) {
      if (count > topServer.count) {
        topServer = { name: server, count };
      }
    }
    
    // 이전 기간 데이터와 비교 (증감률 계산)
    const prevCpuAlerts = previousPeriodData.filter(item => item.alert === 'CPU 사용률');
    const prevTotalAlerts = previousPeriodData.filter(item => item.alert);
    const prevCpuValues = previousPeriodData
      .filter(item => item.metrics && item.metrics.cpu !== undefined)
      .map(item => item.metrics.cpu);
    
    // 증감률 계산 함수
    const calculateIncrease = (current, previous) => {
      if (previous === 0) return 100; // 이전이 0이면 100% 증가
      return Math.round((current - previous) / previous * 100);
    };
    
    // 평균값 계산 함수
    const calculateAverage = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    
    const avgCpu = calculateAverage(allCpuValues);
    const prevAvgCpu = calculateAverage(prevCpuValues);
    
    return {
      alertCount: cpuAlerts.length,
      percentage: totalAlerts.length ? Math.round((cpuAlerts.length / totalAlerts.length) * 100) : 0,
      topServer: topServer.name,
      topServerCount: topServer.count,
      avgCpu: avgCpu,
      // 증감률 계산
      increases: {
        alertCount: calculateIncrease(cpuAlerts.length, prevCpuAlerts.length),
        percentage: calculateIncrease(
          (cpuAlerts.length / totalAlerts.length) || 0, 
          (prevCpuAlerts.length / prevTotalAlerts.length) || 0
        ),
        avgCpu: calculateIncrease(avgCpu, prevAvgCpu)
      }
    };
  }
  
  // 시간대별 CPU 사용률 추이 데이터 생성
  getCpuUsageByHour(filteredData, serverName = null) {
    // 시간별 데이터 포인트 준비
    const hourlyData = {};
    
    filteredData.forEach(item => {
      if (serverName && item.server !== serverName) return;
      if (!item.metrics || item.metrics.cpu === undefined) return;
      
      const timestamp = new Date(item.timestamp);
      const hourKey = timestamp.toISOString().slice(0, 13); // YYYY-MM-DDTHH 형식
      
      if (!hourlyData[hourKey]) {
        hourlyData[hourKey] = [];
      }
      
      hourlyData[hourKey].push(item.metrics.cpu);
    });
    
    // 각 시간대별 평균 CPU 사용률 계산
    const result = [];
    for (const [hour, values] of Object.entries(hourlyData)) {
      result.push({
        hour: new Date(hour),
        avgCpu: Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      });
    }
    
    // 시간 순으로 정렬
    return result.sort((a, b) => a.hour - b.hour);
  }
  
  // 서버별 CPU 사용률 분포 데이터 생성
  getCpuDistributionByServer(filteredData, limit = 10) {
    // 서버별 CPU 사용률 추출
    const serverCpuData = {};
    
    filteredData.forEach(item => {
      if (!item.metrics || item.metrics.cpu === undefined) return;
      
      if (!serverCpuData[item.server]) {
        serverCpuData[item.server] = [];
      }
      
      serverCpuData[item.server].push(item.metrics.cpu);
    });
    
    // 서버별 평균 CPU 사용률 계산
    const result = [];
    for (const [server, values] of Object.entries(serverCpuData)) {
      if (values.length > 0) {
        result.push({
          server,
          avgCpu: Math.round(values.reduce((a, b) => a + b, 0) / values.length)
        });
      }
    }
    
    // 평균 CPU 사용률 기준 상위 N개 서버 반환
    return result.sort((a, b) => b.avgCpu - a.avgCpu).slice(0, limit);
  }
}

// 모듈로 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ServerDataProcessor;
} else if (typeof window !== 'undefined') {
  // 브라우저 환경에서는 전역 객체로 등록
  window.ServerDataProcessor = ServerDataProcessor;
}
