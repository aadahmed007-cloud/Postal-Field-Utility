import { useEffect, useState, useMemo } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { Plus, Users, MapPin, ClipboardList, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = [
  '#0f172a', // Slate 900
  '#15803d', // Green 700
  '#1d4ed8', // Blue 700
  '#b91c1c', // Red 700
  '#7c3aed', // Violet 600
  '#0d9488', // Teal 600
  '#ea580c', // Orange 600
  '#0891b2', // Cyan 600
  '#4338ca', // Indigo 600
  '#c026d3', // Fuchsia 600
];

export default function Dashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({ totalVisits: 0, activeStaff: 0, coverage: '14/27', positivePoints: 0, negativePoints: 0 });
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [allVisits, setAllVisits] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const countNotes = (text?: string) => {
    if (!text) return 0;
    return text.split('\n').filter(line => line.trim().length > 2).length || 1;
  };

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
      const visits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      setAllVisits(visits);
      
      // Calculate stats
      let posCount = 0;
      let negCount = 0;

      visits.forEach(v => {
        posCount += countNotes(v.positiveNotes);
        negCount += countNotes(v.negativeNotes);
      });

      setRecentVisits(visits.slice(0, 5));
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

  const governorateStats = useMemo(() => {
    const stats: Record<string, { total: number, approved: number, completed: number }> = {};
    allVisits.forEach(v => {
      if (v.governorate) {
        if (!stats[v.governorate]) {
          stats[v.governorate] = { total: 0, approved: 0, completed: 0 };
        }
        stats[v.governorate].total += 1;
        if (v.isApproved) stats[v.governorate].approved += 1;
        
        const hasPhoto = !!v.photoURL;
        const hasNotes = !!(v.positiveNotes || v.negativeNotes || v.notes);
        if (hasPhoto && hasNotes) stats[v.governorate].completed += 1;
      }
    });

    return Object.entries(stats)
      .map(([name, data]) => ({ 
        name, 
        total: data.total,
        approved: data.approved,
        completeRate: Math.round((data.approved / data.total) * 100),
        visitCount: data.total
      }))
      .sort((a, b) => b.total - a.total);
  }, [allVisits]);

  const sectorStats = useMemo(() => {
    const stats: Record<string, number> = {};
    allVisits.forEach(v => {
      if (v.sector) {
        stats[v.sector] = (stats[v.sector] || 0) + 1;
      }
    });
    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [allVisits]);

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

        {/* Charts Section */}
        {role === 'ADMIN' && governorateStats.length > 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-center">
                  <div className="flex justify-between items-center w-full mb-6">
                     <h3 className="text-lg font-bold text-slate-800 font-['Cairo']">تحليل الزيارات حسب المحافظة</h3>
                     <span className="text-xs text-slate-400">العدد والاعتماد</span>
                  </div>
                  <div className="w-full h-64" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={governorateStats} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} tickMargin={10} />
                        <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                        <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="total" name="إجمالي الزيارات" fill="#15803d" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="approved" name="الزيارات المعتمدة" fill="#4ade80" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>
               
               <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-center">
                  <div className="flex justify-between items-center w-full mb-6">
                     <h3 className="text-lg font-bold text-slate-800 font-['Cairo']">توزيع الزيارات حسب القطاع</h3>
                     <span className="text-xs text-slate-400">النوع الاجتماعي/الوظيفي</span>
                  </div>
                  <div className="w-full h-64" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sectorStats}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          innerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {sectorStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
               </div>
            </div>

            {/* Completion Rates Progress */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
               <h3 className="text-lg font-bold text-slate-800 mb-6 text-right font-['Cairo']">نسبة اعتماد الزيارات لكل محافظة</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {governorateStats.map((gov) => (
                    <div key={gov.name} className="space-y-2">
                       <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-slate-700">{gov.name}</span>
                          <span className="text-green-700 font-bold">{gov.completeRate}%</span>
                       </div>
                       <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            whileInView={{ width: `${gov.completeRate}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-green-600 rounded-full"
                          />
                       </div>
                       <p className="text-[10px] text-slate-400">اعتماد {gov.approved} من {gov.total} زيارة</p>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

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
                  <th className="p-4 text-center">التقييم</th>
                  <th className="p-4">المحافظة</th>
                  <th className="p-4">التاريخ</th>
                  <th className="p-4 text-center">الحالة</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                {recentVisits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono text-xs">#{visit.id.slice(0, 8)}</td>
                    <td className="p-4 font-bold">{visit.name}</td>
                    <td className="p-4">{visit.inspectorName || '---'}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        {visit.positiveNotes && (
                          <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100" title="يوجد ملاحظات إيجابية">
                            <TrendingUp className="w-3 h-3" />
                            <span className="text-[10px] font-bold">{countNotes(visit.positiveNotes)}</span>
                          </div>
                        )}
                        {visit.negativeNotes && (
                          <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100" title="يوجد ملاحظات سلبية">
                            <TrendingDown className="w-3 h-3" />
                            <span className="text-[10px] font-bold">{countNotes(visit.negativeNotes)}</span>
                          </div>
                        )}
                        {!visit.positiveNotes && !visit.negativeNotes && (
                           <span className="text-slate-300 text-xs">-</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">{visit.governorate}</td>
                    <td className="p-4 text-slate-400">
                      {visit.createdAt?.toDate ? visit.createdAt.toDate().toLocaleDateString('ar-EG') : 'قيد المعالجة'}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${visit.isApproved ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                        {visit.isApproved ? 'معتمدة' : 'مكتمل'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                       <Link to={`/visit/${visit.id}`} className="text-green-700 font-bold text-xs hover:underline bg-green-50 px-3 py-1.5 rounded-lg">
                          التفاصيل
                       </Link>
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
                  <div className="flex flex-col gap-2 items-end">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${visit.isApproved ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                      {visit.isApproved ? 'معتمدة' : 'مكتمل'}
                    </span>
                    <div className="flex justify-end gap-1">
                      {visit.positiveNotes && (
                        <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                          <TrendingUp className="w-3 h-3" />
                          <span className="text-[10px] font-bold">{countNotes(visit.positiveNotes)}</span>
                        </div>
                      )}
                      {visit.negativeNotes && (
                        <div className="flex items-center gap-1 text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                          <TrendingDown className="w-3 h-3" />
                          <span className="text-[10px] font-bold">{countNotes(visit.negativeNotes)}</span>
                        </div>
                      )}
                    </div>
                  </div>
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
