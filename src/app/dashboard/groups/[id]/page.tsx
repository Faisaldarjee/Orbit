"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { GlassCard } from "@/components/ui/GlassCard"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Users, Send, Globe, Loader2, ArrowLeft, Share2, Shield, Check, X, MessageSquare, Trash2, AlertTriangle, AlertCircle, Settings2, UserPlus, Info } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn, formatTime } from "@/lib/utils"
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
  const [retryCount, setRetryCount] = useState(0)
  const channelRef = useRef<any>(null)


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
          .order('created_at', { ascending: false })
          .limit(50)

        if (msgData) setMessages(msgData.reverse())
      } catch (err: any) {
        console.error("Initialization Error:", err.message)
      } finally {
        setLoading(false)
      }
    }

    init()

    // ⚡ HYPER-ROBUST SYNC ENGINE
    const reconcile = (newMsg: any) => {
      setMessages(prev => {
        const isDuplicate = prev.some((m: any) => String(m.id) === String(newMsg.id));
        if (isDuplicate) return prev;
        return [...prev, newMsg];
      });
    };

    const subscribeToSignal = () => {
      channelRef.current = supabase
        .channel(`group-${id}`, { config: { broadcast: { self: false } } })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${id}`
        }, async (payload) => {
          const rawMsg = payload.new as any;
          try {
            const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', rawMsg.user_id).maybeSingle()
            reconcile({ ...rawMsg, profiles: profile || { full_name: "Voyager", avatar_url: null } });
          } catch (err) {
            reconcile({ ...rawMsg, profiles: { full_name: "Voyager", avatar_url: null } });
          }
        })
        .on('broadcast', { event: 'chat' }, (payload) => {
          reconcile(payload.payload);
        })
        .subscribe((status, err) => {
          setSyncStatus(status);
          if (status === 'SUBSCRIBED') setRetryCount(0);
          if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && retryCount < 5) {
            setRetryCount(prev => prev + 1);
            setTimeout(() => {
              if (channelRef.current) supabase.removeChannel(channelRef.current);
              subscribeToSignal();
            }, 1500 * (retryCount + 1));
          }
        });
    };

    subscribeToSignal();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [id, retryCount])

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

    // OPTIMISTIC UPDATE
    const tempId = Math.random();
    const tempMsg = {
      id: tempId,
      content,
      user_id: user.id,
      created_at: new Date().toISOString(),
      profiles: { full_name: user.user_metadata?.full_name || "You", avatar_url: null }
    };
    setMessages(prev => [...prev, tempMsg]);

    const { error, data: realMsg } = await supabase
      .from('group_messages')
      .insert([{ group_id: id, user_id: user.id, content }])
      .select()
      .single()

    // ⚡ BROADCAST INSTANTLY WITH REAL ID
    if (!error && realMsg) {
      const finalMsg = { ...realMsg, profiles: tempMsg.profiles };
      // Update local state with real ID
      setMessages(prev => prev.map((m: any) => m.id === tempId ? finalMsg : m));

      channelRef.current?.send({
        type: 'broadcast',
        event: 'chat',
        payload: finalMsg
      });
    } else if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error("Signal Transmission Failed")
    }
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

  const handleDeleteSystem = async () => {
    if (!group || !user || group.created_by !== user.id) return

    setLoading(true)
    const { error } = await supabase.from('groups').delete().eq('id', id)

    if (error) {
      toast.error("Decommission Failed: " + error.message)
      setLoading(false)
    } else {
      toast.success("System Decommissioned Successfully")
      router.push('/dashboard/groups')
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    await supabase.from('group_join_requests').update({ status: 'rejected' }).eq('id', requestId)
    setRequests(prev => prev.filter(r => r.id !== requestId))
    toast.error("Entry Request Terminated")
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-accent" /></div>

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 md:p-8">
      <header className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/groups')} className="w-10 h-10 p-0 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-black font-outfit uppercase tracking-tight text-white leading-none">
              {group?.name}
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-accent uppercase font-black tracking-widest mt-1">
              <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
              {members.length} Members Syncing
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">

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
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-[8px] font-black uppercase text-white/40 tracking-widest">{msg.profiles?.full_name}</div>
                      <div className="text-[7px] font-bold text-white/10 uppercase tracking-widest">{formatTime(msg.created_at)}</div>
                    </div>
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
      </div>

      <AnimatePresence>
        {showCommandCenter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowCommandCenter(false);
                setShowTerminateConfirm(false);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl overflow-hidden"
            >
              <GlassCard className="border-white/10 bg-white/[0.02] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-accent/20 flex items-center justify-center text-accent ring-1 ring-accent/30">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black font-outfit uppercase tracking-widest text-white">Command Center</h2>
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">System Governance & Fleet Control</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCommandCenter(false);
                      setShowTerminateConfirm(false);
                    }}
                    className="w-10 h-10 p-0 rounded-xl hover:bg-white/5"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <section className="space-y-6">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-accent mb-4 flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" /> Fleet Resonance
                      </h3>
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
                        {members.map((m, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5 group hover:border-accent/30 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center font-bold text-accent text-[10px] group-hover:scale-110 transition-transform">
                                {m.profiles?.avatar_url ? <img src={m.profiles.avatar_url} className="w-full h-full object-cover rounded-xl" /> : m.profiles?.full_name?.[0]}
                              </div>
                              <div className="flex flex-col">
                                <div className="text-[10px] font-black uppercase tracking-tight text-white/80">{m.profiles?.full_name}</div>
                                <div className="text-[8px] text-white/20 uppercase font-bold">{m.role}</div>
                              </div>
                            </div>
                            {m.role !== 'admin' && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="sm" className="w-7 h-7 p-0 rounded-lg hover:bg-red-500/10 hover:text-red-500"><Trash2 className="w-3 h-3" /></Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                        <UserPlus className="w-3.5 h-3.5" /> Entry Signals
                      </h3>
                      <div className="space-y-3">
                        {requests.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 px-4 rounded-2xl bg-white/[0.01] border border-dashed border-white/5">
                            <Info className="w-6 h-6 text-white/10 mb-2" />
                            <p className="text-[8px] text-white/20 italic uppercase font-black text-center">No pending entry signals.</p>
                          </div>
                        ) : requests.map((req) => (
                          <div key={req.id} className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary ring-1 ring-primary/30">
                                {req.profiles?.full_name?.[0]}
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-white/70 truncate">{req.profiles?.full_name}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button className="flex-1 h-8 bg-accent text-white text-[8px] font-black uppercase tracking-widest hover:scale-105 transition-transform" onClick={() => handleApproveRequest(req.id, req.user_id)}>
                                <Check className="w-3.5 h-3.5 mr-1" /> Approve
                              </Button>
                              <Button variant="ghost" className="flex-1 h-8 bg-white/5 text-white/40 text-[8px] font-black uppercase tracking-widest hover:bg-white/10" onClick={() => handleRejectRequest(req.id)}>
                                <X className="w-3.5 h-3.5 mr-1" /> Terminate
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      <h3 className="text-xs font-black uppercase tracking-widest text-red-500 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5" /> Danger Zone
                      </h3>
                      {!showTerminateConfirm ? (
                        <Button
                          variant="ghost"
                          className="w-full h-10 bg-red-500/10 text-red-500 text-[10px] font-black uppercase border border-red-500/20 hover:bg-red-500 hover:text-white transition-all group"
                          onClick={() => setShowTerminateConfirm(true)}
                        >
                          <Trash2 className="w-4 h-4 mr-2 group-hover:animate-bounce" /> Decommission System
                        </Button>
                      ) : (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-4 text-center">
                          <p className="text-[9px] text-red-500/80 font-black uppercase leading-relaxed">System Resonance Termination Requested. All fleet data will be permanently erased.</p>
                          <div className="flex gap-2">
                            <Button
                              className="flex-1 h-10 bg-red-500 text-white text-[10px] font-black uppercase hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all"
                              onClick={handleDeleteSystem}
                              disabled={loading}
                            >
                              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "YES, TERMINATE"}
                            </Button>
                            <Button
                              variant="ghost"
                              className="flex-1 h-10 bg-white/5 text-white/40 text-[10px] font-black uppercase hover:bg-white/10"
                              onClick={() => setShowTerminateConfirm(false)}
                            >
                              REVERT
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </section>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
