import React, { useState } from 'react';
import { ArtworkMotif } from '../types/game';

interface GameArtworkProps {
  title: string;
  motif: ArtworkMotif;
  accentColor: string;
  coverImage?: string;
  className?: string;
}

function renderMotifIllustration(motif: ArtworkMotif, accent: string) {
  switch (motif) {
    case 'voxel':
      return (
        <g>
          <polygon points="100,26 144,48 100,70 56,48" fill="#22C55E" />
          <polygon points="56,48 100,70 100,114 56,92" fill="#78350F" />
          <polygon points="100,70 144,48 144,92 100,114" fill="#57260A" />
          <polygon points="100,26 144,48 100,70 56,48" fill="none" stroke="#86EFAC" strokeOpacity="0.4" strokeWidth="1.5" />
          <rect x="92" y="38" width="16" height="16" rx="2" fill="#34D399" opacity="0.85" />
        </g>
      );
    case 'parkour':
      return (
        <g>
          <polygon points="44,96 74,82 104,96 74,110" fill="#38BDF8" />
          <polygon points="94,70 124,56 154,70 124,84" fill="#10B981" />
          <polygon points="130,42 156,30 182,42 156,54" fill="#F59E0B" />
          <circle cx="156" cy="24" r="6" fill="#FDE68A" />
        </g>
      );
    case 'racing':
      return (
        <g>
          <polygon points="30,120 82,44 118,44 170,120" fill="#1E293B" />
          <line x1="100" y1="48" x2="100" y2="118" stroke="#F59E0B" strokeWidth="3" strokeDasharray="8 6" />
          <rect x="78" y="84" width="44" height="22" rx="6" fill={accent} />
          <rect x="85" y="88" width="30" height="8" rx="3" fill="#0F172A" />
          <circle cx="84" cy="102" r="3" fill="#EF4444" />
          <circle cx="116" cy="102" r="3" fill="#EF4444" />
        </g>
      );
    case 'tunnel':
      return (
        <g fill="none" stroke={accent}>
          <circle cx="100" cy="70" r="46" strokeWidth="3" strokeOpacity="0.35" />
          <circle cx="100" cy="70" r="33" strokeWidth="3" strokeOpacity="0.6" />
          <circle cx="100" cy="70" r="20" strokeWidth="3" strokeOpacity="0.85" />
          <path d="M100,24 A46,46 0 0,1 146,70" stroke="#F8FAFC" strokeWidth="5" />
          <path d="M67,70 A33,33 0 0,1 100,37" stroke="#F59E0B" strokeWidth="4" />
        </g>
      );
    case 'snake3d':
      return (
        <g>
          <rect x="44" y="76" width="22" height="22" rx="4" fill="#16A34A" />
          <rect x="68" y="76" width="22" height="22" rx="4" fill="#22C55E" />
          <rect x="92" y="76" width="22" height="22" rx="4" fill="#22C55E" />
          <rect x="92" y="52" width="22" height="22" rx="4" fill="#4ADE80" />
          <rect x="116" y="52" width="24" height="24" rx="5" fill="#86EFAC" />
          <circle cx="152" cy="40" r="9" fill="#F59E0B" />
        </g>
      );
    case 'billiards':
      return (
        <g>
          <rect x="34" y="28" width="132" height="84" rx="10" fill="#0F5132" stroke="#78350F" strokeWidth="6" />
          <circle cx="72" cy="70" r="10" fill="#F8FAFC" />
          <circle cx="116" cy="60" r="10" fill="#111827" />
          <circle cx="116" cy="80" r="10" fill="#EF4444" />
          <circle cx="134" cy="70" r="10" fill="#F59E0B" />
          <line x1="42" y1="90" x2="64" y2="75" stroke="#D97706" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      );
    case 'hockey':
      return (
        <g>
          <rect x="36" y="28" width="128" height="84" rx="14" fill="#0F172A" stroke="#38BDF8" strokeWidth="3" />
          <line x1="100" y1="28" x2="100" y2="112" stroke="#38BDF8" strokeOpacity="0.4" strokeWidth="2" />
          <circle cx="100" cy="70" r="16" fill="none" stroke="#38BDF8" strokeOpacity="0.4" strokeWidth="2" />
          <circle cx="64" cy="70" r="12" fill="#EF4444" />
          <circle cx="136" cy="70" r="12" fill="#38BDF8" />
          <circle cx="102" cy="56" r="7" fill="#F8FAFC" />
        </g>
      );
    case 'carrom':
      return (
        <g>
          <rect x="50" y="22" width="100" height="96" rx="8" fill="#D97706" fillOpacity="0.22" stroke="#D97706" strokeWidth="4" />
          <circle cx="62" cy="34" r="6" fill="#0B0E14" />
          <circle cx="138" cy="34" r="6" fill="#0B0E14" />
          <circle cx="62" cy="106" r="6" fill="#0B0E14" />
          <circle cx="138" cy="106" r="6" fill="#0B0E14" />
          <circle cx="100" cy="66" r="9" fill="#EF4444" />
          <circle cx="88" cy="74" r="7" fill="#FDE68A" />
          <circle cx="112" cy="74" r="7" fill="#1E293B" />
          <circle cx="100" cy="96" r="10" fill="#F8FAFC" stroke="#F59E0B" strokeWidth="2" />
        </g>
      );
    case 'golf':
      return (
        <g>
          <path d="M40,98 Q80,35 156,56 Q168,94 120,108 Q64,116 40,98 Z" fill="#15803D" />
          <circle cx="138" cy="70" r="7" fill="#0B0E14" />
          <line x1="138" y1="70" x2="138" y2="24" stroke="#F8FAFC" strokeWidth="2.5" />
          <polygon points="138,24 162,32 138,40" fill="#EF4444" />
          <circle cx="66" cy="90" r="6" fill="#FFFFFF" />
        </g>
      );
    case 'pinball':
      return (
        <g>
          <rect x="62" y="18" width="76" height="104" rx="18" fill="#1E293B" stroke={accent} strokeWidth="3" />
          <circle cx="84" cy="48" r="10" fill="#F59E0B" />
          <circle cx="116" cy="48" r="10" fill="#EF4444" />
          <circle cx="100" cy="72" r="8" fill="#38BDF8" />
          <line x1="72" y1="102" x2="94" y2="110" stroke="#F8FAFC" strokeWidth="5" strokeLinecap="round" />
          <line x1="128" y1="102" x2="106" y2="110" stroke="#F8FAFC" strokeWidth="5" strokeLinecap="round" />
          <circle cx="100" cy="92" r="5" fill="#E2E8F0" />
        </g>
      );
    case 'hoops':
      return (
        <g>
          <rect x="74" y="26" width="52" height="34" rx="4" fill="#E2E8F0" fillOpacity="0.18" stroke="#F8FAFC" strokeWidth="2" />
          <rect x="88" y="38" width="24" height="16" fill="none" stroke="#F97316" strokeWidth="2" />
          <ellipse cx="100" cy="62" rx="16" ry="5" fill="none" stroke="#EA580C" strokeWidth="3.5" />
          <path d="M86,64 L92,86 L108,86 L114,64" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 2" />
          <circle cx="64" cy="92" r="14" fill="#EA580C" />
          <path d="M52,92 Q64,84 76,92" fill="none" stroke="#1E293B" strokeWidth="2" />
        </g>
      );
    case 'soccer':
      return (
        <g>
          <rect x="44" y="30" width="112" height="54" fill="none" stroke="#E2E8F0" strokeWidth="3" />
          <circle cx="100" cy="94" r="16" fill="#F8FAFC" />
          <polygon points="100,84 107,90 104,98 96,98 93,90" fill="#0F172A" />
          <path d="M100,94 Q128,74 132,48" fill="none" stroke="#10B981" strokeWidth="2.5" strokeDasharray="4 4" />
        </g>
      );
    case 'archery':
      return (
        <g>
          <circle cx="122" cy="70" r="34" fill="#F8FAFC" />
          <circle cx="122" cy="70" r="24" fill="#38BDF8" />
          <circle cx="122" cy="70" r="14" fill="#EF4444" />
          <circle cx="122" cy="70" r="6" fill="#FACC15" />
          <line x1="48" y1="70" x2="118" y2="70" stroke="#F8FAFC" strokeWidth="3" />
          <polygon points="122,70 112,65 112,75" fill="#F8FAFC" />
        </g>
      );
    case 'sniper':
      return (
        <g>
          <circle cx="100" cy="70" r="40" fill="#0F172A" stroke="#94A3B8" strokeWidth="3" />
          <line x1="56" y1="70" x2="144" y2="70" stroke="#EF4444" strokeWidth="1.5" />
          <line x1="100" y1="26" x2="100" y2="114" stroke="#EF4444" strokeWidth="1.5" />
          <circle cx="100" cy="70" r="12" fill="none" stroke="#EF4444" strokeWidth="2" />
          <circle cx="100" cy="70" r="3" fill="#EF4444" />
        </g>
      );
    case 'slingshot':
      return (
        <g>
          <path d="M58,110 L58,76 L46,48 M58,76 L72,48" fill="none" stroke="#92400E" strokeWidth="6" strokeLinecap="round" />
          <line x1="46" y1="48" x2="72" y2="48" stroke="#F59E0B" strokeWidth="2" />
          <rect x="116" y="76" width="16" height="36" fill="#64748B" />
          <rect x="136" y="76" width="16" height="36" fill="#64748B" />
          <rect x="112" y="62" width="44" height="12" fill="#94A3B8" />
          <circle cx="134" cy="48" r="9" fill="#EF4444" />
        </g>
      );
    case 'fruit':
      return (
        <g>
          <circle cx="82" cy="74" r="22" fill="#EF4444" />
          <circle cx="82" cy="74" r="17" fill="#FB7185" />
          <circle cx="122" cy="60" r="18" fill="#FACC15" />
          <line x1="44" y1="104" x2="156" y2="36" stroke="#F8FAFC" strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    case 'stack':
      return (
        <g>
          <polygon points="100,82 142,96 100,110 58,96" fill="#D97706" />
          <polygon points="100,66 138,79 100,92 62,79" fill="#F59E0B" />
          <polygon points="100,50 134,62 100,74 66,62" fill="#FBBF24" />
          <polygon points="100,34 130,45 100,56 70,45" fill="#FDE68A" />
        </g>
      );
    case 'helix':
      return (
        <g>
          <rect x="92" y="20" width="16" height="100" rx="4" fill="#334155" />
          <ellipse cx="100" cy="44" rx="42" ry="12" fill="#38BDF8" fillOpacity="0.85" />
          <ellipse cx="100" cy="72" rx="42" ry="12" fill="#0284C7" fillOpacity="0.85" />
          <ellipse cx="100" cy="100" rx="42" ry="12" fill="#0369A1" fillOpacity="0.85" />
          <circle cx="120" cy="30" r="8" fill="#F59E0B" />
        </g>
      );
    case 'flight':
      return (
        <g>
          <rect x="118" y="16" width="22" height="36" rx="3" fill="#334155" />
          <rect x="118" y="82" width="22" height="44" rx="3" fill="#334155" />
          <polygon points="54,66 84,58 76,70 84,78" fill="#38BDF8" />
          <circle cx="76" cy="66" r="5" fill="#FDE68A" />
        </g>
      );
    case 'crossy':
      return (
        <g>
          <rect x="30" y="34" width="140" height="24" fill="#1E293B" />
          <rect x="30" y="64" width="140" height="24" fill="#0284C7" />
          <rect x="30" y="94" width="140" height="22" fill="#16A34A" />
          <rect x="48" y="40" width="32" height="14" rx="3" fill="#EF4444" />
          <rect x="110" y="69" width="44" height="14" rx="3" fill="#92400E" />
          <rect x="92" y="92" width="16" height="16" rx="3" fill="#F8FAFC" />
        </g>
      );
    case 'hopper':
      return (
        <g>
          <rect x="52" y="96" width="34" height="8" rx="4" fill="#22C55E" />
          <rect x="108" y="72" width="34" height="8" rx="4" fill="#38BDF8" />
          <rect x="64" y="46" width="34" height="8" rx="4" fill="#F59E0B" />
          <circle cx="80" cy="30" r="10" fill="#A855F7" />
        </g>
      );
    case 'knife':
      return (
        <g>
          <circle cx="100" cy="54" r="28" fill="#92400E" stroke="#D97706" strokeWidth="4" />
          <circle cx="100" cy="54" r="16" fill="#B45309" />
          <polygon points="97,80 103,80 101,114 99,114" fill="#E2E8F0" />
          <rect x="95" y="102" width="10" height="14" rx="2" fill="#F97316" />
        </g>
      );
    case 'colorring':
      return (
        <g fill="none" strokeWidth="8">
          <path d="M100,32 A38,38 0 0,1 138,70" stroke="#EC4899" />
          <path d="M138,70 A38,38 0 0,1 100,108" stroke="#38BDF8" />
          <path d="M100,108 A38,38 0 0,1 62,70" stroke="#FACC15" />
          <path d="M62,70 A38,38 0 0,1 100,32" stroke="#10B981" />
          <circle cx="100" cy="70" r="9" fill="#EC4899" stroke="none" />
        </g>
      );
    case 'gravity':
      return (
        <g>
          <line x1="32" y1="30" x2="168" y2="30" stroke="#14B8A6" strokeWidth="4" />
          <line x1="32" y1="110" x2="168" y2="110" stroke="#14B8A6" strokeWidth="4" />
          <polygon points="86,110 94,94 102,110" fill="#EF4444" />
          <polygon points="122,30 130,46 138,30" fill="#EF4444" />
          <rect x="54" y="46" width="18" height="18" rx="4" fill="#F8FAFC" />
          <path d="M63,68 L63,90" stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="3 3" />
        </g>
      );
    case 'breaker':
      return (
        <g>
          <rect x="44" y="28" width="26" height="10" rx="2" fill="#EF4444" />
          <rect x="74" y="28" width="26" height="10" rx="2" fill="#F59E0B" />
          <rect x="104" y="28" width="26" height="10" rx="2" fill="#10B981" />
          <rect x="134" y="28" width="26" height="10" rx="2" fill="#38BDF8" />
          <rect x="59" y="42" width="26" height="10" rx="2" fill="#F59E0B" />
          <rect x="119" y="42" width="26" height="10" rx="2" fill="#10B981" />
          <rect x="74" y="102" width="52" height="10" rx="5" fill="#F8FAFC" />
          <circle cx="104" cy="74" r="6" fill="#EAB308" />
        </g>
      );
    case 'invaders':
      return (
        <g fill="#22D3EE">
          <rect x="64" y="34" width="18" height="12" rx="2" />
          <rect x="91" y="34" width="18" height="12" rx="2" />
          <rect x="118" y="34" width="18" height="12" rx="2" />
          <rect x="76" y="54" width="18" height="12" rx="2" fill="#A855F7" />
          <rect x="106" y="54" width="18" height="12" rx="2" fill="#A855F7" />
          <polygon points="100,88 86,108 114,108" fill="#10B981" />
          <line x1="100" y1="68" x2="100" y2="84" stroke="#FACC15" strokeWidth="3" />
        </g>
      );
    case 'asteroid':
      return (
        <g>
          <polygon points="58,42 78,34 86,52 68,64 50,56" fill="#64748B" stroke="#94A3B8" strokeWidth="2" />
          <polygon points="122,74 146,66 154,88 134,100 116,90" fill="#475569" stroke="#94A3B8" strokeWidth="2" />
          <polygon points="94,64 84,88 104,84" fill="#F8FAFC" />
        </g>
      );
    case 'squadron':
      return (
        <g>
          <polygon points="100,66 82,102 100,94 118,102" fill="#3B82F6" />
          <polygon points="68,30 56,48 80,48" fill="#EF4444" />
          <polygon points="132,30 120,48 144,48" fill="#EF4444" />
          <line x1="92" y1="48" x2="92" y2="66" stroke="#38BDF8" strokeWidth="2.5" />
          <line x1="108" y1="48" x2="108" y2="66" stroke="#38BDF8" strokeWidth="2.5" />
        </g>
      );
    case 'towerdefense':
      return (
        <g>
          <path d="M30,86 L78,86 L78,48 L128,48 L128,88 L170,88" fill="none" stroke="#475569" strokeWidth="14" strokeLinejoin="round" />
          <circle cx="102" cy="72" r="13" fill="#F59E0B" />
          <rect x="100" y="54" width="5" height="16" fill="#F8FAFC" />
          <circle cx="56" cy="86" r="6" fill="#EF4444" />
          <circle cx="128" cy="64" r="6" fill="#EF4444" />
        </g>
      );
    case 'pacman':
      return (
        <g>
          <path d="M84,70 L106,54 A26,26 0 1,0 106,86 Z" fill="#FACC15" />
          <circle cx="118" cy="70" r="4" fill="#F8FAFC" />
          <circle cx="134" cy="70" r="4" fill="#F8FAFC" />
          <path d="M144,82 L144,62 A12,12 0 0,1 168,62 L168,82 L162,76 L156,82 L150,76 Z" fill="#EF4444" />
        </g>
      );
    case 'trench':
      return (
        <g>
          <rect x="28" y="96" width="144" height="24" fill="#44403C" />
          <rect x="40" y="76" width="28" height="22" rx="3" fill="#78716C" />
          <line x1="64" y1="82" x2="92" y2="66" stroke="#D6D3D1" strokeWidth="5" strokeLinecap="round" />
          <path d="M92,66 Q126,38 152,84" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="4 4" />
          <rect x="138" y="82" width="24" height="14" rx="2" fill="#EF4444" />
        </g>
      );
    case 'tetris':
      return (
        <g>
          <rect x="64" y="64" width="18" height="18" fill="#06B6D4" stroke="#0B0E14" strokeWidth="2" />
          <rect x="82" y="64" width="18" height="18" fill="#06B6D4" stroke="#0B0E14" strokeWidth="2" />
          <rect x="100" y="64" width="18" height="18" fill="#06B6D4" stroke="#0B0E14" strokeWidth="2" />
          <rect x="82" y="46" width="18" height="18" fill="#06B6D4" stroke="#0B0E14" strokeWidth="2" />
          <rect x="82" y="92" width="18" height="18" fill="#F59E0B" stroke="#0B0E14" strokeWidth="2" />
          <rect x="100" y="92" width="18" height="18" fill="#F59E0B" stroke="#0B0E14" strokeWidth="2" />
          <rect x="118" y="92" width="18" height="18" fill="#10B981" stroke="#0B0E14" strokeWidth="2" />
        </g>
      );
    case 'num2048':
      return (
        <g>
          <rect x="58" y="28" width="40" height="40" rx="6" fill="#F59E0B" />
          <rect x="102" y="28" width="40" height="40" rx="6" fill="#D97706" />
          <rect x="58" y="72" width="40" height="40" rx="6" fill="#334155" />
          <rect x="102" y="72" width="40" height="40" rx="6" fill="#EF4444" />
          <text x="78" y="54" textAnchor="middle" fill="#0B0E14" fontSize="14" fontWeight="800">1024</text>
          <text x="122" y="54" textAnchor="middle" fill="#FFF" fontSize="14" fontWeight="800">2048</text>
        </g>
      );
    case 'gems':
      return (
        <g>
          <polygon points="74,34 90,50 74,66 58,50" fill="#EC4899" />
          <polygon points="118,34 134,50 118,66 102,50" fill="#38BDF8" />
          <polygon points="74,74 90,90 74,106 58,90" fill="#10B981" />
          <polygon points="118,74 134,90 118,106 102,90" fill="#F59E0B" />
        </g>
      );
    case 'bubbles':
      return (
        <g>
          <circle cx="78" cy="40" r="12" fill="#8B5CF6" />
          <circle cx="102" cy="40" r="12" fill="#EC4899" />
          <circle cx="126" cy="40" r="12" fill="#8B5CF6" />
          <circle cx="90" cy="60" r="12" fill="#38BDF8" />
          <circle cx="114" cy="60" r="12" fill="#EC4899" />
          <circle cx="100" cy="102" r="12" fill="#EC4899" />
          <line x1="100" y1="90" x2="112" y2="70" stroke="#F8FAFC" strokeWidth="2" strokeDasharray="3 3" />
        </g>
      );
    case 'tubes':
      return (
        <g>
          <rect x="60" y="34" width="22" height="72" rx="10" fill="none" stroke="#94A3B8" strokeWidth="2.5" />
          <rect x="63" y="64" width="16" height="18" fill="#10B981" />
          <rect x="63" y="84" width="16" height="18" rx="6" fill="#10B981" />
          <rect x="92" y="34" width="22" height="72" rx="10" fill="none" stroke="#94A3B8" strokeWidth="2.5" />
          <rect x="95" y="64" width="16" height="18" fill="#F59E0B" />
          <rect x="95" y="84" width="16" height="18" rx="6" fill="#38BDF8" />
          <rect x="124" y="34" width="22" height="72" rx="10" fill="none" stroke="#94A3B8" strokeWidth="2.5" />
        </g>
      );
    case 'chess':
      return (
        <g>
          <rect x="60" y="30" width="40" height="40" fill="#F1F5F9" />
          <rect x="100" y="30" width="40" height="40" fill="#334155" />
          <rect x="60" y="70" width="40" height="40" fill="#334155" />
          <rect x="100" y="70" width="40" height="40" fill="#F1F5F9" />
          <path d="M90,94 L110,94 L106,66 L112,62 L100,46 L88,62 L94,66 Z" fill="#D97706" stroke="#0B0E14" strokeWidth="2" />
        </g>
      );
    case 'checkers':
      return (
        <g>
          <rect x="60" y="30" width="40" height="40" fill="#334155" />
          <rect x="100" y="30" width="40" height="40" fill="#E2E8F0" />
          <rect x="60" y="70" width="40" height="40" fill="#E2E8F0" />
          <rect x="100" y="70" width="40" height="40" fill="#334155" />
          <circle cx="80" cy="50" r="14" fill="#DC2626" stroke="#FCA5A5" strokeWidth="2" />
          <circle cx="120" cy="90" r="14" fill="#0F172A" stroke="#94A3B8" strokeWidth="2" />
        </g>
      );
    case 'connect4':
      return (
        <g>
          <rect x="52" y="28" width="96" height="84" rx="8" fill="#1D4ED8" />
          <circle cx="72" cy="50" r="10" fill="#0B0E14" />
          <circle cx="100" cy="50" r="10" fill="#EF4444" />
          <circle cx="128" cy="50" r="10" fill="#0B0E14" />
          <circle cx="72" cy="76" r="10" fill="#FACC15" />
          <circle cx="100" cy="76" r="10" fill="#FACC15" />
          <circle cx="128" cy="76" r="10" fill="#FACC15" />
          <circle cx="72" cy="100" r="10" fill="#EF4444" />
          <circle cx="100" cy="100" r="10" fill="#FACC15" />
          <circle cx="128" cy="100" r="10" fill="#EF4444" />
        </g>
      );
    case 'gomoku':
      return (
        <g>
          <rect x="54" y="26" width="92" height="88" rx="6" fill="#92400E" fillOpacity="0.45" />
          <line x1="70" y1="36" x2="70" y2="104" stroke="#CBD5E1" strokeOpacity="0.4" />
          <line x1="100" y1="36" x2="100" y2="104" stroke="#CBD5E1" strokeOpacity="0.4" />
          <line x1="130" y1="36" x2="130" y2="104" stroke="#CBD5E1" strokeOpacity="0.4" />
          <line x1="64" y1="50" x2="136" y2="50" stroke="#CBD5E1" strokeOpacity="0.4" />
          <line x1="64" y1="80" x2="136" y2="80" stroke="#CBD5E1" strokeOpacity="0.4" />
          <circle cx="70" cy="50" r="9" fill="#0F172A" stroke="#64748B" />
          <circle cx="100" cy="80" r="9" fill="#F8FAFC" />
          <circle cx="130" cy="50" r="9" fill="#14B8A6" />
        </g>
      );
    case 'sudoku':
      return (
        <g>
          <rect x="58" y="28" width="84" height="84" rx="6" fill="#1E293B" stroke="#6366F1" strokeWidth="2" />
          <line x1="86" y1="28" x2="86" y2="112" stroke="#475569" strokeWidth="2" />
          <line x1="114" y1="28" x2="114" y2="112" stroke="#475569" strokeWidth="2" />
          <line x1="58" y1="56" x2="142" y2="56" stroke="#475569" strokeWidth="2" />
          <line x1="58" y1="84" x2="142" y2="84" stroke="#475569" strokeWidth="2" />
          <text x="72" y="48" textAnchor="middle" fill="#F8FAFC" fontSize="14" fontWeight="700">9</text>
          <text x="100" y="76" textAnchor="middle" fill="#818CF8" fontSize="14" fontWeight="700">4</text>
          <text x="128" y="104" textAnchor="middle" fill="#F8FAFC" fontSize="14" fontWeight="700">7</text>
        </g>
      );
    case 'mines':
      return (
        <g>
          <rect x="60" y="30" width="80" height="80" rx="6" fill="#1E293B" stroke="#475569" strokeWidth="2" />
          <circle cx="100" cy="70" r="16" fill="#EF4444" />
          <line x1="76" y1="70" x2="124" y2="70" stroke="#EF4444" strokeWidth="4" />
          <line x1="100" y1="46" x2="100" y2="94" stroke="#EF4444" strokeWidth="4" />
          <circle cx="100" cy="70" r="6" fill="#0B0E14" />
        </g>
      );
    case 'slide15':
      return (
        <g>
          <rect x="58" y="28" width="40" height="40" rx="6" fill="#3B82F6" />
          <rect x="102" y="28" width="40" height="40" rx="6" fill="#1D4ED8" />
          <rect x="58" y="72" width="40" height="40" rx="6" fill="#1E40AF" />
          <rect x="102" y="72" width="40" height="40" rx="6" fill="#0F172A" stroke="#334155" strokeDasharray="4 4" />
          <text x="78" y="54" textAnchor="middle" fill="#FFF" fontSize="16" fontWeight="700">1</text>
          <text x="122" y="54" textAnchor="middle" fill="#FFF" fontSize="16" fontWeight="700">2</text>
          <text x="78" y="98" textAnchor="middle" fill="#FFF" fontSize="16" fontWeight="700">3</text>
        </g>
      );
    case 'pipes':
      return (
        <g fill="none" stroke="#0EA5E9" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round">
          <path d="M44,48 L92,48 L92,92 L156,92" />
          <circle cx="44" cy="48" r="7" fill="#10B981" stroke="none" />
          <circle cx="156" cy="92" r="7" fill="#F59E0B" stroke="none" />
        </g>
      );
    case 'laser':
      return (
        <g>
          <line x1="42" y1="92" x2="110" y2="92" stroke="#F43F5E" strokeWidth="3.5" />
          <line x1="110" y1="92" x2="110" y2="38" stroke="#F43F5E" strokeWidth="3.5" />
          <line x1="98" y1="104" x2="122" y2="80" stroke="#E2E8F0" strokeWidth="5" strokeLinecap="round" />
          <polygon points="110,24 120,38 100,38" fill="#38BDF8" />
        </g>
      );
    case 'memory':
      return (
        <g>
          <rect x="54" y="34" width="38" height="54" rx="6" fill="#334155" stroke="#A855F7" strokeWidth="2" />
          <rect x="108" y="48" width="38" height="54" rx="6" fill="#A855F7" />
          <polygon points="127,64 136,75 127,86 118,75" fill="#F8FAFC" />
        </g>
      );
    case 'wordhunt':
      return (
        <g>
          <rect x="52" y="28" width="96" height="84" rx="8" fill="#1E293B" />
          <rect x="60" y="42" width="80" height="18" rx="9" fill="#14B8A6" fillOpacity="0.35" />
          <text x="100" y="56" textAnchor="middle" fill="#5EEAD4" fontSize="14" fontWeight="700" letterSpacing="4">PLAY</text>
          <text x="100" y="84" textAnchor="middle" fill="#64748B" fontSize="14" fontWeight="700" letterSpacing="4">WINX</text>
        </g>
      );
    case 'scramble':
      return (
        <g>
          <rect x="44" y="52" width="24" height="32" rx="5" fill="#F97316" />
          <rect x="74" y="44" width="24" height="32" rx="5" fill="#FB923C" />
          <rect x="104" y="52" width="24" height="32" rx="5" fill="#F97316" />
          <rect x="134" y="44" width="24" height="32" rx="5" fill="#EA580C" />
          <text x="56" y="73" textAnchor="middle" fill="#0B0E14" fontSize="15" fontWeight="800">A</text>
          <text x="86" y="65" textAnchor="middle" fill="#0B0E14" fontSize="15" fontWeight="800">Y</text>
          <text x="116" y="73" textAnchor="middle" fill="#0B0E14" fontSize="15" fontWeight="800">A</text>
          <text x="146" y="65" textAnchor="middle" fill="#0B0E14" fontSize="15" fontWeight="800">N</text>
        </g>
      );
    case 'piano':
      return (
        <g>
          <rect x="56" y="22" width="20" height="96" fill="#0F172A" stroke="#334155" />
          <rect x="78" y="22" width="20" height="96" fill="#E11D48" />
          <rect x="100" y="22" width="20" height="96" fill="#0F172A" stroke="#334155" />
          <rect x="122" y="22" width="20" height="96" fill="#F8FAFC" />
          <rect x="102" y="46" width="16" height="30" rx="2" fill="#E11D48" />
        </g>
      );
    case 'simon':
      return (
        <g>
          <path d="M100,66 L100,26 A40,40 0 0,1 140,66 Z" fill="#EF4444" />
          <path d="M100,74 L140,74 A40,40 0 0,1 100,114 Z" fill="#3B82F6" />
          <path d="M92,74 L92,114 A40,40 0 0,1 52,74 Z" fill="#FACC15" />
          <path d="M92,66 L52,66 A40,40 0 0,1 92,26 Z" fill="#10B981" />
          <circle cx="96" cy="70" r="14" fill="#0B0E14" />
        </g>
      );
    case 'reflex':
      return (
        <g>
          <circle cx="72" cy="50" r="14" fill="#334155" />
          <circle cx="128" cy="50" r="14" fill="#10B981" />
          <circle cx="72" cy="90" r="14" fill="#EF4444" />
          <circle cx="128" cy="90" r="14" fill="#F59E0B" />
        </g>
      );
    case 'math':
    default:
      return (
        <g>
          <rect x="52" y="34" width="96" height="72" rx="10" fill="#1E293B" stroke="#38BDF8" strokeWidth="2" />
          <text x="100" y="77" textAnchor="middle" fill="#38BDF8" fontSize="22" fontWeight="800">7 × 8 = ?</text>
        </g>
      );
  }
}

export const GameArtwork: React.FC<GameArtworkProps> = ({
  title,
  motif,
  accentColor,
  coverImage,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  if (coverImage && !imgError) {
    return (
      <div className={`relative overflow-hidden bg-[#121722] ${className}`}>
        <img
          src={coverImage}
          alt={title}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14]/90 via-[#0B0E14]/25 to-transparent" />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-[#121722] flex items-center justify-center ${className}`}
      style={{
        backgroundImage: `radial-gradient(circle at 30% 25%, ${accentColor}26 0%, #121722 68%)`,
      }}
    >
      <svg
        viewBox="0 0 200 140"
        className="w-full h-full"
        aria-hidden="true"
      >
        <defs>
          <pattern id={`grid-${motif}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="200" height="140" fill={`url(#grid-${motif})`} />
        {renderMotifIllustration(motif, accentColor)}
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14]/75 via-transparent to-transparent" />
    </div>
  );
};
