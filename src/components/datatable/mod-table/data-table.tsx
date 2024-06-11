// "use client";

import { useState, useEffect } from "react";
import { windowReload } from "@/lib/utils";
import {
  // Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  // CommandSeparator,
  // CommandShortcut,
} from "@/components/ui/command";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
} from "@tanstack/react-table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/datatable/pagenation";
import { openModData, installAllMods, uninstallAllMods } from "@/lib/api";
import { useTranslation } from "react-i18next";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  fetchMods: any; // function to refresh mods that are displayed in the table
  t: (k: string) => string; // i18n function
}

export function CommandMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "p" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="🤖< ナニニシマスカ?" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {/* <CommandGroup heading="Modダウンロード">
          <CommandItem
            key="cmd-mod-download-github"
            onSelect={() => {
              alert("Download mods from Nexus");
            }}
          >
            Download mods from Github
          </CommandItem>
        </CommandGroup> */}
        <CommandGroup heading="Mod操作">
          {/* <CommandItem key="noodle">ヌードルを頼む🍜</CommandItem> */}
          <CommandItem
            key="cmd-all-mod-install"
            onSelect={async () => {
              await installAllMods();
              await windowReload();
            }}
          >
            🚀 Install all mods
          </CommandItem>
          <CommandItem
            key="cmd-all-mod-uninstall"
            onSelect={async () => {
              await uninstallAllMods();
              await windowReload();
            }}
          >
            🗑 Uninstall all mods
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function DataTable<TData, TValue>({ columns, data, fetchMods, t }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    autoResetPageIndex: false, // this is to prevent the table from resetting the page index when the data changes
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel({
      initialSync: false,
    }),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    enableColumnResizing: false,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
    defaultColumn: {
      size: 200, //starting column size
      minSize: 50, //enforced during column resizing
      maxSize: 500, //enforced during column resizing
    },
    meta: {
      // this is a meta object that is passed to all column and cell functions
      fetchMods: fetchMods,
      t: t,
    },
  });

  return (
    <>
      <div className="flex">
        <div className="w-full flex items-center py-4 justify-self-start">
          <Input
            placeholder="Search mods..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
            className="max-w-sm justify-self-start w-full"
          />
        </div>
        <div className="flex items-center justify-items-center ml-auto">
          <DataTablePagination table={table} />
        </div>
        <div className="flex items-center justify-items-center ml-auto">
          {/* <ActionButtons /> */}
          <CommandMenu />
        </div>
      </div>
      <ScrollArea className="h-mod-table rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-secondary">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {/* Modが見つかりませんでした。 */}
                  {t("no_mods_found")}
                  <br />
                  <Button
                    variant="ghost"
                    className="text-primary underline hover:mouse-pointer"
                    onClick={() => {
                      openModData();
                    }}
                  >
                    <div className="flex-none">
                      <p>{t("add_mods_to_data_directory")}</p>
                      <p>{t("its_okay_to_drop_zip_files_here")}</p>
                      {/* <p>管理ディレクトリにModを追加しましょう。</p>
                      <p>ここにzipファイルをドラッグ＆ドロップしても追加できます。</p> */}
                    </div>
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </>
  );
}
