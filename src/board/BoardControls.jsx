import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon } from 'lucide-react';
import { useI18n } from '../i18n';

function useOutsideClick(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler();
    };

    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  className = '',
  disabled = false
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);

  useOutsideClick(rootRef, () => setOpen(false));

  const selected = options.find((option) => option.value === value);
  const resolvedPlaceholder = placeholder || t('board.properties.fields.type');

  const updateDirection = () => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const estimatedMenuHeight = Math.min(options.length * 42 + 12, 260);
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    setOpenUpward(spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow);
  };

  useEffect(() => {
    if (!open) return;

    updateDirection();

    const handleResize = () => updateDirection();
    const handleScroll = () => updateDirection();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, options.length]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            if (!open) updateDirection();
            setOpen((prev) => !prev);
          }
        }}
        className={`w-full relative bg-[#232323]/82 border border-gray-700/70 rounded-md px-3 py-2.5 text-left text-gray-200 outline-none transition-colors duration-150 focus:outline-none focus:ring-0 ${
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-[#282828]/92 hover:border-gray-600/80'
        }`}
        style={{
          boxShadow: 'none',
          WebkitAppearance: 'none',
          appearance: 'none'
        }}
      >
        <span className="block truncate pr-7">
          {selected ? selected.label : resolvedPlaceholder}
        </span>

        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        >
          <ChevronDownIcon className="w-4 h-4" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: openUpward ? 6 : -6, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openUpward ? 4 : -4, scale: 0.99 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute z-[120] w-full rounded-md border border-gray-700/70 bg-[#1A1A1A]/96 backdrop-blur-md shadow-[0_18px_48px_rgba(0,0,0,0.45)] overflow-hidden ${
              openUpward ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
          >
            <div className="max-h-64 overflow-auto py-1 no-scrollbar">
              {options.map((option) => {
                const active = option.value === value;

                return (
                  <button
                    key={option.value || '__empty'}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                      active
                        ? 'bg-[#2A2A2A]/90 text-white'
                        : 'text-gray-300 hover:bg-[#242424]/90 hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SidebarSection({
  title,
  subtitle,
  icon: Icon,
  open,
  onToggle,
  children
}) {
  return (
    <div className="rounded-md border border-gray-800/80 bg-[#141414]/58 backdrop-blur-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-[#181818]/70 transition-colors duration-200"
      >
        <div className="flex items-start gap-2 min-w-0">
          {Icon ? (
            <div className="w-8 h-8 rounded-md bg-[#1d1d1d]/78 border border-gray-800/80 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="w-4 h-4 text-gray-300" />
            </div>
          ) : null}

          <div className="min-w-0">
            <div className="text-sm text-white font-medium truncate">{title}</div>
            {subtitle ? <div className="text-xs text-gray-500 truncate">{subtitle}</div> : null}
          </div>
        </div>

        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="text-gray-400 shrink-0"
        >
          <ChevronDownIcon className="w-4 h-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
              opacity: { duration: 0.2, ease: 'easeOut' }
            }}
            className="border-t border-gray-800/70 overflow-hidden"
          >
            <motion.div
              initial={{ y: -4, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -4, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="px-3 pb-3 pt-3"
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PropertySection({
  title,
  open,
  onToggle,
  children,
  className = ''
}) {
  return (
    <div className={`rounded-md border border-gray-800/80 bg-[#141414]/58 backdrop-blur-sm overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-[#181818]/70 transition-colors duration-200"
      >
        <div className="text-sm text-white font-medium truncate">{title}</div>

        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="text-gray-400 shrink-0"
        >
          <ChevronDownIcon className="w-4 h-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
              opacity: { duration: 0.2, ease: 'easeOut' }
            }}
            className="border-t border-gray-800/70 overflow-hidden"
          >
            <motion.div
              initial={{ y: -4, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -4, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="p-3"
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}