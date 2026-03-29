"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { GlassCard } from "@/components/ui/GlassCard"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Users, Plus, Link as LinkIcon, Share2, MoreHorizontal, MessageCircle, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function SolarSystemsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [systems, setSystems] = useState<any[]>([])
  const [newGroupName, setNewGroupName] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)

      const { data, error: fetchError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups (
            *,
            group_members(count)
          )
        `)
        .eq('user_id', user.id)

      if (fetchError) {
        console.error("Fetch error:", fetchError.message)
      } else if (data) {
        const joinedGroups = data.map((item: any) => item.groups).filter(g => g !== null)
        setSystems(joinedGroups)
      }
      setLoading(false)
    }
    init()

    const channel = supabase
      .channel('group-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'groups' }, async (payload) => {
        const newGroup = payload.new as any
        setSystems(prev => {
          if (prev.some(g => g.id === newGroup.id)) return prev
          return [newGroup, ...prev]
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleCreateSystem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim() || !user) return

    const name = newGroupName.trim()
    setNewGroupName("")
    setShowCreate(false)

    // OPTIMISTIC UPDATE
    const tempId = crypto.randomUUID()
    const tempGroup = {
      id: tempId,
      name,
      created_by: user.id,
      created_at: new Date().toISOString(),
      is_optimistic: true
    }

    setSystems(prev => [tempGroup, ...prev])

    const { data: group, error: insertError } = await supabase
      .from('groups')
      .insert([{ name, created_by: user.id }])
      .select()
      .single()

    if (insertError) {
      setSystems(prev => prev.filter(g => g.id !== tempId))
      setError(insertError.message)
      toast.error("System Launch Failed: " + insertError.message)
      return
    }

    if (group) {
      // Replace optimistic group with real one
      setSystems(prev => prev.map(g => g.id === tempId ? group : g))

      await supabase.from('group_members').insert([{ group_id: group.id, user_id: user.id, role: 'admin' }])
      toast.success(`System '${group.name}' established successfully!`)
    }
  }

  const handleJoinSystem = async (groupId: string) => {
    if (!user) return
    const { error } = await supabase.from('group_members').insert([{ group_id: groupId, user_id: user.id }])

    if (error) {
      if (error.code === '23505') {
        toast.info("You are already part of this system's orbit.")
      } else {
        toast.error("Registration failed: " + error.message)
      }
    } else {
      toast.success("Successfully added to the system's orbit!")
    }
  }

  const handleCopyInvite = (groupId: string) => {
    const url = `${window.location.origin}/join/${groupId}`
    navigator.clipboard.writeText(url)
    toast.info("Solar Invitation Link copied to clipboard!")
  }

  if (loading && systems.length === 0) return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-accent" /></div>

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-accent/60">Orbital Hub Online</span>
          </div>
          <h1 className="text-3xl font-black font-outfit flex items-center gap-2">
            <Users className="w-8 h-8 text-accent" />
            Solar Systems
          </h1>
          <p className="text-white/40 text-sm">Collective hubs for planetary collaboration.</p>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" className="bg-white/5 border-white/10" onClick={() => setShowCreate(!showCreate)}>
            <Plus className={cn("w-4 h-4 mr-2 transition-transform", showCreate && "rotate-45")} />
            {showCreate ? "Cancel Launch" : "Create System"}
          </Button>
        </div>
      </header>

      {showCreate && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-12">
          <GlassCard className="p-8 border-accent/40 bg-accent/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Users className="w-32 h-32" />
            </div>
            <h2 className="text-xl font-black font-outfit mb-2">Establish New Orbit</h2>
            <p className="text-sm text-white/40 mb-6 max-w-md">Define a new collective space for your fleet. All established systems are public by default.</p>

            <form onSubmit={handleCreateSystem} className="flex flex-col md:flex-row gap-4">
              <Input
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="Enter System Name (e.g. Milky Way)..."
                className="flex-1 h-12 bg-white/5 border-white/10 focus:border-accent/40"
              />
              <Button type="submit" variant="secondary" className="bg-accent h-12 px-8 font-black uppercase tracking-widest" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Establish Orbit"}
              </Button>
            </form>
            {error && <p className="text-accent text-[10px] font-bold mt-2 uppercase tracking-wider">{error}</p>}
          </GlassCard>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {systems.map((system) => (
          <GlassCard
            key={system.id}
            className="group hover:border-accent/30 transition-all p-0 flex flex-col relative overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center text-accent ring-1 ring-accent/30 font-black text-xl shadow-[0_0_20px_rgba(244,63,94,0.2)] font-outfit">
                  {system.name[0]}
                </div>
                <div className="px-2.5 py-1 rounded bg-accent/10 border border-accent/20 text-[10px] text-accent font-black tracking-widest uppercase flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                  STABLE ORBIT
                </div>
              </div>

              <h3 className="text-xl font-black font-outfit mb-1 group-hover:text-accent transition-colors">{system.name}</h3>
              <div className="flex items-center gap-3 text-xs text-white/30 mb-6 font-medium">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Fleet Tracking Active</span>
              </div>
            </div>

            <div className="mt-auto p-4 bg-white/[0.02] border-t border-white/5 flex items-center gap-3">
              <Button onClick={() => router.push(`/dashboard/groups/${system.id}`)} size="sm" className="flex-1 bg-accent/10 border-accent/20 text-accent hover:bg-accent hover:text-white border font-bold uppercase tracking-wider text-[10px]">
                Enter System
              </Button>
              <Button onClick={() => handleCopyInvite(system.id)} variant="ghost" size="sm" className="w-10 p-0 rounded-xl border border-white/10 hover:bg-white/5">
                <LinkIcon className="w-4 h-4" />
              </Button>
            </div>
          </GlassCard>
        ))}

        <motion.div
          whileHover={{ translateY: -4 }}
          onClick={() => setShowCreate(true)}
          className="border-2 border-dashed border-white/10 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-white/5 transition-all"
        >
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/20 mb-4 group-hover:scale-110 transition-transform">
            <Plus className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold font-outfit text-white/60">Establish New Orbit</h4>
          <p className="text-xs text-white/30 mt-2">Start a new collective hub for your fleet.</p>
        </motion.div>
      </div>
    </div>
  )
}
