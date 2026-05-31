import React, { useState } from "react";
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  Settings, 
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  MoreHorizontal,
  Sparkles,
  Bot
} from "lucide-react";

const applicants = [
  {
    id: "APP-001",
    name: "Sarah Jenkins",
    email: "s.jenkins@example.com",
    program: "MDiv",
    level: "Graduate",
    forms: "3/3",
    eligibility: "Eligible",
    aiRec: "Strong",
    decision: "Approved",
    submitted: "2023-10-15",
  },
  {
    id: "APP-002",
    name: "Marcus Cole",
    email: "m.cole@example.com",
    program: "BTh",
    level: "Undergrad",
    forms: "2/3",
    eligibility: "Needs Review",
    aiRec: "Moderate",
    decision: "Pending",
    submitted: "2023-10-16",
  },
  {
    id: "APP-003",
    name: "Chloe Smith",
    email: "c.smith@example.com",
    program: "MA Counseling",
    level: "Graduate",
    forms: "3/3",
    eligibility: "Eligible",
    aiRec: "Strong",
    decision: "Pending",
    submitted: "2023-10-16",
  },
  {
    id: "APP-004",
    name: "David Kim",
    email: "dkim99@example.com",
    program: "BA Ministry",
    level: "Undergrad",
    forms: "1/3",
    eligibility: "Pending",
    aiRec: "N/A",
    decision: "Pending",
    submitted: "2023-10-17",
  },
  {
    id: "APP-005",
    name: "Rachel Green",
    email: "rachel.g@example.com",
    program: "MDiv",
    level: "Graduate",
    forms: "3/3",
    eligibility: "Eligible",
    aiRec: "Strong",
    decision: "Approved",
    submitted: "2023-10-18",
  },
  {
    id: "APP-006",
    name: "James Wilson",
    email: "jwilson@example.com",
    program: "BTh",
    level: "Undergrad",
    forms: "3/3",
    eligibility: "Ineligible",
    aiRec: "Weak",
    decision: "Rejected",
    submitted: "2023-10-18",
  },
  {
    id: "APP-007",
    name: "Esther Rodriguez",
    email: "esther.r@example.com",
    program: "MA Counseling",
    level: "Graduate",
    forms: "3/3",
    eligibility: "Needs Review",
    aiRec: "Moderate",
    decision: "Pending",
    submitted: "2023-10-19",
  },
  {
    id: "APP-008",
    name: "Thomas Anderson",
    email: "neo@example.com",
    program: "MDiv",
    level: "Graduate",
    forms: "2/3",
    eligibility: "Pending",
    aiRec: "N/A",
    decision: "Pending",
    submitted: "2023-10-19",
  },
];

const StatusDot = ({ color }: { color: string }) => (
  <span className={`w-2 h-2 rounded-full ${color} inline-block mr-2`} />
);

const EligibilityBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    "Eligible": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "Ineligible": "bg-red-500/10 text-red-400 border-red-500/20",
    "Needs Review": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "Pending": "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };
  const dots: Record<string, string> = {
    "Eligible": "bg-emerald-500",
    "Ineligible": "bg-red-500",
    "Needs Review": "bg-amber-500",
    "Pending": "bg-slate-500",
  };
  
  return (
    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      <StatusDot color={dots[status]} />
      {status}
    </div>
  );
};

const DecisionBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    "Approved": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "Rejected": "bg-red-500/10 text-red-400 border-red-500/20",
    "Pending": "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };
  const dots: Record<string, string> = {
    "Approved": "bg-emerald-500",
    "Rejected": "bg-red-500",
    "Pending": "bg-slate-500",
  };

  return (
    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      <StatusDot color={dots[status]} />
      {status}
    </div>
  );
};

export function CommandCenter() {
  const [activeTab, setActiveTab] = useState("All");

  return (
    <div className="flex h-screen w-full bg-[#0a0a0c] text-slate-300 font-sans overflow-hidden selection:bg-indigo-500/30">
      
      {/* Sidebar */}
      <aside className="w-64 bg-[#111218] border-r border-slate-800/60 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)]">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-slate-100 font-semibold text-lg tracking-tight">Logos Ops</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-4">
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 font-medium border border-indigo-500/20 transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors">
            <Users className="w-5 h-5" />
            Applicants
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors">
            <BarChart3 className="w-5 h-5" />
            Reports
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors">
            <Settings className="w-5 h-5" />
            Settings
          </a>
        </nav>
        
        <div className="p-4 mt-auto">
          <div className="bg-[#1a1c23] rounded-xl p-4 border border-slate-800/60">
            <div className="flex items-center gap-3">
              <img src="https://ui-avatars.com/api/?name=Admin+User&background=6366f1&color=fff" alt="Admin" className="w-10 h-10 rounded-full border border-slate-700" />
              <div>
                <p className="text-sm font-medium text-slate-200">Admin User</p>
                <p className="text-xs text-slate-500">Admissions Director</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-slate-800/60 bg-[#111218]/50 backdrop-blur-sm shrink-0">
          <h1 className="text-xl font-semibold text-slate-100">Admissions Command Center</h1>
          <div className="flex items-center gap-4">
            <button className="text-slate-400 hover:text-slate-200 transition-colors">
              <Clock className="w-5 h-5" />
            </button>
            <button className="text-slate-400 hover:text-slate-200 transition-colors">
              <AlertCircle className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          
          {/* Stats Row */}
          <div className="grid grid-cols-5 gap-4 mb-8">
            {[
              { label: "Total Applicants", value: "2,451", color: "text-blue-400" },
              { label: "Forms Complete", value: "1,832", color: "text-emerald-400" },
              { label: "Needs Review", value: "124", color: "text-amber-400" },
              { label: "Approved", value: "842", color: "text-indigo-400" },
              { label: "Rejected", value: "145", color: "text-rose-400" },
            ].map((stat, i) => (
              <div key={i} className="bg-[#111218] rounded-xl p-5 border border-slate-800/60 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-colors">
                <div className={`absolute top-0 left-0 w-1 h-full ${stat.color.replace('text-', 'bg-')} opacity-20 group-hover:opacity-100 transition-opacity`} />
                <p className="text-sm font-medium text-slate-400 mb-2">{stat.label}</p>
                <p className={`text-3xl font-bold tracking-tight ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Toolbar & Filters */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {["All", "Needs Review", "Forms Complete", "Pending Decision", "Approved", "Rejected"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeTab === tab 
                      ? "bg-slate-800 text-slate-100 border border-slate-700 shadow-sm" 
                      : "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search applicants..." 
                  className="bg-[#111218] border border-slate-800/80 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 w-64 transition-all"
                />
              </div>
              
              <button className="flex items-center gap-2 bg-[#111218] border border-slate-800/80 rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors">
                <Calendar className="w-4 h-4 text-slate-500" />
                Date Range
              </button>
              
              <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer ml-2">
                <input type="checkbox" className="rounded bg-[#111218] border-slate-700 text-indigo-500 focus:ring-indigo-500/50 w-4 h-4 accent-indigo-500" />
                Forms complete only
              </label>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-[#111218] border border-slate-800/60 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/60 bg-[#161821]">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Applicant</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Program</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Forms</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Eligibility</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Rec</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Decision</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {applicants.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-800/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(app.name)}&background=1e293b&color=cbd5e1`} 
                            alt={app.name} 
                            className="w-9 h-9 rounded-full border border-slate-700/50" 
                          />
                          <div>
                            <div className="text-sm font-medium text-slate-200 group-hover:text-indigo-400 transition-colors cursor-pointer">{app.name}</div>
                            <div className="text-xs text-slate-500">{app.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-300">{app.program}</div>
                        <div className="text-xs text-slate-500">{app.level}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-mono text-slate-400 bg-slate-800/50 px-2 py-1 rounded-md border border-slate-700/50">{app.forms}</div>
                          {app.forms === "3/3" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <EligibilityBadge status={app.eligibility} />
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                          app.aiRec === "Strong" ? "text-emerald-400 bg-emerald-500/10" :
                          app.aiRec === "Moderate" ? "text-amber-400 bg-amber-500/10" :
                          app.aiRec === "Weak" ? "text-red-400 bg-red-500/10" :
                          "text-slate-500 bg-slate-800"
                        }`}>
                          {app.aiRec}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <DecisionBadge status={app.decision} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-xs font-mono text-slate-500">{app.submitted}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Floating AI Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button className="group flex items-center gap-3 bg-[#1e293b] hover:bg-[#27354f] border border-slate-700/80 shadow-[0_0_20px_rgba(0,0,0,0.5)] rounded-full pl-3 pr-5 py-3 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_rgba(99,102,241,0.2)]">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center shadow-inner">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm font-medium text-slate-200">Ask AI Assistant</span>
        </button>
      </div>
      
    </div>
  );
}
