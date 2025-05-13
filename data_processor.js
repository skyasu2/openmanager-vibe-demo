// data_processor.js

class ServerDataProcessor {
    constructor(data) {
        this.rawData = data || []; // 데이터가 없을 경우 빈 배열로 초기화
        this.allServerHostnames = this.rawData.length > 0 ? [...new Set(this.rawData.map(item => item.serverHostname))] : [];
    }

    applyFilters(timeRangeHours = 24, serverTypeFilter = 'all', alertFilterValue = 'all', locationFilter = 'all') {
        let filteredData = this.rawData;

        if (filteredData.length === 0) return [];

        if (timeRangeHours && Number.isInteger(parseInt(timeRangeHours))) {
            const endTime = new Date(Math.max(...filteredData.map(d => new Date(d.timestamp).getTime())));
            const startTime = new Date(endTime);
            startTime.setHours(endTime.getHours() - parseInt(timeRangeHours));
            filteredData = filteredData.filter(item => {
                const itemTime = new Date(item.timestamp);
                return itemTime >= startTime && itemTime <= endTime;
            });
        }

        if (serverTypeFilter && serverTypeFilter !== 'all') {
            filteredData = filteredData.filter(item => item.serverType === serverTypeFilter);
        }

        if (locationFilter && locationFilter !== 'all') {
            filteredData = filteredData.filter(item => item.location === locationFilter);
        }

        if (alertFilterValue && alertFilterValue !== 'all') {
            const severities = ['Critical', 'Error', 'Warning', 'Info'];
            if (severities.includes(alertFilterValue)) {
                filteredData = filteredData.filter(item =>
                    item.alerts && item.alerts.some(alert => alert.severity === alertFilterValue)
                );
            } else { 
                filteredData = filteredData.filter(item =>
                    item.alerts && item.alerts.some(alert => alert.type === alertFilterValue)
                );
            }
        }
        return filteredData;
    }

    getTopNServersByResource(filteredData, resourceType, N = 5) {
        if (!filteredData || filteredData.length === 0) return [];

        const serverResourceUsage = {};
        const uniqueServersInFilteredData = [...new Set(filteredData.map(item => item.serverHostname))];


        uniqueServersInFilteredData.forEach(hostname => {
            const serverDataPoints = filteredData.filter(item => item.serverHostname === hostname);
            if (serverDataPoints.length > 0) {
                let totalUsage = 0;
                serverDataPoints.forEach(item => {
                    switch (resourceType) {
                        case 'cpu': totalUsage += item.stats.cpuUsage; break;
                        case 'memory': totalUsage += item.stats.memoryUsage; break;
                        case 'disk': totalUsage += item.stats.diskUsage; break;
                        case 'network': totalUsage += (item.stats.networkTrafficIn + item.stats.networkTrafficOut); break;
                        default: break;
                    }
                });
                
                const latestDataPoint = serverDataPoints.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
                let latestUsageValue;
                switch (resourceType) {
                    case 'cpu': latestUsageValue = latestDataPoint.stats.cpuUsage; break;
                    case 'memory': latestUsageValue = latestDataPoint.stats.memoryUsage; break;
                    case 'disk': latestUsageValue = latestDataPoint.stats.diskUsage; break;
                    case 'network': latestUsageValue = latestDataPoint.stats.networkTrafficOut + latestDataPoint.stats.networkTrafficIn; break; // In + Out
                    default: latestUsageValue = 0;
                }


                serverResourceUsage[hostname] = {
                    name: hostname,
                    type: serverDataPoints[0].serverType,
                    location: serverDataPoints[0].location,
                    avgUsage: parseFloat((totalUsage / serverDataPoints.length).toFixed(1)),
                    latestUsage: latestUsageValue,
                    unit: (resourceType === 'network' ? 'Mbps' : '%')
                };
            }
        });

        return Object.values(serverResourceUsage)
            .sort((a, b) => b.avgUsage - a.avgUsage)
            .slice(0, N);
    }

    getProblematicServersSummary(filteredData, N = 5) {
        if (!filteredData || filteredData.length === 0) return [];
        const serverProblemScore = {};
        const uniqueServersInFilteredData = [...new Set(filteredData.map(item => item.serverHostname))];

        uniqueServersInFilteredData.forEach(hostname => {
            const serverInfo = this.rawData.find(d => d.serverHostname === hostname);
            serverProblemScore[hostname] = {
                name: hostname,
                type: serverInfo ? serverInfo.serverType : 'N/A',
                location: serverInfo ? serverInfo.location : 'N/A',
                criticalAlertCount: 0,
                errorAlertCount: 0,
                warningAlertCount: 0, // Warning 카운트도 추가
                totalProblemDataPoints: 0,
                recentProblemMessages: new Set(),
                score: 0
            };
        });

        filteredData.forEach(item => {
            if (!serverProblemScore[item.serverHostname]) return;

            let pointHasProblem = false;
            if (item.status === 'Critical' || item.status === 'Error') {
                serverProblemScore[item.serverHostname].score += (item.status === 'Critical' ? 5 : 3);
                pointHasProblem = true;
            }


            item.alerts.forEach(alert => {
                let alertScoreContribution = 0;
                if (alert.severity === 'Critical') {
                    serverProblemScore[item.serverHostname].criticalAlertCount++;
                    alertScoreContribution = 2;
                } else if (alert.severity === 'Error') {
                    serverProblemScore[item.serverHostname].errorAlertCount++;
                    alertScoreContribution = 1.5;
                } else if (alert.severity === 'Warning') { // Warning도 점수에 약간 반영
                    serverProblemScore[item.serverHostname].warningAlertCount++;
                    alertScoreContribution = 0.5;
                }
                if(alertScoreContribution > 0) {
                    serverProblemScore[item.serverHostname].score += alertScoreContribution;
                    serverProblemScore[item.serverHostname].recentProblemMessages.add(`[${alert.severity}] ${alert.type}: ${alert.message}`);
                    pointHasProblem = true;
                }
            });
            if(pointHasProblem) serverProblemScore[item.serverHostname].totalProblemDataPoints++;
        });

        return Object.values(serverProblemScore)
            .filter(s => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, N)
            .map(s => ({
                ...s,
                recentProblemMessages: Array.from(s.recentProblemMessages).slice(0, 2).join(' | ')
            }));
    }
    
    getUniqueServerTypes() {
        return this.rawData.length > 0 ? [...new Set(this.rawData.map(item => item.serverType))].sort() : [];
    }

    getUniqueLocations() {
        return this.rawData.length > 0 ? [...new Set(this.rawData.map(item => item.location))].sort() : [];
    }

    getUniqueAlertTypes() {
        const alertTypes = new Set();
        if (this.rawData.length > 0) {
            this.rawData.forEach(item => {
                item.alerts.forEach(alert => alertTypes.add(alert.type));
            });
        }
        return [...alertTypes].sort();
    }
}

if (typeof window !== 'undefined') {
    window.ServerDataProcessor = ServerDataProcessor;
}
