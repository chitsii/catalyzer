"use client";

import React, { useEffect, useRef } from "react";
import { useAtom } from 'jotai';
import { logTextAtom, } from "@/components/atoms";
import { attachLogger } from 'tauri-plugin-log-api';
import { tailLog } from "@/lib/api";

// Copy from tauri-plugin-log-api
enum LogLevel {
  Trace = 1,
  Debug,
  Info,
  Warn,
  Error,
}
type RecordPayload = {
  level: LogLevel;
  message: string;
}
let IS_LOGGER_ATTACHED = false;


const AreaForLog = () => {
  const MAX_LOG_LINES = 100;

  const [getter, setter] = useAtom(logTextAtom);
  const firstTime = useRef(true);

  useEffect(() => {
    const attach = async () => {
      // 過去ログを取得して初期化
      const res = await tailLog();
      // FIXME: Junkey code
      const infos = res.filter((line) => line.includes('INFO'));
      setter((old) => infos);

      const addToLog = async ({ level, message }: RecordPayload) => {
        if (level === LogLevel.Trace || level == LogLevel.Debug) return;
        setter((old) => { return [...old, message] });
      }
      return await attachLogger(addToLog);
    }
    if (!IS_LOGGER_ATTACHED) {
      attach();

      firstTime.current = false;
      IS_LOGGER_ATTACHED = true;
      console.log('Log attached.');
    }
  }, []);

  // Limit the number of log lines
  if (getter.length > MAX_LOG_LINES) {
    setter((old) => { return old.slice(-MAX_LOG_LINES) });
  }
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [getter]);

  return (
    <div className="w-full h-[200] overflow-y-scroll text-green-400" ref={logContainerRef}>
      <pre className="p-4 text-xs">{
        getter.slice(-MAX_LOG_LINES).join('\n')
      }</pre>
    </div>
  );
}

export { AreaForLog };