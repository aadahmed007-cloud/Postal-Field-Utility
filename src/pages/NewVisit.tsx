import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, MapPin, Send, Loader2, CheckCircle2, RotateCcw, RotateCw, Crop, X, Check, Smile, Frown, MessageSquare, AlertTriangle } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../lib/cropUtils';

export default function NewVisit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Image Editor States
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [previewMode, setPreviewMode] = useState<'edit' | 'original'>('edit');

  const [formData, setFormData] = useState({
    name: '',
    officeType: '',
    address: '',
    governorate: '',
    postalArea: '',
    sector: '',
    positiveNotes: '',
    negativeNotes: '',
    notes: '',
  });

  const OFFLINE_DRAFT_KEY = 'visit_draft_data';

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem(OFFLINE_DRAFT_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (Object.keys(parsed).length > 0 && confirm('وجدنا مسودة غير مكتملة. هل ترغب في استرجاعها؟')) {
          setFormData(parsed);
        }
      } catch(e) {}
    }
  }, []);

  // Save to draft on change
  useEffect(() => {
    localStorage.setItem(OFFLINE_DRAFT_KEY, JSON.stringify(formData));
  }, [formData]);

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

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setTempImageUrl(url);
      setRotation(0);
      setZoom(1);
      // Clear previous photo if any to force re-processing on submit
      setPhoto(null);
      setPhotoPreview(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !location || !tempImageUrl) return alert("يرجى التقاط صورة والحصول على الموقع أولاً");
    setShowConfirmModal(true);
  };

  const handleFinalSubmit = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    try {
      // 1. Process the crop if needed
      let finalFile: File | null = photo;

      if (tempImageUrl && croppedAreaPixels && !photo) {
        const croppedBlob = await getCroppedImg(tempImageUrl, croppedAreaPixels, rotation);
        if (croppedBlob) {
          finalFile = new File([croppedBlob], `visit_photo_${Date.now()}.jpg`, { type: "image/jpeg" });
        }
      }

      if (!finalFile) {
        throw new Error("لم يتم معالجة الصورة بشكل صحيح");
      }

      // 2. Compress image
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: true };
      const compressedFile = await imageCompression(finalFile, options);

      // 3. Upload to Storage
      const storageRef = ref(storage, `offices/${Date.now()}_${finalFile.name}`);
      await uploadBytes(storageRef, compressedFile);
      const photoURL = await getDownloadURL(storageRef);

      // 4. Save to Firestore
      await addDoc(collection(db, 'offices'), {
        ...formData,
        location,
        photoURL,
        inspectorId: user.uid,
        inspectorName: user.displayName,
        createdAt: serverTimestamp(),
      });

      localStorage.removeItem(OFFLINE_DRAFT_KEY);
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
        <div className="flex flex-col items-center justify-center py-20 text-center font-['Cairo']">
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
      <div className="max-w-2xl mx-auto space-y-8 font-['Cairo']">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Capture & Inline Editor */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-700">صورة المكتب</label>
                {tempImageUrl && (
                  <div className="flex flex-col gap-2">
                    <button 
                      type="button" 
                      onClick={() => {
                          setTempImageUrl(null);
                          setPhoto(null);
                          setPhotoPreview(null);
                      }}
                      className="text-xs font-bold text-red-600 flex items-center justify-end gap-1 hover:underline group self-end"
                    >
                      <RotateCcw className="w-3 h-3 transition-transform group-hover:-rotate-45" />
                      تغيير الصورة
                    </button>
                    
                    <div className="flex bg-slate-100 p-1 rounded-xl w-fit mx-auto border border-slate-200">
                      <button 
                        type="button"
                        onClick={() => setPreviewMode('original')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${previewMode === 'original' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        الصورة الأصلية
                      </button>
                      <button 
                        type="button"
                        onClick={() => setPreviewMode('edit')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${previewMode === 'edit' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        تعديل القص
                      </button>
                    </div>
                  </div>
                )}
             </div>
             
             <div className="relative">
               <div 
                 className={`w-full aspect-video border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center overflow-hidden bg-white transition-all shadow-inner relative ${tempImageUrl ? 'border-green-600' : 'cursor-pointer hover:bg-slate-50 hover:border-green-300'}`}
                 onClick={() => !tempImageUrl && document.getElementById('photo-input')?.click()}
               >
                  {tempImageUrl ? (
                    <div className="absolute inset-0 z-10 w-full h-full">
                      {previewMode === 'edit' ? (
                        <Cropper
                          image={tempImageUrl}
                          crop={crop}
                          rotation={rotation}
                          zoom={zoom}
                          aspect={16 / 9}
                          onCropChange={setCrop}
                          onRotationChange={setRotation}
                          onCropComplete={onCropComplete}
                          onZoomChange={setZoom}
                        />
                      ) : (
                        <img 
                          src={tempImageUrl} 
                          alt="Original" 
                          className="w-full h-full object-contain bg-slate-900" 
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center group">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Camera className="w-8 h-8 text-slate-400 group-hover:text-green-600" />
                      </div>
                      <span className="text-slate-400 font-bold">اضغط لالتقاط أو اختيار صورة</span>
                      <span className="text-[10px] text-slate-300 mt-1 uppercase tracking-tight">JPG, PNG, WebP</span>
                    </div>
                  )}
               </div>

               {tempImageUrl && previewMode === 'edit' && (
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="mt-4 p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-5"
                 >
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                       <div className="flex-1 w-full space-y-2">
                          <div className="flex justify-between items-center px-1">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">التكبير (Zoom)</label>
                             <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-lg">{zoom.toFixed(1)}x</span>
                          </div>
                          <input 
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e: any) => setZoom(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-100 rounded-full appearance-none accent-green-700 cursor-pointer"
                          />
                       </div>
                       <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => setRotation(r => r - 90)}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 hover:bg-green-50 hover:text-green-700 transition-all flex flex-col items-center gap-1 group"
                          >
                            <RotateCcw className="w-4 h-4 transition-transform group-active:-rotate-45" />
                            <span className="text-[9px] font-bold">يسار</span>
                          </button>
                          <button 
                            type="button"
                            onClick={() => setRotation(r => r + 90)}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 hover:bg-green-50 hover:text-green-700 transition-all flex flex-col items-center gap-1 group"
                          >
                            <RotateCw className="w-4 h-4 transition-transform group-active:rotate-45" />
                            <span className="text-[9px] font-bold">يمين</span>
                          </button>
                       </div>
                    </div>
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-xl border border-amber-100">
                       <Crop className="w-4 h-4 flex-shrink-0" />
                       <span className="text-[11px] font-bold">يمكنك تحريك الصورة داخل المربع لتحديد الزاوية المثالية.</span>
                    </div>
                 </motion.div>
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
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3 text-emerald-900">
              <MapPin className="w-5 h-5" />
              <span className="font-bold text-sm">الإحداثيات الحالية (GPS)</span>
            </div>
            <div className="text-xs font-mono text-emerald-700 dir-ltr bg-white px-3 py-1 rounded-lg border border-emerald-200">
              {location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : 'جاري التحديد...'}
            </div>
          </div>

          {/* Form Fields */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-1">اسم المكتب</label>
                <input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-green-600 text-slate-800 font-bold transition-all outline-none" 
                  placeholder="أدخل اسم المكتب البريدي"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-1">نوع المكتب</label>
                <select 
                  required
                  value={formData.officeType}
                  onChange={e => setFormData({...formData, officeType: e.target.value})}
                  className="w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-green-600 font-bold outline-none cursor-pointer"
                >
                  <option value="">اختر النوع</option>
                  <option value="مكتب رئيسي">مكتب رئيسي</option>
                  <option value="فرع">فرع</option>
                  <option value="مركز خدمة">مركز خدمة</option>
                  <option value="كشك بريدي">كشك بريدي</option>
                  <option value="مكتب متنقل">مكتب متنقل</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-1">المحافظة</label>
                <select 
                  required
                  value={formData.governorate}
                  onChange={e => setFormData({...formData, governorate: e.target.value})}
                  className="w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-green-600 font-bold outline-none"
                >
                  <option value="">اختر</option>
                  <option value="القاهرة">القاهرة</option>
                  <option value="الجيزة">الجيزة</option>
                  <option value="الإسكندرية">الإسكندرية</option>
                  <option value="القليوبية">القليوبية</option>
                  <option value="البحيرة">البحيرة</option>
                  <option value="الغربية">الغربية</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-1">المنطقة البريدية</label>
                <input 
                  required
                  value={formData.postalArea}
                  onChange={e => setFormData({...formData, postalArea: e.target.value})}
                  className="w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-green-600 font-bold outline-none" 
                  placeholder="مثلاً: شرق القاهرة"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-1">القطاع</label>
                <input 
                  required
                  value={formData.sector}
                  onChange={e => setFormData({...formData, sector: e.target.value})}
                  className="w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-green-600 font-bold outline-none" 
                  placeholder="مثلاً: بريد بنها"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-1">العنوان بالتفصيل</label>
              <input 
                required
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                className="w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-green-600 font-bold outline-none" 
                placeholder="رقم المبنى، الشارع، المعلم"
              />
            </div>

            <div className="pt-4 space-y-6">
              <div className="flex items-center gap-3">
                 <div className="h-0.5 flex-1 bg-slate-100"></div>
                 <div className="flex items-center gap-2 text-slate-400">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">التقييم الميداني</span>
                 </div>
                 <div className="h-0.5 flex-1 bg-slate-100"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-xs font-black text-green-700 flex items-center gap-2 uppercase tracking-wider">
                    <Smile className="w-4 h-4" />
                    النقاط الإيجابية والتميز
                  </label>
                  <textarea 
                    rows={4}
                    required
                    value={formData.positiveNotes}
                    onChange={e => setFormData({...formData, positiveNotes: e.target.value})}
                    className="w-full p-5 rounded-[1.5rem] bg-green-50/50 border-2 border-green-100 focus:bg-white focus:border-green-500 text-slate-700 font-bold placeholder:text-green-900/30 transition-all outline-none resize-none shadow-inner" 
                    placeholder="ما هي الأشياء المميزة التي لاحظتها؟"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-red-700 flex items-center gap-2 uppercase tracking-wider">
                    <Frown className="w-4 h-4" />
                    السلبيات والمعوقات
                  </label>
                  <textarea 
                    rows={4}
                    required
                    value={formData.negativeNotes}
                    onChange={e => setFormData({...formData, negativeNotes: e.target.value})}
                    className="w-full p-5 rounded-[1.5rem] bg-red-50/50 border-2 border-red-100 focus:bg-white focus:border-red-500 text-slate-700 font-bold placeholder:text-red-900/30 transition-all outline-none resize-none shadow-inner" 
                    placeholder="ما هي المشكلات التي تحتاج لمعالجة؟"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-1">التقرير التفصيلي الختامي</label>
              <textarea 
                rows={4}
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                className="w-full p-5 rounded-[1.5rem] bg-slate-50 border-2 border-transparent focus:bg-white focus:border-green-600 font-bold outline-none resize-none" 
                placeholder="أضف أي ملاحظات فنية أو إدارية أخرى..."
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full h-16 bg-green-700 text-white rounded-[1.5rem] font-black flex items-center justify-center gap-3 hover:bg-green-800 active:scale-95 transition-all shadow-xl shadow-green-100 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-5 h-5" />}
            إرسال التقرير الميداني
          </button>
        </form>
      </div>

      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 font-['Cairo']">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 text-right relative overflow-hidden"
               dir="rtl"
             >
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-[5rem] -z-10" />
                
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-6 text-amber-600">
                   <AlertTriangle className="w-8 h-8" />
                </div>
                
                <h2 className="text-2xl font-black text-slate-800 mb-2">تأكيد إرسال التقرير</h2>
                <div className="bg-slate-50 rounded-2xl p-4 mb-6 space-y-2 text-sm">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-slate-400">اسم المكتب:</span>
                    <span className="font-bold text-slate-700">{formData.name}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-slate-400">المحافظة:</span>
                    <span className="font-bold text-slate-700">{formData.governorate}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-slate-400">النوع:</span>
                    <span className="font-bold text-slate-700">{formData.officeType}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">الصور المرفقة:</span>
                    <span className={`font-bold ${tempImageUrl ? 'text-green-600' : 'text-red-600'}`}>
                      {tempImageUrl ? 'متوفرة' : 'غير متوفرة'}
                    </span>
                  </div>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed mb-8">
                  هل أنت متأكد من صحة كافة البيانات المدخلة؟ لا يمكن تعديل التقرير بعد إرساله. سيتم تسجيل موقعك الجغرافي الحالي وتاريخ الزيارة تلقائياً.
                </p>
                
                <div className="space-y-3">
                   <button 
                     onClick={handleFinalSubmit}
                     className="w-full py-4 rounded-2xl bg-green-700 text-white font-black flex items-center justify-center gap-2 hover:bg-green-800 transition-all shadow-xl shadow-green-100"
                   >
                     <Check className="w-5 h-5" />
                     نعم، إرسال الآن
                   </button>
                   <button 
                     onClick={() => setShowConfirmModal(false)}
                     className="w-full py-4 rounded-2xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-all"
                   >
                     مراجعة البيانات
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
