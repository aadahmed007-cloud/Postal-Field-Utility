import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { MapPin, Calendar, Search, Image as ImageIcon, AlertCircle, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Gallery() {
  const { user, role, loading: authLoading } = useAuth();
  const [offices, setOffices] = useState<any[]>([]);
  const [filter, setFilter] = useState('الكل');
  const [typeFilter, setTypeFilter] = useState('الكل');
  const [postalFilter, setPostalFilter] = useState('الكل');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || !role) return;

    const path = 'offices';
    const q = query(
      collection(db, path), 
      role === 'EMPLOYEE' ? where('inspectorId', '==', user.uid) : where('inspectorId', '!=', ''),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOffices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setError(null);
    }, (err) => {
      setError("حدث خطأ في عرض الصور. يرجى مراجعة الصلاحيات.");
      handleFirestoreError(err, OperationType.LIST, path);
    });

    return unsubscribe;
  }, [user, role, authLoading]);

  // Flatten images from all offices to display them individually
  const allPhotos = offices.flatMap(office => {
    const photos = Array.isArray(office.photos) ? office.photos : (office.photoURL ? [office.photoURL] : []);
    return photos.map((url: string, index: number) => ({
      id: `${office.id}-${index}`,
      url,
      officeName: office.name,
      officeType: office.officeType,
      governorate: office.governorate,
      postalArea: office.postalArea,
      address: office.address,
      inspectorName: office.inspectorName,
      createdAt: office.createdAt
    }));
  });

  const governorates = ['الكل', ...new Set(offices.map(o => o.governorate).filter(Boolean).sort())];
  const officeTypes = ['الكل', ...new Set(offices.map(o => o.officeType).filter(Boolean).sort())];
  const postalAreas = ['الكل', ...new Set(offices
    .filter(o => filter === 'الكل' || o.governorate === filter)
    .map(o => o.postalArea)
    .filter(Boolean)
    .sort()
  )];
  
  const filteredPhotos = allPhotos.filter(photo => {
    const photoDate = photo.createdAt?.toDate ? photo.createdAt.toDate() : null;
    let matchesDate = true;
    
    if (photoDate) {
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (photoDate < start) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (photoDate > end) matchesDate = false;
      }
    } else if (startDate || endDate) {
      matchesDate = false;
    }

    return (
      (filter === 'الكل' || photo.governorate === filter) &&
      (typeFilter === 'الكل' || photo.officeType === typeFilter) &&
      (postalFilter === 'الكل' || photo.postalArea === postalFilter) &&
      matchesDate &&
      (photo.officeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
       photo.governorate.includes(searchTerm) ||
       photo.officeType?.includes(searchTerm) ||
       photo.postalArea.includes(searchTerm))
    );
  });

  if (authLoading) return <div className="p-20 text-center font-['Cairo']">جاري التحميل...</div>;

  return (
    <Layout title="معرض الصور الميداني">
      <div className="space-y-6 font-['Cairo']">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        {/* Filter Bar */}
        <section className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">تصفية حسب نوع المكتب</label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                {officeTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                      typeFilter === type 
                        ? 'bg-blue-700 text-white border-blue-700 shadow-lg shadow-blue-100' 
                        : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-blue-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">تصفية حسب المحافظة</label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                {governorates.map(gov => (
                  <button
                    key={gov}
                    onClick={() => { setFilter(gov); setPostalFilter('الكل'); }}
                    className={`px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                      filter === gov 
                        ? 'bg-green-700 text-white border-green-700 shadow-lg shadow-green-100' 
                        : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-green-300'
                    }`}
                  >
                    {gov}
                  </button>
                ))}
              </div>
            </div>

            {filter !== 'الكل' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">المنطقة البريدية</label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                  {postalAreas.map(area => (
                    <button
                      key={area}
                      onClick={() => setPostalFilter(area)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all border ${
                        postalFilter === area 
                          ? 'bg-slate-800 text-white border-slate-800' 
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2 border-t border-slate-50 pt-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">من تاريخ</label>
                <input 
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-700/20 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">إلى تاريخ</label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-700/20 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="text-xs text-slate-400 font-bold">
               إجمالي الصور المكتشفة: <span className="text-green-700">{filteredPhotos.length}</span>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-700/20 outline-none transition-all" 
                placeholder="ابحث عن مكتب أو محافظة..." 
              />
            </div>
          </div>
        </section>

        {/* Gallery Grid - Masonry Style */}
        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredPhotos.map((photo) => (
              <motion.div
                layout="position"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 30,
                  opacity: { duration: 0.2 }
                }}
                key={photo.id}
                onClick={() => setSelectedImage(photo.url)}
                className="break-inside-avoid group relative bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-zoom-in"
              >
                <div className="relative overflow-hidden bg-slate-100 min-h-[100px]">
                  <img 
                    src={photo.url} 
                    alt={photo.officeName} 
                    className="w-full h-auto object-cover transition-transform duration-1000 group-hover:scale-110 bg-slate-50"
                    loading="lazy"
                    decoding="async"
                  />
                  
                  {/* Overlay on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-green-900/95 via-green-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-5">
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      whileHover={{ y: 0, opacity: 1 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-lg text-[9px] font-black text-white uppercase tracking-widest">
                          {photo.governorate}
                        </span>
                        <span className="bg-blue-500/40 backdrop-blur-md px-2 py-0.5 rounded-lg text-[9px] font-black text-white uppercase tracking-widest">
                          {photo.officeType}
                        </span>
                        <span className="bg-green-500/40 backdrop-blur-md px-2 py-0.5 rounded-lg text-[9px] font-black text-white uppercase tracking-widest">
                          {photo.postalArea}
                        </span>
                      </div>
                      <h3 className="text-white font-black text-sm leading-tight">
                        مكتب بريد {photo.officeName}
                      </h3>
                      <p className="text-white/80 text-[10px] font-bold line-clamp-1 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                        {photo.address}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-white/70 text-[9px] font-bold">
                            <Calendar className="w-2.5 h-2.5" />
                            <span>{photo.createdAt?.toDate ? photo.createdAt.toDate().toLocaleDateString('ar-EG') : '---'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-green-300 text-[9px] font-bold">
                            <User className="w-2.5 h-2.5" />
                            <span>{photo.inspectorName}</span>
                          </div>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white">
                          <Search className="w-3 h-3" />
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredPhotos.length === 0 && (
          <div className="py-24 text-center flex flex-col items-center">
            <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center mb-6">
              <ImageIcon className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">لا توجد صور</h3>
            <p className="text-slate-400 text-sm">لم يتم العثور على أي نتائج مطابقة لبحثك في الأرشيف.</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-10 cursor-zoom-out"
            onClick={() => setSelectedImage(null)}
          >
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-6 left-6 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImage} 
              className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
