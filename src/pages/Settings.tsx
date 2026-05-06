import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { db, auth } from '../lib/firebase';
import { doc, updateDoc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Smartphone, 
  Moon, 
  Globe, 
  Save, 
  AlertCircle,
  CheckCircle2,
  Camera,
  Database,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';

export default function Settings() {
  const { user, role, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mockLoading, setMockLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    notifications: true,
    darkMode: false,
    language: 'ar',
    systemMaintenance: false
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        displayName: user.displayName || '',
        email: user.email || ''
      }));

      // Fetch additional preferences if they exist
      const fetchPrefs = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setFormData(prev => ({
              ...prev,
              notifications: data.notifications ?? true,
              darkMode: data.darkMode ?? false,
              language: data.language ?? 'ar',
              systemMaintenance: data.systemMaintenance ?? false
            }));
          }
        } catch (err) {
          console.error("Error fetching preferences:", err);
        }
      };
      fetchPrefs();
    }
  }, [user]);

  const handleGenerateMockData = async () => {
    if (!user) return;
    setMockLoading(true);
    setSuccess(null);
    
    const mockVisits = [
      { 
        name: 'مكتب بريد رمسيس', 
        governorate: 'القاهرة', 
        postalArea: 'وسط القاهرة', 
        sector: 'بريد القاهرة', 
        address: 'ميدان رمسيس، وسط البلد', 
        positiveNotes: 'سرعة أداء الموظفين في تقديم الخدمات الجماهيرية واستخدام الأنظمة الجديدة بكفاءة.',
        negativeNotes: 'زحام طفيف وقت الذروة يحتاج لتنظيم طابور آلي أفضل.',
        notes: 'زيارة تفتيشية دورية، كافة الخدمات تعمل بكفاءة' 
      },
      { 
        name: 'مكتب بريد الجيزة الرئيسي', 
        governorate: 'الجيزة', 
        postalArea: 'جنوب الجيزة', 
        sector: 'بريد الجيزة', 
        address: 'ميدان الجيزة، أمام الجامعة', 
        positiveNotes: 'مستوى النظافة العام ممتاز والالتزام بالزي الرسمي كامل.',
        negativeNotes: 'وجود عطل في إحدى ماكينات الصراف الآلي الخارجية.',
        notes: 'مستوى النظافة جيد جداً، هناك ازدحام طفيف' 
      },
      { 
        name: 'مكتب بريد العتبة', 
        governorate: 'القاهرة', 
        postalArea: 'وسط القاهرة', 
        sector: 'بريد القاهرة', 
        address: 'ميدان العتبة، القاهرة التاريخية', 
        positiveNotes: 'الانتهاء من تحديث البنية التحتية للشبكة بنسبة 100%.',
        negativeNotes: 'نقص في بعض المستلزمات الورقية للطابعات.',
        notes: 'تحديث الأنظمة يسير بشكل جيد' 
      },
      { 
        name: 'مكتب بريد المهندسين', 
        governorate: 'الجيزة', 
        postalArea: 'شمال الجيزة', 
        sector: 'بريد الجيزة', 
        address: 'شارع جامعة الدول العربية', 
        positiveNotes: 'تواجد أمني ممتاز وتعامل راقي مع كبار السن.',
        negativeNotes: 'لا يوجد.',
        notes: 'تم التأكد من عمل ماكينات الدفع الإلكتروني' 
      },
      { 
        name: 'مكتب بريد المعادي', 
        governorate: 'القاهرة', 
        postalArea: 'جنوب القاهرة', 
        sector: 'بريد القاهرة', 
        address: 'شارع 9، المعادي', 
        positiveNotes: 'كفاءة عالية في التعامل مع الطرود الدولية.',
        negativeNotes: 'تحتاج الإضاءة الداخلية لصيانة في بعض المكاتب.',
        notes: 'التزام كامل بمواعيد العمل والزي الرسمي' 
      }
    ];

    try {
      for (const visit of mockVisits) {
        await addDoc(collection(db, 'offices'), {
          ...visit,
          location: { 
            lat: 30.0444 + (Math.random() - 0.5) * 0.1, 
            lng: 31.2357 + (Math.random() - 0.5) * 0.1 
          },
          photoURL: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&q=80&w=1280',
          inspectorId: user.uid,
          inspectorName: user.displayName,
          createdAt: serverTimestamp(),
          isMock: true
        });
      }
      setSuccess("تم إضافة 5 زيارات تجريبية بنجاح");
    } catch (err) {
      console.error("Error adding mock data:", err);
      setError("فشل في إضافة البيانات التجريبية");
    } finally {
      setMockLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      // 1. Update Auth Profile
      if (formData.displayName !== user.displayName) {
        await updateProfile(auth.currentUser!, {
          displayName: formData.displayName
        });
      }

      // 2. Update Firestore
      const userRef = doc(db, 'users', user.uid);
      const updateData: any = {
        displayName: formData.displayName,
        notifications: formData.notifications,
        darkMode: formData.darkMode,
        language: formData.language,
        updatedAt: new Date()
      };

      // Only admins can update system-wide settings
      if (role === 'ADMIN') {
        updateData.systemMaintenance = formData.systemMaintenance;
      }

      await updateDoc(userRef, updateData);

      setSuccess("تم حفظ الإعدادات بنجاح");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError("حدث خطأ أثناء حفظ الإعدادات");
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="p-20 text-center font-['Cairo']">جاري التحميل...</div>;

  return (
    <Layout title="الإعدادات">
      <div className="max-w-4xl mx-auto space-y-8 font-['Cairo']">
        <header>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
             <SettingsIcon className="w-8 h-8 text-green-700" />
             إعدادات الحساب والنظام
          </h1>
          <p className="text-slate-500 mt-2">قم بتخصيص تجربتك وإدارة إعدادات الأمان الخاصة بك.</p>
        </header>

        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3 text-green-700"
          >
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-bold">{success}</p>
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700"
          >
            <AlertCircle className="w-5 h-5" />
            <p className="font-bold">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Sidebar Navigation */}
          <div className="md:col-span-1 space-y-2">
            {[
              { id: 'profile', label: 'الملف الشخصي', icon: User },
              { id: 'notifications', label: 'التنبيهات', icon: Bell },
              { id: 'appearance', label: 'المظهر', icon: Moon },
              ...(role === 'ADMIN' ? [{ id: 'system', label: 'إعدادات النظام', icon: Shield }] : [])
            ].map((item) => (
              <button 
                key={item.id}
                type="button"
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  item.id === 'profile' ? 'bg-green-700 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-2 space-y-8">
            
            {/* Section: Profile */}
            <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <h2 className="text-lg font-bold text-slate-800 border-b border-slate-50 pb-4">المعلومات الشخصية</h2>
              
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <img 
                    src={user?.photoURL || 'https://via.placeholder.com/150'} 
                    className="w-24 h-24 rounded-3xl object-cover ring-4 ring-slate-50 shadow-lg"
                    referrerPolicy="no-referrer"
                    alt="" 
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <Camera className="text-white w-6 h-6" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{user?.displayName}</h3>
                  <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider">{role === 'ADMIN' ? 'مدير نظام' : 'موظف ميداني'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 px-1">الاسم الكامل</label>
                  <input 
                    type="text" 
                    value={formData.displayName}
                    onChange={e => setFormData({...formData, displayName: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 px-1">البريد الإلكتروني (للمراجعة)</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    disabled
                    className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>
            </section>

            {/* Section: Notifications & Language */}
            <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <h2 className="text-lg font-bold text-slate-800 border-b border-slate-50 pb-4">تفضيلات التطبيق</h2>
              
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                       <Bell className="w-5 h-5" />
                    </div>
                    <div>
                       <div className="text-sm font-bold text-slate-800">تنبيهات البريد الصادر</div>
                       <div className="text-[10px] text-slate-400">إرسال تقرير عند انتهاء كل زيارة</div>
                    </div>
                 </div>
                 <button 
                  type="button"
                  onClick={() => setFormData({...formData, notifications: !formData.notifications})}
                  className={`w-12 h-6 rounded-full relative transition-colors ${formData.notifications ? 'bg-green-600' : 'bg-slate-300'}`}
                 >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.notifications ? 'right-7' : 'right-1'}`} />
                 </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                       <Moon className="w-5 h-5" />
                    </div>
                    <div>
                       <div className="text-sm font-bold text-slate-800">الوضع الليلي</div>
                       <div className="text-[10px] text-slate-400">تفعيل المظهر الداكن للتطبيق</div>
                    </div>
                 </div>
                 <button 
                  type="button"
                  onClick={() => setFormData({...formData, darkMode: !formData.darkMode})}
                  className={`w-12 h-6 rounded-full relative transition-colors ${formData.darkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                 >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.darkMode ? 'right-7' : 'right-1'}`} />
                 </button>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-500 px-1 italic">لغة الواجهة</label>
                <select 
                  value={formData.language}
                  onChange={e => setFormData({...formData, language: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500"
                >
                  <option value="ar">العربية (الأصلية)</option>
                  <option value="en">English (Coming Soon)</option>
                </select>
              </div>
            </section>

            {/* Admin Section: System Control & Debug Tools */}
            {role === 'ADMIN' && (
              <motion.section 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="bg-red-50/30 p-8 rounded-3xl border border-red-100 border-dashed space-y-6">
                  <div className="flex items-center gap-2 text-red-700">
                     <Shield className="w-5 h-5" />
                     <h2 className="text-lg font-bold">لوحة تحكم النظام (خاص بالمديرين)</h2>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white/60 rounded-2xl border border-red-50">
                    <div>
                      <div className="text-sm font-bold text-slate-800">وضع الصيانة</div>
                      <p className="text-[10px] text-slate-400 max-w-[200px]">منع الموظفين من تسجيل زيارات جديدة مؤقتاً لأغراض التحديث.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, systemMaintenance: !formData.systemMaintenance})}
                      className={`w-12 h-6 rounded-full relative transition-colors ${formData.systemMaintenance ? 'bg-red-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.systemMaintenance ? 'right-7' : 'right-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50/30 p-8 rounded-3xl border border-blue-100 border-dashed space-y-6">
                   <div className="flex items-center gap-2 text-blue-700">
                      <Database className="w-5 h-5" />
                      <h2 className="text-lg font-bold">أدوات الاختبار والمطورين</h2>
                   </div>
                   
                   <div className="p-4 bg-white/60 rounded-2xl border border-blue-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-bold text-slate-800">توليد زيارات تجريبية</div>
                        <p className="text-[10px] text-slate-400">إضافة 5 زيارات بريدية وهمية بأسماء حقيقية لاختبار لوحات المعلومات والخرائط.</p>
                      </div>
                      <button 
                        type="button"
                        onClick={handleGenerateMockData}
                        disabled={mockLoading}
                        className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {mockLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                        {mockLoading ? 'جاري التوليد...' : 'توليد البيانات الآن'}
                      </button>
                   </div>
                </div>
              </motion.section>
            )}

            <div className="pt-4">
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? 'جاري الحفظ...' : (
                  <>
                    <Save className="w-5 h-5" />
                    حفظ كافة التغييرات
                  </>
                )}
              </button>
            </div>

          </div>
        </form>
      </div>
    </Layout>
  );
}
