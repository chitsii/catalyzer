'use client';

import { Sun, Moon, Eclipse, Gem } from "lucide-react";;
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from "@/lib/utils";


const ColorThemeIcon = ({type}: { type: string | undefined }) => {
  switch (type) {
    case 'light':
      return <Sun className="size-6" />;
    case 'system':
      return <Eclipse className="size-6" />;
    case 'dark':
      return <Moon className="size-6" />;
    case 'yukari':
      return <Gem className="size-6" />;
    default:
      return <Gem className="size-6" />;
  }
};

const ColorThemeSelector = () => {

  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme, themes, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="rounded border p-2 dark:border-gray-500">
        <div className="size-6"></div>
      </div>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="カラーテーマを選択する"
          className="rounded border p-2 text-foreground flex items-center gap-2 hover:bg-secondary capitalize"
          type="button"
        >
          <ColorThemeIcon type={theme}/>
          <p className="text-sm">{theme}</p>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="overflow-hidden rounded border bg-muted-foreground shadow-sm"
          sideOffset={8}
        >
          <DropdownMenu.Group className="flex flex-col">
            {themes.map((item) => (
              <DropdownMenu.Item
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-background hover:bg-foreground",
                  item === theme && "bg-primary"
                )}
                key={item}
                onClick={() => setTheme(item)}
              >
                <ColorThemeIcon type={item}/>
                <span className="capitalize">{item}</span>
                {item === theme && <span className="sr-only">（選択中）</span>}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export { ColorThemeSelector }