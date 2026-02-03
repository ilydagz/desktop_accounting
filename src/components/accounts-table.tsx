"use client"
import { useState } from "react"
import { Eye, Plus, MoreHorizontal, User, Building2, Search, Filter, ArrowUp, ArrowDown, Copy, Pencil, Trash2 } from "lucide-react" // ArrowUpRight ve ArrowDownRight SİLİNDİ
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

// --- TİPLER ---
type Account = {
  id: string
  type: "individual" | "corporate"
  name: string
  phone: string
  borc: number
  alacak: number
}

// --- ÖRNEK VERİLER ---
const data: Account[] = [
  { id: "1", type: "individual", name: "Ahmet Yılmaz", phone: "+90 532 123 4567", borc: 0, alacak: 15250.5 },
  { id: "2", type: "corporate", name: "ABC İnşaat Ltd.", phone: "+90 212 987 6543", borc: 42800, alacak: 0 },
  { id: "3", type: "individual", name: "Fatma Kaya", phone: "+90 535 456 7890", borc: 1200, alacak: 10120.75 },
  { id: "4", type: "corporate", name: "Yıldız Apartmanı", phone: "+90 216 345 6789", borc: 0, alacak: 125430 },
  { id: "5", type: "individual", name: "Mehmet Demir", phone: "+90 533 234 5678", borc: 8200.25, alacak: 5000 },
  { id: "6", type: "corporate", name: "Güneş Sitesi", phone: "+90 312 456 7891", borc: 12000, alacak: 79890 },
  { id: "7", type: "individual", name: "Ayşe Çelik", phone: "+90 537 678 9012", borc: 0, alacak: 4500 },
  { id: "8", type: "corporate", name: "Merkez İş Hanı", phone: "+90 232 789 0123", borc: 28750.5, alacak: 10000 },
]

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount)
}

export function AccountsTable() {
  const { toast } = useToast()
  const [filterText, setFilterText] = useState("")
  const [filterType, setFilterType] = useState<"all" | "individual" | "corporate">("all")
  
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [transactionAccount, setTransactionAccount] = useState<Account | null>(null)
  
  const [txType, setTxType] = useState<"tahsilat" | "odeme">("tahsilat")

  const filteredData = data.filter((account) => {
    const matchesText = account.name.toLowerCase().includes(filterText.toLowerCase()) || account.phone.includes(filterText)
    const matchesType = filterType === "all" || account.type === filterType
    return matchesText && matchesType
  })

  // Telefon Kopyalama İşlemi
  const copyPhone = (phone: string, name: string) => {
    navigator.clipboard.writeText(phone)
    toast({
      title: "✅ Kopyalandı",
      description: `${name}: ${phone}`,
      duration: 3000,
    })
  }

  // Silme işlemi
  const handleDelete = (name: string) => {
    toast({
        variant: "destructive",
        title: "İşlem Başarısız",
        // DÜZELTME: 'name' değişkeni artık burada kullanılıyor
        description: `${name} silinemedi. Veritabanı bağlı değil.`,
    })
  }

  return (
    <div className="space-y-4">
      {/* Arama ve Filtreler */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ad veya telefon ara..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="pl-9 w-full md:max-w-sm"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 hidden md:flex">
              <Filter className="h-4 w-4" />
              {filterType === 'all' ? 'Tüm Tipler' : filterType === 'individual' ? 'Şahıslar' : 'Kurumlar'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Cari Tipi Seçin</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={filterType === 'all'} onCheckedChange={() => setFilterType('all')}>
              Tümü
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={filterType === 'individual'} onCheckedChange={() => setFilterType('individual')}>
              Şahıslar (Bireysel)
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={filterType === 'corporate'} onCheckedChange={() => setFilterType('corporate')}>
              Kurumlar (Şirket)
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* TABLO */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Ad / Ünvan</TableHead>
              <TableHead className="hidden md:table-cell">Telefon</TableHead>
              <TableHead className="text-right text-destructive">Borç</TableHead>
              <TableHead className="text-right text-green-600">Alacak</TableHead>
              <TableHead className="text-right">Bakiye</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((account) => {
              const bakiye = account.alacak - account.borc
              return (
                <TableRow key={account.id} className="group">
                  <TableCell>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                      account.type === 'corporate' 
                        ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' 
                        : 'bg-primary/10 border-primary/20 text-primary'
                    }`}>
                      {account.type === "individual" ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {account.name}
                    <div className="md:hidden text-xs text-muted-foreground">{account.phone}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {account.phone}
                  </TableCell>
                  <TableCell className="text-right text-destructive font-medium">
                    {account.borc > 0 ? `-${formatCurrency(account.borc)}` : "-"}
                  </TableCell>
                  <TableCell className="text-right text-green-600 font-medium">
                    {account.alacak > 0 ? `+${formatCurrency(account.alacak)}` : "-"}
                  </TableCell>
                  <TableCell className={`text-right font-bold ${bakiye >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {formatCurrency(bakiye)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setSelectedAccount(account)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setTransactionAccount(account)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => copyPhone(account.phone, account.name)}>
                            <Copy className="mr-2 h-4 w-4" /> Telefonu Kopyala
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toast({ title: "Düzenle", description: "Bu özellik veritabanı bağlandığında aktif olacak." })}>
                            <Pencil className="mr-2 h-4 w-4" /> Düzenle
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(account.name)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* --- DETAY PENCERESİ --- */}
      <Sheet open={!!selectedAccount} onOpenChange={(open) => !open && setSelectedAccount(null)}>
        <SheetContent className="sm:max-w-[500px] w-full">
          <SheetHeader>
            <SheetTitle>Cari Detayı</SheetTitle>
            <SheetDescription>
              Hesap hareketleri ve genel durum.
            </SheetDescription>
          </SheetHeader>
          
          {selectedAccount && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center gap-4 p-5 rounded-xl bg-muted/40 border">
                 <div className={`flex h-14 w-14 items-center justify-center rounded-full border ${
                      selectedAccount.type === 'corporate' 
                        ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' 
                        : 'bg-primary/10 border-primary/20 text-primary'
                    }`}>
                      {selectedAccount.type === "individual" ? <User className="h-7 w-7" /> : <Building2 className="h-7 w-7" />}
                 </div>
                 <div>
                    <h3 className="font-semibold text-xl">{selectedAccount.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 cursor-pointer hover:text-primary" onClick={() => copyPhone(selectedAccount.phone, selectedAccount.name)}>
                        <Copy className="h-3 w-3" />
                        {selectedAccount.phone}
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 rounded-xl border bg-card shadow-sm">
                    <span className="text-xs font-medium text-muted-foreground uppercase">Toplam Borç</span>
                    <div className="text-2xl font-bold text-destructive mt-1">
                        {formatCurrency(selectedAccount.borc)}
                    </div>
                 </div>
                 <div className="p-4 rounded-xl border bg-card shadow-sm">
                    <span className="text-xs font-medium text-muted-foreground uppercase">Toplam Alacak</span>
                    <div className="text-2xl font-bold text-green-600 mt-1">
                        {formatCurrency(selectedAccount.alacak)}
                    </div>
                 </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold mb-3">Son Hareketler (Demo)</h4>
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm p-3 rounded-lg border bg-background/50">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <ArrowUp className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-medium">Tahsilat (Nakit)</span>
                                <span className="text-xs text-muted-foreground">Bugün, 14:30</span>
                            </div>
                        </div>
                        <span className="font-bold text-green-600">+₺1,250.00</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm p-3 rounded-lg border bg-background/50">
                         <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <ArrowDown className="h-4 w-4 text-destructive" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-medium">Ödeme (Havale)</span>
                                <span className="text-xs text-muted-foreground">Dün, 09:15</span>
                            </div>
                        </div>
                        <span className="font-bold text-destructive">-₺3,400.00</span>
                    </div>
                </div>
              </div>

              <Button className="w-full h-11 text-base" onClick={() => {
                  setTransactionAccount(selectedAccount);
                  setSelectedAccount(null);
              }}>
                <Plus className="mr-2 h-4 w-4" /> Yeni İşlem Ekle
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* --- YENİ İŞLEM PENCERESİ --- */}
      <Dialog open={!!transactionAccount} onOpenChange={(open) => !open && setTransactionAccount(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Yeni İşlem Ekle</DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-foreground">{transactionAccount?.name}</span> için işlem yapıyorsunuz.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            
            <div className="grid grid-cols-2 gap-4">
               <button
                  type="button"
                  onClick={() => setTxType('tahsilat')}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    txType === 'tahsilat'
                      ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'border-muted hover:border-green-200 text-muted-foreground'
                  }`}
               >
                  <ArrowUp className={`h-6 w-6 ${txType === 'tahsilat' ? 'text-green-600' : ''}`} />
                  <span className="font-semibold text-sm">Tahsilat (Al)</span>
               </button>

               <button
                  type="button"
                  onClick={() => setTxType('odeme')}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    txType === 'odeme'
                      ? 'border-destructive bg-red-50 dark:bg-red-900/20 text-destructive'
                      : 'border-muted hover:border-red-200 text-muted-foreground'
                  }`}
               >
                  <ArrowDown className={`h-6 w-6 ${txType === 'odeme' ? 'text-destructive' : ''}`} />
                  <span className="font-semibold text-sm">Ödeme (Ver)</span>
               </button>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right font-medium">
                    Tutar
                </Label>
                <div className="col-span-3 relative">
                    <Input id="amount" placeholder="0.00" className="pl-8" />
                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">₺</span>
                </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="desc" className="text-right font-medium">
                    Açıklama
                </Label>
                <Input id="desc" placeholder="Örn: Kira bedeli" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="method" className="text-right font-medium">
                    Yöntem
                </Label>
                <Select>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
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
            <Button type="submit" className={txType === 'tahsilat' ? 'bg-green-600 hover:bg-green-700' : 'bg-destructive hover:bg-destructive/90'}>
                {txType === 'tahsilat' ? 'Tahsilatı Kaydet' : 'Ödemeyi Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}