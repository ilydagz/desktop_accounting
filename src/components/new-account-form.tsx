"use client"

import { useState } from "react"
import { ChevronDown, User, Building2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

type AccountMode = "individual" | "corporate"

export function NewAccountForm() {
  const [mode, setMode] = useState<AccountMode>("individual")
  const [propertyOpen, setPropertyOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Segmented Toggle */}
      <div className="bg-muted p-1 rounded-lg flex">
        <button
          type="button"
          onClick={() => setMode("individual")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-medium transition-all",
            mode === "individual"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <User className="h-4 w-4" />
          Sahis
        </button>
        <button
          type="button"
          onClick={() => setMode("corporate")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-medium transition-all",
            mode === "corporate"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Building2 className="h-4 w-4" />
          Kurum / Yapi
        </button>
      </div>

      {/* Form Fields */}
      <form className="space-y-6">
        {mode === "individual" ? (
          /* Sahis Mode */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Ad</Label>
              <Input id="firstName" placeholder="Adinizi giriniz" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Soyad</Label>
              <Input id="lastName" placeholder="Soyadinizi giriniz" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tcId">TC Kimlik No</Label>
              <Input id="tcId" placeholder="11 haneli TC kimlik numarasi" maxLength={11} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" type="tel" placeholder="+90 5XX XXX XXXX" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" type="email" placeholder="ornek@email.com" />
            </div>
          </div>
        ) : (
          /* Kurum / Yapi Mode */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Unvan</Label>
                <Input id="title" placeholder="Kurum / Apartman adi" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">Vergi Kimlik No</Label>
                <Input id="taxId" placeholder="10 haneli vergi numarasi" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxOffice">Vergi Dairesi</Label>
                <Input id="taxOffice" placeholder="Vergi dairesi adi" />
              </div>
            </div>

            {/* Yapi & Arsa Bilgileri Section */}
            <Collapsible open={propertyOpen} onOpenChange={setPropertyOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-between w-full py-3 px-4 bg-muted rounded-lg text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
                >
                  <span>Yapi & Arsa Bilgileri</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform duration-200",
                      propertyOpen && "rotate-180"
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="space-y-2">
                    <Label htmlFor="landShare">Arsa Payi</Label>
                    <Input id="landShare" placeholder="Orn: 15/1000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plotParcel">Ada / Parsel</Label>
                    <Input id="plotParcel" placeholder="Orn: 123/45" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blockNo">Blok No</Label>
                    <Input id="blockNo" placeholder="Orn: A Blok" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitCount">Daire Sayisi</Label>
                    <Input id="unitCount" type="number" placeholder="Orn: 24" />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline">
            Iptal
          </Button>
          <Button type="submit">
            Kaydet
          </Button>
        </div>
      </form>
    </div>
  )
}
