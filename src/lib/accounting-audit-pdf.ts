import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import html2pdf from 'html2pdf.js';
import type { getAccountingAudit } from '@/services/db';
import type { Balance } from '@/lib/account-balance';

type Audit = Awaited<ReturnType<typeof getAccountingAudit>>;
type AccountReport = Audit['accounts'][number];

const currency = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
const codeOrder = new Intl.Collator('tr-TR', { numeric: true });
const paper = { width: 297, height: 210, margin: 10 };
const contentWidth = paper.width - 2 * paper.margin;
const contentHeight = paper.height - 2 * paper.margin;
const maxHeight = contentHeight * 96 / 25.4 - 8;

const styles = `
  .account-audit-print { font: 12px/1.25 Arial, sans-serif; color: #333; background: white; }
  .account-audit-print header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
  .account-audit-print h1 { font-size: 24px; font-weight: bold; margin: 0 0 5px; }
  .account-audit-print p { margin: 0; color: #666; }
  .account-audit-print table { width: 100%; table-layout: fixed; border-collapse: collapse; }
  .account-audit-print th, .account-audit-print td {
    border: 1px solid #ddd; padding: 3px 9px; text-align: left; vertical-align: middle; overflow-wrap: anywhere;
  }
  .account-audit-print th, .account-audit-print tfoot { background: #f1f5f9; font-weight: bold; }
  .account-audit-print .number { text-align: right; white-space: nowrap; }
  .account-audit-print .debt { color: #dc2626; }
  .account-audit-print .credit { color: #16a34a; }
  .account-audit-print .issue { font-size: 11.5px; }
  .account-audit-print small { font-size: 10px; }
  .account-audit-print footer { margin-top: 20px; font-size: 12px; color: #666; text-align: right; }
`;

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function balanceCells({ borc, alacak, bakiye }: Balance) {
  const difference = borc - alacak;
  const status = difference > 0 ? '<small class="credit">(BORÇLU)</small>'
    : difference < 0 ? '<small class="debt">(ALACAKLI)</small>' : '';
  return `<td class="number debt">${currency.format(borc)}</td>
    <td class="number credit">${currency.format(alacak)}</td>
    <td class="number"><strong>${currency.format(bakiye)}</strong></td>
    <td class="number"><strong>${currency.format(Math.abs(difference))}</strong>${status && `<br>${status}`}</td>`;
}

function issueLines({ history, stored, movements, duplicates, reasons }: AccountReport) {
  const issues: string[] = [];
  if (history.length && stored.borc === 0 && stored.alacak === 0 && stored.bakiye === 0) {
    issues.push(`<strong>${history.length} kayıtlı hareket var, üç toplam da sıfır.</strong>`);
    issues.push(`Hareketlerde ${currency.format(movements.borc)} borç ve ${currency.format(movements.alacak)} alacak var.`);
  } else {
    for (const [key, label] of [['borc', 'Borç'], ['alacak', 'Alacak']] as const) {
      if (Math.round(stored[key] * 100) < Math.round(movements[key] * 100)) {
        issues.push(`${label} kaydı ${currency.format(stored[key])}, hareket toplamı ${currency.format(movements[key])}.`);
      }
    }
    if (!issues.length && stored.borc === movements.borc && stored.alacak === movements.alacak && stored.bakiye === movements.bakiye) {
      issues.push('Kayıtlı toplamlar hareketlerle eşleşiyor.');
    }
  }

  if (duplicates.length) {
    const examples = duplicates.slice(0, 3).map(([movement]) => {
      const date = new Date(movement.date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' });
      return `${date} / ${currency.format(Number(movement.amount))}`;
    });
    const extra = duplicates.length > examples.length ? ` ve ${duplicates.length - examples.length} grup daha` : '';
    const type = duplicates.every(([movement]) => movement.type === 'tahsilat') ? 'tahsilat' : 'işlem';
    const label = duplicates.length > 1 ? `${duplicates.length} olası mükerrer ${type} grubu` : `Olası mükerrer ${type}`;
    issues.push(`<strong>${label}</strong> (${examples.join(', ')}${extra}).`);
  }
  return issues.length ? issues.join('<br>') : reasons.map(escapeHtml).join('<br>');
}

function createPage(report: Audit, rowCount: number, pageNumber: number) {
  const page = document.createElement('section');
  page.className = 'account-audit-print';
  page.style.width = `${contentWidth}mm`;
  const date = new Date(report.capturedAt).toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul', dateStyle: 'medium', timeStyle: 'short',
  });
  page.innerHTML = `<style>${styles}</style>
    <header><h1>Hesap Listesi</h1><p>Hesap Kontrolü raporunda uyarı bulunan ${rowCount} hesabın kayıtlı tutarları ve tespit edilen sorunlar.</p></header>
    <table>
      <colgroup><col style="width:8%"><col style="width:18%"><col style="width:10%"><col style="width:10%">
        <col style="width:11%"><col style="width:11%"><col style="width:32%"></colgroup>
      <thead><tr><th>Özel Kod</th><th>Ad / Ünvan</th><th class="number">Borç</th><th class="number">Alacak</th>
        <th class="number">Genel Bakiye</th><th class="number">Net Durum</th><th>Tespit Edilen Sorun</th></tr></thead>
      <tbody></tbody>
    </table>
    <footer>Rapor Tarihi ${date} | ${pageNumber}</footer>`;
  return { page, table: page.querySelector('table')! };
}

export async function downloadAccountingAuditPdf(report: Audit, isCurrent: () => boolean) {
  const date = new Date(report.capturedAt).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
  const filename = `Limes_Hesap_Kontrolu_${date}.pdf`;
  let savePath: string | null = null;
  if ('__TAURI_INTERNALS__' in window) {
    savePath = await save({ defaultPath: filename, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (!savePath || !isCurrent()) return;
  }

  const rows = report.accounts.filter(item => item.reasons.length).sort((a, b) =>
    codeOrder.compare(String(a.account.custom_code || ''), String(b.account.custom_code || ''))
    || codeOrder.compare(a.account.name, b.account.name));
  const surface = document.createElement('div');
  Object.assign(surface.style, { position: 'absolute', left: '-12000px', top: '0', visibility: 'hidden' });
  document.body.appendChild(surface);

  try {
    const pages: HTMLElement[] = [];
    function nextPage() {
      const { page, table } = createPage(report, rows.length, pages.length + 1);
      pages.push(page);
      surface.appendChild(page);
      return table;
    }
    let table = nextPage();
    const totals = { borc: 0, alacak: 0, bakiye: 0 };
    for (const item of rows) {
      const tbody = table.tBodies[0];
      const row = tbody.insertRow();
      row.innerHTML = `<td>${escapeHtml(String(item.account.custom_code || '-'))}</td>
        <td>${escapeHtml(item.account.name)}</td>${balanceCells(item.stored)}<td class="issue">${issueLines(item)}</td>`;
      if (tbody.rows.length > 1 && pages[pages.length - 1].offsetHeight > maxHeight - 50) {
        table = nextPage();
        table.tBodies[0].appendChild(row);
      }
      totals.borc += item.stored.borc;
      totals.alacak += item.stored.alacak;
      totals.bakiye += item.stored.bakiye;
    }
    if (rows.length) {
      table.createTFoot().innerHTML = `<tr><td colspan="2" class="number">TOPLAM (${rows.length} HESAP)</td>
        ${balanceCells(totals)}<td>Listede görünen kayıtlı tutarların toplamı.</td></tr>`;
    } else {
      table.tBodies[0].innerHTML = '<tr><td colspan="7">Kontrol edilen kurallarda uyarı bulunmadı.</td></tr>';
    }
    for (const page of pages) page.querySelector('footer')?.append(`/${pages.length}`);
    if (pages.some(page => page.offsetHeight > maxHeight)) {
      throw new Error('Rapor sayfaya sığmadı. PDF oluşturulamadı.');
    }
    if (!isCurrent()) return;
    const render = (page: HTMLElement) => html2pdf().set({
      margin: paper.margin, filename, enableLinks: false,
      image: { type: 'jpeg', quality: 0.96 }, html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    }).from(page);
    const pdf = await render(pages[0]).toPdf().get('pdf');
    for (const page of pages.slice(1)) {
      if (!isCurrent()) return;
      const canvas: HTMLCanvasElement = await render(page).toCanvas().get('canvas');
      pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', paper.margin, paper.margin,
        contentWidth, canvas.height * contentWidth / canvas.width);
    }
    if (!isCurrent()) return;
    if (savePath) {
      await writeFile(savePath, new Uint8Array(pdf.output('arraybuffer')));
    } else {
      pdf.save(filename);
    }
  } finally {
    surface.remove();
  }
}
