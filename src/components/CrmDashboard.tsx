'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  Store, 
  Calendar, 
  BarChart3, 
  Settings, 
  Phone, 
  Search, 
  MapPin, 
  Plus, 
  ExternalLink, 
  Clock, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Download, 
  Layers, 
  SlidersHorizontal, 
  Menu,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  PhoneCall,
  PhoneOff,
  Gem,
  Check,
  PhoneForwarded,
  Ban,
  Target,
  Sparkles,
  Flame,
  RotateCcw,
  Undo2,
  Handshake,
  Crown,
  UserCheck
} from 'lucide-react';
import { 
  addCallLog, 
  updateLeadStatus, 
  createNewLead, 
  quickLogOutcome,
  updateDocumentationField
} from '../app/actions';

type Note = {
  id: string;
  text: string;
  outcome: string | null;
  callAnswer?: string | null;
  interest?: string | null;
  worthInvesting?: string | null;
  callAgain?: string | null;
  contactPerson?: string | null;
  temperature?: string | null;
  nextAction?: string | null;
  scheduledTime?: string | null;
  createdAt: Date;
};

type Lead = {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  area: string | null;
  contactPerson?: string | null;
  status: string;
  lastCallOutcome: string | null;
  callAnswer?: string | null;
  interest?: string | null;
  worthInvesting?: string | null;
  callAgain?: string | null;
  dealStatus?: string | null;
  temperature?: string | null;
  followUpDate: Date | null;
  scheduledTime?: string | null;
  notes: Note[];
};

const STATUS_CONFIG: Record<string, { badge: string; dot: string }> = {
  'חדש': { 
    badge: 'bg-blue-50 text-blue-700 border-blue-200', 
    dot: 'bg-blue-500'
  },
  'בטיפול': { 
    badge: 'bg-amber-50 text-amber-800 border-amber-200', 
    dot: 'bg-amber-500'
  },
  'סגור': { 
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', 
    dot: 'bg-emerald-500'
  },
  'לא רלוונטי': { 
    badge: 'bg-rose-50 text-rose-700 border-rose-200', 
    dot: 'bg-rose-400'
  },
};

const OUTCOMES = [
  'ענה',
  'לא ענה',
  'מעוניין',
  'לא מעוניין',
  'שווה להשקיע',
  'להתקשר',
  'לא להתקשר',
  'לא שווה להשקיע',
  'ביקש הצעת מחיר',
  'תואמה שיחה',
  'הושארה הודעה',
  'מספר שגוי / מנותק'
];

const STATUSES = ['חדש', 'בטיפול', 'סגור', 'לא רלוונטי'];

// Clean phone for dialer
function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[^0-9+]/g, '');
}

export default function CrmDashboard({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  
  // Navigation Module
  const [activeModule, setActiveModule] = useState<'leads' | 'priority' | 'closedDeals' | 'calendar' | 'analytics' | 'settings'>('leads');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active Lead for Detailed Note Modal
  const [activeLeadForNote, setActiveLeadForNote] = useState<Lead | null>(null);
  const [justUpdatedId, setJustUpdatedId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const [prioritySearch, setPrioritySearch] = useState('');
  const [priorityStatusFilter, setPriorityStatusFilter] = useState('');

  // Detailed Modal Form State
  const [noteText, setNoteText] = useState('');
  const [noteOutcome, setNoteOutcome] = useState('');
  const [noteContact, setNoteContact] = useState('');
  const [noteTemp, setNoteTemp] = useState('');
  const [noteFollowUpDate, setNoteFollowUpDate] = useState('');
  const [noteScheduledTime, setNoteScheduledTime] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Settings
  const [agentName, setAgentName] = useState('מוקדן מכירות');
  const [companyName, setCompanyName] = useState('שיווק חנויות אופניים');

  // Add New Lead Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newContact, setNewContact] = useState('');
  const [isCreating, setIsCreating] = useState(false);



  // Load custom settings
  useEffect(() => {
    const savedName = localStorage.getItem('bike_crm_agent_name');
    if (savedName) setAgentName(savedName);
    const savedCompany = localStorage.getItem('bike_crm_company_name');
    if (savedCompany) setCompanyName(savedCompany);
  }, []);

  const saveSettings = (name: string, company: string) => {
    setAgentName(name);
    setCompanyName(company);
    localStorage.setItem('bike_crm_agent_name', name);
    localStorage.setItem('bike_crm_company_name', company);
  };

  // Sync active modal lead
  useEffect(() => {
    if (activeLeadForNote) {
      setNoteContact(activeLeadForNote.contactPerson || '');
      setNoteTemp(activeLeadForNote.temperature || '');
      setNoteOutcome(activeLeadForNote.lastCallOutcome || '');
      setNoteText('');
      setNoteFollowUpDate('');
      setNoteScheduledTime('');
    }
  }, [activeLeadForNote]);

  // Unique areas
  const allAreas = useMemo(() => {
    const areas = new Set<string>();
    leads.forEach(l => {
      if (l.area && l.area.trim()) areas.add(l.area.trim());
    });
    return Array.from(areas).sort();
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || 
        l.name.toLowerCase().includes(q) || 
        (l.area && l.area.toLowerCase().includes(q)) || 
        (l.address && l.address.toLowerCase().includes(q)) || 
        (l.contactPerson && l.contactPerson.toLowerCase().includes(q)) ||
        l.phone.includes(q);

      let matchesStatus = true;
      if (statusFilter === 'שווה_להשקיע') {
        matchesStatus = l.worthInvesting === 'שווה להשקיע' || l.temperature === 'urgent';
      } else if (statusFilter) {
        matchesStatus = l.status === statusFilter;
      }
      const matchesArea = areaFilter ? l.area === areaFilter : true;
      
      let matchesFollowUp = true;
      if (followUpOnly) {
        if (!l.followUpDate) {
          matchesFollowUp = false;
        } else {
          const today = new Date();
          const followUp = new Date(l.followUpDate);
          matchesFollowUp = followUp.toDateString() === today.toDateString() || followUp < today;
        }
      }

      return matchesSearch && matchesStatus && matchesArea && matchesFollowUp;
    });
  }, [leads, search, statusFilter, areaFilter, followUpOnly]);

  // Scheduled Leads for Calendar
  const scheduledLeads = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const withDate = leads
      .filter(l => l.followUpDate)
      .map(l => {
        const d = new Date(l.followUpDate!);
        d.setHours(0, 0, 0, 0);
        return {
          ...l,
          dateObj: d,
          isToday: d.getTime() === today.getTime(),
          isOverdue: d.getTime() < today.getTime(),
          isUpcoming: d.getTime() > today.getTime(),
        };
      })
      .sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime());

    return {
      today: withDate.filter(l => l.isToday),
      overdue: withDate.filter(l => l.isOverdue),
      upcoming: withDate.filter(l => l.isUpcoming),
      all: withDate
    };
  }, [leads]);

  // High-Potential Priority Leads ("לקוחות שצריך לשבת עליהם")
  const priorityLeads = useMemo(() => {
    return leads.filter(l => l.worthInvesting === 'שווה להשקיע' || l.temperature === 'urgent');
  }, [leads]);

  // Closed Deals / Already Clients ("כבר דיברנו / כבר לקוח")
  const closedDealLeads = useMemo(() => {
    return leads.filter(l => l.dealStatus === 'כבר דיברנו' || l.dealStatus === 'כבר לקוח');
  }, [leads]);

  // Filtered Priority Leads within Priority Module
  const filteredPriorityLeads = useMemo(() => {
    return priorityLeads.filter(l => {
      const q = prioritySearch.trim().toLowerCase();
      const matchesSearch = !q || 
        l.name.toLowerCase().includes(q) || 
        (l.area && l.area.toLowerCase().includes(q)) || 
        (l.address && l.address.toLowerCase().includes(q)) || 
        (l.contactPerson && l.contactPerson.toLowerCase().includes(q)) ||
        l.phone.includes(q);

      const matchesStatus = priorityStatusFilter ? l.status === priorityStatusFilter : true;
      return matchesSearch && matchesStatus;
    });
  }, [priorityLeads, prioritySearch, priorityStatusFilter]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = leads.length;
    const byStatus = {
      'חדש': leads.filter(l => l.status === 'חדש').length,
      'בטיפול': leads.filter(l => l.status === 'בטיפול').length,
      'סגור': leads.filter(l => l.status === 'סגור').length,
      'לא רלוונטי': leads.filter(l => l.status === 'לא רלוונטי').length,
    };
    const today = new Date();
    const todayFollowUps = leads.filter(l => {
      if (!l.followUpDate) return false;
      const d = new Date(l.followUpDate);
      return d.toDateString() === today.toDateString() || d < today;
    }).length;

    const totalNotes = leads.reduce((acc, l) => acc + l.notes.length, 0);
    const closedCount = byStatus['סגור'];
    const conversionRate = total > 0 ? Math.round((closedCount / total) * 100) : 0;

    return { total, byStatus, todayFollowUps, totalNotes, conversionRate };
  }, [leads]);

  // Quick Action Handlers
  const handleCall = (phone: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const cleaned = cleanPhoneNumber(phone);
    window.location.href = `tel:${cleaned}`;
  };

  const getGoogleSearchUrl = (lead: Lead) => {
    const query = `${lead.name} אופניים ${lead.area || lead.address || ''}`.trim();
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    const res = await updateLeadStatus(leadId, newStatus);
    if (res.success) {
      updateLeadInState(leadId, { status: newStatus });
      flashRow(leadId);
    }
  };

  // Instant 1-Click Inline Outcome Logging!
  const handleQuickLog = async (leadId: string, outcome: string, temperature?: string) => {
    const res = await quickLogOutcome(leadId, outcome, temperature);
    if (res.success && res.lead && res.note) {
      const updatedNote: Note = { 
        ...res.note, 
        createdAt: new Date(res.note.createdAt) 
      };
      const existing = leads.find(l => l.id === leadId);
      const updatedNotes = existing ? [updatedNote, ...existing.notes] : [updatedNote];

      updateLeadInState(leadId, {
        status: res.lead.status,
        lastCallOutcome: res.lead.lastCallOutcome,
        temperature: res.lead.temperature,
        notes: updatedNotes
      });
      flashRow(leadId);
    }
  };

  // 1-Click Toggle for Individual Documentation Columns (Separated storage!)
  const handleToggleDocField = async (
    leadId: string, 
    field: 'callAnswer' | 'interest' | 'worthInvesting' | 'callAgain' | 'dealStatus', 
    val: string
  ) => {
    const existing = leads.find(l => l.id === leadId);
    const currentVal = existing ? existing[field] : null;
    const newVal = currentVal === val ? null : val;

    // Optimistic UI update
    updateLeadInState(leadId, { 
      [field]: newVal,
      lastCallOutcome: newVal || existing?.lastCallOutcome
    });
    flashRow(leadId);

    try {
      const res = await updateDocumentationField(leadId, field, newVal);
      if (res.success && res.lead && res.note) {
        const updatedNote: Note = { 
          ...res.note, 
          createdAt: new Date(res.note.createdAt) 
        };
        const currentNotes = existing ? [updatedNote, ...existing.notes] : [updatedNote];

        updateLeadInState(leadId, {
          ...res.lead,
          notes: currentNotes
        });
      }
    } catch (err) {
      console.error('Error updating documentation field:', err);
    }
  };

  const flashRow = (leadId: string) => {
    setJustUpdatedId(leadId);
    setTimeout(() => {
      setJustUpdatedId((prev) => (prev === leadId ? null : prev));
    }, 1500);
  };

  // Submit Detailed Note Modal
  const handleSubmitDetailedNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLeadForNote || !noteText.trim() || isSubmittingNote) return;

    setIsSubmittingNote(true);

    let autoStatus = activeLeadForNote.status;
    if (activeLeadForNote.status === 'חדש' && noteOutcome) {
      autoStatus = 'בטיפול';
    }
    if (noteOutcome === 'סגור' || noteOutcome === 'נסגרה עסקה בהצלחה') {
      autoStatus = 'סגור';
    }

    const followUp = noteFollowUpDate ? new Date(noteFollowUpDate) : null;

    try {
      const res = await addCallLog({
        leadId: activeLeadForNote.id,
        text: noteText.trim(),
        outcome: noteOutcome || undefined,
        contactPerson: noteContact.trim() || undefined,
        temperature: noteTemp || undefined,
        newStatus: autoStatus,
        followUpDate: followUp,
        scheduledTime: noteScheduledTime || undefined
      });

      if (res.success && res.note) {
        const updatedNote: Note = { 
          ...res.note, 
          createdAt: new Date(res.note.createdAt) 
        };

        const updatedData: Partial<Lead> = {
          status: autoStatus,
          lastCallOutcome: noteOutcome || activeLeadForNote.lastCallOutcome,
          contactPerson: noteContact.trim() || activeLeadForNote.contactPerson,
          temperature: noteTemp || activeLeadForNote.temperature,
          followUpDate: followUp !== undefined ? followUp : activeLeadForNote.followUpDate,
          scheduledTime: noteScheduledTime || activeLeadForNote.scheduledTime,
          notes: [updatedNote, ...activeLeadForNote.notes]
        };

        updateLeadInState(activeLeadForNote.id, updatedData);
        flashRow(activeLeadForNote.id);
        setActiveLeadForNote(null);
      }
    } catch (err) {
      console.error('Error saving note:', err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Add new lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const res = await createNewLead({
        name: newName.trim(),
        phone: newPhone.trim(),
        area: newArea.trim() || undefined,
        address: newAddress.trim() || undefined,
        contactPerson: newContact.trim() || undefined
      });

      if (res.success && res.lead) {
        const created: Lead = { ...res.lead, notes: [] };
        setLeads(prev => [created, ...prev]);
        setShowAddModal(false);
        setNewName('');
        setNewPhone('');
        setNewArea('');
        setNewAddress('');
        setNewContact('');
        flashRow(created.id);
      }
    } catch (err) {
      console.error('Error creating lead:', err);
    } finally {
      setIsCreating(false);
    }
  };



  // Export to CSV with Separate Documentation Columns
  const handleExportCsv = () => {
    const headers = [
      'מזהה', 
      'שם החנות', 
      'טלפון', 
      'אזור', 
      'כתובת', 
      'איש קשר', 
      'סטטוס', 
      'מענה', 
      'רמת עניין', 
      'שווה להשקיע', 
      'התקשרות', 
      'סטטוס עסקה',
      'טמפרטורה', 
      'תוצאת שיחה אחרונה', 
      'תאריך חזרה', 
      'שעת חזרה', 
      'מספר תיעודים'
    ];
    const rows = leads.map(l => [
      l.id,
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${l.phone}"`,
      `"${(l.area || '').replace(/"/g, '""')}"`,
      `"${(l.address || '').replace(/"/g, '""')}"`,
      `"${(l.contactPerson || '').replace(/"/g, '""')}"`,
      `"${l.status}"`,
      `"${l.callAnswer || ''}"`,
      `"${l.interest || ''}"`,
      `"${l.worthInvesting || ''}"`,
      `"${l.callAgain || ''}"`,
      `"${l.dealStatus || ''}"`,
      `"${l.temperature || ''}"`,
      `"${(l.lastCallOutcome || '').replace(/"/g, '""')}"`,
      `"${l.followUpDate ? new Date(l.followUpDate).toLocaleDateString('he-IL') : ''}"`,
      `"${l.scheduledTime || ''}"`,
      l.notes.length
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `חנויות_אופניים_לידים_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const updateLeadInState = (leadId: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updates } : l));
  };

  const isFollowUpToday = (dateStr: Date | null) => {
    if (!dateStr) return false;
    const today = new Date();
    const d = new Date(dateStr);
    return d.toDateString() === today.toDateString() || d < today;
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-900 font-sans overflow-hidden antialiased select-none" dir="rtl">
      
      {/* ======================= SIDEBAR (RIGHT SIDE) ======================= */}
      <aside className="hidden lg:flex w-64 bg-white border-l border-slate-200 flex-col h-full shrink-0 shadow-xs z-30">
        
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-l from-cyan-50/50 to-blue-50/50">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-teal-400 p-[2px] shadow-sm shadow-cyan-500/20">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                <Store className="w-5 h-5 text-cyan-600" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-black text-slate-900 tracking-tight">BIKE CRM</h1>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
                  2026
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-[130px] font-medium">{companyName}</p>
            </div>
          </div>
        </div>

        {/* Prominent Add Store Button in Sidebar */}
        <div className="p-3 border-b border-slate-100">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 active:scale-95 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-cyan-500/20 transition-all cursor-pointer ring-1 ring-cyan-400/30 hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ הוספת לקוח חדש</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto">
          
          {/* Module 1: Stores Table */}
          <button
            onClick={() => setActiveModule('leads')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
              activeModule === 'leads' 
                ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/20' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <Store className="w-4 h-4 shrink-0" />
              <span>טבלת חנויות</span>
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-black ${
              activeModule === 'leads' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {leads.length}
            </span>
          </button>

          {/* Module: High-Potential / Focus Leads ("לשבת עליהם") */}
          <button
            onClick={() => setActiveModule('priority')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
              activeModule === 'priority' 
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-md shadow-purple-500/25 ring-2 ring-purple-400/30' 
                : 'text-purple-900 hover:text-purple-950 hover:bg-purple-50/90 bg-purple-50/50 border border-purple-200/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <Target className={`w-4 h-4 shrink-0 ${activeModule === 'priority' ? 'text-amber-300' : 'text-purple-600'}`} />
              <div className="text-right">
                <div className="leading-tight">לשבת עליהם 🎯</div>
                <div className={`text-[10px] font-normal ${activeModule === 'priority' ? 'text-purple-200' : 'text-purple-700'}`}>פוטנציאל גבוה</div>
              </div>
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-black ${
              activeModule === 'priority' ? 'bg-white/25 text-white' : 'bg-purple-200 text-purple-900 border border-purple-300'
            }`}>
              {priorityLeads.length}
            </span>
          </button>

          {/* Module: Closed Deals / Already Clients ("סגירות 🤝") */}
          <button
            onClick={() => setActiveModule('closedDeals')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
              activeModule === 'closedDeals' 
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/30' 
                : 'text-emerald-900 hover:text-emerald-950 hover:bg-emerald-50/90 bg-emerald-50/50 border border-emerald-200/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <Handshake className={`w-4 h-4 shrink-0 ${activeModule === 'closedDeals' ? 'text-amber-300' : 'text-emerald-600'}`} />
              <div className="text-right">
                <div className="leading-tight">סגירות 🤝</div>
                <div className={`text-[10px] font-normal ${activeModule === 'closedDeals' ? 'text-emerald-200' : 'text-emerald-700'}`}>כבר דיברנו / לקוחות</div>
              </div>
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-black ${
              activeModule === 'closedDeals' ? 'bg-white/25 text-white' : 'bg-emerald-200 text-emerald-900 border border-emerald-300'
            }`}>
              {closedDealLeads.length}
            </span>
          </button>

          {/* Module 2: Calendar & Follow-ups */}
          <button
            onClick={() => setActiveModule('calendar')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
              activeModule === 'calendar' 
                ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/20' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>יומן ומשימות</span>
            </div>
            {scheduledLeads.today.length + scheduledLeads.overdue.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300">
                {scheduledLeads.today.length + scheduledLeads.overdue.length}
              </span>
            )}
          </button>

          {/* Module 3: Analytics */}
          <button
            onClick={() => setActiveModule('analytics')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
              activeModule === 'analytics' 
                ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/20' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>אנליטיקה ומדדים</span>
            </div>
            <span className="text-xs text-cyan-600 font-bold">{stats.conversionRate}% המרה</span>
          </button>

          {/* Module 4: Settings */}
          <button
            onClick={() => setActiveModule('settings')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
              activeModule === 'settings' 
                ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/20' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 shrink-0" />
              <span>הגדרות מערכת</span>
            </div>
          </button>
        </nav>

        {/* Total Calls Counter */}
        <div className="p-3.5 mx-3 mb-3 rounded-2xl bg-cyan-50/60 border border-cyan-100">
          <div className="text-xs font-bold text-cyan-900 mb-1 flex items-center justify-between">
            <span>שיחות שתועדו</span>
            <span className="text-cyan-700 font-mono font-black">{stats.totalNotes}</span>
          </div>
          <div className="w-full bg-cyan-200/60 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-cyan-500 to-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (stats.totalNotes / Math.max(1, stats.total)) * 100)}%` }}
            />
          </div>
        </div>

        {/* User Footer */}
        <div className="p-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-900 truncate">{agentName}</div>
              <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                מחובר
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ======================= MAIN CONTENT AREA ======================= */}
      <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">

        {/* Mobile Header Bar */}
        <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 lg:hidden z-20 shadow-xs">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-slate-900"
              aria-label="פתח תפריט"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-black text-sm text-slate-900">BIKE CRM</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveModule('leads')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold ${activeModule === 'leads' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
            >
              חנויות
            </button>
            <button
              onClick={() => setActiveModule('priority')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 ${
                activeModule === 'priority' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-purple-50 text-purple-900 border border-purple-200'
              }`}
            >
              <span>לשבת עליהם 🎯</span>
              {priorityLeads.length > 0 && (
                <span className="bg-purple-200 text-purple-900 px-1.5 py-0.5 rounded-full text-[10px] font-black">
                  {priorityLeads.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-2.5 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 active:scale-95 text-white text-xs font-black rounded-xl flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>+ לקוח</span>
            </button>
          </div>
        </header>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-14 left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-slate-200 p-4 z-40 space-y-2 shadow-xl">
            <button
              onClick={() => { setShowAddModal(true); setMobileMenuOpen(false); }}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 text-white font-black text-sm shadow-md cursor-pointer active:scale-98 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ הוספת לקוח חדש למאגר</span>
            </button>
            <button
              onClick={() => { setActiveModule('leads'); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 text-slate-900 font-bold text-sm"
            >
              <Store className="w-4 h-4 text-blue-600" />
              <span>טבלת חנויות ({leads.length})</span>
            </button>
            <button
              onClick={() => { setActiveModule('priority'); setMobileMenuOpen(false); }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-purple-50 text-purple-900 font-black text-sm border border-purple-200"
            >
              <div className="flex items-center gap-3">
                <Target className="w-4 h-4 text-purple-600" />
                <span>לקוחות לשבת עליהם 🎯</span>
              </div>
              <span className="bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full text-xs font-black">
                {priorityLeads.length}
              </span>
            </button>
            <button
              onClick={() => { setActiveModule('closedDeals'); setMobileMenuOpen(false); }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-50 text-emerald-900 font-black text-sm border border-emerald-200"
            >
              <div className="flex items-center gap-3">
                <Handshake className="w-4 h-4 text-emerald-600" />
                <span>סגירות 🤝 (כבר דיברנו / לקוחות)</span>
              </div>
              <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full text-xs font-black">
                {closedDealLeads.length}
              </span>
            </button>
            <button
              onClick={() => { setActiveModule('calendar'); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 text-slate-900 font-bold text-sm"
            >
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>יומן ומשימות חזרה ({scheduledLeads.all.length})</span>
            </button>
            <button
              onClick={() => { setActiveModule('analytics'); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 text-slate-900 font-bold text-sm"
            >
              <BarChart3 className="w-4 h-4 text-cyan-600" />
              <span>אנליטיקה ומדדים ({stats.conversionRate}% המרה)</span>
            </button>
            <button
              onClick={() => { setActiveModule('settings'); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 text-slate-900 font-bold text-sm"
            >
              <Settings className="w-4 h-4 text-slate-600" />
              <span>הגדרות מערכת וייצוא</span>
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODULE 1: STORES DATA TABLE WITH FAST 1-CLICK LOGGING     */}
        {/* ========================================================= */}
        {activeModule === 'leads' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            
            {/* Top Toolbar */}
            <div className="bg-white border-b border-slate-200 p-4 shrink-0 shadow-xs space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                
                {/* Title, Results Count, and PROMINENT ADD STORE BUTTON */}
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">טבלת חנויות אופניים</h2>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
                    {filteredLeads.length} חנויות
                  </span>

                  {/* PROMINENT ADD STORE BUTTON RIGHT AT THE TOP RIGHT */}
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 active:scale-95 text-white text-xs sm:text-sm font-black rounded-xl flex items-center gap-2 shadow-md shadow-cyan-500/25 transition-all cursor-pointer ring-2 ring-cyan-400/40 hover:scale-[1.02]"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>+ הוספת לקוח חדש</span>
                  </button>
                </div>

                {/* Secondary Action Buttons */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Follow-up filter */}
                  {stats.todayFollowUps > 0 && (
                    <button
                      onClick={() => setFollowUpOnly(!followUpOnly)}
                      className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                        followUpOnly 
                          ? 'bg-amber-500 text-white shadow-xs' 
                          : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{stats.todayFollowUps} לטיפול היום</span>
                    </button>
                  )}

                  {/* Export CSV */}
                  <button
                    onClick={handleExportCsv}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-slate-200 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                    <span>ייצוא לאקסל</span>
                  </button>
                </div>
              </div>

              {/* Filters Row */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
                {/* Mobile-Only Prominent Add Customer Button */}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="sm:hidden w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-cyan-500/25 active:scale-98 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ הוספת לקוח חדש</span>
                </button>

                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute right-3.5 top-2.5 text-slate-400 w-4 h-4 pointer-events-none" />
                  <input 
                    type="text" 
                    placeholder="חיפוש מהיר לפי שם חנות, עיר, טלפון או איש קשר..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pr-9 pl-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all placeholder:text-slate-400"
                  />
                  {search && (
                    <button 
                      onClick={() => setSearch('')}
                      className="absolute left-3 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Pills and Area Select */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
                    <button
                      onClick={() => setStatusFilter('')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        !statusFilter ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      הכל ({leads.length})
                    </button>
                    {STATUSES.map(s => {
                      const count = stats.byStatus[s as keyof typeof stats.byStatus] || 0;
                      return (
                        <button
                          key={s}
                          onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            statusFilter === s ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {s} ({count})
                        </button>
                      );
                    })}
                    {/* Priority Filter Pill */}
                    <button
                      onClick={() => setStatusFilter(statusFilter === 'שווה_להשקיע' ? '' : 'שווה_להשקיע')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                        statusFilter === 'שווה_להשקיע' 
                          ? 'bg-purple-600 text-white shadow-xs' 
                          : 'text-purple-900 hover:bg-white bg-purple-50 border border-purple-200'
                      }`}
                    >
                      <Target className="w-3 h-3" />
                      <span>לשבת עליהם ({priorityLeads.length})</span>
                    </button>
                  </div>

                  {allAreas.length > 0 && (
                    <select
                      value={areaFilter}
                      onChange={(e) => setAreaFilter(e.target.value)}
                      className="bg-white border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 cursor-pointer shadow-2xs"
                    >
                      <option value="">כל האזורים</option>
                      {allAreas.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* STORES CONTENT: MOBILE CARDS & DESKTOP DATA TABLE */}
            <div className="flex-1 overflow-auto p-3 sm:p-4 bg-slate-50">
              
              {/* ======================================================== */}
              {/* 1. MOBILE VIEW: ADAPTIVE TOUCH CARDS (PHONES & TABLETS)   */}
              {/* ======================================================== */}
              <div className="lg:hidden space-y-3 pb-28">
                {filteredLeads.map((lead, idx) => {
                  const statusConf = STATUS_CONFIG[lead.status] || STATUS_CONFIG['חדש'];
                  const isJustUpdated = justUpdatedId === lead.id;

                  return (
                    <div 
                      key={lead.id}
                      className={`bg-white rounded-3xl border p-4 shadow-xs transition-all space-y-3 relative ${
                        isJustUpdated ? 'border-emerald-400 bg-emerald-50/40 ring-2 ring-emerald-300' : 'border-slate-200'
                      }`}
                    >
                      {/* Store Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs text-slate-400 font-black">#{idx + 1}</span>
                            <h3 className="font-black text-slate-900 text-base leading-snug">{lead.name}</h3>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                            <span className="font-bold text-slate-700">{lead.area || 'לא צוין אזור'}</span>
                            {lead.contactPerson && (
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                                איש קשר: {lead.contactPerson}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status Selector */}
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          className={`font-black text-xs px-2.5 py-1 rounded-xl border outline-none cursor-pointer ${statusConf.badge}`}
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      {/* Primary Actions: Direct Dialer & Google Search */}
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={`tel:${cleanPhoneNumber(lead.phone)}`}
                          className="py-2.5 px-3 bg-emerald-500 active:bg-emerald-600 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs shadow-emerald-500/25 active:scale-95 transition-all"
                        >
                          <Phone className="w-4 h-4 fill-current" />
                          <span dir="ltr">{lead.phone}</span>
                        </a>

                        <a
                          href={getGoogleSearchUrl(lead)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-3 bg-cyan-50 active:bg-cyan-100 text-cyan-800 border border-cyan-200 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        >
                          <Search className="w-4 h-4 text-cyan-600" />
                          <span>חיפוש גוגל</span>
                        </a>
                      </div>

                      {/* The 4 Separate Documentation Categories */}
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-2.5">
                        
                        {/* 1. מענה */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-600 w-20 shrink-0">מענה:</span>
                          <div className="grid grid-cols-2 gap-1.5 flex-1">
                            <button
                              type="button"
                              onClick={() => handleToggleDocField(lead.id, 'callAnswer', 'ענה')}
                              className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all text-center ${
                                lead.callAnswer === 'ענה'
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-white text-blue-800 border-blue-200'
                              }`}
                            >
                              ענה
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleDocField(lead.id, 'callAnswer', 'לא ענה')}
                              className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all text-center ${
                                lead.callAnswer === 'לא ענה'
                                  ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-200'
                              }`}
                            >
                              לא ענה
                            </button>
                          </div>
                        </div>

                        {/* 2. רמת עניין */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-600 w-20 shrink-0">רמת עניין:</span>
                          <div className="grid grid-cols-2 gap-1.5 flex-1">
                            <button
                              type="button"
                              onClick={() => handleToggleDocField(lead.id, 'interest', 'מעוניין')}
                              className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all text-center ${
                                lead.interest === 'מעוניין'
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-white text-emerald-800 border-emerald-200'
                              }`}
                            >
                              👍 מעוניין
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleDocField(lead.id, 'interest', 'לא מעוניין')}
                              className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all text-center ${
                                lead.interest === 'לא מעוניין'
                                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                  : 'bg-white text-rose-800 border-rose-200'
                              }`}
                            >
                              👎 לא מעוניין
                            </button>
                          </div>
                        </div>

                        {/* 3. שווה להשקיע */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-600 w-20 shrink-0">שווה להשקיע:</span>
                            <div className="grid grid-cols-2 gap-1.5 flex-1">
                              <button
                                type="button"
                                onClick={() => handleToggleDocField(lead.id, 'worthInvesting', 'שווה להשקיע')}
                                className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all text-center ${
                                  lead.worthInvesting === 'שווה להשקיע'
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-600 shadow-xs ring-2 ring-purple-300'
                                    : 'bg-white text-purple-800 border-purple-200'
                                }`}
                              >
                                {lead.worthInvesting === 'שווה להשקיע' ? '🎯 במוקד (VIP)' : '🎯 שווה להשקיע'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleDocField(lead.id, 'worthInvesting', 'לא שווה')}
                                className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all text-center ${
                                  lead.worthInvesting === 'לא שווה'
                                    ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                                    : 'bg-white text-slate-700 border-slate-200'
                                }`}
                              >
                                לא שווה
                              </button>
                            </div>
                          </div>
                          {lead.worthInvesting === 'שווה להשקיע' && (
                            <div className="flex items-center justify-end gap-2 pr-20">
                              <button
                                type="button"
                                onClick={() => setActiveModule('priority')}
                                className="px-2.5 py-1 bg-amber-100 active:bg-amber-200 text-amber-900 rounded-lg text-[11px] font-black border border-amber-300"
                              >
                                צפה במוקד 🎯
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleDocField(lead.id, 'worthInvesting', 'שווה להשקיע')}
                                className="px-2.5 py-1 bg-rose-50 active:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-black border border-rose-200 flex items-center gap-1"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>החזר לרגיל</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* 4. התקשרות */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-600 w-20 shrink-0">התקשרות:</span>
                          <div className="grid grid-cols-2 gap-1.5 flex-1">
                            <button
                              type="button"
                              onClick={() => handleToggleDocField(lead.id, 'callAgain', 'להתקשר')}
                              className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all text-center ${
                                lead.callAgain === 'להתקשר'
                                  ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                                  : 'bg-white text-amber-900 border-amber-200'
                              }`}
                            >
                              🔔 להתקשר
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleDocField(lead.id, 'callAgain', 'לא להתקשר')}
                              className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all text-center ${
                                lead.callAgain === 'לא להתקשר'
                                  ? 'bg-red-700 text-white border-red-700 shadow-xs'
                                  : 'bg-white text-red-800 border-red-200'
                              }`}
                            >
                              ⛔ אל תתקשר
                            </button>
                          </div>
                        </div>

                        {/* 5. סגירה */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-600 w-20 shrink-0">סגירה:</span>
                          <div className="grid grid-cols-2 gap-1.5 flex-1">
                            <button
                              type="button"
                              onClick={() => handleToggleDocField(lead.id, 'dealStatus', 'כבר דיברנו')}
                              className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all text-center ${
                                lead.dealStatus === 'כבר דיברנו'
                                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                  : 'bg-white text-teal-800 border-teal-200'
                              }`}
                            >
                              🗣️ כבר דיברנו
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleDocField(lead.id, 'dealStatus', 'כבר לקוח')}
                              className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all text-center ${
                                lead.dealStatus === 'כבר לקוח'
                                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-300'
                                  : 'bg-white text-emerald-800 border-emerald-200'
                              }`}
                            >
                              👑 כבר לקוח
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Notes Button */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => setActiveLeadForNote(lead)}
                          className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 active:scale-95 transition-all"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>הערות ותיעודים ({lead.notes.length})</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredLeads.length === 0 && (
                  <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 p-6">
                    <Store className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-600 text-sm">לא נמצאו חנויות התואמות לחיפוש</p>
                    <p className="text-xs mt-1">נסה לשנות את מילות החיפוש או הסינון</p>
                  </div>
                )}
              </div>

              {/* ======================================================== */}
              {/* 2. DESKTOP VIEW: FULL DATA TABLE WITH SEPARATE COLUMNS   */}
              {/* ======================================================== */}
              <div className="hidden lg:block bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    
                    {/* Table Header with Distinct Documentation Columns */}
                    <thead className="bg-slate-50/95 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10 backdrop-blur-xs">
                      <tr>
                        <th className="py-3.5 px-3 w-10 text-center text-slate-400">#</th>
                        <th className="py-3.5 px-4 min-w-[190px]">שם החנות</th>
                        <th className="py-3.5 px-3 whitespace-nowrap">חיוג ישיר</th>
                        <th className="py-3.5 px-3 whitespace-nowrap text-center">מענה</th>
                        <th className="py-3.5 px-3 whitespace-nowrap text-center">רמת עניין</th>
                        <th className="py-3.5 px-3 whitespace-nowrap text-center">שווה להשקיע</th>
                        <th className="py-3.5 px-3 whitespace-nowrap text-center">התקשרות</th>
                        <th className="py-3.5 px-3 whitespace-nowrap text-center">סגירה</th>
                        <th className="py-3.5 px-3">איש קשר</th>
                        <th className="py-3.5 px-3">אזור ועיר</th>
                        <th className="py-3.5 px-3">סטטוס</th>
                        <th className="py-3.5 px-3 text-center">הערה</th>
                      </tr>
                    </thead>

                    {/* Table Body */}
                    <tbody className="divide-y divide-slate-100">
                      {filteredLeads.map((lead, idx) => {
                        const statusConf = STATUS_CONFIG[lead.status] || STATUS_CONFIG['חדש'];
                        const isJustUpdated = justUpdatedId === lead.id;

                        return (
                          <tr 
                            key={lead.id}
                            className={`transition-colors group ${
                              isJustUpdated 
                                ? 'bg-emerald-50/70 duration-300' 
                                : 'hover:bg-cyan-50/30'
                            }`}
                          >
                            {/* # */}
                            <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>

                            {/* Store Name - Direct Google link & badge */}
                            <td className="py-3 px-4">
                              <div className="flex flex-col gap-1">
                                <span className="font-black text-slate-900 text-sm">
                                  {lead.name}
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <a 
                                    href={getGoogleSearchUrl(lead)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-700 hover:text-cyan-950 bg-cyan-50 hover:bg-cyan-100 px-2 py-0.5 rounded-lg border border-cyan-200 transition-colors"
                                    title="חפש חנות זו בגוגל"
                                  >
                                    <Search className="w-3 h-3 text-cyan-600" />
                                    <span>גוגל</span>
                                  </a>
                                  {lead.temperature && (
                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                                      lead.temperature === 'urgent'
                                        ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                        : lead.temperature === 'hot'
                                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {lead.temperature === 'urgent' ? '💎 דחוף' : lead.temperature === 'hot' ? '🔥 חם' : '❄️ קר'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Direct Dialer Button (tel:) */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <a 
                                  href={`tel:${cleanPhoneNumber(lead.phone)}`}
                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black rounded-xl text-xs inline-flex items-center gap-1.5 shadow-xs shadow-emerald-500/25 transition-all cursor-pointer hover:scale-105"
                                  title="חייג למספר זה עכשיו"
                                >
                                  <Phone className="w-3.5 h-3.5 fill-current" />
                                  <span>חייג</span>
                                </a>
                                <span className="font-mono text-slate-700 font-bold text-xs" dir="ltr">
                                  {lead.phone}
                                </span>
                              </div>
                            </td>

                            {/* 1. SEPARATE COLUMN: מענה */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-center">
                              <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                                <button
                                  type="button"
                                  onClick={() => handleToggleDocField(lead.id, 'callAnswer', 'ענה')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                    lead.callAnswer === 'ענה'
                                      ? 'bg-blue-600 text-white shadow-xs scale-105'
                                      : 'text-blue-800 hover:bg-white'
                                  }`}
                                  title="סמן כענה"
                                >
                                  ענה
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleDocField(lead.id, 'callAnswer', 'לא ענה')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                    lead.callAnswer === 'לא ענה'
                                      ? 'bg-slate-700 text-white shadow-xs scale-105'
                                      : 'text-slate-600 hover:bg-white'
                                  }`}
                                  title="סמן שלא ענה"
                                >
                                  לא ענה
                                </button>
                              </div>
                            </td>

                            {/* 2. SEPARATE COLUMN: רמת עניין */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-center">
                              <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                                <button
                                  type="button"
                                  onClick={() => handleToggleDocField(lead.id, 'interest', 'מעוניין')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                    lead.interest === 'מעוניין'
                                      ? 'bg-emerald-600 text-white shadow-xs scale-105'
                                      : 'text-emerald-800 hover:bg-white'
                                  }`}
                                  title="סמן כמעוניין"
                                >
                                  👍 מעוניין
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleDocField(lead.id, 'interest', 'לא מעוניין')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                    lead.interest === 'לא מעוניין'
                                      ? 'bg-rose-600 text-white shadow-xs scale-105'
                                      : 'text-rose-800 hover:bg-white'
                                  }`}
                                  title="סמן כלא מעוניין"
                                >
                                  👎 לא מעוניין
                                </button>
                              </div>
                            </td>

                            {/* 3. SEPARATE COLUMN: שווה להשקיע */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleDocField(lead.id, 'worthInvesting', 'שווה להשקיע')}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer active:scale-95 ${
                                    lead.worthInvesting === 'שווה להשקיע'
                                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-600 shadow-md ring-2 ring-purple-400/40 scale-105'
                                      : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
                                  }`}
                                  title={lead.worthInvesting === 'שווה להשקיע' ? 'נמצא במודול לשבת עליהם - לחץ לביטול' : 'סמן כשווה להשקיע והעבר למודול לקוחות לשבת עליהם'}
                                >
                                  <span className="inline-flex items-center gap-1">
                                    <Target className="w-3.5 h-3.5" />
                                    <span>{lead.worthInvesting === 'שווה להשקיע' ? '🎯 במוקד (VIP)' : 'שווה להשקיע 🎯'}</span>
                                  </span>
                                </button>
                                {lead.worthInvesting === 'שווה להשקיע' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setActiveModule('priority')}
                                      className="px-2 py-1 bg-amber-100 hover:bg-amber-200 active:scale-95 text-amber-900 rounded-lg text-[10px] font-black border border-amber-300 shadow-2xs transition-all cursor-pointer"
                                      title="פתח במודול לקוחות לשבת עליהם"
                                    >
                                      צפה 🎯
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleDocField(lead.id, 'worthInvesting', 'שווה להשקיע')}
                                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 rounded-lg text-[10px] font-black border border-rose-200 shadow-2xs transition-all cursor-pointer flex items-center gap-0.5"
                                      title="בטל והחזר לפול החנויות הרגיל"
                                    >
                                      <RotateCcw className="w-2.5 h-2.5" />
                                      <span>החזר ↩️</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* 4. SEPARATE COLUMN: התקשרות */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-center">
                              <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                                <button
                                  type="button"
                                  onClick={() => handleToggleDocField(lead.id, 'callAgain', 'להתקשר')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                    lead.callAgain === 'להתקשר'
                                      ? 'bg-amber-500 text-white shadow-xs scale-105'
                                      : 'text-amber-900 hover:bg-white'
                                  }`}
                                  title="סמן שיש להתקשר / לחזור"
                                >
                                  🔔 להתקשר
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleDocField(lead.id, 'callAgain', 'לא להתקשר')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                    lead.callAgain === 'לא להתקשר'
                                      ? 'bg-red-700 text-white shadow-xs scale-105'
                                      : 'text-red-800 hover:bg-white'
                                  }`}
                                  title="סמן שלא להתקשר"
                                >
                                  ⛔ לא להתקשר
                                </button>
                              </div>
                            </td>

                            {/* 5. SEPARATE COLUMN: סטטוס עסקה (Deal Status) */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleDocField(lead.id, 'dealStatus', 'כבר דיברנו')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                    lead.dealStatus === 'כבר דיברנו'
                                      ? 'bg-teal-600 text-white shadow-xs scale-105'
                                      : 'text-teal-800 hover:bg-teal-50 bg-white border border-teal-200'
                                  }`}
                                  title="כבר דיברנו עם החנות"
                                >
                                  🗣️ דיברנו
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleDocField(lead.id, 'dealStatus', 'כבר לקוח')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                    lead.dealStatus === 'כבר לקוח'
                                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs scale-105 ring-2 ring-emerald-300'
                                      : 'text-emerald-800 hover:bg-emerald-50 bg-white border border-emerald-200'
                                  }`}
                                  title="כבר לקוח שלנו"
                                >
                                  👑 לקוח
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              {lead.contactPerson ? (
                                <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                                  {lead.contactPerson}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">-</span>
                              )}
                            </td>

                            {/* Area & Address */}
                            <td className="py-3 px-3">
                              <div className="text-slate-800 font-bold">
                                {lead.area || 'לא צוין'}
                              </div>
                              {lead.address && (
                                <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                                  {lead.address}
                                </div>
                              )}
                            </td>

                            {/* Status Selector Dropdown */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <select 
                                value={lead.status}
                                onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                                className={`font-black text-xs px-2.5 py-1 rounded-xl border cursor-pointer outline-none transition-all ${statusConf.badge}`}
                              >
                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>

                            {/* Detailed Note & History Modal Button */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <button
                                onClick={() => setActiveLeadForNote(lead)}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs flex items-center gap-1.5 mx-auto transition-all cursor-pointer shadow-2xs"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                                <span>הערה ({lead.notes.length})</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {filteredLeads.length === 0 && (
                        <tr>
                          <td colSpan={12} className="py-12 text-center text-slate-400">
                            <Store className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                            <p className="font-bold text-slate-600 text-sm">לא נמצאו חנויות התואמות לחיפוש</p>
                            <p className="text-xs mt-1">נסה לשנות את הסינון או מילות החיפוש</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODULE: HIGH-POTENTIAL CLIENTS ("לקוחות לשבת עליהם 🎯")    */}
        {/* ========================================================= */}
        {activeModule === 'priority' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 pb-28">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20">
                    <Target className="w-6 h-6" />
                  </span>
                  <h2 className="text-2xl font-black text-slate-900">
                    לקוחות שצריך לשבת עליהם 🎯
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  ריכוז לקוחות VIP וחנויות בעלות פוטנציאל גבוה שסומנו כ"שווה להשקיע" – לטיפול ממוקד, שיחות תיאום וסגירת עסקאות.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-3.5 py-1.5 rounded-xl bg-purple-100 text-purple-900 border border-purple-200 shadow-2xs">
                  {priorityLeads.length} לקוחות במוקד
                </span>
                <button
                  onClick={() => setActiveModule('leads')}
                  className="px-4 py-2 rounded-xl text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer hover:scale-102 active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                  <span>חזרה לטבלת כל החנויות ↩️</span>
                </button>
              </div>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-white border border-purple-200 shadow-xs relative overflow-hidden">
                <div className="text-xs font-bold text-slate-500 mb-1">סה"כ לקוחות VIP</div>
                <div className="text-3xl font-black text-purple-700">{priorityLeads.length}</div>
                <div className="text-[11px] text-purple-600 mt-1.5 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>שווה להשקיע</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs relative overflow-hidden">
                <div className="text-xs font-bold text-slate-500 mb-1">מעוניינים בסגירה</div>
                <div className="text-3xl font-black text-emerald-600">
                  {priorityLeads.filter(l => l.interest === 'מעוניין').length}
                </div>
                <div className="text-[11px] text-emerald-700 mt-1.5 font-bold">
                  {priorityLeads.length > 0 ? Math.round((priorityLeads.filter(l => l.interest === 'מעוניין').length / priorityLeads.length) * 100) : 0}% הביעו עניין
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-blue-200 shadow-xs relative overflow-hidden">
                <div className="text-xs font-bold text-slate-500 mb-1">ענו לשיחות</div>
                <div className="text-3xl font-black text-blue-600">
                  {priorityLeads.filter(l => l.callAnswer === 'ענה').length}
                </div>
                <div className="text-[11px] text-blue-700 mt-1.5 font-bold">נוצר קשר ישיר</div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs relative overflow-hidden">
                <div className="text-xs font-bold text-slate-500 mb-1">תזכורות שנקבעו</div>
                <div className="text-3xl font-black text-amber-600">
                  {priorityLeads.filter(l => l.followUpDate).length}
                </div>
                <div className="text-[11px] text-amber-700 mt-1.5 font-bold">במעקב פעיל</div>
              </div>
            </div>

            {/* Module Toolbar: Search & Status Filters */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute right-3 top-2.5 text-slate-400 w-4 h-4 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="חיפוש מהיר בין הלקוחות לפוקוס..."
                  value={prioritySearch}
                  onChange={(e) => setPrioritySearch(e.target.value)}
                  className="w-full pr-9 pl-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  onClick={() => setPriorityStatusFilter('')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    !priorityStatusFilter ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  הכל ({priorityLeads.length})
                </button>
                {STATUSES.map(s => {
                  const count = priorityLeads.filter(l => l.status === s).length;
                  return (
                    <button
                      key={s}
                      onClick={() => setPriorityStatusFilter(priorityStatusFilter === s ? '' : s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        priorityStatusFilter === s ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {s} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Empty State */}
            {filteredPriorityLeads.length === 0 && (
              <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 shadow-xs max-w-lg mx-auto space-y-4">
                <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-600 mx-auto flex items-center justify-center">
                  <Target className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  {priorityLeads.length === 0 ? 'אין עדיין לקוחות ברשימת "לשבת עליהם"' : 'לא נמצאו לקוחות מתאימים לחיפוש'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                  {priorityLeads.length === 0 
                    ? 'כדי להעביר לקוח לכאן, היכנס לטבלת החנויות ולחץ על כפתור "שווה להשקיע 🎯" בשורת החנות הרצויה. הלקוח יתווסף ישירות למודול זה לטיפול מעמיק.'
                    : 'נסה לנקות את מילות החיפוש או הסינון.'}
                </p>
                {priorityLeads.length === 0 && (
                  <button
                    onClick={() => setActiveModule('leads')}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black text-xs rounded-xl shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-all"
                  >
                    עבור עכשיו לטבלת החנויות
                  </button>
                )}
              </div>
            )}

            {/* Priority Leads Grid */}
            {filteredPriorityLeads.length > 0 && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filteredPriorityLeads.map((lead, idx) => {
                  const statusConf = STATUS_CONFIG[lead.status] || STATUS_CONFIG['חדש'];
                  const isJustUpdated = justUpdatedId === lead.id;

                  return (
                    <div 
                      key={lead.id}
                      className={`bg-white rounded-3xl border p-5 shadow-xs transition-all space-y-4 relative ${
                        isJustUpdated ? 'border-emerald-400 bg-emerald-50/40 ring-2 ring-emerald-300' : 'border-purple-200/90 hover:border-purple-400'
                      }`}
                    >
                      {/* Top Bar: Store Name, Priority Badge, Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-purple-600 font-black">#{idx + 1}</span>
                            <h3 className="font-black text-slate-900 text-lg leading-snug">
                              {lead.name}
                            </h3>
                            <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black shadow-2xs">
                              🎯 VIP לשבת עליו
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                            <span className="font-bold text-slate-700">📍 {lead.area || 'לא צוין אזור'}</span>
                            {lead.address && <span className="text-slate-400">{lead.address}</span>}
                            {lead.contactPerson && (
                              <span className="bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-md font-bold text-[11px]">
                                👤 {lead.contactPerson}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status selector & Quick Return Button */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                            className={`font-black text-xs px-2.5 py-1.5 rounded-xl border outline-none cursor-pointer ${statusConf.badge}`}
                          >
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>

                          <button
                            type="button"
                            onClick={() => handleToggleDocField(lead.id, 'worthInvesting', 'שווה להשקיע')}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                            title="החזר חנות זו לטבלת החנויות הרגילה ובטל מרשימת הלקוחות לפוקוס"
                          >
                            <RotateCcw className="w-3 h-3 text-rose-600" />
                            <span>החזר לטבלה ↩️</span>
                          </button>
                        </div>
                      </div>

                      {/* Primary Quick Actions: Call, WhatsApp, Google */}
                      <div className="grid grid-cols-3 gap-2">
                        <a
                          href={`tel:${cleanPhoneNumber(lead.phone)}`}
                          className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs shadow-emerald-500/20 active:scale-95 transition-all"
                        >
                          <Phone className="w-4 h-4 fill-current" />
                          <span dir="ltr">{lead.phone}</span>
                        </a>

                        <a
                          href={`https://wa.me/972${cleanPhoneNumber(lead.phone).replace(/^0/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        >
                          <MessageSquare className="w-4 h-4 text-emerald-600" />
                          <span>וואטסאפ</span>
                        </a>

                        <a
                          href={getGoogleSearchUrl(lead)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-3 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        >
                          <Search className="w-4 h-4 text-cyan-600" />
                          <span>גוגל</span>
                        </a>
                      </div>

                      {/* 4 Documentation Categories in Focused Grid */}
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-2.5">
                        <div className="text-[11px] font-bold text-slate-500 mb-1">עדכון תיעוד מהיר בחנות זו:</div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {/* מענה */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-600 w-12 shrink-0">מענה:</span>
                            <div className="grid grid-cols-2 gap-1 flex-1">
                              <button
                                type="button"
                                onClick={() => handleToggleDocField(lead.id, 'callAnswer', 'ענה')}
                                className={`py-1 px-1.5 rounded-lg text-xs font-black border transition-all text-center cursor-pointer ${
                                  lead.callAnswer === 'ענה' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-800 border-blue-200'
                                }`}
                              >
                                ענה
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleDocField(lead.id, 'callAnswer', 'לא ענה')}
                                className={`py-1 px-1.5 rounded-lg text-xs font-black border transition-all text-center cursor-pointer ${
                                  lead.callAnswer === 'לא ענה' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-700 border-slate-200'
                                }`}
                              >
                                לא ענה
                              </button>
                            </div>
                          </div>

                          {/* עניין */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-600 w-12 shrink-0">עניין:</span>
                            <div className="grid grid-cols-2 gap-1 flex-1">
                              <button
                                type="button"
                                onClick={() => handleToggleDocField(lead.id, 'interest', 'מעוניין')}
                                className={`py-1 px-1.5 rounded-lg text-xs font-black border transition-all text-center cursor-pointer ${
                                  lead.interest === 'מעוניין' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-800 border-emerald-200'
                                }`}
                              >
                                👍 מעוניין
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleDocField(lead.id, 'interest', 'לא מעוניין')}
                                className={`py-1 px-1.5 rounded-lg text-xs font-black border transition-all text-center cursor-pointer ${
                                  lead.interest === 'לא מעוניין' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-rose-800 border-rose-200'
                                }`}
                              >
                                👎 לא
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* התקשרות */}
                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/60">
                          <span className="text-[11px] font-bold text-slate-600 w-12 shrink-0">התקשרות:</span>
                          <div className="grid grid-cols-2 gap-1 flex-1">
                            <button
                              type="button"
                              onClick={() => handleToggleDocField(lead.id, 'callAgain', 'להתקשר')}
                              className={`py-1 px-1.5 rounded-lg text-xs font-black border transition-all text-center cursor-pointer ${
                                lead.callAgain === 'להתקשר' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-900 border-amber-200'
                              }`}
                            >
                              🔔 להתקשר
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleDocField(lead.id, 'callAgain', 'לא להתקשר')}
                              className={`py-1 px-1.5 rounded-lg text-xs font-black border transition-all text-center cursor-pointer ${
                                lead.callAgain === 'לא להתקשר' ? 'bg-red-700 text-white border-red-700' : 'bg-white text-red-800 border-red-200'
                              }`}
                            >
                              ⛔ אל תתקשר
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Follow-up reminder banner */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                          {lead.followUpDate ? (
                            <div>
                              <span className="font-bold text-amber-900">תואמה שיחת מעקב: </span>
                              <span className="font-mono text-amber-800 font-bold">
                                {new Date(lead.followUpDate).toLocaleDateString('he-IL')} {lead.scheduledTime ? `בשעה ${lead.scheduledTime}` : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-amber-800 font-medium">לא נקבעה עדיין תזכורת לשיחה חוזרת</span>
                          )}
                        </div>

                        <button
                          onClick={() => setActiveLeadForNote(lead)}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] rounded-lg shadow-2xs transition-all cursor-pointer"
                        >
                          {lead.followUpDate ? 'שנה תאריך' : 'קבע שיחה'}
                        </button>
                      </div>

                      {/* Latest Note preview */}
                      {lead.notes.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="font-bold text-slate-700">תיעוד אחרון:</span>
                            <span dir="ltr">
                              {new Date(lead.notes[0].createdAt).toLocaleDateString('he-IL')} {new Date(lead.notes[0].createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-800 font-medium leading-relaxed truncate">
                            {lead.notes[0].text}
                          </p>
                        </div>
                      )}

                      {/* Card Bottom Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
                        <button
                          onClick={() => setActiveLeadForNote(lead)}
                          className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer hover:scale-102 active:scale-95 transition-all"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>פתח תיעוד והיסטוריה ({lead.notes.length})</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSearch(lead.name);
                              setActiveModule('leads');
                            }}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                            title="עבור לטבלת החנויות הראשית ומצא חנות זו"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                            <span>פתח בטבלת החנויות</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleDocField(lead.id, 'worthInvesting', 'שווה להשקיע')}
                            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs"
                            title="בטל את הסימון והחזר את החנות לטבלת החנויות הרגילה"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                            <span>החזר לטבלת החנויות</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ========================================================= */}
        {/* MODULE: CLOSED DEALS / ALREADY CLIENTS ("סגירות 🤝")      */}
        {/* ========================================================= */}
        {activeModule === 'closedDeals' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 pb-28">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20">
                    <Handshake className="w-6 h-6" />
                  </span>
                  <h2 className="text-2xl font-black text-slate-900">
                    סגירות 🤝
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  ריכוז חנויות שכבר דיברנו איתן או שכבר לקוחות שלנו – לניהול מעקב ושימור קשר.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-200 shadow-2xs">
                  {closedDealLeads.length} חנויות ברשימה
                </span>
                <button
                  onClick={() => setActiveModule('leads')}
                  className="px-4 py-2 rounded-xl text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer hover:scale-102 active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                  <span>חזרה לטבלת כל החנויות ↩️</span>
                </button>
              </div>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs relative overflow-hidden">
                <div className="text-xs font-bold text-slate-500 mb-1">סה"כ ברשימה</div>
                <div className="text-3xl font-black text-emerald-700">{closedDealLeads.length}</div>
                <div className="text-[11px] text-emerald-600 mt-1.5 font-bold flex items-center gap-1">
                  <Handshake className="w-3 h-3" />
                  <span>חנויות שעבדנו איתן</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-teal-200 shadow-xs relative overflow-hidden">
                <div className="text-xs font-bold text-slate-500 mb-1">כבר דיברנו</div>
                <div className="text-3xl font-black text-teal-600">
                  {closedDealLeads.filter(l => l.dealStatus === 'כבר דיברנו').length}
                </div>
                <div className="text-[11px] text-teal-700 mt-1.5 font-bold">🗣️ ניהלנו שיחה</div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs relative overflow-hidden">
                <div className="text-xs font-bold text-slate-500 mb-1">כבר לקוחות</div>
                <div className="text-3xl font-black text-amber-600">
                  {closedDealLeads.filter(l => l.dealStatus === 'כבר לקוח').length}
                </div>
                <div className="text-[11px] text-amber-700 mt-1.5 font-bold">👑 לקוחות פעילים</div>
              </div>
            </div>

            {/* Empty State */}
            {closedDealLeads.length === 0 && (
              <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 shadow-xs max-w-lg mx-auto space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <Handshake className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  אין עדיין חנויות ברשימת סגירות
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                  כדי להוסיף חנות לכאן, היכנס לטבלת החנויות ולחץ על "🗣️ דיברנו" או "👑 לקוח" בעמודת הסגירה.
                  החנות תתווסף ישירות למודול זה.
                </p>
                <button
                  onClick={() => setActiveModule('leads')}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black text-xs rounded-xl shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-all"
                >
                  עבור עכשיו לטבלת החנויות
                </button>
              </div>
            )}

            {/* Closed Deal Leads Grid */}
            {closedDealLeads.length > 0 && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {closedDealLeads.map((lead, idx) => {
                  const statusConf = STATUS_CONFIG[lead.status] || STATUS_CONFIG['חדש'];
                  const isJustUpdated = justUpdatedId === lead.id;
                  const isClient = lead.dealStatus === 'כבר לקוח';

                  return (
                    <div 
                      key={lead.id}
                      className={`bg-white rounded-3xl border p-5 shadow-xs transition-all space-y-4 relative ${
                        isJustUpdated ? 'border-emerald-400 bg-emerald-50/40 ring-2 ring-emerald-300' : 
                        isClient ? 'border-amber-300/80 hover:border-amber-400' : 'border-teal-200/90 hover:border-teal-400'
                      }`}
                    >
                      {/* Top Bar */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-emerald-600 font-black">#{idx + 1}</span>
                            <h3 className="font-black text-slate-900 text-lg leading-snug">
                              {lead.name}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black shadow-2xs ${
                              isClient 
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' 
                                : 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white'
                            }`}>
                              {isClient ? '👑 כבר לקוח' : '🗣️ כבר דיברנו'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                            <span className="font-bold text-slate-700">📍 {lead.area || 'לא צוין אזור'}</span>
                            {lead.address && <span className="text-slate-400">{lead.address}</span>}
                            {lead.contactPerson && (
                              <span className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-md font-bold text-[11px]">
                                👤 {lead.contactPerson}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status & Return */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                            className={`font-black text-xs px-2.5 py-1.5 rounded-xl border outline-none cursor-pointer ${statusConf.badge}`}
                          >
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>

                          <button
                            type="button"
                            onClick={() => handleToggleDocField(lead.id, 'dealStatus', lead.dealStatus || '')}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                            title="בטל סימון והחזר לטבלת החנויות"
                          >
                            <RotateCcw className="w-3 h-3 text-rose-600" />
                            <span>הסר מרשימה ↩️</span>
                          </button>
                        </div>
                      </div>

                      {/* Quick Actions: Call, WhatsApp, Google */}
                      <div className="grid grid-cols-3 gap-2">
                        <a
                          href={`tel:${cleanPhoneNumber(lead.phone)}`}
                          className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs shadow-emerald-500/20 active:scale-95 transition-all"
                        >
                          <Phone className="w-4 h-4 fill-current" />
                          <span dir="ltr">{lead.phone}</span>
                        </a>

                        <a
                          href={`https://wa.me/972${cleanPhoneNumber(lead.phone).replace(/^0/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        >
                          <MessageSquare className="w-4 h-4 text-emerald-600" />
                          <span>וואטסאפ</span>
                        </a>

                        <a
                          href={getGoogleSearchUrl(lead)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-3 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        >
                          <Search className="w-4 h-4 text-cyan-600" />
                          <span>גוגל</span>
                        </a>
                      </div>

                      {/* Deal Status Toggle */}
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-2">
                        <div className="text-[11px] font-bold text-slate-500 mb-1">שנה סטטוס עסקה:</div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleDocField(lead.id, 'dealStatus', 'כבר דיברנו')}
                            className={`py-2 px-3 rounded-xl text-xs font-black border transition-all text-center cursor-pointer ${
                              lead.dealStatus === 'כבר דיברנו'
                                ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                : 'bg-white text-teal-800 border-teal-200 hover:bg-teal-50'
                            }`}
                          >
                            🗣️ כבר דיברנו
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleDocField(lead.id, 'dealStatus', 'כבר לקוח')}
                            className={`py-2 px-3 rounded-xl text-xs font-black border transition-all text-center cursor-pointer ${
                              lead.dealStatus === 'כבר לקוח'
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 shadow-xs ring-2 ring-amber-300'
                                : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
                            }`}
                          >
                            👑 כבר לקוח
                          </button>
                        </div>
                      </div>

                      {/* Latest Note preview */}
                      {lead.notes.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="font-bold text-slate-700">תיעוד אחרון:</span>
                            <span dir="ltr">
                              {new Date(lead.notes[0].createdAt).toLocaleDateString('he-IL')} {new Date(lead.notes[0].createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-800 font-medium leading-relaxed truncate">
                            {lead.notes[0].text}
                          </p>
                        </div>
                      )}

                      {/* Card Bottom Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
                        <button
                          onClick={() => setActiveLeadForNote(lead)}
                          className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer hover:scale-102 active:scale-95 transition-all"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>פתח תיעוד והיסטוריה ({lead.notes.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSearch(lead.name);
                            setActiveModule('leads');
                          }}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          title="עבור לטבלת החנויות הראשית ומצא חנות זו"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                          <span>פתח בטבלת החנויות</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ========================================================= */}
        {/* MODULE 2: CALENDAR & SCHEDULED FOLLOW-UPS                 */}
        {/* ========================================================= */}
        {activeModule === 'calendar' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 pb-28">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 flex-wrap gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
                  <Calendar className="w-6 h-6 text-cyan-600" />
                  <span>יומן ומשימות חזרה</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  ריכוז כל החנויות שתואמה להן שיחת מעקב לפי תאריכים ושעות
                </p>
              </div>

              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-cyan-100 text-cyan-800 border border-cyan-200">
                סה"כ {scheduledLeads.all.length} מתוזמנים
              </span>
            </div>

            {/* Today's Calls */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>שיחות שנקבעו להיום ({scheduledLeads.today.length})</span>
              </h3>

              {scheduledLeads.today.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white border border-slate-200 text-slate-500 text-sm text-center">
                  אין שיחות מתוכננות להיום
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {scheduledLeads.today.map(l => (
                    <div key={l.id} className="p-4 rounded-2xl bg-white border border-emerald-300 shadow-sm relative overflow-hidden">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-slate-900 text-base truncate">{l.name}</div>
                        <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                          {l.scheduledTime || 'היום'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mb-3 space-y-1">
                        <div>📞 טלפון: <span className="font-mono text-slate-800 font-bold" dir="ltr">{l.phone}</span></div>
                        {l.contactPerson && <div>👤 איש קשר: {l.contactPerson}</div>}
                        {l.area && <div>📍 אזור: {l.area}</div>}
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => handleCall(l.phone)}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Phone className="w-3.5 h-3.5 fill-current" />
                          <span>חייג עכשיו</span>
                        </button>
                        <button
                          onClick={() => setActiveLeadForNote(l)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-blue-700 rounded-xl text-xs font-bold"
                        >
                          תעד
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Overdue Calls */}
            {scheduledLeads.overdue.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-rose-600 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>שיחות באיחור שלא טופלו ({scheduledLeads.overdue.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {scheduledLeads.overdue.map(l => (
                    <div key={l.id} className="p-4 rounded-2xl bg-white border border-rose-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-slate-900 text-base truncate">{l.name}</div>
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {new Date(l.followUpDate!).toLocaleDateString('he-IL')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mb-3 space-y-1">
                        <div>📞 טלפון: <span className="font-mono text-slate-800 font-bold" dir="ltr">{l.phone}</span></div>
                        {l.contactPerson && <div>👤 איש קשר: {l.contactPerson}</div>}
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => handleCall(l.phone)}
                          className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Phone className="w-3.5 h-3.5 fill-current" />
                          <span>חייג באיחור</span>
                        </button>
                        <button
                          onClick={() => setActiveLeadForNote(l)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                        >
                          תעד
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* MODULE 3: ANALYTICS                                       */}
        {/* ========================================================= */}
        {activeModule === 'analytics' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 pb-28">
            <div className="pb-4 border-b border-slate-200">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
                <BarChart3 className="w-6 h-6 text-cyan-600" />
                <span>מדדי ביצועים ואנליטיקה (2026)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">מדדים בזמן אמת, יחסי סגירה והתפלגות פעילות</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
                <div className="text-xs font-bold text-slate-500 mb-1">סה"כ חנויות במאגר</div>
                <div className="text-3xl font-black text-slate-900">{stats.total}</div>
                <div className="text-[11px] text-blue-600 mt-2 font-bold">מאגר ארצי</div>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
                <div className="text-xs font-bold text-slate-500 mb-1">שיחות שבוצעו</div>
                <div className="text-3xl font-black text-emerald-600">{stats.totalNotes}</div>
                <div className="text-[11px] text-slate-500 mt-2 font-medium">תיעודים שמורים במערכת</div>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
                <div className="text-xs font-bold text-slate-500 mb-1">יחס המרה וסגירה</div>
                <div className="text-3xl font-black text-cyan-600">{stats.conversionRate}%</div>
                <div className="text-[11px] text-cyan-700 mt-2 font-bold">{stats.byStatus['סגור']} חנויות סגורות</div>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
                <div className="text-xs font-bold text-slate-500 mb-1">לטיפול היום</div>
                <div className="text-3xl font-black text-amber-600">{stats.todayFollowUps}</div>
                <div className="text-[11px] text-amber-700 mt-2 font-bold">תזכורות פתוחות</div>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs max-w-xl">
              <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <span>פילוח לפי סטטוסים</span>
              </h3>
              <div className="space-y-3">
                {STATUSES.map(st => {
                  const count = stats.byStatus[st as keyof typeof stats.byStatus] || 0;
                  const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  const config = STATUS_CONFIG[st] || STATUS_CONFIG['חדש'];
                  return (
                    <div key={st}>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-700">{st}</span>
                        <span className="text-slate-500 font-mono">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${config.dot}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODULE 4: SETTINGS                                        */}
        {/* ========================================================= */}
        {activeModule === 'settings' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 pb-28">
            <div className="pb-4 border-b border-slate-200">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
                <Settings className="w-6 h-6 text-cyan-600" />
                <span>הגדרות מערכת והתאמה אישית</span>
              </h2>
            </div>

            {/* Profile Settings */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4 max-w-xl">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <span>פרטי מוקדן ופרויקט</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">שם המוקדן / המשתמש:</label>
                  <input 
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">שם הפרויקט / הארגון:</label>
                  <input 
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => saveSettings(agentName, companyName)}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>שמור שינויים</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MOBILE BOTTOM NAVIGATION BAR (FIXED FOR TOUCH SCREENS)    */}
        {/* ========================================================= */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around z-30 shadow-lg">
          <button
            onClick={() => setActiveModule('leads')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeModule === 'leads' ? 'text-blue-600 font-black' : 'text-slate-500 font-medium'
            }`}
          >
            <Store className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">חנויות</span>
          </button>

          <button
            onClick={() => setActiveModule('priority')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl relative transition-all cursor-pointer ${
              activeModule === 'priority' ? 'text-purple-600 font-black' : 'text-slate-500 font-medium'
            }`}
          >
            <Target className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">לשבת עליהם</span>
            {priorityLeads.length > 0 && (
              <span className="absolute top-0.5 right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-purple-600 text-white ring-2 ring-white">
                {priorityLeads.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveModule('closedDeals')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl relative transition-all cursor-pointer ${
              activeModule === 'closedDeals' ? 'text-emerald-600 font-black' : 'text-slate-500 font-medium'
            }`}
          >
            <Handshake className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">סגירות</span>
            {closedDealLeads.length > 0 && (
              <span className="absolute top-0.5 right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-600 text-white ring-2 ring-white">
                {closedDealLeads.length}
              </span>
            )}
          </button>

          {/* Center Floating + Add Store Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex flex-col items-center justify-center -mt-6 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/35 border-2 border-white active:scale-95 group-hover:scale-105 transition-all">
              <Plus className="w-6 h-6 stroke-[3]" />
            </div>
            <span className="text-[10px] font-black text-slate-800 mt-0.5">+ לקוח</span>
          </button>

          <button
            onClick={() => setActiveModule('calendar')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl relative transition-all cursor-pointer ${
              activeModule === 'calendar' ? 'text-blue-600 font-black' : 'text-slate-500 font-medium'
            }`}
          >
            <Calendar className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">יומן</span>
            {scheduledLeads.today.length + scheduledLeads.overdue.length > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white"></span>
            )}
          </button>

          <button
            onClick={() => setActiveModule('analytics')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeModule === 'analytics' ? 'text-blue-600 font-black' : 'text-slate-500 font-medium'
            }`}
          >
            <BarChart3 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">מדדים</span>
          </button>
        </nav>
      </div>

      {/* ========================================================= */}
      {/* MODAL: ADD NEW STORE LEAD (MOBILE-OPTIMIZED)             */}
      {/* ========================================================= */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
        >
          <div className="bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg shadow-2xl relative animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Mobile Drag Indicator */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-cyan-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-cyan-500/20">
                  <Plus className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">הוספת לקוח חדש</h3>
                  <p className="text-xs text-slate-500 font-medium">הזנת פרטי חנות ליצירת ליד חדש במאגר</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 rounded-xl transition-all cursor-pointer"
                aria-label="סגור"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateLead} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                <div>
                  <label className="block font-black text-slate-700 mb-1.5 text-xs">
                    שם החנות / העסק <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                    <input 
                      type="text"
                      required
                      placeholder="למשל: סייקל פוינט תל אביב"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-3 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-black text-slate-700 mb-1.5 text-xs">
                    מספר טלפון <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                    <input 
                      type="tel"
                      inputMode="tel"
                      required
                      placeholder="050-0000000 או 03-0000000"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-3 py-2.5 text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-black text-slate-700 mb-1.5 text-xs">אזור / עיר</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                      <input 
                        type="text"
                        placeholder="מרכז / צפון / שרון / דרום..."
                        value={newArea}
                        onChange={(e) => setNewArea(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-3 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-black text-slate-700 mb-1.5 text-xs">איש קשר</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                      <input 
                        type="text"
                        placeholder="שם בעלים / מנהל"
                        value={newContact}
                        onChange={(e) => setNewContact(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-3 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-black text-slate-700 mb-1.5 text-xs">כתובת מלאה (אופציונלי)</label>
                  <input 
                    type="text"
                    placeholder="רחוב ומספר בית..."
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Action Buttons Sticky Footer */}
              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-200 font-bold rounded-xl active:scale-95 transition-all cursor-pointer text-xs"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim() || !newPhone.trim() || isCreating}
                  className="flex-1 sm:flex-initial px-6 py-2.5 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-cyan-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>{isCreating ? 'יוצר לקוח...' : 'הוסף לקוח עכשיו'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DETAILED NOTE & HISTORY (OPTIONAL)                 */}
      {/* ========================================================= */}
      {activeLeadForNote && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-gradient-to-l from-cyan-50/50 to-blue-50/50 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-slate-900">{activeLeadForNote.name}</h3>
                  <a
                    href={getGoogleSearchUrl(activeLeadForNote)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-cyan-700 hover:underline flex items-center gap-1"
                  >
                    <Search className="w-3 h-3" />
                    <span>גוגל</span>
                  </a>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span dir="ltr" className="font-mono font-bold text-slate-700">{activeLeadForNote.phone}</span>
                  <span>{activeLeadForNote.area}</span>
                  {activeLeadForNote.address && <span>{activeLeadForNote.address}</span>}
                </div>
              </div>

              <button 
                onClick={() => setActiveLeadForNote(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              <form onSubmit={handleSubmitDetailedNote} className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="font-bold text-slate-900 text-sm">הוספת הערה מפורטת או תזמון שיחה</div>

                {/* Follow-up Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">תזכורת לתאריך חזרה:</label>
                    <input 
                      type="date"
                      value={noteFollowUpDate}
                      onChange={(e) => setNoteFollowUpDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">שעה מתוכננת:</label>
                    <input 
                      type="time"
                      value={noteScheduledTime}
                      onChange={(e) => setNoteScheduledTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                {/* Note Text */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">פירוט השיחה / סיכום:</label>
                  <textarea 
                    rows={3}
                    placeholder="מה נאמר בשיחה? עם מי דיברת?"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-cyan-500 placeholder:text-slate-400"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={!noteText.trim() || isSubmittingNote}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs shadow-md shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    שמור הערה
                  </button>
                </div>
              </form>

              {/* History Timeline */}
              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-2">היסטוריית תיעודים קודמים ({activeLeadForNote.notes.length}):</h4>
                {activeLeadForNote.notes.length === 0 ? (
                  <p className="text-xs text-slate-400">אין עדיין תיעודים לחנות זו</p>
                ) : (
                  <div className="space-y-2">
                    {activeLeadForNote.notes.map(n => (
                      <div key={n.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-1.5">
                            {n.outcome && (
                              <span className="font-bold bg-cyan-50 text-cyan-800 px-2 py-0.5 rounded text-[11px]">
                                {n.outcome}
                              </span>
                            )}
                          </div>
                          <span className="text-slate-400 text-[10px]" dir="ltr">
                            {new Date(n.createdAt).toLocaleDateString('he-IL')} {new Date(n.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-800 whitespace-pre-wrap">{n.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
