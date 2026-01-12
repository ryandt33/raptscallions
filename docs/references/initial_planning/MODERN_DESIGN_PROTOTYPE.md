import React, { useState, useEffect } from 'react';
import { Sprout, Leaf, Sun, Users, BookOpen, MessageSquare, BarChart3, Settings, ChevronRight, Play, Clock, CheckCircle2, AlertCircle, TrendingUp, Zap, Menu, X, Home, GraduationCap, Layers, Bell, Search, Plus, ArrowRight, Star, Calendar, Target } from 'lucide-react';

// ============================================
// RAPTSCALLIONS DESIGN SYSTEM - Option B: Modern Agricultural
// ============================================

// Design Tokens
const tokens = {
colors: {
// Primary: Deep Forest Green
primary: {
50: '#f0fdf4',
100: '#dcfce7',
200: '#bbf7d0',
300: '#86efac',
400: '#4ade80',
500: '#22c55e',
600: '#16a34a',
700: '#15803d',
800: '#166534',
900: '#14532d',
},
// Secondary: Sky Blue (water/growth)
secondary: {
50: '#f0f9ff',
100: '#e0f2fe',
200: '#bae6fd',
300: '#7dd3fc',
400: '#38bdf8',
500: '#0ea5e9',
600: '#0284c7',
},
// Accent: Golden Wheat
accent: {
400: '#fbbf24',
500: '#f59e0b',
600: '#d97706',
},
// Neutrals: Warm grays with slight green undertone
neutral: {
50: '#fafaf9',
100: '#f5f5f4',
200: '#e7e5e4',
300: '#d6d3d1',
400: '#a8a29e',
500: '#78716c',
600: '#57534e',
700: '#44403c',
800: '#292524',
900: '#1c1917',
},
// Semantic
success: '#22c55e',
warning: '#f59e0b',
error: '#ef4444',
info: '#0ea5e9',
},
fonts: {
display: '"DM Serif Display", Georgia, serif',
body: '"DM Sans", system-ui, sans-serif',
},
};

// ============================================
// SHARED COMPONENTS
// ============================================

const Logo = ({ size = 'md', showText = true }) => {
const sizes = {
sm: { icon: 24, text: 'text-lg' },
md: { icon: 32, text: 'text-xl' },
lg: { icon: 48, text: 'text-3xl' },
};
const s = sizes[size];

return (
<div className="flex items-center gap-2">
<div className="relative">
<div
className="rounded-xl flex items-center justify-center"
style={{
            width: s.icon + 12,
            height: s.icon + 12,
            background: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)',
            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
          }} >
<Sprout size={s.icon} color="white" strokeWidth={2.5} />
</div>
<div
className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full"
style={{ background: '#fbbf24', border: '2px solid white' }}
/>
</div>
{showText && (
<span
className={`${s.text} font-semibold tracking-tight`}
style={{ fontFamily: tokens.fonts.display, color: tokens.colors.primary[800] }} >
raptscallions
</span>
)}
</div>
);
};

const Button = ({ children, variant = 'primary', size = 'md', icon: Icon, ...props }) => {
const baseStyles = "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 gap-2";

const variants = {
primary: {
background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
color: 'white',
boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
},
secondary: {
background: 'white',
color: tokens.colors.primary[700],
border: `2px solid ${tokens.colors.primary[200]}`,
},
ghost: {
background: 'transparent',
color: tokens.colors.neutral[600],
},
accent: {
background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
color: tokens.colors.neutral[900],
boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
},
};

const sizes = {
sm: 'px-3 py-1.5 text-sm',
md: 'px-5 py-2.5 text-sm',
lg: 'px-6 py-3 text-base',
};

return (
<button
className={`${baseStyles} ${sizes[size]}`}
style={variants[variant]}
{...props} >
{Icon && <Icon size={size === 'sm' ? 16 : 18} />}
{children}
</button>
);
};

const Card = ({ children, className = '', hover = false, ...props }) => (

  <div 
    className={`bg-white rounded-2xl border border-stone-200/60 ${hover ? 'hover:shadow-lg hover:border-green-200 transition-all duration-300 cursor-pointer' : ''} ${className}`}
    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    {...props}
  >
    {children}
  </div>
);

const Badge = ({ children, variant = 'default' }) => {
const variants = {
default: { bg: tokens.colors.neutral[100], color: tokens.colors.neutral[600] },
success: { bg: tokens.colors.primary[100], color: tokens.colors.primary[700] },
warning: { bg: '#fef3c7', color: tokens.colors.accent[600] },
info: { bg: tokens.colors.secondary[100], color: tokens.colors.secondary[600] },
};
const v = variants[variant];

return (
<span
className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
style={{ background: v.bg, color: v.color }} >
{children}
</span>
);
};

const ProgressRing = ({ progress, size = 48, strokeWidth = 4 }) => {
const radius = (size - strokeWidth) / 2;
const circumference = radius _ 2 _ Math.PI;
const offset = circumference - (progress / 100) \* circumference;

return (
<div className="relative" style={{ width: size, height: size }}>
<svg width={size} height={size} className="-rotate-90">
<circle
cx={size / 2}
cy={size / 2}
r={radius}
fill="none"
stroke={tokens.colors.neutral[200]}
strokeWidth={strokeWidth}
/>
<circle
cx={size / 2}
cy={size / 2}
r={radius}
fill="none"
stroke={tokens.colors.primary[500]}
strokeWidth={strokeWidth}
strokeDasharray={circumference}
strokeDashoffset={offset}
strokeLinecap="round"
style={{ transition: 'stroke-dashoffset 0.5s ease' }}
/>
</svg>
<div className="absolute inset-0 flex items-center justify-center">
<span className="text-xs font-semibold" style={{ color: tokens.colors.primary[700] }}>
{progress}%
</span>
</div>
</div>
);
};

const GrowthIndicator = ({ value, label }) => (

  <div className="flex items-center gap-1.5">
    <div 
      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium"
      style={{ 
        background: value >= 0 ? tokens.colors.primary[100] : '#fee2e2',
        color: value >= 0 ? tokens.colors.primary[700] : '#dc2626',
      }}
    >
      <TrendingUp size={12} className={value < 0 ? 'rotate-180' : ''} />
      {Math.abs(value)}%
    </div>
    {label && <span className="text-xs" style={{ color: tokens.colors.neutral[500] }}>{label}</span>}
  </div>
);

// ============================================
// NAVIGATION
// ============================================

const Sidebar = ({ currentPage, setCurrentPage }) => {
const navItems = [
{ id: 'dashboard', icon: Home, label: 'Dashboard' },
{ id: 'classes', icon: Users, label: 'My Classes' },
{ id: 'tools', icon: Layers, label: 'AI Tools' },
{ id: 'assignments', icon: BookOpen, label: 'Assignments' },
{ id: 'chat', icon: MessageSquare, label: 'Chat Sessions' },
{ id: 'analytics', icon: BarChart3, label: 'Analytics' },
];

return (
<aside
className="w-64 h-screen fixed left-0 top-0 border-r flex flex-col"
style={{
        background: 'linear-gradient(180deg, #fafaf9 0%, #f5f5f4 100%)',
        borderColor: tokens.colors.neutral[200],
      }} >
<div className="p-5 border-b" style={{ borderColor: tokens.colors.neutral[200] }}>
<Logo />
</div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200`}
              style={{
                background: isActive ? 'white' : 'transparent',
                color: isActive ? tokens.colors.primary[700] : tokens.colors.neutral[600],
                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <item.icon size={18} style={{ color: isActive ? tokens.colors.primary[600] : tokens.colors.neutral[400] }} />
              {item.label}
              {isActive && (
                <div
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: tokens.colors.primary[500] }}
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 m-3 rounded-xl" style={{ background: tokens.colors.primary[50] }}>
        <div className="flex items-start gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ background: tokens.colors.primary[100] }}
          >
            <Zap size={18} style={{ color: tokens.colors.primary[600] }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: tokens.colors.primary[800] }}>
              AI Credits
            </p>
            <p className="text-xs mt-0.5" style={{ color: tokens.colors.primary[600] }}>
              847 / 1000 remaining
            </p>
            <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: tokens.colors.primary[200] }}>
              <div
                className="h-full rounded-full"
                style={{ width: '84.7%', background: tokens.colors.primary[500] }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 border-t" style={{ borderColor: tokens.colors.neutral[200] }}>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-white transition-colors">
          <Settings size={18} style={{ color: tokens.colors.neutral[400] }} />
          <span style={{ color: tokens.colors.neutral[600] }}>Settings</span>
        </button>
      </div>
    </aside>

);
};

const TopBar = ({ title, subtitle }) => (

  <header 
    className="h-16 border-b flex items-center justify-between px-6"
    style={{ 
      background: 'rgba(255,255,255,0.8)',
      backdropFilter: 'blur(8px)',
      borderColor: tokens.colors.neutral[200],
    }}
  >
    <div>
      <h1 
        className="text-xl font-semibold"
        style={{ fontFamily: tokens.fonts.display, color: tokens.colors.neutral[900] }}
      >
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm" style={{ color: tokens.colors.neutral[500] }}>{subtitle}</p>
      )}
    </div>
    
    <div className="flex items-center gap-3">
      <button 
        className="p-2 rounded-xl hover:bg-stone-100 transition-colors relative"
      >
        <Search size={20} style={{ color: tokens.colors.neutral[500] }} />
      </button>
      <button 
        className="p-2 rounded-xl hover:bg-stone-100 transition-colors relative"
      >
        <Bell size={20} style={{ color: tokens.colors.neutral[500] }} />
        <div 
          className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
          style={{ background: tokens.colors.error }}
        />
      </button>
      <div className="w-px h-8 mx-1" style={{ background: tokens.colors.neutral[200] }} />
      <div className="flex items-center gap-3">
        <div 
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium"
          style={{ 
            background: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)',
            color: 'white',
          }}
        >
          MS
        </div>
        <div className="text-right">
          <p className="text-sm font-medium" style={{ color: tokens.colors.neutral[800] }}>
            Ms. Sarah Chen
          </p>
          <p className="text-xs" style={{ color: tokens.colors.neutral[500] }}>
            Algebra II • Period 3
          </p>
        </div>
      </div>
    </div>
  </header>
);

// ============================================
// PAGE: DASHBOARD
// ============================================

const DashboardPage = () => {
const stats = [
{ label: 'Active Students', value: '127', change: 12, icon: Users, color: tokens.colors.primary[500] },
{ label: 'Sessions Today', value: '48', change: 8, icon: MessageSquare, color: tokens.colors.secondary[500] },
{ label: 'Avg. Engagement', value: '73%', change: 5, icon: TrendingUp, color: tokens.colors.accent[500] },
{ label: 'Tools Created', value: '12', change: 2, icon: Layers, color: tokens.colors.primary[600] },
];

const recentSessions = [
{ student: 'Alex Thompson', tool: 'Socratic Algebra Tutor', time: '5 min ago', status: 'active', progress: 65 },
{ student: 'Maria Garcia', tool: 'Essay Feedback Assistant', time: '12 min ago', status: 'completed', progress: 100 },
{ student: 'James Wilson', tool: 'Socratic Algebra Tutor', time: '18 min ago', status: 'struggling', progress: 30 },
{ student: 'Emma Davis', tool: 'Problem Set Helper', time: '25 min ago', status: 'completed', progress: 100 },
];

const upcomingAssignments = [
{ title: 'Quadratic Equations Practice', dueDate: 'Tomorrow', submissions: 18, total: 32 },
{ title: 'Chapter 5 Review', dueDate: 'In 3 days', submissions: 5, total: 32 },
{ title: 'Mid-term Prep Session', dueDate: 'In 5 days', submissions: 0, total: 32 },
];

return (
<div className="space-y-6">
{/_ Welcome Banner _/}
<div
className="rounded-2xl p-6 relative overflow-hidden"
style={{
          background: 'linear-gradient(135deg, #15803d 0%, #22c55e 50%, #4ade80 100%)',
        }} >
<div
className="absolute top-0 right-0 w-64 h-64 opacity-10"
style={{
            background: 'radial-gradient(circle, white 0%, transparent 70%)',
            transform: 'translate(30%, -30%)',
          }}
/>
<div className="relative z-10 flex items-center justify-between">
<div>
<h2
className="text-2xl font-semibold text-white mb-1"
style={{ fontFamily: tokens.fonts.display }} >
Good morning, Sarah! ☀️
</h2>
<p className="text-green-100 text-sm">
Your students have completed 23 sessions today. 3 need attention.
</p>
<div className="flex gap-3 mt-4">
<Button variant="accent" icon={Zap}>
Quick Actions
</Button>
<Button
variant="secondary"
style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none' }} >
View Reports
</Button>
</div>
</div>
<div className="hidden lg:flex items-center gap-2">
<div className="text-right text-white">
<p className="text-3xl font-bold">73%</p>
<p className="text-sm text-green-100">Class Engagement</p>
</div>
<ProgressRing progress={73} size={80} strokeWidth={6} />
</div>
</div>
</div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-start justify-between">
              <div
                className="p-2.5 rounded-xl"
                style={{ background: `${stat.color}15` }}
              >
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
              <GrowthIndicator value={stat.change} />
            </div>
            <div className="mt-4">
              <p
                className="text-2xl font-bold"
                style={{ color: tokens.colors.neutral[900] }}
              >
                {stat.value}
              </p>
              <p
                className="text-sm mt-0.5"
                style={{ color: tokens.colors.neutral[500] }}
              >
                {stat.label}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Recent Sessions */}
        <Card className="col-span-2 p-0 overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: tokens.colors.neutral[200] }}>
            <div>
              <h3
                className="font-semibold"
                style={{ fontFamily: tokens.fonts.display, color: tokens.colors.neutral[900] }}
              >
                Recent Sessions
              </h3>
              <p className="text-sm" style={{ color: tokens.colors.neutral[500] }}>
                Live student activity
              </p>
            </div>
            <Button variant="ghost" size="sm">
              View All <ChevronRight size={16} />
            </Button>
          </div>
          <div className="divide-y" style={{ borderColor: tokens.colors.neutral[100] }}>
            {recentSessions.map((session, i) => (
              <div key={i} className="p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                  style={{
                    background: tokens.colors.primary[100],
                    color: tokens.colors.primary[700],
                  }}
                >
                  {session.student.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: tokens.colors.neutral[800] }}>
                    {session.student}
                  </p>
                  <p className="text-sm truncate" style={{ color: tokens.colors.neutral[500] }}>
                    {session.tool}
                  </p>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      session.status === 'active' ? 'info' :
                      session.status === 'struggling' ? 'warning' : 'success'
                    }
                  >
                    {session.status === 'active' && '● '}{session.status}
                  </Badge>
                  <p className="text-xs mt-1" style={{ color: tokens.colors.neutral[400] }}>
                    {session.time}
                  </p>
                </div>
                <ProgressRing progress={session.progress} size={40} strokeWidth={3} />
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming Assignments */}
        <Card className="p-0 overflow-hidden">
          <div className="p-5 border-b" style={{ borderColor: tokens.colors.neutral[200] }}>
            <h3
              className="font-semibold"
              style={{ fontFamily: tokens.fonts.display, color: tokens.colors.neutral[900] }}
            >
              Upcoming Assignments
            </h3>
            <p className="text-sm" style={{ color: tokens.colors.neutral[500] }}>
              Submission progress
            </p>
          </div>
          <div className="p-4 space-y-3">
            {upcomingAssignments.map((assignment, i) => (
              <div
                key={i}
                className="p-3 rounded-xl border hover:border-green-200 hover:shadow-sm transition-all cursor-pointer"
                style={{ borderColor: tokens.colors.neutral[200] }}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="font-medium text-sm" style={{ color: tokens.colors.neutral[800] }}>
                    {assignment.title}
                  </p>
                  <Badge variant={i === 0 ? 'warning' : 'default'}>
                    {assignment.dueDate}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 h-1.5 rounded-full overflow-hidden"
                    style={{ background: tokens.colors.neutral[200] }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(assignment.submissions / assignment.total) * 100}%`,
                        background: tokens.colors.primary[500],
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium" style={{ color: tokens.colors.neutral[500] }}>
                    {assignment.submissions}/{assignment.total}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 pt-0">
            <Button variant="secondary" size="sm" className="w-full" icon={Plus}>
              Create Assignment
            </Button>
          </div>
        </Card>
      </div>
    </div>

);
};

// ============================================
// PAGE: AI TOOLS LIBRARY
// ============================================

const ToolsPage = () => {
const [selectedCategory, setSelectedCategory] = useState('all');

const categories = [
{ id: 'all', label: 'All Tools', count: 12 },
{ id: 'tutoring', label: 'Tutoring', count: 5 },
{ id: 'writing', label: 'Writing', count: 3 },
{ id: 'assessment', label: 'Assessment', count: 2 },
{ id: 'planning', label: 'Planning', count: 2 },
];

const tools = [
{
id: 1,
name: 'Socratic Algebra Tutor',
description: 'Guides students through algebra problems using the Socratic method. Never gives direct answers.',
type: 'chat',
category: 'tutoring',
uses: 234,
rating: 4.8,
icon: '🌱',
color: tokens.colors.primary[500],
},
{
id: 2,
name: 'Essay Feedback Assistant',
description: 'Provides constructive feedback on student essays with focus on structure and clarity.',
type: 'chat',
category: 'writing',
uses: 189,
rating: 4.6,
icon: '✍️',
color: tokens.colors.secondary[500],
},
{
id: 3,
name: 'Lesson Plan Generator',
description: 'Creates detailed lesson plans based on learning objectives and time constraints.',
type: 'product',
category: 'planning',
uses: 156,
rating: 4.9,
icon: '📋',
color: tokens.colors.accent[500],
},
{
id: 4,
name: 'Quiz Builder',
description: 'Generates quizzes aligned with curriculum standards and learning objectives.',
type: 'product',
category: 'assessment',
uses: 145,
rating: 4.7,
icon: '📝',
color: '#8b5cf6',
},
{
id: 5,
name: 'Problem Set Helper',
description: 'Helps students work through math problems step-by-step without revealing answers.',
type: 'chat',
category: 'tutoring',
uses: 312,
rating: 4.9,
icon: '🧮',
color: tokens.colors.primary[600],
},
{
id: 6,
name: 'Reading Comprehension Coach',
description: 'Guides students through reading passages with comprehension questions.',
type: 'chat',
category: 'tutoring',
uses: 98,
rating: 4.5,
icon: '📚',
color: '#ec4899',
},
];

const filteredTools = selectedCategory === 'all'
? tools
: tools.filter(t => t.category === selectedCategory);

return (
<div className="space-y-6">
{/_ Header _/}
<div className="flex items-center justify-between">
<div>
<h2
className="text-xl font-semibold"
style={{ fontFamily: tokens.fonts.display, color: tokens.colors.neutral[900] }} >
AI Tools Library
</h2>
<p className="text-sm" style={{ color: tokens.colors.neutral[500] }}>
Create and manage your AI-powered teaching tools
</p>
</div>
<Button icon={Plus}>
Create New Tool
</Button>
</div>

      {/* Categories */}
      <div className="flex gap-2">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: selectedCategory === cat.id ? tokens.colors.primary[500] : 'white',
              color: selectedCategory === cat.id ? 'white' : tokens.colors.neutral[600],
              border: `1px solid ${selectedCategory === cat.id ? tokens.colors.primary[500] : tokens.colors.neutral[200]}`,
            }}
          >
            {cat.label}
            <span
              className="ml-1.5 text-xs"
              style={{ opacity: 0.7 }}
            >
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-3 gap-4">
        {filteredTools.map(tool => (
          <Card key={tool.id} hover className="p-5 group">
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: `${tool.color}15` }}
              >
                {tool.icon}
              </div>
              <Badge variant={tool.type === 'chat' ? 'info' : 'success'}>
                {tool.type === 'chat' ? '💬 Chat' : '⚡ Product'}
              </Badge>
            </div>

            <h3
              className="font-semibold mb-1 group-hover:text-green-700 transition-colors"
              style={{ color: tokens.colors.neutral[800] }}
            >
              {tool.name}
            </h3>
            <p
              className="text-sm mb-4 line-clamp-2"
              style={{ color: tokens.colors.neutral[500] }}
            >
              {tool.description}
            </p>

            <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: tokens.colors.neutral[100] }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star size={14} fill={tokens.colors.accent[500]} color={tokens.colors.accent[500]} />
                  <span className="text-sm font-medium" style={{ color: tokens.colors.neutral[700] }}>
                    {tool.rating}
                  </span>
                </div>
                <span className="text-sm" style={{ color: tokens.colors.neutral[400] }}>
                  {tool.uses} uses
                </span>
              </div>
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: tokens.colors.primary[600] }}
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </Card>
        ))}

        {/* Create New Card */}
        <Card
          hover
          className="p-5 border-dashed flex flex-col items-center justify-center text-center min-h-[200px]"
          style={{ borderColor: tokens.colors.neutral[300], background: tokens.colors.neutral[50] }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ background: tokens.colors.primary[100] }}
          >
            <Plus size={24} style={{ color: tokens.colors.primary[600] }} />
          </div>
          <p className="font-medium" style={{ color: tokens.colors.neutral[700] }}>
            Create New Tool
          </p>
          <p className="text-sm mt-1" style={{ color: tokens.colors.neutral[500] }}>
            Build a custom AI tool for your class
          </p>
        </Card>
      </div>
    </div>

);
};

// ============================================
// PAGE: STUDENT CHAT VIEW
// ============================================

const ChatPage = () => {
const [message, setMessage] = useState('');

const messages = [
{
role: 'assistant',
content: "Hi there! 👋 I'm your Algebra Tutor. I'm here to help you understand quadratic equations, but I won't just give you answers—I'll guide you to discover them yourself. What would you like to work on today?",
time: '2:34 PM',
},
{
role: 'user',
content: "I'm stuck on this problem: x² + 5x + 6 = 0. I don't know where to start.",
time: '2:35 PM',
},
{
role: 'assistant',
content: "Great question! Let's work through this together. 🌱\n\nFirst, let me ask you: do you remember what method we can use to solve quadratic equations like this one? Think about what we've learned about factoring...",
time: '2:35 PM',
},
{
role: 'user',
content: "Um, factoring? Like finding two numbers that multiply together?",
time: '2:36 PM',
},
{
role: 'assistant',
content: "Exactly! You're on the right track. 🎯\n\nWhen we factor a quadratic like x² + 5x + 6, we're looking for two numbers that:\n\n• **Multiply** to give us the last number (6)\n• **Add** to give us the middle number (5)\n\nCan you think of two numbers that multiply to 6 AND add to 5?",
time: '2:36 PM',
},
];

return (
<div className="h-[calc(100vh-8rem)] flex gap-6">
{/_ Chat Area _/}
<div className="flex-1 flex flex-col">
<Card className="flex-1 flex flex-col overflow-hidden">
{/_ Chat Header _/}
<div
className="p-4 border-b flex items-center gap-4"
style={{ borderColor: tokens.colors.neutral[200] }} >
<div
className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
style={{ background: tokens.colors.primary[100] }} >
🌱
</div>
<div className="flex-1">
<h3 className="font-semibold" style={{ color: tokens.colors.neutral[800] }}>
Socratic Algebra Tutor
</h3>
<p className="text-sm" style={{ color: tokens.colors.neutral[500] }}>
Quadratic Equations Practice • Started 5 min ago
</p>
</div>
<Badge variant="success">● Active</Badge>
</div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ background: tokens.colors.neutral[50] }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'
                  }`}
                  style={{
                    background: msg.role === 'user' ? tokens.colors.primary[500] : 'white',
                    color: msg.role === 'user' ? 'white' : tokens.colors.neutral[800],
                    boxShadow: msg.role === 'assistant' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className="text-xs mt-2"
                    style={{
                      opacity: 0.6,
                      textAlign: msg.role === 'user' ? 'right' : 'left',
                    }}
                  >
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t" style={{ borderColor: tokens.colors.neutral[200] }}>
            <div className="flex gap-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your response..."
                className="flex-1 px-4 py-3 rounded-xl border text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
                style={{
                  borderColor: tokens.colors.neutral[200],
                  color: tokens.colors.neutral[800],
                }}
              />
              <Button icon={ArrowRight}>Send</Button>
            </div>
            <p className="text-xs mt-2 text-center" style={{ color: tokens.colors.neutral[400] }}>
              AI responses are generated to guide learning, not provide direct answers.
            </p>
          </div>
        </Card>
      </div>

      {/* Session Info Sidebar */}
      <Card className="w-80 p-0 overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: tokens.colors.neutral[200] }}>
          <h3 className="font-semibold" style={{ color: tokens.colors.neutral[800] }}>
            Session Progress
          </h3>
        </div>

        <div className="p-4 space-y-4">
          {/* Progress */}
          <div className="text-center py-4">
            <ProgressRing progress={65} size={100} strokeWidth={8} />
            <p className="mt-3 font-medium" style={{ color: tokens.colors.neutral[800] }}>
              Making Progress
            </p>
            <p className="text-sm" style={{ color: tokens.colors.neutral[500] }}>
              3 of 5 concepts covered
            </p>
          </div>

          {/* Learning Objectives */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: tokens.colors.neutral[500] }}>
              Learning Objectives
            </p>
            <div className="space-y-2">
              {[
                { text: 'Identify quadratic equations', done: true },
                { text: 'Factor simple quadratics', done: true },
                { text: 'Find roots using factoring', done: false },
                { text: 'Check solutions', done: false },
              ].map((obj, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm"
                >
                  {obj.done ? (
                    <CheckCircle2 size={16} style={{ color: tokens.colors.primary[500] }} />
                  ) : (
                    <div
                      className="w-4 h-4 rounded-full border-2"
                      style={{ borderColor: tokens.colors.neutral[300] }}
                    />
                  )}
                  <span style={{ color: obj.done ? tokens.colors.neutral[800] : tokens.colors.neutral[500] }}>
                    {obj.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Hints Used */}
          <div
            className="p-3 rounded-xl"
            style={{ background: tokens.colors.neutral[100] }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: tokens.colors.neutral[600] }}>
                Hints used
              </span>
              <span className="font-medium" style={{ color: tokens.colors.neutral[800] }}>
                2 / 5
              </span>
            </div>
          </div>

          {/* Time */}
          <div
            className="p-3 rounded-xl flex items-center gap-3"
            style={{ background: tokens.colors.primary[50] }}
          >
            <Clock size={18} style={{ color: tokens.colors.primary[600] }} />
            <div>
              <p className="text-sm font-medium" style={{ color: tokens.colors.primary[800] }}>
                5:23 elapsed
              </p>
              <p className="text-xs" style={{ color: tokens.colors.primary[600] }}>
                No time limit
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>

);
};

// ============================================
// PAGE: LANDING / MARKETING
// ============================================

const LandingPage = ({ onEnterApp }) => {
return (
<div className="min-h-screen" style={{ background: tokens.colors.neutral[50] }}>
{/_ Nav _/}
<nav className="fixed top-0 left-0 right-0 z-50 px-8 py-4" style={{ background: 'rgba(250,250,249,0.9)', backdropFilter: 'blur(8px)' }}>
<div className="max-w-7xl mx-auto flex items-center justify-between">
<Logo size="md" />
<div className="flex items-center gap-8">
<a href="#" className="text-sm font-medium" style={{ color: tokens.colors.neutral[600] }}>Features</a>
<a href="#" className="text-sm font-medium" style={{ color: tokens.colors.neutral[600] }}>For Schools</a>
<a href="#" className="text-sm font-medium" style={{ color: tokens.colors.neutral[600] }}>Pricing</a>
<a href="#" className="text-sm font-medium" style={{ color: tokens.colors.neutral[600] }}>Docs</a>
<Button onClick={onEnterApp}>Enter App →</Button>
</div>
</div>
</nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6" style={{ background: tokens.colors.primary[100] }}>
              <Sprout size={16} style={{ color: tokens.colors.primary[600] }} />
              <span className="text-sm font-medium" style={{ color: tokens.colors.primary[700] }}>
                Open Source AI for Education
              </span>
            </div>

            <h1
              className="text-6xl font-bold leading-tight mb-6"
              style={{ fontFamily: tokens.fonts.display, color: tokens.colors.neutral[900] }}
            >
              Where curiosity
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #15803d 0%, #22c55e 50%, #4ade80 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                grows wild
              </span>
            </h1>

            <p
              className="text-xl mb-8 leading-relaxed"
              style={{ color: tokens.colors.neutral[600] }}
            >
              Raptscallions is the open-source AI education platform that empowers teachers
              to create custom learning tools—without presets, without limits.
            </p>

            <div className="flex gap-4">
              <Button size="lg" icon={Play} onClick={onEnterApp}>
                See it in action
              </Button>
              <Button variant="secondary" size="lg">
                Deploy for free
              </Button>
            </div>

            <div className="flex items-center gap-8 mt-12 pt-8 border-t" style={{ borderColor: tokens.colors.neutral[200] }}>
              {[
                { value: '500+', label: 'Schools' },
                { value: '50k+', label: 'Students' },
                { value: '4.9', label: 'Rating' },
              ].map((stat, i) => (
                <div key={i}>
                  <p className="text-2xl font-bold" style={{ color: tokens.colors.neutral[900] }}>
                    {stat.value}
                  </p>
                  <p className="text-sm" style={{ color: tokens.colors.neutral[500] }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-8" style={{ background: 'white' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-4xl font-bold mb-4"
              style={{ fontFamily: tokens.fonts.display, color: tokens.colors.neutral[900] }}
            >
              Built for growth
            </h2>
            <p className="text-lg" style={{ color: tokens.colors.neutral[500] }}>
              Everything teachers need to cultivate curious minds
            </p>
          </div>

          <div className="grid grid-cols-3 gap-8">
            {[
              {
                icon: Layers,
                title: 'Teacher as Creator',
                description: 'No preset tools. Build exactly what your students need with our intuitive AI tool builder.',
                color: tokens.colors.primary[500],
              },
              {
                icon: Users,
                title: 'OneRoster Native',
                description: 'Seamless integration with your SIS. Students and classes sync automatically.',
                color: tokens.colors.secondary[500],
              },
              {
                icon: Zap,
                title: 'Instant Deployment',
                description: 'One-click deploy to Heroku, Docker, or Kubernetes. Your data, your control.',
                color: tokens.colors.accent[500],
              },
              {
                icon: MessageSquare,
                title: 'Socratic by Design',
                description: 'AI tutors that guide discovery, never give away answers. Real learning, real understanding.',
                color: '#8b5cf6',
              },
              {
                icon: BarChart3,
                title: 'Insight Dashboard',
                description: 'See who\'s struggling, who\'s thriving, and where to focus your attention.',
                color: '#ec4899',
              },
              {
                icon: Settings,
                title: 'Modular Architecture',
                description: 'Add only what you need. Safety filters, analytics, LMS integrations—all optional modules.',
                color: tokens.colors.primary[600],
              },
            ].map((feature, i) => (
              <Card key={i} className="p-6 hover:shadow-lg transition-shadow">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${feature.color}15` }}
                >
                  <feature.icon size={24} style={{ color: feature.color }} />
                </div>
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: tokens.colors.neutral[800] }}
                >
                  {feature.title}
                </h3>
                <p style={{ color: tokens.colors.neutral[500] }}>
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div
            className="rounded-3xl p-12 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #15803d 0%, #22c55e 50%, #4ade80 100%)',
            }}
          >
            <h2
              className="text-3xl font-bold text-white mb-4"
              style={{ fontFamily: tokens.fonts.display }}
            >
              Ready to plant the seeds of learning?
            </h2>
            <p className="text-green-100 mb-8 text-lg">
              Deploy Raptscallions for free. Open source, forever.
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="accent" size="lg">
                Get Started Free
              </Button>
              <Button
                variant="secondary"
                size="lg"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none' }}
              >
                View on GitHub
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8 border-t" style={{ borderColor: tokens.colors.neutral[200] }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <p className="text-sm" style={{ color: tokens.colors.neutral[500] }}>
            © 2025 Raptscallions. Open source under AGPL-3.0.
          </p>
        </div>
      </footer>
    </div>

);
};

// ============================================
// MAIN APP
// ============================================

export default function RaptscallionsPrototype() {
const [view, setView] = useState('landing'); // 'landing' | 'app'
const [currentPage, setCurrentPage] = useState('dashboard');

// Load fonts
useEffect(() => {
const link = document.createElement('link');
link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap';
link.rel = 'stylesheet';
document.head.appendChild(link);
}, []);

if (view === 'landing') {
return <LandingPage onEnterApp={() => setView('app')} />;
}

const pages = {
dashboard: <DashboardPage />,
tools: <ToolsPage />,
chat: <ChatPage />,
classes: <DashboardPage />,
assignments: <DashboardPage />,
analytics: <DashboardPage />,
};

const pageTitles = {
dashboard: { title: 'Dashboard', subtitle: 'Welcome back, Sarah' },
tools: { title: 'AI Tools', subtitle: 'Create and manage your teaching tools' },
chat: { title: 'Chat Session', subtitle: 'Student: Alex Thompson' },
classes: { title: 'My Classes', subtitle: '4 active classes this semester' },
assignments: { title: 'Assignments', subtitle: 'Track submissions and grades' },
analytics: { title: 'Analytics', subtitle: 'Insights and reports' },
};

return (
<div className="min-h-screen" style={{ background: tokens.colors.neutral[50], fontFamily: tokens.fonts.body }}>
<Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
<div className="ml-64">
<TopBar {...pageTitles[currentPage]} />
<main className="p-6">
{pages[currentPage]}
</main>
</div>

      {/* Back to Landing Button */}
      <button
        onClick={() => setView('landing')}
        className="fixed bottom-4 right-4 px-4 py-2 rounded-xl text-sm font-medium shadow-lg"
        style={{
          background: 'white',
          color: tokens.colors.neutral[600],
          border: `1px solid ${tokens.colors.neutral[200]}`,
        }}
      >
        ← Back to Landing
      </button>
    </div>

);
}
