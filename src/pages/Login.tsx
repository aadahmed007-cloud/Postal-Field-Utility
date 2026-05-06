import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { LogIn, Truck } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
 
      const adminEmails = ['aadahmed007@gmail.com'];
      const isAdminEmail = adminEmails.includes(user.email || '');

      // Search for the user by email in Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // User is pre-authorized by admin
        const userDocSnapshot = querySnapshot.docs[0];
        const userData = userDocSnapshot.data();
        
        // If it's a pending manual add OR a different UID (security check)
        if (userData.isPending || userData.uid !== user.uid) {
          await updateDoc(doc(db, 'users', userDocSnapshot.id), {
            uid: user.uid,
            photoURL: user.photoURL || userData.photoURL || null,
            displayName: user.displayName || userData.displayName,
            isPending: false,
            updatedAt: serverTimestamp()
          });
        }
      } else if (isAdminEmail) {
        // Check if admin doc exists by UID already
        const adminDoc = await getDoc(doc(db, 'users', user.uid));
        if (!adminDoc.exists()) {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: 'ADMIN',
            createdAt: serverTimestamp()
          });
        }
      } else {
        // NOT AUTHORIZED
        await auth.signOut();
        throw new Error("هذا البريد الإلكتروني غير مسجل في النظام. يرجى التواصل مع المدير.");
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9f9f9] p-6 font-['Cairo']" dir="rtl">
      <motion.main 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[480px]"
      >
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,52,97,0.08)] border border-slate-200 overflow-hidden">
          <div className="p-12 flex flex-col items-center border-b border-slate-100 bg-slate-50">
            <div className="w-20 h-20 bg-green-700 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <Truck className="text-white w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-green-900 text-center">نظام زيارة البريد</h1>
            <p className="text-slate-500 text-center mt-2">تسجيل الدخول للموظفين والإداريين</p>
          </div>

          <div className="p-12">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <button
              onClick={handleGoogleLogin}
              className="w-full bg-green-700 text-white font-bold rounded-xl h-[56px] flex items-center justify-center gap-3 hover:bg-green-800 transition-all shadow-md active:scale-[0.98]"
            >
              <span>تسجيل الدخول بجوجل</span>
              <LogIn className="w-5 h-5" />
            </button>

            <div className="mt-8 text-center">
              <p className="text-sm text-slate-400">نظام الإدارة المركزية البريد المصري © 2026</p>
            </div>
          </div>
        </div>
      </motion.main>
    </div>
  );
}
