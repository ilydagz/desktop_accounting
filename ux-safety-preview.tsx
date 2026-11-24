import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ActionSafetyProvider, useActionSafety } from '@/contexts/ActionSafetyContext';
import { WriteSafetyStatus } from '@/components/WriteSafetyStatus';
import { useMutationLock } from '@/hooks/use-mutation-lock';
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
  const { runWrite } = useActionSafety();
  async function save() {
    if (!mutation.begin()) return;
    setError('');
    try {
      await runWrite(async () => {
        await new Promise(resolve => window.setTimeout(resolve, 500));
        if (failure) throw new WriteOutcomeError('Sonuç alınamadı. Yeniden göndermeyin.', 'uncertain');
        setCount(value => value + 1);
      });
      setOpen(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Hata'); }
    finally { mutation.end(); }
  }
  return <main className="mx-auto max-w-3xl space-y-5 p-8">
    <h1 className="text-2xl font-semibold">Limes kayıt güvenliği — yerel kontrol</h1>
    <p>Gerçek veritabanına bağlanmayan arayüz kontrolü.</p>
    <p role="status">Kayıt sayısı: {count} · Silme sayısı: {deleted}</p>
    <WriteSafetyStatus />
    {error && <p role="alert">{error}</p>}
    <div className="flex gap-3"><Button onClick={() => setOpen(true)}>Yeni işlem</Button><Button variant="destructive" disabled={mutation.disabled} onClick={() => setDeleted(value => value + 1)}>Hesabı sil</Button></div>
    <Dialog open={open} onOpenChange={next => { if (!mutation.busy) setOpen(next); }}>
      <DialogContent><DialogHeader><DialogTitle>Yeni işlem</DialogTitle><DialogDescription>TEST-001 — Örnek hesap</DialogDescription></DialogHeader>
        <div inert={mutation.busy} className="space-y-3"><label className="block">Tutar<Input aria-label="Tutar" value={amount} onChange={event => setAmount(event.target.value)} /></label><label className="flex gap-2"><input type="checkbox" checked={failure} onChange={event => setFailure(event.target.checked)} /> Bağlantı sonucu belirsiz olsun</label></div>
        <DialogFooter><Button variant="outline" disabled={mutation.busy} onClick={() => setOpen(false)}>İptal</Button><Button disabled={mutation.disabled} onClick={() => void save()}>{mutation.busy ? 'Kaydediliyor…' : 'Kaydet'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </main>;
}
createRoot(document.getElementById('root')!).render(<BrowserRouter><ActionSafetyProvider userId="ux-preview"><Preview /></ActionSafetyProvider></BrowserRouter>);
