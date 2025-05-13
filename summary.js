fetch('mock_data.json')
  .then(response => response.json())
  .then(data => {
    const count = {};
    data.forEach(log => {
      count[log.host] = (count[log.host] || 0) + 1;
    });
    const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
    const top5 = sorted.slice(0, 5);
    document.getElementById('output').innerHTML =
      '<h3>경고 상위 서버 TOP5</h3><ul>' +
      top5.map(([host, cnt]) => `<li>${host}: ${cnt}건</li>`).join('') +
      '</ul>';
  });