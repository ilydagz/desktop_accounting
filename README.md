# Limes Muhasebe / Limes Accounting 🍋

*[Türkçe (Turkish) sürüm için aşağı kaydırın / Scroll down for Turkish version](#türkçe-tr)*

## English (EN)
Limes Accounting is a modern, high-performance, and cloud-backed desktop accounting application built for small-to-medium businesses (SMBs), property managers (apartments/cooperatives), associations, and freelancers. 

By leveraging **Tauri v2**, Limes runs as a lightweight native desktop application, while keeping all relational data securely synced in the cloud via **Supabase**.

### 🏗 Architecture & Tech Stack
* **Desktop Core:** [Tauri v2](https://tauri.app/) (Rust) – Handles OS-level integrations, auto-updates, and native window management.
* **Frontend:** [React 19](https://react.dev/) + TypeScript + [Vite](https://vitejs.dev/) – Fast, modern web framework.
* **UI/UX Design:** [Tailwind CSS](https://tailwindcss.com/) + [Shadcn/UI](https://ui.shadcn.com/) – Accessible, clean, and premium components.
* **Backend & Database:** [Supabase](https://supabase.com/) – Provides PostgreSQL database, Realtime features, and Row Level Security (Auth).
* **CI/CD Workflow:** GitHub Actions – Automatically builds `.exe` and `.msi` installers and manages releases via Git Tags.

### 📁 Folder Structure
If you are new to the project, here is a quick overview of the repository:
- `src/` – The entire React frontend application.
  - `components/` – Reusable UI elements (mostly Shadcn components) and complex layout pieces (like tables, sidebars).
  - `pages/` – Top-level React components representing application routes (e.g., Dashboard, Accounts, Transactions).
  - `contexts/` – Global state management (AuthContext, ThemeContext, DataContext).
  - `lib/` – Utility functions and the `supabase.ts` client initialization.
- `src-tauri/` – The Rust backend and Tauri configuration.
  - `tauri.conf.json` – The brain of the Tauri app (permissions, window size, auto-update config, build scripts).
  - `src/main.rs` – The Rust entry point.
- `.github/workflows/` – Contains `release.yml` for automated cloud building and deployment upon pushing a new tag.

### 🚀 Getting Started (Development)
1. **Prerequisites:** Node.js (v20+) and [Rust](https://www.rust-lang.org/tools/install).
2. **Environment Setup:** Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=https://your-project-url.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. **Install Dependencies & Run:**
   ```bash
   npm install
   npm run tauri dev
   ```

---

## Türkçe (TR)
Limes Muhasebe; KOBİ'ler, apartman/site yönetimleri, kooperatifler, dernekler ve bireysel çalışanlar için geliştirilmiş modern ve yüksek performanslı bir masaüstü muhasebe uygulamasıdır.

**Tauri v2** sayesinde işletim sisteminde hafif ve hızlı çalışan yerel bir uygulama deneyimi sunarken, verilerinizi **Supabase** aracılığıyla güvenli bir şekilde bulutta tutar.

### 🏗 Mimari ve Teknolojiler
* **Çekirdek (Masaüstü):** [Tauri v2](https://tauri.app/) (Rust) – İşletim sistemi entegrasyonu, otomatik güncelleme (auto-update) ve pencere yönetimi.
* **Önyüz (Frontend):** [React 19](https://react.dev/) + TypeScript + [Vite](https://vitejs.dev/).
* **Tasarım Sistemi:** [Tailwind CSS](https://tailwindcss.com/) + [Shadcn/UI](https://ui.shadcn.com/) – Şık, erişilebilir ve modern bileşenler.
* **Arkayüz (Backend) & Veritabanı:** [Supabase](https://supabase.com/) – PostgreSQL, yetkilendirme (Auth) ve bulut depolama.
* **CI/CD İş Akışı:** GitHub Actions – Yeni bir sürüm etiketi (tag) atıldığında otomatik olarak Windows kurulum (.exe/.msi) dosyalarını derler ve yayınlar.

### 📁 Proje Klasör Yapısı
Projeyi ilk kez inceleyecek geliştiriciler için özet yapı:
- `src/` – React önyüz (frontend) uygulamasının tamamı buradadır.
  - `components/` – Tekrar kullanılabilir UI bileşenleri (genellikle Shadcn) ve özel tablolar, menüler.
  - `pages/` – Uygulamanın sayfaları (Örn: Gösterge Paneli, Üyeler, Kasa Hareketleri).
  - `contexts/` – Küresel durum yönetimi (Yetki, Tema ve Veri bağlamları).
  - `lib/` – Yardımcı fonksiyonlar ve `supabase.ts` bağlantı ayarları.
- `src-tauri/` – Rust arkayüzü ve masaüstü (Tauri) konfigürasyonu.
  - `tauri.conf.json` – Uygulama ayarları (İzinler, pencere boyutu, otomatik güncelleme rotası).
  - `src/main.rs` – Rust başlangıç dosyası.
- `.github/workflows/` – Otomatik derleme ve yayınlama (Release) işlemlerini yöneten `release.yml` dosyası.

### 🚀 Geliştirme Ortamı Kurulumu
1. **Gereksinimler:** Node.js (v20+) ve [Rust](https://www.rust-lang.org/tools/install).
2. **Çevre Değişkenleri:** Ana dizinde `.env` dosyası oluşturun:
   ```env
   VITE_SUPABASE_URL=https://your-project-url.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. **Bağımlılıkları Yükleme ve Başlatma:**
   ```bash
   npm install
   npm run tauri dev
   ```