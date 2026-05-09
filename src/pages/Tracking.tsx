/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { collection, query, where, orderBy, onSnapshot, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { MapPin, User, Search, AlertCircle, History } from 'lucide-react';

const API_KEY = (process.env.GOOGLE_MAPS_PLATFORM_KEY || '').trim();
const hasValidKey = Boolean(API_KEY) && API_KEY.length > 5 && API_KEY !== 'YOUR_API_KEY';

const center = { lat: 30.0444, lng: 31.2357 }; // Cairo

function MapHistoryPolyline({ path }: { path: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || path.length < 2) return;
    const polyline = new google.maps.Polyline({
      path,
      strokeColor: '#15803d',
      strokeOpacity: 0.8,
      strokeWeight: 4,
      geodesic: true,
      map
    });
    return () => polyline.setMap(null);
  }, [map, path]);
  return null;
}

export default function Tracking() {
  const { user, role, loading: authLoading } = useAuth();
  const [activeStaff, setActiveStaff] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [staffHistory, setStaffHistory] = useState<any[]>([]);
  const [allStaffToday, setAllStaffToday] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || role !== 'ADMIN') return;

    const path = 'tracking_logs';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Query for all logs today to identify active staff
    const q = query(
      collection(db, path),
      where('timestamp', '>=', Timestamp.fromDate(today)),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!users[data.userId]) {
          users[data.userId] = { 
            id: doc.id, 
            ...data,
            isOnline: data.timestamp?.toDate() > new Date(Date.now() - 15 * 60 * 1000)
          };
        }
      });
      const staffList = Object.values(users).sort((a, b) => b.timestamp - a.timestamp);
      setAllStaffToday(staffList);
      
      // Update active (live) staff for markers
      setActiveStaff(staffList.filter(s => s.isOnline));
      
      setError(null);
    }, (err) => {
      setError("حدث خطأ في صلاحيات التتبع المباشر.");
      handleFirestoreError(err, OperationType.LIST, path);
    });

    return unsubscribe;
  }, [user, role, authLoading]);

  const fetchStaffHistory = async (userId: string) => {
    const path = 'tracking_logs';
    const today = new Date();
    today.setHours(0,0,0,0);

    const q = query(
      collection(db, path),
      where('userId', '==', userId),
      where('timestamp', '>=', Timestamp.fromDate(today)),
      orderBy('timestamp', 'asc')
    );

    try {
      const snapshot = await getDocs(q);
      const points = snapshot.docs.map(doc => doc.data().location);
      setStaffHistory(points);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  };

  if (authLoading) return <div className="p-20 text-center font-['Cairo']">جاري التحميل...</div>;

  if (!hasValidKey) {
    return (
      <Layout title="إعداد الخريطة">
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-right font-['Cairo']" dir="rtl">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-10 h-10 text-green-700" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">مطلوب مفتاح Google Maps API</h2>
            <div className="space-y-6 text-slate-600 text-sm leading-relaxed">
              <p>لتفعيل ميزة التتبع المباشر، يرجى اتباع الخطوات التالية:</p>
              <ol className="text-right space-y-4 px-4">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-xs">١</span>
                  <span>احصل على مفتاح من <a href="https://console.cloud.google.com/google/maps-apis/start" target="_blank" rel="noopener" className="text-green-700 font-bold underline">منصة Google Cloud</a></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-xs">٢</span>
                  <span>افتح <strong>Settings</strong> (أيقونة الترس في الزاوية العلوية)</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-xs">٣</span>
                  <span>اختر <strong>Secrets</strong> وأضف مفتاحاً باسم <code>VITE_GOOGLE_MAPS_API_KEY</code></span>
                </li>
              </ol>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-xs">
                <strong>تنبيهات هامة:</strong>
                <ul className="list-disc list-inside mr-4 mt-1 space-y-1">
                  <li>تأكد من تفعيل "Maps JavaScript API" في حسابك.</li>
                  <li>إذا ظهر خطأ <strong>InvalidKeyMapError</strong>، فهذا يعني أن المفتاح الذي أدخلته غير صحيح أو تم حذفه.</li>
                  <li>تأكد من عدم وجود مسافات زائدة حول المفتاح عند إضافته في Secrets.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="التتبع المباشر">
      <div className="relative h-[calc(100vh-160px)] -m-6 md:-m-8 overflow-hidden font-['Cairo']">
        {error && (
          <div className="absolute top-4 left-4 right-4 z-50 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 shadow-lg" dir="rtl">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        <APIProvider apiKey={API_KEY} version="weekly" language="ar" region="EG">
          <Map
            defaultCenter={center}
            defaultZoom={12}
            mapId="9dc2c1c3fcd1e1a5" // Placeholder Map ID for Advanced Markers
            disableDefaultUI={true}
            zoomControl={true}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            {activeStaff.map((staff) => (
              <AdvancedMarker
                key={staff.userId}
                position={staff.location}
                onClick={() => {
                  setSelectedStaff(staff);
                  fetchStaffHistory(staff.userId);
                }}
              >
                <Pin background="#15803d" borderColor="#ffffff" glyphColor="#ffffff" scale={1.2} />
              </AdvancedMarker>
            ))}

            {selectedStaff && !activeStaff.find(s => s.userId === selectedStaff.userId) && (
              <AdvancedMarker
                position={selectedStaff.location}
                onClick={() => fetchStaffHistory(selectedStaff.userId)}
              >
                <Pin background="#64748b" borderColor="#ffffff" glyphColor="#ffffff" scale={1.1} />
              </AdvancedMarker>
            )}

            {staffHistory.length > 0 && (
              <AdvancedMarker position={staffHistory[0]}>
                 <Pin background="#0ea5e9" borderColor="#ffffff" glyphColor="#ffffff" scale={0.8} />
                 <InfoWindow position={staffHistory[0]} headerDisabled>
                    <div className="text-[9px] font-bold py-0.5 px-1">نقطة البداية اليوم</div>
                 </InfoWindow>
              </AdvancedMarker>
            )}

            <MapHistoryPolyline path={staffHistory} />

            {selectedStaff && (
              <InfoWindow
                position={selectedStaff.location}
                onCloseClick={() => {
                  setSelectedStaff(null);
                  setStaffHistory([]);
                }}
              >
                <div className="p-2 text-right dir-rtl font-['Cairo'] max-w-[200px]" dir="rtl">
                  <h3 className="font-bold text-green-800">{selectedStaff.userName}</h3>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                     <History className="w-3 h-3" />
                     <span>آخر تحديث: {selectedStaff.timestamp?.toDate().toLocaleTimeString('ar-EG')}</span>
                  </div>
                  <p className="text-[10px] mt-1 text-slate-400">يتم عرض مسار الحركة لهذا اليوم باللون الأخضر</p>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>

        {/* Floating Panel */}
        <div className="absolute top-6 right-6 bottom-6 w-80 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl flex flex-col overflow-hidden hidden md:flex" dir="rtl">
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-4">
               <MapPin className="text-green-700 w-5 h-5" />
               <h2 className="font-bold text-slate-800">الموظفين النشطين</h2>
            </div>
            <div className="relative">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-700/20" 
                placeholder="بحث باسم الموظف..." 
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {allStaffToday.filter(s => s.userName?.toLowerCase().includes(searchTerm.toLowerCase())).map(staff => (
               <button 
                 key={staff.userId}
                 onClick={() => {
                   setSelectedStaff(staff);
                   fetchStaffHistory(staff.userId);
                 }}
                 className={`w-full p-3 rounded-xl border transition-all flex items-center gap-3 text-right group ${
                   selectedStaff?.userId === staff.userId ? 'border-green-500 bg-green-50 shadow-sm' : 'border-slate-100 hover:bg-slate-50'
                 }`}
               >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                       {staff.photoURL ? (
                         <img src={staff.photoURL} className="w-full h-full object-cover" alt="" />
                       ) : (
                         <User className="w-6 h-6 text-slate-400" />
                       )}
                    </div>
                    {staff.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-slate-700 truncate text-xs">{staff.userName}</div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                        staff.isOnline ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {staff.isOnline ? 'متصل' : 'غير متصل'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      آخر تواجد: {staff.timestamp?.toDate().toLocaleTimeString('ar-EG')}
                    </div>
                  </div>
               </button>
             ))}
             {allStaffToday.length === 0 && (
               <div className="text-center py-10 text-slate-400 text-sm">لا يوجد موظفين نشطين اليوم</div>
             )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
