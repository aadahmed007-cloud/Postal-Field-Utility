import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { MapPin, Calendar, Search, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Gallery() {
  const { user, role, loading: authLoading } = useAuth();
  const [offices, setOffices] = useState<any[]>([]);
  const [filter, setFilter] = useState('الكل');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  const governorates = ['الكل', ...new Set(offices.map(o => o.governorate))];
  const postalAreas = ['الكل', ...new Set(offices.filter(o => filter === 'الكل' || o.governorate === filter).map(o => o.postalArea))];
  
  const [postalFilter, setPostalFilter] = useState('الكل');

  const filteredOffices = offices.filter(o => 
    (filter === 'الكل' || o.governorate === filter) &&
    (postalFilter === 'الكل' || o.postalArea === postalFilter) &&
    (o.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     o.governorate.includes(searchTerm) ||
     o.postalArea.includes(searchTerm))
  );

  if (authLoading) return <div className="p-20 text-center font-['Cairo']">جاري التحميل...</div>;

  return (
    <Layout title="معرض الصور الميداني">
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        {/* Filter Bar */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">المحافظة</label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {governorates.map(gov => (
                  <button
                    key={gov}
                    onClick={() => { setFilter(gov); setPostalFilter('الكل'); }}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                      filter === gov 
                        ? 'bg-green-700 text-white border-green-700' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-green-300'
                    }`}
                  >
                    {gov}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">المنطقة البريدية</label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {postalAreas.map(area => (
                  <button
                    key={area}
                    onClick={() => setPostalFilter(area)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border ${
                      postalFilter === area 
                        ? 'bg-slate-800 text-white border-slate-800' 
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="text-xs text-slate-400 font-bold italic">
               تم العثور على {filteredOffices.length} صورة
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
                placeholder="بحث..." 
              />
            </div>
          </div>
        </section>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredOffices.map((office) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={office.id}
                className="group relative bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all"
              >
                <div className="aspect-square bg-slate-100 overflow-hidden relative">
                  <img 
                    src={office.photoURL} 
                    alt={office.name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute top-3 right-3">
                     <span className="bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold text-green-700">
                        {office.governorate}
                     </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-slate-800 truncate">{office.name}</h3>
                  <div className="flex flex-col gap-1 mt-2">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{office.address}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                      <Calendar className="w-3 h-3" />
                      <span>{office.createdAt?.toDate()?.toLocaleDateString('ar-EG')}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredOffices.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <ImageIcon className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-slate-400 font-bold">لم يتم العثور على صور مطابقة</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
