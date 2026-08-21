"use client";

import { useState, useRef, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BotMessageSquareIcon, SendIcon, XIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "model";
  content: string;
};

export default function CandidateChatbot({ jobId }: { jobId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", content: "Hi! I'm Vity AI, your recruitment assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // @ts-ignore - types might not be generated yet
  const sendMessage = useAction((api as any).chat?.sendMessage);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    
    const userMsg = input.trim();
    setInput("");
    
    // Add user message to UI immediately
    const newHistory = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(newHistory);
    setIsTyping(true);
    
    try {
      // Send to convex action
      const response = await sendMessage({
        jobId,
        message: userMsg,
        history: messages.slice(1).map(m => ({ role: m.role, content: m.content })) // exclude initial greeting
      });
      
      setMessages(prev => [...prev, { role: "model", content: response }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "model", content: "Sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="flex h-[500px] w-[350px] flex-col overflow-hidden rounded-2xl border border-border/70 bg-background/95 shadow-2xl backdrop-blur-sm sm:w-[400px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 bg-primary/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <BotMessageSquareIcon className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Vity AI</h3>
                <p className="text-xs text-muted-foreground">Recruitment Assistant</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => setIsOpen(false)}>
              <XIcon className="size-4" />
            </Button>
          </div>
          
          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="flex flex-col gap-3">
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                    msg.role === "user" 
                      ? "self-end bg-primary text-primary-foreground rounded-tr-sm" 
                      : "self-start bg-muted rounded-tl-sm"
                  )}
                >
                  {msg.content}
                </div>
              ))}
              {isTyping && (
                <div className="self-start max-w-[85%] rounded-2xl bg-muted px-4 py-3 rounded-tl-sm flex items-center gap-2">
                  <div className="size-2 animate-bounce rounded-full bg-foreground/40" style={{ animationDelay: "0ms" }} />
                  <div className="size-2 animate-bounce rounded-full bg-foreground/40" style={{ animationDelay: "150ms" }} />
                  <div className="size-2 animate-bounce rounded-full bg-foreground/40" style={{ animationDelay: "300ms" }} />
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* Input */}
          <div className="border-t border-border/50 p-3">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about this role..."
                className="flex-1 rounded-full border-border/70"
              />
              <Button type="submit" size="icon" className="size-10 rounded-full" disabled={isTyping || !input.trim()}>
                {isTyping ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <Button 
          onClick={() => setIsOpen(true)}
          className="size-14 rounded-full shadow-xl transition-transform hover:scale-105"
        >
          <BotMessageSquareIcon className="size-6" />
        </Button>
      )}
    </div>
  );
}
