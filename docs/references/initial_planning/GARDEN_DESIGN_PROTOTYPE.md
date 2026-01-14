import React, { useState, useEffect } from 'react';
import { Sprout, Leaf, Sun, Users, BookOpen, MessageSquare, BarChart3, Settings, ChevronRight, Play, Clock, CheckCircle2, AlertCircle, TrendingUp, Zap, Menu, X, Home, GraduationCap, Layers, Bell, Search, Plus, ArrowRight, Star, Calendar, Target, Droplets, Cloud, Heart, Sparkles, Award } from 'lucide-react';

// ============================================
// RAPTSCALLIONS DESIGN SYSTEM - Option A: Learning Garden
// Warm, Whimsical, Child-Friendly
// ============================================

// Design Tokens
const tokens = {
colors: {
// Primary: Warm Sage Green
primary: {
50: '#f6f9f4',
100: '#e8f0e3',
200: '#d1e2c7',
300: '#aecf9b',
400: '#87a96b',
500: '#6b8f4e',
600: '#547239',
700: '#435a2e',
800: '#374a28',
900: '#2f3e23',
},
// Secondary: Sunflower Yellow
secondary: {
50: '#fffdf0',
100: '#fff9db',
200: '#fff3b8',
300: '#ffe985',
400: '#ffda03',
500: '#f5c800',
600: '#d4a000',
700: '#a87800',
800: '#8a5f08',
900: '#724d0c',
},
// Accent: Tomato Red
accent: {
50: '#fff5f5',
100: '#ffe3e0',
200: '#ffccc7',
300: '#ffa69e',
400: '#ff6347',
500: '#f84525',
600: '#e5311a',
700: '#c12412',
800: '#a02214',
900: '#842218',
},
// Earth tones
earth: {
light: '#d4a574',
medium: '#8b6914',
dark: '#5c4033',
soil: '#3d2914',
},
// Sky
sky: {
light: '#e8f4fc',
medium: '#87ceeb',
dark: '#5ba3c8',
},
// Cream background
cream: '#fff8dc',
parchment: '#faf6e9',
// Neutrals
neutral: {
50: '#fdfcfa',
100: '#f8f6f1',
200: '#efe9df',
300: '#e0d6c6',
400: '#bfb199',
500: '#9a8a70',
600: '#7a6b54',
700: '#5c5040',
800: '#3d3529',
900: '#2a241c',
},
},
fonts: {
display: '"Fredoka", "Comic Sans MS", cursive',
body: '"Nunito", "Verdana", sans-serif',
},
};

// ============================================
// DECORATIVE ELEMENTS
// ============================================

const CloudDecoration = ({ className = '', style = {} }) => (
<svg viewBox="0 0 100 40" className={className} style={style}>
<ellipse cx="30" cy="25" rx="25" ry="15" fill="white" opacity="0.8" />
<ellipse cx="55" cy="20" rx="20" ry="12" fill="white" opacity="0.9" />
<ellipse cx="75" cy="25" rx="18" ry="10" fill="white" opacity="0.7" />
</svg>
);

const GrassDecoration = ({ className = '' }) => (
<svg viewBox="0 0 200 30" className={className} preserveAspectRatio="none">
<path d="M0,30 Q5,10 10,30 Q15,5 20,30 Q25,15 30,30 Q35,8 40,30 Q45,12 50,30 Q55,5 60,30 Q65,18 70,30 Q75,8 80,30 Q85,15 90,30 Q95,5 100,30 Q105,12 110,30 Q115,8 120,30 Q125,18 130,30 Q135,5 140,30 Q145,15 150,30 Q155,8 160,30 Q165,12 170,30 Q175,5 180,30 Q185,18 190,30 Q195,10 200,30 L200,30 L0,30 Z" 
      fill={tokens.colors.primary[400]} />
</svg>
);

const SunDecoration = ({ size = 60, className = '' }) => (

  <div className={`relative ${className}`} style={{ width: size, height: size }}>
    <div 
      className="absolute inset-2 rounded-full"
      style={{ 
        background: `radial-gradient(circle, ${tokens.colors.secondary[400]} 0%, ${tokens.colors.secondary[500]} 100%)`,
        boxShadow: `0 0 20px ${tokens.colors.secondary[400]}50`,
      }}
    />
    {[...Array(8)].map((_, i) => (
      <div
        key={i}
        className="absolute bg-yellow-400 rounded-full"
        style={{
          width: 4,
          height: 12,
          left: '50%',
          top: -4,
          transformOrigin: `50% ${size/2 + 4}px`,
          transform: `translateX(-50%) rotate(${i * 45}deg)`,
          background: tokens.colors.secondary[400],
        }}
      />
    ))}
  </div>
);

// ============================================
// MASCOT: SPROUT THE SCALLION
// ============================================

const SproutMascot = ({ size = 80, emotion = 'happy', className = '' }) => {
const expressions = {
happy: { eyes: '◠', mouth: '‿' },
excited: { eyes: '★', mouth: 'D' },
thinking: { eyes: '◑', mouth: '~' },
proud: { eyes: '◠', mouth: '◡' },
encouraging: { eyes: '◠', mouth: '○' },
};
const exp = expressions[emotion];

return (

<div className={`relative ${className}`} style={{ width: size, height: size * 1.5 }}>
{/_ Body (white part of scallion) _/}
<div
className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"
style={{
          width: size * 0.5,
          height: size * 0.8,
          background: 'linear-gradient(to right, #f0f0e8 0%, #ffffff 50%, #f0f0e8 100%)',
          border: `2px solid ${tokens.colors.neutral[300]}`,
          borderRadius: '40% 40% 45% 45%',
        }}
/>

      {/* Face */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center"
        style={{
          bottom: size * 0.25,
          width: size * 0.4,
          height: size * 0.35,
        }}
      >
        {/* Eyes */}
        <div className="flex gap-2 mb-1">
          <span style={{ fontSize: size * 0.12, color: tokens.colors.neutral[800] }}>{exp.eyes}</span>
          <span style={{ fontSize: size * 0.12, color: tokens.colors.neutral[800] }}>{exp.eyes}</span>
        </div>
        {/* Cheeks */}
        <div className="flex justify-between w-full px-1">
          <div
            className="rounded-full"
            style={{ width: size * 0.08, height: size * 0.05, background: '#ffb6c1', opacity: 0.6 }}
          />
          <div
            className="rounded-full"
            style={{ width: size * 0.08, height: size * 0.05, background: '#ffb6c1', opacity: 0.6 }}
          />
        </div>
        {/* Mouth */}
        <span style={{ fontSize: size * 0.1, color: tokens.colors.neutral[700] }}>{exp.mouth}</span>
      </div>

      {/* Green tops */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex">
        <div
          className="rounded-t-full"
          style={{
            width: size * 0.12,
            height: size * 0.5,
            background: `linear-gradient(to top, ${tokens.colors.primary[500]} 0%, ${tokens.colors.primary[400]} 100%)`,
            transform: 'rotate(-15deg)',
            transformOrigin: 'bottom center',
          }}
        />
        <div
          className="rounded-t-full -ml-1"
          style={{
            width: size * 0.14,
            height: size * 0.6,
            background: `linear-gradient(to top, ${tokens.colors.primary[500]} 0%, ${tokens.colors.primary[300]} 100%)`,
          }}
        />
        <div
          className="rounded-t-full -ml-1"
          style={{
            width: size * 0.12,
            height: size * 0.5,
            background: `linear-gradient(to top, ${tokens.colors.primary[500]} 0%, ${tokens.colors.primary[400]} 100%)`,
            transform: 'rotate(15deg)',
            transformOrigin: 'bottom center',
          }}
        />
      </div>

      {/* Roots */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="rounded-b-full"
            style={{
              width: 3,
              height: 8 + Math.random() * 6,
              background: tokens.colors.earth.light,
              transform: `rotate(${(i - 2) * 8}deg)`,
            }}
          />
        ))}
      </div>
    </div>

);
};

// ============================================
// SHARED COMPONENTS
// ============================================

const Logo = ({ size = 'md', showText = true }) => {
const sizes = {
sm: { icon: 32, text: 'text-lg' },
md: { icon: 44, text: 'text-2xl' },
lg: { icon: 64, text: 'text-4xl' },
};
const s = sizes[size];

return (

<div className="flex items-center gap-3">
<SproutMascot size={s.icon} emotion="happy" />
{showText && (
<span
className={`${s.text} font-bold`}
style={{
            fontFamily: tokens.fonts.display,
            color: tokens.colors.primary[700],
            textShadow: '2px 2px 0 rgba(255,255,255,0.8)',
          }} >
raptscallions
</span>
)}
</div>
);
};

const Button = ({ children, variant = 'primary', size = 'md', icon: Icon, bouncy = true, ...props }) => {
const baseStyles = `inline-flex items-center justify-center font-bold rounded-2xl transition-all duration-200 gap-2 ${bouncy ? 'hover:-translate-y-0.5 active:translate-y-0' : ''}`;

const variants = {
primary: {
background: `linear-gradient(180deg, ${tokens.colors.primary[400]} 0%, ${tokens.colors.primary[500]} 100%)`,
color: 'white',
boxShadow: `0 4px 0 ${tokens.colors.primary[700]}, 0 6px 12px rgba(107, 143, 78, 0.3)`,
border: `3px solid ${tokens.colors.primary[600]}`,
},
secondary: {
background: `linear-gradient(180deg, ${tokens.colors.secondary[300]} 0%, ${tokens.colors.secondary[400]} 100%)`,
color: tokens.colors.neutral[800],
boxShadow: `0 4px 0 ${tokens.colors.secondary[600]}, 0 6px 12px rgba(255, 218, 3, 0.3)`,
border: `3px solid ${tokens.colors.secondary[500]}`,
},
accent: {
background: `linear-gradient(180deg, ${tokens.colors.accent[300]} 0%, ${tokens.colors.accent[400]} 100%)`,
color: 'white',
boxShadow: `0 4px 0 ${tokens.colors.accent[600]}, 0 6px 12px rgba(255, 99, 71, 0.3)`,
border: `3px solid ${tokens.colors.accent[500]}`,
},
ghost: {
background: 'white',
color: tokens.colors.neutral[700],
boxShadow: `0 2px 0 ${tokens.colors.neutral[300]}`,
border: `2px solid ${tokens.colors.neutral[300]}`,
},
};

const sizes = {
sm: 'px-4 py-2 text-sm',
md: 'px-6 py-3 text-base',
lg: 'px-8 py-4 text-lg',
};

return (
<button
className={`${baseStyles} ${sizes[size]}`}
style={{ ...variants[variant], fontFamily: tokens.fonts.display }}
{...props} >
{Icon && <Icon size={size === 'sm' ? 16 : 20} />}
{children}
</button>
);
};

const Card = ({ children, className = '', variant = 'default', hover = false, ...props }) => {
const variants = {
default: {
background: 'white',
border: `3px solid ${tokens.colors.neutral[200]}`,
boxShadow: `0 4px 0 ${tokens.colors.neutral[200]}`,
},
garden: {
background: `linear-gradient(180deg, ${tokens.colors.primary[50]} 0%, white 100%)`,
border: `3px solid ${tokens.colors.primary[200]}`,
boxShadow: `0 4px 0 ${tokens.colors.primary[200]}`,
},
sunny: {
background: `linear-gradient(180deg, ${tokens.colors.secondary[50]} 0%, white 100%)`,
border: `3px solid ${tokens.colors.secondary[300]}`,
boxShadow: `0 4px 0 ${tokens.colors.secondary[300]}`,
},
};

return (

<div
className={`rounded-3xl ${hover ? 'hover:-translate-y-1 transition-transform cursor-pointer' : ''} ${className}`}
style={variants[variant]}
{...props} >
{children}
</div>
);
};

const Badge = ({ children, variant = 'default', icon: Icon }) => {
const variants = {
default: { bg: tokens.colors.neutral[100], color: tokens.colors.neutral[600], border: tokens.colors.neutral[300] },
success: { bg: tokens.colors.primary[100], color: tokens.colors.primary[700], border: tokens.colors.primary[300] },
warning: { bg: tokens.colors.secondary[100], color: tokens.colors.secondary[700], border: tokens.colors.secondary[400] },
danger: { bg: tokens.colors.accent[100], color: tokens.colors.accent[600], border: tokens.colors.accent[300] },
info: { bg: tokens.colors.sky.light, color: tokens.colors.sky.dark, border: tokens.colors.sky.medium },
};
const v = variants[variant];

return (
<span
className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold"
style={{
        background: v.bg,
        color: v.color,
        border: `2px solid ${v.border}`,
        fontFamily: tokens.fonts.display,
      }} >
{Icon && <Icon size={14} />}
{children}
</span>
);
};

const ProgressPlant = ({ progress, size = 100 }) => {
const stages = [
{ threshold: 0, emoji: '🌱', label: 'Seed' },
{ threshold: 25, emoji: '🌿', label: 'Sprout' },
{ threshold: 50, emoji: '🪴', label: 'Growing' },
{ threshold: 75, emoji: '🌻', label: 'Blooming' },
{ threshold: 100, emoji: '🌳', label: 'Flourished' },
];

const currentStage = [...stages].reverse().find(s => progress >= s.threshold);

return (

<div className="flex flex-col items-center">
<div
className="relative flex items-center justify-center rounded-full mb-2"
style={{
          width: size,
          height: size,
          background: `conic-gradient(${tokens.colors.primary[400]} ${progress * 3.6}deg, ${tokens.colors.neutral[200]} 0deg)`,
          padding: 6,
        }} >
<div
className="w-full h-full rounded-full flex items-center justify-center"
style={{ background: tokens.colors.cream }} >
<span style={{ fontSize: size * 0.4 }}>{currentStage.emoji}</span>
</div>
</div>
<span
className="text-sm font-bold"
style={{ color: tokens.colors.primary[600], fontFamily: tokens.fonts.display }} >
{progress}%
</span>
<span className="text-xs" style={{ color: tokens.colors.neutral[500] }}>
{currentStage.label}
</span>
</div>
);
};

const VegetableBadge = ({ type, count }) => {
const veggies = {
carrot: { emoji: '🥕', color: '#ff7f50', name: 'Carrots' },
tomato: { emoji: '🍅', color: '#ff6347', name: 'Tomatoes' },
corn: { emoji: '🌽', color: '#ffd700', name: 'Corn' },
broccoli: { emoji: '🥦', color: '#228b22', name: 'Broccoli' },
eggplant: { emoji: '🍆', color: '#9932cc', name: 'Eggplants' },
};
const v = veggies[type];

return (

<div
className="flex items-center gap-2 px-3 py-2 rounded-2xl"
style={{ background: `${v.color}20`, border: `2px solid ${v.color}40` }} >
<span className="text-xl">{v.emoji}</span>
<div>
<p className="text-xs font-bold" style={{ color: v.color }}>{count}</p>
<p className="text-xs" style={{ color: tokens.colors.neutral[500] }}>{v.name}</p>
</div>
</div>
);
};

// ============================================
// NAVIGATION
// ============================================

const Sidebar = ({ currentPage, setCurrentPage }) => {
const navItems = [
{ id: 'dashboard', icon: Home, label: 'My Garden', emoji: '🏡' },
{ id: 'classes', icon: Users, label: 'Classrooms', emoji: '🎒' },
{ id: 'tools', icon: Layers, label: 'Tool Shed', emoji: '🛠️' },
{ id: 'assignments', icon: BookOpen, label: 'Tasks', emoji: '📋' },
{ id: 'chat', icon: MessageSquare, label: 'Chat', emoji: '💬' },
{ id: 'achievements', icon: Award, label: 'Trophies', emoji: '🏆' },
];

return (

<aside
className="w-72 h-screen fixed left-0 top-0 flex flex-col"
style={{
        background: `linear-gradient(180deg, ${tokens.colors.primary[100]} 0%, ${tokens.colors.cream} 100%)`,
        borderRight: `4px solid ${tokens.colors.primary[200]}`,
      }} >
{/_ Decorative top _/}
<div className="relative">
<div
className="absolute top-0 left-0 right-0 h-24"
style={{
            background: `linear-gradient(180deg, ${tokens.colors.sky.light} 0%, transparent 100%)`,
          }}
/>
<SunDecoration size={50} className="absolute top-4 right-6" />
<CloudDecoration className="absolute top-2 left-4 w-20 opacity-60" />
</div>

      <div className="p-5 pt-8 relative z-10">
        <Logo size="md" />
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map(item => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-base font-bold transition-all duration-200`}
              style={{
                fontFamily: tokens.fonts.display,
                background: isActive
                  ? `linear-gradient(90deg, ${tokens.colors.primary[400]} 0%, ${tokens.colors.primary[500]} 100%)`
                  : 'transparent',
                color: isActive ? 'white' : tokens.colors.neutral[600],
                boxShadow: isActive ? `0 4px 0 ${tokens.colors.primary[700]}` : 'none',
                transform: isActive ? 'translateY(-2px)' : 'none',
              }}
            >
              <span className="text-xl">{item.emoji}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Harvest counter */}
      <div className="p-4 mx-4 mb-4 rounded-2xl" style={{ background: tokens.colors.secondary[100], border: `3px solid ${tokens.colors.secondary[300]}` }}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">🌾</span>
          <div>
            <p className="text-sm font-bold" style={{ color: tokens.colors.secondary[700], fontFamily: tokens.fonts.display }}>
              Harvest Points
            </p>
            <p className="text-2xl font-bold" style={{ color: tokens.colors.secondary[600], fontFamily: tokens.fonts.display }}>
              1,247
            </p>
          </div>
        </div>
      </div>

      {/* Grass at bottom */}
      <div className="relative h-8">
        <GrassDecoration className="absolute bottom-0 left-0 right-0 h-8" />
      </div>
    </aside>

);
};

const TopBar = ({ title, subtitle }) => (

  <header 
    className="h-20 flex items-center justify-between px-8"
    style={{ 
      background: `linear-gradient(90deg, ${tokens.colors.sky.light} 0%, white 100%)`,
      borderBottom: `3px solid ${tokens.colors.neutral[200]}`,
    }}
  >
    <div className="flex items-center gap-4">
      <div>
        <h1 
          className="text-2xl font-bold"
          style={{ fontFamily: tokens.fonts.display, color: tokens.colors.neutral[800] }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm" style={{ color: tokens.colors.neutral[500] }}>{subtitle}</p>
        )}
      </div>
    </div>
    
    <div className="flex items-center gap-4">
      {/* Weather widget */}
      <div 
        className="flex items-center gap-2 px-4 py-2 rounded-2xl"
        style={{ background: tokens.colors.sky.light, border: `2px solid ${tokens.colors.sky.medium}` }}
      >
        <span className="text-2xl">☀️</span>
        <span className="font-bold" style={{ color: tokens.colors.sky.dark, fontFamily: tokens.fonts.display }}>
          Perfect growing day!
        </span>
      </div>
      
      <button 
        className="relative p-3 rounded-2xl transition-colors"
        style={{ background: tokens.colors.secondary[100], border: `2px solid ${tokens.colors.secondary[300]}` }}
      >
        <Bell size={22} style={{ color: tokens.colors.secondary[600] }} />
        <div 
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: tokens.colors.accent[400] }}
        >
          3
        </div>
      </button>
      
      <div className="flex items-center gap-3 pl-4 border-l-2" style={{ borderColor: tokens.colors.neutral[200] }}>
        <div 
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
          style={{ 
            background: `linear-gradient(135deg, ${tokens.colors.primary[300]} 0%, ${tokens.colors.primary[400]} 100%)`,
            border: `3px solid ${tokens.colors.primary[500]}`,
          }}
        >
          🧑‍🌾
        </div>
        <div className="text-right">
          <p className="font-bold" style={{ color: tokens.colors.neutral[800], fontFamily: tokens.fonts.display }}>
            Farmer Sarah
          </p>
          <p className="text-sm" style={{ color: tokens.colors.neutral[500] }}>
            Level 12 Gardener 🌟
          </p>
        </div>
      </div>
    </div>
  </header>
);

// ============================================
// PAGE: DASHBOARD (MY GARDEN)
// ============================================

const DashboardPage = () => {
const gardenPlots = [
{ student: 'Alex T.', plant: '🌻', progress: 85, status: 'thriving' },
{ student: 'Maria G.', plant: '🌷', progress: 72, status: 'growing' },
{ student: 'James W.', plant: '🌱', progress: 35, status: 'needs-water' },
{ student: 'Emma D.', plant: '🌺', progress: 100, status: 'bloomed' },
{ student: 'Liam H.', plant: '🪻', progress: 58, status: 'growing' },
{ student: 'Sofia R.', plant: '🌼', progress: 91, status: 'thriving' },
];

const recentActivity = [
{ emoji: '🎉', text: 'Emma finished "Quadratic Equations"!', time: '2 min ago', type: 'success' },
{ emoji: '💧', text: 'James needs help in algebra', time: '5 min ago', type: 'warning' },
{ emoji: '⭐', text: 'Alex earned a gold star!', time: '12 min ago', type: 'success' },
{ emoji: '🌱', text: 'New student joined: Olivia P.', time: '1 hour ago', type: 'info' },
];

return (

<div className="space-y-6">
{/_ Welcome Banner _/}
<Card 
        variant="sunny" 
        className="p-6 relative overflow-hidden"
      >
<div className="absolute top-4 right-4">
<SproutMascot size={100} emotion="excited" />
</div>
<div className="absolute -bottom-4 -right-20 opacity-30">
<GrassDecoration className="w-80" />
</div>

        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-4xl">👋</span>
            <h2
              className="text-3xl font-bold"
              style={{ fontFamily: tokens.fonts.display, color: tokens.colors.neutral[800] }}
            >
              Good morning, Farmer Sarah!
            </h2>
          </div>
          <p className="text-lg mb-4" style={{ color: tokens.colors.neutral[600] }}>
            Your garden is growing beautifully! 🌈 3 students need a little extra sunshine today.
          </p>
          <div className="flex gap-3">
            <Button variant="primary" icon={Sparkles}>
              Start Gardening
            </Button>
            <Button variant="ghost">
              View Reports 📊
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { emoji: '🌱', label: 'Growing Plants', value: '127', sublabel: '12 new today!' },
          { emoji: '☀️', label: 'Sessions Today', value: '48', sublabel: 'Great sunshine!' },
          { emoji: '💧', label: 'Need Water', value: '3', sublabel: 'Check on them' },
          { emoji: '🌸', label: 'Bloomed Today', value: '8', sublabel: 'Wonderful!' },
        ].map((stat, i) => (
          <Card key={i} hover className="p-5 text-center">
            <span className="text-4xl mb-2 block">{stat.emoji}</span>
            <p
              className="text-3xl font-bold"
              style={{ fontFamily: tokens.fonts.display, color: tokens.colors.neutral[800] }}
            >
              {stat.value}
            </p>
            <p
              className="font-bold"
              style={{ fontFamily: tokens.fonts.display, color: tokens.colors.neutral[600] }}
            >
              {stat.label}
            </p>
            <p className="text-sm" style={{ color: tokens.colors.primary[500] }}>
              {stat.sublabel}
            </p>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Garden Plots */}
        <Card className="col-span-2 p-0 overflow-hidden">
          <div
            className="p-5 flex items-center justify-between"
            style={{
              background: `linear-gradient(90deg, ${tokens.colors.primary[100]} 0%, white 100%)`,
              borderBottom: `3px solid ${tokens.colors.primary[200]}`,
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌻</span>
              <div>
                <h3
                  className="text-xl font-bold"
                  style={{ fontFamily: tokens.fonts.display, color: tokens.colors.neutral[800] }}
                >
                  Student Garden
                </h3>
                <p className="text-sm" style={{ color: tokens.colors.neutral[500] }}>
                  How everyone is growing today
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              View All <ChevronRight size={16} />
            </Button>
          </div>

          <div className="p-4 grid grid-cols-3 gap-4" style={{ background: tokens.colors.earth.light + '20' }}>
            {gardenPlots.map((plot, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl text-center transition-transform hover:scale-105 cursor-pointer"
                style={{
                  background: `linear-gradient(180deg, ${tokens.colors.earth.light}30 0%, ${tokens.colors.earth.light}10 100%)`,
                  border: `3px dashed ${tokens.colors.earth.light}`,
                }}
              >
                <div className="text-5xl mb-2">{plot.plant}</div>
                <p
                  className="font-bold"
                  style={{ fontFamily: tokens.fonts.display, color: tokens.colors.neutral[700] }}
                >
                  {plot.student}
                </p>
                <div className="mt-2 flex items-center justify-center gap-1">
                  <div
                    className="flex-1 h-3 rounded-full overflow-hidden"
                    style={{ background: tokens.colors.neutral[200] }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${plot.progress}%`,
                        background: plot.status === 'needs-water'
                          ? tokens.colors.secondary[400]
                          : plot.status === 'bloomed'
                          ? tokens.colors.accent[400]
                          : tokens.colors.primary[400],
                      }}
                    />
                  </div>
                </div>
                <Badge
                  variant={
                    plot.status === 'needs-water' ? 'warning' :
                    plot.status === 'bloomed' ? 'danger' :
                    plot.status === 'thriving' ? 'success' : 'default'
                  }
                  icon={plot.status === 'needs-water' ? Droplets : undefined}
                >
                  {plot.status === 'needs-water' ? 'Needs water!' :
                   plot.status === 'bloomed' ? '✨ Bloomed!' :
                   plot.status === 'thriving' ? 'Thriving!' : 'Growing'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Activity Feed */}
        <Card className="p-0 overflow-hidden">
          <div
            className="p-5"
            style={{
              background: `linear-gradient(90deg, ${tokens.colors.secondary[100]} 0%, white 100%)`,
              borderBottom: `3px solid ${tokens.colors.secondary[300]}`,
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📢</span>
              <h3
                className="text-xl font-bold"
                style={{ fontFamily: tokens.fonts.display, color: tokens.colors.neutral[800] }}
              >
                Garden News
              </h3>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {recentActivity.map((activity, i) => (
              <div
                key={i}
                className="p-3 rounded-2xl flex items-start gap-3"
                style={{
                  background: activity.type === 'warning'
                    ? tokens.colors.secondary[50]
                    : activity.type === 'success'
                    ? tokens.colors.primary[50]
                    : tokens.colors.sky.light,
                }}
              >
                <span className="text-2xl">{activity.emoji}</span>
                <div className="flex-1">
                  <p
                    className="font-bold text-sm"
                    style={{ color: tokens.colors.neutral[700] }}
                  >
                    {activity.text}
                  </p>
                  <p className="text-xs" style={{ color: tokens.colors.neutral[500] }}>
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Harvest collection */}
          <div className="p-4 border-t" style={{ borderColor: tokens.colors.neutral[200] }}>
            <p
              className="text-sm font-bold mb-3"
              style={{ color: tokens.colors.neutral[600], fontFamily: tokens.fonts.display }}
            >
              Today's Harvest 🧺
            </p>
            <div className="flex flex-wrap gap-2">
              <VegetableBadge type="carrot" count={12} />
              <VegetableBadge type="tomato" count={8} />
              <VegetableBadge type="corn" count={5} />
            </div>
          </div>
        </Card>
      </div>
    </div>

);
};

// ============================================
// PAGE: TOOL SHED
// ============================================

const ToolsPage = () => {
const tools = [
{
name: 'Socratic Seed Planter',
description: 'Helps students discover answers through guided questions',
emoji: '🌱',
color: tokens.colors.primary[400],
uses: 234,
level: 'Beginner',
},
{
name: 'Essay Greenhouse',
description: 'Nurtures writing skills with gentle feedback',
emoji: '🏡',
color: tokens.colors.sky.medium,
uses: 189,
level: 'All Levels',
},
{
name: 'Math Mulcher',
description: 'Breaks down problems into digestible pieces',
emoji: '🧮',
color: tokens.colors.secondary[400],
uses: 312,
level: 'Intermediate',
},
{
name: 'Story Sprinkler',
description: 'Waters creativity with writing prompts',
emoji: '✨',
color: tokens.colors.accent[400],
uses: 156,
level: 'All Levels',
},
{
name: 'Quiz Compost',
description: 'Generates quizzes from learning material',
emoji: '📝',
color: '#9b59b6',
uses: 145,
level: 'Teacher Tool',
},
{
name: 'Reading Rainmaker',
description: 'Makes comprehension rain down!',
emoji: '🌧️',
color: tokens.colors.sky.dark,
uses: 98,
level: 'Beginner',
},
];

return (

<div className="space-y-6">
{/_ Header _/}
<div className="flex items-center justify-between">
<div className="flex items-center gap-4">
<span className="text-4xl">🛠️</span>
<div>
<h2
className="text-2xl font-bold"
style={{ fontFamily: tokens.fonts.display, color: tokens.colors.neutral[800] }} >
Tool Shed
</h2>
<p style={{ color: tokens.colors.neutral[500] }}>
Pick the right tools to help your garden grow!
</p>
</div>
</div>
<Button variant="secondary" icon={Plus}>
Build New Tool
</Button>
</div>

      {/* Tools Grid */}
      <div className="grid grid-cols-3 gap-5">
        {tools.map((tool, i) => (
          <Card key={i} hover className="p-5 relative overflow-hidden">
            {/* Decorative corner */}
            <div
              className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20"
              style={{ background: tool.color }}
            />

            <div className="relative z-10">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
                style={{
                  background: `${tool.color}20`,
                  border: `3px solid ${tool.color}40`,
                }}
              >
                {tool.emoji}
              </div>

              <h3
                className="text-lg font-bold mb-1"
                style={{ fontFamily: tokens.fonts.display, color: tokens.colors.neutral[800] }}
              >
                {tool.name}
              </h3>
              <p className="text-sm mb-4" style={{ color: tokens.colors.neutral[500] }}>
                {tool.description}
              </p>

              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: tokens.colors.neutral[200] }}>
                <Badge variant="default">{tool.level}</Badge>
                <span className="text-sm" style={{ color: tokens.colors.neutral[500] }}>
                  {tool.uses} uses 🌟
                </span>
              </div>
            </div>
          </Card>
        ))}

        {/* Create New Tool Card */}
        <Card
          hover
          className="p-5 flex flex-col items-center justify-center text-center"
          style={{
            background: `repeating-linear-gradient(45deg, ${tokens.colors.neutral[100]}, ${tokens.colors.neutral[100]} 10px, white 10px, white 20px)`,
            border: `3px dashed ${tokens.colors.neutral[300]}`,
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
            style={{ background: tokens.colors.neutral[200] }}
          >
            🔧
          </div>
          <p
            className="font-bold"
            style={{ fontFamily: tokens.fonts.display, color: tokens.colors.neutral[700] }}
          >
            Build a New Tool
          </p>
          <p className="text-sm" style={{ color: tokens.colors.neutral[500] }}>
            Create your own gardening tool!
          </p>
        </Card>
      </div>
    </div>

);
};

// ============================================
// PAGE: CHAT (STUDENT VIEW)
// ============================================

const ChatPage = () => {
const [message, setMessage] = useState('');

const messages = [
{
role: 'assistant',
content: "Hello, young gardener! 🌱 I'm Sprout, your algebra buddy! I'm here to help you discover how to solve quadratic equations. Think of each problem like planting a seed - we'll nurture it until it blooms into understanding! What would you like to work on?",
time: '2:34 PM',
},
{
role: 'user',
content: "I'm stuck on x² + 5x + 6 = 0. I don't know how to start!",
time: '2:35 PM',
},
{
role: 'assistant',
content: "No worries! Every gardener gets stuck sometimes! 🌻\n\nLet's think of this like planting. When we factor a quadratic, we're looking for two seeds (numbers) that when planted together:\n\n🌱 Multiply to give us 6 (the last number)\n🌱 Add up to 5 (the middle number)\n\nCan you think of two numbers like that? Try experimenting!",
time: '2:35 PM',
},
{
role: 'user',
content: "Hmm... 2 and 3?",
time: '2:36 PM',
},
{
role: 'assistant',
content: "🎉 WONDERFUL! You found the seeds!\n\n✅ 2 × 3 = 6 \n✅ 2 + 3 = 5 \n\nYou're growing so fast! Now, can you plant these seeds into the equation? Remember, if x² + 5x + 6 = (x + __)(x + __), what goes in the blanks?",
time: '2:36 PM',
},
];

return (

<div className="h-[calc(100vh-9rem)] flex gap-6">
{/_ Chat Area _/}
<div className="flex-1 flex flex-col">
<Card className="flex-1 flex flex-col overflow-hidden p-0">
{/_ Chat Header _/}
<div
className="p-4 flex items-center gap-4"
style={{
              background: `linear-gradient(90deg, ${tokens.colors.primary[100]} 0%, white 100%)`,
              borderBottom: `3px solid ${tokens.colors.primary[200]}`,
            }} >
<SproutMascot size={50} emotion="encouraging" />
<div className="flex-1">
<h3
className="font-bold text-lg"
style={{ fontFamily: tokens.fonts.display, color: tokens.colors.neutral[800] }} >
Sprout the Algebra Buddy
</h3>
<p className="text-sm" style={{ color: tokens.colors.neutral[500] }}>
🌱 Quadratic Equations • Growing for 5 min
</p>
</div>
<Badge variant="success" icon={Sparkles}>
Growing Well!
</Badge>
</div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-6 space-y-4"
            style={{
              background: `linear-gradient(180deg, ${tokens.colors.sky.light} 0%, ${tokens.colors.cream} 100%)`,
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="mr-2 mt-auto">
                    <SproutMascot size={40} emotion="happy" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-3xl px-5 py-4 ${
                    msg.role === 'user' ? 'rounded-br-lg' : 'rounded-bl-lg'
                  }`}
                  style={{
                    background: msg.role === 'user'
                      ? `linear-gradient(135deg, ${tokens.colors.primary[400]} 0%, ${tokens.colors.primary[500]} 100%)`
                      : 'white',
                    color: msg.role === 'user' ? 'white' : tokens.colors.neutral[800],
                    boxShadow: msg.role === 'assistant' ? '0 4px 0 ' + tokens.colors.neutral[200] : 'none',
                    border: msg.role === 'assistant' ? `3px solid ${tokens.colors.neutral[200]}` : 'none',
                  }}
                >
                  <p className="text-sm whitespace-pre-wrap" style={{ fontFamily: tokens.fonts.body }}>
                    {msg.content}
                  </p>
                  <p
                    className="text-xs mt-2"
                    style={{ opacity: 0.6 }}
                  >
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div
            className="p-4"
            style={{
              background: tokens.colors.cream,
              borderTop: `3px solid ${tokens.colors.neutral[200]}`,
            }}
          >
            <div className="flex gap-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your answer here... 🌱"
                className="flex-1 px-5 py-3 rounded-2xl text-base outline-none transition-all"
                style={{
                  border: `3px solid ${tokens.colors.primary[200]}`,
                  fontFamily: tokens.fonts.body,
                  background: 'white',
                }}
              />
              <Button icon={ArrowRight}>
                Send!
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Progress Sidebar */}
      <Card className="w-80 p-0 overflow-hidden">
        <div
          className="p-4 text-center"
          style={{
            background: `linear-gradient(180deg, ${tokens.colors.secondary[100]} 0%, white 100%)`,
            borderBottom: `3px solid ${tokens.colors.secondary[300]}`,
          }}
        >
          <h3
            className="font-bold text-lg"
            style={{ fontFamily: tokens.fonts.display, color: tokens.colors.neutral[800] }}
          >
            🌻 Your Progress
          </h3>
        </div>

        <div className="p-5">
          {/* Plant Progress */}
          <div className="text-center mb-6">
            <ProgressPlant progress={65} size={120} />
          </div>

          {/* Milestones */}
          <div className="space-y-3 mb-6">
            <p
              className="text-sm font-bold uppercase tracking-wide"
              style={{ color: tokens.colors.neutral[500] }}
            >
              Growth Milestones
            </p>
            {[
              { text: 'Identify quadratic equations', done: true, emoji: '🌱' },
              { text: 'Factor simple quadratics', done: true, emoji: '🌿' },
              { text: 'Find roots using factoring', done: false, emoji: '🌷' },
              { text: 'Check your solutions', done: false, emoji: '🌻' },
            ].map((obj, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-2 rounded-xl"
                style={{
                  background: obj.done ? tokens.colors.primary[50] : tokens.colors.neutral[100],
                }}
              >
                <span className="text-xl">{obj.done ? '✅' : obj.emoji}</span>
                <span
                  className="text-sm font-medium"
                  style={{
                    color: obj.done ? tokens.colors.primary[700] : tokens.colors.neutral[500],
                    textDecoration: obj.done ? 'none' : 'none',
                  }}
                >
                  {obj.text}
                </span>
              </div>
            ))}
          </div>

          {/* Rewards */}
          <div
            className="p-4 rounded-2xl text-center"
            style={{ background: tokens.colors.secondary[100], border: `3px solid ${tokens.colors.secondary[300]}` }}
          >
            <p className="text-sm font-bold mb-2" style={{ color: tokens.colors.secondary[700] }}>
              🎁 Complete to earn:
            </p>
            <div className="flex justify-center gap-3">
              <span className="text-3xl">🥕</span>
              <span className="text-3xl">⭐</span>
              <span className="text-3xl">🏆</span>
            </div>
          </div>
        </div>
      </Card>
    </div>

);
};

// ============================================
// PAGE: LANDING
// ============================================

const LandingPage = ({ onEnterApp }) => {
return (

<div
className="min-h-screen relative overflow-hidden"
style={{ background: `linear-gradient(180deg, ${tokens.colors.sky.light} 0%, ${tokens.colors.cream} 50%, ${tokens.colors.primary[100]} 100%)` }} >
{/_ Animated clouds _/}
<div className="absolute top-10 left-10 animate-pulse">
<CloudDecoration className="w-32" />
</div>
<div className="absolute top-20 right-20 animate-pulse" style={{ animationDelay: '1s' }}>
<CloudDecoration className="w-40" />
</div>
<div className="absolute top-40 left-1/3 animate-pulse" style={{ animationDelay: '0.5s' }}>
<CloudDecoration className="w-24" />
</div>

      {/* Sun */}
      <SunDecoration size={100} className="absolute top-8 right-32" />

      {/* Nav */}
      <nav className="relative z-50 px-8 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-6">
            <a
              href="#"
              className="font-bold"
              style={{ color: tokens.colors.neutral[600], fontFamily: tokens.fonts.display }}
            >
              Features
            </a>
            <a
              href="#"
              className="font-bold"
              style={{ color: tokens.colors.neutral[600], fontFamily: tokens.fonts.display }}
            >
              For Teachers
            </a>
            <a
              href="#"
              className="font-bold"
              style={{ color: tokens.colors.neutral[600], fontFamily: tokens.fonts.display }}
            >
              Pricing
            </a>
            <Button onClick={onEnterApp}>
              Enter Garden! 🌻
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-16 pb-32 px-8">
        <div className="max-w-6xl mx-auto flex items-center gap-12">
          <div className="flex-1">
            <Badge variant="success" icon={Sparkles}>
              Open Source & Free Forever!
            </Badge>

            <h1
              className="text-6xl font-bold mt-6 mb-6 leading-tight"
              style={{ fontFamily: tokens.fonts.display, color: tokens.colors.neutral[800] }}
            >
              Where curiosity
              <br />
              <span
                style={{
                  color: tokens.colors.primary[500],
                  textShadow: `3px 3px 0 ${tokens.colors.primary[200]}`,
                }}
              >
                grows wild! 🌱
              </span>
            </h1>

            <p
              className="text-xl mb-8 leading-relaxed"
              style={{ color: tokens.colors.neutral[600], fontFamily: tokens.fonts.body }}
            >
              RaptScallions is the friendly AI learning garden where teachers plant seeds
              of knowledge and watch young minds bloom! 🌻
            </p>

            <div className="flex gap-4 mb-12">
              <Button size="lg" variant="primary" icon={Play} onClick={onEnterApp}>
                Start Growing!
              </Button>
              <Button size="lg" variant="secondary">
                Watch Demo 🎬
              </Button>
            </div>

            {/* Fun stats */}
            <div className="flex items-center gap-8">
              {[
                { emoji: '🏫', value: '500+', label: 'Schools' },
                { emoji: '👧', value: '50k+', label: 'Students' },
                { emoji: '🌟', value: '4.9', label: 'Rating' },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-3xl">{stat.emoji}</span>
                  <div>
                    <p
                      className="text-2xl font-bold"
                      style={{ fontFamily: tokens.fonts.display, color: tokens.colors.neutral[800] }}
                    >
                      {stat.value}
                    </p>
                    <p style={{ color: tokens.colors.neutral[500] }}>{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mascot area */}
          <div className="flex-1 relative">
            <div
              className="relative rounded-[3rem] p-8 flex items-center justify-center"
              style={{
                background: `linear-gradient(180deg, ${tokens.colors.earth.light}30 0%, ${tokens.colors.earth.light}10 100%)`,
                border: `4px dashed ${tokens.colors.earth.light}`,
                minHeight: 400,
              }}
            >
              <SproutMascot size={200} emotion="excited" />

              {/* Floating elements */}
              <div className="absolute top-8 left-8 animate-bounce" style={{ animationDelay: '0.2s' }}>
                <span className="text-4xl">📚</span>
              </div>
              <div className="absolute top-16 right-12 animate-bounce" style={{ animationDelay: '0.5s' }}>
                <span className="text-4xl">✨</span>
              </div>
              <div className="absolute bottom-20 left-12 animate-bounce" style={{ animationDelay: '0.8s' }}>
                <span className="text-4xl">🎯</span>
              </div>
              <div className="absolute bottom-12 right-8 animate-bounce">
                <span className="text-4xl">🌻</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        className="relative py-20 px-8"
        style={{ background: 'white' }}
      >
        {/* Grass border */}
        <div className="absolute top-0 left-0 right-0 -translate-y-full">
          <GrassDecoration className="w-full h-12" />
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-4xl font-bold mb-4"
              style={{ fontFamily: tokens.fonts.display, color: tokens.colors.neutral[800] }}
            >
              Everything you need to help them grow! 🌈
            </h2>
            <p className="text-lg" style={{ color: tokens.colors.neutral[500] }}>
              Powerful tools wrapped in a friendly package
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {[
              {
                emoji: '🛠️',
                title: 'Build Your Own Tools',
                description: 'No presets! Create exactly what your little gardeners need.',
                color: tokens.colors.primary[400],
              },
              {
                emoji: '🌱',
                title: 'Socratic Learning',
                description: 'AI that guides discovery, never gives away answers.',
                color: tokens.colors.secondary[400],
              },
              {
                emoji: '📊',
                title: 'Watch Them Grow',
                description: 'Beautiful dashboards show progress like plants in a garden.',
                color: tokens.colors.accent[400],
              },
              {
                emoji: '🔒',
                title: 'Safe & Sound',
                description: 'Built-in safety filters keep everything age-appropriate.',
                color: '#9b59b6',
              },
              {
                emoji: '🎮',
                title: 'Fun Rewards',
                description: 'Students earn veggies, trophies, and grow their garden!',
                color: '#3498db',
              },
              {
                emoji: '🏫',
                title: 'Easy Setup',
                description: 'One-click deployment. Your data stays with you.',
                color: tokens.colors.primary[500],
              },
            ].map((feature, i) => (
              <Card key={i} hover className="p-6 text-center">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4"
                  style={{ background: `${feature.color}20`, border: `3px solid ${feature.color}40` }}
                >
                  {feature.emoji}
                </div>
                <h3
                  className="text-xl font-bold mb-2"
                  style={{ fontFamily: tokens.fonts.display, color: tokens.colors.neutral[800] }}
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
      <section className="py-20 px-8" style={{ background: tokens.colors.cream }}>
        <div className="max-w-4xl mx-auto">
          <Card variant="garden" className="p-12 text-center relative overflow-hidden">
            <SproutMascot size={80} emotion="proud" className="mx-auto mb-4" />
            <h2
              className="text-3xl font-bold mb-4"
              style={{ fontFamily: tokens.fonts.display, color: tokens.colors.neutral[800] }}
            >
              Ready to start your garden? 🌻
            </h2>
            <p className="text-lg mb-8" style={{ color: tokens.colors.neutral[600] }}>
              Join thousands of teachers growing curious minds!
            </p>
            <div className="flex justify-center gap-4">
              <Button size="lg" variant="primary">
                Plant Your First Seed! 🌱
              </Button>
              <Button size="lg" variant="ghost">
                View on GitHub
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-8 px-8 relative"
        style={{ background: tokens.colors.primary[700] }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌱</span>
            <span
              className="text-lg font-bold text-white"
              style={{ fontFamily: tokens.fonts.display }}
            >
              raptscallions
            </span>
          </div>
          <p className="text-sm" style={{ color: tokens.colors.primary[200] }}>
            © 2025 RaptScallions. Open source under AGPL-3.0. Made with 💚
          </p>
        </div>
      </footer>
    </div>

);
};

// ============================================
// MAIN APP
// ============================================

export default function RaptScallionsGardenPrototype() {
const [view, setView] = useState('landing');
const [currentPage, setCurrentPage] = useState('dashboard');

// Load fonts
useEffect(() => {
const link = document.createElement('link');
link.href = 'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;500;600;700&display=swap';
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
achievements: <DashboardPage />,
};

const pageTitles = {
dashboard: { title: '🏡 My Garden', subtitle: 'Watch your students grow!' },
tools: { title: '🛠️ Tool Shed', subtitle: 'Build amazing learning tools' },
chat: { title: '💬 Chat with Sprout', subtitle: 'Student: Alex Thompson' },
classes: { title: '🎒 My Classrooms', subtitle: '4 gardens this semester' },
assignments: { title: '📋 Tasks', subtitle: 'Things to plant and harvest' },
achievements: { title: '🏆 Trophy Garden', subtitle: 'Celebrate your wins!' },
};

return (

<div
className="min-h-screen"
style={{
        background: `linear-gradient(180deg, ${tokens.colors.sky.light} 0%, ${tokens.colors.cream} 100%)`,
        fontFamily: tokens.fonts.body,
      }} >
<Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
<div className="ml-72">
<TopBar {...pageTitles[currentPage]} />
<main className="p-6">
{pages[currentPage]}
</main>
</div>

      {/* Back to Landing */}
      <button
        onClick={() => setView('landing')}
        className="fixed bottom-4 right-4 px-4 py-2 rounded-2xl text-sm font-bold shadow-lg"
        style={{
          background: 'white',
          color: tokens.colors.neutral[600],
          border: `3px solid ${tokens.colors.neutral[200]}`,
          fontFamily: tokens.fonts.display,
        }}
      >
        ← Back to Landing
      </button>
    </div>

);
}
