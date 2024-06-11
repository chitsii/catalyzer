"use client";

import { Globe2 } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

import { useTranslation } from "react-i18next";

const LANGUAGES = {
  en: { nativeName: "English" },
  ja: { nativeName: "日本語" },
} as const;

type LanguageSelectorProps = {
  i18n: ReturnType<typeof useTranslation>["i18n"];
};
const LanguageSelector = ({ i18n }: LanguageSelectorProps) => {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Change the Language"
          className="rounded border p-2 text-foreground flex items-center gap-2 hover:bg-secondary capitalize"
          type="button"
        >
          <Globe2 />
          <p className="text-sm">{i18n.resolvedLanguage}</p>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="overflow-hidden rounded border bg-muted-foreground shadow-sm"
          sideOffset={8}
        >
          <DropdownMenu.Group className="flex flex-col">
            {Object.keys(LANGUAGES).map((lang) => (
              <DropdownMenu.Item
                key={lang}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-background hover:bg-foreground",
                  lang === i18n.resolvedLanguage && "bg-primary",
                )}
                onClick={() => i18n.changeLanguage(lang)}
                disabled={i18n.resolvedLanguage === lang}
              >
                <span className="capitalize">{LANGUAGES[lang as keyof typeof LANGUAGES].nativeName}</span>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export { LanguageSelector, LANGUAGES };
