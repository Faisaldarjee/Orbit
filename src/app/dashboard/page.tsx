"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { GlassCard } from "@/components/ui/GlassCard"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Send, Globe, Search, Sparkles, XCircle, WifiOff, Zap, ShieldAlert, RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function PublicOrbPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [user, setUser] = useState<any>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const [syncStatus, setSyncStatus] = useState<string>("connecting")
  const [retryCount, setRetryCount] = useState(0)

  // 🛰️ SIGNAL STRENGTH & FINGERPRINT DIAGNOSTIC
  const performSystemCheck = async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "MISSING";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "MISSING";
    const fingerprint = `URL: ${url.substring(0, 15)}... | KEY: ${key.substring(0, 5)}...`;
    
    toast.loading(`Probing Global Signal: ${fingerprint}`, { id: "globcheck" });
    
    try {
      const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).limit(1);
      
      if (error) {
        toast.error("Universal Signal: FAILED", { 
          id: "globcheck",
          description: `Auth Error: ${error.message}. Fingerprint: ${fingerprint}`,
          duration: 15000,
          icon: <ShieldAlert className="w-5 h-5" />
        });
      } else {
        toast.success("Universal Signal: NOMINAL", { 
          id: "globcheck",
          description: `Credentials Verified (${fingerprint}). Re-syncing browser...`,
          duration: 10000,
          icon: <Zap className="w-5 h-5 text-green-500" />
        });
        window.location.reload();
      }
    } catch (err: any) {
      toast.error("Global System Check Error", { id: "globcheck", description: err.message });
    }
  };

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)
    }
    getUser()

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select(`
          id, content, created_at, user_id,
          profiles (full_name, avatar_url)
        `)
        .order('created_at', { ascending: true })
        .limit(50)
      
      if (data) setMessages(data)
    }
    fetchMessages()

    // 🛰️ AGGRESSIVE REAL-TIME BROADCAST ENGINE
    let channel: any;

    const subscribeToGlobalSignal = () => {
       channel = supabase
        .channel('public-orb')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
          try {
            const { data } = await supabase
              .from('messages')
              .select('id, content, created_at, user_id, profiles(full_name, avatar_url)')
              .eq('id', payload.new.id)
              .maybeSingle()
            
            if (data) {
              setMessages(prev => {
                const exists = prev.some(m => m.id === data.id)
                if (exists) return prev
                return [...prev, data]
              })
            }
          } catch (err) {
            console.error("Broadcast Sync Error:", err)
          }
        })
        .subscribe((status, err) => {
          setSyncStatus(status);
          console.log(`Global Sync Status:`, status, err)

          if (status === 'SUBSCRIBED') {
            setRetryCount(0);
            toast.success("Orbital Sync Established", { id: "global-success", description: "Global frequency locked." })
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            const nextRetry = retryCount + 1;
            if (nextRetry <= 3) {
              setRetryCount(nextRetry);
              toast.loading(`Re-Locking Global Signal (Attempt ${nextRetry}/3)...`, { id: "global-retry" });
              setTimeout(() => {
                supabase.removeChannel(channel);
                subscribeToGlobalSignal();
              }, 2000 * nextRetry);
            } else {
              toast.error("Orbital Sync Interrupted", { 
                id: "global-error",
                description: `Global frequency drifting: ${err?.message || 'Unstable Connection'}`,
              })
            }
          }
        })
    };

    subscribeToGlobalSignal();

    return () => {
      if (channel) supabase.removeChannel(channel)
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

    const { error } = await supabase
      .from('messages')
      .insert([{ user_id: user.id, content }])
    
    if (error) {
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
           <Button 
             variant="ghost" 
             size="sm" 
             onClick={performSystemCheck}
             className={cn(
               "bg-white/5 border border-white/10 font-black text-[10px] uppercase tracking-widest px-4",
               syncStatus === 'SUBSCRIBED' ? "text-secondary" : "text-amber-500 animate-pulse"
             )}
           >
              {syncStatus === 'SUBSCRIBED' ? <Zap className="w-3 h-3 mr-2" /> : <RefreshCw className="w-3 h-3 mr-2 animate-spin" />}
              {syncStatus === 'SUBSCRIBED' ? "Signal: NOMINAL" : "Signal: DRIFTING"}
           </Button>

          <div className="hidden md:flex items-center gap-1 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold">
            <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            SYNCHRONIZED
          </div>
        </div>
      </header>

      <div className="flex-1 flex gap-6 overflow-hidden">
        <div className="flex-1 flex flex-col glass-card border-white/5 relative bg-white/[0.01]">
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
            <AnimatePresence>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn("flex gap-4 max-w-[85%]", m.user_id === user?.id ? "flex-row-reverse ml-auto" : "")}
                >
                  <div 
                    onClick={() => m.user_id !== user?.id && setSelectedUser({ id: m.user_id, ...m.profiles })}
                    className={cn(
                      "w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary font-black overflow-hidden border border-secondary/20 shadow-[0_0_15px_rgba(6,182,212,0.1)] shrink-0 transition-transform",
                      m.user_id !== user?.id && "cursor-pointer hover:scale-105"
                    )}
                  >
                    {m.profiles?.avatar_url ? (
                      <img src={m.profiles.avatar_url} alt={m.profiles.full_name} className="w-full h-full object-cover" />
                    ) : (
                      m.profiles?.full_name?.[0]?.toUpperCase() || "V"
                    )}
                  </div>
                  <div className={cn("flex flex-col gap-1.5", m.user_id === user?.id ? "items-end" : "items-start")}>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black font-outfit uppercase tracking-[0.2em] text-secondary/80">
                        {m.profiles?.full_name || "Unknown Voyager"}
                      </span>
                    </div>
                    <div className={cn(
                      "px-4 py-3 rounded-2xl shadow-sm ring-1 ring-white/5",
                      m.user_id === user?.id ? "bg-secondary/10 border-secondary/20 rounded-tr-none" : "bg-white/[0.03] border-white/5 rounded-tl-none"
                    )}>
                      <p className="text-white/80 text-sm leading-relaxed">{m.content}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <form onSubmit={handleSend} className="p-4 border-t border-white/5 bg-white/[0.02]">
            <div className="relative flex items-center gap-3">
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Broadcast your frequency..." 
                className="pr-16 h-12"
              />
              <Button type="submit" size="sm" className="absolute right-2 px-3 h-8 bg-secondary text-white font-black hover:scale-105 transition-transform" disabled={!input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>

        <div className="hidden lg:flex w-72 flex-col gap-4">
          <GlassCard className="p-4 border-white/5 bg-white/[0.01]">
            <h3 className="text-sm font-bold mb-4 font-outfit uppercase tracking-widest text-white/30">System Status</h3>
            <div className="space-y-4">
               <div className="flex flex-col gap-1">
                 <div className="text-[10px] text-white/20 uppercase font-black">Authentication</div>
                 <div className="text-sm font-bold text-green-500 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                   SECURE
                 </div>
               </div>
               <div className="flex flex-col gap-1">
                 <div className="text-[10px] text-white/20 uppercase font-black">Data Stream</div>
                 <div className="text-sm font-bold text-secondary flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                   LIVE
                 </div>
               </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
