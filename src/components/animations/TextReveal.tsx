"use client";

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

interface TextRevealProps {
  children: string;
  className?: string;
  delay?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  variant?: 'fade' | 'slide' | 'flip' | 'char';
}

export default function TextReveal({
  children,
  className = '',
  delay = 0,
  as: Component = 'span',
  variant = 'slide',
}: TextRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: variant === 'char' ? 0.03 : 0.1,
        delayChildren: delay,
      },
    },
  };

  const easeOut = [0.25, 0.1, 0.25, 1] as const;
  
  const wordVariants = {
    fade: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } },
    },
    slide: {
      hidden: { opacity: 0, y: 40, rotateX: -45 },
      visible: { 
        opacity: 1, 
        y: 0, 
        rotateX: 0,
        transition: { duration: 0.7, ease: easeOut }
      },
    },
    flip: {
      hidden: { opacity: 0, rotateX: -90, transformOrigin: 'bottom' },
      visible: { 
        opacity: 1, 
        rotateX: 0,
        transition: { duration: 0.8, ease: easeOut }
      },
    },
    char: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
    },
  };

  const MotionComponent = motion[Component] || motion.span;

  if (variant === 'char') {
    const chars = children.split('');
    return (
      <MotionComponent
        ref={ref}
        className={`inline-block ${className}`}
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        style={{ perspective: 1000 }}
      >
        {chars.map((char, i) => (
          <motion.span
            key={i}
            className="inline-block"
            variants={wordVariants.char}
            style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
      </MotionComponent>
    );
  }

  const words = children.split(' ');

  return (
    <MotionComponent
      ref={ref}
      className={`inline-flex flex-wrap ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      style={{ perspective: 1000 }}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.25em]"
          variants={wordVariants[variant]}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {word}
        </motion.span>
      ))}
    </MotionComponent>
  );
}
