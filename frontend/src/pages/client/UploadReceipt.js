import { useState, useRef, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Upload, Camera, FileText, X, Sparkles, CheckCircle, Lock } from 'lucide-react';

const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 transition-colors";

export default function UploadReceipt() {
  const { user } = useAuth();
  const canOCR = user?.plan_name !== 'Básico';
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [ocring, setOcring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);

  const [form, setForm] = useState({ type: 'expense', value: '', date: '', name: '', description: '' });

  const setFormField = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setOcrDone(false);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => setPreview(e.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview('pdf');
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch { toast.error('Câmera não disponível'); }
  };

  const capturePhoto = () => {
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    canvasRef.current.toBlob(blob => {
      const f = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      handleFile(f);
      videoRef.current.srcObject?.getTracks().forEach(t => t.stop());
      setCameraOn(false);
    }, 'image/jpeg', 0.9);
  };

  const handleOCR = async () => {
    if (!file) return toast.error('Selecione um arquivo primeiro');
    if (!canOCR) return toast.error('OCR disponível apenas nos planos Profissional e Premium');
    setOcring(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/client/ocr', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data.valor) setFormField('value', String(data.valor));
      if (data.data) setFormField('date', data.data);
      if (data.nome) setFormField('name', data.nome);
      setOcrDone(true);
      toast.success('Dados extraídos com sucesso!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro no OCR');
    } finally {
      setOcring(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.value || !form.date || !form.name) return toast.error('Preencha os campos obrigatórios');
    setSaving(true);
    try {
      await api.post('/client/transactions', { ...form, value: parseFloat(form.value) });
      toast.success('Transação registrada com sucesso!');
      setFile(null); setPreview(null); setOcrDone(false);
      setForm({ type: 'expense', value: '', date: '', name: '', description: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <main className="flex-1 overflow-y-auto p-4 md:p-8 page-enter">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-white text-3xl font-black tracking-tight" style={{ fontFamily: 'Manrope' }}>Upload de Comprovante</h1>
            <p className="text-slate-400 mt-1">Envie um comprovante e use IA para extrair os dados automaticamente</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upload area */}
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                data-testid="drop-zone"
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current.click()}
                className={`glass-card p-8 text-center cursor-pointer transition-colors border-dashed border-2 ${dragging ? 'border-purple-400 bg-purple-500/10' : 'border-white/10 hover:border-purple-400/50 hover:bg-white/3'}`}
              >
                <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleFile(e.target.files[0])} />
                {preview && preview !== 'pdf' ? (
                  <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded-lg object-contain" />
                ) : preview === 'pdf' ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText size={48} className="text-blue-400" />
                    <p className="text-slate-300 text-sm font-medium">{file?.name}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload size={40} className="text-slate-500" />
                    <p className="text-slate-300 font-medium text-sm">Arraste um arquivo aqui</p>
                    <p className="text-slate-500 text-xs">ou clique para selecionar</p>
                    <p className="text-slate-600 text-xs">JPG, PNG, WEBP, PDF</p>
                  </div>
                )}
              </div>

              {file && (
                <button onClick={() => { setFile(null); setPreview(null); }} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors">
                  <X size={12} /> Remover arquivo
                </button>
              )}

              {/* Camera */}
              <div className="glass-card p-4">
                {cameraOn ? (
                  <div className="space-y-3">
                    <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" />
                    <canvas ref={canvasRef} className="hidden" />
                    <button onClick={capturePhoto} className="w-full btn-pill py-2.5 text-sm">
                      Capturar Foto
                    </button>
                  </div>
                ) : (
                  <button data-testid="camera-btn" onClick={startCamera}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm transition-colors">
                    <Camera size={16} /> Usar Câmera
                  </button>
                )}
              </div>

              {/* OCR button */}
              <button
                data-testid="ocr-btn"
                onClick={handleOCR}
                disabled={!file || ocring || !canOCR}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors
                  ${!canOCR
                    ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                    : 'btn-pill disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
              >
                {!canOCR ? (
                  <><Lock size={16} /> OCR bloqueado (Plano Básico)</>
                ) : ocring ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processando...</>
                ) : ocrDone ? (
                  <><CheckCircle size={16} /> Dados extraídos!</>
                ) : (
                  <><Sparkles size={16} /> Extrair dados com IA</>
                )}
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4" data-testid="transaction-form">
              <h3 className="text-white font-semibold" style={{ fontFamily: 'Manrope' }}>Dados da Transação</h3>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Tipo</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setFormField('type', 'profit')}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${form.type === 'profit' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>
                    Lucro
                  </button>
                  <button type="button" onClick={() => setFormField('type', 'expense')}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${form.type === 'expense' ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>
                    Despesa
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Valor (R$) *</label>
                <input data-testid="form-value" type="number" step="0.01" min="0" value={form.value} onChange={e => setFormField('value', e.target.value)}
                  required className={inputClass} placeholder="0,00" />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Data *</label>
                <input data-testid="form-date" type="date" value={form.date} onChange={e => setFormField('date', e.target.value)}
                  required className={inputClass} />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Descrição *</label>
                <input data-testid="form-name" value={form.name} onChange={e => setFormField('name', e.target.value)}
                  required className={inputClass} placeholder="Ex: Compra de insumos" />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Observações</label>
                <textarea value={form.description} onChange={e => setFormField('description', e.target.value)}
                  rows={3} className={`${inputClass} resize-none`} placeholder="Detalhes adicionais..." />
              </div>

              <button data-testid="save-transaction-btn" type="submit" disabled={saving}
                className="w-full btn-pill py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? 'Salvando...' : 'Registrar Transação'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </Layout>
  );
}
