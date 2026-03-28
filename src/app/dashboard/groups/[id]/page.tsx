"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { GlassCard } from "@/components/ui/GlassCard"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Users, Send, Globe, ShieldCheck, Loader2, ArrowLeft, MoreHorizontal, Share2, Shield, Check, X, Settings, WifiOff, Zap, ShieldAlert } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function GroupChatPage() {
  const { id } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [group, setGroup] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [showCommandCenter, setShowCommandCenter] = useState(false)
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false)
  const [input, setInput] = useState("")
  const chatRef = useRef<HTMLDivElement>(null)
  const [syncStatus, setSyncStatus] = useState<string>("connecting")

  // 🛰️ SIGNAL STRENGTH & FINGERPRINT DIAGNOSTIC
  const performSystemCheck = async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "MISSING";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "MISSING";
    const fingerprint = `URL: ${url.substring(0, 15)}... | KEY: ${key.substring(0, 5)}...`;
    
    toast.loading(`Probing Signal: ${fingerprint}`, { id: "syscheck" });
    
    try {
      const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).limit(1);
      
      if (error) {
        toast.error("Database Signal: FAILED", { 
          id: "syscheck",
          description: `Auth Error: ${error.message}. Fingerprint: ${fingerprint}`,
          duration: 15000,
          icon: <ShieldAlert className="w-5 h-5" />
        });
      } else {
        toast.success("Database Signal: NOMINAL", { 
          id: "syscheck",
          description: `Credentials Verified (${fingerprint}). If sync still drifts, check Supabase Publications.`,
          duration: 10000,
          icon: <Zap className="w-5 h-5 text-green-500" />
        });
        if (syncStatus !== 'SUBSCRIBED') {
           window.location.reload();
        }
      }
    } catch (err: any) {
      toast.error("System Check Error", { id: "syscheck", description: err.message });
    }
  };

  useEffect(() => {
    const checkSignal = () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) {
        toast.error("Signal Configuration Missing", {
           description: "Vercel environment variables are NOT being transmitted to the browser.",
           duration: Infinity,
           icon: <WifiOff className="w-5 h-5 text-red-500" />
        });
      }
    };
    checkSignal();
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!currentUser) {
          router.push("/login")
          return
        }
        setUser(currentUser)

        const { data: membership, error: memError } = await supabase
          .from('group_members')
          .select('*')
          .eq('group_id', id)
          .eq('user_id', currentUser.id)
          .maybeSingle()
        
        if (memError || !membership) {
          router.push(`/join/${id}`)
          return
        }

        const { data: groupData, error: gError } = await supabase
          .from('groups')
          .select('*')
          .eq('id', id)
          .single()
        
        if (gError) throw gError
        setGroup(groupData)

        if (groupData.created_by === currentUser.id) {
          const { data: reqData } = await supabase
            .from('group_join_requests')
            .select('*, profiles(full_name, avatar_url)')
            .eq('group_id', id)
            .eq('status', 'pending')
          if (reqData) setRequests(reqData)
        }

        const { data: memberData } = await supabase
          .from('group_members')
          .select('*, profiles(full_name, avatar_url)')
          .eq('group_id', id)
        if (memberData) setMembers(memberData)

        const { data: msgData, error: msgError } = await supabase
          .from('group_messages')
          .select('*, profiles:user_id(full_name, avatar_url)')
          .eq('group_id', id)
          .order('created_at', { ascending: true })
        
        if (msgData) setMessages(msgData)
      } catch (err: any) {
        console.error("Initialization Error:", err.message)
      } finally {
        setLoading(false)
      }
    }

    init()

    const channel = supabase
      .channel(`group-${id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'group_messages',
        filter: `group_id=eq.${id}`
      }, async (payload) => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', payload.new.user_id)
            .maybeSingle()
          
          const newMessage = { ...payload.new as any, profiles: profile || { full_name: "Voyager", avatar_url: null } }
          setMessages(prev => {
            const exists = prev.some((m: any) => m.id === (newMessage as any).id)
            if (exists) return prev
            return [...prev, newMessage]
          })
        } catch (err) {
          console.error("Sync Error:", err)
        }
      })
      .subscribe((status, err) => {
        setSyncStatus(status);
        console.log(`Sync Status [${id}]:`, status, err)
        if (status === 'SUBSCRIBED') {
          toast.success("Orbital Sync Established", { id: "sync-success", description: "Signal frequency locked." })
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error("Critical Sync Failure:", err)
          toast.error("Orbital Sync Interrupted", { 
            id: "sync-error",
            description: `Global frequency drifting: ${err || 'Unstable Connection'}`,
          })
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [id, router])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !user || !id) return
    const content = input.trim();
    setInput("")
    const { error } = await supabase
      .from('group_messages')
      .insert([{ group_id: id, user_id: user.id, content }])
    if (error) toast.error("Signal Transmission Failed")
  }

  const handleApproveRequest = async (requestId: string, targetUserId: string) => {
    const { error: memError } = await supabase
      .from('group_members')
      .insert([{ group_id: id, user_id: targetUserId, role: 'member' }])
    if (memError) return toast.error("Entry Synchronization Failed")
    await supabase.from('group_join_requests').update({ status: 'accepted' }).eq('id', requestId)
    setRequests(prev => prev.filter(r => r.id !== requestId))
    toast.success("Voyager Synchronized to System")
    const { data: newMembers } = await supabase.from('group_members').select('*, profiles(full_name, avatar_url)').eq('group_id', id)
    if (newMembers) setMembers(newMembers)
  }

  const handleRejectRequest = async (requestId: string) => {
    await supabase.from('group_join_requests').update({ status: 'rejected' }).eq('id', requestId)
    setRequests(prev => prev.filter(r => r.id !== requestId))
    toast.error("Entry Request Terminated")
  }

  const handleDismissMember = async (targetUserId: string) => {
    if (targetUserId === group.created_by) return
    const { error } = await supabase.from('group_members').delete().eq('group_id', id).eq('user_id', targetUserId)
    if (error) toast.error("Dismissal Protocol Interrupted")
    else {
      setMembers(prev => prev.filter(m => m.user_id !== targetUserId))
      toast.success("Voyager Ejected from System")
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-accent" /></div>

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 md:p-8">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/groups')} className="w-10 h-10 p-0 rounded-xl bg-white/5">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-black font-outfit flex items-center gap-2">
               {group?.name}
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase font-bold tracking-widest">
               <Users className="w-3 h-3 text-accent" /> {members.length} Members Online
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <Button 
             variant="ghost" 
             size="sm" 
             onClick={performSystemCheck}
             className={cn(
               "bg-white/5 border border-white/10 font-black text-[10px] uppercase tracking-widest px-4",
               syncStatus === 'SUBSCRIBED' ? "text-green-500" : "text-amber-500 animate-pulse"
             )}
           >
              <Zap className="w-3 h-3 mr-2" /> 
              {syncStatus === 'SUBSCRIBED' ? "Scan Complete: Nominal" : "Scan Required: Low Signal"}
           </Button>

           {group?.created_by === user?.id && (
             <Button 
               variant="ghost" 
               size="sm" 
               className={cn(
                 "bg-accent/10 text-accent border border-accent/20 font-black text-[10px] uppercase tracking-widest",
                 showCommandCenter && "bg-accent text-white"
               )} 
               onClick={() => setShowCommandCenter(!showCommandCenter)}
             >
                <Shield className="w-3 h-3 mr-2" /> Command Center {requests.length > 0 && `(${requests.length})`}
             </Button>
           )}
           <Button variant="ghost" size="sm" className="bg-accent/10 text-accent border border-accent/20 font-black text-[10px] uppercase tracking-widest" onClick={() => {
              const url = `${window.location.origin}/join/${id}`;
              navigator.clipboard.writeText(url);
              toast.success("Link copied!");
           }}>
              <Share2 className="w-3 h-3 mr-2" /> Invite
           </Button>
        </div>
      </header>

      <div className="flex-1 flex gap-6 overflow-hidden">
        <div className="flex-1 flex flex-col glass-card border-white/5 relative bg-white/[0.01]">
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                <Globe className="w-16 h-16 mb-4 animate-spin-slow" />
                <p className="text-[10px] font-black uppercase tracking-widest">Initial Orbit Established</p>
                <p className="text-[8px] max-w-[200px] mt-2 italic font-bold">Transmit the first signal.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={cn("flex items-start gap-3", msg.user_id === user?.id ? "flex-row-reverse" : "")}>
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-accent overflow-hidden">
                    {msg.profiles?.avatar_url ? <img src={msg.profiles.avatar_url} className="w-full h-full object-cover" /> : msg.profiles?.full_name?.[0]}
                  </div>
                  <div className={cn("flex flex-col", msg.user_id === user?.id ? "items-end" : "items-start")}>
                    <div className="text-[8px] font-black uppercase text-white/40 mb-1 tracking-widest">{msg.profiles?.full_name}</div>
                    <div className={cn("px-4 py-2.5 rounded-2xl text-xs font-medium max-w-sm", msg.user_id === user?.id ? "bg-accent text-white shadow-[0_0_20px_rgba(244,63,94,0.1)]" : "bg-white/5 border border-white/10 text-white/80")}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-white/[0.02]">
            <div className="relative flex items-center gap-3">
              <Input value={input} onChange={e => setInput(e.target.value)} placeholder={`Transmit signal to ${group?.name}...`} className="pr-16 h-12 bg-white/5 border-white/10 focus:ring-accent/40" />
              <Button type="submit" size="sm" className="absolute right-2 px-3 h-8 bg-accent text-white font-black hover:scale-105 transition-transform" disabled={!input.trim()}><Send className="w-4 h-4" /></Button>
            </div>
          </form>
        </div>

        <div className="hidden lg:flex w-72 flex-col gap-4 overflow-y-auto pr-1 scrollbar-hide">
           <GlassCard className="p-4 border-white/5 bg-accent/5">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-accent mb-4">Commander List</h3>
             <div className="space-y-3">
                 {members.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-3 group/member">
                       <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center font-bold text-accent text-[10px]">
                          {m.profiles?.avatar_url ? <img src={m.profiles.avatar_url} className="w-full h-full object-cover" /> : m.profiles?.full_name?.[0]}
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-black uppercase truncate">{m.profiles?.full_name}</div>
                          <div className="text-[8px] text-white/20 uppercase font-bold">{m.role}</div>
                       </div>
                       {group?.created_by === user?.id && m.user_id !== user?.id && (
                         <Button variant="ghost" size="sm" onClick={() => handleDismissMember(m.user_id)} className="opacity-0 group-hover/member:opacity-100 w-6 h-6 p-0 text-white/20 hover:text-accent transition-all"><X className="w-3 h-3" /></Button>
                       )}
                    </div>
                 ))}
              </div>
            </GlassCard>

            <AnimatePresence>
              {showCommandCenter && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                  <GlassCard className="p-4 border-accent/20 bg-accent/5">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-accent mb-4 flex items-center justify-between">Pending Signals <Shield className="w-3 h-3" /></h3>
                    <div className="space-y-3">
                      {requests.length === 0 ? <p className="text-[8px] text-white/20 italic uppercase font-bold text-center py-4">No pending signals.</p> : requests.map((req) => (
                        <div key={req.id} className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">{req.profiles?.full_name?.[0]}</div>
                            <span className="text-[10px] font-bold truncate">{req.profiles?.full_name}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button className="flex-1 h-7 bg-accent text-white text-[8px] font-black uppercase tracking-tighter" onClick={() => handleApproveRequest(req.id, req.user_id)}><Check className="w-3 h-3 mr-1" /> Approve</Button>
                            <Button variant="ghost" className="flex-1 h-7 bg-white/5 text-white/40 text-[8px] font-black uppercase tracking-tighter hover:bg-white/10" onClick={() => handleRejectRequest(req.id)}><X className="w-3 h-3 mr-1" /> Deny</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                  <GlassCard className="p-4 border-white/5">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2"><Settings className="w-3 h-3" /> System Control</h3>
                    <div className="space-y-4">
                      <p className="text-[8px] text-white/20 leading-relaxed uppercase font-bold">Warning: affect all voyagers.</p>
                      {!showTerminateConfirm ? (
                        <Button variant="ghost" className="w-full justify-start text-[8px] font-black uppercase tracking-widest text-accent/60 hover:text-accent hover:bg-accent/5 p-2 h-auto" onClick={() => setShowTerminateConfirm(true)}>Terminate System</Button>
                      ) : (
                        <div className="flex gap-2">
                           <Button className="flex-1 h-8 bg-accent text-white text-[8px] font-black uppercase tracking-widest" onClick={() => supabase.from('groups').delete().eq('id', id).then(() => router.push('/dashboard/groups'))}>Confirm</Button>
                           <Button variant="ghost" className="flex-1 h-8 bg-white/5 text-white/40 text-[8px] font-black uppercase tracking-widest hover:bg-white/10" onClick={() => setShowTerminateConfirm(false)}>Cancel</Button>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
