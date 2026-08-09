const ExcelJS = require('exceljs');

const HEADER_COLOR = 'FF0D9488';
const ZEBRA_COLOR = 'FFF1F5F9';

function isoToDisplay(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function addSheet(ws, columns, rows) {
  ws.views = [{ rightToLeft: true, state: 'frozen', ySplit: 1 }];
  ws.columns = columns.map((c) => ({ width: c.width || 18 }));

  const headerRow = ws.addRow(columns.map((c) => c.header));
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_COLOR } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF0F766E' } } };
  });
  headerRow.height = 24;

  rows.forEach((rowData, i) => {
    const row = ws.addRow(rowData);
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle' };
      if (i % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_COLOR } };
      }
    });
  });

  if (rows.length > 0) {
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: rows.length + 1, column: columns.length }
    };
  }
}

function buildWorkbook({ sheets }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Physics Platform';
  wb.created = new Date();
  sheets.forEach((s) => addSheet(wb.addWorksheet(s.name || 'البيانات'), s.columns, s.rows));
  return wb;
}

function sendCsv(res, filename, columns, rows) {
  const esc = (v) => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = [columns.map((c) => c.header), ...rows]
    .map((r) => r.map(esc).join(';'))
    .join('\r\n');
  const content = '\uFEFF' + body;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename + '.csv')}`);
  res.send(content);
}

async function sendXlsx(res, filename, sheets) {
  const wb = buildWorkbook({ sheets });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename + '.xlsx')}`);
  await wb.xlsx.write(res);
  res.end();
}

async function sendSpreadsheet(res, format, { filename, sheet, columns, rows }) {
  if (format === 'csv') return sendCsv(res, filename, columns, rows);
  return sendXlsx(res, filename, [{ name: sheet || 'البيانات', columns, rows }]);
}

async function sendWorkbook(res, filename, sheets) {
  return sendXlsx(res, filename, sheets);
}

module.exports = { sendSpreadsheet, sendWorkbook, isoToDisplay };
