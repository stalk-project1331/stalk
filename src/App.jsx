import React, { useState } from 'react';
import SplashScreen from './SplashScreen';
import MainLayout from './MainLayout';
import UpdateBanner from './UpdateBanner';
import { AnimatePresence } from 'framer-motion';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      <MainLayout />
      <UpdateBanner />

      <AnimatePresence>
        {showSplash && (
          <SplashScreen onComplete={() => setShowSplash(false)} />
        )}
      </AnimatePresence>
    </>
  );
}