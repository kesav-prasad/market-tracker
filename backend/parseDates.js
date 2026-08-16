const headers = ['2Jan','27Jan','24 Feb','30Mar','28 Apr','26 May','30 June','28Jul','29Jul','30','31','3 Aug','4','5','6','7','10','11','12','13','14','17','18','19','20','21','24','25'];
let lastMonth = 'Jan';
const months = ['Jan','Feb','Mar','Apr','May','June','Jul','Aug','Sep','Oct','Nov','Dec'];
const parsed = headers.map(h => {
  const match = h.match(/(\d+)\s*([A-Za-z]*)/);
  if (match) {
    let day = parseInt(match[1]);
    let monthStr = match[2];
    if (monthStr) {
      lastMonth = months.find(m => monthStr.toLowerCase().startsWith(m.toLowerCase())) || monthStr;
    }
    return `2026-${(months.indexOf(lastMonth) + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T00:00:00.000Z`;
  }
  return null;
});
console.log(parsed);
