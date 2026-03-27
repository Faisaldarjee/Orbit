"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Loader2, Globe, ShieldCheck } from "lucide-react"
import { GlassCard } from "@/components/ui/GlassCard"
import { Button } from "@/components/ui/Button"

export default function JoinGroupPage() {
  const { id } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [group, setGroup] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchGroup = async () => {
      if (!id) return
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        setError("This cosmic link has expired or never existed.")
      } else {
        setGroup(data)
      }
      setLoading(false)
    }
    fetchGroup()
  }, [id])

  const handleJoin = async () => {
    setJoining(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      // Redirect to login with a next param to return here
      router.push(`/login?next=/join/${id}`)
      return
    }

    // Add to group_members
    const { error: joinError } = await supabase
      .from('group_members')
      .insert([{ group_id: id, user_id: user.id }])
    
    // Ignore error if already a member (duplicate key)
    if (joinError && joinError.code !== '23505') {
       alert("Entry failed: " + joinError.message)
       setJoining(false)
    } else {
       // Success! Redirect to the group chat
       router.push(`/dashboard/groups/${id}`)
    }
  }

  if (loading) return (
     <div className="h-screen w-screen flex flex-col items-center justify-center bg-black gap-4 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Calculating Orbital Path...</p>
     </div>
  )

  if (error) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-black p-4 text-white">
       <GlassCard className="p-12 border-accent/20 text-center max-w-sm">
          <Globe className="w-12 h-12 text-accent/20 mx-auto mb-6" />
          <h1 className="text-xl font-black mb-2 uppercase italic font-outfit">Lost in Space</h1>
          <p className="text-white/40 text-xs mb-8">The system you are looking for has drifted out of range.</p>
          <Button onClick={() => router.push('/')} variant="ghost" className="w-full border-white/10 uppercase font-black text-[10px]">Return to Orbit</Button>
       </GlassCard>
    </div>
  )

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-black p-4 overflow-hidden relative text-white">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/20 blur-[120px] rounded-full pointer-events-none opacity-20" />
      
      <GlassCard className="p-12 border-accent/40 relative z-10 max-w-md w-full bg-accent/[0.02]">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-[2rem] bg-accent/20 flex items-center justify-center text-accent mb-6 border border-accent/30 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black font-outfit uppercase tracking-tight mb-2">Solar Invitation</h1>
          <p className="text-white/40 text-xs mb-8">You have been invited to join the <span className="text-accent font-black tracking-widest">[{group?.name}]</span> system.</p>
          
          <Button 
            onClick={handleJoin} 
            disabled={joining}
            className="w-full bg-accent text-white font-black py-7 rounded-2xl shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:scale-[1.02] transition-transform text-xs uppercase tracking-widest"
          >
            {joining ? "Synchronizing..." : "Join System Orbit"}
          </Button>
          
          <p className="mt-6 text-[8px] text-white/20 uppercase font-black tracking-[0.2em]">Secure Authentication Required</p>
        </div>
      </GlassCard>
    </div>
  )
}
