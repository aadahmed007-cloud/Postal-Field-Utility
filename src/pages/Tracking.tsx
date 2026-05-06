/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { collection, query, where, orderBy, onSnapshot, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { MapPin, User, Search, AlertCircle, History } from 'lucide-react';

const containerStyle = { width: '100%', height: 'calc(100vh - 128px)' };
const center = { lat: 30.0444, lng: 31.2357 }; // Cairo

export default function Tracking() {
  const { user, role, loading: authLoading } = useAuth();
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  const [activeStaff, setActiveStaff] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [staffHistory, setStaffHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || role !== 'ADMIN') return;

    const path = 'tracking_logs';
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    // Fetch latest pulses for all users
    const q = query(
      collection(db, path),
      where('timestamp', '>=', Timestamp.fromDate(fifteenMinsAgo)),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!users[data.userId]) {
          users[data.userId] = { id: doc.id, ...data };
        }
      });
      setActiveStaff(Object.values(users));
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

  return (
    <Layout title="التتبع المباشر">
      <div className="relative h-[calc(100vh-160px)] -m-6 md:-m-8 overflow-hidden">
        {error && (
          <div className="absolute top-4 left-4 right-4 z-50 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 shadow-lg">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}
        {loadError && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-50">
            <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-100 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">خطأ في تهيئة الخريطة</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                يبدو أن هناك مشكلة في مفتاح Google Maps API. يرجى التأكد من تفعيل "Maps JavaScript API" في منصة Google Cloud.
              </p>
              <div className="text-[10px] bg-slate-50 p-3 rounded-lg text-slate-400 font-mono break-all mb-6">
                {loadError.message}
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-green-700 text-white py-3 rounded-xl font-bold hover:bg-green-800 transition-all font-['Cairo']"
              >
                إعادة تحميل الصفحة
              </button>
            </div>
          </div>
        )}
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={12}
            options={{
              styles: mapStyle,
              disableDefaultUI: true,
              zoomControl: true
            }}
          >
            {activeStaff.map((staff) => (
              <Marker
                key={staff.userId}
                position={staff.location}
                onClick={() => {
                  setSelectedStaff(staff);
                  fetchStaffHistory(staff.userId);
                }}
                icon={{
                  url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                  scaledSize: new window.google.maps.Size(40, 40)
                }}
              />
            ))}

            {staffHistory.length > 1 && (
              <Polyline
                path={staffHistory}
                options={{
                  strokeColor: '#15803d',
                  strokeOpacity: 0.8,
                  strokeWeight: 4,
                  geodesic: true,
                }}
              />
            )}

            {selectedStaff && (
              <InfoWindow
                position={selectedStaff.location}
                onCloseClick={() => {
                  setSelectedStaff(null);
                  setStaffHistory([]);
                }}
              >
                <div className="p-2 text-right dir-rtl font-['Cairo'] max-w-[200px]">
                  <h3 className="font-bold text-green-800">{selectedStaff.userName}</h3>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                     <History className="w-3 h-3" />
                     <span>آخر تحديث: {selectedStaff.timestamp?.toDate().toLocaleTimeString('ar-EG')}</span>
                  </div>
                  <p className="text-[10px] mt-1 text-slate-400">يتم عرض مسار الحركة لهذا اليوم باللون الأخضر</p>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        ) : (
          <div className="flex items-center justify-center h-full bg-slate-100 text-slate-400">
             جاري تحميل الخريطة...
          </div>
        )}

        {/* Floating Panel */}
        <div className="absolute top-6 right-6 bottom-6 w-80 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl flex flex-col overflow-hidden hidden md:flex">
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-4">
               <MapPin className="text-green-700 w-5 h-5" />
               <h2 className="font-bold text-slate-800">الموظفين النشطين</h2>
            </div>
            <div className="relative">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
                placeholder="بحث..." 
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {activeStaff.map(staff => (
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
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                       <User className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-700 truncate">{staff.userName}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {staff.timestamp?.toDate().toLocaleTimeString('ar-EG')}
                    </div>
                  </div>
               </button>
             ))}
             {activeStaff.length === 0 && (
               <div className="text-center py-10 text-slate-400 text-sm">لا يوجد موظفين نشطين حالياً</div>
             )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const mapStyle = [
  { "featureType": "administrative", "elementType": "labels.text.fill", "stylers": [{ "color": "#444444" }] },
  { "featureType": "landscape", "elementType": "all", "stylers": [{ "color": "#f2f2f2" }] },
  { "featureType": "poi", "elementType": "all", "stylers": [{ "visibility": "off" }] },
  { "featureType": "road", "elementType": "all", "stylers": [{ "saturation": -100 }, { "lightness": 45 }] },
  { "featureType": "water", "elementType": "all", "stylers": [{ "color": "#cae6f0" }, { "visibility": "on" }] }
];
