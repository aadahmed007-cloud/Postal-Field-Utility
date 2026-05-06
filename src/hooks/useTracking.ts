import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const useTracking = () => {
  const { user, role, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || !user || (role !== 'EMPLOYEE' && role !== 'ADMIN')) return;

    const interval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              await addDoc(collection(db, 'tracking_logs'), {
                userId: user.uid,
                userName: user.displayName,
                location: {
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude
                },
                timestamp: serverTimestamp()
              });
            } catch (err) {
              console.error("Tracking pulse failed:", err);
            }
          },
          (err) => console.warn("Geo tracking error:", err),
          { enableHighAccuracy: true }
        );
      }
    }, 60000); // Pulse every 1 minute

    return () => clearInterval(interval);
  }, [user, role]);
};
