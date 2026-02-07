import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { Plus, Search, ArrowUp, ArrowDown, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { getTransactions, addTransaction, getAccounts } from "@/services/db" // DB fonksiyonları

// --- YARDIMCI FONKSİYONLAR ---
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount)
}
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

type TransactionType = "tahsilat" | "odeme"

// Veritabanından gelecek veri tipi
interface Transaction { 
    id: number; 
    accountId: number; 
    accountName: string; // Join ile gelecek
    type: TransactionType; 
    amount: number; 
    description: string; 
    date: string; 
}

export default function TransactionsPage() {
  const { toast } = useToast()
  
  // STATE'LER
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<any[]>([]) // Cari seçimi için liste
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "tahsilat" | "odeme">("all")

  // FORM STATE
  const [txType, setTxType] = useState<TransactionType>("tahsilat")
  const [formData, setFormData] = useState({
      accountId: "",
      amount: "",
      description: "",
      method: "cash"
  })

  // --- VERİLERİ YÜKLE ---
  const loadData = async () => {
      try {
          const txData = await getTransactions();
          setTransactions(txData);
          
          const accData = await getAccounts();
          setAccounts(accData);
      } catch (error) {
          console.error("Veriler yüklenemedi", error);
      }
  }

  useEffect(() => {
      loadData();
  }, [])

  // --- YENİ İŞLEM KAYDET ---
  const handleSave = async () => {
      if (!formData.accountId || !formData.amount) {
          toast({ title: "Hata", description: "Lütfen cari ve tutar giriniz.", variant: "destructive" })
          return;
      }

      try {
          await addTransaction({
              accountId: Number(formData.accountId),
              type: txType,
              amount: parseFloat(formData.amount),
              description: formData.description || (txType === 'tahsilat' ? 'Tahsilat İşlemi' : 'Ödeme İşlemi'),
              date: new Date().toISOString().split('T')[0] // Bugünün tarihi (YYYY-MM-DD)
          });

          await loadData(); // Listeyi yenile
          setIsModalOpen(false);
          setFormData({ accountId: "", amount: "", description: "", method: "cash" }); // Formu sıfırla
          toast({ title: "Başarılı", description: "İşlem kaydedildi." })

      } catch (error) {
          console.error(error);
          toast({ title: "Hata", description: "Kaydedilemedi.", variant: "destructive" })
      }
  }

  // --- FİLTRELEME ---
  const filteredTransactions = useMemo(() => {
    let result = transactions;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      // accountName null gelebilir kontrolü yapıyoruz
      result = result.filter((tx) => 
        (tx.accountName && tx.accountName.toLowerCase().includes(query)) || 
        (tx.description && tx.description.toLowerCase().includes(query))
      )
    }
    if (filterType !== "all") {
      result = result.filter((tx) => tx.type === filterType)
    }
    return result;
  }, [transactions, searchQuery, filterType])

  // --- TOPLAMLAR ---
  const totalTahsilat = filteredTransactions.filter((tx) => tx.type === "tahsilat").reduce((sum, tx) => sum + tx.amount, 0)
  const totalOdeme = filteredTransactions.filter((tx) => tx.type === "odeme").reduce((sum, tx) => sum + tx.amount, 0)
  const kasaBakiyesi = totalTahsilat - totalOdeme

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kasa Hareketleri</h1>
          <p className="text-muted-foreground mt-1">Tüm finansal işlemleri görüntüleyin ve yönetin</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Yeni İşlem Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Yeni İşlem Ekle</DialogTitle>
              <DialogDescription>Listeye manuel olarak yeni bir gelir veya gider ekleyin.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              {/* TİP SEÇİM BUTONLARI */}
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => setTxType('tahsilat')} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${txType === 'tahsilat' ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'border-muted hover:border-green-200 text-muted-foreground'}`}>
                  <ArrowUp className={`h-6 w-6 ${txType === 'tahsilat' ? 'text-green-600' : ''}`} />
                  <span className="font-semibold text-sm">Tahsilat (Al)</span>
                </button>
                <button type="button" onClick={() => setTxType('odeme')} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${txType === 'odeme' ? 'border-destructive bg-red-50 dark:bg-red-900/20 text-destructive' : 'border-muted hover:border-red-200 text-muted-foreground'}`}>
                  <ArrowDown className={`h-6 w-6 ${txType === 'odeme' ? 'text-destructive' : ''}`} />
                  <span className="font-semibold text-sm">Ödeme (Ver)</span>
                </button>
              </div>

              {/* FORM ALANLARI */}
              <div className="space-y-4">
                  {/* CARİ SEÇİMİ */}
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right font-medium">Cari Adı</Label>
                      <Select onValueChange={(val) => setFormData({...formData, accountId: val})}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Cari Seçiniz" />
                        </SelectTrigger>
                        <SelectContent>
                            {accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right font-medium">Tutar</Label>
                      <div className="col-span-3 relative">
                          <Input 
                            type="number" 
                            className="pl-8" 
                            value={formData.amount}
                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                          />
                          <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">₺</span>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right font-medium">Açıklama</Label>
                      <Input 
                        className="col-span-3" 
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                      />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right font-medium">Yöntem</Label>
                      <Select value={formData.method} onValueChange={(val) => setFormData({...formData, method: val})}>
                          <SelectTrigger className="col-span-3"><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="cash">Nakit</SelectItem>
                              <SelectItem value="card">Kredi Kartı</SelectItem>
                              <SelectItem value="bank">Havale / EFT</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
              </div>
            </div>
            <DialogFooter>
                <Button onClick={handleSave} className={txType === 'tahsilat' ? 'bg-green-600 hover:bg-green-700' : 'bg-destructive hover:bg-destructive/90'}>
                    {txType === 'tahsilat' ? 'Tahsilatı Kaydet' : 'Ödemeyi Kaydet'}
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="text" placeholder="İşlem ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className={filterType !== 'all' ? 'text-primary border-primary' : ''}><Filter className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>İşlem Tipi</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem checked={filterType === 'all'} onCheckedChange={() => setFilterType('all')}>Tümü</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={filterType === 'tahsilat'} onCheckedChange={() => setFilterType('tahsilat')}>Sadece Tahsilatlar</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={filterType === 'odeme'} onCheckedChange={() => setFilterType('odeme')}>Sadece Ödemeler</DropdownMenuCheckboxItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="overflow-hidden">
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent border-border"><TableHead className="w-28">Tarih</TableHead><TableHead>Hesap Adı</TableHead><TableHead>İşlem Tipi</TableHead><TableHead className="text-right">Tutar</TableHead><TableHead>Açıklama</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (<TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">İşlem bulunamadı.</TableCell></TableRow>) : (filteredTransactions.map((tx) => (
                    <TableRow key={tx.id} className="border-border group">
                      <TableCell className="text-muted-foreground font-medium">{formatDate(tx.date)}</TableCell>
                      <TableCell><Link to={`/accounts?id=${tx.accountId}`} className="font-medium text-foreground hover:text-primary hover:underline">{tx.accountName || "Silinmiş Cari"}</Link></TableCell>
                      <TableCell><Badge variant="outline" className={cn("gap-1 pr-3", tx.type === "tahsilat" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-destructive border-red-200 dark:bg-red-900/20")}>{tx.type === "tahsilat" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}{tx.type === "tahsilat" ? "Tahsilat" : "Ödeme"}</Badge></TableCell>
                      <TableCell className={cn("text-right font-bold text-base", tx.type === "tahsilat" ? "text-green-600" : "text-destructive")}>{tx.type === "tahsilat" ? "+" : "-"}{formatCurrency(tx.amount)}</TableCell>
                      <TableCell className="text-muted-foreground">{tx.description}</TableCell>
                    </TableRow>
                  )))}
              </TableBody>
              <TableFooter className="bg-muted/50 sticky bottom-0">
                <TableRow className="hover:bg-muted/50 border-t-2 border-border"><TableCell colSpan={3} className="font-semibold text-foreground text-base">Genel Kasa Bakiyesi</TableCell><TableCell className={cn("text-right font-bold text-xl", kasaBakiyesi >= 0 ? "text-green-600" : "text-destructive")}>{formatCurrency(kasaBakiyesi)}</TableCell><TableCell /></TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}