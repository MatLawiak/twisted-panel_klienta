"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useUser } from "@/hooks/use-user"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { LogOut, TrendingUp } from "lucide-react"

type Kpi = { leads: number; spend: number; clicks: number; cpl: number }

export default function DashboardPage() {
  const { profile } = useUser()
  const [clientName, setClientName] = useState<string | null>(null)
  const [kpi, setKpi] = useState<Kpi | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!profile) return
    ;(async () => {
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name")
        .limit(1)

      if (!clients?.[0]) { setLoading(false); return }
      setClientName(clients[0].name)

      const since = new Date(Date.now() - 30 * 86400_000)
        .toISOString()
        .slice(0, 10)

      const { data: metrics } = await supabase
        .from("campaign_metrics_daily")
        .select("spend, clicks, leads, campaigns!inner(client_id)")
        .gte("date", since)

      if (metrics) {
        const t = metrics.reduce(
          (acc, m: any) => ({
            spend: acc.spend + Number(m.spend),
            clicks: acc.clicks + m.clicks,
            leads: acc.leads + m.leads,
          }),
          { spend: 0, clicks: 0, leads: 0 }
        )
        setKpi({ ...t, cpl: t.leads ? t.spend / t.leads : 0 })
      }
      setLoading(false)
    })()
  }, [profile])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <span className="font-semibold">Twisted Pixel</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Wyloguj
        </Button>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          {loading ? (
            <Skeleton className="h-9 w-72" />
          ) : (
            <h1 className="text-3xl font-bold">
              {clientName ? `Wyniki kampanii — ${clientName}` : "Panel klienta"}
            </h1>
          )}
          <p className="text-muted-foreground mt-1">Ostatnie 30 dni</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))
          ) : kpi ? (
            <>
              <KpiCard label="Leady" value={String(kpi.leads)} />
              <KpiCard
                label="Koszt za leada"
                value={kpi.cpl > 0
                  ? new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(kpi.cpl)
                  : "—"
                }
              />
              <KpiCard label="Kliknięcia" value={kpi.clicks.toLocaleString("pl-PL")} />
              <KpiCard
                label="Wydatki"
                value={new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(kpi.spend)}
              />
            </>
          ) : (
            <p className="col-span-4 text-muted-foreground text-center py-12">
              Brak danych. Skontaktuj się z agencją.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          {label}
        </p>
        <p className="text-3xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}
