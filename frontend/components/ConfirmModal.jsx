"use client";
import { motion, AnimatePresence } from 'framer-motion';

export default function ConfirmModal({ isOpen, title, message, confirmText, onConfirm, onCancel, danger = false }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl p-8 max-w-[440px] w-full shadow-2xl relative overflow-hidden"
            >
              <h3 className="text-xl font-bold text-charcoal mb-2">{title}</h3>
              <p className="text-gray-500 mb-8 font-medium leading-relaxed font-sm">{message}</p>
              
              <div className="flex justify-end gap-3 font-semibold">
                <button 
                  onClick={onCancel}
                  className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={onConfirm}
                  className={`px-6 py-2.5 rounded-xl text-white shadow-sm transition-colors ${
                    danger ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-[#C8871A] hover:bg-[#A06B10] shadow-orange-500/20'
                  }`}
                >
                  {confirmText || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
