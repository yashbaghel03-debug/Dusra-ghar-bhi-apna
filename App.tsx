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
  CheckCircle
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

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
  
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadPgs(); }, []);

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
    } else {
      setLoginErr("Wrong password. Try again.");
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

  // Vibe matcher action
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
    setQuizMatchMsg("✨ Vibe match filters applied successfully below! Scroll down to see results.");
    
    setTimeout(() => {
      setQuizMatchMsg("");
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 2000);
  }

  const filtered = pgs.filter(pg => {
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
      
      {/* Background blobs for layered depth */}
      <div className="bg-blobs-container">
        <div className="bg-blob blob-1"></div>
        <div className="bg-blob blob-2"></div>
        <div className="bg-blob blob-3"></div>
      </div>

      {/* HEADER */}
      <header className="glass-panel" style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        padding: "16px 24px", 
        borderRadius: "0 0 24px 24px", 
        marginBottom: "32px",
        borderTop: "none"
      }}>
        <div onClick={() => setView("home")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ 
            background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)", 
            width: "44px", 
            height: "44px", 
            borderRadius: "12px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            boxShadow: "0 0 15px rgba(99,102,241,0.4)"
          }}>
            <span style={{ fontSize: "22px" }}>🏠</span>
          </div>
          <div>
            <div style={{ fontSize: "22px", fontWeight: "800", letterSpacing: "-0.5px", background: "linear-gradient(90deg, #f8fafc 0%, #a855f7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Dusra Ghar
            </div>
            <div style={{ fontSize: "11px", color: "var(--accent-green)", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent-green)", animation: "pulse-glow 1.5s infinite" }}></span>
              DTU PG FINDER — FOR FRESHERS
            </div>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: "10px" }}>
          {!isAdmin ? (
            <button 
              className="btn-secondary"
              style={{ padding: "8px 18px", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "13px", fontWeight: "600" }} 
              onClick={() => setView("login")}
            >
              Admin Lock
            </button>
          ) : (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button 
                className="btn-primary" 
                style={{ padding: "8px 18px", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "13px", fontWeight: "600", border: "none" }}
                onClick={() => setView("admin")}
              >
                Dashboard
              </button>
              <button 
                className="btn-secondary"
                style={{ padding: "8px 18px", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}
                onClick={() => { setIsAdmin(false); setView("home"); }}
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
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "56px" }}>
          
          {/* 2-COLUMN HERO LAYOUT */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", 
            gap: "40px", 
            alignItems: "center",
            marginTop: "16px",
            textAlign: "left"
          }}>
            {/* Left Content */}
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: "100px", padding: "6px 14px", marginBottom: "16px" }}>
                <Sparkles size={13} style={{ color: "var(--primary)" }} />
                <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.8px" }}>SKIP THE MIDDLEMAN</span>
              </div>
              <h1 style={{ fontSize: "52px", fontWeight: "800", letterSpacing: "-2px", lineHeight: "1.05", marginBottom: "16px", background: "linear-gradient(135deg, #ffffff 40%, #a855f7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Find Your Vibe Near DTU.
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "16px", marginBottom: "28px", lineHeight: "1.6" }}>
                Skip the brokers and curfews. We map out real prices, video tours, and verified reviews from seniors so you get a place that feels like a real *Dusra Ghar*.
              </p>
              
              {/* SEARCH BAR */}
              <div className="glass-panel" style={{ 
                borderRadius: "100px", 
                padding: "6px 8px 6px 20px", 
                display: "flex", 
                alignItems: "center", 
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                gap: "10px",
                border: "1px solid rgba(255,255,255,0.08)"
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
                    color: "var(--text-primary)", 
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
                    <span style={{ background: "var(--primary)", width: "8px", height: "8px", borderRadius: "50%" }}></span>
                  )}
                </button>
              </div>
              
              {/* DETAILED FILTERS DROPDOWN */}
              {showFilters && (
                <div className="glass-panel animate-fade-in" style={{ 
                  borderRadius: "var(--radius-lg)", 
                  padding: "20px", 
                  marginTop: "16px",
                  textAlign: "left",
                  boxShadow: "0 15px 35px rgba(0,0,0,0.3)"
                }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.5px" }}>Gender Vibe</label>
                      <select 
                        value={filterGender} 
                        onChange={e => setFilterGender(e.target.value)}
                        style={{ 
                          width: "100%", 
                          padding: "8px 12px", 
                          borderRadius: "var(--radius-sm)", 
                          background: "rgba(255,255,255,0.05)", 
                          border: "1px solid rgba(255,255,255,0.1)", 
                          color: "var(--text-primary)", 
                          fontSize: "13px" 
                        }}
                      >
                        <option value="All" style={{ background: "var(--bg)" }}>All Students</option>
                        <option value="Boys" style={{ background: "var(--bg)" }}>Boys Only</option>
                        <option value="Girls" style={{ background: "var(--bg)" }}>Girls Only</option>
                      </select>
                    </div>
                    
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.5px" }}>Min Price (₹)</label>
                      <input 
                        type="number" 
                        placeholder="Min ₹" 
                        value={filterMin} 
                        onChange={e => setFilterMin(e.target.value)}
                        style={{ 
                          width: "100%", 
                          padding: "8px 12px", 
                          borderRadius: "var(--radius-sm)", 
                          background: "rgba(255,255,255,0.05)", 
                          border: "1px solid rgba(255,255,255,0.1)", 
                          color: "var(--text-primary)", 
                          fontSize: "13px" 
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.5px" }}>Max Price (₹)</label>
                      <input 
                        type="number" 
                        placeholder="Max ₹" 
                        value={filterMax} 
                        onChange={e => setFilterMax(e.target.value)}
                        style={{ 
                          width: "100%", 
                          padding: "8px 12px", 
                          borderRadius: "var(--radius-sm)", 
                          background: "rgba(255,255,255,0.05)", 
                          border: "1px solid rgba(255,255,255,0.1)", 
                          color: "var(--text-primary)", 
                          fontSize: "13px" 
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.5px" }}>Vibe Filters (Amenities)</label>
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
                              padding: "6px 12px",
                              borderRadius: "100px",
                              fontSize: "12px",
                              fontWeight: "500",
                              cursor: "pointer",
                              transition: "all 0.2s",
                              background: isSelected ? "var(--primary)" : "rgba(255,255,255,0.03)",
                              border: `1px solid ${isSelected ? "var(--primary)" : "rgba(255,255,255,0.08)"}`,
                              color: isSelected ? "#fff" : "var(--text-secondary)"
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
                      className="btn-primary" 
                      style={{ padding: "6px 14px", borderRadius: "var(--radius-sm)", border: "none", fontSize: "12px", cursor: "pointer" }}
                      onClick={() => setShowFilters(false)}
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Right Asset Graphic */}
            <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
              <div 
                className="animate-float" 
                style={{ 
                  width: "100%", 
                  maxWidth: "400px", 
                  aspectRatio: "1/1",
                  borderRadius: "20%",
                  overflow: "hidden",
                  boxShadow: "0 20px 50px rgba(99, 102, 241, 0.2)",
                  border: "2px solid rgba(255,255,255,0.1)",
                  background: "rgba(10,15,28,0.3)"
                }}
              >
                <img 
                  src="/hero_vibe_illustration.png" 
                  alt="Aesthetic student room render" 
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                />
              </div>
            </div>
          </div>

          {/* core advantages banners ("Why Us") */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
            {[
              { icon: <TrendingDown size={22} style={{ color: "var(--accent-green)" }} />, title: "Zero Brokerage Fees", desc: "No middleman, no deposit cuts. Deal directly with PG managers and save up to ₹15,000 upfront." },
              { icon: <Video size={22} style={{ color: "var(--primary)" }} />, title: "100% Video Tours", desc: "Walk through rooms virtually with direct clips. Know the exact vibe of the house before you travel." },
              { icon: <Users size={22} style={{ color: "var(--secondary)" }} />, title: "Student Verified Rates", desc: "We track and contrast actual building base rates vs negotiated student prices so you get the best deal." }
            ].map((f, i) => (
              <div key={i} className="why-card">
                <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  {f.icon}
                </div>
                <h4 style={{ fontWeight: "700", fontSize: "16px", color: "#fff", marginBottom: "6px" }}>{f.title}</h4>
                <p style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.5" }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* INTERACTIVE VIBE MATCHING WIDGET */}
          <div className="glass-panel" style={{ 
            borderRadius: "var(--radius-lg)", 
            padding: "28px", 
            boxShadow: "0 15px 40px rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.08)",
            textAlign: "left"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <div style={{ background: "rgba(168,85,247,0.1)", width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Compass size={16} style={{ color: "var(--secondary)" }} />
              </div>
              <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#fff" }}>Interactive Vibe Matcher</h3>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "20px" }}>
              Select your study/lifestyle vibe and budget limits. We'll run a match algorithm to isolate perfect PGs.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "24px" }}>
              {/* Choose Vibe */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.5px" }}>Choose your room vibe</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {[
                    { id: "social", label: "🦋 Social Butterfly", sub: "WiFi, meals, social roommates" },
                    { id: "quiet", label: "📚 Quiet Deep Focus", sub: "Privacy, private bath, security" },
                    { id: "gym", label: "🏋️ Gym & Fitness Bro", sub: "In-house Gym, parking spot" },
                    { id: "comfort", label: "🛋️ Maximum Comfort", sub: "AC, laundry, hot water" }
                  ].map(v => (
                    <button
                      key={v.id}
                      onClick={() => setQuizVibe(v.id)}
                      className="vibe-card-btn"
                      style={{
                        borderColor: quizVibe === v.id ? "var(--primary)" : "rgba(255,255,255,0.06)",
                        background: quizVibe === v.id ? "rgba(99,102,241,0.05)" : "rgba(255,255,255,0.01)"
                      }}
                    >
                      <div style={{ fontWeight: "700", fontSize: "13px", color: "#fff" }}>{v.label}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>{v.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Choose Budget */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.5px" }}>Choose monthly budget</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {[
                    { id: "low", label: "💸 Pocket Friendly", sub: "Under ₹8,000/month" },
                    { id: "mid", label: "💎 Comfort Living", sub: "Under ₹12,000/month" },
                    { id: "high", label: "🚀 Infinite Vibe", sub: "Show all prices" }
                  ].map(b => (
                    <button
                      key={b.id}
                      onClick={() => setQuizBudget(b.id)}
                      className="vibe-card-btn"
                      style={{
                        borderColor: quizBudget === b.id ? "var(--secondary)" : "rgba(255,255,255,0.06)",
                        background: quizBudget === b.id ? "rgba(168,85,247,0.05)" : "rgba(255,255,255,0.01)"
                      }}
                    >
                      <div style={{ fontWeight: "700", fontSize: "13px", color: "#fff" }}>{b.label}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>{b.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {quizMatchMsg && (
              <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "var(--radius-sm)", padding: "12px", fontSize: "13px", color: "var(--accent-green)", fontWeight: "600", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle size={16} />
                {quizMatchMsg}
              </div>
            )}

            <button 
              className="btn-primary"
              style={{ width: "100%", padding: "14px", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer", fontWeight: "800", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              onClick={handleVibeMatch}
            >
              Run Vibe Matcher Algorithm
              <ArrowRight size={16} />
            </button>
          </div>

          {/* LISTINGS RESULTS GRID */}
          <div ref={resultsRef} style={{ scrollMarginTop: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "600" }}>
                ⚡ Showing <span style={{ color: "#fff", fontWeight: "800" }}>{filtered.length}</span> PG{filtered.length !== 1 ? "s" : ""} match{filtered.length !== 1 ? "es" : ""} near campus
              </div>
              {(filterGender !== "All" || filterMin || filterMax || selectedVibeTags.length > 0) && (
                <button 
                  style={{ background: "transparent", border: "none", color: "var(--primary)", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
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
              <div className="glass-panel" style={{ textAlign: "center", padding: "60px 20px", borderRadius: "var(--radius-lg)" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "4px" }}>No PGs matching filters</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Try removing filters or expanding your search budget.</p>
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
                      className="glass-panel animate-fade-in"
                      style={{ 
                        borderRadius: "var(--radius-lg)", 
                        overflow: "hidden", 
                        cursor: "pointer", 
                        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                        display: "flex",
                        flexDirection: "column",
                        height: "100%"
                      }}
                      onClick={() => { setSelectedPg(pg); setPhotoIdx(0); }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.borderColor = "var(--card-border-hover)";
                        e.currentTarget.style.boxShadow = "0 8px 30px rgba(99, 102, 241, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.borderColor = "var(--card-border)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      {/* PHOTO PREVIEW */}
                      <div style={{ width: "100%", height: "180px", background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
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
                        
                        {/* TOP BADGES */}
                        <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          <span style={{ 
                            fontSize: "10px", 
                            fontWeight: "800", 
                            padding: "4px 10px", 
                            borderRadius: "100px", 
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            background: pg.gender === "Girls" ? "rgba(244,63,94,0.15)" : pg.gender === "Boys" ? "rgba(59,130,246,0.15)" : "rgba(168,85,247,0.15)",
                            color: pg.gender === "Girls" ? "#fb7185" : pg.gender === "Boys" ? "#60a5fa" : "#c084fc",
                            border: `1px solid ${pg.gender === "Girls" ? "rgba(244,63,94,0.3)" : pg.gender === "Boys" ? "rgba(59,130,246,0.3)" : "rgba(168,85,247,0.3)"}`,
                            backdropFilter: "blur(4px)"
                          }}>
                            {pg.gender === "Both" ? "Co-ed" : pg.gender}
                          </span>
                        </div>

                        {/* INFO BADGES BOTTOM */}
                        <div style={{ position: "absolute", bottom: "10px", right: "12px", display: "flex", gap: "6px" }}>
                          {pg.photos?.length > 1 && (
                            <span style={{ background: "rgba(0,0,0,0.65)", color: "#fff", fontSize: "10px", fontWeight: "700", borderRadius: "100px", padding: "3px 8px", backdropFilter: "blur(4px)" }}>
                              +{pg.photos.length - 1} Photos
                            </span>
                          )}
                          {(pg.videoBase64 || pg.videoLink) && (
                            <span style={{ background: "rgba(99,102,241,0.85)", color: "#fff", fontSize: "10px", fontWeight: "700", borderRadius: "100px", padding: "3px 8px", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", gap: "4px" }}>
                              <Video size={10} /> Tour
                            </span>
                          )}
                        </div>
                      </div>

                      {/* CONTENT */}
                      <div style={{ padding: "16px", display: "flex", flexDirection: "column", flexGrow: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "4px" }}>
                          <h4 style={{ fontWeight: "700", fontSize: "16px", color: "#fff", lineHeight: "1.3" }}>{pg.name}</h4>
                        </div>
                        
                        {/* ADDRESS */}
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-secondary)", fontSize: "12px", marginBottom: "14px" }}>
                          <MapPin size={12} style={{ color: "var(--text-muted)" }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pg.address}</span>
                        </div>

                        {/* PRICING BLOCK */}
                        <div style={{ display: "flex", alignItems: "flex-end", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                          <span style={{ fontSize: "18px", fontWeight: "800", color: "#fff" }}>
                            ₹{nego.toLocaleString()}
                          </span>
                          <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "500", paddingBottom: "2px" }}>/mo</span>
                          {savings > 0 && (
                            <>
                              <span style={{ fontSize: "11px", color: "var(--text-muted)", textDecoration: "line-through", paddingBottom: "2px", marginLeft: "4px" }}>
                                ₹{actual.toLocaleString()}
                              </span>
                              <span style={{ fontSize: "10px", color: "var(--accent-green)", fontWeight: "700", background: "rgba(16,185,129,0.1)", padding: "2px 6px", borderRadius: "4px", marginLeft: "4px", border: "1px solid rgba(16,185,129,0.2)" }}>
                                -{percentSaved}%
                              </span>
                            </>
                          )}
                        </div>

                        {/* AMENITIES BADGES */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px" }}>
                          {(pg.amenities || []).slice(0, 3).map(a => (
                            <span 
                              key={a} 
                              style={{ 
                                fontSize: "11px", 
                                color: "var(--text-secondary)", 
                                background: "rgba(255,255,255,0.03)", 
                                padding: "2px 8px", 
                                borderRadius: "100px", 
                                display: "inline-flex", 
                                alignItems: "center", 
                                gap: "4px",
                                border: "1px solid rgba(255,255,255,0.04)"
                              }}
                            >
                              {AMENITY_ICONS[a]}
                              {a}
                            </span>
                          ))}
                          {(pg.amenities || []).length > 3 && (
                            <span style={{ fontSize: "11px", color: "var(--text-muted)", background: "rgba(255,255,255,0.03)", padding: "2px 8px", borderRadius: "100px" }}>
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

          {/* STUDENT TESTIMONIALS SECTION */}
          <div style={{ textAlign: "left", marginTop: "24px" }}>
            <h3 style={{ fontSize: "22px", fontWeight: "800", color: "#fff", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>💬</span> Vetted by DTU Seniors
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>
              Here is what senior batch students have to say about finding accommodation through Dusra Ghar.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
              {[
                { name: "Aman Sharma", branch: "CSE '25", quote: "Dusra Ghar saved me ₹1,200/mo on my PG. The video tour was identical to the room in person—no fake photos like local broker sites." },
                { name: "Riya Gupta", branch: "ECE '26", quote: "Finding secure girls' PGs near Gate 2 with no strict curfew was incredibly easy. The WiFi speed tags are actually verified." },
                { name: "Aryan Goel", branch: "IT '24", quote: "Negotiating is stressful. Knowing the pre-negotiated rate before I called the manager gave me massive leverage. Essential for freshers!" }
              ].map((t, i) => (
                <div key={i} className="glass-panel" style={{ padding: "20px", borderRadius: "var(--radius-md)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <p style={{ color: "var(--text-secondary)", fontSize: "13px", fontStyle: "italic", lineHeight: "1.6", marginBottom: "16px" }}>
                    "{t.quote}"
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "12px", color: "#fff" }}>
                      {t.name[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: "700", fontSize: "13px", color: "#fff" }}>{t.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--primary)", fontWeight: "600" }}>DTU {t.branch}</div>
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

      {/* FOOTER */}
      <footer style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
        <div>🏠 Dusra Ghar — Built by DTU Freshers for the community</div>
        <div style={{ marginTop: "4px" }}>Compare prices · Skip broker fee · Rent smart</div>
      </footer>
    </div>
  );
}
