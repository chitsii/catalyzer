'use client';

import React from "react";


type LOG_LEVEL = 'INFO' | 'DEBUG' | 'ERROR';
const toAllawableLog = (level: LOG_LEVEL): LOG_LEVEL[] => {
  switch (level) {
    case 'DEBUG':
      return ['DEBUG', 'ERROR', 'INFO'];
    case 'INFO':
      return ['INFO', 'ERROR'];
    case 'ERROR':
      return ['ERROR'];
    default:
      return ['INFO', 'ERROR'];
  }
};
const GLOBAL_LOG_LEVEL: LOG_LEVEL = 'INFO';


class Logger {
  private consoleRef: React.RefObject<HTMLTextAreaElement>;
  private logLevel: LOG_LEVEL;

  constructor(consoleRef: React.RefObject<HTMLTextAreaElement>, logLevel: LOG_LEVEL = GLOBAL_LOG_LEVEL) {
    this.consoleRef = consoleRef;
    this.logLevel = logLevel;
  }

  baseLog(message: string, level: LOG_LEVEL) {
    const textarea = this.consoleRef?.current;
    const currentTime = new Date().toLocaleTimeString();
    if (!textarea) {
      console.error(textarea + ': textarea is not found!');
      return;
    }
    textarea.value += `[${currentTime} - ${level}] ${message}\n`;
    textarea.scrollTop = textarea.scrollHeight;
  }
  info(message: string) {
    if (!toAllawableLog(this.logLevel).includes('INFO')) return;
    this.baseLog(message, 'INFO');
  }
  debug(message: string) {
    if (!toAllawableLog(this.logLevel).includes('DEBUG')) return;
    this.baseLog(message, 'DEBUG');
  }
  error(message: string) {
    if (!toAllawableLog(this.logLevel).includes('ERROR')) return;
    this.baseLog(message, 'ERROR');
  }
}

function LoggingArea(
  { consoleRef }: Readonly<{ consoleRef: React.RefObject<HTMLTextAreaElement> }>
) {
  return (
    <>
      <textarea
        id="my_console"
        disabled
        className="w-full min-h-80 bg-gray-700 text-xs text-green-300 overflow-scroll p-4"
        defaultValue={`[${new Date().toLocaleTimeString()} - GREET] Welcome back, survivor!\n`}
        ref={consoleRef}
      />
    </>
  )
}

export { LoggingArea, Logger }