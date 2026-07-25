import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Sparkles, ArrowRight, ExternalLink } from 'lucide-react';
import { useOutsideClick } from '../hooks/use-outside-click';

export default function ExpandableBentoGrid({ items }) {
  const [active, setActive] = useState(null);
  const ref = useRef(null);
  const id = useId();

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setActive(null);
      }
    }

    if (active && typeof active === 'object') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active]);

  useOutsideClick(ref, () => setActive(null));

  return (
    <>
      <AnimatePresence>
        {active && typeof active === 'object' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm h-full w-full z-[10000]"
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {active && typeof active === 'object' ? (
          <div className="fixed inset-0 top-10 md:top-16 grid place-items-center z-[10001] p-4 overflow-y-auto">
            <motion.button
              key={`button-${active.title}-${id}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              className="flex absolute top-4 right-4 md:right-10 items-center justify-center bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full h-8 w-8 shadow-md transition-colors cursor-pointer z-10"
              onClick={() => setActive(null)}
            >
              <X className="h-4 w-4" />
            </motion.button>
            <motion.div
              layoutId={`card-${active.title}-${id}`}
              ref={ref}
              className="w-full max-w-xl h-fit max-h-[85vh] flex flex-col bg-white dark:bg-[#141417] text-charcoal dark:text-gray-100 rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              <motion.div layoutId={`image-${active.title}-${id}`}>
                <div 
                  className="w-full h-44 md:h-52 flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: active.color 
                      ? `linear-gradient(135deg, ${active.color}25 0%, ${active.color}05 100%)`
                      : 'linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(37,99,235,0.02) 100%)'
                  }}
                >
                  <div 
                    className="p-5 rounded-3xl shadow-lg border border-white/20 dark:border-white/10 backdrop-blur-md scale-125 transition-transform"
                    style={{ background: active.color ? `${active.color}15` : 'rgba(37,99,235,0.1)' }}
                  >
                    {active.icon ? (
                      <div className="scale-125" style={{ color: active.color || '#2563eb' }}>{active.icon}</div>
                    ) : (
                      <Sparkles className="w-8 h-8 text-blue-500" />
                    )}
                  </div>
                  {active.tag && (
                    <span 
                      className="absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase border bg-white/80 dark:bg-black/60 backdrop-blur-sm"
                      style={{ borderColor: active.color || '#2563eb', color: active.color || '#2563eb' }}
                    >
                      {active.tag}
                    </span>
                  )}
                </div>
              </motion.div>

              <div className="p-6 overflow-y-auto max-h-[calc(85vh-13rem)] space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <motion.h3
                      layoutId={`title-${active.title}-${id}`}
                      className="font-extrabold text-xl md:text-2xl text-charcoal dark:text-white"
                    >
                      {active.title}
                    </motion.h3>
                    <motion.p
                      layoutId={`description-${active.title}-${id}`}
                      className="text-gray-500 dark:text-gray-400 text-xs md:text-sm mt-1"
                    >
                      {active.subtitle || active.description}
                    </motion.p>
                  </div>

                  {active.link && (
                    <motion.a
                      layoutId={`button-${active.title}-${id}`}
                      href={active.link}
                      className="px-4 py-2.5 text-xs rounded-xl font-bold bg-charcoal dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 transition-all flex items-center gap-1.5 shrink-0 shadow-md"
                    >
                      <span>Explore</span>
                      <ExternalLink size={13} />
                    </motion.a>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-gray-600 dark:text-gray-300 text-xs md:text-sm leading-relaxed space-y-3"
                  >
                    {active.content || (
                      <p>{active.description}</p>
                    )}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <ul className="max-w-7xl mx-auto w-full gap-4 lg:gap-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch">
        {items.map((item) => (
          <motion.div
            layoutId={`card-${item.title}-${id}`}
            key={item.id}
            onClick={() => setActive(item)}
            className="p-5 flex flex-col justify-between hover:scale-[1.01] rounded-2xl cursor-pointer bg-white dark:bg-[#141417] border border-gray-200/80 dark:border-gray-800/80 hover:border-blue-500/50 dark:hover:border-blue-500/50 shadow-sm hover:shadow-xl transition-all group"
          >
            <div className="flex gap-4 items-start">
              <motion.div layoutId={`image-${item.title}-${id}`}>
                <div 
                  className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                  style={{ 
                    background: item.color ? `${item.color}15` : 'rgba(37,99,235,0.1)',
                    color: item.color || '#2563eb'
                  }}
                >
                  {item.icon}
                </div>
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <motion.h3
                    layoutId={`title-${item.title}-${id}`}
                    className="font-bold text-sm md:text-base text-charcoal dark:text-white truncate"
                  >
                    {item.title}
                  </motion.h3>
                  {item.tag && (
                    <span 
                      className="text-[9px] font-extrabold px-2 py-0.5 rounded-full border tracking-wider uppercase shrink-0"
                      style={{ 
                        borderColor: item.color ? `${item.color}40` : 'rgba(37,99,235,0.3)',
                        color: item.color || '#2563eb',
                        backgroundColor: item.color ? `${item.color}10` : 'rgba(37,99,235,0.05)'
                      }}
                    >
                      {item.tag}
                    </span>
                  )}
                </div>
                <motion.p
                  layoutId={`description-${item.title}-${id}`}
                  className="text-gray-500 dark:text-gray-400 text-xs line-clamp-2 leading-snug"
                >
                  {item.subtitle || item.description}
                </motion.p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between text-[11px] font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
              <span>Click to view capabilities</span>
              <ArrowRight size={13} />
            </div>
          </motion.div>
        ))}
      </ul>
    </>
  );
}
