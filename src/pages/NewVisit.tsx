import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, MapPin, Send, Loader2, CheckCircle2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export default function NewVisit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    governorate: '',
    postalArea: '',
    sector: '',
    positiveNotes: '',
    negativeNotes: '',
    notes: '',
  });

  useEffect(() => {
    // Get GPS location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("Error getting location:", err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !location || !photo) return alert("يرجى التقاط صورة والحصول على الموقع أولاً");

    setLoading(true);
    try {
      // 1. Compress image
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: true };
      const compressedFile = await imageCompression(photo, options);

      // 2. Upload to Storage
      const storageRef = ref(storage, `offices/${Date.now()}_${photo.name}`);
      await uploadBytes(storageRef, compressedFile);
      const photoURL = await getDownloadURL(storageRef);

      // 3. Save to Firestore
      await addDoc(collection(db, 'offices'), {
        ...formData,
        location,
        photoURL,
        inspectorId: user.uid,
        inspectorName: user.displayName,
        createdAt: serverTimestamp(),
      });

      setSubmitted(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("حدث خطأ أثناء إرسال البيانات");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Layout title="إرسال ناجح">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 bg-green-100 text-green-700 rounded-full flex items-center justify-center mb-6"
          >
            <CheckCircle2 className="w-12 h-12" />
          </motion.div>
          <h2 className="text-2xl font-bold text-slate-800">تم إرسال البيانات بنجاح</h2>
          <p className="text-slate-500 mt-2">جاري تحويلك للرئيسية...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="زيارة ميدانية جديدة">
      <div className="max-w-2xl mx-auto space-y-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Capture */}
          <div className="space-y-4">
             <label className="block font-bold text-slate-700">صورة المكتب</label>
             <div 
               onClick={() => document.getElementById('photo-input')?.click()}
               className={`w-full aspect-video border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden bg-white transition-all hover:bg-slate-50 ${photoPreview ? 'border-primary' : ''}`}
             >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera className="w-12 h-12 text-slate-400 mb-2" />
                    <span className="text-slate-400 font-bold">اضغط لالتقاط صورة</span>
                  </>
                )}
             </div>
             <input 
               id="photo-input"
               type="file" 
               accept="image/*" 
               capture="environment"
               onChange={handlePhotoChange} 
               className="hidden" 
             />
          </div>

          {/* Location Info */}
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3 text-emerald-900">
              <MapPin className="w-5 h-5" />
              <span className="font-bold text-sm">الإحداثيات الحالية (GPS)</span>
            </div>
            <div className="text-xs font-mono text-emerald-700 dir-ltr">
              {location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : 'جاري التحديد...'}
            </div>
          </div>

          {/* Form Fields */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600">اسم المكتب</label>
              <input 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-700" 
                placeholder="أدخل اسم المكتب البريدي"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">المحافظة</label>
                <select 
                  required
                  value={formData.governorate}
                  onChange={e => setFormData({...formData, governorate: e.target.value})}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200"
                >
                  <option value="">اختر</option>
                  <option value="القاهرة">القاهرة</option>
                  <option value="الجيزة">الجيزة</option>
                  <option value="الإسكندرية">الإسكندرية</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">المنطقة البريدية</label>
                <input 
                  required
                  value={formData.postalArea}
                  onChange={e => setFormData({...formData, postalArea: e.target.value})}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200" 
                  placeholder="مثلاً: شرق القاهرة"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">القطاع</label>
                <input 
                  required
                  value={formData.sector}
                  onChange={e => setFormData({...formData, sector: e.target.value})}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200" 
                  placeholder="مثلاً: بريد بنها"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600">العنوان بالتفصيل</label>
              <input 
                required
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                className="w-full h-12 px-4 rounded-xl border border-slate-200" 
                placeholder="رقم المبنى، الشارع، المعلم"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-green-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  الملاحظات الإيجابية (النقاط القوية)
                </label>
                <textarea 
                  rows={4}
                  value={formData.positiveNotes}
                  onChange={e => setFormData({...formData, positiveNotes: e.target.value})}
                  className="w-full p-4 rounded-2xl border-2 border-green-100 focus:border-green-500 bg-green-50/10 placeholder:text-slate-300 transition-all outline-none resize-none" 
                  placeholder="ما هي الأشياء المميزة التي لاحظتها؟"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-red-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  الملاحظات السلبية (نقاط الضعف)
                </label>
                <textarea 
                  rows={4}
                  value={formData.negativeNotes}
                  onChange={e => setFormData({...formData, negativeNotes: e.target.value})}
                  className="w-full p-4 rounded-2xl border-2 border-red-100 focus:border-red-500 bg-red-50/10 placeholder:text-slate-300 transition-all outline-none resize-none" 
                  placeholder="ما هي السلبيات أو المعوقات التي تحتاج لتطوير؟"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600">ملاحظات عامة إضافية</label>
              <textarea 
                rows={4}
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                className="w-full p-4 rounded-xl border border-slate-200 resize-none" 
                placeholder="أي تفاصيل أخرى ترغب في ذكرها..."
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full h-[60px] bg-green-700 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-green-800 transition-all shadow-lg shadow-green-900/10 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-5 h-5" />}
            إرسال البيانات
          </button>
        </form>
      </div>
    </Layout>
  );
}
