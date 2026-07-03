import { useState } from "react"
import { Eye, Plus, MoreHorizontal, User, Star, Building2, Search, ArrowUp, ArrowDown, Trash2, Phone, Calendar, Copy, Pencil, Filter, Wallet, Printer, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Account } from "@/pages/AccountsPage"
import { addTransaction, getTransactionsByAccount, getAccounts } from "@/services/db"

const formatCurrency = (amount: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount)
const formatDate = (dateStr: string) => { const d = new Date(dateStr); return d.toLocaleDateString("tr-TR") + " " + d.toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' }); }

interface AccountsTableProps { data: Account[]; fullData: Account[]; onDelete: (id: string) => void; onEdit: (account: Account) => void; onRefresh: () => void; }

export function AccountsTable({ data, fullData, onDelete, onEdit, onRefresh }: AccountsTableProps) {
  const { toast } = useToast()

  const [filterText, setFilterText] = useState("")
  const [filterType, setFilterType] = useState<"all" | "individual" | "corporate">("all")
  const [filterBalance, setFilterBalance] = useState<"all" | "borclu" | "alacakli">("all")

  const [accountStartDate, setAccountStartDate] = useState("")
  const [accountEndDate, setAccountEndDate] = useState("")

  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [accountHistory, setAccountHistory] = useState<any[]>([])

  const [transactionAccount, setTransactionAccount] = useState<Account | null>(null)
  const [txType, setTxType] = useState<"tahsilat" | "odeme">("tahsilat")
  const [txAmount, setTxAmount] = useState("")
  const [txDesc, setTxDesc] = useState("")
  const [txDate, setTxDate] = useState("")
  const [txMethod, setTxMethod] = useState("Nakit")

  const [historyStartDate, setHistoryStartDate] = useState("")
  const [historyEndDate, setHistoryEndDate] = useState("")

  const copyPhone = (phone: string) => { navigator.clipboard.writeText(phone); toast({ title: "Kopyalandı", description: "Pano'ya alındı." }) }

  const loadAccountHistory = async (acc: Account) => {
    try {
      const history = await getTransactionsByAccount(acc.id);
      let rBorc = acc.borc || 0;
      let rAlacak = acc.alacak || 0;
      let rBakiye = acc.bakiye || 0;

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
    setSelectedAccount(account); setHistoryStartDate(""); setHistoryEndDate(""); await loadAccountHistory(account);
  }

  const openTransactionModal = (account: Account) => {
    setTransactionAccount(account);
    const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setTxDate(now.toISOString().slice(0, 16)); setTxAmount(""); setTxDesc(""); setTxMethod("Nakit");
  }

  const handleTransactionSave = async () => {
    if (!transactionAccount || !txAmount || !txDate) { toast({ title: "Hata", description: "Doldurun.", variant: "destructive" }); return }
    try {
      await addTransaction({
        accountId: transactionAccount.id, type: txType,
        amount: parseFloat(txAmount), description: txDesc || (txType === 'tahsilat' ? 'Tahsilat' : 'Ödeme'),
        date: txDate, method: txMethod
      });

      await new Promise(r => setTimeout(r, 100));
      onRefresh();

      if (selectedAccount && selectedAccount.id === transactionAccount.id) {
        const freshAccounts = await getAccounts();
        const freshAcc = freshAccounts.find(a => a.id === selectedAccount.id);
        if (freshAcc) { setSelectedAccount(freshAcc); await loadAccountHistory(freshAcc); }
      }
      setTransactionAccount(null); toast({ title: "Başarılı", description: "İşlem Kaydedildi" })
    } catch (e) { toast({ title: "Hata", variant: "destructive" }) }
  }

  const handlePrintHistory = () => {
    if (!selectedAccount) return;
    const printWindow = document.createElement('iframe');
    printWindow.style.position = 'absolute'; printWindow.style.top = '-1000px'; printWindow.style.left = '-1000px';
    document.body.appendChild(printWindow);
    const doc = printWindow.contentWindow?.document;
    if (!doc) return;

    const chronologicalHistory = [...displayedHistory].reverse();
    const transactionsHtml = chronologicalHistory.map(tx => `
      <tr>
        <td>${formatDate(tx.date)}</td>
        <td>${tx.description}</td>
        <td>${tx.method || 'Nakit'}</td>
        <td class="text-right text-red">${tx.type === 'odeme' ? formatCurrency(tx.amount) : '-'}</td>
        <td class="text-right text-green">${tx.type === 'tahsilat' ? formatCurrency(tx.amount) : '-'}</td>
        <td class="text-right font-bold">${formatCurrency(tx.snapshot.bakiye)}</td>
      </tr>
    `).join('');

    const dateRangeText = (historyStartDate || historyEndDate) ? `<p style="margin-top:5px; font-size: 13px; color:#ef4444; font-weight: bold;">Filtre: ${historyStartDate || 'Başlangıç'} / ${historyEndDate || 'Bugün'}</p>` : '';

    doc.write(`
      <html>
        <head>
          <title>${selectedAccount.name} - Hesap Ekstresi</title>
          <style>
            @page { margin: 0; }
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; margin: 1cm; }
            .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            h1 { font-size: 24px; margin: 0 0 5px 0; }
            .summary { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; }
            .summary-box { border: 1px solid #ddd; padding: 15px; border-radius: 8px; width: 30%; text-align: center; }
            .summary-box.balance { background-color: #f8fafc; font-weight: bold; border-color: #cbd5e1; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
            th { background-color: #f1f5f9; }
            .text-right { text-align: right; }
            .text-red { color: #dc2626; }
            .text-green { color: #16a34a; }
          </style>
        </head>
        <body>
          <div class="header"><h1>${selectedAccount.name}</h1><p style="margin:0; color:#666;">Telefon: ${selectedAccount.phone || '-'} | Ekstre</p>${dateRangeText}</div>
          <div class="summary">
            <div class="summary-box"><div style="font-size:11px; color:#666;">Toplam Borç</div><div style="font-size:18px; color:#dc2626; margin-top:5px;">${formatCurrency(selectedAccount.borc)}</div></div>
            <div class="summary-box"><div style="font-size:11px; color:#666;">Toplam Alacak</div><div style="font-size:18px; color:#16a34a; margin-top:5px;">${formatCurrency(selectedAccount.alacak)}</div></div>
            <div class="summary-box balance"><div style="font-size:11px; color:#333;">Net Bakiye</div><div style="font-size:18px; color:#0f172a; margin-top:5px;">${formatCurrency(selectedAccount.bakiye || 0)}</div></div>
          </div>
          <table>
            <thead><tr><th>Tarih</th><th>Açıklama</th><th>Yöntem</th><th class="text-right">Ödeme (-)</th><th class="text-right">Tahsilat (+)</th><th class="text-right">Genel Bakiye</th></tr></thead>
            <tbody>${transactionsHtml || '<tr><td colspan="6" style="text-align:center">Kayıt bulunamadı.</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `);
    doc.close();
    setTimeout(() => { printWindow.contentWindow?.focus(); printWindow.contentWindow?.print(); setTimeout(() => { document.body.removeChild(printWindow); }, 1000); }, 250);
  };

  const displayedHistory = accountHistory.filter(tx => {
    if (!historyStartDate && !historyEndDate) return true;
    const txDateOnly = tx.date.split('T')[0];
    if (historyStartDate && txDateOnly < historyStartDate) return false;
    if (historyEndDate && txDateOnly > historyEndDate) return false;
    return true;
  });

  const filteredData = data.filter((account) => {
    const search = filterText.toLowerCase();
    const matchesSearch = account.name.toLowerCase().includes(search) || (account.phone && account.phone.includes(filterText));
    const matchesType = filterType === "all" || account.type === filterType;

    let matchesDate = true;
    if (account.created_at && (accountStartDate || accountEndDate)) {
      const accDate = account.created_at.split(' ')[0].split('T')[0];
      if (accountStartDate && accDate < accountStartDate) matchesDate = false;
      if (accountEndDate && accDate > accountEndDate) matchesDate = false;
    }

    const netFark = (account.borc || 0) - (account.alacak || 0);
    let matchesBalance = true;
    if (filterBalance === "borclu") matchesBalance = netFark > 0;
    if (filterBalance === "alacakli") matchesBalance = netFark < 0;

    return matchesSearch && matchesType && matchesDate && matchesBalance;
  });

  const getOwnerName = (ownerId?: string | null) => {
    if (!ownerId) return null;
    const owner = fullData.find(a => a.id === ownerId);
    return owner ? owner.name : null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari adı veya telefon ile ara..." value={filterText} onChange={(e) => setFilterText(e.target.value)} className="pl-9" />
        </div>

        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-md border border-dashed w-full sm:w-auto">
          <Calendar className="h-4 w-4 text-muted-foreground ml-2 hidden sm:block" />
          <Input type="date" value={accountStartDate} onChange={e => setAccountStartDate(e.target.value)} className="h-8 text-xs bg-background w-full sm:w-32" />
          <span className="text-muted-foreground text-xs">-</span>
          <Input type="date" value={accountEndDate} onChange={e => setAccountEndDate(e.target.value)} className="h-8 text-xs bg-background w-full sm:w-32" />
          {(accountStartDate || accountEndDate) && (
            <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive" onClick={() => { setAccountStartDate(""); setAccountEndDate(""); }}>Temizle</Button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className={filterType !== 'all' || filterBalance !== 'all' ? 'border-primary text-primary bg-primary/5' : ''}>
              <Filter className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Cari Tipi</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={filterType === 'all'} onCheckedChange={() => setFilterType('all')}>Tümü</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={filterType === 'individual'} onCheckedChange={() => setFilterType('individual')}>Sadece Şahıslar</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={filterType === 'corporate'} onCheckedChange={() => setFilterType('corporate')}>Sadece Kurumlar</DropdownMenuCheckboxItem>

            <div className="mt-2" />

            <DropdownMenuLabel>Bakiye Durumu</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={filterBalance === 'all'} onCheckedChange={() => setFilterBalance('all')}>Tümü</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={filterBalance === 'borclu'} onCheckedChange={() => setFilterBalance('borclu')}>
              <span className="text-green-600 font-medium">Borçlular</span>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={filterBalance === 'alacakli'} onCheckedChange={() => setFilterBalance('alacakli')}>
              <span className="text-destructive font-medium">Alacaklılar</span>
            </DropdownMenuCheckboxItem>
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
              <TableHead className="text-right">Genel Bakiye</TableHead>
              <TableHead className="text-right text-primary">Net Durum</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (<TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Kayıt bulunamadı.</TableCell></TableRow>) : (
              filteredData.map((account) => {
                const netFark = (account.borc || 0) - (account.alacak || 0);

                return (
                  <TableRow key={account.id}>
                    <TableCell><div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${account.type === 'corporate' ? 'bg-green-500/10 text-green-700' : account.type === 'customer' ? 'bg-purple-500/10 text-purple-700' : 'bg-primary/10 text-primary'}`}>{account.type === "individual" ? <User className="h-4 w-4" /> : account.type === "customer" ? <Star className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}</div></TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        {account.name}
                        {account.type === 'customer' && <Badge variant="secondary" className="text-[9px] px-1.5 h-4 py-0 bg-purple-100 text-purple-700 border-purple-200">VIP / Özel</Badge>}
                      </div>
                      {account.type === 'corporate' && account.owner_id && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5"><ShieldCheck className="h-3 w-3" /> {getOwnerName(account.owner_id)}</div>
                      )}
                      <div className="text-xs text-muted-foreground">{account.phone}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{account.type === 'customer' ? (account.customer_group || "-") : (account.city || "-")}</TableCell>
                    <TableCell className="text-right text-destructive font-medium">{formatCurrency(account.borc)}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">{formatCurrency(account.alacak)}</TableCell>
                    <TableCell className="text-right font-semibold text-foreground">{formatCurrency(account.bakiye || 0)}</TableCell>
                    <TableCell className="text-right">
                      <div className={`font-bold text-base ${netFark > 0 ? 'text-green-600' : netFark < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {formatCurrency(Math.abs(netFark))}
                      </div>
                      {netFark > 0 && <Badge variant="outline" className="text-[10px] py-0 border-green-600 text-green-600">BORÇLU</Badge>}
                      {netFark < 0 && <Badge variant="outline" className="text-[10px] py-0 border-destructive text-destructive">ALACAKLI</Badge>}
                      {netFark === 0 && <span className="text-[10px] text-muted-foreground">KAPALI</span>}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetails(account)}><Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openTransactionModal(account)}><Plus className="h-4 w-4" /></Button>
                        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => copyPhone(account.phone)}><Copy className="mr-2 h-4 w-4" /> Kopyala</DropdownMenuItem><DropdownMenuItem onClick={() => onEdit(account)}><Pencil className="mr-2 h-4 w-4" /> Düzenle</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => onDelete(account.id)}><Trash2 className="mr-2 h-4 w-4" /> Sil</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
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
        <SheetContent className="sm:max-w-[600px] w-full overflow-y-auto">
          {selectedAccount && (
            <div className="space-y-6 mt-6">
              <div className="flex items-center gap-4 p-5 rounded-xl border bg-card shadow-sm">
                <div className={`flex h-14 w-14 items-center justify-center rounded-full border ${selectedAccount.type === 'corporate' ? 'bg-green-100 text-green-700' : selectedAccount.type === 'customer' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{selectedAccount.type === "individual" ? <User className="h-7 w-7" /> : selectedAccount.type === "customer" ? <Star className="h-7 w-7" /> : <Building2 className="h-7 w-7" />}</div>
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    {selectedAccount.name}
                    {selectedAccount.type === 'customer' && <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">VIP / Özel Müşteri</Badge>}
                  </h3>
                  {selectedAccount.type === 'corporate' && selectedAccount.owner_id && (
                    <div className="flex items-center gap-1 text-sm text-primary font-medium mt-0.5"><ShieldCheck className="h-4 w-4" /> Sahibi: {getOwnerName(selectedAccount.owner_id)}</div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 cursor-pointer hover:text-primary" onClick={() => copyPhone(selectedAccount.phone)}><Phone className="h-3 w-3" />{selectedAccount.phone}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border bg-card shadow-sm text-center"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Toplam Borç</span><div className="text-lg font-bold text-destructive mt-1">{formatCurrency(selectedAccount.borc)}</div></div>
                <div className="p-3 rounded-xl border bg-card shadow-sm text-center"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Toplam Alacak</span><div className="text-lg font-bold text-green-600 mt-1">{formatCurrency(selectedAccount.alacak)}</div></div>
                <div className="p-3 rounded-xl border bg-primary/10 shadow-sm text-center"><span className="text-[10px] font-bold text-primary uppercase flex justify-center gap-1"><Wallet className="h-3 w-3" /> Net Bakiye</span><div className="text-lg font-bold text-primary mt-1">{formatCurrency(selectedAccount.bakiye || 0)}</div></div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3 border-b pb-2 mt-2">
                  <h4 className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" /> Hesap Ekstresi</h4>
                  <Button variant="outline" size="sm" onClick={handlePrintHistory} className="h-8 gap-1.5"><Printer className="h-3.5 w-3.5" /> Yazdır</Button>
                </div>

                <div className="flex items-center gap-2 mb-4 bg-muted/30 p-2 rounded-md border border-dashed">
                  <Input type="date" value={historyStartDate} onChange={(e) => setHistoryStartDate(e.target.value)} className="h-8 text-xs bg-background" />
                  <span className="text-muted-foreground text-xs">-</span>
                  <Input type="date" value={historyEndDate} onChange={(e) => setHistoryEndDate(e.target.value)} className="h-8 text-xs bg-background" />
                  {(historyStartDate || historyEndDate) && (<Button variant="ghost" size="sm" className="h-8 px-2 text-destructive" onClick={() => { setHistoryStartDate(""); setHistoryEndDate(""); }}>Temizle</Button>)}
                </div>

                <div className="space-y-3">
                  {displayedHistory.length === 0 ? (
                    <div className="text-sm text-center py-4 border rounded-lg border-dashed text-muted-foreground">İşlem bulunamadı.</div>
                  ) : (
                    displayedHistory.map((tx, i) => {
                      return (
                        <div key={i} className="flex flex-col p-4 rounded-xl border bg-card/50 shadow-sm transition-all hover:shadow-md">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${tx.type === 'tahsilat' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-destructive'}`}>
                                {tx.type === 'tahsilat' ? <ArrowDown className="h-5 w-5" /> : <ArrowUp className="h-5 w-5" />}
                              </div>
                              <div>
                                <p className="text-base font-semibold flex items-center gap-2">
                                  {tx.description}
                                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 py-0 font-medium">{tx.method}</Badge>
                                </p>
                                <p className="text-sm text-muted-foreground mt-0.5">{formatDate(tx.date)}</p>
                              </div>
                            </div>
                            <div className={`font-bold text-lg ${tx.type === 'tahsilat' ? 'text-green-600' : 'text-destructive'}`}>
                              {/* "Tahsilat" veya "Ödeme" olarak değiştirildi */}
                              {tx.type === 'tahsilat' ? 'Tahsilat: +' : 'Ödeme: -'}{formatCurrency(tx.amount)}
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-3 border-t border-dashed text-xs text-muted-foreground">
                            <span className="font-medium">İşlem Sonrası:</span>
                            <div className="flex gap-4">
                              <span className="text-destructive/90">Borç: <span className="font-semibold text-destructive">{formatCurrency(tx.snapshot.borc)}</span></span>
                              <span className="text-green-600/90">Alacak: <span className="font-semibold text-green-600">{formatCurrency(tx.snapshot.alacak)}</span></span>
                              <span className="font-bold text-primary">Genel Bakiye: {formatCurrency(tx.snapshot.bakiye)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

              </div>
              <Button className="w-full py-6 text-base mt-4" onClick={() => openTransactionModal(selectedAccount)}><Plus className="mr-2 h-5 w-5" /> Yeni İşlem Ekle</Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* İŞLEM MODALI (ARTı İKONU İLE AÇILAN) */}
      {transactionAccount && (
        <Dialog open={!!transactionAccount} onOpenChange={(open) => !open && setTransactionAccount(null)}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader><DialogTitle>Yeni İşlem Ekle</DialogTitle><DialogDescription className="font-semibold text-primary">{transactionAccount.name}</DialogDescription></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setTxType('tahsilat')} className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${txType === 'tahsilat' ? 'border-green-600 bg-green-50 text-green-700' : 'border-muted opacity-60 hover:opacity-100'}`}><span className="text-sm font-bold">Tahsilat (Giren)</span></button>
                <button onClick={() => setTxType('odeme')} className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${txType === 'odeme' ? 'border-destructive bg-red-50 text-destructive' : 'border-muted opacity-60 hover:opacity-100'}`}><span className="text-sm font-bold">Ödeme (Çıkan)</span></button>
              </div>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Tutar</Label><Input autoComplete="off" type="number" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="0.00" autoFocus /></div>
                <div className="space-y-1"><Label>Tarih ve Saat</Label><Input autoComplete="off" type="datetime-local" value={txDate} onChange={e => setTxDate(e.target.value)} /></div>
                <div className="space-y-1">
                  <Label>Ödeme Yöntemi</Label>
                  <Select value={txMethod} onValueChange={setTxMethod}>
                    <SelectTrigger><SelectValue placeholder="Yöntem Seçin" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nakit">Nakit</SelectItem>
                      <SelectItem value="Havale/EFT">Havale / EFT</SelectItem>
                      <SelectItem value="Kredi Kartı">Kredi Kartı</SelectItem>
                      <SelectItem value="Çek">Çek</SelectItem>
                      <SelectItem value="Senet">Senet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Açıklama</Label><Input autoComplete="off" value={txDesc} onChange={e => setTxDesc(e.target.value)} placeholder={txType === 'tahsilat' ? 'Örn: Nakit tahsilat' : 'Örn: Malzeme ödemesi'} /></div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setTransactionAccount(null)}>İptal</Button><Button onClick={handleTransactionSave}>İşlemi Kaydet</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}