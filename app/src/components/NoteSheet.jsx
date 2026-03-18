import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function NoteSheet({ open, onSave, onClose }) {
  const [floor,    setFloor]    = useState("");
  const [location, setLocation] = useState("");
  const [note,     setNote]     = useState("");
  const textRef = useRef(null);

  useEffect(() => {
    if (open) {
      setFloor(""); setLocation(""); setNote("");
      setTimeout(() => textRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSave = () => {
    const parts = [
      floor    ? `Floor ${floor}` : null,
      location || null,
      note     || null,
    ].filter(Boolean);
    onSave({ floor, location, text: parts.join(" · ") || "Note" });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40"
          />
          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-700 rounded-t-2xl p-5 pb-safe"
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-5" />
            <h3 className="text-white font-semibold text-lg mb-4">Add Note</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-slate-400 text-xs uppercase tracking-wide mb-1 block">Floor</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="e.g. 3"
                    value={floor}
                    onChange={e => setFloor(e.target.value)}
                    className="w-full bg-slate-800 text-white rounded-lg px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-[2]">
                  <label className="text-slate-400 text-xs uppercase tracking-wide mb-1 block">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Server room"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full bg-slate-800 text-white rounded-lg px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wide mb-1 block">Note</label>
                <input
                  ref={textRef}
                  type="text"
                  placeholder="Optional additional note"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSave()}
                  className="w-full bg-slate-800 text-white rounded-lg px-3 py-2.5 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-400 font-semibold hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-colors"
              >
                Save
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
