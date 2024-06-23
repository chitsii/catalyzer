"use client";

import { useEffect } from "react";
import { getSettings } from "@/lib/api";
import "@/i18n/config";
import { i18n } from "@/i18n/config";

const LanguageSetter = () => {
  if (typeof window === "undefined") return <></>;
  useEffect(() => {
    const _st = async () => {
      const setting = await getSettings();
      return setting;
    };
    _st().then((setting) => {
      i18n.changeLanguage(setting.language);
    });
  }, []);
  return <></>;
};

export { LanguageSetter };
