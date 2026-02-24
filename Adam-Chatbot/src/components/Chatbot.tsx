import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, HelpCircle, Mail, ChevronRight, Wrench, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Message = {
  type: 'bot' | 'user';
  text: string;
  timestamp: Date;
};

type Screen = 'home' | 'chat' | 'faq' | 'appointment';

const WELCOME_MESSAGE = `Hi! Welcome to Kassewood Fabricators. How can we help you today?`;

/* ── Warm-neutral palette (matches Kasselwood website) ── */
const C = {
  // Dark tones (warm charcoal — NOT blue-slate)
  dark: '#2B2B2B',
  darkMid: '#3A3835',
  darkSoft: '#4A4743',
  // Accent (warm brass/gold — from the cabinet hardware on the site)
  brass: '#C4A77D',
  brassLt: '#D4BC9A',
  brassDk: '#A68B5B',
  brassGlow: 'rgba(196,167,125,0.30)',
  // Warm whites & grays
  cream: '#FAF8F5',
  warmGray: '#F3F0EC',
  border: '#E8E3DD',
  textMuted: '#8B8178',
  textBody: '#5C564E',
};

const KassewoodChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>('chat');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingMessage, setTypingMessage] = useState<string | null>(null);
  const [messageQueue, setMessageQueue] = useState<string[]>([]);
  const [botBusy, setBotBusy] = useState(false);
  const [hasLoadedWelcome, setHasLoadedWelcome] = useState(false);
  const [appointmentLoading, setAppointmentLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Responsive: detect mobile
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 480);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 480);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [userId] = useState(() => {
    const existing = sessionStorage.getItem("adams_user_id");
    if (existing) return existing;
    const random = `user_${Math.random().toString(36).substring(2, 10)}`;
    sessionStorage.setItem("adams_user_id", random);
    return random;
  });

  useEffect(() => {
    const savedMessages = sessionStorage.getItem(`chat_messages_${userId}`);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
        setHasLoadedWelcome(true);
      } catch (error) {
        console.error('Error loading saved messages:', error);
      }
    }
  }, [userId]);

  useEffect(() => {
    if (screen === 'chat' && messages.length === 0 && !hasLoadedWelcome) {
      setMessages([{
        type: 'bot',
        text: WELCOME_MESSAGE,
        timestamp: new Date()
      }]);
      setHasLoadedWelcome(true);
    }
  }, [screen, messages.length, hasLoadedWelcome]);

  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(`chat_messages_${userId}`, JSON.stringify(messages));
    }
  }, [messages, userId]);

  const faqData = [
    {
      question: "Who will be coming to my home?",
      answer: "As a homeowner, we understand how important it is that you know who enters your home. This is why we always hold a meet session between the homeowner and the Montreal renovation team that will be handling your renovation beforehand."
    },
    {
      question: "What happens if I have to make a change?",
      answer: "Utilizing a flexible and collaborative approach with each of our clients allows us to adapt to any unforeseen circumstances, including changes throughout the project. We never consider our job done until our client is happy. Call us today at (514) 685-5550."
    },
    {
      question: "How long will my project take?",
      answer: "The duration of your project depends on several factors, including the scope of the project. We'll provide you with an estimation of the time necessary upon inspection of the site. We offer the quickest turnaround times in the industry and once we start, we'll stay on your project until it's completed."
    },
    {
      question: "How much will my construction and remodelling project cost?",
      answer: "This depends on your needs and budget. No two projects are the same, that's why we send our representative to gauge the needs of your property. We always do our best to find a way to meet your goals within your budget, and make adjustments or suggestions to do what we can."
    },
    {
      question: "What is the difference between a renovation company and Kasselwood Fabricators?",
      answer: "A renovation company will handle most but not all aspects of your renovation project. At Kasselwood Fabricators we operate with a turn-key solution for your entire project from rough to finishing to upholstery products and built-in furniture. We take all the stress out of a renovation."
    },
    {
      question: "Are you licensed and insured?",
      answer: "We are fully RBQ licensed and are insured to ensure that you never have to be liable for any accidents or injury that occur on your site."
    },
    {
      question: "Can you assist with the design phase of the project?",
      answer: "Yes! We are proud to offer a complete service to our clients that truly is beginning to finish. Our in-house team of designers can help you with all the design work that you need help with. We are specialists in both building and designing."
    }
  ];

  const quickActions = [
    {
      icon: MessageCircle,
      title: "Start a Chat",
      subtitle: "Get instant help from our team",
      action: () => setScreen('chat'),
    },
    {
      icon: Mail,
      title: "Email Support",
      subtitle: "info@adamssvcs.com",
      action: () => window.open('mailto:info@adamssvcs.com'),
    }
  ];

  const handleBotResponse = async (userMessage: string) => {
    setBotBusy(true);
    setTypingMessage("Support agent is typing...");

    try {
      const response = await fetch("https://craftyy.app.n8n.cloud/webhook/kasselwoodfabricators-chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, user_id: userId })
      });

      if (!response.ok) {
        throw new Error(`Webhook returned status ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "";
      let replyText = "";

      if (contentType.includes("application/json")) {
        const data = await response.json();
        replyText = data.reply || data.output || data.message || data.response || data.text || (typeof data === 'string' ? data : JSON.stringify(data));
      } else {
        replyText = await response.text();
      }

      const replies = replyText.split("\\k").filter((part: string) => part.trim() !== "");

      if (replies.length === 0) {
        replies.push("Thank you for contacting Kassewood Fabricators. How can we help you today?");
      }

      for (let i = 0; i < replies.length; i++) {
        if (i > 0) {
          setTypingMessage("Support agent is typing...");
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        setTypingMessage(null);
        setMessages(prev => [...prev, {
          type: 'bot',
          text: replies[i].trim(),
          timestamp: new Date()
        }]);

        if (i < replies.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

    } catch (error: any) {
      console.error('Webhook error:', error);
      setTypingMessage(null);
      setMessages(prev => [...prev, {
        type: 'bot',
        text: "We sincerely apologize for the inconvenience. Our system is currently experiencing difficulties. Please try again shortly, or feel free to reach out to us directly — we're always happy to assist you.",
        timestamp: new Date()
      }]);
    }

    setBotBusy(false);
    setMessageQueue(prev => {
      const [nextMessage, ...rest] = prev;
      if (nextMessage) {
        setTimeout(() => handleBotResponse(nextMessage), 2000);
      }
      return rest;
    });
  };

  const sendMessage = async () => {
    if (input.trim() === '') return;
    const message = input.trim();
    setInput('');
    setMessages(prev => [...prev, {
      type: 'user',
      text: message,
      timestamp: new Date()
    }]);

    if (botBusy) {
      setMessageQueue(prev => [...prev, message]);
    } else {
      await handleBotResponse(message);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setScreen('chat');
    setTimeout(() => {
      setMessages(prev => [...prev, {
        type: 'user',
        text: question,
        timestamp: new Date()
      }]);
      handleBotResponse(question);
    }, 300);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingMessage]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const parseMarkdown = (text: string) => {
    let parsed = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    parsed = parsed.replace(/__(.+?)__/g, '<strong>$1</strong>');
    parsed = parsed.replace(/\*(.+?)\*/g, '<em>$1</em>');
    parsed = parsed.replace(/_(.+?)_/g, '<em>$1</em>');
    parsed = parsed.replace(/\[(.+?)\]\((.+?)\)/g, `<a href="$2" target="_blank" rel="noopener noreferrer" style="color:${C.brass};text-decoration:underline">$1</a>`);
    parsed = parsed.replace(/\n/g, '<br />');
    return parsed;
  };



  const screenVariants = {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.22 } },
    exit: { opacity: 0, y: -6, transition: { duration: 0.12 } },
  };

  return (
    <>
      {/* ═══════════════ FLOATING ACTION BUTTON ═══════════════ */}
      <div
        className="fixed z-50"
        style={{ bottom: isMobile ? 16 : 24, right: isMobile ? 16 : 24 }}
      >
        <motion.button
          onClick={() => setIsOpen(prev => !prev)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          style={{
            width: isMobile ? 52 : 60,
            height: isMobile ? 52 : 60,
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            background: `linear-gradient(145deg, ${C.dark}, ${C.darkMid})`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.25), 0 0 40px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle ring glow */}
          <div style={{
            position: 'absolute',
            inset: -2,
            borderRadius: '50%',
            background: `conic-gradient(from 0deg, transparent, ${C.brassGlow}, transparent, ${C.brassGlow}, transparent)`,
            animation: 'fabRingSpin 4s linear infinite',
            opacity: isOpen ? 0 : 0.6,
            transition: 'opacity 0.3s ease',
          }} />
          <div style={{
            position: 'absolute',
            inset: 2,
            borderRadius: '50%',
            background: `linear-gradient(145deg, ${C.dark}, ${C.darkMid})`,
          }} />
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
                style={{ position: 'relative', zIndex: 1, display: 'flex' }}
              >
                <X style={{ width: 24, height: 24, color: C.brassLt }} />
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
                style={{ position: 'relative', zIndex: 1, display: 'flex' }}
              >
                <MessageCircle style={{ width: 24, height: 24, color: C.brassLt }} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Notification dot when closed */}
        {!isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#6EE7A0',
              border: '2.5px solid white',
              boxShadow: '0 0 8px rgba(110,231,160,0.4)',
              animation: 'gentlePulse 2s ease-in-out infinite',
            }}
          />
        )}
      </div>

      {/* ═══════════════ CHATBOT PANEL ═══════════════ */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed z-50"
            style={isMobile ? {
              inset: 0,
              width: '100%',
              height: '100%',
            } : {
              bottom: 96,
              right: 24,
              width: '100%',
              maxWidth: 400,
            }}
            initial={{ opacity: 0, y: isMobile ? 30 : 20, scale: isMobile ? 1 : 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isMobile ? 30 : 20, scale: isMobile ? 1 : 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          >
            <div
              style={{
                height: isMobile ? '100%' : 'min(80dvh, 620px)',
                maxHeight: isMobile ? '100%' : '80dvh',
                minHeight: isMobile ? '100%' : 420,
                borderRadius: isMobile ? 0 : 20,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                background: C.cream,
                boxShadow: isMobile ? 'none' : '0 8px 40px rgba(0,0,0,0.16), 0 0 60px rgba(0,0,0,0.06)',
                border: isMobile ? 'none' : `1px solid ${C.border}`,
              }}
            >
              {/* ═══════════════ HEADER ═══════════════ */}
              <div
                className="chatbot-header-shine"
                style={{
                  position: 'relative',
                  background: `linear-gradient(145deg, ${C.dark} 0%, ${C.darkMid} 60%, ${C.darkSoft} 100%)`,
                  padding: isMobile
                    ? (screen === 'home' ? '16px 14px 22px' : '12px 14px')
                    : (screen === 'home' ? '22px 20px 28px' : '16px 20px'),
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {/* Subtle floating orbs */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute', width: 80, height: 80, borderRadius: '50%',
                    background: `radial-gradient(circle, ${C.brassGlow}, transparent 70%)`,
                    top: '-15%', right: '8%',
                    animation: 'float 6s ease-in-out infinite',
                  }} />
                  <div style={{
                    position: 'absolute', width: 60, height: 60, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.06), transparent 70%)',
                    bottom: '5%', left: '12%',
                    animation: 'float 8s ease-in-out infinite 1.5s',
                  }} />
                </div>

                {/* Shimmer */}
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.02) 45%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 55%, transparent 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 8s linear infinite',
                }} />

                {/* Content */}
                <div style={{ position: 'relative', zIndex: 2 }}>
                  {/* Mobile close button */}
                  {isMobile && (
                    <button
                      onClick={() => setIsOpen(false)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 3,
                      }}
                    >
                      <X style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.6)' }} />
                    </button>
                  )}
                  {/* Header top row: Logo left, Online badge right */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: screen === 'home' ? 12 : 8,
                  }}>
                    {/* Logo on the left */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      {/* Golden glow behind logo */}
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: isMobile ? 80 : 100,
                        height: isMobile ? 32 : 40,
                        borderRadius: '50%',
                        background: `radial-gradient(ellipse, ${C.brassGlow}, transparent 70%)`,
                        animation: 'glowPulse 3s ease-in-out infinite',
                        pointerEvents: 'none',
                        transform: 'translate(-50%, -50%)',
                      }} />
                      <img
                        src="/image.png"
                        alt="Kassewood Logo"
                        className="chatbot-logo-enter"
                        style={{
                          maxHeight: isMobile ? 40 : 48,
                          width: 'auto',
                          objectFit: 'contain',
                          position: 'relative',
                          zIndex: 1,
                        }}
                      />
                    </div>

                    {/* Online status badge on the right */}
                    <div
                      className="chatbot-online-badge"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        padding: '6px 14px 6px 10px',
                        borderRadius: 20,
                        background: 'rgba(255,255,255,0.10)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Shimmer overlay on badge */}
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 4s linear infinite',
                        pointerEvents: 'none',
                        borderRadius: 20,
                      }} />
                      {/* Pulsing green dot */}
                      <div style={{ position: 'relative', width: 10, height: 10 }}>
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '50%',
                          background: '#4ADE80',
                          animation: 'onlinePing 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                          opacity: 0.6,
                        }} />
                        <div style={{
                          position: 'relative',
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: '#22C55E',
                          boxShadow: '0 0 6px rgba(34,197,94,0.5)',
                        }} />
                      </div>
                      <span style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.88)',
                        letterSpacing: 0.4,
                        position: 'relative',
                        zIndex: 1,
                      }}>
                        Online
                      </span>
                    </div>
                  </div>

                  {screen === 'home' && (
                    <div style={{ marginTop: 14 }}>
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                        Your next Montreal renovation project starts here
                      </p>
                    </div>
                  )}

                  {screen === 'faq' && (
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '8px 0 0', letterSpacing: 0.3 }}>
                      Common questions about our services
                    </p>
                  )}
                </div>
              </div>

              {/* ═══════════════ MAIN CONTENT ═══════════════ */}
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
                <AnimatePresence mode="wait">

                  {/* ─── HOME SCREEN ─── */}
                  {screen === 'home' && (
                    <motion.div
                      key="home" {...screenVariants}
                      className="chatbot-scroll"
                      style={{ height: '100%', overflowY: 'auto', padding: '20px 16px' }}
                    >
                      <div style={{ textAlign: 'center', marginBottom: 20 }}>
                        <h4 style={{ fontSize: 20, fontWeight: 700, color: C.dark, margin: '0 0 6px', letterSpacing: 0.3 }}>
                          How Can We Help?
                        </h4>
                        <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>
                          Residential & commercial renovation experts
                        </p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {quickActions.map((action, index) => {
                          const Icon = action.icon;
                          return (
                            <button
                              key={index}
                              onClick={action.action}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                width: '100%', padding: '14px 16px',
                                background: 'white', border: `1px solid ${C.border}`,
                                borderRadius: 14, cursor: 'pointer',
                                transition: 'all 0.25s ease',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                              }}
                              onMouseEnter={e => {
                                (e.currentTarget as HTMLElement).style.borderColor = C.brass;
                                (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${C.brassGlow}`;
                                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={e => {
                                (e.currentTarget as HTMLElement).style.borderColor = C.border;
                                (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                  width: 40, height: 40, borderRadius: 10,
                                  background: `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                  <Icon style={{ width: 18, height: 18, color: C.brassLt }} />
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                  <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.dark }}>{action.title}</h5>
                                  <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textMuted }}>{action.subtitle}</p>
                                </div>
                              </div>
                              <ChevronRight style={{ width: 16, height: 16, color: C.textMuted }} />
                            </button>
                          );
                        })}
                      </div>

                      <div style={{
                        marginTop: 16, padding: 14,
                        background: 'white',
                        borderRadius: 14,
                        border: `1px solid ${C.border}`,
                      }}>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <Wrench style={{ width: 18, height: 18, color: C.brass, flexShrink: 0, marginTop: 1 }} />
                          <div>
                            <h5 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.dark }}>24/7 Emergency Service Available</h5>
                            <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textBody, lineHeight: 1.5 }}>
                              HVAC emergencies? We're here to help anytime. Call us immediately at (205) 462-8303
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ─── CHAT SCREEN ─── */}
                  {screen === 'chat' && (
                    <motion.div
                      key="chat" {...screenVariants}
                      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                    >
                      {/* Messages */}
                      <div
                        className="chatbot-scroll"
                        style={{
                          flex: 1, minHeight: 0, overflowY: 'auto',
                          padding: '16px 14px',
                          background: C.warmGray,
                        }}
                      >
                        {messages.map((msg, idx) => (
                          <div
                            key={idx}
                            className="msg-enter"
                            style={{
                              display: 'flex',
                              justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
                              marginBottom: 14,
                              animationDelay: `${Math.min(idx * 0.04, 0.25)}s`,
                            }}
                          >
                            <div style={{ maxWidth: '82%' }}>
                              <div style={{
                                display: 'flex', alignItems: 'flex-end', gap: 8,
                                flexDirection: msg.type === 'user' ? 'row-reverse' : 'row',
                              }}>
                                {/* Avatar */}
                                <div style={{
                                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: msg.type === 'user'
                                    ? `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`
                                    : `linear-gradient(135deg, ${C.brass}, ${C.brassDk})`,
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                  animation: `avatarPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both`,
                                  animationDelay: `${Math.min(idx * 0.04, 0.25)}s`,
                                }}>
                                  <span style={{ color: 'white', fontSize: 10, fontWeight: 700 }}>
                                    {msg.type === 'user' ? 'U' : 'K'}
                                  </span>
                                </div>

                                {/* Bubble */}
                                <div style={{
                                  padding: '10px 14px',
                                  borderRadius: msg.type === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                  ...(msg.type === 'user' ? {
                                    background: `linear-gradient(135deg, ${C.dark}, ${C.darkSoft})`,
                                    color: '#F5F0EB',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                  } : {
                                    background: 'white',
                                    color: C.dark,
                                    border: `1px solid ${C.border}`,
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                                  }),
                                }}>
                                  <div
                                    style={{ fontSize: 13.5, lineHeight: 1.55 }}
                                    dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }}
                                  />
                                </div>
                              </div>
                              <p style={{
                                fontSize: 10, color: C.textMuted, marginTop: 4,
                                paddingLeft: msg.type === 'user' ? 0 : 36,
                                paddingRight: msg.type === 'user' ? 36 : 0,
                                textAlign: msg.type === 'user' ? 'right' : 'left',
                              }}>
                                {formatTime(msg.timestamp)}
                              </p>
                            </div>
                          </div>
                        ))}

                        {/* Typing indicator */}
                        {typingMessage && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 14 }}
                          >
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: `linear-gradient(135deg, ${C.brass}, ${C.brassDk})`,
                              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                            }}>
                              <span style={{ color: 'white', fontSize: 10, fontWeight: 700 }}>K</span>
                            </div>
                            <div style={{
                              padding: '12px 16px', borderRadius: '16px 16px 16px 4px',
                              background: 'white',
                              border: `1px solid ${C.border}`,
                              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                              display: 'flex', gap: 4,
                            }}>
                              {[0, 1, 2].map(i => (
                                <div key={i} style={{
                                  width: 7, height: 7, borderRadius: '50%',
                                  background: C.brass,
                                  animation: `dotBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                                }} />
                              ))}
                            </div>
                          </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* ─── Chat Input ─── */}
                      <div
                        className={isMobile ? 'chatbot-safe-bottom' : ''}
                        style={{
                          padding: isMobile ? '10px 10px' : '12px 14px',
                          background: 'white',
                          borderTop: `1px solid ${C.border}`,
                          flexShrink: 0,
                        }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Type your message..."
                            style={{
                              flex: 1, padding: '11px 14px',
                              border: `1.5px solid ${C.border}`,
                              borderRadius: 12, outline: 'none',
                              background: C.cream, fontSize: 13.5,
                              transition: 'all 0.2s ease',
                              color: C.dark,
                            }}
                            onFocus={e => {
                              e.currentTarget.style.borderColor = C.brass;
                              e.currentTarget.style.boxShadow = `0 0 0 3px ${C.brassGlow}`;
                              e.currentTarget.style.background = 'white';
                            }}
                            onBlur={e => {
                              e.currentTarget.style.borderColor = C.border;
                              e.currentTarget.style.boxShadow = 'none';
                              e.currentTarget.style.background = C.cream;
                            }}
                          />
                          <button
                            onClick={sendMessage}
                            disabled={!input.trim() || botBusy}
                            style={{
                              width: 42, height: 42, borderRadius: 12,
                              border: 'none',
                              cursor: (!input.trim() || botBusy) ? 'not-allowed' : 'pointer',
                              background: (!input.trim() || botBusy)
                                ? C.border
                                : `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.2s ease',
                              flexShrink: 0,
                            }}
                            onMouseEnter={e => {
                              if (input.trim() && !botBusy) {
                                (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                              }
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                            }}
                          >
                            <Send style={{ width: 16, height: 16, color: (!input.trim() || botBusy) ? C.textMuted : C.brassLt }} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ─── FAQ SCREEN ─── */}
                  {screen === 'faq' && (
                    <motion.div
                      key="faq" {...screenVariants}
                      className="chatbot-scroll"
                      style={{
                        height: '100%', overflowY: 'auto',
                        padding: '16px 14px',
                        background: C.warmGray,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {faqData.map((faq, index) => (
                          <details
                            key={index}
                            style={{
                              background: 'white',
                              borderRadius: 12,
                              border: `1px solid ${C.border}`,
                              overflow: 'hidden',
                              transition: 'all 0.25s ease',
                            }}
                          >
                            <summary style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '12px 14px', cursor: 'pointer',
                              fontSize: 13, fontWeight: 600, color: C.dark,
                              listStyle: 'none',
                            }}>
                              <span style={{ flex: 1, paddingRight: 10, lineHeight: 1.4 }}>{faq.question}</span>
                              <ChevronRight style={{
                                width: 14, height: 14, color: C.textMuted, flexShrink: 0,
                                transition: 'transform 0.25s ease',
                              }} />
                            </summary>
                            <div style={{
                              padding: '0 14px 14px',
                              borderTop: `1px solid ${C.border}`,
                            }}>
                              <p style={{ fontSize: 12.5, color: C.textBody, lineHeight: 1.6, margin: '10px 0 0' }}>
                                {faq.answer}
                              </p>
                              <button
                                onClick={() => handleQuickQuestion(faq.question)}
                                style={{
                                  marginTop: 8, padding: '5px 0',
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', gap: 5,
                                  fontSize: 12, fontWeight: 600, color: C.brass,
                                  transition: 'color 0.2s ease',
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.brassDk }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.brass }}
                              >
                                <MessageCircle style={{ width: 13, height: 13 }} />
                                <span>Ask this in chat →</span>
                              </button>
                            </div>
                          </details>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ═══════════════ FOOTER NAV ═══════════════ */}
              <div
                className={isMobile ? 'chatbot-safe-bottom' : ''}
                style={{
                  display: 'flex',
                  background: 'white',
                  borderTop: `1px solid ${C.border}`,
                  flexShrink: 0,
                }}>
                {[
                  { icon: MessageCircle, label: 'Chat', screen: 'chat' as Screen },
                  { icon: HelpCircle, label: 'FAQ', screen: 'faq' as Screen },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = screen === item.screen;
                  return (
                    <button
                      key={item.screen}
                      className="chatbot-nav-btn"
                      onClick={() => setScreen(item.screen)}
                      style={{
                        flex: 1, padding: '11px 0 9px', border: 'none',
                        background: 'transparent', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                        position: 'relative',
                        transition: 'all 0.25s ease',
                      }}
                    >
                      <Icon className="chatbot-nav-icon" style={{
                        width: 20, height: 20,
                        color: isActive ? C.brass : C.textMuted,
                        transition: 'all 0.25s ease',
                        transform: isActive ? 'scale(1.1)' : 'scale(1)',
                      }} />
                      <span style={{
                        fontSize: 10, fontWeight: isActive ? 700 : 500,
                        color: isActive ? C.brass : C.textMuted,
                        letterSpacing: 0.3,
                        transition: 'all 0.25s ease',
                      }}>
                        {item.label}
                      </span>
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          style={{
                            position: 'absolute', bottom: 0,
                            left: '50%', transform: 'translateX(-50%)',
                            width: 28, height: 2.5,
                            background: `linear-gradient(90deg, ${C.brass}, ${C.brassLt})`,
                            borderRadius: 10,
                          }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default KassewoodChatbot;