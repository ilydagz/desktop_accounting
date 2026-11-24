import { useEffect, useSyncExternalStore } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useActionSafety } from '@/contexts/ActionSafetyContext';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { mutationCoordinator } from '@/lib/mutation-coordinator';

export function WriteSafetyHint() {
  const online = useOnlineStatus();
  if (!online) return <p role="alert" className="rounded-md border p-3 text-sm">Çevrimdışısınız. Form açık kalabilir; bağlantı olmadan kayıt gönderilmez.</p>;
  return null;
}

export function WriteSafetyStatus() {
  const online = useOnlineStatus();
  const { owner } = useSyncExternalStore(mutationCoordinator.subscribe, mutationCoordinator.snapshot, mutationCoordinator.snapshot);
  const { notice, clearNotice } = useActionSafety();
  useEffect(() => {
    if (!notice || owner) return;
    const timer = window.setTimeout(() => {
      if (!mutationCoordinator.snapshot().owner) clearNotice();
    }, 12_000);
    return () => window.clearTimeout(timer);
  }, [notice, owner, clearNotice]);
  return <div className="space-y-2">
    {!online && <div role="alert" className="rounded-md border border-orange-300 bg-orange-50 p-3 text-sm text-orange-950">Çevrimdışısınız. Kayıt gönderimi bekletiliyor. Açık formdaki bilgileriniz bu ekran açık kaldığı sürece korunur.</div>}
    {owner && <p role="status" className="text-sm text-muted-foreground">İşleminiz sürüyor.</p>}
    {notice && <div className="flex items-center justify-between gap-3 rounded-md border border-destructive px-3 py-2 text-sm">
      <p role="alert">{notice.outcome === 'partial' ? 'Önceki işlemin bir kısmı tamamlanamadı.' : 'Önceki işlemin sonucu sunucudan doğrulanamadı.'}</p>
      <Button type="button" size="icon" variant="ghost" className="size-7 shrink-0" aria-label="İşlem bildirimini kapat" disabled={Boolean(owner)} onClick={clearNotice}>
        <X className="size-4" aria-hidden="true" />
      </Button>
    </div>}
  </div>;
}
