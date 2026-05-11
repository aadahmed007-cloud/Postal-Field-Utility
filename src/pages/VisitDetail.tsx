import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import {ArrowRight, Printer, CheckCircle2, MapPin, Calendar, User, Info, AlertTriangle, AlertCircle, Download, Loader2, X, Edit3, Save} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const API_KEY = (process.env.GOOGLE_MAPS_PLATFORM_KEY || '').trim();
const hasValidKey = Boolean(API_KEY) && API_KEY.length > 5 && API_KEY !== 'YOUR_API_KEY';

export default function VisitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const [visit, setVisit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    if (!id || authLoading || !user) return;
    
    const fetchVisit = async () => {
      const path = `offices/${id}`;
      try {
        const docRef = await getDoc(doc(db, 'offices', id));
        if (docRef.exists()) {
          setVisit({ id: docRef.id, ...docRef.data() });
          setEditForm(docRef.data());
        } else {
          setError("هذا السجل غير موجود.");
        }
      } catch (err) {
        setError("لا تملك صلاحية عرض هذا التقرير.");
        handleFirestoreError(err, OperationType.GET, path);
      } finally {
        setLoading(false);
      }
    };
    fetchVisit();
  }, [id, user, authLoading]);

  const handleApprove = async () => {
    if (!visit || !id) return;
    setApproving(true);
    try {
      await updateDoc(doc(db, 'offices', id), { isApproved: true });
      setVisit((prev: any) => ({ ...prev, isApproved: true }));
    } catch (err) {
      alert("تعذر اعتماد التقرير");
      handleFirestoreError(err, OperationType.UPDATE, `offices/${id}`);
    } finally {
      setApproving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!visit || !id) return;
    setSavingEdit(true);
    try {
      await updateDoc(doc(db, 'offices', id), editForm);
      setVisit((prev: any) => ({ ...prev, ...editForm }));
      setIsEditing(false);
    } catch (err) {
      alert("تعذر حفظ التعديلات");
      handleFirestoreError(err, OperationType.UPDATE, `offices/${id}`);
    } finally {
      setSavingEdit(false);
    }
  };

  if (authLoading || loading) return <Layout title="تحميل..."><div className="p-20 text-center font-['Cairo']">جاري التحميل...</div></Layout>;
  
  if (error) {
    return (
      <Layout title="خطأ">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-800">{error}</h2>
          <button onClick={() => navigate(-1)} className="mt-6 text-green-700 font-bold flex items-center gap-2">
             <ArrowRight className="w-4 h-4" />
             العودة للخلف
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`تقرير: ${visit.name}`}>
      <div className="space-y-8">
        {/* Header Actions */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print-hide">
           <div className="flex items-center gap-4 w-full lg:w-auto">
              <button 
                onClick={() => navigate(-1)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white border border-transparent hover:border-slate-200 transition-all print-hide shrink-0"
              >
                <ArrowRight className="w-5 h-5 text-slate-800" />
              </button>
              <div className="flex-1">
                {isEditing ? (
                  <input 
                    value={editForm.name || ''} 
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="text-2xl font-bold text-green-900 border-b-2 border-green-500 bg-transparent outline-none w-full"
                    placeholder="اسم المكتب"
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-green-900 italic flex items-center gap-2">
                    مكتب بريد {visit.name}
                  </h1>
                )}
                <div className="flex gap-4 text-xs text-slate-400 mt-1">
                   <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {visit.createdAt?.toDate().toLocaleDateString('ar-EG')}</span>
                   <span className="flex items-center gap-1"><User className="w-3 h-3" /> الموظف: {visit.inspectorName}</span>
                </div>
              </div>
           </div>
           <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full lg:w-auto print-hide">
              <button 
                onClick={() => {
                  const htmlContent = `
                    <html dir="rtl">
                      <head>
                        <meta charset="utf-8">
                        <title>تقرير زيارة - ${visit.name}</title>
                        <style>
                          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; line-height: 1.6; color: #334155; background: #f8fafc; }
                          .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; }
                          .header { text-align: center; border-bottom: 3px solid #047857; padding-bottom: 20px; margin-bottom: 30px; }
                          .logo { font-size: 28px; font-weight: bold; color: #047857; margin-bottom: 5px; }
                          .section { margin-bottom: 25px; background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #f1f5f9; }
                          .section-title { font-weight: bold; color: #1e293b; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 18px; }
                          .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; }
                          .info-item { margin-bottom: 12px; }
                          .label { color: #64748b; font-size: 13px; display: block; margin-bottom: 2px; }
                          .value { color: #0f172a; font-weight: bold; font-size: 15px; }
                          .positive { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 20px; border-radius: 12px; margin-top: 20px; }
                          .negative { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 20px; border-radius: 12px; margin-top: 20px; }
                          .notes { line-height: 1.8; color: #475569; font-style: italic; }
                        </style>
                      </head>
                      <body>
                        <div class="container">
                          <div class="header">
                            <div class="logo">بريد مصر - قطاع الرقابة والتفتيش</div>
                            <div style="color: #64748b;">تقرير زيارة ميدانية رقم #${visit.id?.slice(0, 8)}</div>
                          </div>

                          <div class="section">
                            <div class="section-title">معلومات المكتب</div>
                            <div class="grid">
                              <div class="info-item"><span class="label">اسم المكتب</span> <span class="value">مكتب بريد ${visit.name}</span></div>
                              <div class="info-item"><span class="label">المحافظة</span> <span class="value">${visit.governorate}</span></div>
                              <div class="info-item"><span class="label">القطاع</span> <span class="value">${visit.sector || 'غير محدد'}</span></div>
                              <div class="info-item"><span class="label">المنطقة البريدية</span> <span class="value">${visit.postalArea}</span></div>
                              <div class="info-item"><span class="label">قائم بالزيارة</span> <span class="value">${visit.inspectorName}</span></div>
                              <div class="info-item"><span class="label">تاريخ الزيارة</span> <span class="value">${visit.createdAt?.toDate?.() ? visit.createdAt.toDate().toLocaleString('ar-EG') : '---'}</span></div>
                            </div>
                          </div>

                          <div class="positive">
                            <div class="section-title" style="color: #166534; border-bottom-color: #bbf7d0;">النقاط الإيجابية والتميز</div>
                            <div class="notes">${visit.positiveNotes || 'لم يتم تسجيل ملاحظات إيجابية.'}</div>
                          </div>

                          <div class="negative">
                            <div class="section-title" style="color: #991b1b; border-bottom-color: #fecaca;">الملاحظات السلبية والمعوقات</div>
                            <div class="notes">${visit.negativeNotes || 'تم التحقق من عدم وجود سلبيات جوهرية.'}</div>
                          </div>

                          <div class="section" style="margin-top: 25px;">
                            <div class="section-title">التوصيات والتقرير التفصيلي</div>
                            <div class="notes">${visit.notes || 'لا يوجد تقرير إضافي.'}</div>
                          </div>

                          <div style="margin-top: 40px; text-align: center; color: #94a3b8; font-size: 11px; font-style: italic;">
                            صدر هذا التقرير بتاريخ: ${new Date().toLocaleString('ar-EG')} - نسخة رقمية معتمدة.
                          </div>
                        </div>
                      </body>
                    </html>
                  `;
                  const blob = new Blob([htmlContent], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `report-${visit.name.replace(/\s+/g, '-')}-${new Date().getTime()}.html`;
                  a.click();
                }}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all font-['Cairo']"
              >
                <Download className="w-4 h-4" />
                تصدير HTML
              </button>
              <button onClick={() => window.print()} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl font-bold hover:bg-emerald-100 transition-all font-['Cairo']">
                <Printer className="w-4 h-4" />
                طباعة
              </button>
              
              {role === 'ADMIN' && (
                <>
                  {isEditing ? (
                    <button 
                      onClick={handleSaveEdit}
                      disabled={savingEdit}
                      className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all font-['Cairo'] shadow-md"
                    >
                      {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      حفظ التعديلات
                    </button>
                  ) : (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all font-['Cairo'] shadow-md"
                    >
                      <Edit3 className="w-4 h-4" />
                      تعديل التقرير
                    </button>
                  )}
                  
                  {!isEditing && (
                    <button 
                      onClick={handleApprove}
                      disabled={approving || visit.isApproved}
                      className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-md font-['Cairo'] ${visit.isApproved ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-green-700 text-white hover:bg-green-800'}`}
                    >
                      {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {visit.isApproved ? 'تم الاعتماد' : 'اعتماد'}
                    </button>
                  )}
                </>
              )}
           </div>
        </header>

        {/* Report Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           {/* Left Column: Details */}
           <div className="lg:col-span-8 space-y-8">
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                    <Info className="w-5 h-5 text-green-700" />
                    <h3 className="font-bold text-slate-800">التفاصيل النصية والملاحظات</h3>
                 </div>
                 <div className="p-8 space-y-8">
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 italic text-slate-700 leading-loose">
                       {isEditing ? (
                         <textarea 
                           className="w-full bg-white border border-slate-300 rounded p-4 outline-none focus:border-green-500"
                           rows={4}
                           value={editForm.notes || ''}
                           onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                           placeholder="الملاحظات التفصيلية"
                         />
                       ) : (
                         visit.notes || "لا توجد ملاحظات تفصيلية مسجلة لهذه الزيارة."
                       )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
                          <h4 className="font-bold text-green-700 mb-2 flex items-center gap-2">
                             <CheckCircle2 className="w-4 h-4" />
                             نقاط إيجابية
                          </h4>
                          {isEditing ? (
                             <textarea 
                               className="w-full bg-white border border-green-200 rounded p-2 outline-none focus:border-green-500 text-sm"
                               rows={6}
                               value={editForm.positiveNotes || ''}
                               onChange={(e) => setEditForm({...editForm, positiveNotes: e.target.value})}
                             />
                          ) : (
                            <p className="text-sm text-slate-600 leading-relaxed italic whitespace-pre-wrap">
                              {visit.positiveNotes || "لم يتم تسجيل ملاحظات إيجابية محددة."}
                            </p>
                          )}
                       </div>
                       <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                          <h4 className="font-bold text-red-700 mb-2 flex items-center gap-2">
                             <AlertTriangle className="w-4 h-4" />
                             ملاحظات سلبية
                          </h4>
                          {isEditing ? (
                             <textarea 
                               className="w-full bg-white border border-red-200 rounded p-2 outline-none focus:border-red-500 text-sm"
                               rows={6}
                               value={editForm.negativeNotes || ''}
                               onChange={(e) => setEditForm({...editForm, negativeNotes: e.target.value})}
                             />
                          ) : (
                            <p className="text-sm text-slate-600 leading-relaxed italic whitespace-pre-wrap">
                              {visit.negativeNotes || "لم يتم تسجيل ملاحظات سلبية محددة."}
                            </p>
                          )}
                       </div>
                    </div>
                 </div>
              </section>

              {/* Photos */}
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-slate-800">معرض الصور المرفقة</h3>
                 </div>
                 <div className="p-6">
                    <div 
                      className="aspect-video rounded-xl border border-slate-200 overflow-hidden bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => visit.photoURL && setIsImageOpen(true)}
                    >
                       {visit.photoURL ? (
                         <img src={visit.photoURL} alt="Visit Photo" className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">لا توجد صور مرفقة</div>
                       )}
                    </div>
                 </div>
              </section>
           </div>

           {/* Right Column: Metadata */}
           <div className="lg:col-span-4 space-y-8">
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-green-700" />
                    <h3 className="font-bold text-slate-800">الموقع الجغرافي</h3>
                 </div>
                 <div className="p-6 space-y-4">
                    {visit.location && visit.location.lat && visit.location.lng ? (
                      <div className="bg-slate-100 aspect-video rounded-xl overflow-hidden relative">
                        {hasValidKey ? (
                          <APIProvider apiKey={API_KEY}>
                            <Map
                              defaultCenter={{ lat: visit.location.lat, lng: visit.location.lng }}
                              defaultZoom={15}
                              mapId="visit-location-map"
                              disableDefaultUI={true}
                              zoomControl={true}
                              gestureHandling="greedy"
                            >
                              <AdvancedMarker position={{ lat: visit.location.lat, lng: visit.location.lng }}>
                                <Pin background={'#15803d'} borderColor={'#166534'} glyphColor={'#ffffff'} />
                              </AdvancedMarker>
                            </Map>
                          </APIProvider>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center border border-slate-200 rounded-xl bg-slate-50">
                             <MapPin className="w-8 h-8 text-slate-400 mb-2" />
                             <p className="text-sm font-bold text-slate-500 mb-1">الخريطة غير متوفرة</p>
                             <p className="text-xs text-slate-400">يرجى إضافة مفتاح Google Maps API في الإعدادات</p>
                             <p className="text-xs text-slate-400 mt-2 font-mono" dir="ltr">{visit.location.lat.toFixed(6)}, {visit.location.lng.toFixed(6)}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-100 aspect-video rounded-xl flex items-center justify-center font-bold text-slate-400">
                        لم يتم تسجيل الموقع الجغرافي.
                      </div>
                    )}
                    <div className="space-y-1">
                       {isEditing ? (
                         <>
                           <input 
                             value={editForm.address || ''}
                             onChange={e => setEditForm({...editForm, address: e.target.value})}
                             className="w-full font-bold text-slate-800 border-b border-slate-300 outline-none mb-2 bg-transparent"
                             placeholder="العنوان"
                           />
                           <input 
                             value={editForm.governorate || ''}
                             onChange={e => setEditForm({...editForm, governorate: e.target.value})}
                             className="w-full text-xs text-slate-600 border-b border-slate-300 outline-none bg-transparent"
                             placeholder="المحافظة"
                           />
                         </>
                       ) : (
                         <>
                           <p className="font-bold text-slate-800">{visit.address}</p>
                           <p className="text-xs text-slate-400">{visit.governorate}</p>
                         </>
                       )}
                    </div>
                 </div>
              </section>

              <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
                 <h3 className="font-bold text-slate-800">بيانات المنطقة</h3>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-slate-50">
                       <span className="text-sm text-slate-400">المنطقة البريدية</span>
                       {isEditing ? (
                         <input 
                           value={editForm.postalArea || ''}
                           onChange={e => setEditForm({...editForm, postalArea: e.target.value})}
                           className="text-sm font-bold border-b border-slate-300 outline-none w-1/2 text-left bg-transparent"
                         />
                       ) : (
                         <span className="text-sm font-bold text-green-800">{visit.postalArea}</span>
                       )}
                    </div>
                    {visit.sector && (
                      <div className="flex justify-between items-center py-3 border-b border-slate-50">
                         <span className="text-sm text-slate-400">القطاع</span>
                         {isEditing ? (
                           <input 
                             value={editForm.sector || ''}
                             onChange={e => setEditForm({...editForm, sector: e.target.value})}
                             className="text-sm font-bold border-b border-slate-300 outline-none w-1/2 text-left bg-transparent"
                           />
                         ) : (
                           <span className="text-sm font-bold text-green-800">{visit.sector}</span>
                         )}
                      </div>
                    )}
                 </div>
              </section>
           </div>
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      <AnimatePresence>
        {isImageOpen && visit?.photoURL && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 print-hide"
            onClick={() => setIsImageOpen(false)}
          >
            <button 
              className="absolute top-6 right-6 text-white hover:text-slate-300 p-2"
              onClick={() => setIsImageOpen(false)}
            >
              <X className="w-8 h-8" />
            </button>
            <motion.img 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              src={visit.photoURL} 
              alt="Visit Photo Fullscreen" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" 
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}

