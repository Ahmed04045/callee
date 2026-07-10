import React, { useState } from 'react';
import { Search, Compass, Briefcase, Megaphone, User, MapPin, Map, Settings, FileText, Shield, Flame, ArrowRight, Ticket, CheckCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('main'); // main, recruit, discover, announcements, profile
  const [searchQuery, setSearchQuery] = useState('');

  // Mock Data: Broadening to all teens (Web Dev, Content Creation, Design, Events)
  const featuredEvents = [
    { id: 'fe1', title: "Qatar Youth Tech Hackathon", organizer: "Digital Innovators Hub", date: "July 18, 2026", location: "Doha Tech District", spots: 22, tag: "Tech" },
    { id: 'fe2', title: "Streetwear & Design Pop-Up", organizer: "Raw Collective", date: "July 24, 2026", location: "The Pearl, Gallery 3", spots: 8, tag: "Fashion" }
  ];

  const allRecruitment = [
    { id: 'r1', role: "Frontend Web Developer (React/Vite)", postedBy: "Nexus Startup Labs", compensation: "Commission / Equity", tags: ["Tech", "Coding"], details: "Building a localized delivery prototype. Need a junior dev to bring Figma designs to life using clean Tailwind layouts.", featured: true },
    { id: 'r2', role: "TikTok Content Creator / Editor", postedBy: "Volt Energy Drink Partner", compensation: "Paid per video package", tags: ["Media", "Video"], details: "Looking for an energetic teen creator to manage local street-interview content and trend rollouts.", featured: true },
    { id: 'r3', role: "Graphic Designer for Apparel Line", postedBy: "Ghost Thread Co.", compensation: "Profit Share", tags: ["Design", "Art"], details: "Launching a minimalist local clothing brand. Need vector graphics and typography assets ready for screenprinting.", featured: false }
  ];

  const announcements = [
    { id: 'a1', author: "System Operations", role: "Core Dev", date: "Today", title: "Welcome to the Unified Teen Ecosystem", content: "We've officially expanded the platform to cover tech, media, fashion, and business roles. No matter your skill set, this space is built to bypass corporate job boards and get you real experience." }
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-cyan-500 selection:text-neutral-950">
      
      {/* GLOBAL HEADER */}
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur sticky top-0 z-50 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-cyan-500 to-indigo-500 p-2 rounded-xl text-neutral-950 font-black text-xs tracking-wider">NS</div>
          <h1 className="font-black text-lg tracking-tight text-white">PROJECT HUB</h1>
        </div>

        {/* 5-WAY NAVIGATION BAR */}
        <nav className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800/60 max-w-full overflow-x-auto">
          {[
            { id: 'main', label: 'Feed', icon: Flame },
            { id: 'recruit', label: 'Recruit', icon: Briefcase },
            { id: 'discover', label: 'Discover', icon: Compass },
            { id: 'announcements', label: 'Updates', icon: Megaphone },
            { id: 'profile', label: 'Profile', icon: User }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150 ${activeTab === tab.id ? 'bg-neutral-800 text-cyan-400 shadow-md' : 'text-neutral-400 hover:text-neutral-200'}`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* GLOBAL MAIN WORKSPACE */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        
        {/* TAB 1: MAIN FEED */}
        {activeTab === 'main' && (
          <div className="space-y-10">
            {/* Catchy Search Hero section */}
            <div className="text-center py-6 space-y-4">
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Stop looking for ordinary jobs.<br/><span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">Build real things instead.</span></h2>
              <div className="max-w-xl mx-auto relative mt-4">
                <Search className="absolute left-4 top-3.5 text-neutral-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Search coding gigs, video editing, local events..." 
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition duration-150"
                />
              </div>
            </div>

            {/* Featured Section Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Left 2 Columns: Famous/Trending Events */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                  <Flame size={14} className="text-orange-500" /> Trending Events
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {featuredEvents.map(event => (
                    <div key={event.id} className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-5 hover:border-neutral-800 transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-mono bg-cyan-950/60 text-cyan-400 border border-cyan-900/40 px-2 py-0.5 rounded">{event.tag}</span>
                          <h4 className="text-lg font-bold text-white mt-2">{event.title}</h4>
                          <p className="text-xs text-neutral-400 mt-0.5">By {event.organizer}</p>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-500">{event.spots} spots left</span>
                      </div>
                      <div className="mt-4 flex justify-between items-center text-xs text-neutral-500 font-mono pt-3 border-t border-neutral-900/60">
                        <div>{event.date}</div>
                        <div className="flex items-center gap-1"><MapPin size={12}/> {event.location}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right 1 Column: Famous/Featured Gigs */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                  <Briefcase size={14} className="text-indigo-400" /> Top Recruitment Calls
                </h3>
                {allRecruitment.filter(r => r.featured).map(gig => (
                  <div key={gig.id} className="bg-neutral-900/20 border border-neutral-900 rounded-xl p-4 space-y-3">
                    <div>
                      <span className="text-[9px] font-mono font-bold bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded-full">{gig.compensation}</span>
                      <h4 className="text-sm font-bold text-white mt-1.5">{gig.role}</h4>
                      <p className="text-[11px] text-neutral-500">{gig.postedBy}</p>
                    </div>
                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">{gig.details}</p>
                    <button onClick={() => setActiveTab('recruit')} className="w-full text-center text-[11px] font-bold text-cyan-400 bg-neutral-900 hover:bg-neutral-800 py-2 rounded-lg transition border border-neutral-800">
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RECRUIT FEED */}
        {activeTab === 'recruit' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="border-b border-neutral-900 pb-3">
              <h2 className="text-xl font-bold text-white">Active Recruitment Pipeline</h2>
              <p className="text-xs text-neutral-500 mt-1">Direct development, media production, and project design roles for young creators.</p>
            </div>

            {allRecruitment.map(gig => (
              <div key={gig.id} className="bg-neutral-900/30 border border-neutral-900 rounded-2xl p-6 hover:border-neutral-800 transition">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white hover:text-cyan-400 cursor-pointer transition">{gig.role}</h3>
                    <p className="text-xs text-neutral-400">Target Venture: {gig.postedBy}</p>
                  </div>
                  <span className="text-xs font-mono bg-neutral-900 border border-neutral-800 text-emerald-400 px-2 py-1 rounded">
                    {gig.compensation}
                  </span>
                </div>
                <p className="text-sm text-neutral-400 mt-3 leading-relaxed">{gig.details}</p>
                <div className="flex gap-2 mt-4">
                  {gig.tags.map((tag, i) => (
                    <span key={i} className="text-[10px] font-mono text-neutral-500 bg-neutral-950 px-2 py-1 rounded border border-neutral-900">#{tag}</span>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-neutral-900/40 flex justify-end">
                  <button className="flex items-center gap-1.5 bg-cyan-500 text-neutral-950 font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-lg hover:bg-cyan-400 transition">
                    Submit Project Request <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: DISCOVER FEED (SEARCH, MAP, NEARBY) */}
        {activeTab === 'discover' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left 2 Columns: Search + Simulated Map UI Grid Element */}
            <div className="md:col-span-2 space-y-6">
              <div className="border-b border-neutral-900 pb-3 flex items-center gap-2">
                <Map size={18} className="text-cyan-400" />
                <h2 className="text-lg font-bold text-white">Interactive Discovery</h2>
              </div>
              
              {/* Analytical Mock Map Container Visual */}
              <div className="w-full h-80 bg-neutral-900 border border-neutral-800 rounded-2xl relative overflow-hidden flex items-center justify-center group">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                {/* Simulated UI Pin overlays representing localized coordinates */}
                <div className="absolute top-1/4 left-1/3 bg-cyan-500 text-neutral-950 p-2 rounded-full font-bold shadow-lg animate-bounce text-xs flex items-center gap-1">
                  <MapPin size={12} /> <span>Hackathon</span>
                </div>
                <div className="absolute bottom-1/3 right-1/4 bg-indigo-500 text-white p-2 rounded-full font-bold shadow-lg text-xs flex items-center gap-1">
                  <MapPin size={12} /> <span>Design PopUp</span>
                </div>
                <p className="text-xs text-neutral-500 z-10 font-mono tracking-widest uppercase bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800">
                  NATIVE MAP CORE INTERFACE PLACEHOLDER
                </p>
              </div>
            </div>

            {/* Right Column: Nearby Listings */}
            <div className="space-y-4">
              <div className="border-b border-neutral-900 pb-3">
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Nearby You</h3>
              </div>
              {featuredEvents.map(e => (
                <div key={e.id} className="bg-neutral-900/30 border border-neutral-900 rounded-xl p-4 flex gap-3 items-start">
                  <div className="p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-cyan-400 shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{e.title}</h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{e.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="border-b border-neutral-900 pb-3">
              <h2 className="text-xl font-bold text-white">Broadcast Announcements</h2>
              <p className="text-xs text-neutral-500 mt-1">Official platform updates and network briefs from structural anchors.</p>
            </div>

            {announcements.map(ann => (
              <article key={ann.id} className="bg-neutral-900/30 border border-neutral-900 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center text-xs font-mono text-neutral-500">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-bold">{ann.author}</span>
                    <span className="bg-neutral-950 border border-neutral-800 px-1.5 py-0.5 rounded text-[10px] text-cyan-400">{ann.role}</span>
                  </div>
                  <div>{ann.date}</div>
                </div>
                <h3 className="text-lg font-bold text-white">{ann.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{ann.content}</p>
              </article>
            ))}
          </div>
        )}

        {/* TAB 5: PROFILE, SETTINGS & LEGAL DOCS */}
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Box: Simple Account Info */}
            <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-6 text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-tr from-cyan-500 to-indigo-500 rounded-full mx-auto flex items-center justify-center text-2xl font-black text-neutral-950">
                U
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">User Workspace</h3>
                <p className="text-xs text-neutral-500 font-mono">NS Account ID: #4092-2026</p>
              </div>
              <div className="bg-neutral-950/80 border border-neutral-900 p-3 rounded-xl text-left text-xs text-neutral-400 space-y-1">
                <div><span className="text-neutral-600">Status:</span> Basic Sandbox</div>
                <div><span className="text-neutral-600">Region:</span> Qatar Local Node</div>
              </div>
            </div>

            {/* Right 2 Columns: Settings + Legal Documents */}
            <div className="md:col-span-2 space-y-6">
              {/* Mock Configuration settings panel subset */}
              <div className="bg-neutral-900/20 border border-neutral-900 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                  <Settings size={14} /> Global App Settings
                </h3>
                <div className="space-y-3 text-xs text-neutral-400">
                  <label className="flex items-center justify-between p-3 bg-neutral-950/60 rounded-xl border border-neutral-900">
                    <span>Enable Push Notifications for nearby events</span>
                    <input type="checkbox" defaultChecked className="accent-cyan-500" />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-neutral-950/60 rounded-xl border border-neutral-900">
                    <span>Visible in Recruitment Pools for startups</span>
                    <input type="checkbox" defaultChecked className="accent-cyan-500" />
                  </label>
                </div>
              </div>

              {/* Terms of Service & Privacy Policy container segment */}
              <div className="bg-neutral-900/20 border border-neutral-900 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={14} /> Legal Foundations
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-neutral-950/60 border border-neutral-900 rounded-xl hover:border-neutral-800 transition cursor-pointer">
                    <div className="flex items-center gap-2 text-white font-bold text-xs">
                      <Shield size={12} className="text-cyan-400" /> Terms of Service (ToS)
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1 leading-normal">Operational standards, network protocols, and youth protection guidelines.</p>
                  </div>
                  <div className="p-4 bg-neutral-950/60 border border-neutral-900 rounded-xl hover:border-neutral-800 transition cursor-pointer">
                    <div className="flex items-center gap-2 text-white font-bold text-xs">
                      <Shield size={12} className="text-indigo-400" /> Privacy Policy (PP)
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1 leading-normal">Data lifecycle control, cross-platform cookie handling, and profile anonymity frameworks.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}