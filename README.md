# Limes Muhasebe

Modern, bulut tabanlı (Supabase) ve yüksek performanslı bir masaüstü muhasebe ve yönetim uygulamasıdır. Şirketler, kooperatifler, apartman/site yönetimleri, dernekler, camiler ve bireysel kullanıcılar için özel olarak tasarlanmıştır.

Tauri v2 altyapısı sayesinde yerel bir masaüstü uygulaması performansında çalışırken, verileriniz Supabase aracılığıyla güvenli bir şekilde bulutta tutulur.

## ✨ Öne Çıkan Özellikler

### 🏢 Çoklu Kurum Desteği
Uygulama girişinde seçilen kurum tipine göre (Şirket, Kooperatif, Apartman, Dernek, Bireysel, Cami) dinamik olarak şekillenen arayüz ve özellikler:
* **Şirketler:** Vergi dairesi, vergi numarası takibi.
* **Kooperatifler & Apartmanlar:** Daire/üye sayısı takibi, aidat yönetimi.
* **Dernekler & Camiler:** Bağış ve aidat toplama yönetimi.

### 👥 Detaylı Üye / Cari Yönetimi
* Üyelerin veya carilerin detaylı bilgilerini (TC/VKN, Adres, İletişim) kayıt altına alma.
* Kişiye özel genel bakiye, borç ve alacak durumlarının gerçek zamanlı takibi.
* Pratik arama ve filtreleme ("İle Başlayan" mantığında akıllı arama) ve kolay listeleme.

### 💰 Kasa ve Hareketler (İşlem Takibi)
* Gelişmiş özet görünümü sayesinde tek tıkla kurum geneli veya seçili üyeye ait hesap dökümü.
* Tarih, işlem türü (Tahsilat/Ödeme), ödeme yöntemi (Nakit/Banka/Kredi Kartı vb.) bazlı filtrelemeler.
* Tahsilat, Ödeme, Borçlandırma ve Alacaklandırma fişleri oluşturma.
* Her bir işlem için detaylı açıklama, makbuz numarası ve vade tarihi ekleme.

### 🏦 Banka Entegrasyonu (Geliştirme Aşamasında)
* Açık Bankacılık (Open Banking) API'leri ile banka hareketlerinin anlık aktarımı.
* IBAN yönetimi ve sanal POS entegrasyon altyapısı.

### 🔄 Otomatik Güncelleme (Auto-Update)
* Tauri Updater sayesinde Github Releases üzerinden uygulamadan çıkmadan tek tıkla yeni sürüme geçiş.

---

## 🛠 Kullanılan Teknolojiler

* **Çekirdek (Masaüstü):** [Tauri v2](https://tauri.app/) (Rust + Webview)
* **Frontend:** [React 19](https://react.dev/) + TypeScript + [Vite](https://vitejs.dev/)
* **Backend & Veritabanı:** [Supabase](https://supabase.com/) (PostgreSQL + Auth)
* **Tasarım Sistemi:** [Tailwind CSS](https://tailwindcss.com/) + [Shadcn/ui](https://ui.shadcn.com/)
* **İkonlar:** [Lucide React](https://lucide.dev/)
* **Yönlendirme:** React Router v7
* **CI/CD:** Github Actions (Otomatik Windows .exe, .msi derleme ve yayınlama)

---

## 📦 Kurulum ve Geliştirme

Projeyi yerel ortamınızda çalıştırmak ve geliştirmek için:

### 1. Gereksinimler
* [Node.js](https://nodejs.org/) (v20 veya daha güncel)
* [Rust](https://www.rust-lang.org/tools/install) (Tauri derlemesi için zorunlu)
* C++ Build Tools (Windows için Visual Studio üzerinden)
* Supabase hesabı ve projesi (Veritabanı URL ve Anon Key)

### 2. Çevre Değişkenleri (Environment Variables)
Proje ana dizininde `.env` isimli bir dosya oluşturup Supabase bilgilerinizi ekleyin:
```env
VITE_SUPABASE_URL=https://your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Bağımlılıkların Yüklenmesi
```bash
npm install
```

### 4. Geliştirme Ortamında Başlatma
```bash
npm run tauri dev
```

### 5. Yeni Sürüm Derleme (Build & Release)
Github Actions altyapısı, `v*` formatındaki (örneğin `v0.1.4`) etiketleri (tag) algılayarak otomatik olarak derler.
```bash
git tag v0.1.4
git push origin v0.1.4
```