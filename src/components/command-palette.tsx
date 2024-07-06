import { useState, useEffect } from "react";
import { windowReload } from "@/lib/utils";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  // CommandSeparator,
  // CommandShortcut,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  installAllMods,
  uninstallAllMods,
  cloneModRepo,
  gitFetch,
  gitFetchAllMods,
  printModJsonErrors,
} from "@/lib/api";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { popUp } from "@/lib/utils";

const repoUrlSchema = z.object({
  repoUrl: z.string().url().trim().endsWith(".git"),
});

type CloneModFormDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};
const CloneModFormDialog = ({ open, setOpen }: CloneModFormDialogProps) => {
  const defaultValues = {
    repoUrl: "",
  };
  const form = useForm<z.infer<typeof repoUrlSchema>>({
    resolver: zodResolver(repoUrlSchema),
    defaultValues: defaultValues,
  });
  const onSubmit = async (data: z.infer<typeof repoUrlSchema>) => {
    try {
      await cloneModRepo(data.repoUrl);
      await windowReload();
      setOpen(false);
    } catch (e) {
      popUp("failed", "Failed to clone mod repository");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter Repository URL</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              name="repoUrl"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repository URL</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      placeholder="Repository URL"
                    />
                  </FormControl>
                  <FormMessage>{form.formState.errors.repoUrl?.message}</FormMessage>
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white"
              onClick={async () => {
                const isValid = await form.trigger();
                if (!isValid) return;
              }}
            >
              クローン
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "p" || e.key === "k") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const [openCloneDialog, setOpenCloneDialog] = useState(false);

  return (
    <>
      <p className="text-sm text-muted-foreground cursor-pointer" onClick={() => setOpen(true)}>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>P
        </kbd>
      </p>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="🤖< ナニニシマスカ?" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Mod操作">
            <CommandItem key="cmd-mod-clone" onSelect={() => setOpenCloneDialog(true)}>
              🧬 Clone mod repository
            </CommandItem>
            {openCloneDialog && <CloneModFormDialog open={openCloneDialog} setOpen={setOpenCloneDialog} />}
            <CommandItem
              key="cmd-all-mod-install"
              onSelect={async () => {
                await installAllMods();
                await windowReload();
              }}
            >
              🚀 Activate all mods
            </CommandItem>
            <CommandItem
              key="cmd-all-mod-uninstall"
              onSelect={async () => {
                await uninstallAllMods();
                await windowReload();
              }}
            >
              🗑 Deactivate all mods
            </CommandItem>
            {/* <CommandItem
              key="cmd-all-mod-install"
              onSelect={async () => {
                await gitFetchAllMods();
                await windowReload();
              }}
            >
              ✨ Fetch remote version info
            </CommandItem> */}
          </CommandGroup>
          <CommandGroup heading="Mod作成ヘルパー">
            <CommandItem
              key="cmd-mod-clone"
              onSelect={async () => {
                await printModJsonErrors();
              }}
            >
              🏭 Print Json Error for active mods
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
