import { useEffect, useState } from "react"
import { User, Mail, Phone, Building, ShieldCheck, MapPin, Hash, Users, Edit3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export default function ProfilePage() {
  const { user, institutionType, institutionName } = useAuth()
  const { toast } = useToast()
  
  const userEmail = user?.email || ""
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)

  const [formData, setFormData] = useState({
    full_name: "", phone: "", institution_name: "",
    address: "", city: "", tax_office: "", tax_number: "", building_units: ""
  })

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (prof) {
          setProfile(prof);
          const { data: inst } = await supabase.from('institutions').select('*').eq('id', prof.institution_id).single();
          if (inst) {
             setInstitution(inst);
             setFormData({
               full_name: prof.full_name || "", phone: prof.phone || "", institution_name: inst.name || "",
               address: inst.address || "", city: inst.city || "",
               tax_office: inst.tax_office || "", tax_number: inst.tax_number || "", building_units: inst.building_units || ""
             });
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData();
  }, [user])

  const handleSave = async () => {
    if (!profile || !institution) return;
    setSaving(true);
    try {
      const { error: profError } = await supabase.from('profiles').update({ 
        full_name: formData.full_name || null, 
        phone: formData.phone || null 
      }).eq('id', profile.id);
      if (profError) throw profError;

      const { error: instError } = await supabase.from('institutions').update({
        name: formData.institution_name || institution.name,
        address: formData.address || null, city: formData.city || null,
        tax_office: formData.tax_office || null, tax_number: formData.tax_number || null, 
        building_units: formData.building_units ? parseInt(formData.building_units) : null
      }).eq('id', institution.id);
      if (instError) throw instError;

      toast({ title: "Başarılı", description: "Profiliniz güncellendi." })
    } catch (err: any) {
       toast({ title: "Hata", description: err.message || "Güncelleme başarısız", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const nameParts = formData.full_name || userEmail.split('@')[0] || "Kullanıcı"

  if (loading) return <div className="p-8 text-center text-muted-foreground">Yükleniyor...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kurum ve Profil Ayarları</h1>
        <p className="text-muted-foreground">Kişisel ve {institutionType === 'apartman' ? 'apartmanınıza' : institutionType === 'sirket' ? 'şirketinize' : 'kurumunuza'} ait bilgileri yönetin.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        {/* Sol Taraf: Özet Kartı */}
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-4xl font-bold uppercase">
              {nameParts.slice(0, 2)}
            </div>
            
            <div className="text-center space-y-1">
              <h2 className="text-xl font-semibold capitalize">{nameParts}</h2>
              <p className="text-sm text-muted-foreground font-medium text-primary">{institutionName}</p>
            </div>

            <div className="w-full border-t pt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Hesap Tipi</span>
                <span className="font-medium uppercase tracking-wider text-xs border rounded-md px-2 py-1">{institutionType}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Durum</span>
                <span className="text-green-600 font-medium flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Aktif</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sağ Taraf: Form */}
        <Card>
          <CardHeader>
            <CardTitle>Genel Bilgiler</CardTitle>
            <CardDescription>Bu bilgiler raporlarda ve ekstrelerde görünür.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ad Soyad / Yetkili</Label>
                <div className="relative"><User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} className="pl-9" /></div>
              </div>
              <div className="space-y-2">
                <Label>E-posta</Label>
                <div className="relative"><Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input defaultValue={userEmail} className="pl-9" disabled /></div>
              </div>
            </div>
            
            <div className="space-y-2">
               <Label>Telefon</Label>
               <div className="relative"><Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="pl-9" /></div>
            </div>

            <div className="space-y-2">
              <Label>{institutionType === 'apartman' ? 'Apartman/Site Adı' : institutionType === 'koop' ? 'Kooperatif Adı' : institutionType === 'dernek' ? 'Dernek Adı' : institutionType === 'sirket' ? 'Şirket Ünvanı' : 'Kurum Adı'}</Label>
              <div className="relative"><Building className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={formData.institution_name} onChange={e => setFormData({...formData, institution_name: e.target.value})} className="pl-9" /></div>
            </div>

            {/* Dinamik Alanlar */}
            {(institutionType === 'sirket' || institutionType === 'dernek') && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t mt-4">
                <div className="space-y-2"><Label>Vergi Dairesi</Label><div className="relative"><Building className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={formData.tax_office} onChange={e => setFormData({...formData, tax_office: e.target.value})} className="pl-9" /></div></div>
                <div className="space-y-2"><Label>Vergi No</Label><div className="relative"><Hash className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={formData.tax_number} onChange={e => setFormData({...formData, tax_number: e.target.value})} className="pl-9" /></div></div>
              </div>
            )}

            {institutionType === 'bireysel' && (
              <div className="pt-2 border-t mt-4 space-y-2">
                 <Label>TC Kimlik No</Label>
                 <div className="relative"><Hash className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={formData.tax_number} onChange={e => setFormData({...formData, tax_number: e.target.value})} maxLength={11} className="pl-9" /></div>
              </div>
            )}

            {(institutionType === 'apartman' || institutionType === 'koop') && (
               <div className="pt-2 border-t mt-4 space-y-2">
                 <Label>{institutionType === 'apartman' ? 'Toplam Daire / Bağımsız Bölüm Sayısı' : 'Toplam Üye Sayısı'}</Label>
                 <div className="relative"><Users className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="number" value={formData.building_units} onChange={e => setFormData({...formData, building_units: e.target.value})} className="pl-9" /></div>
               </div>
            )}

            <div className="grid grid-cols-3 gap-4 pt-2 border-t mt-4">
              <div className="space-y-2 col-span-1"><Label>Şehir</Label><div className="relative"><MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="pl-9" /></div></div>
              <div className="space-y-2 col-span-2"><Label>Açık Adres</Label><Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
            </div>

            <div className="pt-6 flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="gap-2"><Edit3 className="h-4 w-4"/> {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}