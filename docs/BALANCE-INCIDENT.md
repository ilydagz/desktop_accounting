# Sıfır toplamlar ve tekrarlanan hareketler

## Kodda doğrulanan sorunlar

- Eski `recalculateAllBalances` önce hesapları ve kasaları sıfırlıyordu.
  Hareket sorgusu başarısız olursa sıfırlar kalabiliyordu. Tek sorgunun satır
  sınırı nedeniyle bazı hesapların hareketleri hiç işlenmeyebiliyordu.
  Açılış tutarları da bu hesaplamada kayboluyordu. Bu yazma yolu kapatıldı.
- Hesap düzenleme formu güncel borç/alacak/net tutarlarını açılış bilgileri
  gibi geri yazıyordu. Boş veya eski bir form güncel toplamları ezebiliyordu.
  Finansal alanlar kullanıcı tarafından değiştirilmemişse düzenleme bu alanları
  göndermiyor. Kullanıcı tutarları değiştirmişse kayıttaki
  tutarlar form açıldığı andaki değerlerle eşleşmeden güncellenmiyor. Manuel
  borç, alacak ve bağımsız net bakiye girişi korunuyor; net otomatik hesaplanmıyor.
- Ekstre anlık görüntüsü, hareketin etkisi geri alındıktan sonra üretiliyordu.
  Bu yüzden “işlem sonrası” tutarı aslında işlem öncesini gösteriyordu.
- Hareket ekleme ve sonraki bakiye güncellemeleri ayrı istekler. Önceden
  bakiye güncelleme hataları denetlenmiyor ve başarı mesajı erkenden çıkıyordu.

Bu bulgular müşterinin düğmeye bastığını veya canlı kaydın kesin nedenini
kanıtlamaz. Önceki sürümde bu işlemler için bir denetim günlüğü yok.

## Uygulamadaki kontroller

- Hızlı Bakış → Hesap Kontrolü salt okunur çalışır. Hesapların mevcut toplamını,
  hareketlerin toplamını, şüpheli durumları ve olası mükerrer grupları gösterir.
- Kontrol raporu uygulamanın Hesap Listesi düzeninde PDF olarak indirilebilir.
  PDF, uyarılı hesapların kayıtlı tutarlarını ve her satırın tespit edilen sorununu gösterir.
  Doğrulama için ayrıntılı hareket kimlikleri veritabanından kontrol edilir.
- Ekstre açılırken hesap kartı ve hareket geçmişi yeniden okunur. Hatalı/eksik
  okuma boş hesap gibi sunulmaz. Rapor uyarıları muhasebe kuralı olarak uygulanmaz;
  yalnızca okuma tamamlanmamış veya başarısız olmuşsa çıktı bekletilir.
- Sayfalama, 1.000'den fazla hareketin sessizce eksik okunmasını önler. Okuma
  sırasında değişen sayımlar, tekrarlanan satırlar ve boş ara sayfalar reddedilir.
- Kaydetme sırasında tekrar tıklama engellenir. Mevcut kayıtla bütün iş
  alanları eşleşen yeni bir hareket için kullanıcıya ayrıca sorulur; gerçek
  ayrı ödemeler aynı tarih ve tutarda olabilir. Tarih/tutar tek başına mükerrer
  kabul edilmez. Mükerrer kontrolü güncelleme/silme yerine geçmez.

## Canlı hesapları düzeltme sırası

1. Müşteri hesabıyla kontrol raporunu indirin. Kayıt girişi devam ederken
   rapor alınmışsa işlemler bittikten sonra tekrar alın. Eski çıktıları koruyun.
2. 006 hesabının ve diğer uyarılı hesapların kimliklerini ve kurumunu teyit edin.
   Eski çıktıdaki aynı tarihli satırları ID/created_at/tutar/açıklama/kasa
   bilgileriyle karşılaştırın. En son girilmiş benzer satırı otomatik silmeyin.
3. Gerçek mükerrerler ve korunacak satırlar kullanıcıyla netleştirilsin.
   Açılış borcu ve alacağı eski kaynaklardan ayrıca doğrulansın. Geçmiş hareket
   bulunması, açılışın sıfır olduğunu kanıtlamaz. Mevcut toplamdan hareket
   toplamını çıkarmak da bozulmuş bir hesapta açılışı kanıtlamaz.
4. Değişiklikten önce ilgili hesapları, hareketleri ve kasaları yedekleyin.
   Düzeltme; doğrulanmış satır kimlikleri, açılışlar, işlem sayıları ve mevcut
   değerler üzerinden, kısa bir kayıt bakım aralığında sunucuda tek transaction
   içinde hazırlanmalı. Önce test kopyasında uygulanmalı; hata halinde tamamı
   geri alınmalı. Kasa etkileri ve bağlı faiz satırları ayrıca dahil edilmeli.
5. Önizlemede önce/sonra toplamları ve silinecek kimlikleri gösterin. Doğrulanan
   hareketler + doğrulanmış açılışlar ile hesap ve kasa toplamlarını denkleştirin.
   Çıktılarla karşılaştırın; sonra kayıt girişini tekrar açın.

Canlı veritabanında bu çalışma sırasında okuma veya yazma yapılmadı. Kontrol
raporu/gerçek kayıt kimlikleri olmadan veri düzeltme ve silme SQL'i üretilmedi.

## Kullanıcı deneyimiyle eklenen korumalar

- Kaydetme, güncelleme, faiz işleme ve silme seçilen düğmeyle başlar.
  İşlem boyunca kullanıcıya durum gösterilir, tamamlandığında sonuç bildirilir.
  Toplu işlem formunda girilen tutarın kaç hesaba uygulanacağı gösterilir.
- Manuel borç, alacak ve net bakiye tutarları birbirinden bağımsız kaydedilir.
- Cari veya kasa/banka hesabı silinirken bağlı hareketler ve alt faiz hareketleri
  mevcut silme kurallarıyla geri alınarak silinir, ardından hesap silinir.
  İlk iki okumada hareket geçmişi değişirse silme başlamadan durdurulur.
- Aynı hesap, tarih, tutar ve diğer işlem bilgileriyle eşleşen kayıt engellenir.
  Ayrı bir hareketin açıklamasına makbuz numarası gibi ayırt edici bilgi eklenebilir.
- Uygulama içindeki finansal formlar ortak gönderim kilidi kullanır. İkinci bir
  form, ilk işlemin ortasında yeni bir gönderim başlatamaz. Yazma sürerken
  kenar menüden yön değiştirme ve form kapatma bekletilir.
- Çevrimdışı kayıt gönderilmez. İşlem sürerken tarayıcı sayfası kapatılırsa
  tarayıcının desteklediği ayrılma uyarısı kullanılır.
  Formlar kalıcı taslak olarak saklanmaz; zorla kapatma form verisini kaybettirebilir.
- Yazma başlamadan kullanıcıya özel yalnızca tarih ve durum işareti tutulur.
  Yanıt belirsizse veya işlem kısmen tamamlandıysa yeni gönderimler inceleme
  yapılana kadar bekletilir. Uygulama yarıda kapanırsa bu işaret sonraki açılışta
  uyarı oluşturur. İşaret müşteri adı, tutar, form içeriği veya erişim anahtarı
  içermez; tarayıcı depolamayı engelliyorsa yalnızca bellek içi koruma çalışır.
- "Kayıtları kontrol ettim" düğmesi yalnızca uyarıyı kaldırır.
- Veri okuma başarısızlığı sıfır/boş hesap gibi gösterilmez. Son başarılı yenileme
  saati görünür; pencereye dönülünce ve internet geri gelince veriler yeniden okunur.
  Eski yenileme isteklerinin güncel veriyi ezmesi ve kullanıcı değişiminde eski
  kullanıcıya ait sonucun ekrana uygulanması önlenir.

Bu korumalar mevcut müşteri hesaplarını kendiliğinden onarmaz. Muhasebecinin
doğruladığı doğru/yanlış hesaplar, eski ekstreler ve kontrol raporu üzerinden
veri düzeltmesi ayrıca hazırlanmalıdır.

## Kalan mimari sınır

Hareket ekleme, silme ve toplu girişte hesap/kasa toplamları yalnızca okunan
önceki tutarlar hâlâ aynıysa güncellenir. Araya başka bir oturumun yazması
girerse yeni toplamın üstüne eski değer yazılmaz; işlem kısmi sonuç olarak
incelemeye alınır. Silmede de satırın gerçekten silindiği doğrulanmadan bakiye
ters etkisi uygulanmaz. Bunlar muhasebe formüllerini değiştirmez ve yarım kalan
hareketi otomatik düzeltmez.

Bu sürüm, hareket ve bakiye yazmalarını hâlâ ayrı istemci istekleriyle yapar.
İki cihaz aynı anda yazarsa yarış veya bağlantı kaybında kısmi kayıt hâlâ
mümkün. Mükerrer ön kontrolü veritabanında benzersiz istek kimliği değildir;
aynı anda gelen iki isteğe kesin garanti sağlamaz. Kontroller, sessiz hatayı ve
yanlış tekrar girişini azaltır; atomik sunucu işleminin yerini tutmaz.

Kalıcı çözüm, canlı şema ve RLS politikaları incelendikten sonra bütün ekleme,
düzenleme/silme ve toplu hareketlerin sunucuda tek transaction ile yapılması;
istek kimliğiyle güvenli tekrar, eşzamanlılık denetimi, korunan açılış alanları ve
değişiklik günlüğünün eklenmesidir. Yeni SQL ve istemci birlikte devreye
alınmalı; eski masaüstü sürümlerinin bu korumaları atlaması önlenmelidir.

## Yerel doğrulama

`npm test` gerçek müşteri veritabanına bağlanmaz. Tutar ve ekstre testleri ile
servis isteklerini taklit eden hata/tekrar deneme testleri içerir. Bunlar gerçek
PostgreSQL transaction/RLS veya çok cihazlı eşzamanlılık testi değildir.
`npm run build` TypeScript ve üretim derlemesini doğrular.

Muhasebe davranışları, `926ae07` commit'indeki koddan sabitlenen test kopyasıyla
karşılaştırılır: tahsilat/ödeme yönleri, kasa etkileri, silmenin ters etkisi,
ödendi işaretleme ve bağımsız manuel açılış tutarları. Faiz, gün sayısı,
yuvarlama ve net fark ifadeleri aynı kaynaktan sabitlenen ifadelerle karşılaştırılır.
Bu karşılaştırma muhasebe kurallarının mesleki doğruluğuna dair yeni bir yorum
getirmez; mevcut kuralların değiştirilmediğini denetler.
