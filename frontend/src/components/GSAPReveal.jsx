"use client";
import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const GSAPReveal = ({ children, delay = 0, y = 50, duration = 1 }) => {
  const ref = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    
    gsap.fromTo(ref.current, 
      { 
        opacity: 0, 
        y: y 
      }, 
      { 
        opacity: 1, 
        y: 0, 
        duration: duration, 
        delay: delay,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%", // Trigger when top of element is at 85% of viewport
          toggleActions: "play none none none"
        }
      }
    );
  }, [delay, duration, y]);

  return <div ref={ref} style={{ opacity: 0 }}>{children}</div>;
};

export default GSAPReveal;
