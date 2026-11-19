import { DuplicateTransactionError } from '@/services/db';
import { ActionCancelledError, type ConfirmAction } from '@/lib/action-safety';

export async function confirmDuplicateSave(save: (allowDuplicate: boolean) => Promise<unknown>, confirm: ConfirmAction) {
  try { await save(false); }
  catch (error) {
    if (!(error instanceof DuplicateTransactionError)) throw error;
    if (!await confirm({ title: 'Benzer işlem zaten var', description: error.message, acknowledgement: 'Mevcut kaydı kontrol ettim. Bu kayıt, önceki kayıttan ayrı gerçek bir işlemdir.', confirmLabel: 'Ayrı işlem olarak kaydet' })) throw new ActionCancelledError();
    await save(true);
  }
}
