import type { ConfirmAction } from '@/lib/action-safety';

export function confirmHistoryDeletion(confirm: ConfirmAction, name: string, movementCount: number) {
  return confirm({
    title: 'Hesabı silmek istediğinize emin misiniz?',
    description: movementCount > 0
      ? 'Bu hesap, aşağıdaki hareketler ve varsa onlara bağlı faiz hareketleri kalıcı olarak silinecek. Silinen hareketlerin bakiye etkileri mevcut silme kurallarıyla geri alınacak. Bu işlem geri alınamaz.'
      : 'Bu hesap kalıcı olarak silinecek. Bu işlem geri alınamaz.',
    details: [{ label: 'Silinecek hesap', value: name }, { label: 'Hesaba bağlı hareket sayısı', value: String(movementCount) }],
    destructive: true,
    confirmLabel: movementCount > 0 ? 'Evet, hesabı ve hareketleri sil' : 'Evet, hesabı sil',
  });
}
