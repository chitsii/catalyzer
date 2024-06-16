import { useState } from "react";
import {
  ColumnDef,
  ColumnSizingState,
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
import { openModData } from "@/lib/api";
import { ColumnResizer } from "@/components/datatable/mod-table/column-resize";
import { CommandPalette } from "@/components/command-palette";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  fetchMods: any; // function to refresh mods that are displayed in the table
  t: (k: string) => string; // i18n function
}
export function DataTable<TData, TValue>({ columns, data, fetchMods, t }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});

  const [colSizing, setColSizing] = useState<ColumnSizingState>({});

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
    onColumnSizingChange: setColSizing,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      columnSizing: colSizing,
    },
    meta: {
      // this is a meta object that is passed to all column and cell functions
      fetchMods: fetchMods,
      t: t,
    },
  });

  return (
    <>
      <div className="my-2 flex justify-items-center items-center">
        <div className="w-full">
          <Input
            placeholder="Search mods..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
            className="max-w-sm justify-self-start w-full text-xs"
          />
        </div>
        <div className="flex items-center justify-items-center ml-auto text-xs">
          <DataTablePagination table={table} />
        </div>
        <div className="flex items-center justify-items-center ml-auto">
          <CommandPalette />
        </div>
      </div>
      <ScrollArea className="h-[480px] rounded-md border">
        <Table style={{ width: table.getTotalSize() }}>
          <TableHeader className="sticky top-0 bg-secondary">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="relative"
                      style={{
                        width: header.getSize(),
                      }}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      <ColumnResizer header={header} />
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
                    <TableCell
                      key={cell.id}
                      style={{
                        width: cell.column.getSize(),
                        minWidth: cell.column.columnDef.minSize,
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
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
