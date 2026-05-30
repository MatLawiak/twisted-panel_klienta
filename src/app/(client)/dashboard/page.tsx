"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useUser } from "@/hooks/use-user"

type Kpi = { leads: number; spend: number; clicks: number; cpl: number }

const TP = {
  orange: "#eb5d1c",
  dark: "#1d1d1b",
  cream: "#f9f5f0",
  white: "#ffffff",
  gray: "#5d6970",
  border: "#c1c8cd",
  green: "#209b84",
  fontBody: "var(--font-body, 'IBM Plex Sans', sans-serif)",
  fontHeading: "var(--font-heading, 'Alata', sans-serif)",
}

export default function DashboardPage() {
  const { profile } = useUser()
  const [clientName, setClientName] = useState<string | null>(null)
  const [kpi, setKpi] = useState<Kpi | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    ;(async () => {
      const { data: clients } = await supabase
        .from("clients").select("id, name").limit(1)

      if (!clients?.[0]) { setLoading(false); return }
      setClientName(clients[0].name)

      const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)
      const { data: metrics } = await supabase
        .from("campaign_metrics_daily")
        .select("spend, clicks, leads, campaigns!inner(client_id, visible)")
        .eq("campaigns.visible", true)
        .gte("date", since)

      if (metrics) {
        const t = metrics.reduce(
          (acc, m: any) => ({ spend: acc.spend + Number(m.spend), clicks: acc.clicks + m.clicks, leads: acc.leads + m.leads }),
          { spend: 0, clicks: 0, leads: 0 }
        )
        setKpi({ ...t, cpl: t.leads ? t.spend / t.leads : 0 })
      }
      setLoading(false)
    })()
  }, [profile])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.assign("/login")
  }

  const fmt = (n: number) => new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(n)

  return (
    <div style={{ minHeight: "100vh", background: TP.cream, fontFamily: TP.fontBody }}>

      {/* Topbar */}
      <header style={{
        background: TP.dark,
        padding: "0 32px",
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ fontFamily: TP.fontHeading, fontSize: "20px", color: TP.white, letterSpacing: "-0.01em" }}>
          Twisted<span style={{ color: TP.orange }}>Pixel</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
            {profile?.email}
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "8px",
              color: "rgba(255,255,255,0.7)",
              padding: "6px 14px",
              fontSize: "13px",
              cursor: "pointer",
              fontFamily: TP.fontBody,
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = TP.orange; (e.target as HTMLButtonElement).style.color = TP.orange }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.2)"; (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)" }}
          >
            Wyloguj
          </button>
        </div>
      </header>

      {/* Główna treść */}
      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px" }}>

        {/* Nagłówek */}
        <div style={{ marginBottom: "36px" }}>
          {loading ? (
            <div style={{ height: "36px", width: "280px", background: "#e0dbd4", borderRadius: "8px" }} />
          ) : (
            <h1 style={{ fontFamily: TP.fontHeading, fontSize: "32px", color: TP.dark, margin: 0, fontWeight: 400 }}>
              {clientName ?? "Panel klienta"}
            </h1>
          )}
          <p style={{ fontSize: "14px", color: TP.gray, marginTop: "6px", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500 }}>
            Wyniki kampanii · ostatnie 30 dni
          </p>
        </div>

        {/* KPI Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "40px" }}>
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: "130px", background: "#e0dbd4", borderRadius: "12px", animation: "pulse 1.5s ease infinite" }} />
          )) : kpi ? (
            <>
              <KpiCard label="Leady" value={String(kpi.leads)} accent={TP.orange} />
              <KpiCard label="Koszt za leada (CPL)" value={kpi.cpl > 0 ? fmt(kpi.cpl) : "—"} accent={TP.green} />
              <KpiCard label="Kliknięcia" value={kpi.clicks.toLocaleString("pl-PL")} accent="#5d6970" />
              <KpiCard label="Wydatki" value={fmt(kpi.spend)} accent={TP.dark} />
            </>
          ) : (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "48px", color: TP.gray, fontSize: "15px" }}>
              Brak danych. Skontaktuj się z agencją.
            </div>
          )}
        </div>

        {/* Info bar */}
        <div style={{
          background: TP.white,
          borderRadius: "12px",
          border: `1.5px solid ${TP.border}`,
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "14px",
          color: TP.gray,
        }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: TP.green, flexShrink: 0 }} />
          Dane aktualizowane automatycznie każdej nocy. W razie pytań napisz na{" "}
          <a href="mailto:hello@twistedpixel.pl" style={{ color: TP.orange, fontWeight: 600, textDecoration: "none" }}>
            hello@twistedpixel.pl
          </a>
        </div>
      </main>
    </div>
  )
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "12px",
      border: "1.5px solid #c1c8cd",
      padding: "24px",
      borderTop: `3px solid ${accent}`,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    }}>
      <p style={{
        margin: "0 0 10px 0",
        fontSize: "11px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "#5d6970",
        fontFamily: "var(--font-body, 'IBM Plex Sans', sans-serif)",
      }}>
        {label}
      </p>
      <p style={{
        margin: 0,
        fontSize: "32px",
        fontWeight: 600,
        color: "#1d1d1b",
        fontFamily: "var(--font-body, 'IBM Plex Sans', sans-serif)",
        lineHeight: 1.1,
      }}>
        {value}
      </p>
    </div>
  )
}
