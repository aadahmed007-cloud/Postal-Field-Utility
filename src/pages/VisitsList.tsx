import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { MapPin, Calendar, Search, Filter, FileText, Download, AlertCircle, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function VisitsList() {
  const { user, role, loading: authLoading } = useAuth();
  const [visits, setVisits] = useState<any[]>([]);
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
      setVisits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setError(null);
    }, (err) => {
      setError("حدث خطأ في جلب السجلات. يرجى مراجعة الصلاحيات.");
      handleFirestoreError(err, OperationType.LIST, path);
    });

    return unsubscribe;
  }, [user, role, authLoading]);

  const filteredVisits = visits.filter(v => 
    v.name.includes(searchTerm) || v.governorate.includes(searchTerm) || v.inspectorName?.includes(searchTerm) || v.sector?.includes(searchTerm)
  );

  if (authLoading) return <div className="p-20 text-center font-['Cairo']">جاري التحميل...</div>;

  return (
    <Layout title="سجلات الزيارات">
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-800">إدارة سجلات الزيارات</h1>
            <p className="text-slate-500 text-sm">مراجعة وتحليل كافة البيانات الميدانية المجمعة.</p>
          </div>
          <div className="flex w-full sm:w-auto gap-2">
             <button 
                onClick={() => {
                  const htmlContent = `
                    <html dir="rtl">
                      <head>
                        <meta charset="utf-8">
                        <title>تقرير الزيارات الميدانية</title>
                        <style>
                          body { font-family: Arial, sans-serif; padding: 20px; }
                          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                          th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
                          th { background-color: #047857; color: white; }
                          tr:nth-child(even) { background-color: #f9f9f9; }
                        </style>
                      </head>
                      <body>
                        <h1>تقرير الزيارات الميدانية - بريد مصر</h1>
                        <p>تاريخ استخراج التقرير: ${new Date().toLocaleString('ar-EG')}</p>
                        <table>
                          <thead>
                            <tr>
                              <th>المكتب</th>
                              <th>الموظف</th>
                              <th>المحافظة</th>
                              <th>التاريخ</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${filteredVisits.map(v => `
                              <tr>
                                <td>${v.name}</td>
                                <td>${v.inspectorName}</td>
                                <td>${v.governorate}</td>
                                <td>${v.createdAt?.toDate?.() ? v.createdAt.toDate().toLocaleDateString('ar-EG') : '---'}</td>
                              </tr>
                            `).join('')}
                          </tbody>
                        </table>
                      </body>
                    </html>
                  `;
                  const blob = new Blob([htmlContent], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `visits-report-${new Date().getTime()}.html`;
                  a.click();
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
             >
                <Download className="w-4 h-4" />
                تصدير HTML
             </button>
             <button className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-green-700 rounded-xl text-xs font-bold text-white hover:bg-green-800 transition-all shadow-md">
                تصدير Excel
             </button>
          </div>
        </header>

        {/* Filter Section */}
        <section className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 sm:space-y-6">
           <div className="flex items-center gap-2 text-green-800">
              <Filter className="w-5 h-5" />
              <h2 className="font-bold">فلاتر متقدمة</h2>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">البحث العام</label>
                 <div className="relative">
                    <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                       value={searchTerm}
                       onChange={e => setSearchTerm(e.target.value)}
                       className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm transition-all focus:ring-2 focus:ring-green-700/20 focus:border-green-700 outline-none" 
                       placeholder="ابحث بالاسم، المحافظة..." 
                    />
                 </div>
              </div>
           </div>
        </section>

        {/* Visits View */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
           {/* Desktop Table View */}
           <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right border-collapse">
                 <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                       <th className="py-4 px-6">اسم المكتب</th>
                       <th className="py-4 px-6">الموظف</th>
                       <th className="py-4 px-6">الموقع</th>
                       <th className="py-4 px-6">التاريخ</th>
                       <th className="py-4 px-6">الحالة</th>
                       <th className="py-4 px-6 text-center">الإجراءات</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {filteredVisits.map(visit => (
                      <tr key={visit.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-lg bg-green-50 text-green-700 flex items-center justify-center font-bold text-[10px] uppercase">
                                م.ب
                             </div>
                             <span className="font-bold text-slate-800">{visit.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">{visit.inspectorName}</td>
                        <td className="py-4 px-6 text-slate-400">
                           <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="max-w-[150px] truncate">{visit.governorate}</span>
                           </div>
                        </td>
                        <td className="py-4 px-6 text-slate-400">
                           {visit.createdAt?.toDate?.() ? visit.createdAt.toDate().toLocaleDateString('ar-EG') : 'قيد المعالجة'}
                        </td>
                        <td className="py-4 px-6">
                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-100">
                               مكتملة
                           </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                           <Link to={`/visit/${visit.id}`} className="p-2 hover:bg-green-50 rounded-lg inline-flex text-green-700 transition-colors">
                              <FileText className="w-5 h-5" />
                           </Link>
                        </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>

           {/* Mobile Card List View */}
           <div className="md:hidden divide-y divide-slate-100">
              {filteredVisits.map(visit => (
                <Link key={visit.id} to={`/visit/${visit.id}`} className="block p-5 active:bg-slate-50 transition-colors space-y-4">
                   <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-700 text-white flex items-center justify-center font-bold text-xs">
                          م.ب
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm leading-tight ml-2">{visit.name}</h4>
                          <span className="text-[10px] text-slate-400 font-bold block mt-1">{visit.inspectorName}</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-green-50 text-green-700 border border-green-100">
                        مكتملة
                      </span>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <MapPin className="w-3 h-3" />
                        <span className="text-[11px] font-semibold">{visit.governorate}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 justify-end">
                        <Calendar className="w-3 h-3" />
                        <span className="text-[11px] font-semibold">
                          {visit.createdAt?.toDate?.() ? visit.createdAt.toDate().toLocaleDateString('ar-EG') : 'قيد المعالجة'}
                        </span>
                      </div>
                   </div>
                </Link>
              ))}
           </div>

           {filteredVisits.length === 0 && (
             <div className="p-12 text-center">
               <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-4" />
               <p className="text-slate-400 font-bold">لا توجد سجلات مطابقة للبحث</p>
             </div>
           )}
        </div>
      </div>
    </Layout>
  );
}
