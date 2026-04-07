/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  School, 
  MenuBook, 
  AutoAwesome, 
  Person, 
  Lock, 
  Visibility, 
  VisibilityOff,
  ArrowForward, 
  CloudUpload, 
  Description, 
  Analytics, 
  MoreVert, 
  PictureAsPdf, 
  TipsAndUpdates, 
  ChevronRight, 
  History, 
  Bookmark, 
  Shield, 
  Notifications, 
  RateReview, 
  Info, 
  Verified, 
  Settings,
  CheckCircle,
  Refresh,
  Warning,
  Translate,
  FormatQuote,
  Summarize,
  Assessment,
  AccountTree,
  PhoneIphone,
  LockOpen,
  VerifiedUser,
  Close,
  Search,
  FilterList,
  Star,
  StarBorder,
  OpenInNew,
  FileDownload,
  Send,
  SmartToy,
  AutoFixHigh
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'motion/react';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';
import { GoogleGenAI, Type } from "@google/genai";
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import ReactMarkdown from 'react-markdown';
import { toPng } from 'html-to-image';
import { WeChatIcon, GoogleIcon } from './constants';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// --- Types ---

type View = 'login' | 'register' | 'setup' | 'upload' | 'analysis' | 'report' | 'profile' | 'library' | 'history' | 'starred';

interface UserProfile {
  name: string;
  studentId: string;
  university: string;
  department: string;
  gender?: 'male' | 'female';
}

interface ThesisFile {
  id: string;
  name: string;
  size: string;
  type: string;
  date: string;
  status: '待分析' | '分析中' | '已完成' | '失败';
  text?: string;
  error?: string;
  analysis?: ThesisAnalysis;
}

interface ThesisAnalysis {
  wordCount: number;
  duplicateRate: string;
  aiRate: string;
  readability: number;
  abstractEval: string;
  abstractScore: number;
  abstractDetails?: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };
  structureEval: { name: string; status: 'ok' | 'warning'; detail?: string }[];
  structureScore: number;
  grammarErrors: number;
  academicSuggestions: number;
  polishingSuggestions?: {
    original: string;
    suggested: string;
    reason: string;
    type: 'grammar' | 'tone' | 'clarity';
  }[];
  innovation: number;
  logic: number;
  norm: number;
  expression: number;
}

interface Literature {
  id: string;
  title: string;
  author: string;
  year: string;
  abstract: string;
  type: 'pdf' | 'docx';
  size: string;
  doi?: string;
  tags: string[];
  relevance?: number; // 匹配度 0-100
  recommendReason?: string; // 推荐理由
  source?: 'CNKI' | 'arXiv' | 'IEEE' | 'Local'; // 来源
  isStarred?: boolean;
}

const MOCK_LIBRARY: Literature[] = [
  {
    id: 'lib-1',
    title: '深度学习在学术写作中的应用研究',
    author: '张伟, 李华',
    year: '2024',
    abstract: '本文探讨了大语言模型对学术研究效率的影响，分析了AI辅助写作在逻辑构建、文献综述自动生成等方面的应用潜力与局限性。',
    type: 'pdf',
    size: '2.4MB',
    doi: '10.1145/1234567.1234568',
    tags: ['人工智能', '学术写作'],
    source: 'Local'
  },
  {
    id: 'lib-2',
    title: '数字化时代同行评审制度的演变',
    author: 'Smith, J.',
    year: '2023',
    abstract: '一项关于数字时代同行评审流程演变的综合研究，讨论了开放获取、盲审机制以及AI评审员在未来的可能性。',
    type: 'docx',
    size: '1.1MB',
    tags: ['同行评审', '学术政策'],
    source: 'Local'
  },
  {
    id: 'rec-1',
    title: '基于Transformer的学术论文逻辑一致性检测',
    author: 'Chen, L.',
    year: '2025',
    abstract: '提出一种新型架构，专门用于检测学术论文中论点与证据之间的逻辑断层，是您当前研究的直接技术补充。',
    type: 'pdf',
    size: '1.8MB',
    tags: ['Transformer', '逻辑检测'],
    relevance: 98,
    recommendReason: '研究方法与您的论文高度互补',
    source: 'arXiv'
  },
  {
    id: 'rec-2',
    title: '大语言模型在跨学科研究中的知识整合能力',
    author: 'Garcia, M.',
    year: '2024',
    abstract: '评估了GPT-4等模型在整合生物学与计算机科学知识时的表现，为您提供了跨学科分析的范式参考。',
    type: 'pdf',
    size: '3.1MB',
    tags: ['跨学科', '知识整合'],
    relevance: 85,
    recommendReason: '提供了跨学科研究的参考范式',
    source: 'IEEE'
  },
  {
    id: 'ext-1',
    title: '中国人工智能学术出版的现状与挑战',
    author: '赵敏',
    year: '2024',
    abstract: '分析了过去十年中国在AI领域的论文产出质量，探讨了中文学术期刊在全球影响力提升中的关键因素。',
    type: 'pdf',
    size: '2.9MB',
    tags: ['学术出版', '中国AI'],
    source: 'CNKI'
  }
];

// --- Components ---

const LiteratureLibraryModal = ({ 
  isOpen, 
  onClose, 
  onImport,
  libraryItems,
  onToggleStar
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onImport: (lit: Literature) => void;
  libraryItems: Literature[];
  onToggleStar: (lit: Literature) => void;
}) => {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'mine' | 'recommend' | 'external'>('mine');
  const [externalSource, setExternalSource] = useState<'CNKI' | 'arXiv' | 'IEEE'>('CNKI');
  const [realResults, setRealResults] = useState<Literature[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchRealLiterature = async (query: string, mode: 'recommend' | 'search') => {
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = mode === 'recommend' 
        ? `基于以下主题推荐3篇真实的学术论文：${query}。请提供真实的标题、作者、年份、摘要和DOI。`
        : `在 ${externalSource} 数据库中搜索关于 "${query}" 的真实学术论文。请返回3-5篇真实结果。`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                author: { type: Type.STRING },
                year: { type: Type.STRING },
                abstract: { type: Type.STRING },
                doi: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                relevance: { type: Type.NUMBER },
                recommendReason: { type: Type.STRING }
              },
              required: ["title", "author", "year", "abstract"]
            }
          }
        }
      });

      const results = JSON.parse(response.text || "[]").map((item: any, index: number) => ({
        ...item,
        id: `real-${Date.now()}-${index}`,
        type: 'pdf',
        size: `${(Math.random() * 5 + 1).toFixed(1)}MB`,
        source: externalSource,
        tags: item.tags || ['学术', '真实文献']
      }));

      setRealResults(results);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'recommend' && realResults.length === 0) {
      searchRealLiterature("人工智能学术写作与逻辑检测", 'recommend');
    }
  }, [tab]);

  const filtered = (tab === 'mine' 
    ? libraryItems.filter(l => (l.title.includes(search) || l.author.includes(search)) && l.source === 'Local')
    : realResults).map(item => ({
      ...item,
      isStarred: libraryItems.find(l => l.id === item.id)?.isStarred || false
    }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="relative w-full max-w-2xl bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-outline-variant/10">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <MenuBook className="text-primary" />
              <h2 className="text-xl font-bold text-primary">文献库导入</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-surface-container-low rounded-full transition-colors">
              <Close />
            </button>
          </div>

          <div className="flex gap-4 mb-6 overflow-x-auto pb-2 no-scrollbar">
            {['mine', 'recommend', 'external'].map((t) => (
              <button 
                key={t}
                onClick={() => setTab(t as any)}
                className={`whitespace-nowrap text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-full transition-all ${
                  tab === t ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-on-secondary-container hover:bg-surface-container-low'
                }`}
              >
                {t === 'mine' ? '我的文献' : t === 'recommend' ? '智能推荐' : '外部数据库'}
              </button>
            ))}
          </div>

          {tab === 'external' && (
            <div className="flex gap-2 mb-6 bg-surface-container-low p-1 rounded-xl">
              {['CNKI', 'arXiv', 'IEEE'].map((s) => (
                <button
                  key={s}
                  onClick={() => setExternalSource(s as any)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${
                    externalSource === s ? 'bg-white text-primary shadow-sm' : 'text-outline-variant hover:text-on-surface'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant !text-xl" />
            <input 
              type="text" 
              placeholder={tab === 'mine' ? "搜索我的文献..." : `在 ${externalSource} 中搜索真实文献...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tab !== 'mine') {
                  searchRealLiterature(search, 'search');
                }
              }}
              className="w-full pl-12 pr-12 py-3 bg-surface-container-low border-0 rounded-xl focus:outline-none focus:bg-white transition-all placeholder:text-outline-variant/60 text-sm"
            />
            {tab !== 'mine' && (
              <button 
                onClick={() => searchRealLiterature(search, 'search')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                <Search className="!text-sm" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-xs font-bold text-primary animate-pulse uppercase tracking-widest text-center">
                正在连接云端数据库<br/>检索真实文献...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-outline-variant">
              <Search className="!text-4xl mb-2 opacity-20" />
              <p className="text-sm">未找到相关文献</p>
            </div>
          ) : (
            filtered.map((lit) => (
              <div 
                key={lit.id}
                onClick={() => setSelectedId(lit.id)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer group ${
                  selectedId === lit.id 
                    ? 'border-primary bg-primary/5 shadow-md' 
                    : 'border-transparent bg-surface-container-low hover:bg-surface-container-high'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {lit.type === 'pdf' ? <PictureAsPdf className="text-red-500 !text-xl" /> : <Description className="text-blue-500 !text-xl" />}
                    <div className="flex flex-col">
                      <h3 className="font-bold text-on-surface group-hover:text-primary transition-colors leading-tight">{lit.title}</h3>
                      <span className="text-[9px] font-bold text-primary/40 uppercase tracking-tighter mt-0.5">Source: {lit.source}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {lit.relevance && (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-primary">{lit.relevance}% Match</span>
                        <div className="w-12 h-1 bg-surface-container-high rounded-full mt-0.5 overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${lit.relevance}%` }} />
                        </div>
                      </div>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStar(lit);
                      }}
                      className={`transition-colors p-1 ${lit.isStarred ? 'text-amber-500' : 'text-outline-variant hover:text-amber-500'}`}
                    >
                      {lit.isStarred ? <Star className="!text-xl" /> : <StarBorder className="!text-xl" />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-on-secondary-container uppercase tracking-wider mb-3">
                  <span className="flex items-center gap-1"><Person className="!text-sm" /> {lit.author}</span>
                  <span className="flex items-center gap-1"><History className="!text-sm" /> {lit.year}</span>
                  <span className="flex items-center gap-1"><Description className="!text-sm" /> {lit.size}</span>
                  {lit.doi && <span className="text-primary/60">DOI: {lit.doi}</span>}
                </div>
                
                {lit.recommendReason && (
                  <div className="mb-3 p-2 bg-primary/5 rounded-lg border-l-2 border-primary">
                    <p className="text-[10px] font-medium text-primary italic">
                      AI 推荐理由: {lit.recommendReason}
                    </p>
                  </div>
                )}

                <p className="text-xs text-on-secondary-container line-clamp-2 leading-relaxed mb-3">
                  {lit.abstract}
                </p>
                <div className="flex gap-2">
                  {lit.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-surface-container-lowest text-[9px] font-bold text-outline-variant rounded border border-outline-variant/10">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-outline-variant/10 bg-surface-container-lowest flex gap-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>取消</Button>
          <Button 
            variant="primary" 
            className="flex-[2]" 
            disabled={!selectedId}
            onClick={() => {
              const lit = filtered.find(l => l.id === selectedId);
              if (lit) onImport(lit);
            }}
          >
            确认导入
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
const Button = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  onClick,
  type = 'button',
  disabled = false
}: { 
  children: React.ReactNode; 
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'error';
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) => {
  const baseStyles = "py-4 px-6 rounded-xl font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";
  const variants = {
    primary: "academic-gradient text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:opacity-95",
    secondary: "bg-surface-container-high text-primary hover:bg-surface-container-high/80",
    ghost: "bg-transparent text-primary hover:bg-primary/5",
    outline: "border border-primary/20 text-primary hover:bg-primary/5",
    error: "border-2 border-error-container text-error hover:bg-error-container/20"
  };

  return (
    <button 
      type={type} 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

const Input = ({ 
  label, 
  placeholder, 
  type = 'text', 
  icon: Icon,
  showPasswordToggle = false
}: { 
  label: string; 
  placeholder: string; 
  type?: string; 
  icon?: React.ElementType;
  showPasswordToggle?: boolean;
}) => {
  const [show, setShow] = useState(false);
  const inputType = showPasswordToggle ? (show ? 'text' : 'password') : type;

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider text-on-secondary-container px-1">
        {label}
      </label>
      <div className="relative group">
        {Icon && (
          <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors !text-xl" />
        )}
        <input 
          type={inputType}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-3.5 bg-surface-container-low border-0 rounded-xl focus:outline-none focus:bg-white transition-all placeholder:text-outline-variant/60 text-sm"
        />
        {showPasswordToggle && (
          <button 
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface transition-colors"
          >
            {show ? <VisibilityOff className="!text-xl" /> : <Visibility className="!text-xl" />}
          </button>
        )}
      </div>
    </div>
  );
};

// --- Views ---

const LoginView = ({ onNavigate }: { onNavigate: (v: View) => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="w-full max-w-md mx-auto flex flex-col items-center"
  >
    <header className="w-full py-8 flex flex-col items-center text-center">
      <div className="flex items-center gap-2 mb-2">
        <School className="text-primary !text-3xl" />
        <h1 className="text-3xl font-extrabold tracking-tighter text-primary">论文助手</h1>
      </div>
      <p className="text-on-secondary-container font-medium tracking-wide text-sm">AI 赋能学术 - 答辩心中有数</p>
    </header>

    <div className="mb-10 relative">
      <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl scale-150"></div>
      <div className="relative z-10 w-40 h-40 bg-surface-container-lowest rounded-xl shadow-[0_24px_48px_-12px_rgba(0,32,69,0.12)] flex items-center justify-center rotate-3 border border-outline-variant/10">
        <MenuBook className="text-primary !text-7xl font-light" />
        <div className="absolute -top-4 -right-4 w-12 h-12 bg-tertiary-fixed rounded-lg flex items-center justify-center shadow-lg -rotate-12">
          <AutoAwesome className="text-on-tertiary-fixed !text-2xl" />
        </div>
      </div>
    </div>

    <div className="w-full bg-surface-container-lowest rounded-xl shadow-[0_4px_40px_rgba(0,0,0,0.04)] overflow-hidden border border-outline-variant/10">
      <div className="flex border-b border-surface-container-low">
        <button className="flex-1 py-4 text-sm font-bold text-primary border-b-2 border-primary">登录</button>
        <button 
          onClick={() => onNavigate('register')}
          className="flex-1 py-4 text-sm font-semibold text-on-secondary-container hover:bg-surface-container-low transition-colors"
        >
          注册
        </button>
      </div>
        <div className="p-8 space-y-5">
          <Input label="手机号" placeholder="请输入您的手机号" icon={Person} />
          <div className="space-y-1">
          <Input label="登录密码" placeholder="请输入密码" icon={Lock} showPasswordToggle />
          <div className="flex justify-end">
            <button className="text-xs font-semibold text-primary hover:underline">忘记密码？</button>
          </div>
        </div>
        <Button className="w-full" onClick={() => onNavigate('setup')}>
          立即登录 <ArrowForward className="!text-lg" />
        </Button>

        <div className="mt-10">
          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/30"></div>
            </div>
            <span className="relative px-4 bg-surface-container-lowest text-[10px] font-bold text-outline-variant uppercase tracking-widest">其他登录方式</span>
          </div>
          <div className="flex justify-center gap-8">
            <button className="flex flex-col items-center gap-1 group">
              <div className="w-12 h-12 flex items-center justify-center rounded-full border border-outline-variant/30 hover:bg-surface-container-low transition-all active:scale-90 overflow-hidden text-[#07C160]">
                <WeChatIcon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-outline-variant uppercase tracking-widest mt-1">微信</span>
            </button>
            <button className="flex flex-col items-center gap-1 group">
              <div className="w-12 h-12 flex items-center justify-center rounded-full border border-outline-variant/30 hover:bg-surface-container-low transition-all active:scale-90">
                <GoogleIcon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-outline-variant uppercase tracking-widest mt-1">Google</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <footer className="w-full py-8 text-center mt-auto">
      <p className="text-xs text-on-secondary-container leading-relaxed max-w-xs mx-auto">
        登录即表示同意 <button className="text-primary font-semibold hover:underline">《用户协议》</button> 和 <button className="text-primary font-semibold hover:underline">《隐私政策》</button>
      </p>
      <div className="mt-4 flex justify-center gap-4 text-[10px] font-bold text-outline-variant tracking-widest uppercase">
        <span>© 2026 论文助手</span>
        <span>•</span>
        <span>学术诚实指引</span>
      </div>
    </footer>
  </motion.div>
);

const RegisterView = ({ onNavigate }: { onNavigate: (v: View) => void }) => {
  const [countdown, setCountdown] = useState(0);
  const [isTypingCode, setIsTypingCode] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleGetCode = () => {
    setCountdown(60);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-container text-white mb-4 shadow-xl">
          <School className="!text-4xl" />
        </div>
        <h1 className="font-headline font-extrabold text-3xl tracking-tighter text-primary mb-2">论文助手</h1>
        <p className="text-on-secondary-container font-medium text-sm">AI赋能学术 - 答辩心中有数</p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant/10">
        <div className="flex border-b border-outline-variant/10">
          <button 
            onClick={() => onNavigate('login')}
            className="flex-1 py-4 text-sm font-semibold text-on-secondary-container hover:bg-surface-container-low transition-colors"
          >
            登录
          </button>
          <button className="flex-1 py-4 text-sm font-bold text-primary relative">
            注册
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full"></span>
          </button>
        </div>
        <div className="p-8 space-y-5">
          <Input label="手机号" placeholder="请输入手机号码" icon={PhoneIphone} />
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-on-secondary-container px-1">验证码</label>
            <div className="flex gap-3">
              <div className="relative flex-grow group">
                <LockOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors !text-xl" />
                <input 
                  className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low border-0 rounded-xl focus:outline-none focus:bg-white transition-all text-sm" 
                  placeholder="输入验证码" 
                  onFocus={() => setIsTypingCode(true)}
                />
              </div>
              {countdown > 0 ? (
                <div className="px-4 py-3.5 text-xs font-bold text-outline-variant bg-surface-container-high rounded-xl whitespace-nowrap flex items-center">
                  {countdown}s 后重试
                </div>
              ) : (
                isTypingCode && (
                  <button 
                    onClick={handleGetCode}
                    className="px-4 py-3.5 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-xl whitespace-nowrap transition-colors"
                  >
                    获取验证码
                  </button>
                )
              )}
            </div>
          </div>
          <Input label="设置密码" placeholder="请输入密码" icon={Lock} showPasswordToggle />
          <Input label="确认密码" placeholder="请再次确认密码" icon={VerifiedUser} type="password" />
          
          <div className="flex items-start gap-3 py-2">
            <input type="checkbox" id="terms" className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary bg-surface-container-low mt-0.5" />
            <label htmlFor="terms" className="text-xs text-on-secondary-container leading-tight">
              我已阅读并同意 <button className="text-primary font-semibold hover:underline">用户协议</button> 与 <button className="text-primary font-semibold hover:underline">隐私政策</button>
            </label>
          </div>

          <Button className="w-full" onClick={() => onNavigate('setup')}>
            立即注册
          </Button>

          <div className="mt-10">
            <div className="relative flex items-center justify-center mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant/15"></div>
              </div>
              <span className="relative bg-surface-container-lowest px-4 text-xs font-bold text-outline-variant uppercase tracking-widest">第三方快捷注册</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-3 py-3 border border-outline-variant/20 rounded-xl hover:bg-surface-container-low transition-colors px-4">
                <WeChatIcon className="w-5 h-5 text-[#07C160]" />
                <span className="text-xs font-bold text-on-secondary-container">微信注册</span>
              </button>
              <button className="flex items-center justify-center gap-3 py-3 border border-outline-variant/20 rounded-xl hover:bg-surface-container-low transition-colors px-4">
                <GoogleIcon className="w-5 h-5" />
                <span className="text-xs font-bold text-on-secondary-container">Google注册</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="py-8 text-center">
        <p className="text-xs text-outline-variant leading-relaxed max-w-md mx-auto">
          点击注册即表示您同意我们的学术诚信承诺。我们对您的学术隐私进行严格保护，所有生成的论文草稿及答辩提纲均采用端到端加密技术。
        </p>
        <div className="mt-4 pt-4 border-t border-outline-variant/10">
          <p className="text-[10px] text-outline-variant font-medium tracking-wide">© 2026 论文助手 | 专业AI学术辅助系统</p>
        </div>
      </footer>
    </motion.div>
  );
};

const SetupView = ({ onNavigate, onComplete }: { onNavigate: (v: View) => void, onComplete: (profile: UserProfile) => void }) => {
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [university, setUniversity] = useState('');
  const [department, setDepartment] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');

  const handleComplete = () => {
    if (!name || !studentId) {
      alert('请填写姓名和学号');
      return;
    }
    onComplete({ 
      name, 
      studentId, 
      university: university || 'XX大学', 
      department: department || '计算机学院',
      gender
    });
    onNavigate('upload');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-md mx-auto flex flex-col items-center"
    >
      <header className="w-full py-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Person className="text-primary !text-3xl" />
        </div>
        <h1 className="text-2xl font-bold text-primary mb-2">完善个人信息</h1>
        <p className="text-on-secondary-container text-sm">为了提供更精准的分析，请填写您的基本信息</p>
      </header>

      <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 p-8 space-y-6">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-on-secondary-container px-1">姓名</label>
          <input 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入您的真实姓名"
            className="w-full px-4 py-3.5 bg-surface-container-low border-0 rounded-xl focus:outline-none focus:bg-white transition-all text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-on-secondary-container px-1">学号</label>
          <input 
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="请输入您的学号"
            className="w-full px-4 py-3.5 bg-surface-container-low border-0 rounded-xl focus:outline-none focus:bg-white transition-all text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-on-secondary-container px-1">性别</label>
          <div className="flex gap-4">
            <button 
              onClick={() => setGender('male')}
              className={`flex-1 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                gender === 'male' ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant/10 text-on-secondary-container'
              }`}
            >
              <span className="text-sm font-bold">男</span>
            </button>
            <button 
              onClick={() => setGender('female')}
              className={`flex-1 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                gender === 'female' ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant/10 text-on-secondary-container'
              }`}
            >
              <span className="text-sm font-bold">女</span>
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-on-secondary-container px-1">学校 (可选)</label>
          <input 
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            placeholder="例如：清华大学"
            className="w-full px-4 py-3.5 bg-surface-container-low border-0 rounded-xl focus:outline-none focus:bg-white transition-all text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-on-secondary-container px-1">院系 (可选)</label>
          <input 
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="例如：计算机科学与技术"
            className="w-full px-4 py-3.5 bg-surface-container-low border-0 rounded-xl focus:outline-none focus:bg-white transition-all text-sm"
          />
        </div>

        <Button className="w-full mt-4" onClick={handleComplete}>
          完成设置 <ArrowForward className="!text-lg" />
        </Button>
      </div>
    </motion.div>
  );
};

const UploadView = ({ 
  onNavigate, 
  files, 
  onUpload, 
  isAnalyzing,
  onSelectFile,
  onOpenLibrary
}: { 
  onNavigate: (v: View) => void;
  files: ThesisFile[];
  onUpload: (file: File) => void;
  isAnalyzing: boolean;
  onSelectFile: (file: ThesisFile) => void;
  onOpenLibrary: () => void;
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-24"
    >
      <header className="flex justify-between items-center h-16 sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container-high">
          <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Felix" alt="Avatar" referrerPolicy="no-referrer" />
        </div>
        <h1 className="text-xl font-bold text-primary tracking-tight">上传论文</h1>
        <button className="p-2 text-on-secondary-container">
          <MoreVert />
        </button>
      </header>

      <section>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".pdf,.doc,.docx" 
          onChange={handleFileChange}
        />
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-outline-variant/10 text-center flex flex-col items-center group transition-all hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] cursor-pointer"
        >
          <div className="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center mb-6 group-hover:bg-primary/5 transition-colors">
            <CloudUpload className={`!text-4xl text-primary ${isAnalyzing ? 'animate-bounce' : ''}`} />
          </div>
          <h2 className="text-on-surface font-semibold text-lg mb-2">
            {isAnalyzing ? '正在处理并分析中...' : '点击或拖拽上传论文文件'}
          </h2>
          <p className="text-on-secondary-container text-sm mb-8">支持 PDF、DOC、DOCX 格式，文件不超过 20MB</p>
          <div className="flex gap-4 w-full">
            <Button variant="primary" className="flex-1" onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}>
              本地上传
            </Button>
            <Button variant="outline" className="flex-1" onClick={(e) => {
              e.stopPropagation();
              onOpenLibrary();
            }}>
              从文献库导入
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex justify-between items-end px-1">
          <h3 className="text-lg font-bold text-primary">最近上传</h3>
          <button className="text-xs text-on-secondary-container font-medium">查看全部</button>
        </div>
        <div className="space-y-3">
          {files.length === 0 ? (
            <div className="py-12 text-center text-outline-variant text-sm bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant/20">
              暂无上传记录
            </div>
          ) : (
            files.map((item) => (
              <div 
                key={item.id} 
                onClick={() => onSelectFile(item)}
                className="bg-surface-container-lowest p-4 rounded-xl flex items-center gap-4 transition-all hover:translate-x-1 border border-transparent hover:border-outline-variant/10 shadow-sm cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center flex-shrink-0`}>
                  {item.type.includes('pdf') ? (
                    <PictureAsPdf className="text-red-500" />
                  ) : (
                    <Description className="text-blue-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-on-surface truncate">{item.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-on-secondary-container">{item.date}</span>
                    <span className="w-1 h-1 rounded-full bg-outline-variant/30"></span>
                    <span className="text-[10px] text-on-secondary-container">{item.size}</span>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  item.status === '已完成' ? 'bg-emerald-50 text-emerald-600' :
                  item.status === '分析中' ? 'bg-primary/5 text-primary animate-pulse' :
                  item.status === '失败' ? 'bg-error-container/20 text-error' :
                  'bg-surface-container-high text-on-secondary-container'
                }`}>
                  {item.status}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="bg-tertiary-fixed p-4 rounded-xl flex items-center gap-3">
        <TipsAndUpdates className="text-on-tertiary-fixed" />
        <p className="text-xs text-on-tertiary-fixed font-medium leading-relaxed">
          上传后，我们的 AI 助手将自动为您提取核心论点、研究方法及主要结论。
        </p>
      </div>
    </motion.div>
  );
};

const DetailModal = ({ 
  isOpen, 
  onClose, 
  title, 
  type, 
  data,
  file
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  type: 'abstract' | 'polishing' | 'assistant'; 
  data: any;
  file?: ThesisFile | null;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="relative w-full max-w-2xl bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <AutoAwesome className="text-primary" />
            <h2 className="text-xl font-bold text-primary">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-low rounded-full transition-colors">
            <Close />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {(!data && type !== 'assistant') || (Array.isArray(data) && data.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center">
                <AutoAwesome className="text-outline-variant !text-3xl" />
              </div>
              <div>
                <p className="text-on-surface font-bold">暂无详细数据</p>
                <p className="text-xs text-on-secondary-container max-w-[200px] mx-auto mt-1">
                  该分析可能是在功能升级前完成的，建议您重新上传文件以获取深度分析结果。
                </p>
              </div>
            </div>
          ) : (
            <>
              {type === 'abstract' && (
                <div className="space-y-6">
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <CheckCircle className="!text-sm" /> 核心优势
                    </h4>
                    <ul className="space-y-2">
                      {data.strengths?.map((s: string, i: number) => (
                        <li key={i} className="text-sm text-emerald-900 leading-relaxed flex gap-2">
                          <span className="shrink-0">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <h4 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Warning className="!text-sm" /> 存在不足
                    </h4>
                    <ul className="space-y-2">
                      {data.weaknesses?.map((w: string, i: number) => (
                        <li key={i} className="text-sm text-amber-900 leading-relaxed flex gap-2">
                          <span className="shrink-0">•</span> {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                      <TipsAndUpdates className="!text-sm" /> 改进建议
                    </h4>
                    <ul className="space-y-2">
                      {data.suggestions?.map((s: string, i: number) => (
                        <li key={i} className="text-sm text-on-surface leading-relaxed flex gap-2">
                          <span className="shrink-0">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {type === 'polishing' && (
                <div className="space-y-4">
                  {data.map((item: any, i: number) => (
                    <div key={i} className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                          item.type === 'grammar' ? 'bg-red-100 text-red-700' :
                          item.type === 'tone' ? 'bg-blue-100 text-blue-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {item.type === 'grammar' ? '语法错误' : item.type === 'tone' ? '学术语气' : '表达清晰度'}
                        </span>
                        <button className="text-[10px] font-bold text-primary hover:underline">采纳建议</button>
                      </div>
                      <div className="space-y-2">
                        <div className="p-3 bg-red-50/50 rounded-lg border border-red-100/50">
                          <p className="text-[10px] font-bold text-red-400 uppercase mb-1">原文</p>
                          <p className="text-sm text-on-surface line-through opacity-60">{item.original}</p>
                        </div>
                        <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100/50">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">建议</p>
                          <p className="text-sm text-on-surface font-medium">{item.suggested}</p>
                        </div>
                      </div>
                      <p className="text-xs text-on-secondary-container italic">
                        <span className="font-bold">理由：</span>{item.reason}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {type === 'assistant' && (
                <AIChatAssistant file={file} />
              )}
            </>
          )}
        </div>

        {type !== 'assistant' && (
          <div className="p-6 border-t border-outline-variant/10 bg-surface-container-lowest">
            <Button className="w-full" onClick={onClose}>返回分析页</Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const AIChatAssistant = ({ file }: { file?: ThesisFile | null }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string, model?: string }[]>([
    { role: 'assistant', content: '你好！我是您的 DeepSeek 学术助手。我可以帮您润色论文、解释专业术语、提供写作建议，或者针对您的论文内容进行深度讨论。请问有什么我可以帮您的？', model: 'DeepSeek-V3' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeModel, setActiveModel] = useState('DeepSeek-V3');
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const models = [
    { name: 'Gemini 3.0 Pro', desc: '学术逻辑极强', color: 'bg-blue-500' },
    { name: 'DeepSeek-V3', desc: '中文润色专家', color: 'bg-purple-500' },
    { name: 'Doubao-Pro', desc: '表达生动自然', color: 'bg-orange-500' }
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const currentModel = activeModel;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        throw new Error("未检测到 API 密钥。如果您已部署到 Vercel，请在 Vercel 控制面板的 Settings -> Environment Variables 中添加 GEMINI_API_KEY。");
      }
      const ai = new GoogleGenAI({ apiKey });
      const context = file?.text ? `\n\n当前论文内容背景：\n${file.text.substring(0, 2000)}...` : "";
      
      // We simulate other models by adjusting the system instruction
      let modelInstruction = "你是一个顶尖的学术导师和论文润色专家。";
      if (currentModel.includes('DeepSeek')) modelInstruction += "你特别擅长深度思考和精准的中文学术表达。";
      if (currentModel.includes('Doubao')) modelInstruction += "你擅长让学术语言更加生动、易读且符合现代学术规范。";

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: `[系统提示：请以 ${currentModel} 的风格和能力进行回答] ${modelInstruction}\n\n基于以下上下文回答用户的问题。${context}\n\n用户问题：${userMessage}` }] }
        ]
      });

      const aiResponse = response.text || "抱歉，我暂时无法处理您的请求。";
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse, model: currentModel }]);
    } catch (error) {
      console.error('AI Assistant Error:', error);
      let errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Try to extract a cleaner message if it's a JSON error from Google API
      try {
        const parsed = JSON.parse(errorMessage);
        if (parsed.error && parsed.error.message) {
          errorMessage = parsed.error.message;
        }
      } catch (e) {
        // Not JSON
      }

      setMessages(prev => [...prev, { role: 'assistant', content: `抱歉，连接 AI 服务时出现错误：${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[65vh] -m-6">
      {/* Model Selector Bar */}
      <div className="px-6 py-3 bg-surface-container-low border-b border-outline-variant/10 flex gap-2 overflow-x-auto no-scrollbar">
        {models.map((m) => (
          <button 
            key={m.name}
            onClick={() => setActiveModel(m.name)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1.5 border ${
              activeModel === m.name 
                ? 'bg-primary text-white border-primary shadow-sm' 
                : 'bg-white text-on-secondary-container border-outline-variant/20 hover:border-primary/30'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${activeModel === m.name ? 'bg-white' : m.color}`}></span>
            {m.name}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            {msg.model && (
              <span className="text-[9px] font-bold text-outline-variant mb-1 ml-1 uppercase tracking-widest">
                {msg.model}
              </span>
            )}
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-primary text-white rounded-tr-none' 
                : 'bg-surface-container-low text-on-surface rounded-tl-none border border-outline-variant/10 shadow-sm'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex flex-col items-start">
            <span className="text-[9px] font-bold text-primary mb-1 ml-1 uppercase tracking-widest animate-pulse">
              {activeModel} 正在思考...
            </span>
            <div className="bg-surface-container-low p-4 rounded-2xl rounded-tl-none border border-outline-variant/10 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 border-t border-outline-variant/10 bg-surface-container-lowest">
        <div className="flex gap-2 bg-surface-container-low p-2 rounded-2xl border border-outline-variant/10 focus-within:border-primary transition-colors">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`咨询 ${activeModel}...`}
            className="flex-1 bg-transparent border-0 px-3 py-2 text-sm focus:outline-none"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
          >
            <Send className="!text-lg" />
          </button>
        </div>
      </div>
    </div>
  );
};

const AnalysisView = ({ 
  onNavigate, 
  file,
  onReanalyze
}: { 
  onNavigate: (v: View) => void, 
  file: ThesisFile | null,
  onReanalyze: (file: ThesisFile) => void
}) => {
  const [activeDetail, setActiveDetail] = useState<{ type: 'abstract' | 'polishing' | 'assistant', title: string } | null>(null);

  if (!file || (!file.analysis && file.status !== '失败')) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center p-8">
        <AutoAwesome className="text-primary !text-6xl mb-4 animate-pulse" />
        <h2 className="text-xl font-bold text-primary mb-2">正在准备分析数据...</h2>
        <p className="text-on-secondary-container text-sm">请稍候，AI 正在深度解析您的论文内容</p>
        <Button className="mt-8" onClick={() => onNavigate('upload')}>返回上传</Button>
      </div>
    );
  }

  if (file.status === '失败') {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center p-8">
        <Warning className="text-error !text-6xl mb-4" />
        <h2 className="text-xl font-bold text-error mb-2">分析失败</h2>
        <p className="text-on-secondary-container text-sm max-w-md mx-auto">{file.error || '未知错误，请重试'}</p>
        <div className="flex gap-4 mt-8">
          <Button variant="outline" onClick={() => onNavigate('upload')}>返回上传</Button>
          <Button onClick={() => onReanalyze(file)}>重试分析</Button>
        </div>
      </div>
    );
  }

  const { analysis } = file;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-24"
    >
      <header className="flex items-center justify-between h-16 sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <button onClick={() => onNavigate('upload')} className="p-2 text-primary">
          <ArrowForward className="rotate-180" />
        </button>
        <h1 className="text-lg font-bold text-primary">论文智能分析</h1>
        <button className="p-2 text-primary">
          <MoreVert />
        </button>
      </header>

      <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-16 bg-primary-container rounded-lg flex items-center justify-center shrink-0">
            <Description className="text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-on-surface font-bold text-lg leading-tight mb-2">{file.name}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-on-secondary-container font-medium">
              <span className="flex items-center gap-1"><Person className="!text-[16px]" /> 我的论文</span>
              <span className="flex items-center gap-1"><History className="!text-[16px]" /> {file.date}</span>
              <span className="flex items-center gap-1"><Description className="!text-[16px]" /> {file.size}</span>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-bold text-primary tracking-wider uppercase">分析进度</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => onReanalyze(file)}
                className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1"
              >
                <Refresh className="!text-[12px]" /> 重新分析
              </button>
              <span className="text-xs font-bold text-primary">100%</span>
            </div>
          </div>
          <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
            <div className="bg-primary h-full w-full rounded-full"></div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "总字数", value: analysis.wordCount.toLocaleString(), sub: "CHARS", color: "text-primary" },
          { 
            label: "重复率", 
            value: analysis.duplicateRate, 
            sub: "评估结果", 
            color: "text-emerald-600", 
            dot: true 
          },
          { 
            label: "AI生成占比", 
            value: analysis.aiRate, 
            sub: "风险评估", 
            color: "text-primary" 
          },
          { label: "可读性评分", value: analysis.readability.toString(), sub: "分", color: "text-primary" }
        ].map((stat, i) => (
          <div key={i} className="bg-surface-container-lowest p-5 rounded-xl text-center shadow-sm border border-outline-variant/5">
            <p className="text-[10px] font-bold text-on-secondary-container uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              {stat.dot && <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>}
              <p className={`text-[10px] ${stat.color} font-bold`}>{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/5">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <AutoAwesome className="text-primary" />
                <h3 className="font-bold text-on-surface">摘要分析</h3>
              </div>
              <div className="bg-surface-container-high px-3 py-1 rounded-full">
                <span className="text-xs font-extrabold text-primary">评分 {analysis.abstractScore}</span>
              </div>
            </div>
            <div className="bg-surface-container-low p-4 rounded-lg">
              <p className="text-sm text-on-surface leading-relaxed">
                {analysis.abstractEval}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setActiveDetail({ type: 'abstract', title: '摘要深度分析' })}
            className="w-full py-3 text-sm font-bold text-primary bg-surface-container-low/50 hover:bg-surface-container-low transition-colors border-t border-outline-variant/10"
          >
            查看详情
          </button>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/5">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <AccountTree className="text-primary" />
              <h3 className="font-bold text-on-surface">结构分析</h3>
            </div>
            <div className="bg-surface-container-high px-3 py-1 rounded-full">
              <span className="text-xs font-extrabold text-primary">评分 {analysis.structureScore}</span>
            </div>
          </div>
          <ul className="space-y-3">
            {analysis.structureEval.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-on-surface">
                {item.status === 'ok' ? (
                  <CheckCircle className="text-emerald-500 !text-[20px] shrink-0" />
                ) : (
                  <Warning className="text-amber-500 !text-[20px] shrink-0" />
                )}
                <div>
                  <span className={item.status === 'warning' ? 'font-bold text-amber-700' : ''}>{item.name}</span>
                  {item.detail && <p className="text-xs text-on-secondary-container mt-0.5">{item.detail}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/5">
          <div className="flex items-center gap-2 mb-4">
            <SmartToy className="text-primary" />
            <h3 className="font-bold text-on-surface">AI 学术助手</h3>
          </div>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-error-container/20 p-3 rounded-lg border border-error/10">
              <p className="text-[10px] font-bold text-error uppercase mb-1">语法错误</p>
              <p className="text-xl font-extrabold text-error">{analysis.grammarErrors}</p>
            </div>
            <div className="flex-1 bg-primary/5 p-3 rounded-lg border border-primary/10">
              <p className="text-[10px] font-bold text-primary uppercase mb-1">学术建议</p>
              <p className="text-xl font-extrabold text-primary">{analysis.academicSuggestions}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setActiveDetail({ type: 'polishing', title: '深度润色建议' })}
              className="flex-1 py-3.5 bg-surface-container-high text-on-surface rounded-xl font-bold text-sm hover:bg-surface-container-highest transition-all border border-outline-variant/10 flex items-center justify-center gap-2"
            >
              <AutoFixHigh className="!text-lg text-primary" /> 开启 AI 深度润色
            </button>
            <button 
              onClick={() => setActiveDetail({ type: 'assistant', title: 'AI 学术助手' })}
              className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform shrink-0"
              title="咨询 AI 助手"
            >
              <SmartToy className="!text-xl" />
            </button>
          </div>
        </div>

        <Button className="w-full" onClick={() => onNavigate('report')}>
          <Assessment className="!text-[20px]" /> 生成分析报告
        </Button>
      </div>

      <AnimatePresence>
        {activeDetail && (
          <DetailModal 
            isOpen={!!activeDetail}
            onClose={() => setActiveDetail(null)}
            title={activeDetail.title}
            type={activeDetail.type}
            file={file}
            data={
              activeDetail.type === 'abstract' ? analysis.abstractDetails :
              activeDetail.type === 'polishing' ? analysis.polishingSuggestions :
              null
            }
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ReportView = ({ onNavigate, file }: { onNavigate: (v: View) => void, file: ThesisFile | null }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [detailedReport, setDetailedReport] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const reportRef = React.useRef<HTMLDivElement>(null);

  if (!file || !file.analysis) return null;
  const { analysis } = file;

  const generateDetailedReport = async () => {
    if (!file.text) {
      alert("无法获取论文文本，请重新上传分析。");
      return;
    }
    setIsGenerating(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        throw new Error("未检测到 API 密钥。");
      }
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `你是一个资深的学术论文评审专家。请使用 Gemini 3 Flash 模型，对以下论文内容进行全面、细致的深度分析，并生成一份可以直接用于下载的专业分析报告。

要求：
1. 报告必须全面且细致，包含：
   - 论文整体评价（优缺点总结）
   - 摘要深度分析（结构、逻辑、吸引力）
   - 章节结构与逻辑连贯性分析
   - 语言表达与学术规范性审查
   - 创新性与学术价值评估
   - 具体的修改建议（至少5条，需指出具体问题和修改方向）
2. 使用 Markdown 格式输出，排版清晰美观，使用多级标题、列表等。
3. 语言必须是中文，严谨专业。

论文内容：
${file.text.substring(0, 20000)}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setDetailedReport(response.text);
      setShowPreview(true);
    } catch (error) {
      console.error("生成深度报告失败:", error);
      alert("生成深度报告失败，请稍后重试。");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    try {
      // Use html-to-image to avoid Chinese font garbling and oklch color issues
      const imgData = await toPng(reportRef.current, { pixelRatio: 2, backgroundColor: '#ffffff' });
      const width = reportRef.current.offsetWidth;
      const height = reportRef.current.offsetHeight;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (height * pdfWidth) / width;
      
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      pdf.save(`${file.name}-深度分析报告.pdf`);
    } catch (error) {
      console.error("PDF 导出失败:", error);
      alert("PDF 导出失败");
    }
  };

  const downloadWord = async () => {
    if (!detailedReport) return;
    try {
      // Simple Markdown to Word conversion
      const paragraphs = detailedReport.split('\n\n').map(text => {
        if (text.startsWith('# ')) {
          return new Paragraph({ text: text.replace('# ', ''), heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER });
        } else if (text.startsWith('## ')) {
          return new Paragraph({ text: text.replace('## ', ''), heading: HeadingLevel.HEADING_2 });
        } else if (text.startsWith('### ')) {
          return new Paragraph({ text: text.replace('### ', ''), heading: HeadingLevel.HEADING_3 });
        } else if (text.startsWith('- ') || text.startsWith('* ')) {
          return new Paragraph({ text: text.replace(/^[-*]\s/, ''), bullet: { level: 0 } });
        } else {
          return new Paragraph({ text });
        }
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs
        }]
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${file.name}-深度分析报告.docx`);
    } catch (error) {
      console.error("Word 导出失败:", error);
      alert("Word 导出失败");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-24"
    >
      <header className="flex items-center justify-between h-16 sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <button onClick={() => onNavigate('analysis')} className="p-2 text-primary">
          <ArrowForward className="rotate-180" />
        </button>
        <h1 className="text-lg font-bold text-primary">分析报告</h1>
        <button className="p-2 text-primary">
          <MoreVert />
        </button>
      </header>

      <div className="space-y-6">
        <section className="bg-surface-container-lowest p-6 rounded-xl shadow-sm relative overflow-hidden border border-outline-variant/5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16"></div>
          <div className="space-y-4 relative z-10">
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-extrabold tracking-tight leading-snug text-primary max-w-[70%]">{file.name}</h2>
              <div className="flex flex-col items-end">
                <span className="text-3xl font-black text-primary">86<span className="text-sm font-normal text-on-secondary-container ml-0.5">分</span></span>
                <span className="mt-1 px-3 py-0.5 border border-primary text-primary text-[10px] font-bold rounded-full uppercase tracking-widest">良好</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-on-secondary-container text-xs font-medium">
              <History className="!text-sm" />
              <span>生成时间：{file.date}</span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4">
          {[
            { label: "创新性", score: analysis.innovation, desc: analysis.innovation > 80 ? "视角新颖" : "有待加强" },
            { label: "逻辑性", score: analysis.logic, desc: analysis.logic > 80 ? "推导严密" : "基本合理" },
            { label: "规范性", score: analysis.norm, desc: analysis.norm > 80 ? "格式标准" : "基本合规" },
            { label: "表达力", score: analysis.expression, desc: analysis.expression > 80 ? "文辞流畅" : "通顺" }
          ].map((item, i) => (
            <div key={i} className="bg-surface-container-low p-4 rounded-lg">
              <p className="text-[10px] font-bold text-on-secondary-container uppercase tracking-widest mb-1">{item.label}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-primary">{item.score}</span>
                <span className="text-[10px] text-on-secondary-container">{item.desc}</span>
              </div>
              <div className="w-full h-1 bg-outline-variant/20 rounded-full mt-2">
                <div className="h-full bg-primary rounded-full" style={{ width: `${item.score}%` }}></div>
              </div>
            </div>
          ))}
        </section>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-primary px-1 tracking-wider uppercase">分析详情</h3>
          
          <div className="bg-surface-container-lowest p-5 rounded-xl space-y-3 border border-outline-variant/5">
            <div className="flex justify-between items-center border-b border-surface-container-low pb-2">
              <h4 className="font-bold text-on-surface">一、摘要评价</h4>
              <span className="text-primary font-bold">{analysis.abstractScore}</span>
            </div>
            <p className="text-sm text-on-secondary-container leading-relaxed">{analysis.abstractEval}</p>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-xl space-y-4 border border-outline-variant/5">
            <div className="flex justify-between items-center border-b border-surface-container-low pb-2">
              <h4 className="font-bold text-on-surface">二、结构完整性</h4>
              <span className="text-primary font-bold">{analysis.structureScore}</span>
            </div>
            <div className="grid grid-cols-2 gap-y-3 gap-x-2">
              {analysis.structureEval.map((item, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs ${item.status === 'warning' ? 'text-error font-medium' : ''}`}>
                  {item.status === 'ok' ? <CheckCircle className="text-emerald-600 !text-sm" /> : <Warning className="!text-sm" />}
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-xl space-y-4 border border-outline-variant/5">
            <div className="flex justify-between items-center border-b border-surface-container-low pb-2">
              <h4 className="font-bold text-on-surface">三、语言表达</h4>
              <div className="flex gap-3">
                <span className="text-[10px] font-bold bg-error-container text-error px-2 py-0.5 rounded">{analysis.grammarErrors} 错误</span>
                <span className="text-[10px] font-bold bg-surface-container-high text-primary px-2 py-0.5 rounded">{analysis.academicSuggestions} 建议</span>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-on-secondary-container">
                AI 建议：您的论文语言整体较为学术，但在部分章节存在口语化表达，建议进行进一步的学术润色。
              </p>
            </div>
          </div>
        </div>

        {/* Download Section */}
        <div className="pt-6 border-t border-outline-variant/10">
          <button 
            onClick={generateDetailedReport}
            disabled={isGenerating}
            className="w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-70"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                正在使用 Gemini 3 Flash 生成深度报告...
              </>
            ) : (
              <>
                <AutoAwesome className="!text-lg" />
                生成并下载深度分析报告 (PDF/Word)
              </>
            )}
          </button>
          <p className="text-center text-[10px] text-outline-variant mt-3">
            由 Gemini 3 Flash 提供全面细致的深度分析，支持无乱码 PDF 及 Word 导出
          </p>
        </div>
      </div>

      {/* Detailed Report Preview Modal */}
      <AnimatePresence>
        {showPreview && detailedReport && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-surface-container-lowest w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="flex justify-between items-center p-4 border-b border-outline-variant/10 bg-surface-container-lowest z-10">
                <h3 className="font-bold text-primary flex items-center gap-2">
                  <Assessment className="!text-xl" />
                  深度分析报告预览
                </h3>
                <button onClick={() => setShowPreview(false)} className="p-1 text-outline-variant hover:text-on-surface rounded-full hover:bg-surface-container-low transition-colors">
                  <Close />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 bg-white">
                <div ref={reportRef} className="prose prose-sm max-w-none prose-headings:text-primary prose-a:text-primary markdown-body bg-white p-4">
                  <ReactMarkdown>{detailedReport}</ReactMarkdown>
                </div>
              </div>
              
              <div className="p-4 border-t border-outline-variant/10 bg-surface-container-lowest flex gap-3">
                <button 
                  onClick={downloadPDF}
                  className="flex-1 py-3 bg-error-container text-error hover:bg-error/20 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <PictureAsPdf className="!text-lg" />
                  下载 PDF
                </button>
                <button 
                  onClick={downloadWord}
                  className="flex-1 py-3 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Description className="!text-lg" />
                  下载 Word
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};


const LibraryView = ({ 
  onNavigate, 
  files, 
  onUpload, 
  isAnalyzing,
  onSelectFile 
}: { 
  onNavigate: (v: View) => void, 
  files: ThesisFile[],
  onUpload: (file: File) => void,
  isAnalyzing: boolean,
  onSelectFile: (file: ThesisFile) => void
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-24"
    >
      <header className="flex items-center justify-between h-16 sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <button onClick={() => onNavigate('profile')} className="p-2 text-primary">
          <ArrowForward className="rotate-180" />
        </button>
        <h1 className="text-lg font-bold text-primary">我的论文库</h1>
        <button onClick={() => fileInputRef.current?.click()} className="p-2 text-primary">
          <CloudUpload />
        </button>
      </header>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".pdf,.doc,.docx" 
        onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
      />

      <section className="space-y-4">
        {files.length === 0 ? (
          <div className="py-20 text-center space-y-4 bg-surface-container-lowest rounded-2xl border-2 border-dashed border-outline-variant/10">
            <MenuBook className="!text-5xl text-outline-variant/20 mx-auto" />
            <p className="text-sm text-on-secondary-container">您的论文库空空如也</p>
            <Button onClick={() => fileInputRef.current?.click()}>立即上传</Button>
          </div>
        ) : (
          files.map((file) => (
            <div 
              key={file.id} 
              onClick={() => onSelectFile(file)}
              className="bg-surface-container-lowest p-4 rounded-xl flex items-center gap-4 border border-outline-variant/5 shadow-sm cursor-pointer hover:bg-surface-container-low transition-colors"
            >
              <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0">
                {file.type.includes('pdf') ? <PictureAsPdf className="text-red-500" /> : <Description className="text-blue-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-on-surface truncate">{file.name}</h4>
                <p className="text-[10px] text-on-secondary-container mt-1 font-medium uppercase tracking-wider">{file.date} • {file.size}</p>
              </div>
              <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                file.status === '已完成' ? 'bg-emerald-50 text-emerald-600' : 'bg-primary/5 text-primary'
              }`}>
                {file.status}
              </div>
            </div>
          ))
        )}
      </section>
    </motion.div>
  );
};

const HistoryView = ({ 
  onNavigate, 
  files, 
  onSelectFile 
}: { 
  onNavigate: (v: View) => void, 
  files: ThesisFile[],
  onSelectFile: (file: ThesisFile) => void
}) => {
  const historyFiles = files.filter(f => f.status === '已完成');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-24"
    >
      <header className="flex items-center justify-between h-16 sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <button onClick={() => onNavigate('profile')} className="p-2 text-primary">
          <ArrowForward className="rotate-180" />
        </button>
        <h1 className="text-lg font-bold text-primary">最近分析记录</h1>
        <div className="w-10" />
      </header>

      <section className="space-y-4">
        {historyFiles.length === 0 ? (
          <div className="py-20 text-center space-y-4 bg-surface-container-lowest rounded-2xl border-2 border-dashed border-outline-variant/10">
            <History className="!text-5xl text-outline-variant/20 mx-auto" />
            <p className="text-sm text-on-secondary-container">暂无分析记录</p>
            <Button onClick={() => onNavigate('upload')}>去分析论文</Button>
          </div>
        ) : (
          historyFiles.map((file) => (
            <div 
              key={file.id} 
              onClick={() => onSelectFile(file)}
              className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/5 shadow-sm cursor-pointer hover:bg-surface-container-low transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-on-surface line-clamp-1 flex-1 pr-4">{file.name}</h4>
                <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded uppercase tracking-widest">已完成</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-[10px] font-bold text-on-secondary-container uppercase tracking-wider">
                  <span className="flex items-center gap-1"><History className="!text-xs" /> {file.date}</span>
                  <span className="flex items-center gap-1"><Assessment className="!text-xs" /> 评分: {file.analysis?.abstractScore || '--'}</span>
                </div>
                <ChevronRight className="text-outline-variant" />
              </div>
            </div>
          ))
        )}
      </section>
    </motion.div>
  );
};

const StarredView = ({ 
  onNavigate, 
  items, 
  onToggleStar,
  onImport
}: { 
  onNavigate: (v: View) => void, 
  items: Literature[],
  onToggleStar: (lit: Literature) => void,
  onImport: (lit: Literature) => void
}) => {
  const starredItems = items.filter(i => i.isStarred);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-24"
    >
      <header className="flex items-center justify-between h-16 sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <button onClick={() => onNavigate('profile')} className="p-2 text-primary">
          <ArrowForward className="rotate-180" />
        </button>
        <h1 className="text-lg font-bold text-primary">收藏文献</h1>
        <div className="w-10" />
      </header>

      <section className="space-y-4">
        {starredItems.length === 0 ? (
          <div className="py-20 text-center space-y-4 bg-surface-container-lowest rounded-2xl border-2 border-dashed border-outline-variant/10">
            <Bookmark className="!text-5xl text-outline-variant/20 mx-auto" />
            <p className="text-sm text-on-secondary-container">暂无收藏文献</p>
            <Button onClick={() => onNavigate('upload')}>去文献库看看</Button>
          </div>
        ) : (
          starredItems.map((lit) => (
            <div 
              key={lit.id} 
              className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/5 shadow-sm space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {lit.type === 'pdf' ? <PictureAsPdf className="text-red-500" /> : <Description className="text-blue-500" />}
                  <h4 className="font-bold text-on-surface line-clamp-1">{lit.title}</h4>
                </div>
                <button onClick={() => onToggleStar(lit)} className="text-amber-500">
                  <Star />
                </button>
              </div>
              <p className="text-xs text-on-secondary-container line-clamp-2 leading-relaxed">{lit.abstract}</p>
              <div className="flex justify-between items-center pt-2">
                <span className="text-[10px] font-bold text-outline-variant uppercase tracking-widest">{lit.author} • {lit.year}</span>
                <button 
                  onClick={() => onImport(lit)}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  导入分析
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </motion.div>
  );
};

const ProfileView = ({ 
  onNavigate, 
  files, 
  profile,
  onLogout
}: { 
  onNavigate: (v: View) => void, 
  files: ThesisFile[],
  profile: UserProfile | null,
  onLogout: () => void
}) => {
  const stats = {
    uploads: files.length,
    analyses: files.filter(f => f.status === '已完成').length,
    reports: files.filter(f => f.analysis).length
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-24"
    >
      <header className="flex justify-between items-center h-16 sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <button onClick={() => onNavigate('upload')} className="p-2 text-primary">
          <ArrowForward className="rotate-180" />
        </button>
        <h1 className="text-lg font-bold text-primary">我的</h1>
        <button className="p-2 text-primary">
          <Settings />
        </button>
      </header>

      <section className="bg-surface-container-lowest rounded-xl p-8 flex flex-col items-center shadow-sm border border-outline-variant/5">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full border-4 border-surface-container-low bg-[#b6e3f4] overflow-hidden flex items-center justify-center relative shadow-inner">
            {/* 兜底：首字母或默认图标 */}
            <div className="absolute inset-0 flex items-center justify-center bg-primary/10 text-primary text-3xl font-bold z-0">
              {profile?.name ? profile.name.charAt(0) : <Person className="!text-5xl opacity-20" />}
            </div>
            
            {/* 尝试加载 DiceBear 头像 (PNG 格式更稳定) */}
            <img 
              src={profile?.gender === 'female' 
                ? `https://api.dicebear.com/9.x/avataaars/png?seed=Sophia&top=shortHair&backgroundColor=b6e3f4`
                : `https://api.dicebear.com/9.x/avataaars/png?seed=James&eyepieces=glasses&backgroundColor=b6e3f4`
              } 
              alt="" 
              className="w-full h-full object-cover relative z-10 transition-opacity duration-300 opacity-0" 
              referrerPolicy="no-referrer" 
              onLoad={(e) => (e.currentTarget.style.opacity = '1')}
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </div>
          <div className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1.5 border-2 border-white z-20 shadow-sm">
            <Verified className="!text-[14px]" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-primary mb-1">{profile?.name || '未设置姓名'}</h2>
        <p className="text-sm text-on-secondary-container mb-1 font-medium">{profile?.university || 'XX大学'} {profile?.department || '计算机学院'}</p>
        <p className="text-xs text-outline-variant mb-6">学号：{profile?.studentId || '未设置学号'}</p>
        <button 
          onClick={() => onNavigate('setup')}
          className="px-8 py-2 rounded-lg border border-outline-variant text-sm font-semibold text-primary hover:bg-surface-container-low transition-colors"
        >
          编辑资料
        </button>
      </section>

      <section className="bg-surface-container-lowest rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-sm border border-outline-variant/5">
        <span className="text-3xl font-extrabold text-primary mb-1">{stats.reports}</span>
        <span className="text-xs text-on-secondary-container font-bold uppercase tracking-widest">生成报告次数</span>
      </section>

    <div className="space-y-4">
      {[
        { title: "论文管理", items: [
          { label: "我的论文库", icon: MenuBook },
          { label: "最近分析记录", icon: History },
          { label: "收藏文献", icon: Bookmark }
        ]},
        { title: "账号设置", items: [
          { label: "账号安全", icon: Shield },
          { label: "通知设置", icon: Notifications },
          { label: "隐私设置", icon: Lock }
        ]},
        { title: "帮助与反馈", items: [
          { label: "使用教程", icon: School },
          { label: "意见反馈", icon: RateReview },
          { label: "关于我们", icon: Info }
        ]}
      ].map((group, i) => (
        <div key={i} className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/5">
          <div className="px-6 py-4 border-b border-surface-container-low">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider">{group.title}</h3>
          </div>
          <div className="divide-y divide-surface-container-low">
            {group.items.map((item, j) => (
              <button 
                key={j} 
                onClick={() => {
                  if (item.label === "我的论文库") onNavigate('library');
                  if (item.label === "最近分析记录") onNavigate('history');
                  if (item.label === "收藏文献") onNavigate('starred');
                }}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-container-low transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <item.icon className="text-primary/60" />
                  <span className="text-sm font-medium text-on-surface">{item.label}</span>
                </div>
                <ChevronRight className="text-outline-variant group-hover:translate-x-1 transition-transform" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>

    <div className="py-8">
      <Button variant="error" className="w-full" onClick={onLogout}>
        退出登录
      </Button>
    </div>
  </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState<View>('login');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('user_profile');
    return saved ? JSON.parse(saved) : null;
  });
  const [files, setFiles] = useState<ThesisFile[]>(() => {
    const saved = localStorage.getItem('thesis_files');
    return saved ? JSON.parse(saved) : [];
  });
  const [libraryItems, setLibraryItems] = useState<Literature[]>(() => {
    const saved = localStorage.getItem('library_items');
    return saved ? JSON.parse(saved) : MOCK_LIBRARY;
  });
  const [currentFile, setCurrentFile] = useState<ThesisFile | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('thesis_files', JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    localStorage.setItem('library_items', JSON.stringify(libraryItems));
  }, [libraryItems]);

  useEffect(() => {
    if (userProfile) {
      localStorage.setItem('user_profile', JSON.stringify(userProfile));
    }
  }, [userProfile]);

  const extractText = async (file: File): Promise<string> => {
    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(' ');
      }
      return text;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }
    return '';
  };

  const analyzeThesis = async (text: string): Promise<ThesisAnalysis> => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        throw new Error("未检测到 API 密钥。如果您已部署到 Vercel，请在 Vercel 控制面板的 Settings -> Environment Variables 中添加 GEMINI_API_KEY。");
      }

      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3-flash-preview";

      const prompt = `你是一个专业的学术论文评审专家。请对以下论文内容进行深度分析，并返回 JSON 格式的结果。
      论文内容：
      ${text.substring(0, 15000)}
      
      【重要指令】：
      1. 必须提供详细的 abstractDetails（摘要优缺点及建议）。
      2. 必须提供至少 5 条 polishingSuggestions（润色建议）。
      3. 请根据你的判断估算一个 AI 生成概率（aiRate）。
      4. 请根据你的判断估算一个重复率（duplicateRate）。
      
      请严格按照以下 JSON 结构返回：
      {
        "wordCount": 数字,
        "duplicateRate": "百分比字符串",
        "aiRate": "百分比字符串",
        "readability": 0-100数字,
        "abstractEval": "摘要评价字符串",
        "abstractScore": 0-100数字,
        "abstractDetails": {
          "strengths": ["优点1", "优点2", "优点3"],
          "weaknesses": ["缺点1", "缺点2", "缺点3"],
          "suggestions": ["建议1", "建议2", "建议3"]
        },
        "structureEval": [{"name": "章节名", "status": "ok" | "warning", "detail": "说明"}],
        "structureScore": 0-100数字,
        "grammarErrors": 数字,
        "academicSuggestions": 数字,
        "polishingSuggestions": [
          {"original": "原文句子", "suggested": "润色后句子", "reason": "修改理由", "type": "grammar" | "tone" | "clarity"}
        ],
        "innovation": 0-100数字,
        "logic": 0-100数字,
        "norm": 0-100数字,
        "expression": 0-100数字
      }`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              wordCount: { type: Type.INTEGER },
              duplicateRate: { type: Type.STRING },
              aiRate: { type: Type.STRING },
              readability: { type: Type.INTEGER },
              abstractEval: { type: Type.STRING },
              abstractScore: { type: Type.INTEGER },
              abstractDetails: {
                type: Type.OBJECT,
                properties: {
                  strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                  weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                  suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["strengths", "weaknesses", "suggestions"]
              },
              structureEval: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    status: { type: Type.STRING },
                    detail: { type: Type.STRING }
                  },
                  required: ["name", "status"]
                }
              },
              structureScore: { type: Type.INTEGER },
              grammarErrors: { type: Type.INTEGER },
              academicSuggestions: { type: Type.INTEGER },
              polishingSuggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    original: { type: Type.STRING },
                    suggested: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    type: { type: Type.STRING }
                  },
                  required: ["original", "suggested", "reason", "type"]
                }
              },
              innovation: { type: Type.INTEGER },
              logic: { type: Type.INTEGER },
              norm: { type: Type.INTEGER },
              expression: { type: Type.INTEGER }
            },
            required: [
              "wordCount", "duplicateRate", "aiRate", "readability", 
              "abstractEval", "abstractScore", "abstractDetails", 
              "structureEval", "structureScore", "grammarErrors", 
              "academicSuggestions", "polishingSuggestions", 
              "innovation", "logic", "norm", "expression"
            ]
          }
        }
      });

      if (!response.text) {
        throw new Error("Empty response from AI model");
      }

      // Clean response text
      let cleanedText = response.text.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```\n?/, "").replace(/\n?```$/, "");
      }

      const analysis = JSON.parse(cleanedText);
      
      return analysis;
    } catch (error) {
      console.error('Analysis Error:', error);
      let message = error instanceof Error ? error.message : 'Failed to analyze thesis';
      
      // Try to extract a cleaner message if it's a JSON error from Google API
      try {
        const parsed = JSON.parse(message);
        if (parsed.error && parsed.error.message) {
          message = parsed.error.message;
        }
      } catch (e) {
        // Not JSON
      }
      
      if (message.includes("API key not valid")) {
        message = "API 密钥无效。请在 AI Studio 的“设置”菜单中配置正确的 GEMINI_API_KEY。如果您使用的是免费模型，请确保您的项目已正确关联。";
      }
      
      throw new Error(message);
    }
  };

  const handleFileUpload = async (file: File) => {
    const newFile: ThesisFile = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + 'MB',
      type: file.type,
      date: new Date().toLocaleString(),
      status: '分析中'
    };

    setFiles(prev => [newFile, ...prev]);
    setIsAnalyzing(true);
    setCurrentFile(newFile);
    setView('analysis');

    try {
      const text = await extractText(file);
      if (!text || text.trim().length < 50) {
        throw new Error("未能从文件中提取到足够的文本内容。请确保文件不是加密的，且包含可识别的文字内容。");
      }
      const analysis = await analyzeThesis(text);
      
      setFiles(prev => prev.map(f => f.id === newFile.id ? { ...f, status: '已完成', analysis, text, error: undefined } : f));
      setCurrentFile({ ...newFile, status: '已完成', analysis, text, error: undefined });
    } catch (error) {
      console.error('Analysis failed:', error);
      const message = error instanceof Error ? error.message : "Unknown error";
      setFiles(prev => prev.map(f => f.id === newFile.id ? { ...f, status: '失败', error: message } : f));
      setCurrentFile(prev => prev?.id === newFile.id ? { ...prev, status: '失败', error: message } : prev);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLibraryImport = async (lit: Literature) => {
    setIsLibraryOpen(false);
    
    const newFile: ThesisFile = {
      id: Math.random().toString(36).substr(2, 9),
      name: lit.title + (lit.type === 'pdf' ? '.pdf' : '.docx'),
      size: lit.size,
      type: lit.type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      date: new Date().toLocaleString(),
      status: '分析中'
    };

    setFiles(prev => [newFile, ...prev]);
    setIsAnalyzing(true);
    setCurrentFile(newFile);
    setView('analysis');

    try {
      // Simulate analysis for library items
      const analysis = await analyzeThesis(lit.abstract + " " + lit.title);
      
      setFiles(prev => prev.map(f => f.id === newFile.id ? { ...f, status: '已完成', analysis, text: lit.abstract } : f));
      setCurrentFile({ ...newFile, status: '已完成', analysis, text: lit.abstract });
    } catch (error) {
      console.error('Library import analysis failed:', error);
      setFiles(prev => prev.map(f => f.id === newFile.id ? { ...f, status: '失败' } : f));
      setCurrentFile(prev => prev?.id === newFile.id ? { ...prev, status: '失败' } : prev);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReanalyze = async (file: ThesisFile) => {
    if (!file.text && !file.analysis) return;
    
    setIsAnalyzing(true);
    setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: '分析中' } : f));
    setCurrentFile({ ...file, status: '分析中' });

    try {
      let text = file.text;
      if (!text) {
        // If text is missing, we can't re-analyze without the original File object
        // but for library items we have the abstract
        text = file.analysis?.abstractEval || "";
      }
      
      const analysis = await analyzeThesis(text);
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: '已完成', analysis } : f));
      setCurrentFile({ ...file, status: '已完成', analysis });
    } catch (error) {
      console.error('Re-analysis failed:', error);
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: '失败' } : f));
      setCurrentFile(prev => prev?.id === file.id ? { ...prev, status: '失败' } : prev);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleStar = (lit: Literature) => {
    setLibraryItems(prev => {
      const exists = prev.find(item => item.id === lit.id);
      if (exists) {
        return prev.map(item => item.id === lit.id ? { ...item, isStarred: !item.isStarred } : item);
      } else {
        return [{ ...lit, isStarred: true }, ...prev];
      }
    });
  };

  const handleLogout = () => {
    setUserProfile(null);
    setFiles([]);
    setCurrentFile(null);
    setLibraryItems(MOCK_LIBRARY);
    localStorage.removeItem('user_profile');
    localStorage.removeItem('thesis_files');
    localStorage.removeItem('library_items');
    setView('login');
  };

  const renderView = () => {
    switch (view) {
      case 'login': return <LoginView onNavigate={setView} />;
      case 'register': return <RegisterView onNavigate={setView} />;
      case 'upload': return (
        <UploadView 
          onNavigate={setView} 
          files={files} 
          onUpload={handleFileUpload} 
          isAnalyzing={isAnalyzing}
          onSelectFile={(f) => {
            setCurrentFile(f);
            setView('analysis');
          }}
          onOpenLibrary={() => setIsLibraryOpen(true)}
        />
      );
      case 'analysis': return (
        <AnalysisView 
          onNavigate={setView} 
          file={currentFile} 
          onReanalyze={handleReanalyze}
        />
      );
      case 'setup': return (
        <SetupView 
          onNavigate={setView} 
          onComplete={setUserProfile} 
        />
      );
      case 'report': return <ReportView onNavigate={setView} file={currentFile} />;
      case 'profile': return (
        <ProfileView 
          onNavigate={setView} 
          files={files} 
          profile={userProfile}
          onLogout={handleLogout}
        />
      );
      case 'library': return (
        <LibraryView 
          onNavigate={setView} 
          files={files} 
          onUpload={handleFileUpload}
          isAnalyzing={isAnalyzing}
          onSelectFile={(f) => {
            setCurrentFile(f);
            setView('analysis');
          }}
        />
      );
      case 'history': return (
        <HistoryView 
          onNavigate={setView} 
          files={files} 
          onSelectFile={(f) => {
            setCurrentFile(f);
            setView('analysis');
          }}
        />
      );
      case 'starred': return (
        <StarredView 
          onNavigate={setView} 
          items={libraryItems} 
          onToggleStar={toggleStar}
          onImport={handleLibraryImport}
        />
      );
      default: return <LoginView onNavigate={setView} />;
    }
  };

  const showNav = ['upload', 'analysis', 'report', 'profile'].includes(view);

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-6 relative">
      <AnimatePresence mode="wait">
        {renderView()}
      </AnimatePresence>

      <AnimatePresence>
        {isLibraryOpen && (
          <LiteratureLibraryModal 
            isOpen={isLibraryOpen} 
            onClose={() => setIsLibraryOpen(false)} 
            onImport={handleLibraryImport}
            libraryItems={libraryItems}
            onToggleStar={toggleStar}
          />
        )}
      </AnimatePresence>

      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-outline-variant/10 px-4 py-2">
          <div className="max-w-2xl mx-auto flex justify-around items-center h-16">
            <button 
              onClick={() => setView('upload')}
              className={`flex flex-col items-center gap-1 transition-all ${view === 'upload' ? 'text-primary' : 'text-outline-variant'}`}
            >
              <CloudUpload className={view === 'upload' ? '!text-primary' : ''} />
              <span className="text-[10px] font-bold uppercase tracking-widest">上传</span>
            </button>
            <button 
              onClick={() => setView('analysis')}
              className={`flex flex-col items-center gap-1 transition-all ${view === 'analysis' ? 'text-primary' : 'text-outline-variant'}`}
            >
              <Analytics className={view === 'analysis' ? '!text-primary' : ''} />
              <span className="text-[10px] font-bold uppercase tracking-widest">分析</span>
            </button>
            <button 
              onClick={() => setView('report')}
              className={`flex flex-col items-center gap-1 transition-all ${view === 'report' ? 'text-primary' : 'text-outline-variant'}`}
            >
              <Assessment className={view === 'report' ? '!text-primary' : ''} />
              <span className="text-[10px] font-bold uppercase tracking-widest">报告</span>
            </button>
            <button 
              onClick={() => setView('profile')}
              className={`flex flex-col items-center gap-1 transition-all ${view === 'profile' ? 'text-primary' : 'text-outline-variant'}`}
            >
              <Person className={view === 'profile' ? '!text-primary' : ''} />
              <span className="text-[10px] font-bold uppercase tracking-widest">我的</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
