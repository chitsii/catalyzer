'use client';

import { Sun, Moon, Eclipse, Gem } from "lucide-react";;
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from "@/lib/utils";


const Icon = ({type}: { type: string | undefined }) => {
  if (type === 'light') {
    return <Sun className="size-6" />;
  } else if (type === 'system') {
    return <Eclipse className="size-6" />;
  } else if (type === 'dark' ) {
    return <Moon className="size-6" />;
  } else if (type === 'yukari') {
    return <Gem className="size-6" />;
  } else {
    return <Gem className="size-6" />;
  }
};

const ColorThemeSelector = () => {

  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme, themes, setTheme } = useTheme();

  console.log(themes);

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
          className="rounded border p-2 text-foreground"
          type="button"
        >
          <Icon type={theme}/>
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
                <Icon type={item}/>
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