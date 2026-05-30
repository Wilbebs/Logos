import React, { useState } from "react";
import { 
  Search, 
  Calendar as CalendarIcon, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  MoreHorizontal, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  HelpCircle,
  FileText,
  Clock,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MOCK_DATA = [
  {
    id: "APP-001",
    name: "Sarah Jenkins",
    email: "sarah.j@example.com",
    program: "M.Div.",
    level: "Graduate",
    forms: "3/3",
    eligibility: "Eligible",
    aiRec: "Strong Yes",
    decision: "Approved",
    submitted: "2023-10-12",
  },
  {
    id: "APP-002",
    name: "Michael Chen",
    email: "m.chen88@example.com",
    program: "B.A. Theology",
    level: "Undergrad",
    forms: "2/3",
    eligibility: "Pending",
    aiRec: "Review",
    decision: "Pending",
    submitted: "2023-10-15",
  },
  {
    id: "APP-003",
    name: "David Kim",
    email: "dkim.seoul@example.com",
    program: "M.A. Counseling",
    level: "Graduate",
    forms: "3/3",
    eligibility: "Needs Review",
    aiRec: "Borderline",
    decision: "Pending",
    submitted: "2023-10-16",
  },
  {
    id: "APP-004",
    name: "Anna Smith",
    email: "asmith_99@example.com",
    program: "Certificate in Ministry",
    level: "Certificate",
    forms: "3/3",
    eligibility: "Eligible",
    aiRec: "Yes",
    decision: "Pending",
    submitted: "2023-10-18",
  },
  {
    id: "APP-005",
    name: "James Wilson",
    email: "jwilson.ministry@example.com",
    program: "M.Div.",
    level: "Graduate",
    forms: "3/3",
    eligibility: "Ineligible",
    aiRec: "No",
    decision: "Rejected",
    submitted: "2023-10-20",
  },
  {
    id: "APP-006",
    name: "Elena Rodriguez",
    email: "elena.r@example.com",
    program: "B.A. Theology",
    level: "Undergrad",
    forms: "1/3",
    eligibility: "Pending",
    aiRec: "Pending",
    decision: "Pending",
    submitted: "2023-10-21",
  },
  {
    id: "APP-007",
    name: "Marcus Johnson",
    email: "mjohnson22@example.com",
    program: "M.A. Biblical Studies",
    level: "Graduate",
    forms: "3/3",
    eligibility: "Eligible",
    aiRec: "Strong Yes",
    decision: "Approved",
    submitted: "2023-10-22",
  },
  {
    id: "APP-008",
    name: "Chloe Bennett",
    email: "chloe.b@example.com",
    program: "B.A. Theology",
    level: "Undergrad",
    forms: "3/3",
    eligibility: "Needs Review",
    aiRec: "Review",
    decision: "Pending",
    submitted: "2023-10-23",
  },
];

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2);
};

const getEligibilityBadge = (status: string) => {
  switch (status) {
    case 'Eligible':
      return <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700 border border-emerald-200 font-medium"><CheckCircle2 className="w-3 h-3 mr-1" /> Eligible</Badge>;
    case 'Ineligible':
      return <Badge variant="secondary" className="bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700 border border-red-200 font-medium"><XCircle className="w-3 h-3 mr-1" /> Ineligible</Badge>;
    case 'Needs Review':
      return <Badge variant="secondary" className="bg-amber-50 text-amber-700 hover:bg-amber-50 hover:text-amber-700 border border-amber-200 font-medium"><AlertCircle className="w-3 h-3 mr-1" /> Needs Review</Badge>;
    default:
      return <Badge variant="outline" className="text-gray-500 font-medium"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
  }
};

const getDecisionBadge = (status: string) => {
  switch (status) {
    case 'Approved':
      return <Badge className="bg-zinc-900 text-white hover:bg-zinc-800 font-medium shadow-sm">Approved</Badge>;
    case 'Rejected':
      return <Badge variant="secondary" className="bg-zinc-100 text-zinc-600 hover:bg-zinc-200 font-medium">Rejected</Badge>;
    default:
      return <Badge variant="outline" className="text-zinc-600 font-medium border-zinc-200 border-dashed">Pending Decision</Badge>;
  }
};

const getAIRecColor = (rec: string) => {
  if (rec.includes('Yes')) return 'text-emerald-600 font-medium flex items-center gap-1.5';
  if (rec === 'Review' || rec === 'Borderline') return 'text-amber-600 font-medium flex items-center gap-1.5';
  if (rec === 'No') return 'text-red-600 font-medium flex items-center gap-1.5';
  return 'text-gray-400 font-medium flex items-center gap-1.5';
};

export function CleanSaaS() {
  const [activeTab, setActiveTab] = useState("All");
  
  const tabs = [
    { name: "All", count: 852 },
    { name: "Needs Review", count: 13 },
    { name: "Forms Complete", count: 142 },
    { name: "Pending Decision", count: 48 },
    { name: "Approved", count: 64 },
    { name: "Rejected", count: 12 },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-zinc-900 flex flex-col items-center">
      {/* Navbar */}
      <nav className="w-full h-14 bg-white border-b border-zinc-200 px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-8">
          <div className="font-bold text-lg tracking-tight flex items-center gap-2">
            <div className="w-6 h-6 bg-zinc-900 rounded-md flex items-center justify-center">
              <span className="text-white text-xs">L</span>
            </div>
            LOGOS
          </div>
          <div className="hidden md:flex gap-1">
            <Button variant="ghost" className="text-sm font-medium h-8 px-3 bg-zinc-100 text-zinc-900">Dashboard</Button>
            <Button variant="ghost" className="text-sm font-medium h-8 px-3 text-zinc-500 hover:text-zinc-900">Applicants</Button>
            <Button variant="ghost" className="text-sm font-medium h-8 px-3 text-zinc-500 hover:text-zinc-900">Reports</Button>
            <Button variant="ghost" className="text-sm font-medium h-8 px-3 text-zinc-500 hover:text-zinc-900">Settings</Button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" className="h-8 hidden sm:flex text-zinc-600 border-zinc-200">
            <HelpCircle className="w-4 h-4 mr-2" />
            Support
          </Button>
          <Avatar className="w-8 h-8 border border-zinc-200 cursor-pointer">
            <AvatarImage src="https://i.pravatar.cc/150?u=admin" />
            <AvatarFallback className="bg-zinc-100 text-zinc-600 text-xs">AD</AvatarFallback>
          </Avatar>
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full max-w-[1200px] px-6 py-8 flex flex-col gap-8 flex-1">
        
        {/* Header Section */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Admissions Overview</h1>
              <p className="text-zinc-500 text-sm mt-1">Manage and review university applications for Fall 2024.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="border-zinc-200 text-zinc-700 bg-white shadow-sm hover:bg-zinc-50">Export Data</Button>
              <Button className="bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm">New Application</Button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { label: "Total Applicants", value: "852", trend: "+12%", up: true },
              { label: "Forms Complete", value: "142", trend: "+4%", up: true },
              { label: "Needs Review", value: "13", trend: "-2%", up: false },
              { label: "Approved", value: "64", trend: "+18%", up: true },
              { label: "Rejected", value: "12", trend: "0%", up: null },
            ].map((stat, i) => (
              <div key={i} className="bg-white border border-zinc-200 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-500">{stat.label}</span>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-semibold text-zinc-900">{stat.value}</span>
                  {stat.trend && (
                    <span className={`text-xs font-medium flex items-center ${stat.up === true ? 'text-emerald-600' : stat.up === false ? 'text-amber-600' : 'text-zinc-400'}`}>
                      {stat.up === true ? <TrendingUp className="w-3 h-3 mr-1" /> : stat.up === false ? <TrendingDown className="w-3 h-3 mr-1" /> : null}
                      {stat.trend}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Table Section */}
        <div className="flex flex-col gap-4">
          
          {/* Status Tabs */}
          <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  activeTab === tab.name 
                    ? "bg-zinc-900 text-white border-zinc-900 shadow-sm" 
                    : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                {tab.name}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.name ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Filters Toolbar */}
          <div className="bg-white border border-zinc-200 rounded-xl p-2 flex flex-col sm:flex-row gap-3 justify-between items-center shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="relative w-full sm:w-[320px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input 
                placeholder="Search applicants by name, email..." 
                className="pl-9 h-9 border-0 bg-zinc-50 focus-visible:ring-1 focus-visible:ring-zinc-300 shadow-none text-sm w-full"
              />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto px-2 sm:px-0">
              <div className="flex items-center gap-2 border-r border-zinc-200 pr-3">
                <Checkbox id="forms-only" className="border-zinc-300 text-zinc-900 data-[state=checked]:bg-zinc-900 data-[state=checked]:border-zinc-900" />
                <label htmlFor="forms-only" className="text-sm font-medium leading-none text-zinc-600 cursor-pointer">
                  Forms complete only
                </label>
              </div>
              <Button variant="ghost" size="sm" className="h-8 text-zinc-600 hover:text-zinc-900">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Date Range
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-zinc-600 hover:text-zinc-900">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white border border-zinc-200 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-50/50">
                <TableRow className="hover:bg-transparent border-zinc-200">
                  <TableHead className="w-[280px] font-medium text-zinc-500 h-11">Applicant</TableHead>
                  <TableHead className="font-medium text-zinc-500 h-11">Program & Level</TableHead>
                  <TableHead className="font-medium text-zinc-500 h-11">Forms</TableHead>
                  <TableHead className="font-medium text-zinc-500 h-11">Eligibility</TableHead>
                  <TableHead className="font-medium text-zinc-500 h-11">AI Rec</TableHead>
                  <TableHead className="font-medium text-zinc-500 h-11">Decision</TableHead>
                  <TableHead className="font-medium text-zinc-500 h-11 text-right">Submitted</TableHead>
                  <TableHead className="w-[50px] h-11"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_DATA.map((row) => (
                  <TableRow key={row.id} className="hover:bg-zinc-50/80 cursor-pointer border-zinc-100 transition-colors group">
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-zinc-200">
                          <AvatarFallback className="bg-zinc-100 text-zinc-700 text-xs font-medium">
                            {getInitials(row.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-zinc-900">{row.name}</span>
                          <span className="text-xs text-zinc-500">{row.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col">
                        <span className="text-zinc-900">{row.program}</span>
                        <span className="text-xs text-zinc-500">{row.level}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1.5 text-zinc-600">
                        <FileText className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-sm font-medium">{row.forms}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      {getEligibilityBadge(row.eligibility)}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className={getAIRecColor(row.aiRec)}>
                        <Sparkles className="w-3.5 h-3.5" />
                        {row.aiRec}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      {getDecisionBadge(row.decision)}
                    </TableCell>
                    <TableCell className="py-3 text-right text-zinc-500">
                      {row.submitted}
                    </TableCell>
                    <TableCell className="py-3">
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-900 transition-opacity">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>

      {/* Floating AI Button */}
      <Button 
        className="fixed bottom-6 right-6 h-12 rounded-full pl-4 pr-5 shadow-lg bg-zinc-900 hover:bg-zinc-800 text-white flex items-center gap-2 border border-zinc-800 transition-transform hover:scale-105 active:scale-95"
      >
        <Sparkles className="w-4 h-4 text-zinc-300" />
        <span className="font-medium tracking-wide">Ask AI</span>
      </Button>

    </div>
  );
}
