import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { Plus, Users, MapPin, ClipboardList, TrendingUp, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function Dashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({ totalVisits: 0, activeStaff: 0, coverage: '14/27', positivePoints: 0, negativePoints: 0 });
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || !role) return;

    // 1. Fetch visits for stats and recent list
    const path = 'offices';
    const visitsQuery = query(
      collection(db, path),
      role === 'EMPLOYEE' ? where('inspectorId', '==', user.uid) : where('inspectorId', '!=', ''),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeVisits = onSnapshot(visitsQuery, (snapshot) => {
      const allVisits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      // Calculate stats
      let posCount = 0;
      let negCount = 0;
      allVisits.forEach(v => {
        if (v.positiveNotes) posCount++;
        if (v.negativeNotes) negCount++;
      });

      setRecentVisits(allVisits.slice(0, 5));
      setStats(prev => ({ 
        ...prev, 
        totalVisits: snapshot.size,
        positivePoints: posCount,
        negativePoints: negCount
      }));
      setError(null);
    }, (err) => {
      setError("حدث خطأ في صلاحيات الوصول. يرجى التأكد من تسجيل الدخول بشكل صحيح.");
      handleFirestoreError(err, OperationType.LIST, path);
    });

    // 2. For Admins: Count active staff in last 30 mins
    let unsubscribeTracking = () => {};
    if (role === 'ADMIN') {
      const trackingPath = 'tracking_logs';
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
      const trackingQuery = query(
        collection(db, trackingPath),
        where('timestamp', '>=', thirtyMinsAgo),
        orderBy('timestamp', 'desc')
      );

      unsubscribeTracking = onSnapshot(trackingQuery, (snapshot) => {
        const uniqueUsers = new Set(snapshot.docs.map(doc => doc.data().userId));
        setStats(prev => ({ ...prev, activeStaff: uniqueUsers.size }));
      });
    }

    return () => {
      unsubscribeVisits();
      unsubscribeTracking();
    };
  }, [user, role, authLoading]);

  if (authLoading) {
    return <div className="flex items-center justify-center h-screen bg-slate-50 font-['Cairo']">جاري التحميل...</div>;
  }

  return (
    <Layout title="نظرة عامة">
      <div className="space-y-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}
        
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 sm:gap-0">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">أهلاً بك، {user?.displayName}</h1>
            <p className="text-slate-500 text-sm sm:text-base">إليك ملخص سريع لأداء اليوم.</p>
          </div>
          {(role === 'EMPLOYEE' || role === 'ADMIN') && (
            <Link 
              to="/new-visit" 
              className="w-full sm:w-auto bg-green-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-800 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              زيارة جديدة
            </Link>
          )}
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard 
            title={role === 'ADMIN' ? "إجمالي الزيارات" : "زياراتي"} 
            value={stats.totalVisits.toString()} 
            icon={<ClipboardList className="w-6 h-6 sm:w-8 sm:h-8" />} 
            trend="+12%" 
            color="bg-green-700" 
          />
          <StatCard 
            title="نقاط التميز" 
            value={stats.positivePoints.toString()} 
            icon={<TrendingUp className="w-6 h-6 sm:w-8 sm:h-8" />} 
            trend="تحسن" 
            color="bg-emerald-600" 
          />
          <StatCard 
            title="سجلات السلبيات" 
            value={stats.negativePoints.toString()} 
            icon={<AlertCircle className="w-6 h-6 sm:w-8 sm:h-8" />} 
            trend="تحتاج تدخل" 
            color="bg-red-600" 
          />
          <StatCard 
            title="الموظفين الآن" 
            value={role === 'ADMIN' ? stats.activeStaff.toString() : "نشط"} 
            icon={<Users className="w-6 h-6 sm:w-8 sm:h-8" />} 
            trend={role === 'ADMIN' ? "متواجدين" : "مستقر"} 
            color="bg-slate-700" 
          />
        </div>

        {/* Recent Visits */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-lg sm:text-xl font-bold text-green-900 font-['Cairo']">آخر الزيارات</h2>
            <Link to="/visits" className="text-green-700 hover:underline text-xs sm:text-sm font-bold flex items-center gap-1">
              عرض الكل
            </Link>
          </div>
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                <tr>
                  <th className="p-4">رقم العملية</th>
                  <th className="p-4">المكتب</th>
                  <th className="p-4">الموظف</th>
                  <th className="p-4">المحافظة</th>
                  <th className="p-4">التاريخ</th>
                  <th className="p-4 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                {recentVisits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono text-xs">#{visit.id.slice(0, 8)}</td>
                    <td className="p-4 font-bold">{visit.name}</td>
                    <td className="p-4">{visit.inspectorName || '---'}</td>
                    <td className="p-4">{visit.governorate}</td>
                    <td className="p-4 text-slate-400">
                      {visit.createdAt?.toDate ? visit.createdAt.toDate().toLocaleDateString('ar-EG') : 'قيد المعالجة'}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                        مكتمل
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-slate-100">
            {recentVisits.map((visit) => (
              <div key={visit.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800">{visit.name}</h4>
                    <p className="text-[10px] text-green-700 font-bold">{visit.inspectorName}</p>
                    <p className="text-xs text-slate-400 font-mono">#{visit.id.slice(0, 8)}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                    مكتمل
                  </span>
                </div>
                <div className="flex justify-between text-xs items-center">
                   <div className="flex items-center gap-1 text-slate-500">
                      <MapPin className="w-3 h-3" />
                      {visit.governorate}
                   </div>
                   <div className="text-slate-400">
                      {visit.createdAt?.toDate ? visit.createdAt.toDate().toLocaleDateString('ar-EG') : 'قيد المعالجة'}
                   </div>
                </div>
              </div>
            ))}
          </div>

          {recentVisits.length === 0 && !error && (
            <div className="p-12 text-center text-slate-400">لا توجد زيارات حديثة</div>
          )}
        </section>
      </div>
    </Layout>
  );
}

function StatCard({ title, value, icon, trend, color }: any) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col"
    >
      <div className={`absolute top-0 right-0 w-1.5 h-full ${color}`}></div>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-4 rounded-xl ${color} text-white`}>
          {icon}
        </div>
        {trend && (
          <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs flex items-center gap-1 font-bold">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-slate-500 font-bold text-sm mb-1">{title}</h3>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
    </motion.div>
  );
}
