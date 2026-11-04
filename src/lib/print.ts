// Prints just one element of the page (a receipt, certificate or ID card) via the browser's print
// dialog, where "Save as PDF" is also available.
export function printElement(el: HTMLElement | null) {
  if (!el) return;
  el.classList.add('print-target');
  document.body.classList.add('printing-element');
  const done = () => {
    el.classList.remove('print-target');
    document.body.classList.remove('printing-element');
    window.removeEventListener('afterprint', done);
  };
  window.addEventListener('afterprint', done);
  window.print();
  setTimeout(done, 1000);
}

// Downloads rows as a CSV file (opens in Excel).
export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return false;
  const headers = Array.from(rows.reduce((set, r) => {
    Object.keys(r).forEach((k) => set.add(k));
    return set;
  }, new Set<string>()));
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => cell(r[h])).join(','))].join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return true;
}

export const formatLKR = (n: number | string | null | undefined) =>
  `LKR ${Number(n || 0).toLocaleString('en-LK', { maximumFractionDigits: 2 })}`;

export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
