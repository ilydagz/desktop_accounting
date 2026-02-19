import { useState } from "react"
import { Eye, Plus, MoreHorizontal, User, Building2, Search, ArrowUp, ArrowDown, Trash2, Phone, Calendar, Copy, Pencil, Mail, MapPin, CreditCard, FileText, Home, Filter, Wallet, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Account } from "@/pages/AccountsPage"
import { addTransaction, getTransactionsByAccount, getAccounts } from "@/services/db"

const formatCurrency = (amount: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount)
const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("tr-TR") + " " + d.toLocaleTimeString("tr-TR", {hour: '2-digit', minute:'2-digit'});
}

interface AccountsTableProps {
    data: Account[];
    onDelete: (id: string) => void;
    onEdit: (account: Account) => void; 
    onRefresh: () => void;
}

export function AccountsTable({ data, onDelete, onEdit, onRefresh }: AccountsTableProps) {
  const { toast } = useToast()
  const [filterText, setFilterText] = useState("")
  const [filterType, setFilterType] = useState<"all" | "individual" | "corporate">("all")
  
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [accountHistory, setAccountHistory] = useState<any[]>([])
  
  const [transactionAccount, setTransactionAccount] = useState<Account | null>(null)
  const [txType, setTxType] = useState<"tahsilat" | "odeme">("tahsilat")
  const [txAmount, setTxAmount] = useState("")
  const [txDesc, setTxDesc] = useState("")
  const [txDate, setTxDate] = useState("")

  const [historyStartDate, setHistoryStartDate] = useState("")
  const [historyEndDate, setHistoryEndDate] = useState("")

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone)
    toast({ title: "Kopyalandı", description: "Telefon numarası panoya alındı." })
  }

  const loadAccountHistory = async (acc: Account) => {
      try {
          const history = await getTransactionsByAccount(acc.id);
          
          let rBorc = acc.borc;
          let rAlacak = acc.alacak;
          let rBakiye = acc.bakiye;
          
          const enrichedHistory = history.map(tx => {
              const snapshot = { borc: rBorc, alacak: rAlacak, bakiye: rBakiye };
              
              if (tx.type === 'tahsilat') {
                  rAlacak -= tx.amount;
                  rBakiye -= tx.amount;
              } else {
                  rBorc -= tx.amount;
                  rBakiye += tx.amount;
              }
              
              return { ...tx, snapshot };
          });

          setAccountHistory(enrichedHistory);
      } catch (e) { console.error(e); }
  }

  const handleViewDetails = async (account: Account) => {
      setSelectedAccount(account);
      setHistoryStartDate("");
      setHistoryEndDate("");
      await loadAccountHistory(account);
  }

  const openTransactionModal = (account: Account) => {
    setTransactionAccount(account);
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setTxDate(now.toISOString().slice(0, 16));
    setTxAmount(""); setTxDesc("");
  }

  const handleTransactionSave = async () => {
    if (!transactionAccount || !txAmount || !txDate) {
        toast({ title: "Hata", description: "Lütfen tutar ve tarih giriniz.", variant: "destructive" }); return
    }
    try {
        await addTransaction({
            accountId: Number(transactionAccount.id),
            type: txType,
            amount: parseFloat(txAmount),
            description: txDesc || (txType === 'tahsilat' ? 'Tahsilat' : 'Ödeme'),
            date: txDate
        });
        
        onRefresh(); 
        
        if (selectedAccount && selectedAccount.id === transactionAccount.id) {
            const freshAccounts = await getAccounts();
            const freshAcc = freshAccounts.find(a => a.id === selectedAccount.id);
            if (freshAcc) {
                setSelectedAccount(freshAcc);
                await loadAccountHistory(freshAcc);
            }
        }
        
        setTransactionAccount(null);
        toast({ title: "Başarılı", description: "İşlem kaydedildi." })
    } catch (e) { toast({ title: "Hata", description: "Kaydedilemedi.", variant: "destructive" }) }
  }

  const displayedHistory = accountHistory.filter(tx => {
    if (!historyStartDate && !historyEndDate) return true;
    const txDateOnly = tx.date.split('T')[0];
    if (historyStartDate && txDateOnly < historyStartDate) return false;
    if (historyEndDate && txDateOnly > historyEndDate) return false;
    return true;
  });

  // --- YAZDIRMA EKRANI GÜNCELLENDİ (Kronolojik Sıra) ---
  const handlePrintHistory = () => {
    if (!selectedAccount) return;

    const printWindow = document.createElement('iframe');
    printWindow.style.position = 'absolute';
    printWindow.style.top = '-1000px';
    printWindow.style.left = '-1000px';
    document.body.appendChild(printWindow);

    const doc = printWindow.contentWindow?.document;
    if (!doc) return;

    // BURASI DEĞİŞTİ: Yazdırırken mantıklı olması için listeyi eskiden yeniye doğru (reverse) çeviriyoruz.
    const chronologicalHistory = [...displayedHistory].reverse();

    const transactionsHtml = chronologicalHistory.map(tx => `
      <tr>
        <td>${formatDate(tx.date)}</td>
        <td>${tx.description}</td>
        <td class="text-right" style="color: ${tx.type === 'tahsilat' ? '#16a34a' : '#dc2626'}">
          ${tx.type === 'tahsilat' ? '+' : '-'}${formatCurrency(tx.amount)}
        </td>
        <td class="text-right font-bold">${formatCurrency(tx.snapshot.bakiye)}</td>
      </tr>
    `).join('');

    const dateRangeText = (historyStartDate || historyEndDate) 
      ? `<p style="margin-top:5px; font-size: 13px; color:#ef4444; font-weight: bold;">Filtrelenmiş Tarih: ${historyStartDate ? new Date(historyStartDate).toLocaleDateString('tr-TR') : 'Başlangıç'} / ${historyEndDate ? new Date(historyEndDate).toLocaleDateString('tr-TR') : 'Bugün'}</p>` 
      : '';

    doc.write(`
      <html>
        <head>
          <title>${selectedAccount.name} - Hesap Ekstresi</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            h1 { font-size: 24px; margin: 0 0 5px 0; }
            .summary { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; }
            .summary-box { border: 1px solid #ddd; padding: 15px; border-radius: 8px; width: 30%; text-align: center; }
            .summary-box.balance { background-color: #f8fafc; font-weight: bold; border-color: #cbd5e1; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 14px; }
            th { background-color: #f1f5f9; }
            .text-right { text-align: right; }
            .print-date { font-size: 12px; color: #666; text-align: right; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${selectedAccount.name}</h1>
            <p style="margin:0; color:#666;">Telefon: ${selectedAccount.phone || '-'} | Hesap Ekstresi (Eskiden Yeniye)</p>
            ${dateRangeText}
          </div>
          
          <div class="summary">
            <div class="summary-box">
              <div style="font-size:11px; color:#666; text-transform:uppercase;">Toplam Borç</div>
              <div style="font-size:18px; color:#dc2626; margin-top:5px;">${formatCurrency(selectedAccount.borc)}</div>
            </div>
            <div class="summary-box">
              <div style="font-size:11px; color:#666; text-transform:uppercase;">Toplam Alacak</div>
              <div style="font-size:18px; color:#16a34a; margin-top:5px;">${formatCurrency(selectedAccount.alacak)}</div>
            </div>
            <div class="summary-box balance">
              <div style="font-size:11px; color:#333; text-transform:uppercase;">Net Bakiye</div>
              <div style="font-size:18px; color:#0f172a; margin-top:5px;">${formatCurrency(selectedAccount.bakiye || 0)}</div>
            </div>
          </div>

          <h3>İşlem Geçmişi (Ekstre)</h3>
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Açıklama</th>
                <th class="text-right">Tutar</th>
                <th class="text-right">İşlem Sonrası Bakiye</th>
              </tr>
            </thead>
            <tbody>
              ${transactionsHtml || '<tr><td colspan="4" style="text-align:center">Belirtilen tarihlerde işlem kaydı bulunamadı.</td></tr>'}
            </tbody>
          </table>

          <div class="print-date">
            Yazdırılma Tarihi: ${new Date().toLocaleString('tr-TR')}
          </div>
        </body>
      </html>
    `);
    doc.close();

    printWindow.contentWindow?.focus();
    printWindow.contentWindow?.print();
    setTimeout(() => { document.body.removeChild(printWindow); }, 1000);
  };

  const filteredData = data.filter((account) => {
    const search = filterText.toLowerCase();
    const matchesSearch = account.name.toLowerCase().includes(search) || (account.phone && account.phone.includes(filterText));
    const matchesType = filterType === "all" || account.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
         <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari adı veya telefon ile ara..." value={filterText} onChange={(e) => setFilterText(e.target.value)} className="pl-9" />
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className={filterType !== 'all' ? 'text-primary border-primary bg-primary/5' : ''}><Filter className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Cari Tipi</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={filterType === 'all'} onCheckedChange={() => setFilterType('all')}>Tümü</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={filterType === 'individual'} onCheckedChange={() => setFilterType('individual')}><User className="mr-2 h-4 w-4" /> Sadece Şahıslar</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={filterType === 'corporate'} onCheckedChange={() => setFilterType('corporate')}><Building2 className="mr-2 h-4 w-4" /> Sadece Kurumlar</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Ad / Ünvan</TableHead>
              <TableHead className="hidden md:table-cell">Şehir</TableHead>
              <TableHead className="text-right text-destructive">Borç</TableHead>
              <TableHead className="text-right text-green-600">Alacak</TableHead>
              <TableHead className="text-right text-primary">Bakiye</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Kayıt bulunamadı.</TableCell></TableRow>
            ) : (
                filteredData.map((account) => {
                const bakiye = account.bakiye || 0;
                return (
                    <TableRow key={account.id}>
                    <TableCell><div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${account.type === 'corporate' ? 'bg-green-500/10 text-green-700' : 'bg-primary/10 text-primary'}`}>{account.type === "individual" ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}</div></TableCell>
                    <TableCell className="font-medium">{account.name}<div className="text-xs text-muted-foreground">{account.phone}</div></TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{account.city || "-"}</TableCell>
                    <TableCell className="text-right text-destructive font-medium">{formatCurrency(account.borc)}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">{formatCurrency(account.alacak)}</TableCell>
                    <TableCell className={`text-right font-bold ${bakiye >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(bakiye)}</TableCell>
                    <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetails(account)}><Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openTransactionModal(account)}><Plus className="h-4 w-4" /></Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => copyPhone(account.phone)}><Copy className="mr-2 h-4 w-4" /> Telefonu Kopyala</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(account)}><Pencil className="mr-2 h-4 w-4" /> Düzenle</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(account.id)}><Trash2 className="mr-2 h-4 w-4" /> Sil</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </div>
                    </TableCell>
                    </TableRow>
                )
                })
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selectedAccount} onOpenChange={(open) => !open && setSelectedAccount(null)}>
        <SheetContent className="sm:max-w-[500px] w-full overflow-y-auto">
          <SheetHeader className="mb-6"><SheetTitle>Cari Detayı</SheetTitle><SheetDescription>Kayıtlı bilgiler ve işlem geçmişi.</SheetDescription></SheetHeader>
          {selectedAccount && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-5 rounded-xl border bg-card shadow-sm">
                 <div className={`flex h-14 w-14 items-center justify-center rounded-full border ${selectedAccount.type === 'corporate' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{selectedAccount.type === "individual" ? <User className="h-7 w-7" /> : <Building2 className="h-7 w-7" />}</div>
                 <div><h3 className="font-bold text-lg">{selectedAccount.name}</h3><div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 cursor-pointer hover:text-primary" onClick={() => copyPhone(selectedAccount.phone)}><Phone className="h-3 w-3" />{selectedAccount.phone}</div></div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                 <div className="p-3 rounded-xl border bg-card shadow-sm text-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Toplam Borç</span>
                    <div className="text-lg font-bold text-destructive mt-1">{formatCurrency(selectedAccount.borc)}</div>
                 </div>
                 <div className="p-3 rounded-xl border bg-card shadow-sm text-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Toplam Alacak</span>
                    <div className="text-lg font-bold text-green-600 mt-1">{formatCurrency(selectedAccount.alacak)}</div>
                 </div>
                 <div className="p-3 rounded-xl border bg-primary/10 shadow-sm text-center">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center justify-center gap-1"><Wallet className="h-3 w-3"/> Net Bakiye</span>
                    <div className="text-lg font-bold text-primary mt-1">{formatCurrency(selectedAccount.bakiye || 0)}</div>
                 </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3 border-b pb-2 mt-2">
                    <h4 className="font-semibold flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" /> 
                        Hesap Ekstresi
                    </h4>
                    <Button variant="outline" size="sm" onClick={handlePrintHistory} className="h-8 gap-1.5">
                        <Printer className="h-3.5 w-3.5" />
                        Yazdır
                    </Button>
                </div>
                
                <div className="flex items-center gap-2 mb-4 bg-muted/30 p-2 rounded-md border border-dashed">
                    <Input type="date" value={historyStartDate} onChange={(e) => setHistoryStartDate(e.target.value)} className="h-8 text-xs bg-background" />
                    <span className="text-muted-foreground text-xs">-</span>
                    <Input type="date" value={historyEndDate} onChange={(e) => setHistoryEndDate(e.target.value)} className="h-8 text-xs bg-background" />
                    {(historyStartDate || historyEndDate) && (
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive" onClick={() => { setHistoryStartDate(""); setHistoryEndDate(""); }}>Temizle</Button>
                    )}
                </div>

                <div className="space-y-3">
                    {displayedHistory.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">Belirtilen tarihte işlem bulunamadı.</div>
                    ) : (
                        displayedHistory.map((tx, i) => (
                        <div key={i} className="flex flex-col p-3 rounded-lg border bg-card/50 hover:bg-muted/50 transition-colors">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${tx.type === 'tahsilat' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-destructive'}`}>
                                      {tx.type === 'tahsilat' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                                  </div>
                                  <div>
                                      <p className="text-sm font-medium">{tx.description}</p>
                                      <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                                  </div>
                              </div>
                              <div className={`font-bold text-sm ${tx.type === 'tahsilat' ? 'text-green-600' : 'text-destructive'}`}>
                                  {tx.type === 'tahsilat' ? '+' : '-'}{formatCurrency(tx.amount)}
                              </div>
                           </div>
                           <div className="flex items-center justify-between mt-3 pt-2 border-t border-dashed text-[11px] text-muted-foreground">
                              <span>İşlem Sonrası:</span>
                              <div className="flex gap-3">
                                 <span className="text-destructive/80">Borç: <span className="font-medium text-destructive">{formatCurrency(tx.snapshot.borc)}</span></span>
                                 <span className="text-green-600/80">Alacak: <span className="font-medium text-green-600">{formatCurrency(tx.snapshot.alacak)}</span></span>
                                 <span className="font-semibold text-primary/80">Bakiye: <span className="text-primary">{formatCurrency(tx.snapshot.bakiye)}</span></span>
                              </div>
                           </div>
                        </div>
                        ))
                    )}
                </div>
              </div>

              <Button className="w-full py-6 text-base shadow-lg" onClick={() => openTransactionModal(selectedAccount)}><Plus className="mr-2 h-5 w-5" /> Yeni İşlem Ekle</Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {transactionAccount && (
      <Dialog open={!!transactionAccount} onOpenChange={(open) => !open && setTransactionAccount(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Yeni İşlem Ekle</DialogTitle><DialogDescription className="font-semibold text-primary">{transactionAccount.name}</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4"><div className="grid grid-cols-2 gap-4"><button onClick={() => setTxType('tahsilat')} className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${txType === 'tahsilat' ? 'border-green-600 bg-green-50 text-green-700' : 'border-muted opacity-60 hover:opacity-100'}`}><ArrowUp className="h-6 w-6"/><span className="text-sm font-bold">Tahsilat (Al)</span></button><button onClick={() => setTxType('odeme')} className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${txType === 'odeme' ? 'border-destructive bg-red-50 text-destructive' : 'border-muted opacity-60 hover:opacity-100'}`}><ArrowDown className="h-6 w-6"/><span className="text-sm font-bold">Ödeme (Ver)</span></button></div><div className="space-y-3"><div className="space-y-1"><Label>Tutar</Label><Input type="number" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="0.00" autoFocus /></div><div className="space-y-1"><Label>Tarih ve Saat</Label><Input type="datetime-local" value={txDate} onChange={e => setTxDate(e.target.value)} /></div><div className="space-y-1"><Label>Açıklama</Label><Input value={txDesc} onChange={e => setTxDesc(e.target.value)} placeholder={txType === 'tahsilat' ? 'Tahsilat açıklaması...' : 'Ödeme açıklaması...'} /></div></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setTransactionAccount(null)}>İptal</Button><Button onClick={handleTransactionSave}>İşlemi Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </div>
  )
}