import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { Users, UserPlus, Shield, User, Mail, Calendar, Search, AlertCircle, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function StaffManagement() {
  const { user, role, loading: authLoading } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [newStaff, setNewStaff] = useState({ displayName: '', email: '', role: 'EMPLOYEE' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading || !user || role !== 'ADMIN') return;

    const path = 'users';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setError(null);
    }, (err) => {
      setError("لا تملك صلاحية عرض قائمة الموظفين.");
      handleFirestoreError(err, OperationType.LIST, path);
    });

    return unsubscribe;
  }, [user, role, authLoading]);

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.email || !newStaff.displayName) return;

    setIsSubmitting(true);
    try {
      const staffRef = collection(db, 'users');
      await setDoc(doc(staffRef), {
        ...newStaff,
        createdAt: new Date(),
        isPending: true,
        uid: null
      });
      
      setShowAddModal(false);
      setNewStaff({ displayName: '', email: '', role: 'EMPLOYEE' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'users');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'ADMIN' ? 'EMPLOYEE' : 'ADMIN';
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleDeleteStaff = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      setConfirmDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
    }
  };

  const filteredStaff = staff.filter(s => 
    s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading) return <div className="p-20 text-center font-['Cairo']">جاري التحميل...</div>;

  return (
    <Layout title="إدارة فريق العمل">
      <div className="space-y-6 font-['Cairo']">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">إدارة فريق العمل</h1>
            <p className="text-slate-500 text-sm">إدارة الصلاحيات والتحقق من نشاط الموظفين الميدانيين.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
             <div className="relative w-full sm:w-72">
                <Search className="absolute right-4 top-3 w-4 h-4 text-slate-400" />
                <input 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pr-11 pl-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-green-700/5 focus:border-green-700 outline-none transition-all shadow-sm" 
                  placeholder="بحث عن موظف بالاسم أو البريد..." 
                />
             </div>
             <button 
               onClick={() => setShowAddModal(true)}
               className="w-full sm:w-auto bg-green-700 text-white px-6 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-800 active:scale-95 transition-all shadow-lg shadow-green-200"
             >
                <UserPlus className="w-4 h-4" />
                إضافة موظف
             </button>
          </div>
        </header>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
           {[
             { label: 'إجمالي الفريق', value: staff.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
             { label: 'مديري النظام', value: staff.filter(s => s.role === 'ADMIN').length, icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50' },
             { label: 'موظفين ميدانيين', value: staff.filter(s => s.role === 'EMPLOYEE').length, icon: User, color: 'text-orange-600', bg: 'bg-orange-50' },
             { label: 'بانتظار التفعيل', value: staff.filter(s => s.isPending).length, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
           ].map((stat, i) => (
             <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                   <stat.icon className="w-6 h-6" />
                </div>
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                   <p className="text-xl font-black text-slate-800">{stat.value}</p>
                </div>
             </div>
           ))}
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
           {/* Desktop Table View */}
           <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right border-collapse">
                 <thead className="bg-slate-50/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                    <tr>
                       <th className="py-5 px-8">الموظف</th>
                       <th className="py-5 px-8 text-center">تاريخ الانضمام</th>
                       <th className="py-5 px-8 text-center">الصلاحية</th>
                       <th className="py-5 px-8 text-center">الإجراءات</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {filteredStaff.map(s => (
                      <tr key={s.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                        <td className="py-5 px-8">
                          <div className="flex items-center gap-4">
                             <div className="relative">
                                {s.photoURL ? (
                                  <img src={s.photoURL} className="w-11 h-11 rounded-2xl border border-white shadow-sm object-cover" alt="" />
                                ) : (
                                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center justify-center">
                                     <User className="w-6 h-6 text-slate-300" />
                                  </div>
                                )}
                                {s.isPending && (
                                   <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white animate-pulse" />
                                )}
                             </div>
                             <div>
                                <p className="font-black text-slate-800 leading-none mb-1.5">{s.displayName}</p>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                                   <Mail className="w-3 h-3" />
                                   {s.email}
                                </div>
                             </div>
                          </div>
                        </td>
                        <td className="py-5 px-8 text-center">
                           <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl text-slate-500 text-[11px] font-bold border border-slate-100">
                              <Calendar className="w-3.5 h-3.5" />
                              {s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString('ar-EG') : new Date(s.createdAt).toLocaleDateString('ar-EG')}
                           </div>
                        </td>
                        <td className="py-5 px-8 text-center">
                           <div className="flex flex-col items-center gap-1">
                              <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black border tracking-wide uppercase ${
                                s.role === 'ADMIN' 
                                  ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                  : 'bg-orange-50 text-orange-700 border-orange-100'
                              }`}>
                                 {s.role === 'ADMIN' ? 'مدير نظام' : 'موظف ميداني'}
                              </span>
                              {s.isPending && (
                                <span className="text-[9px] text-amber-600 font-bold italic">بانتظار التفـعيل</span>
                              )}
                           </div>
                        </td>
                        <td className="py-5 px-8 text-center">
                           <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             {s.id !== user?.uid && (
                               <>
                                 <button 
                                   onClick={() => toggleRole(s.id, s.role)}
                                   className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black hover:border-green-600 hover:text-green-700 active:scale-95 transition-all text-slate-600 shadow-sm"
                                 >
                                   {s.role === 'ADMIN' ? 'خفض الرتبة' : 'ترقية لمدير'}
                                 </button>
                                 <button 
                                   onClick={() => setConfirmDelete(s.id)}
                                   className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white active:scale-95 transition-all border border-red-100"
                                   title="حذف الموظف"
                                 >
                                   <Trash2 className="w-4.5 h-4.5" />
                                 </button>
                               </>
                             )}
                           </div>
                        </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>

           {/* Mobile Card List View */}
           <div className="md:hidden divide-y divide-slate-100">
              {filteredStaff.map(s => (
                <div key={s.id} className="p-6 space-y-5 text-right">
                   <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                         <div className="relative">
                            {s.photoURL ? (
                              <img src={s.photoURL} className="w-14 h-14 rounded-[1.25rem] border border-slate-100 object-cover shadow-sm" alt="" />
                            ) : (
                              <div className="w-14 h-14 rounded-[1.25rem] bg-slate-50 flex items-center justify-center border border-slate-100">
                                 <User className="w-7 h-7 text-slate-300" />
                              </div>
                            )}
                            {s.isPending && (
                               <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white animate-pulse" />
                            )}
                         </div>
                         <div className="space-y-1">
                            <h4 className="font-black text-slate-800 text-base leading-tight">{s.displayName}</h4>
                            <div className={`inline-flex items-center px-3 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                               s.role === 'ADMIN' 
                                 ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                 : 'bg-orange-50 text-orange-700 border-orange-100'
                             }`}>
                                {s.role === 'ADMIN' ? 'مدير نظام' : 'موظف ميداني'}
                             </div>
                             {s.isPending && <p className="text-[9px] text-amber-600 font-bold italic">بانتظار التفـعيل</p>}
                         </div>
                      </div>
                      {s.id !== user?.uid && (
                        <button 
                          onClick={() => setConfirmDelete(s.id)}
                          className="p-3 rounded-2xl bg-red-50 text-red-500 active:scale-90 transition-all outline-none border border-red-100"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                   </div>

                   <div className="bg-slate-50/50 rounded-2xl p-4 space-y-3 border border-slate-100/50 group">
                      <div className="flex items-center justify-between text-xs">
                         <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">البريد الإلكتروني</span>
                         <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                            <Mail className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[150px]">{s.email}</span>
                         </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                         <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">تاريخ الانضمام</span>
                         <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString('ar-EG') : new Date(s.createdAt).toLocaleDateString('ar-EG')}</span>
                         </div>
                      </div>
                   </div>

                   {s.id !== user?.uid && (
                      <button 
                        onClick={() => toggleRole(s.id, s.role)}
                        className="w-full py-3.5 rounded-2xl border-2 border-slate-100 text-xs font-black text-slate-600 active:bg-slate-100 transition-all outline-none"
                      >
                        {s.role === 'ADMIN' ? 'تغيير لـ موظف ميداني' : 'ترقية لـ مدير نظام'}
                      </button>
                   )}
                </div>
              ))}
           </div>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md font-['Cairo']">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl relative text-right overflow-hidden"
              dir="rtl"
            >
               {/* Decorative Background Element */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-[5rem] -z-10" />
               
               <button onClick={() => setShowAddModal(false)} className="absolute left-8 top-8 p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors outline-none active:scale-90">
                  <X className="w-5 h-5" />
               </button>

               <div className="w-16 h-16 bg-green-700 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-green-100 transform -rotate-6">
                  <UserPlus className="w-8 h-8 text-white" />
               </div>

               <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">إضافة شريك جديد</h2>
               <p className="text-slate-500 text-[13px] font-medium leading-relaxed mb-10 pl-8">قم بإدخال البريد الإلكتروني الخاص بـ Google للموظف الجديد ليتمكن من الدخول للنظام.</p>
               
               <form onSubmit={handleManualAdd} className="space-y-6">
                  <div className="space-y-2">
                     <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mr-1">الاسم الكامل للموظف</label>
                     <input 
                       required
                       type="text" 
                       value={newStaff.displayName}
                       onChange={e => setNewStaff({...newStaff, displayName: e.target.value})}
                       placeholder="مثال: م. هاني يوسف"
                       className="w-full bg-slate-50 border-2 border-transparent rounded-[1.25rem] px-6 py-4 text-sm font-bold text-slate-800 focus:bg-white focus:border-green-600 transition-all outline-none shadow-inner"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mr-1">البريد الإلكتروني (Google Only)</label>
                     <input 
                       required
                       type="email" 
                       value={newStaff.email}
                       onChange={e => setNewStaff({...newStaff, email: e.target.value})}
                       placeholder="hany@post.gov.eg"
                       className="w-full bg-slate-50 border-2 border-transparent rounded-[1.25rem] px-6 py-4 text-sm font-bold text-slate-800 focus:bg-white focus:border-green-600 transition-all outline-none shadow-inner"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mr-1">تحديد نوع الصلاحية</label>
                     <select 
                        value={newStaff.role}
                        onChange={e => setNewStaff({...newStaff, role: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-transparent rounded-[1.25rem] px-6 py-4 text-sm font-black text-slate-800 focus:bg-white focus:border-green-600 outline-none transition-all cursor-pointer appearance-none shadow-inner"
                     >
                        <option value="EMPLOYEE">موظف تفتيش ميداني</option>
                        <option value="ADMIN">مدير نظام (تحكم كامل)</option>
                     </select>
                  </div>
                  
                  <div className="pt-4 flex gap-4">
                     <button 
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="flex-1 py-4 rounded-[1.25rem] border border-slate-200 font-black text-slate-500 hover:bg-slate-50 active:scale-95 transition-all outline-none"
                     >
                        إلغاء الأمر
                     </button>
                     <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-2 py-4 rounded-[1.25rem] bg-green-700 text-white font-black hover:bg-green-800 active:scale-95 transition-all shadow-xl shadow-green-100 disabled:opacity-50 outline-none"
                     >
                        {isSubmitting ? 'جاري الحفظ...' : 'تأكيد الإضافة'}
                     </button>
                  </div>
               </form>
               
               <div className="mt-8 p-5 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4 text-right">
                  <Shield className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-amber-800 text-[11px] font-bold leading-relaxed">
                     سيتمكن الموظف من استخدام حسابه الشخصي للدخول بمجرد قيامه بتسجيل الدخول الأول. لن يحتاج لكلمة مرور منفصلة.
                  </p>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm font-['Cairo']">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
              dir="rtl"
            >
               <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-500" />
               </div>
               <h2 className="text-xl font-bold text-slate-800 mb-2">تأكيد الحذف</h2>
               <p className="text-slate-500 text-sm mb-6">هل أنت متأكد من رغبتك في حذف هذا الموظف؟ لن يتمكن من الوصول إلى النظام بعد الآن.</p>
               <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setConfirmDelete(null)}
                    className="py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 outline-none"
                  >
                     إلغاء
                  </button>
                  <button 
                    onClick={() => handleDeleteStaff(confirmDelete)}
                    className="py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all outline-none"
                  >
                     تأكيد الحذف
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
