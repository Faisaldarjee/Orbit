"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { GlassCard } from "@/components/ui/GlassCard"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Send, Globe, Search, Sparkles, XCircle, WifiOff, Zap, ShieldAlert, RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn, formatTime } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function PublicOrbPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [user, setUser] = useState<any>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const [syncStatus, setSyncStatus] = useState<string>("connecting")
  const [retryCount, setRetryCount] = useState(0)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)
    }
    getUser()

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            id, content, created_at, user_id,
            profiles (full_name, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) {
          console.error("Fetch Messages Error:", error);
          toast.error("Sync Failure: Unable to fetch orbital data.");
        } else if (data) {
          setMessages(data.reverse())
        }
      } catch (err) {
        console.error("Fetch Messages Exception:", err);
      }
    }
    fetchMessages()

    // ⚡ HYPER-ROBUST SYNC ENGINE
    const reconcile = (newMsg: any) => {
      setMessages(prev => {
        const isDuplicate = prev.some(m => String(m.id) === String(newMsg.id));
        if (isDuplicate) return prev;
        return [...prev, newMsg];
      });
    };

    const subscribeToGlobalSignal = () => {
      channelRef.current = supabase
        .channel('public-orb', { config: { broadcast: { self: false } } })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
          const rawMsg = payload.new as any;

          // Hydrate with profile data instantly
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
              subscribeToGlobalSignal();
            }, 1500 * (retryCount + 1));
          }
        })
    };

    subscribeToGlobalSignal();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [retryCount])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !user) return
    const content = input.trim();
    setInput("")

    // OPTIMISTIC BROADCAST
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
      .from('messages')
      .insert([{ user_id: user.id, content }])
      .select()
      .single()

    // ⚡ BROADCAST INSTANTLY WITH REAL ID
    if (!error && realMsg) {
      const finalMsg = { ...realMsg, profiles: tempMsg.profiles };
      // Update local state with real ID
      setMessages(prev => prev.map(m => m.id === tempId ? finalMsg : m));

      channelRef.current?.send({
        type: 'broadcast',
        event: 'chat',
        payload: finalMsg
      });
    } else if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error("Transmission error: " + error.message)
    }
  }

  const [selectedUser, setSelectedUser] = useState<any>(null)

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 h-full">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black font-outfit flex items-center gap-2">
            <Globe className="w-8 h-8 text-secondary" />
            Public Orb
          </h1>
          <p className="text-white/40 text-sm">Real-time global synchronization active.</p>
        </div>

        <div className="flex items-center gap-3">
          <GlassCard className="p-2.5 border-white/10 bg-black/20 backdrop-blur-md flex flex-col gap-2 min-w-[130px] rounded-2xl">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/30">System Status</span>
              <div className="flex items-center gap-1.5 text-[7px] text-green-500 font-black uppercase tracking-widest">
                <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                SECURE
              </div>
            </div>
            <div className="h-[1px] bg-white/5 w-full" />
            <div className="flex items-center justify-between gap-4">
               <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/30">Resonance</span>
               <div className="flex items-center gap-1.5 text-[7px] text-secondary font-black uppercase tracking-widest">
                 <div className="w-1 h-1 rounded-full bg-secondary animate-pulse" />
                 ACTIVE
               </div>
            </div>
          </GlassCard>
        </div>
      </header>

      <div className="flex-1 flex flex-col glass-card border-white/5 relative bg-white/[0.01] overflow-hidden rounded-[2.5rem]">

        <div ref={chatRef} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-2 scrollbar-hide scroll-smooth">
          <AnimatePresence mode="popLayout">
            {messages.map((m, idx) => {
              const isMe = m.user_id === user?.id;
              const isConsecutive = idx > 0 && messages[idx-1].user_id === m.user_id;
              
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "flex gap-4 max-w-[85%] group",
                    isMe ? "flex-row-reverse ml-auto" : "",
                    isConsecutive ? "mt-1" : "mt-6"
                  )}
                >
                  {/* Avatar section - only show if not consecutive */}
                  <div className="w-10 shrink-0 flex flex-col items-center">
                    {!isConsecutive ? (
                      <div
                        onClick={() => !isMe && setSelectedUser({ id: m.user_id, ...m.profiles })}
                        className={cn(
                          "w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary font-black overflow-hidden border border-secondary/20 shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all",
                          !isMe && "cursor-pointer hover:scale-105 hover:rotate-3"
                        )}
                      >
                        {m.profiles?.avatar_url ? (
                          <img src={m.profiles.avatar_url} alt={m.profiles.full_name} className="w-full h-full object-cover" />
                        ) : (
                          m.profiles?.full_name?.[0]?.toUpperCase() || "V"
                        )}
                      </div>
                    ) : (
                      <div className="w-10 h-0" /> // Spacer for consecutive messages
                    )}
                  </div>

                  <div className={cn("flex flex-col gap-1.5", isMe ? "items-end" : "items-start")}>
                    {/* Name and time - only show if not consecutive */}
                    {!isConsecutive && (
                      <div className="flex items-center gap-2 mb-0.5 px-1">
                        <span className="text-[9px] font-black font-outfit uppercase tracking-[0.2em] text-secondary/60">
                          {m.profiles?.full_name || "Unknown Voyager"}
                        </span>
                        <span className="text-[7px] font-bold text-white/10 uppercase tracking-widest">
                          {formatTime(m.created_at)}
                        </span>
                      </div>
                    )}
                    
                    <div className={cn(
                      "px-4 py-3 rounded-2xl shadow-sm ring-1 ring-white/5 relative",
                      isMe 
                        ? "bg-secondary/10 border-secondary/20 rounded-tr-none text-white shadow-[0_4px_15px_rgba(6,182,212,0.05)]" 
                        : "bg-white/[0.04] border-white/5 rounded-tl-none text-white/80",
                      isConsecutive && (isMe ? "rounded-tr-2xl" : "rounded-tl-2xl")
                    )}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                      
                      {/* Sub-timestamp revealed on hover for consecutive msgs */}
                      {isConsecutive && (
                         <div className={cn(
                           "absolute -bottom-4 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-[6px] font-black uppercase tracking-widest text-white/20",
                           isMe ? "right-0" : "left-0"
                         )}>
                           {formatTime(m.created_at)}
                         </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <form onSubmit={handleSend} className="p-6 md:p-8 bg-black/20 border-t border-white/5">
          <div className="relative flex items-center gap-4 max-w-4xl mx-auto w-full">
            <div className="relative flex-1 group">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Broadcast your frequency to the universe..."
                className="pr-16 h-14 bg-white/5 border-white/10 focus:border-secondary/40 focus:bg-white/[0.07] transition-all rounded-2xl placeholder:text-white/20 placeholder:italic text-base"
              />
              <div className="absolute inset-0 rounded-2xl bg-secondary/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
            </div>
            <Button type="submit" size="sm" className="w-14 h-14 rounded-2xl bg-secondary text-white font-black hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:grayscale disabled:opacity-50" disabled={!input.trim()}>
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
