import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getAccountingAudit } from '@/services/db';
import { useAuth } from '@/contexts/AuthContext';
import { downloadAccountingAuditPdf } from '@/lib/accounting-audit-pdf';

type Audit = Awaited<ReturnType<typeof getAccountingAudit>>;
const currency = (amount: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);

export function BalanceAuditDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [report, setReport] = useState<Audit | null>(null);
  const [error, setError] = useState('');
  const generation = useRef(0);
  useEffect(() => {
    generation.current += 1;
    setReport(null); setOpen(false); setLoading(false); setDownloading(false); setError('');
    return () => { generation.current += 1; };
  }, [user?.id]);

  async function load() {
    const request = ++generation.current;
    setLoading(true); setReport(null); setError('');
    try {
      const next = await getAccountingAudit();
      if (request === generation.current) setReport(next);
    } catch (cause) {
      if (request === generation.current) setError(cause instanceof Error ? cause.message : 'Kontrol tamamlanamadı. Yeniden deneyin.');
    } finally { if (request === generation.current) setLoading(false); }
  }

  async function download() {
    if (!report || downloading) return;
    const request = generation.current;
    const isCurrent = () => request === generation.current;
    setDownloading(true);
    setError('');
    try {
      await downloadAccountingAuditPdf(report, isCurrent);
    } catch (cause) {
      if (isCurrent()) setError(cause instanceof Error ? cause.message : 'PDF indirilemedi.');
    } finally {
      if (isCurrent()) setDownloading(false);
    }
  }

  const flagged = report?.accounts.filter(item => item.reasons.length) || [];
  return <>
    <Button variant="outline" size="sm" onClick={() => { setOpen(true); void load(); }}>
      <AlertCircle className="h-4 w-4 mr-2" /> Hesap Kontrolü
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hesap Kontrolü</DialogTitle>
          <DialogDescription>Bu kontrol kayıtları değiştirmez. Sıfır toplamları, bakiye tutarsızlıklarını ve benzer işlemleri inceleyebilirsiniz.</DialogDescription>
        </DialogHeader>
        {loading && <p role="status">Tüm hesaplar ve hareketler okunuyor…</p>}
        {error && <p role="alert" className="text-destructive">{error}</p>}
        {report && <>
          <p className="text-sm">{report.accounts.length} hesap kontrol edildi; {flagged.length} hesap inceleme gerektiriyor.</p>
          <p className="text-sm text-muted-foreground">Açılış bakiyeleri ayrıca saklanmadığı için farklar otomatik düzeltilmez. Olası mükerrerleri eski ekstrelerle karşılaştırın. Mevcut işlemleri yeniden girmeyin.</p>
          {!flagged.length && <p className="text-sm">Kontrol edilen kurallarda uyarı bulunmadı. Açılış tutarlarının ve tüm hareketlerin doğruluğu ayrıca teyit edilmelidir.</p>}
          {flagged.map(item => <div key={item.account.id} className="rounded-lg border p-3 space-y-2 text-sm">
            <h3 className="font-semibold">{item.account.custom_code || 'Kodsuz'} — {item.account.name}</h3>
            <p>Kayıtlı: borç {currency(item.stored.borc)}, alacak {currency(item.stored.alacak)}, net {currency(item.stored.bakiye)}</p>
            <p>Hareketler ({item.history.length}): borç {currency(item.movements.borc)}, alacak {currency(item.movements.alacak)}, net {currency(item.movements.bakiye)}</p>
            <ul className="list-disc pl-5">{item.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
            {item.duplicates.map(group => <p key={group[0].id} className="text-muted-foreground">Benzer işlem: {new Date(group[0].date).toLocaleDateString('tr-TR')} · {group[0].description || 'Açıklamasız'} · {currency(Number(group[0].amount))} · {group.length} kayıt</p>)}
          </div>)}
          <Button variant="outline" disabled={downloading} onClick={() => void download()}>
            <Download className="h-4 w-4 mr-2" /> {downloading ? 'PDF hazırlanıyor…' : 'PDF indir'}
          </Button>
        </>}
        <Button variant="outline" disabled={loading || downloading} onClick={() => void load()}>Yeniden kontrol et</Button>
      </DialogContent>
    </Dialog>
  </>;
}
