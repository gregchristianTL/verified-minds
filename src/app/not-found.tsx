"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import VideoBackground from "@/components/VideoBackground";
import { staggerContainer, fadeInUp, gentle } from "@/lib/motion";

export default function NotFound(): React.ReactElement {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <VideoBackground src="/ascii-art.mp4" overlayOpacity={0.6} />

      <motion.div
        className="relative z-10 max-w-md w-full text-center space-y-8 px-6"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.p
          className="font-mono text-7xl font-bold text-white/20"
          variants={fadeInUp}
          transition={gentle}
        >
          404
        </motion.p>

        <motion.div className="space-y-3" variants={fadeInUp} transition={gentle}>
          <h1
            className="font-heading text-2xl font-medium tracking-tight text-white"
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}
          >
            Page not found
          </h1>
          <p
            className="text-white/50 text-base leading-relaxed"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}
          >
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
          variants={fadeInUp}
          transition={gentle}
        >
          <Link
            href="/"
            className="inline-flex items-center justify-center h-11 px-6 rounded-2xl
                       bg-primary text-primary-foreground font-heading font-medium text-sm
                       shadow-lg hover:shadow-[0_0_30px_rgba(232,104,48,0.35)]
                       transition-all active:scale-[0.97]"
          >
            Go home
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex items-center justify-center h-11 px-6 rounded-2xl
                       border border-white/20 text-white/80 font-heading font-medium text-sm
                       backdrop-blur-md bg-white/5
                       hover:bg-white/10 hover:border-white/30
                       transition-all active:scale-[0.97]"
          >
            Browse agents
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
