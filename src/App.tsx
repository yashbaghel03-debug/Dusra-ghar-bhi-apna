import React, { useState, useEffect, useRef } from "react";
import { 
  Wifi, 
  Wind, 
  Utensils, 
  Car, 
  Dumbbell, 
  ShieldCheck, 
  Bath, 
  Flame, 
  Phone, 
  Search, 
  SlidersHorizontal, 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Share2, 
  Check, 
  Lock, 
  LogOut, 
  MapPin, 
  Video, 
  Camera, 
  Percent,
  Compass,
  ArrowRight,
  TrendingDown,
  Users,
  CheckCircle,
  MessageSquare,
  Send,
  Bot,
  User,
  Mail
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import ThreeDScene from "./ThreeDScene";

const ADMIN_PASSWORD = "dtu2024";
const AMENITY_OPTIONS = ["WiFi", "AC", "Meals", "Laundry", "Parking", "Gym", "CCTV", "Attached Bathroom", "Hot Water"];

// Supabase Client Setup
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Types
interface PGListing {
  id: string;
  name: string;
  gender: string; // "Boys" | "Girls" | "Both"
  actualPrice: string;
  negotiablePrice: string;
  minTenure: string;
  managerPhone: string;
  address: string;
  amenities: string[];
  videoBase64?: string;
  videoName?: string;
  videoLink?: string;
  description: string;
  photos: string[];
  addedDate?: string;
}

interface ChatMessage {
  id: string;
  sessionId: string;
  studentName: string;
  message: string;
  sender: "student" | "admin" | "ai";
  createdAt: string;
}

// Storage helper with fallback to LocalStorage
const storage = {
  get: async (key: string) => {
    if (typeof window !== "undefined" && (window as any).storage?.get) {
      try {
        return await (window as any).storage.get(key);
      } catch (e) {
        console.warn("Failed to read from window.storage, falling back to localStorage", e);
      }
    }
    const val = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    return val ? { value: val } : null;
  },
  set: async (key: string, val: string) => {
    if (typeof window !== "undefined" && (window as any).storage?.set) {
      try {
        await (window as any).storage.set(key, val);
        return;
      } catch (e) {
        console.warn("Failed to write to window.storage, falling back to localStorage", e);
      }
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(key, val);
    }
  }
};

function emptyForm(): Omit<PGListing, "id"> {
  return { 
    name: "", 
    gender: "Boys", 
    actualPrice: "", 
    negotiablePrice: "", 
    minTenure: "", 
    managerPhone: "", 
    address: "", 
    amenities: [], 
    videoBase64: "", 
    videoName: "", 
    videoLink: "", 
    description: "", 
    photos: [] 
  };
}

function getVideoEmbed(link?: string) {
  if (!link) return null;
  const yt = link.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const gdrive = link.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (gdrive) return `https://drive.google.com/file/d/${gdrive[1]}/preview`;
  return null; // direct link for native player
}

function compressImage(file: File): Promise<string> {
  return new Promise(res => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 800;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement("canvas");
      const ctx = c.getContext("2d");
      c.width = w; 
      c.height = h;
      if (ctx) ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      res(c.toDataURL("image/jpeg", 0.6));
    };
    img.src = url;
  });
}

// Convert base64 image representation back to file blob
async function base64ToBlob(base64: string): Promise<Blob> {
  const res = await fetch(base64);
  return await res.blob();
}

// Upload file directly to Supabase storage bucket
async function uploadFileToSupabase(fileBlob: Blob, name: string): Promise<string> {
  if (!supabase) throw new Error("Supabase is not initialized");
  const fileExt = name.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from("pg-media")
    .upload(fileName, fileBlob, {
      contentType: fileBlob.type || "image/jpeg",
      cacheControl: "3600",
      upsert: false
    });
    
  if (error) throw error;
  
  const { data: publicUrlData } = supabase.storage
    .from("pg-media")
    .getPublicUrl(data.path);
    
  return publicUrlData.publicUrl;
}

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  "WiFi": <Wifi size={14} />,
  "AC": <Wind size={14} />,
  "Meals": <Utensils size={14} />,
  "Laundry": <Sparkles size={14} />,
  "Parking": <Car size={14} />,
  "Gym": <Dumbbell size={14} />,
  "CCTV": <ShieldCheck size={14} />,
  "Attached Bathroom": <Bath size={14} />,
  "Hot Water": <Flame size={14} />
};

const ToranDivider: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg className="toran-divider" viewBox="0 0 400 40" preserveAspectRatio="xMidYMin slice" xmlns="http://www.w3.org/2000/svg" style={style}>
    <defs>
      <pattern id="toran-repeat" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M0,0 Q20,18 40,0" fill="none" stroke="#4C7A5E" strokeWidth="2"/>
        <circle cx="20" cy="14" r="6" fill="#E8A33D"/>
        <circle cx="20" cy="14" r="6" fill="url(#marigold-shade)"/>
        <path d="M14,22 Q20,32 26,22 Q20,28 14,22 Z" fill="#4C7A5E"/>
      </pattern>
      <radialGradient id="marigold-shade" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#F5C066"/>
        <stop offset="100%" stopColor="#C97C1F"/>
      </radialGradient>
    </defs>
    <rect width="400" height="40" fill="url(#toran-repeat)"/>
  </svg>
);

export default function App() {
  const [view, setView] = useState<string>("home");
  const [pgs, setPgs] = useState<PGListing[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginPwd, setLoginPwd] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [selectedPg, setSelectedPg] = useState<PGListing | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGender, setFilterGender] = useState("All");
  const [selectedVibeTags, setSelectedVibeTags] = useState<string[]>([]);
  const [filterMin, setFilterMin] = useState("");
  const [filterMax, setFilterMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Vibe Matcher Widget State
  const [quizVibe, setQuizVibe] = useState(""); // "social" | "quiet" | "gym" | "comfort"
  const [quizBudget, setQuizBudget] = useState(""); // "low" | "mid" | "high"
  const [quizMatchMsg, setQuizMatchMsg] = useState("");
  
  // Form State
  const [editingPg, setEditingPg] = useState<PGListing | null>(null);
  const [fd, setFd] = useState<Omit<PGListing, "id">>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [photoStatus, setPhotoStatus] = useState(""); // "", "compressing", "uploading", "done"
  const [videoStatus, setVideoStatus] = useState(""); 
  const [videoTab, setVideoTab] = useState<"upload" | "link">("upload");
  const [shareStatus, setShareStatus] = useState(false);
  
  // Help FAQ & Chat State
  const [activeChatTab, setActiveChatTab] = useState<"ai" | "admin">("ai");
  const [isChatAdmin, setIsChatAdmin] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [studentName, setStudentName] = useState("");
  const [isNameSubmitted, setIsNameSubmitted] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [adminSelectedSession, setAdminSelectedSession] = useState<string | null>(null);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [faqActiveIndex, setFaqActiveIndex] = useState<number | null>(null);
  
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPgs();

    // Initialize Chat Session ID
    let sId = localStorage.getItem("dg_chat_session_id");
    if (!sId) {
      sId = "sess_" + Math.random().toString(36).substring(2, 11);
      localStorage.setItem("dg_chat_session_id", sId);
    }
    setSessionId(sId);

    // Initialize Student Name if exists
    const name = localStorage.getItem("dg_chat_student_name") || "";
    if (name) {
      setStudentName(name);
      setIsNameSubmitted(true);
    }
  }, []);

  // Listen for secret /admin route or #admin hash navigation & secret hotkey (Ctrl + Shift + A)
  useEffect(() => {
    const checkRoute = () => {
      const hash = window.location.hash;
      const pathname = window.location.pathname;
      if (hash === "#admin" || pathname === "/admin") {
        if (!isAdmin) {
          setView("login");
        } else {
          setView("admin");
        }
      }
    };
    checkRoute();
    window.addEventListener("hashchange", checkRoute);
    window.addEventListener("popstate", checkRoute);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        window.location.hash = "admin";
        checkRoute();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("hashchange", checkRoute);
      window.removeEventListener("popstate", checkRoute);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAdmin]);

  // Poll for messages from Supabase or localStorage
  useEffect(() => {
    if (!sessionId) return;
    
    loadChatMessages();
    const interval = setInterval(() => {
      loadChatMessages();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [sessionId]);

  // Set up initial welcome messages for AI tab
  useEffect(() => {
    if (!sessionId) return;
    
    const aiSessId = `${sessionId}_ai`;
    const localMsgs = localStorage.getItem("dg_chat_messages");
    let msgs: ChatMessage[] = [];
    if (localMsgs) {
      try {
        msgs = JSON.parse(localMsgs);
      } catch (e) {
        console.error(e);
      }
    }
    
    const aiMsgs = msgs.filter(m => m.sessionId === aiSessId);
    if (aiMsgs.length === 0) {
      const initialAiMsg: ChatMessage = {
        id: "msg_ai_init_" + Date.now(),
        sessionId: aiSessId,
        studentName: "Student AI Searcher",
        message: "Hello! I am your Dusra Ghar AI Assistant. Ask me anything about PGs near DTU (e.g., 'price under 8000', 'girls PG', 'WiFi available', etc.) and I will find them for you!",
        sender: "ai",
        createdAt: new Date().toISOString()
      };
      
      setChatMessages(prev => {
        const updated = [...prev, initialAiMsg];
        localStorage.setItem("dg_chat_messages", JSON.stringify(updated));
        return updated;
      });
      
      if (supabase) {
        supabase
          .from("chat_messages")
          .insert([{
            session_id: initialAiMsg.sessionId,
            student_name: initialAiMsg.studentName,
            message: initialAiMsg.message,
            sender: initialAiMsg.sender,
            created_at: initialAiMsg.createdAt
          }]).then(({ error }) => {
            if (error) console.warn("Failed to insert welcome message to Supabase", error);
          });
      }
    }
  }, [sessionId]);

  async function loadPgs() {
    setLoading(true);
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("pg_listings")
          .select("*")
          .order("addedDate", { ascending: false });
        if (error) throw error;
        if (data) {
          setPgs(data as PGListing[]);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error("Supabase load failed, falling back to local storage", e);
      }
    }
    
    try {
      const r = await storage.get("dg_pgs_v3");
      if (r?.value) setPgs(JSON.parse(r.value));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function savePgs(list: PGListing[]) {
    setPgs(list);
    try { 
      await storage.set("dg_pgs_v3", JSON.stringify(list)); 
    } catch (e) {
      console.error(e);
    }
  }

  // Chat Message persistence and synchronization functions
  async function loadChatMessages() {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .order("created_at", { ascending: true });
        if (error) throw error;
        if (data) {
          const mapped = data.map((d: any) => ({
            id: d.id,
            sessionId: d.session_id,
            studentName: d.student_name,
            message: d.message,
            sender: d.sender,
            createdAt: d.created_at,
          }));
          setChatMessages(mapped);
          return;
        }
      } catch (e) {
        console.warn("Supabase chat load failed, falling back to localStorage", e);
      }
    }
    
    try {
      const localMsgs = localStorage.getItem("dg_chat_messages");
      if (localMsgs) {
        setChatMessages(JSON.parse(localMsgs));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function sendChatMessage(msgText: string, senderType: "student" | "admin" | "ai", customSessionId?: string, customStudentName?: string) {
    const sId = customSessionId || (activeChatTab === "ai" ? `${sessionId}_ai` : sessionId);
    const sName = customStudentName || (activeChatTab === "ai" ? "Student AI Searcher" : studentName) || "Student";
    
    const newMsg: ChatMessage = {
      id: "msg_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now(),
      sessionId: sId,
      studentName: sName,
      message: msgText,
      sender: senderType,
      createdAt: new Date().toISOString(),
    };

    setChatMessages(prev => {
      const updated = [...prev, newMsg];
      try {
        localStorage.setItem("dg_chat_messages", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    if (supabase) {
      try {
        await supabase
          .from("chat_messages")
          .insert([{
            session_id: newMsg.sessionId,
            student_name: newMsg.studentName,
            message: newMsg.message,
            sender: newMsg.sender,
            created_at: newMsg.createdAt
          }]);
      } catch (e) {
        console.warn("Failed to insert message to Supabase, saved locally", e);
      }
    }
  }

  // Handle messages in UI
  async function handleSend() {
    if (!chatInput.trim()) return;
    const txt = chatInput.trim();
    setChatInput("");

    // Command check for admin login in chat input
    if (txt.startsWith("/admin ")) {
      const code = txt.substring(7).trim();
      if (code === "yash2026") {
        setIsChatAdmin(true);
        setActiveChatTab("admin");
        alert("Admin mode activated. Hello Yash!");
        return;
      }
    }

    if (isChatAdmin) {
      // Yash sending a message in admin mode
      if (!adminSelectedSession) {
        alert("Please select a student conversation first.");
        return;
      }
      const sessMsgs = chatMessages.filter(m => m.sessionId === adminSelectedSession);
      const sName = sessMsgs.length > 0 ? sessMsgs[0].studentName : "Student";
      await sendChatMessage(txt, "admin", adminSelectedSession, sName);
    } else {
      // Student sending a message
      if (activeChatTab === "ai") {
        await sendChatMessage(txt, "student");
        
        // Trigger AI Response
        setIsAiTyping(true);
        setTimeout(async () => {
          const reply = getAiResponse(txt, pgs);
          await sendChatMessage(reply, "ai");
          setIsAiTyping(false);
        }, 1200);
      } else {
        // Direct Line to Yash Kumar
        if (!isNameSubmitted) {
          alert("Please register your name first.");
          return;
        }
        await sendChatMessage(txt, "student");
      }
    }
  }

  function handleRegisterName(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = studentName.trim();
    if (!cleanName) return;
    localStorage.setItem("dg_chat_student_name", cleanName);
    setIsNameSubmitted(true);
    sendChatMessage(`Hi Yash, this is ${cleanName}. I have a question about the PGs.`, "student");
  }

  function getAiResponse(userQuery: string, currentPgs: PGListing[]): string {
    const query = userQuery.toLowerCase().trim();
    
    if (query === "hi" || query === "hello" || query === "hey" || query.includes("how are you")) {
      return "Hello! I am your Dusra Ghar AI Assistant. Ask me anything about PGs near DTU (e.g., 'price under 8000', 'girls PG', 'WiFi available', etc.) and I will find them for you!";
    }

    if (query.includes("thank") || query.includes("thanks")) {
      return "You're very welcome! Let me know if you need help finding anything else. 🏠";
    }

    let genderFilter: string | null = null;
    if (query.includes("girl") || query.includes("female") || query.includes("women")) {
      genderFilter = "Girls";
    } else if (query.includes("boy") || query.includes("male") || query.includes("men")) {
      genderFilter = "Boys";
    }

    let maxPrice: number | null = null;
    const priceMatches = query.match(/\b\d{4,5}\b/g);
    if (priceMatches) {
      maxPrice = Math.max(...priceMatches.map(Number));
    } else if (query.includes("cheap") || query.includes("budget") || query.includes("lowest")) {
      maxPrice = 8500;
    }

    const amenitiesToSearch = ["wifi", "ac", "meals", "laundry", "parking", "gym", "cctv"];
    const matchedAmenities = amenitiesToSearch.filter(a => query.includes(a));

    let results = [...currentPgs];

    if (genderFilter) {
      results = results.filter(pg => pg.gender.toLowerCase() === genderFilter!.toLowerCase() || pg.gender.toLowerCase() === "both");
    }

    if (maxPrice) {
      results = results.filter(pg => {
        const price = parseInt(pg.negotiablePrice.replace(/[^0-9]/g, "")) || parseInt(pg.actualPrice.replace(/[^0-9]/g, "")) || 0;
        return price <= maxPrice!;
      });
    }

    if (matchedAmenities.length > 0) {
      results = results.filter(pg => {
        const pgAmenitiesLower = pg.amenities.map(a => a.toLowerCase());
        return matchedAmenities.every(a => pgAmenitiesLower.some(pa => pa.includes(a)));
      });
    }

    if (results.length === 0) {
      let msg = "I couldn't find any PGs matching all your specific requirements. ";
      if (genderFilter || maxPrice || matchedAmenities.length > 0) {
        msg += "Try broadening your search (e.g. searching just 'Girls' or checking different budget ranges). ";
      }
      msg += "Here is the contact for the Admin: yashgmat85@gmail.com. You can also chat with Yash directly in the next tab!";
      return msg;
    }

    let responseText = `I found ${results.length} PG listing${results.length > 1 ? "s" : ""} matching your query: \n\n`;
    
    results.slice(0, 3).forEach((pg, index) => {
      const genderIcon = pg.gender === "Boys" ? "🙋‍♂️" : pg.gender === "Girls" ? "🙋‍♀️" : "👫";
      responseText += `${index + 1}. 🏠 **${pg.name}** (${genderIcon} ${pg.gender} PG)\n`;
      responseText += `   📍 Address: ${pg.address}\n`;
      responseText += `   💰 Rent: ₹${pg.negotiablePrice}/mo (Actual: ₹${pg.actualPrice})\n`;
      if (pg.amenities.length > 0) {
        responseText += `   ✨ Amenities: ${pg.amenities.slice(0, 4).join(", ")}\n`;
      }
      responseText += `   📞 Contact: ${pg.managerPhone}\n\n`;
    });

    if (results.length > 3) {
      responseText += `...and ${results.length - 3} more PG(s). You can view and search them on our main listings page above!`;
    } else {
      responseText += "You can scroll up to view full photos and details of these listings!";
    }

    return responseText;
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 8 - (fd.photos?.length || 0);
    if (remaining <= 0) { alert("Max 8 photos allowed."); return; }
    const toProcess = files.slice(0, remaining);
    
    try {
      if (supabase) {
        setPhotoStatus("uploading");
        const urls: string[] = [];
        for (const f of toProcess) {
          const compressedBase64 = await compressImage(f);
          const compressedBlob = await base64ToBlob(compressedBase64);
          const url = await uploadFileToSupabase(compressedBlob, f.name);
          urls.push(url);
        }
        setFd(f => ({ ...f, photos: [...(f.photos || []), ...urls] }));
        setPhotoStatus("done");
      } else {
        setPhotoStatus("compressing");
        const results: string[] = [];
        for (const f of toProcess) {
          const compressed = await compressImage(f);
          results.push(compressed);
        }
        setFd(f => ({ ...f, photos: [...(f.photos || []), ...results] }));
        setPhotoStatus("done");
      }
    } catch (e: any) {
      alert("Failed to upload photos: " + e.message);
      setPhotoStatus("");
    }
    
    setTimeout(() => setPhotoStatus(""), 2000);
    if (photoRef.current) photoRef.current.value = "";
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { 
      alert("Video must be under 20MB. Try a shorter clip or use the link option below."); 
      if (videoRef.current) videoRef.current.value = ""; 
      return; 
    }
    
    try {
      if (supabase) {
        setVideoStatus("uploading");
        const url = await uploadFileToSupabase(file, file.name);
        setFd(f => ({ ...f, videoBase64: "", videoName: file.name, videoLink: url }));
        setVideoStatus("done");
      } else {
        setVideoStatus("loading");
        const reader = new FileReader();
        reader.onload = ev => {
          setFd(f => ({ ...f, videoBase64: ev.target?.result as string, videoName: file.name, videoLink: "" }));
          setVideoStatus("done");
          setTimeout(() => setVideoStatus(""), 2000);
        };
        reader.readAsDataURL(file);
      }
    } catch (e: any) {
      alert("Failed to upload video tour: " + e.message);
      setVideoStatus("");
    }
    
    if (videoRef.current) videoRef.current.value = "";
  }

  function handleLogin() {
    if (loginPwd === ADMIN_PASSWORD) { 
      setIsAdmin(true); 
      setLoginErr(""); 
      setView("admin"); 
      window.location.hash = "admin";
    } else {
      setLoginErr("Wrong password. Access denied.");
    }
  }

  function openAdd() { 
    setEditingPg(null); 
    setFd(emptyForm()); 
    setVideoTab("upload"); 
    setView("form"); 
  }
  
  function openEdit(pg: PGListing) { 
    setEditingPg(pg); 
    setFd({ ...pg }); 
    setVideoTab(pg.videoLink ? "link" : "upload"); 
    setView("form"); 
  }

  async function handleSave() {
    if (!fd.name || !fd.actualPrice || !fd.managerPhone) { 
      alert("Name, Price and Phone are required."); 
      return; 
    }
    setSaving(true);
    const now = new Date().toISOString().split("T")[0];
    
    if (supabase) {
      try {
        if (editingPg) {
          const { error } = await supabase
            .from("pg_listings")
            .update({
              name: fd.name,
              gender: fd.gender,
              actualPrice: fd.actualPrice,
              negotiablePrice: fd.negotiablePrice,
              minTenure: fd.minTenure,
              managerPhone: fd.managerPhone,
              address: fd.address,
              amenities: fd.amenities,
              videoBase64: fd.videoBase64 || null,
              videoName: fd.videoName || null,
              videoLink: fd.videoLink || null,
              description: fd.description,
              photos: fd.photos,
            })
            .eq("id", editingPg.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("pg_listings")
            .insert([{
              id: "pg_" + Date.now(),
              name: fd.name,
              gender: fd.gender,
              actualPrice: fd.actualPrice,
              negotiablePrice: fd.negotiablePrice,
              minTenure: fd.minTenure,
              managerPhone: fd.managerPhone,
              address: fd.address,
              amenities: fd.amenities,
              videoBase64: fd.videoBase64 || null,
              videoName: fd.videoName || null,
              videoLink: fd.videoLink || null,
              description: fd.description,
              photos: fd.photos,
              addedDate: now
            }]);
          if (error) throw error;
        }
        await loadPgs(); // Re-sync local React state
        setSaving(false);
        setView("admin");
        return;
      } catch (e: any) {
        alert("Failed to write to Supabase: " + e.message);
        setSaving(false);
        return;
      }
    }
    
    // Offline / LocalStorage mode
    if (editingPg) {
      await savePgs(pgs.map(p => p.id === editingPg.id ? { ...fd, id: editingPg.id, addedDate: editingPg.addedDate } as PGListing : p));
    } else {
      await savePgs([...pgs, { ...fd, id: "pg_" + Date.now(), addedDate: now } as PGListing]);
    }
    setSaving(false);
    setView("admin");
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this listing?")) return;
    
    if (supabase) {
      try {
        const { error } = await supabase
          .from("pg_listings")
          .delete()
          .eq("id", id);
        if (error) throw error;
        await loadPgs(); // Re-sync state
        return;
      } catch (e: any) {
        alert("Failed to delete from Supabase: " + e.message);
        return;
      }
    }
    
    await savePgs(pgs.filter(p => p.id !== id));
  }

  function toggleAmenity(a: string) {
    setFd(f => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a] }));
  }

  function toggleVibeTag(tag: string) {
    setSelectedVibeTags(tags => 
      tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]
    );
  }

  // Accelerated Vibe Matcher Action (< 10ms execution)
  function handleVibeMatch() {
    if (!quizVibe || !quizBudget) {
      alert("Please select both your lifestyle vibe and budget range!");
      return;
    }
    
    // 1. Map budget
    if (quizBudget === "low") {
      setFilterMin("");
      setFilterMax("8000");
    } else if (quizBudget === "mid") {
      setFilterMin("");
      setFilterMax("12000");
    } else {
      setFilterMin("");
      setFilterMax("");
    }
    
    // 2. Map vibes to tags
    let tags: string[] = [];
    if (quizVibe === "social") {
      tags = ["WiFi", "Meals"];
    } else if (quizVibe === "quiet") {
      tags = ["WiFi", "Attached Bathroom", "CCTV"];
    } else if (quizVibe === "gym") {
      tags = ["Gym", "Parking"];
    } else if (quizVibe === "comfort") {
      tags = ["AC", "Hot Water", "Laundry"];
    }
    
    setSelectedVibeTags(tags);
    setQuizMatchMsg("✨ Vibe match complete! Displaying verified PGs below.");
    
    // Instant smooth scroll in next animation frame (0ms delay)
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    });
    
    setTimeout(() => {
      setQuizMatchMsg("");
    }, 4000);
  }

  // Pre-calculated memoized filter results for instantaneous search response
  const filtered = React.useMemo(() => {
    return pgs.filter(pg => {
      // Search query match (name, address, description)
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = pg.name.toLowerCase().includes(q);
        const matchAddress = pg.address.toLowerCase().includes(q);
        const matchDesc = pg.description.toLowerCase().includes(q);
        if (!matchName && !matchAddress && !matchDesc) return false;
      }
      
      // Gender match
      if (filterGender !== "All" && pg.gender !== filterGender) return false;
      
      // Price range match
      if (filterMin && Number(pg.negotiablePrice) < Number(filterMin)) return false;
      if (filterMax && Number(pg.negotiablePrice) > Number(filterMax)) return false;
      
      // Vibe tags / Amenities match
      if (selectedVibeTags.length > 0) {
        const hasAllTags = selectedVibeTags.every(tag => pg.amenities.includes(tag));
        if (!hasAllTags) return false;
      }
      
      return true;
    });
  }, [pgs, searchQuery, filterGender, filterMin, filterMax, selectedVibeTags]);

  const handleShare = (pg: PGListing) => {
    const text = `Check out this PG near DTU:\n📍 *${pg.name}*\n🗺️ Address: ${pg.address}\n💰 Price: ₹${Number(pg.negotiablePrice).toLocaleString()}/mo (Negotiated)\nAmenities: ${(pg.amenities || []).join(", ")}\n📞 Call Manager: ${pg.managerPhone}\nFind more PGs on Dusra Ghar!`;
    navigator.clipboard.writeText(text);
    setShareStatus(true);
    setTimeout(() => setShareStatus(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", marginBottom: "16px" }}>
          <div style={{ fontSize: "56px", filter: "drop-shadow(0 0 10px rgba(99,102,241,0.5))", animation: "float 3s ease-in-out infinite" }}>🏠</div>
          <div style={{ position: "absolute", top: "50%", left: "50%", width: "70px", height: "70px", marginLeft: "-35px", marginTop: "-35px", border: "3px solid transparent", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 1.2s linear infinite" }} />
        </div>
        <p style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-secondary)", letterSpacing: "1px" }}>FINDING YOUR VIBE...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", width: "100%", margin: "0 auto", padding: "0 24px 80px", display: "flex", flexDirection: "column", minHeight: "100vh", position: "relative" }}>
      
      {/* Toran Garland Divider at Very Top */}
      <ToranDivider style={{ marginBottom: "16px" }} />

      {/* 3D Isometric DTU Neighborhood Canvas Scene */}
      <ThreeDScene />

      {/* Background blobs for warm ambient light */}
      <div className="bg-blobs-container">
        <div className="bg-blob blob-1"></div>
        <div className="bg-blob blob-2"></div>
        <div className="bg-blob blob-3"></div>
      </div>

      {/* HEADER */}
      <header className="clay-card" style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        padding: "16px 24px", 
        borderRadius: "0 0 20px 20px", 
        marginBottom: "32px",
        borderTop: "none"
      }}>
        <div onClick={() => setView("home")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="clay-icon" style={{ width: "44px", height: "44px" }}>
            <span style={{ fontSize: "22px" }}>🏠</span>
          </div>
          <div>
            <div className="font-display" style={{ fontSize: "24px", fontWeight: "700", color: "var(--accent-primary)" }}>
              Dusra Ghar
            </div>
            <div style={{ fontSize: "11px", color: "var(--accent-green)", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px", letterSpacing: "0.5px" }}>
              <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent-green)", animation: "pulse-glow 1.5s infinite" }}></span>
              DTU PG FINDER — FOR FRESHERS
            </div>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: "10px" }}>
          {isAdmin && (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button 
                className="clay-button" 
                style={{ padding: "8px 18px", fontSize: "13px" }}
                onClick={() => setView("admin")}
              >
                Dashboard
              </button>
              <button 
                className="btn-secondary"
                style={{ padding: "8px 18px", borderRadius: "14px", cursor: "pointer", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}
                onClick={() => { setIsAdmin(false); setView("home"); window.location.hash = ""; }}
              >
                <LogOut size={13} />
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* HOME VIEW */}
      {view === "home" && (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
          
          {/* 2-COLUMN HERO LAYOUT */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", 
            gap: "40px", 
            alignItems: "center",
            marginTop: "8px",
            textAlign: "left"
          }}>
            {/* Left Content */}
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(245, 158, 11, 0.12)", border: "1px solid var(--border-subtle)", borderRadius: "100px", padding: "6px 14px", marginBottom: "16px" }}>
                <Sparkles size={13} style={{ color: "var(--accent-primary)" }} />
                <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--accent-primary)", textTransform: "uppercase", letterSpacing: "0.8px" }}>SKIP THE MIDDLEMAN</span>
              </div>
              
              <h1 className="font-display" style={{ fontSize: "56px", fontWeight: "800", letterSpacing: "-1px", lineHeight: "1.05", marginBottom: "16px", color: "var(--text-main)" }}>
                Find Your Vibe <em style={{ color: "var(--accent-primary)", fontStyle: "italic" }}>Near</em> DTU.
              </h1>
              
              <p style={{ color: "var(--text-sub)", fontSize: "16px", marginBottom: "28px", lineHeight: "1.6" }}>
                Skip the brokers and curfews. We map out real prices, video tours, and verified reviews from seniors so you get a place that feels like a real <strong style={{ color: "var(--text-main)" }}>Dusra Ghar</strong>.
              </p>
              
              {/* SEARCH BAR */}
              <div className="clay-card" style={{ 
                borderRadius: "100px", 
                padding: "6px 8px 6px 20px", 
                display: "flex", 
                alignItems: "center", 
                gap: "10px"
              }}>
                <Search size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                <input 
                  type="text" 
                  placeholder="Search PG Name, gate, street..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ 
                    background: "transparent", 
                    border: "none", 
                    outline: "none", 
                    color: "var(--text-main)", 
                    fontSize: "14px", 
                    width: "100%",
                    padding: "8px 0"
                  }}
                />
                <button 
                  className="btn-secondary" 
                  style={{ 
                    borderRadius: "100px", 
                    padding: "8px 16px", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "6px", 
                    fontSize: "13px", 
                    cursor: "pointer", 
                    flexShrink: 0 
                  }}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <SlidersHorizontal size={14} />
                  Filters
                  {(filterGender !== "All" || filterMin || filterMax || selectedVibeTags.length > 0) && (
                    <span style={{ background: "var(--accent-primary)", width: "8px", height: "8px", borderRadius: "50%" }}></span>
                  )}
                </button>
              </div>
              
              {/* DETAILED FILTERS DROPDOWN */}
              {showFilters && (
                <div className="clay-card animate-fade-in" style={{ 
                  borderRadius: "var(--radius-lg)", 
                  padding: "20px", 
                  marginTop: "16px",
                  textAlign: "left"
                }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.5px" }}>Gender Vibe</label>
                      <select 
                        value={filterGender} 
                        onChange={e => setFilterGender(e.target.value)}
                        style={{ 
                          width: "100%", 
                          padding: "8px 12px", 
                          borderRadius: "var(--radius-sm)", 
                          background: "var(--bg-main)", 
                          border: "1px solid var(--border-subtle)", 
                          color: "var(--text-main)", 
                          fontSize: "13px" 
                        }}
                      >
                        <option value="All" style={{ background: "var(--bg-main)" }}>All Students</option>
                        <option value="Boys" style={{ background: "var(--bg-main)" }}>Boys Only</option>
                        <option value="Girls" style={{ background: "var(--bg-main)" }}>Girls Only</option>
                      </select>
                    </div>
                    
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.5px" }}>Min Price (₹)</label>
                      <input 
                        type="number" 
                        placeholder="Min ₹" 
                        value={filterMin} 
                        onChange={e => setFilterMin(e.target.value)}
                        style={{ 
                          width: "100%", 
                          padding: "8px 12px", 
                          borderRadius: "var(--radius-sm)", 
                          background: "var(--bg-main)", 
                          border: "1px solid var(--border-subtle)", 
                          color: "var(--text-main)", 
                          fontSize: "13px" 
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.5px" }}>Max Price (₹)</label>
                      <input 
                        type="number" 
                        placeholder="Max ₹" 
                        value={filterMax} 
                        onChange={e => setFilterMax(e.target.value)}
                        style={{ 
                          width: "100%", 
                          padding: "8px 12px", 
                          borderRadius: "var(--radius-sm)", 
                          background: "var(--bg-main)", 
                          border: "1px solid var(--border-subtle)", 
                          color: "var(--text-main)", 
                          fontSize: "13px" 
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.5px" }}>Vibe Filters (Amenities)</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {AMENITY_OPTIONS.map(a => {
                        const isSelected = selectedVibeTags.includes(a);
                        return (
                          <button
                            key={a}
                            onClick={() => toggleVibeTag(a)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "6px 14px",
                              borderRadius: "999px",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: "pointer",
                              transition: "all 0.2s",
                              background: isSelected ? "var(--gradient-cta)" : "var(--surface-raised)",
                              border: `1px solid ${isSelected ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                              color: isSelected ? "#0f172a" : "var(--text-main)"
                            }}
                          >
                            {AMENITY_ICONS[a]}
                            {a}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: "6px 14px", borderRadius: "var(--radius-sm)", fontSize: "12px", cursor: "pointer" }}
                      onClick={() => {
                        setFilterGender("All");
                        setFilterMin("");
                        setFilterMax("");
                        setSelectedVibeTags([]);
                      }}
                    >
                      Clear All
                    </button>
                    <button 
                      className="clay-button" 
                      style={{ padding: "6px 16px", fontSize: "12px" }}
                      onClick={() => setShowFilters(false)}
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Right Asset Graphic: Real PG Building Image framed in Clay Card with Toran Banner */}
            <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
              <div 
                className="animate-float clay-card" 
                style={{ 
                  width: "100%", 
                  maxWidth: "420px", 
                  borderRadius: "20px",
                  overflow: "hidden",
                  position: "relative"
                }}
              >
                {/* Toran Garland Strip on top of photo frame */}
                <ToranDivider style={{ height: "24px", opacity: 1 }} />

                <div style={{ aspectRatio: "4/3", width: "100%", position: "relative" }}>
                  <img 
                    src="/real_pg_hero.webp" 
                    alt="Dusra Ghar Real PG Building" 
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                  />
                  
                  {/* Floating Status Overlay */}
                  <div style={{ 
                    position: "absolute", 
                    bottom: "14px", 
                    left: "14px", 
                    right: "14px", 
                    background: "rgba(15, 23, 42, 0.9)", 
                    backdropFilter: "blur(8px)", 
                    border: "1px solid var(--border-subtle)", 
                    borderRadius: "14px", 
                    padding: "10px 14px", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between" 
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-green)", boxShadow: "0 0 8px var(--accent-green)", animation: "pulse-glow 1.5s infinite" }}></span>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "#ffffff" }}>Verified Real DTU PG</span>
                    </div>
                    <span className="badge-trust">Zero Brokerage</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ToranDivider />

          {/* Core Advantages Banners ("Why Us") */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
            {[
              { icon: <TrendingDown size={24} style={{ color: "var(--accent-green)" }} />, title: "Zero Brokerage Fees", desc: "No middleman, no deposit cuts. Deal directly with PG managers and save up to ₹15,000 upfront." },
              { icon: <Video size={24} style={{ color: "var(--accent-primary)" }} />, title: "100% Video Tours", desc: "Walk through rooms virtually with direct clips. Know the exact vibe of the house before you travel." },
              { icon: <Users size={24} style={{ color: "var(--accent-secondary)" }} />, title: "Student Verified Rates", desc: "We track and contrast actual building base rates vs negotiated student prices so you get the best deal." }
            ].map((f, i) => (
              <div key={i} className="clay-card" style={{ padding: "24px" }}>
                <div className="clay-icon" style={{ marginBottom: "16px" }}>
                  {f.icon}
                </div>
                <h4 className="font-display" style={{ fontWeight: "700", fontSize: "18px", color: "var(--text-main)", marginBottom: "8px" }}>{f.title}</h4>
                <p style={{ color: "var(--text-sub)", fontSize: "14px", lineHeight: "1.5" }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* INTERACTIVE VIBE MATCHING WIDGET */}
          <div className="clay-card" style={{ 
            borderRadius: "var(--radius-lg)", 
            padding: "32px", 
            textAlign: "left"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <div className="clay-icon" style={{ width: "40px", height: "40px", borderRadius: "12px" }}>
                <Compass size={20} style={{ color: "var(--accent-primary)" }} />
              </div>
              <h3 className="font-display" style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-main)" }}>
                DTU Neighborhood Vibe Matcher
              </h3>
            </div>
            
            <p style={{ color: "var(--text-sub)", fontSize: "14px", marginBottom: "24px" }}>
              Select your room vibe and budget range to instantly pin matching PGs on our DTU campus map.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "28px" }}>
              {/* Choose Vibe */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "10px", letterSpacing: "0.5px" }}>Choose room vibe</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    { id: "social", label: "🦋 Social Butterfly", sub: "WiFi, meals, social roommates" },
                    { id: "quiet", label: "📚 Quiet Deep Focus", sub: "Privacy, private bath, security" },
                    { id: "gym", label: "🏋️ Gym & Fitness Bro", sub: "In-house Gym, parking spot" },
                    { id: "comfort", label: "🛋️ Maximum Comfort", sub: "AC, laundry, hot water" }
                  ].map(v => (
                    <button
                      key={v.id}
                      onClick={() => setQuizVibe(v.id)}
                      className={`vibe-card-btn ${quizVibe === v.id ? "selected" : ""}`}
                    >
                      <div>
                        <div className="vibe-title">{v.label}</div>
                        <div className="vibe-sub">{v.sub}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Choose Budget */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "10px", letterSpacing: "0.5px" }}>Choose monthly budget</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    { id: "low", label: "💸 Pocket Friendly", sub: "Under ₹8,000/month" },
                    { id: "mid", label: "💎 Comfort Living", sub: "Under ₹12,000/month" },
                    { id: "high", label: "🚀 Infinite Vibe", sub: "Show all prices" }
                  ].map(b => (
                    <button
                      key={b.id}
                      onClick={() => setQuizBudget(b.id)}
                      className={`vibe-card-btn ${quizBudget === b.id ? "selected" : ""}`}
                    >
                      <div>
                        <div className="vibe-title">{b.label}</div>
                        <div className="vibe-sub">{b.sub}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {quizMatchMsg && (
              <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid var(--accent-green)", borderRadius: "var(--radius-sm)", padding: "12px 16px", fontSize: "13px", color: "var(--text-main)", fontWeight: "600", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle size={16} style={{ color: "var(--accent-green)" }} />
                {quizMatchMsg}
              </div>
            )}

            <button 
              className="clay-button"
              style={{ width: "100%", padding: "16px", fontSize: "15px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              onClick={handleVibeMatch}
            >
              Find My PG
              <ArrowRight size={18} />
            </button>
          </div>

          {/* LISTINGS RESULTS GRID */}
          <div ref={resultsRef} style={{ scrollMarginTop: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div style={{ color: "var(--text-sub)", fontSize: "15px", fontWeight: "600" }}>
                ⚡ Showing <span className="price-mono" style={{ color: "var(--accent-primary)", fontWeight: "700" }}>{filtered.length}</span> verified PG{filtered.length !== 1 ? "s" : ""} near campus
              </div>
              {(filterGender !== "All" || filterMin || filterMax || selectedVibeTags.length > 0) && (
                <button 
                  style={{ background: "transparent", border: "none", color: "var(--accent-primary)", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  onClick={() => {
                    setFilterGender("All");
                    setFilterMin("");
                    setFilterMax("");
                    setSelectedVibeTags([]);
                    setQuizVibe("");
                    setQuizBudget("");
                  }}
                >
                  Reset filters
                </button>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="clay-card" style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
                <h3 className="font-display" style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px" }}>No PGs matching filters</h3>
                <p style={{ color: "var(--text-sub)", fontSize: "14px" }}>Try removing filters or expanding your search budget.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
                {filtered.map(pg => {
                  const actual = Number(pg.actualPrice) || 0;
                  const nego = Number(pg.negotiablePrice) || 0;
                  const savings = actual - nego;
                  const percentSaved = actual > 0 ? Math.round((savings / actual) * 100) : 0;

                  return (
                    <div 
                      key={pg.id} 
                      className="clay-card animate-fade-in"
                      style={{ 
                        borderRadius: "16px", 
                        overflow: "hidden", 
                        cursor: "pointer", 
                        display: "flex",
                        flexDirection: "column",
                        height: "100%"
                      }}
                      onClick={() => { setSelectedPg(pg); setPhotoIdx(0); }}
                    >
                      {/* PHOTO PREVIEW */}
                      <div style={{ width: "100%", height: "180px", background: "var(--bg-main)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                        {pg.photos?.length > 0 ? (
                          <img 
                            src={pg.photos[0]} 
                            alt={pg.name} 
                            style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s" }} 
                            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                          />
                        ) : (
                          <div style={{ fontSize: "40px", opacity: 0.6 }}>🏢</div>
                        )}
                        
                        {/* GENDER BADGE */}
                        <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          <span className="badge-gender">
                            {pg.gender === "Both" ? "Co-ed" : pg.gender}
                          </span>
                        </div>

                        {/* INFO BADGES BOTTOM */}
                        <div style={{ position: "absolute", bottom: "10px", right: "12px", display: "flex", gap: "6px" }}>
                          {pg.photos?.length > 1 && (
                            <span style={{ background: "rgba(15, 23, 42, 0.9)", color: "#ffffff", fontSize: "10px", fontWeight: "700", borderRadius: "100px", padding: "3px 8px" }}>
                              +{pg.photos.length - 1} Photos
                            </span>
                          )}
                          {(pg.videoBase64 || pg.videoLink) && (
                            <span style={{ background: "var(--accent-primary)", color: "#0f172a", fontSize: "10px", fontWeight: "800", borderRadius: "100px", padding: "3px 8px", display: "flex", alignItems: "center", gap: "4px" }}>
                              <Video size={10} /> Tour
                            </span>
                          )}
                        </div>
                      </div>

                      {/* CONTENT */}
                      <div style={{ padding: "20px", display: "flex", flexDirection: "column", flexGrow: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
                          <h4 className="font-display" style={{ fontWeight: "700", fontSize: "18px", color: "var(--text-main)", lineHeight: "1.3" }}>{pg.name}</h4>
                        </div>
                        
                        {/* ADDRESS */}
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-sub)", fontSize: "12px", marginBottom: "14px" }}>
                          <MapPin size={12} style={{ color: "var(--accent-primary)" }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pg.address}</span>
                        </div>

                        {/* PRICING BLOCK */}
                        <div style={{ display: "flex", alignItems: "flex-end", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
                          <span className="price-mono" style={{ fontSize: "22px", fontWeight: "700", color: "var(--accent-primary)" }}>
                            ₹{nego.toLocaleString()}
                          </span>
                          <span style={{ fontSize: "12px", color: "var(--text-sub)", fontWeight: "500", paddingBottom: "2px" }}>/mo</span>
                          {savings > 0 && (
                            <>
                              <span className="price-mono" style={{ fontSize: "11px", color: "var(--text-muted)", textDecoration: "line-through", paddingBottom: "2px", marginLeft: "4px" }}>
                                ₹{actual.toLocaleString()}
                              </span>
                              <span className="badge-trust" style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", marginLeft: "4px" }}>
                                -{percentSaved}%
                              </span>
                            </>
                          )}
                        </div>

                        {/* AMENITIES BADGES */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "auto", borderTop: "1px solid var(--border-subtle)", paddingTop: "14px" }}>
                          {(pg.amenities || []).slice(0, 3).map(a => (
                            <span 
                              key={a} 
                              style={{ 
                                fontSize: "11px", 
                                color: "var(--text-sub)", 
                                background: "var(--surface-raised)", 
                                padding: "3px 10px", 
                                borderRadius: "100px", 
                                display: "inline-flex", 
                                alignItems: "center", 
                                gap: "4px",
                                border: "1px solid var(--border-subtle)"
                              }}
                            >
                              {AMENITY_ICONS[a]}
                              {a}
                            </span>
                          ))}
                          {(pg.amenities || []).length > 3 && (
                            <span style={{ fontSize: "11px", color: "var(--text-muted)", background: "var(--surface-raised)", padding: "3px 8px", borderRadius: "100px", border: "1px solid var(--border-subtle)" }}>
                              +{(pg.amenities || []).length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <ToranDivider />

          {/* STUDENT TESTIMONIALS SECTION */}
          <div style={{ textAlign: "left" }}>
            <h3 className="font-display" style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-main)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "22px" }}>💬</span> Vetted by DTU Seniors
            </h3>
            <p style={{ color: "var(--text-sub)", fontSize: "14px", marginBottom: "24px" }}>
              Here is what senior batch students have to say about finding accommodation through Dusra Ghar.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
              {[
                { name: "Aman Sharma", branch: "CSE '25", quote: "Dusra Ghar saved me ₹1,200/mo on my PG. The video tour was identical to the room in person—no fake photos like local broker sites." },
                { name: "Riya Gupta", branch: "ECE '26", quote: "Finding secure girls' PGs near Gate 2 with no strict curfew was incredibly easy. The WiFi speed tags are actually verified." },
                { name: "Aryan Goel", branch: "IT '24", quote: "Negotiating is stressful. Knowing the pre-negotiated rate before I called the manager gave me massive leverage. Essential for freshers!" }
              ].map((t, i) => (
                <div key={i} className="clay-card" style={{ padding: "20px" }}>
                  <p style={{ color: "var(--text-sub)", fontSize: "13px", fontStyle: "italic", lineHeight: "1.6", marginBottom: "16px" }}>
                    "{t.quote}"
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div className="clay-icon" style={{ width: "36px", height: "36px", borderRadius: "50%", fontWeight: "800", fontSize: "14px", color: "var(--accent-primary)" }}>
                      {t.name[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: "700", fontSize: "14px", color: "var(--text-main)" }}>{t.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--accent-primary)", fontWeight: "600" }}>DTU {t.branch}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ADMIN DASHBOARD VIEW */}
      {view === "admin" && isAdmin && (
        <div className="animate-fade-in">
          {/* DATABASE CONNECTION STATUS HEADER */}
          {supabase ? (
            <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "var(--radius-md)", padding: "10px 14px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--accent-green)" }}>
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-green)", animation: "pulse-glow 1.5s infinite" }}></span>
              Connected to Supabase Database (Media Uploads Live)
            </div>
          ) : (
            <div style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: "var(--radius-md)", padding: "14px", marginBottom: "24px", fontSize: "13px", color: "#fb7185" }}>
              <div style={{ fontWeight: "700", marginBottom: "4px" }}>⚠️ Offline LocalStorage Fallback Active</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                The app is saving data in your local browser storage because Supabase is not configured yet. To connect your cloud database, copy <code>.env.example</code> to <code>.env</code> in your project directory and add your credentials.
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div>
              <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#fff" }}>Control Center</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>{pgs.length} Active Listings</p>
            </div>
            <button 
              className="btn-primary" 
              style={{ padding: "10px 20px", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "700" }} 
              onClick={openAdd}
            >
              <Plus size={16} />
              Add New PG
            </button>
          </div>

          {pgs.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: "center", padding: "60px 20px", borderRadius: "var(--radius-lg)" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>📦</div>
              <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "4px" }}>No PGs Listed Yet</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "16px" }}>Start building your directory by adding your first listing.</p>
              <button className="btn-primary" style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer" }} onClick={openAdd}>Add First PG</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {pgs.map(pg => (
                <div 
                  key={pg.id} 
                  className="glass-panel" 
                  style={{ 
                    borderRadius: "var(--radius-md)", 
                    padding: "16px", 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    flexWrap: "wrap",
                    gap: "16px"
                  }}
                >
                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    {pg.photos?.length > 0 ? (
                      <img src={pg.photos[0]} alt="" style={{ width: "64px", height: "64px", borderRadius: "10px", objectFit: "cover", border: "1px solid var(--card-border)" }} />
                    ) : (
                      <div style={{ width: "64px", height: "64px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyItems: "center", fontSize: "28px", justifyContent: "center" }}>🏢</div>
                    )}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <h4 style={{ fontWeight: "700", color: "#fff", fontSize: "16px" }}>{pg.name}</h4>
                        <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "100px", background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>{pg.gender}</span>
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <MapPin size={10} /> {pg.address}
                      </div>
                      <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                        ₹{Number(pg.negotiablePrice).toLocaleString()}/mo · {pg.minTenure || "No min tenure"} · 📞 {pg.managerPhone}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: "8px 14px", borderRadius: "var(--radius-sm)", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }} 
                      onClick={() => openEdit(pg)}
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                    <button 
                      style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", color: "#fb7185", padding: "8px 14px", borderRadius: "var(--radius-sm)", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }} 
                      onClick={() => handleDelete(pg.id)}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LOGIN VIEW */}
      {view === "login" && (
        <div className="animate-fade-in" style={{ maxWidth: "400px", width: "100%", margin: "60px auto" }}>
          <div className="glass-panel" style={{ borderRadius: "var(--radius-lg)", padding: "32px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div style={{ width: "50px", height: "50px", background: "var(--primary-glow)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", border: "1px solid rgba(99,102,241,0.2)" }}>
                <Lock size={20} style={{ color: "var(--primary)" }} />
              </div>
              <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#fff" }}>Admin Control</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Input password to unlock editor panel</p>
            </div>
            
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px" }}>Secret Password</label>
              <input 
                type="password" 
                value={loginPwd} 
                onChange={e => setLoginPwd(e.target.value)} 
                onKeyDown={e => e.key === "Enter" && handleLogin()} 
                placeholder="••••••••" 
                style={{ 
                  width: "100%", 
                  padding: "10px 14px", 
                  borderRadius: "var(--radius-md)", 
                  background: "rgba(255,255,255,0.05)", 
                  border: "1px solid rgba(255,255,255,0.1)", 
                  color: "var(--text-primary)", 
                  fontSize: "14px" 
                }} 
              />
            </div>
            
            {loginErr && (
              <div style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "#fb7185", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>⚠️</span> {loginErr}
              </div>
            )}
            
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                className="btn-primary" 
                style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer", fontWeight: "700", fontSize: "14px" }} 
                onClick={handleLogin}
              >
                Unlock
              </button>
              <button 
                className="btn-secondary" 
                style={{ padding: "10px 16px", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "14px", fontWeight: "600" }} 
                onClick={() => setView("home")}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PG EDITOR FORM VIEW */}
      {view === "form" && isAdmin && (
        <div className="animate-fade-in">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <button className="btn-secondary" style={{ padding: "6px 14px", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "13px" }} onClick={() => setView("admin")}>← Back</button>
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#fff" }}>{editingPg ? "Edit PG Listing" : "Add New PG Listing"}</h2>
          </div>

          <div className="glass-panel" style={{ borderRadius: "var(--radius-lg)", padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* PHOTOS MANAGEMENT */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "8px" }}>Photos — Up to 8 (auto-compressed)</label>
              
              <div 
                style={{ 
                  border: "2px dashed rgba(255,255,255,0.1)", 
                  borderRadius: "var(--radius-md)", 
                  padding: "24px", 
                  textAlign: "center", 
                  cursor: "pointer", 
                  background: "rgba(255,255,255,0.01)" 
                }}
                onClick={() => photoRef.current?.click()}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--primary)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
              >
                <Camera size={28} style={{ color: "var(--text-secondary)", margin: "0 auto 8px" }} />
                <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                  {photoStatus === "uploading" ? "Uploading to Cloud..." : "Click to upload photos"}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Drag multiple or select JPG/PNG files</div>
              </div>
              <input ref={photoRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handlePhotoUpload} />

              {photoStatus === "compressing" && (
                <div style={{ marginTop: "12px", fontSize: "13px", color: "var(--primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "14px", height: "14px", border: "2px solid rgba(99,102,241,0.2)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  Processing and compressing photos...
                </div>
              )}
              {photoStatus === "uploading" && (
                <div style={{ marginTop: "12px", fontSize: "13px", color: "var(--accent-green)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "14px", height: "14px", border: "2px solid rgba(16,185,129,0.2)", borderTopColor: "var(--accent-green)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  Uploading images directly to Cloud Storage...
                </div>
              )}
              {photoStatus === "done" && <div style={{ marginTop: "12px", fontSize: "13px", color: "var(--accent-green)" }}>✅ Photos uploaded successfully!</div>}

              {fd.photos?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "16px" }}>
                  {fd.photos.map((p, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <img src={p} alt="" style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "var(--radius-sm)", border: "1px solid var(--card-border)" }} />
                      <button 
                        onClick={() => setFd(f => ({ ...f, photos: f.photos.filter((_, j) => j !== i) }))} 
                        style={{ 
                          position: "absolute", 
                          top: "-6px", 
                          right: "-6px", 
                          background: "var(--accent-pink)", 
                          color: "#fff", 
                          border: "none", 
                          borderRadius: "50%", 
                          width: "20px", 
                          height: "20px", 
                          fontSize: "12px", 
                          cursor: "pointer", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* VIDEO SECTION */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "8px" }}>Video Tour</label>
              <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: "12px" }}>
                <button 
                  style={{ 
                    padding: "8px 16px", 
                    background: "transparent", 
                    border: "none", 
                    borderBottom: videoTab === "upload" ? "2px solid var(--primary)" : "none", 
                    color: videoTab === "upload" ? "var(--primary)" : "var(--text-secondary)", 
                    cursor: "pointer", 
                    fontSize: "13px",
                    fontWeight: "600"
                  }} 
                  onClick={() => setVideoTab("upload")}
                >
                  Direct Upload (MP4)
                </button>
                <button 
                  style={{ 
                    padding: "8px 16px", 
                    background: "transparent", 
                    border: "none", 
                    borderBottom: videoTab === "link" ? "2px solid var(--primary)" : "none", 
                    color: videoTab === "link" ? "var(--primary)" : "var(--text-secondary)", 
                    cursor: "pointer", 
                    fontSize: "13px",
                    fontWeight: "600"
                  }} 
                  onClick={() => setVideoTab("link")}
                >
                  YouTube / Drive Link
                </button>
              </div>

              <div>
                {videoTab === "upload" && (
                  <>
                    {fd.videoLink && !getVideoEmbed(fd.videoLink) ? (
                      // Directly uploaded static link (Supabase Storage URL)
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-md)", padding: "10px 14px" }}>
                        <span style={{ fontSize: "20px" }}>🎬</span>
                        <span style={{ fontSize: "13px", color: "var(--text-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {fd.videoName || "Cloud Uploaded Video"}
                        </span>
                        <button onClick={() => setFd(f => ({ ...f, videoLink: "", videoName: "" }))} className="btn-secondary" style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "var(--radius-sm)" }}>Remove</button>
                      </div>
                    ) : fd.videoBase64 ? (
                      // Local base64 file representation
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-md)", padding: "10px 14px" }}>
                        <span style={{ fontSize: "20px" }}>🎬</span>
                        <span style={{ fontSize: "13px", color: "var(--text-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{fd.videoName}</span>
                        <button onClick={() => setFd(f => ({ ...f, videoBase64: "", videoName: "" }))} className="btn-secondary" style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "var(--radius-sm)" }}>Remove</button>
                      </div>
                    ) : (
                      <div 
                        style={{ 
                          border: "2px dashed rgba(255,255,255,0.1)", 
                          borderRadius: "var(--radius-md)", 
                          padding: "24px", 
                          textAlign: "center", 
                          cursor: "pointer", 
                          background: "rgba(255,255,255,0.01)" 
                        }}
                        onClick={() => videoRef.current?.click()}
                      >
                        <Video size={28} style={{ color: "var(--text-secondary)", margin: "0 auto 8px" }} />
                        <div style={{ fontSize: "14px", fontWeight: "700" }}>
                          {videoStatus === "uploading" ? "Uploading Video..." : "Upload Video Clip"}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Max 20MB · MP4 format</div>
                      </div>
                    )}
                    <input ref={videoRef} type="file" accept="video/*" style={{ display: "none" }} onChange={handleVideoUpload} />
                    {videoStatus === "loading" && <div style={{ marginTop: "8px", fontSize: "13px", color: "var(--primary)" }}>⏳ Loading video representation...</div>}
                    {videoStatus === "uploading" && (
                      <div style={{ marginTop: "8px", fontSize: "13px", color: "var(--accent-green)", display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "14px", height: "14px", border: "2px solid rgba(16,185,129,0.2)", borderTopColor: "var(--accent-green)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                        Uploading raw video to Cloud Storage...
                      </div>
                    )}
                    {videoStatus === "done" && <div style={{ marginTop: "8px", fontSize: "13px", color: "var(--accent-green)" }}>✅ Video uploaded successfully!</div>}
                  </>
                )}

                {videoTab === "link" && (
                  <>
                    <input 
                      type="text" 
                      value={fd.videoLink} 
                      onChange={e => setFd(f => ({ ...f, videoLink: e.target.value, videoBase64: "", videoName: "" }))} 
                      placeholder="Paste YouTube or Google Drive share link here" 
                      style={{ 
                        width: "100%", 
                        padding: "10px 14px", 
                        borderRadius: "var(--radius-md)", 
                        background: "rgba(255,255,255,0.05)", 
                        border: "1px solid rgba(255,255,255,0.1)", 
                        color: "var(--text-primary)", 
                        fontSize: "14px" 
                      }} 
                    />
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>Supports standard YouTube watch/embed formats or Google Drive preview links.</div>
                  </>
                )}
              </div>
            </div>

            {/* FORM INPUTS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px" }}>PG Name *</label>
                <input 
                  type="text" 
                  value={fd.name} 
                  onChange={e => setFd(f => ({ ...f, name: e.target.value }))} 
                  placeholder="e.g. Sharma Boys Residency" 
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)", fontSize: "14px" }} 
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px" }}>Manager Contact Phone *</label>
                <input 
                  type="tel" 
                  value={fd.managerPhone} 
                  onChange={e => setFd(f => ({ ...f, managerPhone: e.target.value }))} 
                  placeholder="9876543210" 
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)", fontSize: "14px" }} 
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px" }}>Original Retail Price (₹/mo) *</label>
                <input 
                  type="number" 
                  value={fd.actualPrice} 
                  onChange={e => setFd(f => ({ ...f, actualPrice: e.target.value }))} 
                  placeholder="9500" 
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)", fontSize: "14px" }} 
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px" }}>Negotiable Price (₹/mo)</label>
                <input 
                  type="number" 
                  value={fd.negotiablePrice} 
                  onChange={e => setFd(f => ({ ...f, negotiablePrice: e.target.value }))} 
                  placeholder="8500" 
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)", fontSize: "14px" }} 
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px" }}>Minimum Tenure</label>
                <input 
                  type="text" 
                  value={fd.minTenure} 
                  onChange={e => setFd(f => ({ ...f, minTenure: e.target.value }))} 
                  placeholder="e.g. 3 Months" 
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)", fontSize: "14px" }} 
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px" }}>For Gender</label>
                <select 
                  value={fd.gender} 
                  onChange={e => setFd(f => ({ ...f, gender: e.target.value }))} 
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)", fontSize: "14px" }}
                >
                  <option value="Boys" style={{ background: "var(--bg)" }}>Boys Only</option>
                  <option value="Girls" style={{ background: "var(--bg)" }}>Girls Only</option>
                  <option value="Both" style={{ background: "var(--bg)" }}>Both (Co-ed)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px" }}>Address Near DTU</label>
              <input 
                type="text" 
                value={fd.address} 
                onChange={e => setFd(f => ({ ...f, address: e.target.value }))} 
                placeholder="Gate 2, 2-min walk, behind Metro station" 
                style={{ width: "100%", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)", fontSize: "14px" }} 
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px" }}>Description & Vibes</label>
              <textarea 
                value={fd.description} 
                onChange={e => setFd(f => ({ ...f, description: e.target.value }))} 
                placeholder="Describe the rooms, vibe, curfew timings, food review, roommates..." 
                style={{ width: "100%", minHeight: "100px", padding: "10px 14px", borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)", fontSize: "14px", resize: "vertical" }} 
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "8px" }}>Amenities</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {AMENITY_OPTIONS.map(a => {
                  const hasAmenity = fd.amenities.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAmenity(a)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 16px",
                        borderRadius: "100px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        background: hasAmenity ? "var(--primary)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${hasAmenity ? "var(--primary)" : "rgba(255,255,255,0.1)"}`,
                        color: hasAmenity ? "#fff" : "var(--text-secondary)"
                      }}
                    >
                      {AMENITY_ICONS[a]}
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "20px" }}>
              <button 
                className="btn-primary" 
                style={{ padding: "12px 24px", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer", fontWeight: "700" }} 
                onClick={handleSave} 
                disabled={saving}
              >
                {saving ? "Saving Listing..." : editingPg ? "Save Changes" : "Post Listing"}
              </button>
              <button 
                className="btn-secondary" 
                style={{ padding: "12px 24px", borderRadius: "var(--radius-md)", cursor: "pointer", fontWeight: "600" }} 
                onClick={() => setView("admin")}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PG DETAIL MODAL */}
      {selectedPg && (
        <div 
          style={{ 
            position: "fixed", 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: "rgba(3, 7, 18, 0.8)", 
            backdropFilter: "blur(12px)", 
            WebkitBackdropFilter: "blur(12px)",
            zIndex: 100, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            padding: "16px" 
          }} 
          onClick={() => setSelectedPg(null)}
        >
          <div 
            className="glass-panel animate-fade-in" 
            style={{ 
              width: "100%", 
              maxWidth: "600px", 
              maxHeight: "90vh", 
              overflowY: "auto", 
              borderRadius: "24px", 
              padding: "24px", 
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              border: "1px solid rgba(255,255,255,0.12)"
            }} 
            onClick={e => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <span style={{ 
                  fontSize: "10px", 
                  fontWeight: "800", 
                  padding: "3px 8px", 
                  borderRadius: "100px", 
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  background: selectedPg.gender === "Girls" ? "rgba(244,63,94,0.15)" : selectedPg.gender === "Boys" ? "rgba(59,130,246,0.15)" : "rgba(168,85,247,0.15)",
                  color: selectedPg.gender === "Girls" ? "#fb7185" : selectedPg.gender === "Boys" ? "#60a5fa" : "#c084fc",
                  border: `1px solid ${selectedPg.gender === "Girls" ? "rgba(244,63,94,0.3)" : selectedPg.gender === "Boys" ? "rgba(59,130,246,0.3)" : "rgba(168,85,247,0.3)"}`,
                  display: "inline-block",
                  marginBottom: "8px"
                }}>
                  {selectedPg.gender === "Both" ? "Co-ed Vibe" : `${selectedPg.gender} Only`}
                </span>
                <h3 style={{ fontSize: "24px", fontWeight: "800", color: "#fff", lineHeight: "1.2" }}>{selectedPg.name}</h3>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                  <MapPin size={12} /> {selectedPg.address}
                </div>
              </div>
              <button 
                onClick={() => setSelectedPg(null)} 
                style={{ 
                  background: "rgba(255,255,255,0.05)", 
                  border: "1px solid rgba(255,255,255,0.08)", 
                  width: "36px", 
                  height: "36px", 
                  borderRadius: "50%", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  cursor: "pointer", 
                  color: "var(--text-secondary)" 
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* GALLERY */}
            {selectedPg.photos?.length > 0 ? (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", height: "240px", position: "relative", border: "1px solid var(--card-border)" }}>
                  <img src={selectedPg.photos[photoIdx]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  
                  {selectedPg.photos.length > 1 && (
                    <>
                      <button 
                        onClick={() => setPhotoIdx(p => p > 0 ? p - 1 : selectedPg.photos.length - 1)}
                        style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button 
                        onClick={() => setPhotoIdx(p => p < selectedPg.photos.length - 1 ? p + 1 : 0)}
                        style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </>
                  )}
                </div>
                {selectedPg.photos.length > 1 && (
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px", overflowX: "auto", paddingBottom: "4px" }}>
                    {selectedPg.photos.map((p, i) => (
                      <img 
                        key={i} 
                        src={p} 
                        onClick={() => setPhotoIdx(i)} 
                        style={{ 
                          width: "56px", 
                          height: "56px", 
                          objectFit: "cover", 
                          borderRadius: "var(--radius-sm)", 
                          cursor: "pointer", 
                          border: i === photoIdx ? "2px solid var(--primary)" : "2px solid transparent", 
                          flexShrink: 0,
                          opacity: i === photoIdx ? 1 : 0.6,
                          transition: "all 0.2s" 
                        }} 
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-lg)", height: "160px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "56px", marginBottom: "20px" }}>🏢</div>
            )}

            {/* VIDEO TOUR (Direct Upload static links or local base64 files) */}
            {((selectedPg.videoLink && !getVideoEmbed(selectedPg.videoLink)) || selectedPg.videoBase64) && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Video size={14} /> Video Walkthrough
                </div>
                <video controls style={{ width: "100%", borderRadius: "var(--radius-lg)", maxHeight: "240px", background: "#000", border: "1px solid var(--card-border)" }}>
                  <source src={selectedPg.videoLink || selectedPg.videoBase64} />
                </video>
              </div>
            )}
            
            {/* VIDEO EMBED TOUR (YouTube / Google Drive) */}
            {selectedPg.videoLink && getVideoEmbed(selectedPg.videoLink) && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Video size={14} /> Video Tour Embed
                </div>
                <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--card-border)" }}>
                  <iframe src={getVideoEmbed(selectedPg.videoLink) || ""} width="100%" height="240" frameBorder="0" allowFullScreen />
                </div>
              </div>
            )}

            {/* NEGOTIATION STATS & PRICING */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-lg)", padding: "16px", marginBottom: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "14px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.5px" }}>Retail Ask Price</div>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-secondary)", textDecoration: "line-through" }}>
                    ₹{Number(selectedPg.actualPrice).toLocaleString()}<span style={{ fontSize: "12px", textDecoration: "none", fontWeight: "400" }}>/mo</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--accent-green)", textTransform: "uppercase", fontWeight: "800", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Sparkles size={11} /> Negotiated Price
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: "#fff" }}>
                    ₹{Number(selectedPg.negotiablePrice).toLocaleString()}<span style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)" }}>/mo</span>
                  </div>
                </div>
              </div>
              
              {Number(selectedPg.actualPrice) > Number(selectedPg.negotiablePrice) && (
                <div style={{ 
                  background: "rgba(16,185,129,0.08)", 
                  border: "1px solid rgba(16,185,129,0.2)", 
                  borderRadius: "var(--radius-md)", 
                  padding: "12px", 
                  fontSize: "13px", 
                  color: "var(--accent-green)", 
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Percent size={14} />
                  </div>
                  <div>
                    Negotiation complete! Saves <span style={{ color: "#fff", fontWeight: "800" }}>₹{(Number(selectedPg.actualPrice) - Number(selectedPg.negotiablePrice)).toLocaleString()}/month</span> relative to building retail rates.
                  </div>
                </div>
              )}
            </div>

            {/* DETAILS & DESCRIPTION */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-md)", padding: "10px 14px" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Minimum Tenure</div>
                <div style={{ fontWeight: "700", color: "#fff", fontSize: "14px", marginTop: "2px" }}>{selectedPg.minTenure || "Flex contract"}</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-md)", padding: "10px 14px" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Hostel Vibe</div>
                <div style={{ fontWeight: "700", color: "#fff", fontSize: "14px", marginTop: "2px" }}>{selectedPg.gender === "Both" ? "Co-ed Social" : `${selectedPg.gender} House`}</div>
              </div>
            </div>

            {selectedPg.description && (
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px" }}>Vibe Check & Description</div>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.6" }}>{selectedPg.description}</p>
              </div>
            )}

            {/* AMENITIES */}
            {selectedPg.amenities?.length > 0 && (
              <div style={{ marginBottom: "28px" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "10px" }}>What's Included</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {selectedPg.amenities.map(a => (
                    <span 
                      key={a} 
                      style={{ 
                        fontSize: "12px", 
                        color: "#fff", 
                        background: "rgba(255,255,255,0.03)", 
                        padding: "6px 14px", 
                        borderRadius: "100px", 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: "6px",
                        border: "1px solid var(--card-border)"
                      }}
                    >
                      {AMENITY_ICONS[a]}
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div style={{ display: "flex", gap: "10px", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "20px" }}>
              <a 
                href={`tel:${selectedPg.managerPhone}`} 
                className="btn-primary" 
                style={{ 
                  flex: 1, 
                  textAlign: "center", 
                  borderRadius: "var(--radius-md)", 
                  padding: "14px", 
                  fontWeight: "800", 
                  fontSize: "15px", 
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px"
                }}
              >
                <Phone size={16} />
                Call Manager Directly
              </a>
              <button 
                className="btn-secondary" 
                style={{ 
                  borderRadius: "var(--radius-md)", 
                  padding: "14px", 
                  fontWeight: "600", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  cursor: "pointer",
                  gap: "8px"
                }}
                onClick={() => handleShare(selectedPg)}
              >
                {shareStatus ? (
                  <>
                    <Check size={16} style={{ color: "var(--accent-green)" }} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Share2 size={16} />
                    Share
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HELP FAQ & CHAT CENTER */}
      <section className="help-chat-section">
        <div className="help-chat-grid">
          
          {/* FAQ Accordion & Contact Info */}
          <div className="faq-card animate-fade-in">
            <h2 style={{ fontSize: "28px", fontWeight: "700", fontFamily: "var(--font-heading)", marginBottom: "8px", background: "linear-gradient(135deg, #fff 30%, #a855f7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Help Center & FAQs
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>
              Have questions? Browse our frequently asked questions or get in touch with us directly.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {[
                {
                  q: "What is Dusra Ghar?",
                  a: "Dusra Ghar is an exclusive platform built for DTU students to search, compare, and lease verified PGs near the university campus with absolutely zero brokerage fees."
                },
                {
                  q: "Are the prices listed negotiable?",
                  a: "Yes! We list both the original price and a highly discounted negotiable price that we have pre-arranged for students. Feel free to contact the manager directly."
                },
                {
                  q: "How can I visit a PG?",
                  a: "Every listing shows the verified phone number of the PG manager. You can call them directly to schedule a physical visit or check out the virtual video tours on our platform."
                },
                {
                  q: "Is there any hidden booking charge?",
                  a: "No hidden charges, booking fees, or commissions. You deal directly with the PG management."
                }
              ].map((faq, idx) => {
                const isActive = faqActiveIndex === idx;
                return (
                  <div key={idx} className={`faq-item ${isActive ? "active" : ""}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 0" }}>
                    <button 
                      className="faq-question" 
                      onClick={() => setFaqActiveIndex(isActive ? null : idx)}
                    >
                      <span>{faq.q}</span>
                      <span style={{ transition: "transform 0.2s", transform: isActive ? "rotate(180deg)" : "rotate(0deg)", color: "var(--primary)" }}>
                        ▼
                      </span>
                    </button>
                    <div 
                      className="faq-answer" 
                      style={{ 
                        maxHeight: isActive ? "200px" : "0", 
                        overflow: "hidden", 
                        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)", 
                        marginTop: isActive ? "12px" : "0",
                        color: "var(--text-secondary)",
                        fontSize: "14px"
                      }}
                    >
                      {faq.a}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Direct Admin Contact */}
            <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ padding: "12px", borderRadius: "12px", background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.15)", color: "var(--primary)" }}>
                <Mail size={20} />
              </div>
              <div>
                <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", fontWeight: "700" }}>Official Contact</div>
                <a href="mailto:yashgmat85@gmail.com" style={{ fontSize: "15px", color: "var(--text-primary)", fontWeight: "600", textDecoration: "none" }}>
                  yashgmat85@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Interactive Chat Console */}
          <div className="chat-console glass-panel animate-fade-in" style={{ display: "flex", flexDirection: "column" }}>
            
            {/* Console Header */}
            <div className="chat-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ position: "relative" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: isChatAdmin ? "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)" : "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
                    {isChatAdmin ? <User size={18} style={{ color: "white" }} /> : activeChatTab === "ai" ? <Bot size={18} style={{ color: "white" }} /> : <MessageSquare size={18} style={{ color: "white" }} />}
                  </div>
                  <span style={{ position: "absolute", bottom: "-2px", right: "-2px", width: "12px", height: "12px", borderRadius: "50%", background: "var(--accent-green)", border: "2px solid #0a0f1a" }}></span>
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                    {isChatAdmin ? "Yash (Admin Mode)" : activeChatTab === "ai" ? "Dusra Ghar AI Bot" : "Yash's Direct Line"}
                    {isChatAdmin && <span style={{ fontSize: "10px", background: "rgba(244, 63, 94, 0.15)", color: "#f43f5e", border: "1px solid rgba(244, 63, 94, 0.25)", padding: "1px 6px", borderRadius: "10px" }}>Admin</span>}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                    {isChatAdmin ? "Managing support requests" : "Ultimate & Infinite Curiosity"}
                  </div>
                </div>
              </div>

              {/* Header Actions / Tabs */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {!isChatAdmin ? (
                  <div className="chat-tabs">
                    <button 
                      className={`chat-tab-btn ${activeChatTab === "ai" ? "active" : ""}`}
                      onClick={() => setActiveChatTab("ai")}
                    >
                      <Bot size={14} /> AI Assistant
                    </button>
                    <button 
                      className={`chat-tab-btn ${activeChatTab === "admin" ? "active" : ""}`}
                      onClick={() => setActiveChatTab("admin")}
                    >
                      <User size={14} /> Direct Chat
                    </button>
                  </div>
                ) : (
                  <button 
                    className="chat-tab-btn active"
                    style={{ background: "rgba(244, 63, 94, 0.2)", border: "1px solid rgba(244, 63, 94, 0.3)", color: "#f43f5e" }}
                    onClick={() => {
                      setIsChatAdmin(false);
                      setActiveChatTab("admin");
                      setAdminSelectedSession(null);
                    }}
                  >
                    <LogOut size={13} /> Exit Admin
                  </button>
                )}
                
                {/* Secret Lock switch for Yash */}
                {!isChatAdmin && (
                  <button 
                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
                    onClick={() => {
                      const code = prompt("Enter Admin Passcode:");
                      if (code === "yash2026") {
                        setIsChatAdmin(true);
                        setActiveChatTab("admin");
                        alert("Admin mode activated. Hello Yash!");
                      } else if (code !== null) {
                        alert("Invalid passcode");
                      }
                    }}
                    title="Admin Console Login"
                  >
                    <Lock size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="chat-body">
              {isChatAdmin && !adminSelectedSession ? (
                // Admin session selection list
                <div className="admin-sessions-list">
                  <div style={{ padding: "0 8px 12px 8px", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", marginBottom: "8px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>Active Student Chats</h3>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Select a thread to reply</p>
                  </div>
                  {(() => {
                    const sessionsMap = new Map<string, { lastMsg: string; name: string; time: string }>();
                    chatMessages
                      .filter(m => !m.sessionId.endsWith("_ai"))
                      .forEach(m => {
                        sessionsMap.set(m.sessionId, {
                          lastMsg: m.message,
                          name: m.studentName,
                          time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        });
                      });
                    
                    const sessions = Array.from(sessionsMap.entries());

                    if (sessions.length === 0) {
                      return (
                        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)", fontSize: "14px" }}>
                          No active chats found. Direct chats will appear here once students register and send messages.
                        </div>
                      );
                    }

                    return sessions.map(([sessId, data]) => (
                      <div 
                        key={sessId}
                        className={`admin-session-item ${adminSelectedSession === sessId ? "active" : ""}`}
                        onClick={() => setAdminSelectedSession(sessId)}
                      >
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{data.name}</div>
                          <div style={{ fontSize: "12px", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
                            {data.lastMsg}
                          </div>
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{data.time}</div>
                      </div>
                    ));
                  })()}
                </div>
              ) : !isChatAdmin && activeChatTab === "admin" && !isNameSubmitted ? (
                // Student Name registration form
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyItems: "center", justifyContent: "center", padding: "40px" }}>
                  <form onSubmit={handleRegisterName} style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "340px", margin: "0 auto", width: "100%" }}>
                    <div style={{ textAlign: "center", marginBottom: "8px" }}>
                      <div style={{ display: "inline-block", padding: "12px", borderRadius: "50%", background: "rgba(99, 102, 241, 0.08)", color: "var(--primary)", marginBottom: "12px" }}>
                        <MessageSquare size={24} />
                      </div>
                      <h3 style={{ fontSize: "18px", fontWeight: "700" }}>Start Live Chat</h3>
                      <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>Enter your name to connect directly with Yash Kumar (Admin)</p>
                    </div>
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Your Full Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Rahul Sharma" 
                        required
                        className="chat-input"
                        style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "white" }}
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="btn-primary" 
                      style={{ padding: "12px", borderRadius: "10px", fontWeight: "600", cursor: "pointer", border: "none" }}
                    >
                      Connect & Chat
                    </button>
                  </form>
                </div>
              ) : (
                // Actual Chat History
                <>
                  {isChatAdmin && adminSelectedSession && (
                    <div style={{ padding: "8px 16px", background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", display: "flex", alignItems: "center", gap: "8px" }}>
                      <button 
                        style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
                        onClick={() => setAdminSelectedSession(null)}
                      >
                        ← Back to list
                      </button>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                        Chatting with <strong>{chatMessages.find(m => m.sessionId === adminSelectedSession)?.studentName || "Student"}</strong>
                      </div>
                    </div>
                  )}
                  
                  <div className="chat-messages">
                    {(() => {
                      const currentSessId = isChatAdmin ? adminSelectedSession : (activeChatTab === "ai" ? `${sessionId}_ai` : sessionId);
                      const filtered = chatMessages.filter(m => m.sessionId === currentSessId);

                      return filtered.map((m) => {
                        const isStudentSender = m.sender === "student";
                        const isSelf = isChatAdmin ? m.sender === "admin" : isStudentSender;
                        
                        let messageClass = "message-ai";
                        if (m.sender === "student") messageClass = "message-student";
                        if (m.sender === "admin") messageClass = "message-admin";
                        
                        return (
                          <div 
                            key={m.id} 
                            className={`chat-message ${messageClass}`}
                            style={{ whiteSpace: "pre-line" }}
                          >
                            {!isSelf && (
                              <div style={{ fontSize: "10px", opacity: 0.6, fontWeight: "700", marginBottom: "4px" }}>
                                {m.sender === "admin" ? "Yash Kumar (Admin)" : m.sender === "ai" ? "Dusra Ghar AI" : m.studentName}
                              </div>
                            )}
                            <div>{m.message}</div>
                            <div style={{ fontSize: "9px", opacity: 0.5, textAlign: "right", marginTop: "4px" }}>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                    
                    {/* AI Typing Indicator */}
                    {activeChatTab === "ai" && isAiTyping && (
                      <div className="chat-typing-indicator">
                        <div className="chat-typing-dot"></div>
                        <div className="chat-typing-dot"></div>
                        <div className="chat-typing-dot"></div>
                      </div>
                    )}
                  </div>

                  {/* Message Input Bar */}
                  <div className="chat-input-area">
                    <input 
                      type="text" 
                      placeholder={isChatAdmin ? "Type admin reply..." : activeChatTab === "ai" ? "Ask AI e.g., 'PGs with gym'..." : "Type message for Yash..."}
                      className="chat-input"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    />
                    <button 
                      className="btn-primary"
                      style={{ padding: "10px", borderRadius: "10px", width: "40px", height: "40px", display: "flex", justifyItems: "center", justifyContent: "center", alignItems: "center", border: "none", cursor: "pointer" }}
                      onClick={handleSend}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "24px", paddingBottom: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
        <div>🏠 Dusra Ghar — Built with ultimate & infinite curiosity for the DTU student community</div>
        <div style={{ marginTop: "4px" }}>Compare prices · Skip broker fee · Rent smart</div>
        <div style={{ marginTop: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>
          © 2026 PG's Info by Yash Kumar. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
