import React from 'react';
import { cn } from "../../lib/utils";

// Inline brand SVG components using currentColor
const LinkedinIcon = ({ className }) => (
  <svg fill="currentColor" viewBox="0 0 24 24" className={className}>
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
  </svg>
);

const TwitterIcon = ({ className }) => (
  <svg fill="currentColor" viewBox="0 0 24 24" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const InstagramIcon = ({ className }) => (
  <svg fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const FacebookIcon = ({ className }) => (
  <svg fill="currentColor" viewBox="0 0 24 24" className={className}>
    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1V12h3v3h-3v6.8c4.56-.93 8-4.96 8-9.8z"/>
  </svg>
);

const TelegramIcon = ({ className }) => (
  <svg fill="currentColor" viewBox="0 0 24 24" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.53-1.39.51-.46-.01-1.35-.26-2.01-.48-.81-.27-1.46-.42-1.4-.88.03-.24.36-.49.99-.74 3.88-1.69 6.46-2.8 7.74-3.32 3.68-1.5 4.44-1.76 4.94-1.77.11 0 .36.03.52.16.13.1.17.24.19.34.02.09.02.26 0 .34z"/>
  </svg>
);

const ICON_MAP = {
  linkedin: LinkedinIcon,
  twitter: TwitterIcon,
  x: TwitterIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  telegram: TelegramIcon
};

const SocialTooltip = React.forwardRef(
  ({ className, items, ...props }, ref) => {
    const baseIconStyles =
      "relative flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 overflow-hidden transition-all duration-300 ease-in-out group-hover:shadow-md border border-gray-200/80";
    const baseSvgStyles =
      "relative z-10 w-4 h-4 transition-all duration-300 ease-in-out group-hover:text-white transition-colors duration-300";
    const baseFilledStyles =
      "absolute bottom-0 left-0 w-full h-0 transition-all duration-300 ease-in-out group-hover:h-full";
    const baseTooltipStyles =
      "absolute bottom-[36px] left-1/2 -translate-x-1/2 px-2.5 py-1 text-[10px] font-bold text-white whitespace-nowrap rounded-md opacity-0 invisible transition-all duration-300 ease-in-out group-hover:opacity-100 group-hover:visible group-hover:bottom-[42px] z-50 shadow-sm";

    return (
      <ul
        ref={ref}
        className={cn("flex items-center justify-center gap-3.5", className)}
        {...props}
      >
        {items.map((item, index) => {
          const Icon = item.iconComponent || ICON_MAP[item.type || item.ariaLabel?.toLowerCase()];
          return (
            <li key={index} className="relative group">
              <a
                href={item.href}
                aria-label={item.ariaLabel}
                className={cn(baseIconStyles)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div
                  className={cn(baseFilledStyles)}
                  style={{ backgroundColor: item.color }}
                />
                {Icon ? (
                  <Icon className={cn(baseSvgStyles, "text-gray-500")} />
                ) : (
                  <img
                    src={item.svgUrl}
                    alt={item.ariaLabel}
                    className={cn(baseSvgStyles)}
                  />
                )}
              </a>
              <div
                className={cn(baseTooltipStyles)}
                style={{ backgroundColor: item.color }}
              >
                {item.tooltip}
              </div>
            </li>
          );
        })}
      </ul>
    );
  }
);

SocialTooltip.displayName = "SocialTooltip";

export { SocialTooltip };
