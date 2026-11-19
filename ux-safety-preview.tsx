import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ActionSafetyProvider, useActionSafety } from '@/contexts/ActionSafetyContext';
import { useMutationLock } from '@/hooks/use-mutation-lock';
import { useFormExitGuard } from '@/hooks/use-form-exit-guard';
import { WriteOutcomeError } from '@/lib/action-safety';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import '@/index.css';

function Preview() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('100');
  const [count, setCount] = useState(0);
  const [deleted, setDeleted] = useState(0);
  const [failure, setFailure] = useState(false);
  const [error, setError] = useState('');
  const mutation = useMutationLock();
  const { confirm, runWrite, notice, clearNotice } = useActionSafety();
  const close = useFormExitGuard(open, amount, mutation.busy);
  async function save() {
    if (!mutation.begin()) return;
    try {
      if (!await confirm({ title: 'Kaydı kontrol edin', description: 'Bu ekranda yalnızca yerel simülasyon yapılır.', details: [{ label: 'Hesap', value: 'TEST-001 — Örnek hesap' }, { label: 'İşlem', value: 'Tahsilat' }, { label: 'Kaydedilecek tutar', value: amount + ' TL' }], confirmLabel: 'Kaydı onayla' })) return;
      await runWrite(async () => {
        if (failure) throw new WriteOutcomeError('Sonuç alınamadı. Yeniden göndermeyin.', 'uncertain');
        setCount(value => value + 1);
      });
      setOpen(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Hata'); }
    finally { mutation.end(); }
  }
  async function acknowledge() {
    if (await confirm({ title: 'Son işlemi kontrol ettiniz mi?', description: 'Uyarının kaldırılması kayıtları değiştirmez.', acknowledgement: 'Kayıtları kontrol ettim.', confirmLabel: 'Kontrol ettim' })) { clearNotice(); setError(''); }
  }
  return <main className="mx-auto max-w-3xl space-y-5 p-8">
    <h1 className="text-2xl font-semibold">Limes kayıt güvenliği — yerel kontrol</h1>
    <p>Gerçek veritabanına bağlanmayan arayüz kontrolü.</p>
    <p role="status">Kayıt sayısı: {count} · Silme sayısı: {deleted}</p>
    {notice && <div role="alert" className="rounded-md border border-destructive p-3 space-y-2"><p>Son işlemin sonucu kontrol edilmeli. Yeni kayıt gönderimi bekletiliyor.</p><Button variant="outline" onClick={() => void acknowledge()}>Kayıtları kontrol ettim</Button></div>}
    {error && <p role="alert">{error}</p>}
    <div className="flex gap-3"><Button onClick={() => setOpen(true)}>Yeni işlem</Button><Button variant="destructive" onClick={async () => { if (await confirm({ title: 'Hesabı sil', description: 'Silinecek hesabı kontrol edin.', details: [{ label: 'Hesap', value: 'TEST-001 — Örnek hesap' }], requireText: 'TEST-001', destructive: true, confirmLabel: 'Hesabı sil' })) setDeleted(value => value + 1); }}>Silme kontrolü</Button></div>
    <Dialog open={open} onOpenChange={next => { if (next) setOpen(true); else void close(() => setOpen(false)); }}>
      <DialogContent><DialogHeader><DialogTitle>Yeni işlem</DialogTitle><DialogDescription>TEST-001 — Örnek hesap</DialogDescription></DialogHeader>
        <div inert={mutation.busy} className="space-y-3"><label className="block">Tutar<Input aria-label="Tutar" value={amount} onChange={event => setAmount(event.target.value)} /></label><label className="flex gap-2"><input type="checkbox" checked={failure} onChange={event => setFailure(event.target.checked)} /> Bağlantı sonucu belirsiz olsun</label></div>
        {notice && <p role="alert">Sonucu kontrol etmeden bu formu yeniden göndermeyin.</p>}
        <DialogFooter><Button variant="outline" disabled={mutation.busy} onClick={() => void close(() => setOpen(false))}>İptal</Button><Button disabled={mutation.disabled} onClick={() => void save()}>{mutation.busy ? 'İşlem sürüyor…' : 'Kaydet'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </main>;
}
createRoot(document.getElementById('root')!).render(<BrowserRouter><ActionSafetyProvider userId="ux-preview"><Preview /></ActionSafetyProvider></BrowserRouter>);
