"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { GlassCard } from "@/components/ui/GlassCard"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { MessageSquare, Send, CheckCircle2, XCircle, Loader2, Sparkles, ShieldAlert } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn, formatTime } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function PrivateMoonPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [chats, setChats] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const chatRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<any>(null)
  const [syncStatus, setSyncStatus] = useState<string>("connecting")
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)

      await refreshData(user.id)
      setLoading(false)
    }
    init()

    const setupSignal = () => {
      channelRef.current = supabase
        .channel('private-moon-sync', { config: { broadcast: { self: false } } })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages' }, async (payload) => {
          const newDm = payload.new as any;
          if (user && (newDm.receiver_id === user.id || newDm.sender_id === user.id)) {
            if (activeChat && (newDm.sender_id === activeChat || newDm.receiver_id === activeChat)) {
              setMessages(prev => {
                if (prev.some(m => String(m.id) === String(newDm.id))) return prev;
                return [...prev, newDm];
              });
            }
            refreshData(user.id);
          }
        })
        .on('broadcast', { event: 'dm' }, (payload) => {
          const newDm = payload.payload;
          if (user && (newDm.receiver_id === user.id || newDm.sender_id === user.id)) {
            if (activeChat && (newDm.sender_id === activeChat || newDm.receiver_id === activeChat)) {
              setMessages(prev => {
                if (prev.some(m => String(m.id) === String(newDm.id))) return prev;
                return [...prev, newDm];
              });
            }
            refreshData(user.id);
          }
        })
        .subscribe((status) => {
          setSyncStatus(status)
          if (status === 'SUBSCRIBED') setRetryCount(0);
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (retryCount < 5) {
              setRetryCount(prev => prev + 1);
              setTimeout(() => {
                if (channelRef.current) supabase.removeChannel(channelRef.current);
                setupSignal();
              }, 1500 * (retryCount + 1));
            }
          }
        })
    }

    if (user) setupSignal()

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [user, activeChat, retryCount])

  const refreshData = async (userId: string) => {
    const { data: allDms } = await supabase
      .from('dm_messages')
      .select('*, sender:profiles!dm_messages_sender_id_fkey(full_name, avatar_url), receiver:profiles!dm_messages_receiver_id_fkey(full_name, avatar_url)')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (allDms) {
      const uniqueContacts = new Map()
      const incomingReqs: any[] = []

      allDms.forEach(dm => {
        const isSender = dm.sender_id === userId
        const contact = isSender ? dm.receiver : dm.sender
        const contactId = isSender ? dm.receiver_id : dm.sender_id

        if (dm.status === 'pending' && !isSender) {
          incomingReqs.push({ ...dm, contact })
        } else if (dm.status === 'accepted') {
          if (!uniqueContacts.has(contactId)) {
            uniqueContacts.set(contactId, {
              id: contactId,
              name: contact?.full_name || "Unknown Voyager",
              avatar: contact?.avatar_url,
              lastMsg: dm.content,
              time: new Date(dm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            })
          }
        }
      })

      setChats(Array.from(uniqueContacts.values()))
      setRequests(incomingReqs)
    }
  }

  useEffect(() => {
    if (activeChat && user) {
      const fetchMsgs = async () => {
        const { data } = await supabase
          .from('dm_messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeChat}),and(sender_id.eq.${activeChat},receiver_id.eq.${user.id})`)
          .eq('status', 'accepted')
          .order('created_at', { ascending: true })
        if (data) setMessages(data)
      }
      fetchMsgs()
    }
  }, [activeChat, user])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !activeChat || !user) return

    const tempId = Math.random();
    const tempMsg = {
      id: tempId,
      sender_id: user.id,
      receiver_id: activeChat,
      content: input,
      created_at: new Date().toISOString(),
      status: 'accepted'
    };

    setMessages(prev => [...prev, tempMsg]);

    const { error, data: realMsg } = await supabase
      .from('dm_messages')
      .insert([{ sender_id: user.id, receiver_id: activeChat, content: input, status: 'accepted' }])
      .select()
      .single()

    if (!error && realMsg) {
      setInput("")
      // Update local state with real ID
      setMessages(prev => prev.map(m => m.id === tempId ? realMsg : m));

      // ⚡ BROADCAST INSTANTLY WITH REAL ID
      channelRef.current?.send({
        type: 'broadcast',
        event: 'dm',
        payload: realMsg
      })
    } else if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error("Signal Transmission Failed")
    }
  }

  const handleAccept = async (dm: any) => {
    const { error } = await supabase
      .from('dm_messages')
      .update({ status: 'accepted', content: 'Signal established. Safe transmission initiated.' })
      .eq('id', dm.id)

    if (error) {
      toast.error("Signal acceptance failed.")
    } else {
      toast.success("Signal Accepted.")
      setActiveChat(dm.sender_id)
    }
  }

  const handleReject = async (dmId: string) => {
    const { error } = await supabase.from('dm_messages').delete().eq('id', dmId)
    if (error) {
      toast.error("Signal termination failed.")
    } else {
      toast.info("Signal rejected.")
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>

  return (
    <div className="flex-1 flex overflow-hidden p-4 md:p-8">
      <div className="flex-1 flex gap-6 max-w-7xl mx-auto w-full overflow-hidden">
        <div className="w-80 flex flex-col gap-6">
          <header>
            <h1 className="text-3xl font-black font-outfit flex items-center gap-2">
              <MessageSquare className="w-8 h-8 text-primary" />
              Private Moon
            </h1>
            <p className="text-white/40 text-sm italic">"Encrypted point-to-point synchronization."</p>
          </header>

          <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 scrollbar-hide">
            {requests.length > 0 && (
              <>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                  <ShieldAlert className="w-3 h-3" /> Incoming Signals
                </h3>
                {requests.map(req => (
                  <GlassCard key={req.id} className="p-4 border-accent/20 bg-accent/5">
                    <div className="text-sm font-black mb-1">{req.contact?.full_name}</div>
                    <p className="text-[10px] text-white/40 mb-4 truncate italic">{req.content}</p>
                    <div className="flex gap-2">
                      <Button onClick={() => handleAccept(req)} variant="secondary" size="sm" className="flex-1 h-8 bg-accent text-white text-[10px] uppercase font-black">ACCEPT</Button>
                      <Button onClick={() => handleReject(req.id)} variant="ghost" size="sm" className="w-8 h-8 p-0 bg-white/5"><XCircle className="w-4 h-4" /></Button>
                    </div>
                  </GlassCard>
                ))}
              </>
            )}

            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary/60 mt-4 flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> Secure Fleet
            </h3>
            {chats.length > 0 ? chats.map(chat => (
              <GlassCard
                key={chat.id}
                className={cn(
                  "p-4 border-white/5 cursor-pointer flex items-center gap-4 transition-all hover:border-primary/20",
                  activeChat === chat.id ? "bg-primary/10 border-primary/20 shadow-[0_0_20px_rgba(139,92,246,0.1)]" : "hover:bg-white/5"
                )}
                onClick={() => setActiveChat(chat.id)}
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center font-bold text-primary overflow-hidden border border-primary/10">
                  {chat.avatar ? <img src={chat.avatar} className="w-full h-full object-cover" /> : chat.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <div className="text-xs font-black uppercase tracking-tight truncate">{chat.name}</div>
                    <div className="text-[8px] text-white/20 font-bold">{chat.time}</div>
                  </div>
                  <div className="text-[10px] text-white/40 truncate italic">{chat.lastMsg}</div>
                </div>
              </GlassCard>
            )) : <p className="text-[10px] text-white/10 uppercase font-black text-center py-8 tracking-[0.3em]">No Secure Signals</p>}
          </div>
        </div>

        <div className="flex-1 flex flex-col glass-card border-white/5 overflow-hidden relative">
          {activeChat ? (
            <>
              <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center font-bold text-primary overflow-hidden border border-primary/10">
                    {chats.find(c => c.id === activeChat)?.avatar ? <img src={chats.find(c => c.id === activeChat)?.avatar} className="w-full h-full object-cover" /> : chats.find(c => c.id === activeChat)?.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-black font-outfit uppercase tracking-widest">{chats.find(c => c.id === activeChat)?.name}</div>
                  </div>
                </div>
              </div>

              <div ref={chatRef} className="flex-1 p-6 space-y-4 overflow-y-auto scrollbar-hide">
                <AnimatePresence>
                  {messages.map((m, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn("flex flex-col", m.sender_id === user.id ? "items-end" : "items-start")}
                    >
                      <div className={cn(
                        "px-4 py-2.5 rounded-2xl max-w-[70%] text-sm ring-1 relative group",
                        m.sender_id === user.id ? "bg-primary/20 text-white ring-primary/20 rounded-tr-none shadow-[0_4px_15px_rgba(139,92,246,0.1)]" : "bg-white/5 text-white/80 ring-white/5 rounded-tl-none"
                      )}>
                        {m.content}
                        <div className={cn(
                          "text-[7px] font-bold opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-4 uppercase tracking-widest text-white/20 whitespace-nowrap",
                          m.sender_id === user.id ? "right-0" : "left-0"
                        )}>
                          {formatTime(m.created_at)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <form className="p-4 border-t border-white/5 bg-white/[0.01]" onSubmit={handleSend}>
                <div className="relative flex items-center gap-3">
                  <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Transmit secure signal..." className="pr-16 h-12" />
                  <Button type="submit" size="sm" className="absolute right-2 px-3 h-8 bg-primary">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center text-primary/20 mb-6 border border-primary/10 shadow-[0_0_50px_rgba(139,92,246,0.05)]">
                <ShieldAlert className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-black font-outfit mb-2 uppercase tracking-widest">SECURE ZONE</h2>
              <p className="text-white/30 text-xs max-w-sm uppercase tracking-tight leading-relaxed">Establish a signal via the Public Orb to initiate point-to-point transmission.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
