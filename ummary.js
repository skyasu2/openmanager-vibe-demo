// summary.js - 서버 데이터 요약 및 대시보드 기능

// 데이터 로드 및 처리
let serverData = null;
let dataProcessor = null;

// 차트 객체 참조
let statusChart = null;
let cpuTrendChart = null;
let alertsByTypeChart = null;
let serverDistributionChart = null;

// 초기화 함수
async function initDashboard() {
    try {
        // 더미 데이터 로드
        dataProcessor = await loadServerData('mock_data_100servers.json');
        if (!dataProcessor) {
            showError("서버 데이터를 로드할 수 없습니다.");
            return;
        }
        
        // 상태 요약 업데이트
        updateStatusSummary();
        
        // 서버 목록 업데이트
        updateServerList();
        
        // 차트 초기화
        initCharts();
        
        // 최근 알림 표시
        displayRecentAlerts();
        
        // 자동 새로고침 설정
        setupAutoRefresh();
        
        // 이벤트 리스너 설정
        setupEventListeners();
        
        // 로딩 인디케이터 숨기기
        hideLoading();
        
        console.log("대시보드가 성공적으로 초기화되었습니다.");
    } catch (error) {
        console.error("대시보드 초기화 중 오류 발생:", error);
        showError("대시보드를 초기화하는 중 오류가 발생했습니다.");
    }
}

// 상태 요약 업데이트
function updateStatusSummary() {
    if (!dataProcessor) return;
    
    // 서버 상태 카운트 가져오기
    const statusCounts = dataProcessor.getServerCountByStatus();
    
    // 총 서버 수
    const totalServers = statusCounts.normal + statusCounts.warning + statusCounts.critical;
    
    // DOM 업데이트
    document.getElementById('totalServers').textContent = totalServers;
    document.getElementById('normalServers').textContent = statusCounts.normal;
    document.getElementById('warningServers').textContent = statusCounts.warning;
    document.getElementById('criticalServers').textContent = statusCounts.critical;
    
    // 정상 서버 비율 계산 및 표시
    const healthyPercent = totalServers > 0 ? Math.round((statusCounts.normal / totalServers) * 100) : 0;
    document.getElementById('healthyPercent').textContent = `${healthyPercent}%`;
    
    // 상태 표시기 색상 업데이트
    updateStatusIndicator(statusCounts);
    
    // 총 알림 수 계산 및 표시
    const alertCount = dataProcessor.rawData.reduce((count, record) => count + record.alerts.length, 0);
    document.getElementById('totalAlerts').textContent = alertCount;
}

// 상태 표시기 업데이트
function updateStatusIndicator(statusCounts) {
    const indicator = document.getElementById('systemStatusIndicator');
    const statusText = document.getElementById('systemStatusText');
    
    // 상태 결정
    if (statusCounts.critical > 0) {
        indicator.className = 'status-indicator critical';
        statusText.textContent = '심각';
    } else if (statusCounts.warning > 0) {
        indicator.className = 'status-indicator warning';
        statusText.textContent = '주의';
    } else {
        indicator.className = 'status-indicator normal';
        statusText.textContent = '정상';
    }
}

// 서버 목록 업데이트
function updateServerList() {
    if (!dataProcessor) return;
    
    const serverListElement = document.getElementById('serverList');
    if (!serverListElement) return;
    
    // 테이블 비우기
    serverListElement.innerHTML = '';
    
    // 현재 상태 요약 가져오기
    const currentStatus = dataProcessor.getCurrentStatusSummary();
    
    // 서버별로 상태 확인 및 추가
    Object.values(currentStatus)
        .sort((a, b) => {
            // 심각한 상태의 서버를 먼저 표시
            const aHasCritical = a.alerts.some(alert => alert.severity === 'critical');
            const bHasCritical = b.alerts.some(alert => alert.severity === 'critical');
            
            if (aHasCritical && !bHasCritical) return -1;
            if (!aHasCritical && bHasCritical) return 1;
            
            // 다음으로 경고 상태의 서버
            const aHasWarning = a.alerts.some(alert => alert.severity === 'warning');
            const bHasWarning = b.alerts.some(alert => alert.severity === 'warning');
            
            if (aHasWarning && !bHasWarning) return -1;
            if (!aHasWarning && bHasWarning) return 1;
            
            // 서버 이름으로 정렬
            return a.serverName.localeCompare(b.serverName);
        })
        .slice(0, 10) // 상위 10개만 표시
        .forEach(server => {
            const row = document.createElement('tr');
            
            // 상태에 따른 행 스타일
            if (server.alerts.some(alert => alert.severity === 'critical')) {
                row.className = 'critical';
            } else if (server.alerts.some(alert => alert.severity === 'warning')) {
                row.className = 'warning';
            }
            
            // 시간 포맷팅
            const timestamp = new Date(server.timestamp);
            const formattedTime = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')} ${String(timestamp.getHours()).padStart(2, '0')}:${String(timestamp.getMinutes()).padStart(2, '0')}`;
            
            // 행 내용 생성
            row.innerHTML = `
                <td><span class="server-status ${getServerStatusClass(server)}"></span> ${server.serverName}</td>
                <td>${server.serverType}</td>
                <td>${server.location}</td>
                <td>${server.stats.cpuUsage.toFixed(1)}%</td>
                <td>${server.stats.memoryUsage.toFixed(1)}%</td>
                <td>${formattedTime}</td>
                <td>${formatAlertCount(server.alerts)}</td>
            `;
            
            serverListElement.appendChild(row);
        });
}

// 서버 상태 클래스 가져오기
function getServerStatusClass(server) {
    if (server.alerts.some(alert => alert.severity === 'critical')) {
        return 'critical';
    } else if (server.alerts.some(alert => alert.severity === 'warning')) {
        return 'warning';
    } else {
        return 'normal';
    }
}

// 알림 수 포맷팅
function formatAlertCount(alerts) {
    if (alerts.length === 0) return '-';
    
    const criticalCount = alerts.filter(alert => alert.severity === 'critical').length;
    const warningCount = alerts.filter(alert => alert.severity === 'warning').length;
    
    if (criticalCount > 0) {
        return `<span class="badge critical">${criticalCount}</span>`;
    } else if (warningCount > 0) {
        return `<span class="badge warning">${warningCount}</span>`;
    } else {
        return `<span class="badge info">${alerts.length}</span>`;
    }
}

// 차트 초기화
function initCharts() {
    if (!dataProcessor) return;
    
    // 상태 차트 초기화
    initStatusChart();
    
    // CPU 추세 차트 초기화
    initCpuTrendChart();
    
    // 알림 유형별 차트 초기화
    initAlertsByTypeChart();
    
    // 서버 분포 차트 초기화
    initServerDistributionChart();
}

// 상태 차트 초기화
function initStatusChart() {
    const statusCounts = dataProcessor.getServerCountByStatus();
    const ctx = document.getElementById('statusChart').getContext('2d');
    
    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['정상', '주의', '심각'],
            datasets: [{
                data: [statusCounts.normal, statusCounts.warning, statusCounts.critical],
                backgroundColor: ['#2ecc71', '#f39c12', '#e74c3c'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value}대 (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// CPU 추세 차트 초기화
function initCpuTrendChart() {
    const hourlyData = dataProcessor.getHourlySystemStatus();
    const ctx = document.getElementById('cpuTrendChart').getContext('2d');
    
    // 데이터 준비 (최근 24시간)
    const recentData = hourlyData.slice(-24);
    const labels = recentData.map(hour => hour.timestamp.split(' ')[1]); // 시간만 표시
    const cpuData = recentData.map(hour => hour.avgCpu);
    const memoryData = recentData.map(hour => hour.avgMemory);
    
    cpuTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'CPU',
                    data: cpuData,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: '메모리',
                    data: memoryData,
                    borderColor: '#9b59b6',
                    backgroundColor: 'rgba(155, 89, 182, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: '사용률 (%)'
                    },
                    grid: {
                        display: true,
                        drawBorder: false
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// 알림 유형별 차트 초기화
function initAlertsByTypeChart() {
    const alertCounts = dataProcessor.getAlertCountByType();
    const ctx = document.getElementById('alertsByTypeChart').getContext('2d');
    
    // 데이터 준비
    const labels = Object.keys(alertCounts);
    const data = Object.values(alertCounts);
    
    // 색상 배열
    const colors = [
        '#3498db', '#2ecc71', '#9b59b6', '#e74c3c', 
        '#f39c12', '#1abc9c', '#34495e', '#d35400'
    ];
    
    alertsByTypeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '알림 수',
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '알림 수'
                    },
                    grid: {
                        display: true,
                        drawBorder: false
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// 서버 분포 차트 초기화
function initServerDistributionChart() {
    const serversByType = dataProcessor.getServersByType();
    const ctx = document.getElementById('serverDistributionChart').getContext('2d');
    
    // 데이터 준비
    const labels = Object.keys(serversByType);
    const data = labels.map(type => serversByType[type].length);
    
    // 색상 배열
    const colors = [
        '#3498db', '#2ecc71', '#9b59b6', '#e74c3c', 
        '#f39c12', '#1abc9c', '#34495e', '#d35400'
    ];
    
    serverDistributionChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value}대 (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 최근 알림 표시
function displayRecentAlerts() {
    if (!dataProcessor) return;
    
    const alertsContainer = document.getElementById('recentAlerts');
    if (!alertsContainer) return;
    
    // 알림 컨테이너 비우기
    alertsContainer.innerHTML = '';
    
    // 알림 있는 레코드 가져오기
    const alertRecords = dataProcessor.rawData
        .filter(record => record.alerts.length > 0)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // 알림 없는 경우
    if (alertRecords.length === 0) {
        alertsContainer.innerHTML = '<div class="no-alerts">표시할 알림이 없습니다.</div>';
        return;
    }
    
    // 최근 15개 알림 표시
    let alertCount = 0;
    
    for (const record of alertRecords) {
        for (const alert of record.alerts) {
            const alertTime = new Date(record.timestamp);
            const timeString = `${alertTime.getHours().toString().padStart(2, '0')}:${alertTime.getMinutes().toString().padStart(2, '0')}`;
            
            // 알림 심각도에 따른 클래스
            const severityClass = alert.severity === 'critical' ? 'critical' : 
                                alert.severity === 'warning' ? 'warning' : 'info';
            
            // 알림 아이템 생성
            const alertItem = document.createElement('div');
            alertItem.className = `alert-item ${severityClass}`;
            alertItem.innerHTML = `
                <div class="alert-time">${timeString}</div>
                <div class="alert-badge">${alert.severity === 'critical' ? '심각' : alert.severity === 'warning' ? '주의' : '정보'}</div>
                <div class="alert-content">
                    <div class="alert-server">${record.serverName} (${record.serverType})</div>
                    <div class="alert-message">${alert.message}</div>
                </div>
            `;
            
            alertsContainer.appendChild(alertItem);
            
            alertCount++;
            if (alertCount >= 15) break;
        }
        
        if (alertCount >= 15) break;
    }
}

// 자동 새로고침 설정
function setupAutoRefresh() {
    // 실제 환경에서는 서버에서 데이터를 주기적으로 가져와야 함
    // 데모에서는 단순히 화면을 업데이트하는 용도로만 사용
    
    setInterval(() => {
        if (Math.random() < 0.2) { // 20% 확률로 데이터 업데이트 시뮬레이션
            console.log("자동 새로고침: 대시보드 업데이트");
            updateDashboard();
        }
    }, 60000); // 1분마다 확인
}

// 대시보드 업데이트
function updateDashboard() {
    updateStatusSummary();
    updateServerList();
    displayRecentAlerts();
    
    // 차트 업데이트가 필요하면 개별 차트 업데이트
    if (statusChart) {
        updateStatusChart();
    }
    
    if (cpuTrendChart) {
        updateCpuTrendChart();
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 새로고침 버튼
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            showLoading();
            
            // 실제로는 서버에서 새로운 데이터를 가져와야 함
            // 데모에서는 시간 지연 후 화면 업데이트로 시뮬레이션
            setTimeout(() => {
                updateDashboard();
                hideLoading();
            }, 500);
        });
    }
    
    // 타임라인 범위 변경
    const timeRangeSelect = document.getElementById('timeRange');
    if (timeRangeSelect) {
        timeRangeSelect.addEventListener('change', () => {
            // 실제로는 서버에서 새로운 데이터를 가져와야 함
            alert('타임라인 범위가 변경되었습니다. (데모 기능)');
        });
    }
}

// 로딩 인디케이터 표시
function showLoading() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
}

// 로딩 인디케이터 숨기기
function hideLoading() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

// 오류 메시지 표시
function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    } else {
        alert(`오류: ${message}`);
    }
}

// 상태 차트 업데이트
function updateStatusChart() {
    if (!statusChart || !dataProcessor) return;
    
    const statusCounts = dataProcessor.getServerCountByStatus();
    
    statusChart.data.datasets[0].data = [
        statusCounts.normal,
        statusCounts.warning,
        statusCounts.critical
    ];
    
    statusChart.update();
}

// CPU 추세 차트 업데이트
function updateCpuTrendChart() {
    if (!cpuTrendChart || !dataProcessor) return;
    
    const hourlyData = dataProcessor.getHourlySystemStatus();
    const recentData = hourlyData.slice(-24);
    
    cpuTrendChart.data.labels = recentData.map(hour => hour.timestamp.split(' ')[1]);
    cpuTrendChart.data.datasets[0].data = recentData.map(hour => hour.avgCpu);
    cpuTrendChart.data.datasets[1].data = recentData.map(hour => hour.avgMemory);
    
    cpuTrendChart.update();
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', initDashboard);
