"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Profile } from "@/lib/supabase/types"

export function useUser() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!mounted || !user) { setLoading(false); return }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (mounted) {
        setProfile(data as Profile | null)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) { setProfile(null); setLoading(false) }
      }
    )

    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  return {
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    isClient: profile?.role === 'client',
  }
}
