"use client";

// import { useEffect } from "react";
// import { invoke_safe } from "@/lib/api";
// import { debug, info, warn } from "@tauri-apps/plugin-log";
import Image from "next/image";
import { motion } from "framer-motion";

// function sleep(seconds: number): Promise<void> {
//   return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
// }
// async function setup() {
//   await sleep(1);
//   info("Setting frontend task as complete...");
//   invoke_safe("set_complete", { task: "frontend" });
// }

const SplashScreen = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <motion.div
        initial={{ opacity: 0, scale: 1, rotate: 0, skewX: 0, skewY: 0 }}
        animate={{
          opacity: [1, 0, 1],
          scale: [1, 0.5, 1],
          // rotate: [0, 360, 0],
        }}
        transition={{
          duration: 2,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "loop",
        }}
      >
        <Image src="/assets/icon.png" alt="menu" width={100} height={100} />
      </motion.div>
    </div>
  );
};

export default function Home() {
  return (
    <main>
      <SplashScreen />
    </main>
  );
}
