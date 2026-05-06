import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { 
  LogOut, 
  Settings, 
  LayoutDashboard, 
  Map as MapIcon, 
  ClipboardList, 
  Image as ImageIcon,
  Users,
  Plus,
  Settings as SettingsIcon,
  Menu,
  Bell,
  UserCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { useTracking } from '../hooks/useTracking';

export default function Layout({ children, title }: { children: React.ReactNode, title?: string }) {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Initialize background tracking for employees
  useTracking();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, path: '/' },
    { id: 'new-visit', label: 'إضافة زيارة', icon: Plus, path: '/new-visit', roles: ['EMPLOYEE', 'ADMIN'] },
    { id: 'tracking', label: 'التتبع المباشر', icon: MapIcon, path: '/tracking', roles: ['ADMIN'] },
    { id: 'staff', label: 'إدارة الموظفين', icon: Users, path: '/staff', roles: ['ADMIN'] },
    { id: 'visits', label: 'سجلات الزيارات', icon: ClipboardList, path: '/visits' },
    { id: 'gallery', label: 'معرض الصور', icon: ImageIcon, path: '/gallery' },
    { id: 'settings', label: 'الإعدادات', icon: SettingsIcon, path: '/settings' },
  ];

  const filteredMenuItems = menuItems.filter(item => !item.roles || item.roles.includes(role || ''));

  return (
    <div className="min-h-screen bg-slate-50 flex font-['Cairo']" dir="rtl">
      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Side Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.aside 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-screen w-72 bg-white z-[70] lg:hidden flex flex-col border-l border-slate-200"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between h-20">
              <div>
                <div className="text-xl font-bold text-green-700">بريد مصر</div>
                <div className="text-[10px] text-slate-400 mt-0.5">إدارة الزيارات الميدانية</div>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)} 
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 py-6 px-4 flex flex-col gap-2 overflow-y-auto">
              {filteredMenuItems.map(item => (
                <Link 
                  key={item.id}
                  to={item.path} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:text-green-700 hover:bg-green-50 transition-colors"
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-semibold text-sm">{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="p-4 border-t border-slate-100 flex flex-col gap-2 pb-24">
              <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors text-sm">
                <LogOut className="w-5 h-5" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex fixed right-0 top-0 h-screen w-64 bg-white border-l border-slate-200 shadow-lg flex-col z-50">
        <div className="p-6 border-b border-slate-100 flex flex-col justify-center h-20">
          <div className="text-xl font-bold text-green-700">بريد مصر</div>
          <div className="text-[10px] text-slate-400 mt-0.5">نظام إدارة الزيارات الميدانية</div>
        </div>

        <nav className="flex-1 py-6 px-4 flex flex-col gap-2 overflow-y-auto">
          {filteredMenuItems.map(item => (
            <Link 
              key={item.id}
              to={item.path} 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:text-green-700 hover:bg-green-50 transition-colors font-['Cairo']"
            >
              <item.icon className="w-5 h-5" />
              <span className="font-semibold text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 flex flex-col gap-2">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors text-sm font-['Cairo']">
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:pr-64 min-h-screen flex flex-col">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
              >
                <Menu className="w-6 h-6 text-slate-600" />
             </button>
             <h1 className="text-lg font-bold text-green-800">{title || 'نظام زيارات البريد'}</h1>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 relative hover:bg-slate-50 rounded-full">
              <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>
              <Bell className="w-5 h-5 text-slate-400" />
            </button>
            <div className="flex items-center gap-2 pl-2 border-r border-slate-200 mr-2">
               <div className="text-left">
                  <div className="text-sm font-bold text-slate-700">{user?.displayName}</div>
                  <div className="text-[10px] text-slate-400">{role}</div>
               </div>
               <img src={user?.photoURL || ''} alt="User" className="w-8 h-8 rounded-full border border-slate-200" />
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 md:p-8 flex-1 pb-32 lg:pb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={title}
          >
            {children}
          </motion.div>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm h-16 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl flex items-center justify-around px-4 z-50">
          <Link to="/" className="flex flex-col items-center gap-1 text-slate-400 hover:text-green-700 transition-all">
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-bold">الرئيسية</span>
          </Link>
          {(role === 'EMPLOYEE' || role === 'ADMIN') && (
            <Link to="/new-visit" className="flex flex-col items-center gap-1 -translate-y-4 bg-green-700 text-white p-3 rounded-2xl shadow-lg shadow-green-200 hover:scale-110 active:scale-95 transition-all">
              <Plus className="w-6 h-6" />
            </Link>
          )}
          <Link to="/visits" className="flex flex-col items-center gap-1 text-slate-400 hover:text-green-700 transition-all">
            <ClipboardList className="w-5 h-5" />
            <span className="text-[10px] font-bold">الزيارات</span>
          </Link>
          <Link to="/settings" className="flex flex-col items-center gap-1 text-slate-400 hover:text-green-700 transition-all">
            <SettingsIcon className="w-5 h-5" />
            <span className="text-[10px] font-bold">الإعدادات</span>
          </Link>
        </nav>
      </main>
    </div>
  );
}
