"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    console.log("[LOGIN] Próba logowania:", email)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      console.error("[LOGIN] Błąd auth:", error)
      setError(`Błąd: ${error.message}`)
      setLoading(false)
      return
    }

    console.log("[LOGIN] Auth OK, user:", data.user?.id)

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single()

    if (profErr) {
      console.error("[LOGIN] Błąd profile:", profErr)
      setError(`Błąd profilu: ${profErr.message}`)
      setLoading(false)
      return
    }

    console.log("[LOGIN] Profile pobrany, role:", profile?.role)

    const target = profile?.role === "admin" ? "/admin/clients" : "/dashboard"
    console.log("[LOGIN] Przekierowanie na:", target)
    // window.location wymusza pełny reload — sesja Supabase jest już w localStorage
    window.location.assign(target)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Twisted Pixel</CardTitle>
          <CardDescription>Panel wyników kampanii reklamowych</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="twoj@email.pl"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Logowanie…" : "Zaloguj się"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
