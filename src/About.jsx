import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink,
  Users,
  Newspaper,
  ChevronLeft,
  ChevronRight,
  CalendarDays
} from 'lucide-react';
import { useI18n } from './i18n';

const NEWS_URL =
  'https://raw.githubusercontent.com/stalk-project1331/stalk-project1331.github.io/refs/heads/main/news.json';
const POSTS_PER_PAGE = 3;

function LinkItem({ href, text, icon, iconSmall = false }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center text-sky-400 hover:text-sky-300 hover:underline transition-colors duration-150 text-sm"
    >
      {icon &&
        React.cloneElement(icon, {
          size: iconSmall ? 12 : 16,
          className: `mr-1.5 ${iconSmall ? 'w-3 h-3' : 'w-4 h-4'}`
        })}
      {text}
      <ExternalLink size={14} className="ml-1 opacity-70" />
    </a>
  );
}

function PartnerItem({ href, name, type }) {
  return (
    <li className="flex items-center">
      <LinkItem href={href} text={`${name} (${type})`} />
    </li>
  );
}

function NewsCard({ post, formatDate, openMoreLabel, untitledLabel, fallbackLabel }) {
  return (
    <motion.div
      layout
      className="bg-[#1A1A1A] rounded-lg border border-gray-700/50 overflow-hidden"
    >
      {post.image ? (
        <img
          src={post.image}
          alt={post.title || fallbackLabel}
          className="w-full h-40 object-cover"
          draggable={false}
        />
      ) : (
        <div className="w-full h-40 flex items-center justify-center bg-gradient-to-br from-[#1f1f1f] to-[#111]">
          <span className="text-gray-600 text-lg font-semibold tracking-wide">
            STALK News
          </span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="text-base font-semibold text-white leading-snug">
            {post.title || untitledLabel}
          </div>

          {post.date ? (
            <div className="shrink-0 inline-flex items-center gap-1 text-[11px] text-gray-500">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{formatDate(post.date)}</span>
            </div>
          ) : null}
        </div>

        {post.text ? (
          <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap break-words">
            {post.text}
          </p>
        ) : null}

        {post.url ? (
          <div className="mt-4">
            <LinkItem href={post.url} text={openMoreLabel} />
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

export default function About() {
  const { t, intlLocale } = useI18n();
  const [posts, setPosts] = useState([]);
  const [newsPage, setNewsPage] = useState(0);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString(intlLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const componentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' }
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: { duration: 0.3, ease: 'easeIn' }
    }
  };

  const sectionVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (index) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: index * 0.08,
        duration: 0.28,
        ease: 'easeOut'
      }
    })
  };

  useEffect(() => {
    let cancelled = false;

    const loadNews = async () => {
      try {
        setNewsLoading(true);
        setNewsError(false);

        const response = await fetch(`${NEWS_URL}?t=${Date.now()}`, {
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.posts)
          ? data.posts
          : [];

        if (!cancelled) {
          setPosts(list);
          setNewsPage(0);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('News loading error:', error);
          setNewsError(true);
          setPosts([]);
        }
      } finally {
        if (!cancelled) {
          setNewsLoading(false);
        }
      }
    };

    loadNews();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE)),
    [posts.length]
  );

  const visiblePosts = useMemo(() => {
    const start = newsPage * POSTS_PER_PAGE;
    return posts.slice(start, start + POSTS_PER_PAGE);
  }, [posts, newsPage]);

  const handlePrevNews = () => {
    setNewsPage((prev) => (prev <= 0 ? totalPages - 1 : prev - 1));
  };

  const handleNextNews = () => {
    setNewsPage((prev) => (prev >= totalPages - 1 ? 0 : prev + 1));
  };

  return (
    <motion.div
      variants={componentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="p-4 sm:p-5 text-gray-300 h-full overflow-y-auto no-scrollbar select-none"
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <motion.div
            custom={0}
            variants={sectionVariants}
            className="bg-[#1E1E1E] p-5 sm:p-6 rounded-lg shadow-lg border border-gray-700/50"
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">STALK</h1>
            <p className="text-sm sm:text-base leading-relaxed">
              {t('about.madeWithLove')}
            </p>
            <ul className="list-disc list-inside space-y-1 mt-3 text-xs sm:text-sm text-gray-400">
              {(t('about.bullets') || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="mt-4">
              <LinkItem
                href="https://t.me/cyberstalker007"
                text={t('about.telegram')}
              />
            </div>
          </motion.div>

          <motion.div
            custom={1}
            variants={sectionVariants}
            className="bg-[#1E1E1E] p-5 sm:p-6 rounded-lg shadow-lg border border-gray-700/50"
          >
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-100 mb-3 flex items-center">
              <Users size={22} className="mr-2 text-white" />
              {t('about.friends.title')}
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mb-3">
              {t('about.friends.subtitle')}
            </p>
            <ul className="space-y-2.5">
              <PartnerItem
                href="https://t.me/kingsmanrecovery"
                name="Kingsman"
                type={t('about.friends.channel')}
              />
              <PartnerItem
                href="https://t.me/likosaProjects"
                name="LikosaProjects"
                type={t('about.friends.channel')}
              />
              <PartnerItem
                href="https://t.me/fametgs"
                name="TgFame"
                type={t('about.friends.channel')}
              />
              <PartnerItem
                href="https://t.me/StalkContributors"
                name="Contributors"
                type={t('about.friends.channel')}
              />
            </ul>
          </motion.div>
        </div>

        <motion.div
          custom={2}
          variants={sectionVariants}
          className="mt-5 bg-[#1E1E1E] p-5 sm:p-6 rounded-lg shadow-lg border border-gray-700/50"
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-100 flex items-center">
              <Newspaper size={22} className="mr-2 text-white" />
              {t('about.news.title')}
            </h2>

            {!newsLoading && posts.length > POSTS_PER_PAGE ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevNews}
                  className="w-9 h-9 rounded-md bg-[#222] border border-gray-700 hover:bg-[#2b2b2b] flex items-center justify-center text-gray-300"
                  title={t('about.news.previous')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="text-xs text-gray-500 min-w-[56px] text-center">
                  {newsPage + 1} / {totalPages}
                </div>

                <button
                  onClick={handleNextNews}
                  className="w-9 h-9 rounded-md bg-[#222] border border-gray-700 hover:bg-[#2b2b2b] flex items-center justify-center text-gray-300"
                  title={t('about.news.next')}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          </div>

          {newsLoading ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="rounded-lg border border-gray-700/50 bg-[#1A1A1A] p-4 animate-pulse"
                >
                  <div className="h-36 w-full bg-gray-800 rounded mb-3" />
                  <div className="h-4 w-40 bg-gray-700/60 rounded mb-3" />
                  <div className="h-3 w-full bg-gray-800 rounded mb-2" />
                  <div className="h-3 w-5/6 bg-gray-800 rounded" />
                </div>
              ))}
            </div>
          ) : newsError ? (
            <div className="rounded-lg border border-dashed border-gray-700 bg-[#1A1A1A] p-4 text-sm text-gray-500">
              {t('about.news.loadError')}
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-700 bg-[#1A1A1A] p-4 text-sm text-gray-500">
              {t('about.news.empty')}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={newsPage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 xl:grid-cols-3 gap-4"
              >
                {visiblePosts.map((post, index) => (
                  <NewsCard
                    key={post.id || `${post.title || 'post'}-${index}-${newsPage}`}
                    post={post}
                    formatDate={formatDate}
                    openMoreLabel={t('about.openMore')}
                    untitledLabel={t('about.newsUntitled')}
                    fallbackLabel={t('about.newsCardFallback')}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>

        <motion.p
          custom={3}
          variants={sectionVariants}
          className="text-center text-xs text-gray-600 pt-4"
        >
          STALK Assistant v0.2.9 - {new Date().getFullYear()}
        </motion.p>
      </div>
    </motion.div>
  );
}
