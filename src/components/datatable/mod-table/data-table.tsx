"use client"

import { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { openLocalDir} from "@/lib/api";
import { DataTablePagination } from "@/components/datatable/pagenation";
import { openModData } from "@/lib/api";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  fetchMods: () => void; // This is a function that refresh mod list;
  gameModDir: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  fetchMods,
  gameModDir,
}: DataTableProps<TData, TValue>) {

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    autoResetPageIndex: false, // this is to prevent the table from resetting the page index when the data changes
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(
      {
        initialSync: false,
      }
    ),
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
      gameModDir: gameModDir,
    }
  },
  );

  return (
    <>
      <div className="flex">
        <div className="w-full flex items-center py-4 justify-self-start">
          <Input
            placeholder="Search mods..."
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="max-w-sm justify-self-start w-full"
          />
        </div>
        <div className="flex items-center justify-items-center ml-auto">
          <DataTablePagination table={table}/>
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
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Modがありません！
                  <br/>
                  <Button
                  variant="ghost"
                  className="text-primary underline hover:mouse-pointer"
                  onClick={()=>{
                    openModData();
                  }}
                  >
                    <br/>
                    Mod管理フォルダを開いて追加しましょう。<br/>
                    ウィンドウにZipファイルをドラッグ＆ドロップしても追加できます。
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </>
  )
}
