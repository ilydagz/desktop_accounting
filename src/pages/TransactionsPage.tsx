import { useState, useMemo } from "react" // DÜZELTİLDİ: 'React' silindi
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

// --- YARDIMCI VE DATA KISIMLARI (Aynı kalıyor) ---
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount)
}
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
}
type TransactionType = "tahsilat" | "odeme"
interface Transaction { id: number; accountId: string; account: string; type: TransactionType; amount: number; description: string; date: string; }

const transactions: Transaction[] = [
  { id: 1, accountId: "1", account: "Ahmet Yılmaz", type: "tahsilat", amount: 5000, description: "Kira ödemesi", date: "2026-01-30" },
  { id: 2, accountId: "2", account: "ABC İnşaat Ltd.", type: "odeme", amount: 12500, description: "Malzeme alımı", date: "2026-01-29" },
  { id: 3, accountId: "4", account: "Yıldız Apartmanı", type: "tahsilat", amount: 8750, description: "Aidat tahsilatı", date: "2026-01-28" },
  { id: 4, accountId: "3", account: "Fatma Kaya", type: "tahsilat", amount: 3200, description: "Hizmet bedeli", date: "2026-01-27" },
  { id: 5, accountId: "8", account: "Merkez İş Hanı", type: "odeme", amount: 6800, description: "Bakım gideri", date: "2026-01-26" },
  { id: 6, accountId: "6", account: "Güneş Sitesi", type: "tahsilat", amount: 15000, description: "Yönetim ücreti", date: "2026-01-25" },
  { id: 7, accountId: "5", account: "Mehmet Demir", type: "odeme", amount: 2400, description: "Avans ödemesi", date: "2026-01-24" },
]

export default function TransactionsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [txType, setTxType] = useState<TransactionType>("tahsilat")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "tahsilat" | "odeme">("all")

  const filteredTransactions = useMemo(() => {
    let result = transactions;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((tx) => tx.account.toLowerCase().includes(query) || tx.description.toLowerCase().includes(query))
    }
    if (filterType !== "all") {
      result = result.filter((tx) => tx.type === filterType)
    }
    return result;
  }, [searchQuery, filterType])

  const totalTahsilat = filteredTransactions.filter((tx) => tx.type === "tahsilat").reduce((sum, tx) => sum + tx.amount, 0)
  const totalOdeme = filteredTransactions.filter((tx) => tx.type === "odeme").reduce((sum, tx) => sum + tx.amount, 0)
  const kasaBakiyesi = totalTahsilat - totalOdeme

  // DİKKAT: 'max-w-6xl' SİLİNDİ, 'w-full' EKLENDİ
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
              {/* Form Alanları (Kısaltıldı, öncekiyle aynı) */}
              <div className="space-y-4">
                  <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right font-medium">Cari Adı</Label><Input className="col-span-3" /></div>
                  <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right font-medium">Tutar</Label><div className="col-span-3 relative"><Input className="pl-8" /><span className="absolute left-3 top-2.5 text-muted-foreground text-sm">₺</span></div></div>
                  <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right font-medium">Açıklama</Label><Input className="col-span-3" /></div>
                  <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right font-medium">Yöntem</Label><Select><SelectTrigger className="col-span-3"><SelectValue placeholder="Seçiniz" /></SelectTrigger><SelectContent><SelectItem value="cash">Nakit</SelectItem><SelectItem value="card">Kredi Kartı</SelectItem><SelectItem value="bank">Havale / EFT</SelectItem></SelectContent></Select></div>
              </div>
            </div>
            <DialogFooter>
               <Button type="submit" className={txType === 'tahsilat' ? 'bg-green-600 hover:bg-green-700' : 'bg-destructive hover:bg-destructive/90'}>{txType === 'tahsilat' ? 'Tahsilatı Kaydet' : 'Ödemeyi Kaydet'}</Button>
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
          {/* Tablo içeriği aynı */}
          <div className="overflow-hidden">
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent border-border"><TableHead className="w-28">Tarih</TableHead><TableHead>Hesap Adı</TableHead><TableHead>İşlem Tipi</TableHead><TableHead className="text-right">Tutar</TableHead><TableHead>Açıklama</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (<TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">İşlem bulunamadı.</TableCell></TableRow>) : (filteredTransactions.map((tx) => (
                    <TableRow key={tx.id} className="border-border group">
                      <TableCell className="text-muted-foreground font-medium">{formatDate(tx.date)}</TableCell>
                      <TableCell><Link to={`/accounts?id=${tx.accountId}`} className="font-medium text-foreground hover:text-primary hover:underline">{tx.account}</Link></TableCell>
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