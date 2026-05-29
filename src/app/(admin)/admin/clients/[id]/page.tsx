"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { supabase } from "@/lib/supabase/client"
import { AdminShell } from "@/components/admin-shell"
import type { Client, Campaign } from "@/lib/supabase/types"

// Osobna instancja do tworzenia użytkowników.
// persistSession: false i unikalny storageKey — nie nadpisuje sesji admina w localStorage.
function makeTempClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: "tp-temp-signup",
        persistSession: false,
      },
    }
  )
}

const TP = {
  orange: "#eb5d1c",
  dark:   "#1d1d1b",
  cream:  "#f9f5f0",
  white:  "#ffffff",
  gray:   "#5d6970",
  border: "#c1c8cd",
  green:  "#209b84",
  fontBody:    "var(--font-body,'IBM Plex Sans',sans-serif)",
  fontHeading: "var(--font-heading,'Alata',sans-serif)",
}

type Tab = "campaigns" | "users" | "metrics"

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()

  const [client, setClient]       = useState<Client | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [tab, setTab]             = useState<Tab>("campaigns")
  const [loading, setLoading]     = useState(true)

  /* kampania — modal */
  const [campModal, setCampModal]   = useState(false)
  const [campForm, setCampForm]     = useState({ name: "", source: "manual" as Campaign["source"], objective: "", is_lead_gen: false })
  const [campSaving, setCampSaving] = useState(false)

  /* zaproszenie użytkownika */
  const [userEmail, setUserEmail]   = useState("")
  const [userPass,  setUserPass]    = useState("")
  const [userMsg,   setUserMsg]     = useState<string | null>(null)
  const [userSaving, setUserSaving] = useState(false)

  /* metryki ręczne */
  const [metricForm, setMetricForm] = useState({ campaign_id: "", date: "", spend: "", clicks: "", leads: "" })
  const [metricMsg,  setMetricMsg]  = useState<string | null>(null)
  const [metricSaving, setMetricSaving] = useState(false)

  async function load() {
    const { data: c } = await supabase.from("clients").select("*").eq("id", id).single()
    const { data: camps } = await supabase.from("campaigns").select("*").eq("client_id", id).order("created_at", { ascending: false })
    setClient(c as Client)
    setCampaigns((camps as Campaign[]) ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  /* Dodaj kampanię */
  async function addCampaign() {
    if (!campForm.name.trim()) return
    setCampSaving(true)
    await supabase.from("campaigns").insert({ ...campForm, client_id: id, name: campForm.name.trim() })
    await load()
    setCampModal(false)
    setCampSaving(false)
    setCampForm({ name: "", source: "manual", objective: "", is_lead_gen: false })
  }

  /* Usuń kampanię */
  async function deleteCampaign(campId: string) {
    if (!confirm("Usunąć kampanię?")) return
    await supabase.from("campaigns").delete().eq("id", campId)
    setCampaigns(p => p.filter(c => c.id !== campId))
  }

  /* Utwórz użytkownika klienta */
  async function createUser() {
    if (!userEmail || !userPass) { setUserMsg("Wypełnij email i hasło."); return }
    if (userPass.length < 8) { setUserMsg("Hasło musi mieć min. 8 znaków."); return }
    setUserSaving(true)
    setUserMsg(null)

    // Osobna instancja — nie nadpisuje sesji admina
    const tmp = makeTempClient()
    const { data, error } = await tmp.auth.signUp({
      email: userEmail.trim(),
      password: userPass,
    })

    if (error || !data.user) {
      setUserMsg(`Błąd: ${error?.message ?? "Nieznany błąd"}`)
      setUserSaving(false)
      return
    }

    // Przypisz nowego użytkownika do klienta (sesja admina w głównym kliencie)
    const { error: linkErr } = await supabase
      .from("client_users")
      .insert({ client_id: id, user_id: data.user.id })

    if (linkErr) {
      setUserMsg(`Konto utworzone, ale błąd przypisania: ${linkErr.message}`)
    } else {
      setUserMsg(`✓ Konto gotowe. Email: ${userEmail} | Hasło: ${userPass}`)
    }

    setUserEmail("")
    setUserPass("")
    setUserSaving(false)
  }

  /* Dodaj metryki ręcznie */
  async function addMetrics() {
    if (!metricForm.campaign_id || !metricForm.date) { setMetricMsg("Wybierz kampanię i datę."); return }
    setMetricSaving(true)
    const { error } = await supabase.from("campaign_metrics_daily").upsert({
      campaign_id: metricForm.campaign_id,
      date: metricForm.date,
      spend:  parseFloat(metricForm.spend)  || 0,
      clicks: parseInt(metricForm.clicks)   || 0,
      leads:  parseInt(metricForm.leads)    || 0,
    })
    setMetricMsg(error ? `Błąd: ${error.message}` : "Metryki zapisane.")
    setMetricForm(f => ({ ...f, spend: "", clicks: "", leads: "" }))
    setMetricSaving(false)
  }

  if (loading) return <AdminShell><p style={{ color: TP.gray, fontFamily: TP.fontBody }}>Ładowanie…</p></AdminShell>
  if (!client) return <AdminShell><p style={{ color: TP.gray, fontFamily: TP.fontBody }}>Nie znaleziono klienta.</p></AdminShell>

  return (
    <AdminShell>
      {/* Breadcrumb */}
      <button onClick={() => router.push("/admin/clients")} style={{ background: "none", border: "none", color: TP.gray, fontSize: "13px", cursor: "pointer", fontFamily: TP.fontBody, padding: "0 0 20px", display: "flex", alignItems: "center", gap: "6px" }}>
        ← Klienci
      </button>

      {/* Nagłówek klienta */}
      <div style={{ display: "flex", alignItems: "center", gap: "18px", marginBottom: "32px" }}>
        <div style={{ width: "56px", height: "56px", borderRadius: "14px", background: "rgba(235,93,28,0.10)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: TP.fontHeading, fontSize: "24px", color: TP.orange }}>
          {client.name.charAt(0)}
        </div>
        <div>
          <h2 style={{ fontFamily: TP.fontHeading, fontSize: "26px", fontWeight: 400, color: TP.dark, margin: 0 }}>{client.name}</h2>
          <p style={{ fontSize: "13px", color: TP.gray, margin: "4px 0 0" }}>
            {[client.google_ads_customer_id && "Google Ads", client.meta_ad_account_id && "Meta Ads", client.ga4_property_id && "GA4"].filter(Boolean).join(" · ") || "Brak integracji"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "28px", background: "#f0ece6", borderRadius: "10px", padding: "4px", width: "fit-content" }}>
        {([ ["campaigns","Kampanie"], ["users","Dostęp klienta"], ["metrics","Metryki ręczne"] ] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? TP.white : "transparent",
            border: "none", borderRadius: "8px",
            padding: "8px 18px", fontSize: "13px", fontWeight: tab === t ? 600 : 400,
            color: tab === t ? TP.dark : TP.gray,
            cursor: "pointer", fontFamily: TP.fontBody,
            boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
            transition: "all 0.15s",
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* TAB: Kampanie */}
      {tab === "campaigns" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
            <button onClick={() => setCampModal(true)} style={{ background: TP.dark, color: TP.white, border: "none", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: TP.fontBody }}>
              + Dodaj kampanię
            </button>
          </div>
          {campaigns.length === 0 ? (
            <Empty label="Brak kampanii" sub="Dodaj pierwszą kampanię dla tego klienta." />
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {campaigns.map(c => (
                <div key={c.id} style={{ background: TP.white, border: `1.5px solid ${TP.border}`, borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: c.status === "ACTIVE" ? TP.green : TP.border }} />
                    <div>
                      <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: TP.dark }}>{c.name}</p>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: TP.gray }}>
                        {c.source} {c.is_lead_gen && "· Lead Ads"}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => deleteCampaign(c.id)} style={{ background: "none", border: "none", color: TP.border, fontSize: "13px", cursor: "pointer", fontFamily: TP.fontBody }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#c94d14")}
                    onMouseLeave={e => (e.currentTarget.style.color = TP.border)}
                  >Usuń</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Dostęp klienta */}
      {tab === "users" && (
        <div style={{ maxWidth: "480px" }}>
          <p style={{ fontSize: "14px", color: TP.gray, marginBottom: "24px", lineHeight: 1.6 }}>
            Utwórz konto dla klienta. Otrzyma email z danymi do logowania lub możesz mu przekazać hasło bezpośrednio.
          </p>
          <div style={{ display: "grid", gap: "14px" }}>
            <FormField label="Email klienta" value={userEmail} onChange={setUserEmail} placeholder="klient@firma.pl" />
            <FormField label="Hasło tymczasowe" value={userPass} onChange={setUserPass} placeholder="min. 8 znaków" type="password" />
          </div>
          {userMsg && <Msg text={userMsg} ok={!userMsg.startsWith("Błąd")} />}
          <button onClick={createUser} disabled={userSaving} style={{ marginTop: "20px", background: TP.orange, color: TP.white, border: "none", borderRadius: "8px", padding: "11px 24px", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: TP.fontBody }}>
            {userSaving ? "Tworzenie…" : "Utwórz konto klienta"}
          </button>
        </div>
      )}

      {/* TAB: Metryki ręczne */}
      {tab === "metrics" && (
        <div style={{ maxWidth: "520px" }}>
          <p style={{ fontSize: "14px", color: TP.gray, marginBottom: "24px", lineHeight: 1.6 }}>
            Wprowadź metryki ręcznie — gdy automatyczny sync z API nie jest jeszcze aktywny.
          </p>
          <div style={{ display: "grid", gap: "14px" }}>
            <div>
              <label style={labelStyle}>Kampania</label>
              <select value={metricForm.campaign_id} onChange={e => setMetricForm(f => ({ ...f, campaign_id: e.target.value }))} style={inputStyle}>
                <option value="">— wybierz —</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <FormField label="Data (RRRR-MM-DD)" value={metricForm.date} onChange={v => setMetricForm(f => ({ ...f, date: v }))} placeholder="2026-04-01" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <FormField label="Wydatki (zł)" value={metricForm.spend} onChange={v => setMetricForm(f => ({ ...f, spend: v }))} placeholder="1200.00" />
              <FormField label="Kliknięcia" value={metricForm.clicks} onChange={v => setMetricForm(f => ({ ...f, clicks: v }))} placeholder="450" />
              <FormField label="Leady" value={metricForm.leads} onChange={v => setMetricForm(f => ({ ...f, leads: v }))} placeholder="12" />
            </div>
          </div>
          {metricMsg && <Msg text={metricMsg} ok={!metricMsg.startsWith("Błąd")} />}
          <button onClick={addMetrics} disabled={metricSaving} style={{ marginTop: "20px", background: TP.dark, color: TP.white, border: "none", borderRadius: "8px", padding: "11px 24px", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: TP.fontBody }}>
            {metricSaving ? "Zapisywanie…" : "Zapisz metryki"}
          </button>
        </div>
      )}

      {/* Modal: dodaj kampanię */}
      {campModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(29,29,27,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "24px" }}
          onClick={e => { if (e.target === e.currentTarget) setCampModal(false) }}>
          <div style={{ background: TP.white, borderRadius: "16px", width: "100%", maxWidth: "460px", padding: "36px", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <h3 style={{ fontFamily: TP.fontHeading, fontSize: "20px", fontWeight: 400, color: TP.dark, margin: "0 0 22px" }}>Nowa kampania</h3>
            <div style={{ display: "grid", gap: "14px" }}>
              <FormField label="Nazwa kampanii *" value={campForm.name} onChange={v => setCampForm(f => ({ ...f, name: v }))} placeholder="np. Kampania leadowa Q2" />
              <div>
                <label style={labelStyle}>Źródło</label>
                <select value={campForm.source} onChange={e => setCampForm(f => ({ ...f, source: e.target.value as Campaign["source"] }))} style={inputStyle}>
                  <option value="manual">Ręczne</option>
                  <option value="google_ads">Google Ads</option>
                  <option value="meta">Meta Ads</option>
                </select>
              </div>
              <FormField label="Cel kampanii" value={campForm.objective} onChange={v => setCampForm(f => ({ ...f, objective: v }))} placeholder="np. LEAD_GENERATION" />
              <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: TP.dark, cursor: "pointer", fontFamily: TP.fontBody }}>
                <input type="checkbox" checked={campForm.is_lead_gen} onChange={e => setCampForm(f => ({ ...f, is_lead_gen: e.target.checked }))} />
                Kampania Lead Ads (formularz)
              </label>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "24px", justifyContent: "flex-end" }}>
              <button onClick={() => setCampModal(false)} style={{ background: "transparent", border: `1.5px solid ${TP.border}`, borderRadius: "8px", padding: "10px 18px", fontSize: "13px", color: TP.gray, cursor: "pointer", fontFamily: TP.fontBody }}>Anuluj</button>
              <button onClick={addCampaign} disabled={campSaving} style={{ background: TP.orange, color: TP.white, border: "none", borderRadius: "8px", padding: "10px 22px", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: TP.fontBody }}>
                {campSaving ? "Dodawanie…" : "Dodaj kampanię"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}

/* ── helpers UI ── */
const labelStyle: React.CSSProperties = { display: "block", fontSize: "12px", fontWeight: 600, color: "#1d1d1b", marginBottom: "6px", letterSpacing: "0.04em", textTransform: "uppercase", fontFamily: "var(--font-body,'IBM Plex Sans',sans-serif)" }
const inputStyle: React.CSSProperties = { width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1.5px solid #c1c8cd", fontFamily: "var(--font-body,'IBM Plex Sans',sans-serif)", fontSize: "14px", color: "#1d1d1b", outline: "none", boxSizing: "border-box", background: "#fff" }

function FormField({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle}
        onFocus={e => (e.target.style.borderColor = "#eb5d1c")}
        onBlur={e => (e.target.style.borderColor = "#c1c8cd")} />
    </div>
  )
}

function Empty({ label, sub }: { label: string; sub: string }) {
  return (
    <div style={{ background: "#fff", border: "1.5px dashed #c1c8cd", borderRadius: "12px", padding: "48px 24px", textAlign: "center" }}>
      <p style={{ fontSize: "15px", fontWeight: 600, color: "#1d1d1b", margin: "0 0 6px" }}>{label}</p>
      <p style={{ fontSize: "13px", color: "#5d6970", margin: 0 }}>{sub}</p>
    </div>
  )
}

function Msg({ text, ok }: { text: string; ok: boolean }) {
  return (
    <div style={{ marginTop: "14px", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", background: ok ? "rgba(32,155,132,0.08)" : "rgba(235,93,28,0.08)", color: ok ? "#209b84" : "#c94d14", border: `1px solid ${ok ? "rgba(32,155,132,0.25)" : "rgba(235,93,28,0.3)"}` }}>
      {text}
    </div>
  )
}
