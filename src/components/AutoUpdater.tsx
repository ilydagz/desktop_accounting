import { useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { useToast } from '@/hooks/use-toast';

export function AutoUpdater() {
  const { toast } = useToast();

  useEffect(() => {
    async function checkForUpdates() {
      try {
        // Tarayıcı ortamındaysak veya tauri yoksa çalışmaz
        // @ts-ignore
        if (!window.__TAURI_INTERNALS__) return;

        const update = await check();
        if (update?.available) {
          toast({
            title: "Yeni Güncelleme Mevcut!",
            description: `Versiyon ${update.version} bulundu. İndirilip kuruluyor...`,
            duration: 5000,
          });

          await update.downloadAndInstall();
          
          toast({
            title: "Güncelleme Tamamlandı!",
            description: "Yeni sürümü kullanmak için uygulamayı kapatıp açın.",
          });
        }
      } catch (error) {
        console.error('Güncelleme kontrolü başarısız:', error);
      }
    }

    checkForUpdates();
  }, [toast]);

  return null;
}
