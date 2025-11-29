import React, { useState, useRef } from 'react';
import { BodyMetrics } from '../types';
import { Camera, X, Loader2, Edit3 } from 'lucide-react';
import { extractDataFromImage } from '../services/geminiService';

interface DataEntryModalProps {
  onClose: () => void;
  onSave: (data: Omit<BodyMetrics, 'id'>) => void;
}

const DataEntryModal: React.FC<DataEntryModalProps> = ({ onClose, onSave }) => {
  const [mode, setMode] = useState<'manual' | 'scan'>('scan');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '',
    skeletalMuscleMass: '',
    bodyFatMass: '',
    percentBodyFat: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      date: new Date(formData.date).toISOString(),
      weight: parseFloat(formData.weight),
      skeletalMuscleMass: parseFloat(formData.skeletalMuscleMass),
      bodyFatMass: parseFloat(formData.bodyFatMass),
      percentBodyFat: parseFloat(formData.percentBodyFat),
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        try {
          const extracted = await extractDataFromImage(base64String);
          setFormData(prev => ({
            ...prev,
            weight: extracted.weight?.toString() || prev.weight,
            skeletalMuscleMass: extracted.skeletalMuscleMass?.toString() || prev.skeletalMuscleMass,
            bodyFatMass: extracted.bodyFatMass?.toString() || prev.bodyFatMass,
            percentBodyFat: extracted.percentBodyFat?.toString() || prev.percentBodyFat,
          }));
          setMode('manual'); 
        } catch (err) {
          alert("無法辨識資料，請嘗試手動輸入。");
        } finally {
            setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const triggerCamera = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 bg-pop-dark/40 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 pb-2 flex justify-between items-center">
          <h2 className="text-2xl font-display font-bold text-pop-dark">
            New Record
          </h2>
          <button onClick={onClose} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors">
            <X size={20} className="text-pop-dark" />
          </button>
        </div>

        {/* Custom Segmented Control */}
        <div className="px-6 py-2">
            <div className="flex bg-gray-100 p-1 rounded-2xl">
            <button
                onClick={() => setMode('scan')}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                mode === 'scan' ? 'bg-pop-dark text-white shadow-md' : 'text-gray-400 hover:text-gray-600'
                }`}
            >
                <Camera size={18} strokeWidth={2.5} />
                Scan
            </button>
            <button
                onClick={() => setMode('manual')}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                mode === 'manual' ? 'bg-pop-dark text-white shadow-md' : 'text-gray-400 hover:text-gray-600'
                }`}
            >
                <Edit3 size={18} strokeWidth={2.5} />
                Manual
            </button>
            </div>
        </div>

        {/* Content */}
        <div className="p-6 pt-2 h-[450px] overflow-y-auto">
          {mode === 'scan' ? (
            <div className="h-full flex flex-col justify-center items-center gap-6">
              <div 
                onClick={triggerCamera}
                className="w-full aspect-square max-h-64 rounded-3xl border-4 border-dashed border-pop-blue/30 bg-pop-blue/5 flex flex-col items-center justify-center cursor-pointer hover:bg-pop-blue/10 transition-colors group"
              >
                 {loading ? (
                    <>
                        <Loader2 className="animate-spin text-pop-blue mb-4" size={48} />
                        <span className="font-bold text-pop-blue">Processing Image...</span>
                    </>
                 ) : (
                    <>
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300">
                            <Camera size={32} className="text-pop-blue" strokeWidth={2.5} />
                        </div>
                        <h3 className="text-lg font-bold text-pop-dark mb-1">Take a Photo</h3>
                        <p className="text-gray-400 text-sm font-semibold">QR Code or Result Sheet</p>
                    </>
                 )}
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Date</label>
                <input
                  type="date"
                  name="date"
                  required
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full bg-transparent text-lg font-bold text-pop-dark outline-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {[
                    { label: 'Weight (kg)', name: 'weight', color: 'bg-pop-lime/30 focus-within:bg-pop-lime/50' },
                    { label: 'Muscle (kg)', name: 'skeletalMuscleMass', color: 'bg-pop-blue/30 focus-within:bg-pop-blue/50' },
                    { label: 'Fat Mass (kg)', name: 'bodyFatMass', color: 'bg-pop-pink/30 focus-within:bg-pop-pink/50' },
                    { label: 'Body Fat (%)', name: 'percentBodyFat', color: 'bg-gray-100 focus-within:bg-gray-200' }
                ].map((field) => (
                    <div key={field.name} className={`${field.color} p-4 rounded-2xl transition-all duration-300 focus-within:scale-[1.02]`}>
                        <label className="block text-xs font-bold text-pop-dark/70 uppercase mb-1">{field.label}</label>
                        <input
                            type="number"
                            step="0.1"
                            name={field.name}
                            placeholder="0"
                            required
                            // @ts-ignore
                            value={formData[field.name]}
                            onChange={handleInputChange}
                            className="w-full bg-transparent text-2xl font-bold text-pop-dark placeholder-pop-dark/20 outline-none"
                        />
                    </div>
                ))}
              </div>

              <div className="pt-4 pb-2">
                <button
                  type="submit"
                  className="w-full bg-pop-dark text-white py-4 rounded-2xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-pop-dark/20"
                >
                  Save Entry
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataEntryModal;