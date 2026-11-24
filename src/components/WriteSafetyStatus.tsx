import { useEffect, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { BalanceAuditDialog } from '@/components/BalanceAuditDialog';
import { useActionSafety } from '@/contexts/ActionSafetyContext';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { mutationCoordinator } from '@/lib/mutation-coordinator';

export function WriteSafetyHint() {
  const online = useOnlineStatus();
  const { notice } = useActionSafety();
  if (!online) return <p role="alert" className="rounded-md border p-3 text-sm">Çevrimdışısınız. Form açık kalabilir; bağlantı olmadan kayıt gönderilmez.</p>;
  if (!notice) return null;
  return <div role="alert" className="rounded-md border border-destructive p-3 text-sm space-y-2"><p>Son işlemin sonucu kontrol edilmeli. Bu formu yeniden göndermeyin. Önce mevcut hareketleri kontrol edin; uyarıyı kaldırmak kayıtları düzeltmez.</p><BalanceAuditDialog /></div>;
}

export function WriteSafetyStatus() {
  const online = useOnlineStatus();
  const { owner } = useSyncExternalStore(mutationCoordinator.subscribe, mutationCoordinator.snapshot, mutationCoordinator.snapshot);
  const { notice, clearNotice } = useActionSafety();
  useEffect(() => {
    if (!owner) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [owner]);
  return <div className="space-y-2">
    {!online && <div role="alert" className="rounded-md border border-orange-300 bg-orange-50 p-3 text-sm text-orange-950">Çevrimdışısınız. Kayıt gönderimi bekletiliyor. Açık formdaki bilgileriniz bu ekran açık kaldığı sürece korunur.</div>}
    {owner && <p role="status" className="text-sm text-muted-foreground">İşleminiz sürüyor. Sonuç görünene kadar sayfayı kapatmayın veya aynı kaydı tekrar göndermeyin.</p>}
    {notice && <div role="alert" className="rounded-md border border-destructive p-3 text-sm space-y-2">
      <p className="font-semibold">Son işlemin sonucu kontrol edilmeli.</p>
      <p>{notice.outcome === 'partial' ? 'Kayıt adımlarının bir kısmı tamamlanamadı.' : 'Sunucudan kesin sonuç alınamadı; kayıt tamamlanmış olabilir.'} Aynı işlemi yeniden girmeyin. Kontrol tamamlanana kadar yeni kayıt gönderimi bekletilir.</p>
      <div className="flex flex-wrap gap-2"><BalanceAuditDialog /><Button variant="outline" disabled={!online || Boolean(owner)} onClick={clearNotice}>Kayıtları kontrol ettim</Button></div>
    </div>}
  </div>;
}
