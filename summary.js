// summary.js
// 요약: mock_data_100servers.json을 읽어서 서버별 경고 수를 집계하고 TOP5를 HTML로 렌더링

async function loadAndSummarize() {
  try {
    const response = await fetch('mock_data_100servers.json');
    const data = await response.json();

    const summaryMap = {};
    for (const entry of data) {
      const { server, alert } = entry;
      if (!summaryMap[server]) {
        summaryMap[server] = { count: 0, reasons: new Set() };
      }
      summaryMap[server].count += 1;
      summaryMap[server].reasons.add(alert);
    }

    const sorted = Object.entries(summaryMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    const tableBody = document.getElementById('summary-body');
    tableBody.innerHTML = '';
    sorted.forEach(([server, info], index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${server}</td>
        <td>${info.count}</td>
        <td>${Array.from(info.reasons).join(', ')}</td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error('데이터 로딩 실패:', err);
  }
}

window.onload = loadAndSummarize;
