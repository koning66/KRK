import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BodyMetrics, AIAnalysis } from './types';
import './app.css';
import WelcomeSplash from './WelcomeSplash';
import MetricsChart from './components/MetricsChart';
import MultiMetricsChart from './components/MultiMetricsChart';
import DataEntryModal from './components/DataEntryModal';
import { analyzeTrends } from './services/geminiService';
import {
  Plus,
  Sparkles,
  Trash2,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Activity,
  RotateCcw,
  X,
} from 'lucide-react';

const STORAGE_KEY = 'bodymetrics_data';
const ANALYSIS_KEY = 'bodymetrics_analysis';

// --- Swipeable Row Component ---
interface SwipeableRowProps {
  item: BodyMetrics;
  onDelete: (id: string) => void;
}

const SwipeableRow: React.FC<SwipeableRowProps> = ({ item, onDelete }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef<number>(0);
  const currentOffsetX = useRef<number>(0);
  const rowRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;

    startX.current = e.clientX;
    currentOffsetX.current = offsetX;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const diff = e.clientX - startX.current;
    const newOffset = Math.min(0, Math.max(-300, currentOffsetX.current + diff));
    setOffsetX(newOffset);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;

    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    if (offsetX < -120) {
      setOffsetX(-500);
      setTimeout(() => {
        onDelete(item.id);
        setOffsetX(0);
      }, 200);
    } else {
      setOffsetX(0);
    }
  };

  const opacity = Math.min(1, Math.abs(offsetX) / 100);

  return (
    <div
      className="relative mb-3 h-[80px] w-full select-none overflow-hidden rounded-2xl touch-pan-y"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Background Action (Delete) */}
      <div
        className="absolute inset-0 bg-red-500 z-0 flex items-center justify-end pr-8 rounded-2xl transition-opacity duration-200"
        style={{ opacity }}
      >
        <div className="flex items-center gap-2 text-white font-bold">
          <Trash2 size={24} className="animate-pulse" />
          <span className="text-sm">Release to Delete</span>
        </div>
      </div>

      {/* Foreground Content */}
      <div
        ref={rowRef}
        className="relative bg-white p-4 h-full flex justify-between items-center z-10 border border-gray-100 shadow-sm rounded-2xl"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          willChange: 'transform',
          touchAction: 'pan-y',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="flex flex-col pointer-events-none">
          <span className="font-bold text-pop-dark text-lg">
            {new Date(item.date).toLocaleDateString('zh-TW', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <span className="text-xs text-gray-400 font-semibold">
            {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })}
          </span>
        </div>

        <div className="flex gap-4 sm:gap-8 text-right pointer-events-none">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold text-gray-400">Weight</span>
            <span className="font-bold text-pop-dark">{item.weight}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold text-gray-400">Mus</span>
            <span className="font-bold text-pop-blue">{item.skeletalMuscleMass}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold text-gray-400">Fat</span>
            <span className="font-bold text-pop-pink">{item.bodyFatMass}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold text-gray-400">%</span>
            <span className="font-bold text-pop-lime text-pop-dark/80">
              {item.percentBodyFat}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  const [data, setData] = useState<BodyMetrics[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'charts' | 'history'>('charts');

  const [deletedItem, setDeletedItem] = useState<BodyMetrics | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 控制迎賓畫面顯示 2.2 秒
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  // 載入 localStorage 資料
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    const savedAnalysis = localStorage.getItem(ANALYSIS_KEY);

    if (savedData) setData(JSON.parse(savedData));
    if (savedAnalysis) setAnalysis(JSON.parse(savedAnalysis));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const handleAddData = (newData: Omit<BodyMetrics, 'id'>) => {
    const record: BodyMetrics = {
      ...newData,
      id: crypto.randomUUID(),
    };

    const updatedData = [...data, record].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    setData(updatedData);
    setShowModal(false);

    if (updatedData.length > 1) {
      triggerAnalysis(updatedData);
    }
  };

  const triggerAnalysis = useCallback(async (currentData: BodyMetrics[]) => {
    try {
      const result = await analyzeTrends(currentData);
      setAnalysis(result);
      localStorage.setItem(ANALYSIS_KEY, JSON.stringify(result));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleDelete = (id: string) => {
    const itemToDelete = data.find((item) => item.id === id);
    if (!itemToDelete) return;

    setData((prev) => prev.filter((item) => item.id !== id));
    setDeletedItem(itemToDelete);
    setShowUndo(true);

    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    undoTimeoutRef.current = setTimeout(() => {
      setShowUndo(false);
      setDeletedItem(null);
    }, 4000);
  };

  const handleUndo = () => {
    if (deletedItem) {
      setData((prev) =>
        [...prev, deletedItem].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        ),
      );
      setShowUndo(false);
      setDeletedItem(null);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    }
  };

  const exportCSV = () => {
    if (data.length === 0) return;

    const headers = [
      'Date',
      'Weight (kg)',
      'Skeletal Muscle (kg)',
      'Fat Mass (kg)',
      'Body Fat (%)',
    ];

    const rows = data.map((d) => [
      new Date(d.date).toLocaleDateString('zh-TW'),
      d.weight,
      d.skeletalMuscleMass,
      d.bodyFatMass,
      d.percentBodyFat,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `body_metrics_${new Date().toISOString().split('T')[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const latestData = data.length > 0 ? data[data.length - 1] : null;
  const startData = data.length > 0 ? data[0] : null;

  const getDiff = (key: keyof BodyMetrics) => {
    if (!latestData || !startData) return 0;
    return (latestData[key] as number) - (startData[key] as number);
  };

  const getGreetingMessage = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const TrendIcon = ({
    value,
    inverse = false,
    isDark = false,
  }: {
    value: number;
    inverse?: boolean;
    isDark?: boolean;
  }) => {
    if (Math.abs(value) < 0.1)
      return (
        <Minus
          size={16}
          className={isDark ? 'text-white/50' : 'text-pop-dark/50'}
        />
      );

    const colorClass = isDark ? 'text-white' : 'text-pop-dark';
    if (value > 0)
      return <ArrowUpRight size={18} className={colorClass} strokeWidth={2.5} />;
    return (
      <ArrowDownRight size={18} className={colorClass} strokeWidth={2.5} />
    );
  };

  return (
    <>
      {/* 迎賓畫面 */}
      {showSplash && <WelcomeSplash />}

      {/* 主畫面 */}
      <div className="min-h-screen pb-20 font-sans overflow-x-hidden select-none bg-[#FDFBF7]">
        {/* Header Area */}
        <div className="pt-10 pb-6 px-6 bg-white rounded-b-[2.5rem] shadow-sm sticky top-0 z-30">
          <div className="max-w-3xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-indigo-900">
                {getGreetingMessage()}
              </h1>
              <p className="text-sm text-gray-400 font-semibold">
                Small Choices Big Changes
              </p>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="bg-pop-dark text-white rounded-full p-3 shadow-lg hover:scale-105 transition-transform"
            >
              <Plus size={24} strokeWidth={2.5} />
            </button>
          </div>

          {/* Date Strips */}
          <div className="max-w-3xl mx-auto mt-6 flex justify-between gap-2 overflow-x-auto no-scrollbar">
            {[-2, -1, 0, 1, 2].map((offset) => {
              const d = new Date();
              d.setDate(d.getDate() + offset);
              const isToday = offset === 0;
              return (
                <div
                  key={offset}
                  className={`flex flex-col items-center justify-center min-w-[3.5rem] h-[4.5rem] rounded-2xl ${
                    isToday
                      ? 'bg-pop-lime text-pop-dark'
                      : 'bg-gray-50 text-gray-400'
                  }`}
                >
                  <span className="text-xs font-bold">
                    {d.toLocaleDateString('en-US', { day: 'numeric' })}
                  </span>
                  <span className="text-[10px] font-bold uppercase">
                    {d.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <main className="max-w-3xl mx-auto px-6 mt-6 space-y-6">
          {/* Summary Cards */}
          {latestData ? (
            <div className="grid grid-cols-1 gap-4">
              {/* Weight Card */}
              <div className="bg-pop-dark rounded-3xl p-6 relative overflow-hidden min-h-[160px] flex flex-col justify-between group hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start">
                  <span className="font-display font-bold text-lg text-white">
                    Current Weight
                  </span>
                  <span className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-white">
                    {new Date(latestData.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <div className="flex items-end gap-2 mt-2">
                  <span className="text-5xl font-display font-bold text-white tracking-tight">
                    {latestData.weight}
                  </span>
                  <span className="text-lg font-bold text-white/60 mb-1">
                    kg
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-4 bg-white/10 w-fit px-3 py-1.5 rounded-xl backdrop-blur-md">
                  <TrendIcon value={getDiff('weight')} inverse isDark />
                  <span className="text-sm font-bold text-white">
                    {Math.abs(getDiff('weight')).toFixed(1)} kg from start
                  </span>
                </div>

                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-pop-blue/20 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-3 gap-3">
                {/* Muscle */}
                <div className="bg-pop-blue rounded-3xl p-4 relative overflow-hidden min-h-[140px] flex flex-col justify-between">
                  <span className="font-display font-bold text-sm text-pop-dark leading-tight">
                    Muscle
                    <br />
                    Mass
                  </span>
                  <div>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-2xl font-display font-bold text-pop-dark">
                        {latestData.skeletalMuscleMass}
                      </span>
                      <span className="text-[10px] font-bold text-pop-dark/60">
                        kg
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-0.5 opacity-70">
                      <TrendIcon value={getDiff('skeletalMuscleMass')} />
                      <span className="text-[10px] font-bold">
                        {Math.abs(getDiff('skeletalMuscleMass')).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="absolute top-[-10%] right-[-10%] w-12 h-12 bg-white/20 rounded-full blur-xl" />
                </div>

                {/* Fat Mass */}
                <div className="bg-pop-pink rounded-3xl p-4 relative overflow-hidden min-h-[140px] flex flex-col justify-between">
                  <span className="font-display font-bold text-sm text-pop-dark leading-tight">
                    Fat
                    <br />
                    Mass
                  </span>
                  <div>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-2xl font-display font-bold text-pop-dark">
                        {latestData.bodyFatMass}
                      </span>
                      <span className="text-[10px] font-bold text-pop-dark/60">
                        kg
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-0.5 opacity-70">
                      <TrendIcon value={getDiff('bodyFatMass')} inverse />
                      <span className="text-[10px] font-bold">
                        {Math.abs(getDiff('bodyFatMass')).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="absolute bottom-[-10%] left-[-10%] w-12 h-12 bg-white/20 rounded-full blur-xl" />
                </div>

                {/* Body Fat % */}
                <div className="bg-pop-lime rounded-3xl p-4 relative overflow-hidden min-h-[140px] flex flex-col justify-between">
                  <span className="font-display font-bold text-sm text-pop-dark leading-tight">
                    Body Fat
                    <br />%
                  </span>
                  <div>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-2xl font-display font-bold text-pop-dark">
                        {latestData.percentBodyFat}
                      </span>
                      <span className="text-[10px] font-bold text-pop-dark/60">
                        %
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-0.5 opacity-70">
                      <TrendIcon value={getDiff('percentBodyFat')} inverse />
                      <span className="text-[10px] font-bold">
                        {Math.abs(getDiff('percentBodyFat')).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/20 rounded-full blur-xl" />
                </div>
              </div>
            </div>
          ) : (
            // Empty State
            <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100">
              <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="text-pop-lime" size={32} />
              </div>
              <h3 className="text-xl font-bold text-pop-dark mb-2">No Data Yet</h3>
              <p className="text-gray-400 mb-6 text-sm">
                Start tracking your journey today.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="text-pop-blue font-bold text-sm bg-pop-blue/10 px-6 py-3 rounded-xl"
              >
                Add First Record
              </button>
            </div>
          )}

          {/* Coach AI */}
          {analysis && (
            <div className="bg-white rounded-3xl p-6 shadow-soft relative overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-pop-dark text-white p-2 rounded-xl">
                  <Sparkles size={18} />
                </div>
                <h3 className="font-bold text-pop-dark">AI Coach</h3>
              </div>
              <div className="space-y-3">
                <p className="text-pop-dark/80 text-sm leading-relaxed font-medium">
                  {analysis.summary}
                </p>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <span className="text-xs font-bold text-pop-pink uppercase tracking-wider block mb-1">
                    Recommendation
                  </span>
                  <p className="text-pop-dark font-bold text-sm">
                    {analysis.recommendation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Switcher */}
          {data.length > 0 && (
            <div className="flex p-1 bg-gray-200 rounded-2xl">
              <button
                onClick={() => setActiveTab('charts')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'charts'
                    ? 'bg-white shadow-sm text-pop-dark'
                    : 'text-gray-500'
                }`}
              >
                Charts
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'history'
                    ? 'bg-white shadow-sm text-pop-dark'
                    : 'text-gray-500'
                }`}
              >
                History
              </button>
            </div>
          )}

          {/* Charts Section */}
          {data.length > 0 && activeTab === 'charts' && (
            <div className="space-y-4 pb-10">
              <MultiMetricsChart data={data} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MetricsChart
                  data={data}
                  dataKey="weight"
                  name="Weight Trend"
                  unit="kg"
                  color="#2A2655"
                />
                <MetricsChart
                  data={data}
                  dataKey="skeletalMuscleMass"
                  name="Muscle"
                  unit="kg"
                  color="#9BA9FF"
                />
                <MetricsChart
                  data={data}
                  dataKey="bodyFatMass"
                  name="Fat Mass"
                  unit="kg"
                  color="#FB85D9"
                />
                <MetricsChart
                  data={data}
                  dataKey="percentBodyFat"
                  name="Body Fat %"
                  unit="%"
                  color="#9EBD48"
                />
              </div>
            </div>
          )}

          {/* History Section */}
          {data.length > 0 && activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-bold text-lg text-pop-dark ml-2">History</h3>
                <button
                  onClick={exportCSV}
                  className="text-pop-dark bg-white p-2 rounded-xl shadow-sm hover:scale-105 transition-transform"
                >
                  <Download size={18} />
                </button>
              </div>

              <div className="pb-10">
                <p className="text-center text-xs text-gray-400 mb-4">
                  Swipe left to delete
                </p>
                {[...data].reverse().map((item) => (
                  <SwipeableRow key={item.id} item={item} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Undo Toast */}
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
            showUndo ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
          }`}
        >
          <div className="bg-pop-dark text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4">
            <span className="text-sm font-bold">Record deleted</span>
            <button
              onClick={handleUndo}
              className="flex items-center gap-1 text-pop-lime font-bold text-sm hover:underline"
            >
              <RotateCcw size={16} /> Undo
            </button>
            <button
              onClick={() => setShowUndo(false)}
              className="ml-2 text-white/50 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Data Entry Modal */}
        {showModal && (
          <DataEntryModal
            onClose={() => setShowModal(false)}
            onSave={handleAddData}
          />
        )}
      </div>
    </>
  );
};

export default App;
