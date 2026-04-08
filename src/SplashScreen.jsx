import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import introSound from '/assets/intro.mp3';
import { readSettings } from './settingsStore';

export default function SplashScreen({ onComplete }) {
  const audioRef = useRef(null);

  useEffect(() => {
    const saved = readSettings();
    const soundEnabled = saved.hasOwnProperty('enableSound') ? saved.enableSound : true;

    if (soundEnabled && audioRef.current) {
      audioRef.current
        .play()
        .catch((error) => console.warn('Failed to play intro audio:', error));
    }

    const timer = setTimeout(onComplete, 2026);

    return () => {
      clearTimeout(timer);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [onComplete]);

  return (
    <>
      <audio ref={audioRef} src={introSound} preload="auto" />

      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.45 }}
        className="fixed inset-0 bg-black flex items-center justify-center z-50"
      >
        <motion.h1
          initial={{ opacity: 0, y: -36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7, ease: 'easeOut' }}
          className="text-white text-6xl font-extrabold select-none"
        >
          STALK
        </motion.h1>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { delay: 1.1, staggerChildren: 0.18 }
            }
          }}
          className="absolute bottom-16 flex space-x-2"
        >
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              variants={{
                hidden: { scale: 0.75, opacity: 0.4 },
                visible: { scale: [1, 1.15, 1], opacity: [0.55, 1, 0.55] }
              }}
              transition={{ duration: 0.65, repeat: Infinity, ease: 'easeInOut' }}
              className="block w-3 h-3 bg-white rounded-full"
            />
          ))}
        </motion.div>
      </motion.div>
    </>
  );
}
