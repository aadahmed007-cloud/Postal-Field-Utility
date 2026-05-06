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

        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-800">إدارة فريق العمل</h1>
            <p className="text-slate-500 text-sm">إدارة الصلاحيات والتحقق من نشاط الموظفين الميدانيين.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
             <div className="relative w-full sm:w-64">
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-700/20 focus:border-green-700 outline-none transition-all" 
                  placeholder="بحث عن موظف..." 
                />
             </div>
             <button 
               onClick={() => setShowAddModal(true)}
               className="w-full sm:w-auto bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-800 transition-all shadow-md shadow-green-100"
             >
                <UserPlus className="w-4 h-4" />
                إضافة موظف
             </button>
          </div>
        </header>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
           {/* Desktop Table View */}
           <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right border-collapse">
                 <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                       <th className="py-4 px-6">الموظف</th>
                       <th className="py-4 px-6">البريد الإلكتروني</th>
                       <th className="py-4 px-6">تاريخ الانضمام</th>
                       <th className="py-4 px-6">الصلاحية</th>
                       <th className="py-4 px-6 text-center">الإجراءات</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {filteredStaff.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                             {s.photoURL ? (
                               <img src={s.photoURL} className="w-9 h-9 rounded-full border border-slate-200 object-cover" alt="" />
                             ) : (
                               <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                                  <User className="w-5 h-5 text-slate-300" />
                               </div>
                             )}
                             <span className="font-bold text-slate-800">{s.displayName}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                           <div className="flex items-center gap-2 text-slate-400">
                              <Mail className="w-3.5 h-3.5" />
                              {s.email}
                           </div>
                        </td>
                        <td className="py-4 px-6 text-slate-400">
                           <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5" />
                              {s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString('ar-EG') : new Date(s.createdAt).toLocaleDateString('ar-EG')}
                           </div>
                        </td>
                        <td className="py-4 px-6">
                           <div className="flex flex-col gap-1 text-right">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                s.role === 'ADMIN' 
                                  ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                  : 'bg-orange-50 text-orange-700 border-orange-100'
                              }`}>
                                 {s.role === 'ADMIN' ? 'مدير نظام' : 'موظف ميداني'}
                              </span>
                              {s.isPending && (
                                <span className="text-[9px] text-slate-400 font-bold mr-1 italic">بانتظار تسجيل الدخول...</span>
                              )}
                           </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                           <div className="flex justify-center gap-2">
                             {s.id !== user?.uid && (
                               <>
                                 <button 
                                   onClick={() => toggleRole(s.id, s.role)}
                                   className="px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold hover:bg-slate-50 transition-all text-slate-600"
                                 >
                                   {s.role === 'ADMIN' ? 'خفض لعام' : 'ترقية لمدير'}
                                 </button>
                                 <button 
                                   onClick={() => setConfirmDelete(s.id)}
                                   className="p-1.5 rounded-lg border border-red-50 text-red-500 hover:bg-red-50 transition-all"
                                   title="حذف الموظف"
                                 >
                                   <Trash2 className="w-4 h-4" />
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
                <div key={s.id} className="p-5 space-y-4 text-right">
                   <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                         {s.photoURL ? (
                           <img src={s.photoURL} className="w-11 h-11 rounded-2xl border border-slate-200 object-cover shadow-sm" alt="" />
                         ) : (
                           <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center">
                              <User className="w-6 h-6 text-slate-300" />
                           </div>
                         )}
                         <div>
                            <h4 className="font-bold text-slate-800 text-sm leading-tight ml-2">{s.displayName}</h4>
                            <div className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                               s.role === 'ADMIN' 
                                 ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                 : 'bg-orange-50 text-orange-700 border-orange-100'
                             }`}>
                                {s.role === 'ADMIN' ? 'مدير نظام' : 'موظف ميداني'}
                             </div>
                         </div>
                      </div>
                      {s.id !== user?.uid && (
                        <button 
                          onClick={() => setConfirmDelete(s.id)}
                          className="p-2 rounded-xl bg-red-50 text-red-500 active:scale-95 transition-all outline-none"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                   </div>

                   <div className="bg-slate-50/50 rounded-xl p-3 space-y-2 border border-slate-100/50">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                         <Mail className="w-3.5 h-3.5" />
                         <span className="truncate">{s.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                         <Calendar className="w-3.5 h-3.5" />
                         <span>انضم في: {s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString('ar-EG') : new Date(s.createdAt).toLocaleDateString('ar-EG')}</span>
                      </div>
                   </div>

                   {s.id !== user?.uid && (
                      <button 
                        onClick={() => toggleRole(s.id, s.role)}
                        className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 active:bg-slate-50 transition-all outline-none"
                      >
                        {s.role === 'ADMIN' ? 'تحويل لموظف ميداني' : 'منح صلاحيات مدير'}
                      </button>
                   )}
                </div>
              ))}
           </div>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm font-['Cairo']">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative text-right"
              dir="rtl"
            >
               <button onClick={() => setShowAddModal(false)} className="absolute left-6 top-6 text-slate-400 hover:text-slate-600 outline-none">
                  <X className="w-6 h-6" />
               </button>
               <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <UserPlus className="w-8 h-8 text-green-700" />
               </div>
               <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">إضافة موظف جديد</h2>
               <p className="text-slate-500 text-sm text-center mb-8">قم بإدخال بيانات الموظف لمنحه حق الوصول للنظام.</p>
               
               <form onSubmit={handleManualAdd} className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1.5 mr-1 text-right">الاسم الكامل</label>
                     <input 
                       required
                       type="text" 
                       value={newStaff.displayName}
                       onChange={e => setNewStaff({...newStaff, displayName: e.target.value})}
                       placeholder="مثال: أحمد محمد"
                       className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 transition-all outline-none"
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1.5 mr-1 text-right">البريد الإلكتروني (Google)</label>
                     <input 
                       required
                       type="email" 
                       value={newStaff.email}
                       onChange={e => setNewStaff({...newStaff, email: e.target.value})}
                       placeholder="example@gmail.com"
                       className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 transition-all outline-none"
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1.5 mr-1 text-right">الصلاحية</label>
                     <select 
                        value={newStaff.role}
                        onChange={e => setNewStaff({...newStaff, role: e.target.value})}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                     >
                        <option value="EMPLOYEE">موظف ميداني</option>
                        <option value="ADMIN">مدير نظام</option>
                     </select>
                  </div>
                  
                  <div className="pt-4 flex gap-3">
                     <button 
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all outline-none"
                     >
                        إلغاء
                     </button>
                     <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 py-3 rounded-xl bg-green-700 text-white font-bold hover:bg-green-800 transition-all shadow-lg shadow-green-100 disabled:opacity-50 outline-none"
                     >
                        {isSubmitting ? 'جاري الإضافة...' : 'إضافة الآن'}
                     </button>
                  </div>
               </form>
               
               <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-[10px] leading-relaxed flex gap-2 text-right">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>تنبيه: يجب أن يستخدم الموظف نفس البريد الإلكتروني المدخل هنا عند تسجيل دخوله لأول مرة عبر Google.</span>
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
