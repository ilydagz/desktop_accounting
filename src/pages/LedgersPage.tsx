import { useState } from "react"
import { Building2, Wallet, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { addLedger } from "@/services/db"
// removed unused import
import { useData } from "@/contexts/DataContext"

const formatCurrency = (amount: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount)

export default function LedgersPage() {
  const { toast } = useToast()
  const { ledgers, setLedgers, refreshData } = useData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    type: "kasa" as "kasa" | "banka",
    name: "",
    currency: "TRY"
  })

  const handleSave = async () => {
    if (!formData.name) {
      toast({ title: "Hata", description: "Lütfen bir isim giriniz", variant: "destructive" })
      return
    }
    
    try {
      setLoading(true)
      const tempId = "temp-" + Date.now();
      const newLedger = { id: tempId, type: formData.type, name: formData.name, currency: formData.currency, balance: 0 };
      setLedgers(prev => [newLedger, ...prev]);
      
      setIsModalOpen(false)
      setFormData({ type: "kasa", name: "", currency: "TRY" })
      toast({ title: "Başarılı", description: "Kasa/Banka eklendi." })

      await addLedger({ type: formData.type, name: formData.name, currency: formData.currency })
      refreshData()
    } catch (e: any) {
      refreshData()
      toast({ title: "Hata", description: e.message, variant: "destructive" })
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Bu hesabı silmek istediğinize emin misiniz? DİKKAT: Bu hesaba bağlı olan tüm işlemler silinecek ve ilgili kişilerin bakiyelerinden geri düşülecektir!")) {
      try {
        setLedgers(prev => prev.filter(l => l.id !== id));
        toast({ title: "Başarıyla Silindi", description: "Banka ve bağlı işlemler silindi." })
        
        const { deleteLedger } = await import("@/services/db");
        await deleteLedger(id);
        refreshData()
      } catch (e: any) {
        refreshData()
        toast({ title: "Hata", description: "Silinemedi: " + e.message, variant: "destructive" })
      }
    }
  }

  const totalKasa = ledgers.filter(l => l.type === 'kasa').reduce((sum, l) => sum + (l.balance || 0), 0)
  const totalBanka = ledgers.filter(l => l.type === 'banka').reduce((sum, l) => sum + (l.balance || 0), 0)

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kasa ve Bankalar</h1>
          <p className="text-muted-foreground mt-1">Fiziksel nakit kasalarınızı ve banka hesaplarınızı yönetin.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Yeni Hesap Ekle
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2 text-primary">
              <Wallet className="h-5 w-5" />
              <h3 className="font-semibold text-sm uppercase tracking-wider">Toplam Kasa Bakiyesi</h3>
            </div>
            <div className="text-3xl font-bold text-primary">{formatCurrency(totalKasa)}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-600/5 border-green-600/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2 text-green-700">
              <Building2 className="h-5 w-5" />
              <h3 className="font-semibold text-sm uppercase tracking-wider">Toplam Banka Bakiyesi</h3>
            </div>
            <div className="text-3xl font-bold text-green-700">{formatCurrency(totalBanka)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Hesap Adı</TableHead>
                <TableHead>Tür</TableHead>
                <TableHead className="text-right">Bakiye</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledgers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Henüz kasa veya banka hesabı eklenmemiş.</TableCell></TableRow>
              ) : (
                ledgers.map(ledger => (
                  <TableRow key={ledger.id}>
                    <TableCell>
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${ledger.type === 'banka' ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'}`}>
                        {ledger.type === 'kasa' ? <Wallet className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-base">{ledger.name}</TableCell>
                    <TableCell>
                      <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground px-2 py-1 border rounded-md">
                        {ledger.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg">{formatCurrency(ledger.balance || 0)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(ledger.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Yeni Hesap Ekle</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Hesap Türü</Label>
              <Select value={formData.type} onValueChange={(val: any) => setFormData({...formData, type: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kasa">Fiziksel Kasa (Nakit)</SelectItem>
                  <SelectItem value="banka">Banka Hesabı (Havale/EFT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hesap Adı</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                placeholder={formData.type === 'kasa' ? "Örn: Merkez Kasa" : "Örn: İş Bankası Vadesiz"} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>İptal</Button>
            <Button onClick={handleSave} disabled={loading}>{loading ? 'Kaydediliyor...' : 'Kaydet'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
