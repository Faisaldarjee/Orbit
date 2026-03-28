"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/ui/Sidebar"
import { supabase } from "@/lib/supabase"
import { Globe, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [syncing, setSyncing] = useState(true)

  const router = useRouter()

  useEffect(() => {
    const syncIdentity = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.log("No active session detected. Relocating to access point...")
        router.push('/login')
        return
      }

      const user = session.user

      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()
      
      if (!profile) {
        console.log("No profile detected. Initiating Identity Handshake...")
        await supabase.from('profiles').insert([{ 
          id: user.id, 
          full_name: user.user_metadata?.full_name || "Voyager",
          avatar_url: "",
          privacy_mode: 'public',
          status: 'online'
        }])
      }
      setSyncing(false)
    }

    syncIdentity()

    // 🛰️ Persistence Handler: Watch for session dropouts
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  if (syncing) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background gap-6">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center">
            <Globe className="w-10 h-10 text-primary animate-spin-slow" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Loader2 className="w-3 h-3 text-primary animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Synchronizing Orbit</span>
          </div>
          <p className="text-[8px] text-white/20 uppercase font-bold">Establishing Secure Identity Protocol</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background font-outfit text-white">
      <Sidebar />
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Glow Decor */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent blur-sm pointer-events-none" />
        {children}
      </main>
    </div>
  )
}
