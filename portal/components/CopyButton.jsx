import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyButton({ text, className = "" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`text-gray-400 hover:text-charcoal transition-colors flex items-center gap-1 ${className} ${copied ? "text-green-500 hover:text-green-600" : ""}`}
      title="Copy to clipboard"
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied && <span className="text-[10px] font-bold uppercase tracking-wider text-green-500 flash-animation">Copied!</span>}
    </button>
  );
}
