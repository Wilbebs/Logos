import React, { useState } from 'react';
import logoUrl from '../../../../public/logos-logo.png';
import { 
  Search, 
  Calendar, 
  Filter, 
  MoreVertical, 
  Sparkles, 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings,
  TrendingUp,
  TrendingDown,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// Brand colors
const colors = {
  primary: '#7B2335',
  secondary: '#1B3272',
  surface: '#F8F8FB',
  sidebar: '#F3F4F8',
  text: '#1B2340',
  hover: '#FDF5F5',
};

const STATS = [
  { label: 'Total Applicants', value: '1,248', trend: '+12%', isUp: true, color: colors.primary },
  { label: 'In Review', value: '342', trend: '+5%', isUp: true, color: colors.secondary },
  { label: 'Forms Complete', value: '89', trend: '-2%', isUp: false, color: colors.primary },
  { label: 'Approved', value: '415', trend: '+18%', isUp: true, color: colors.secondary },
  { label: 'Enrolled', value: '210', trend: '+8%', isUp: true, color: colors.primary },
];

const FILTERS = [
  { label: 'All', count: 1248 },
  { label: 'Needs Review', count: 342 },
  { label: 'Forms Complete', count: 89 },
  { label: 'Pending Decision', count: 156 },
  { label: 'Approved', count: 415 },
  { label: 'Rejected', count: 42 },
];

const APPLICANTS = [
  { id: '1', name: 'Sarah Jenkins', email: 's.jenkins@example.com', program: 'MDiv', date: 'Oct 24, 2023', status: 'Needs Review', forms: '3/3' },
  { id: '2', name: 'Michael Chen', email: 'm.chen@example.com', program: 'BA Theology', date: 'Oct 23, 2023', status: 'Eligible', forms: '3/3' },
  { id: '3', name: 'David Rodriguez', email: 'd.rodriguez@example.com', program: 'MA Counseling', date: 'Oct 23, 2023', status: 'Pending', forms: '1/3' },
  { id: '4', name: 'Emily Thompson', email: 'e.thompson@example.com', program: 'MDiv', date: 'Oct 22, 2023', status: 'Approved', forms: '3/3' },
  { id: '5', name: 'James Wilson', email: 'j.wilson@example.com', program: 'BA Theology', date: 'Oct 22, 2023', status: 'Ineligible', forms: '2/3' },
  { id: '6', name: 'Anna Peterson', email: 'a.peterson@example.com', program: 'MA Counseling', date: 'Oct 21, 2023', status: 'Rejected', forms: '3/3' },
  { id: '7', name: 'Robert Taylor', email: 'r.taylor@example.com', program: 'MDiv', date: 'Oct 21, 2023', status: 'Eligible', forms: '3/3' },
  { id: '8', name: 'Lisa Anderson', email: 'l.anderson@example.com', program: 'BA Theology', date: 'Oct 20, 2023', status: 'Needs Review', forms: '3/3' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Eligible': return { bg: '#D1FAE5', text: '#065F46', border: '#34D399' };
    case 'Needs Review': return { bg: '#FEF3C7', text: '#92400E', border: '#FBBF24' };
    case 'Ineligible': return { bg: '#FEE2E2', text: '#B91C1C', border: '#F87171' };
    case 'Pending': return { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' };
    case 'Approved': return { bg: colors.secondary, text: '#FFFFFF', border: colors.secondary };
    case 'Rejected': return { bg: colors.primary, text: '#FFFFFF', border: colors.primary };
    default: return { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' };
  }
};

export function LogosBrand() {
  const [activeFilter, setActiveFilter] = useState('All');

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ backgroundColor: colors.surface, color: colors.text, fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Sidebar */}
      <div className="w-[240px] flex-shrink-0 flex flex-col border-r border-gray-200" style={{ backgroundColor: colors.sidebar }}>
        <div className="px-5 h-20 flex items-center">
          <img src={logoUrl} alt="LOGOS University College" className="h-11 object-contain" />
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {[
            { icon: LayoutDashboard, label: 'Dashboard', active: true },
            { icon: Users, label: 'Applicants', active: false },
            { icon: FileText, label: 'Reports', active: false },
            { icon: Settings, label: 'Settings', active: false },
          ].map((item, i) => (
            <button
              key={i}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                item.active 
                  ? 'rounded-r-full shadow-sm -ml-4 pl-8' 
                  : 'rounded-md hover:bg-gray-200/50 text-gray-600'
              }`}
              style={{
                backgroundColor: item.active ? colors.primary : 'transparent',
                color: item.active ? '#FFFFFF' : undefined,
              }}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-200/50 cursor-pointer transition-colors">
            <Avatar className="h-9 w-9 border" style={{ borderColor: colors.primary }}>
              <AvatarFallback style={{ backgroundColor: colors.primary, color: '#fff' }}>AD</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: colors.text }}>Admin User</p>
              <p className="text-xs text-gray-500 truncate">admin@logos.edu</p>
            </div>
            <LogOut size={16} className="text-gray-400" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-20 px-8 flex items-center justify-between border-b border-gray-200 bg-white flex-shrink-0">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: colors.secondary }}>Admissions Overview</h1>
            <p className="text-sm text-gray-500 mt-1">Fall 2024 Semester • Last updated 5 mins ago</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" className="gap-2 border-gray-300 text-gray-700 bg-white hover:bg-gray-50">
              <Calendar size={16} />
              Fall 2024
            </Button>
            <Button style={{ backgroundColor: colors.primary, color: '#fff' }} className="gap-2 hover:opacity-90 transition-opacity">
              <Users size={16} />
              New Applicant
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8">
          
          {/* Stats Row */}
          <div className="grid grid-cols-5 gap-4 mb-8">
            {STATS.map((stat, i) => (
              <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                <div className="mt-4 flex items-end justify-between">
                  <span className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</span>
                  <div className={`flex items-center text-xs font-medium ${stat.isUp ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.isUp ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
                    {stat.trend}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {FILTERS.map((filter) => {
              const isActive = activeFilter === filter.label;
              return (
                <button
                  key={filter.label}
                  onClick={() => setActiveFilter(filter.label)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border ${
                    isActive 
                      ? 'shadow-sm' 
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50 bg-white'
                  }`}
                  style={{
                    backgroundColor: isActive ? colors.primary : undefined,
                    color: isActive ? '#FFFFFF' : undefined,
                    borderColor: isActive ? colors.primary : undefined,
                  }}
                >
                  {filter.label}
                  <span 
                    className={`px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Table Area */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input 
                  placeholder="Search applicants..." 
                  className="pl-10 bg-white border-gray-300 focus-visible:ring-1"
                  style={{ '--tw-ring-color': colors.primary } as any}
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-[#7B2335] focus:ring-[#7B2335]" />
                  Forms complete only
                </label>
                <div className="h-4 w-px bg-gray-300" />
                <Button variant="outline" size="sm" className="gap-2 border-gray-300 bg-white text-gray-700">
                  <Filter size={16} />
                  Filter
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-medium tracking-wider">Applicant</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Program</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Date Applied</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Forms</th>
                    <th className="px-6 py-4 font-medium tracking-wider">Status</th>
                    <th className="px-6 py-4 font-medium tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {APPLICANTS.map((app) => {
                    const statusStyle = getStatusColor(app.status);
                    
                    return (
                      <tr 
                        key={app.id} 
                        className="hover:bg-gray-50 transition-colors group cursor-pointer"
                        style={{ '--tw-bg-opacity': '1' } as any}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.hover}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback style={{ backgroundColor: colors.primary, color: '#fff' }}>
                                {app.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium" style={{ color: colors.text }}>{app.name}</div>
                              <div className="text-xs text-gray-500">{app.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{app.program}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{app.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          <div className="flex items-center gap-2">
                            {app.forms}
                            {app.forms === '3/3' && <div className="w-2 h-2 rounded-full bg-green-500" />}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span 
                            className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border"
                            style={{ 
                              backgroundColor: statusStyle.bg, 
                              color: statusStyle.text,
                              borderColor: statusStyle.border 
                            }}
                          >
                            {app.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-400 group-hover:text-gray-600">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-200">
                            <MoreVertical size={16} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50/50 text-sm text-gray-500 flex justify-between items-center">
              <span>Showing 1 to 8 of 1,248 entries</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled>Previous</Button>
                <Button variant="outline" size="sm">Next</Button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Floating AI Button */}
      <button 
        className="fixed bottom-8 right-8 flex items-center gap-2 px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 font-medium z-50"
        style={{ backgroundColor: colors.primary, color: '#fff' }}
      >
        <Sparkles size={18} className="animate-pulse" />
        Ask AI
      </button>

    </div>
  );
}
