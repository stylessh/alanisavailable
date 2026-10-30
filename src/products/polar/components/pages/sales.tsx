"use client";

import { useState } from "react";
import { ORDERS, PRODUCTS, TODAY, usd, type Order, type OrderStatus } from "../data";
import { DownloadIcon } from "../icons";
import { Avatar } from "../ui/avatar";
import { DateRangePicker, type DateRange } from "../ui/calendar";
import { Select } from "../ui/select";
import { StatCard } from "../ui/metric";
import { Page, PageAction } from "../ui/page";
import { Status } from "../ui/status";
import { DataTable, Pagination, TableDate, useTableView, type Column } from "../ui/table";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  paid: { label: "Paid", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  refunded: { label: "Refunded", tone: "neutral" },
  partially_refunded: { label: "Partially Refunded", tone: "neutral" },
};

const STATUSES = [
  { id: "any", label: "Any status" },
  { id: "paid", label: "Paid" },
  { id: "refunded", label: "Refunded" },
  { id: "partially_refunded", label: "Partially Refunded" },
];

const PRODUCT_FILTER = [{ id: "all", label: "All products" }, ...PRODUCTS.map((p) => ({ id: p.id, label: p.name }))];

// Orders' columns sized 200 / 250 / 250 / 175 / 100, as Polar's table is;
// each sorts or filters by what it shows
export const ORDER_COLUMNS: Column<Order>[] = [
  {
    key: "date",
    header: "Date",
    size: 200,
    sortBy: (o) => o.date.getTime(),
    sortLabels: ["Oldest first", "Newest first"],
    cell: (o) => <TableDate date={o.date} />,
  },
  {
    key: "customer",
    header: "Customer",
    size: 250,
    sortBy: (o) => o.customer.email,
    filterBy: (o) => ({ value: o.customer.id, label: o.customer.name }),
    cell: (o) => (
      <div className="flex items-center gap-2">
        {/* 24px in a table row: the 32px default crowds a single line of text */}
        <Avatar name={o.customer.name} size={24} />
        <span className="truncate">{o.customer.email}</span>
      </div>
    ),
  },
  {
    key: "product",
    header: "Product",
    size: 250,
    sortBy: (o) => o.product.name,
    filterBy: (o) => ({ value: o.product.id, label: o.product.name }),
    cell: (o) => <span className="truncate">{o.product.name}</span>,
  },
  {
    key: "status",
    header: "Status",
    size: 175,
    filterBy: (o) => ({ value: o.status, label: ORDER_STATUS[o.status].label }),
    cell: (o) => <Status tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Status>,
  },
  {
    key: "amount",
    header: "Amount",
    size: 100,
    align: "right",
    sortBy: (o) => o.amount,
    sortLabels: ["Lowest first", "Highest first"],
    cell: (o) => usd(o.amount, 2),
  },
];

/** Sales › Orders: filters and Export, three totals, then the orders table */
export function OrdersPage() {
  const [product, setProduct] = useState("all");
  const [status, setStatus] = useState("any");
  const [pageSize, setPageSize] = useState("50");
  const [dates, setDates] = useState<DateRange>(() => ({ from: new Date(TODAY.getTime() - 29 * 86_400_000), to: TODAY }));
  const filtered = ORDERS.filter(
    (o) => (product === "all" || o.product.id === product) && (status === "any" || o.status === status),
  );
  // the table's own sorting and filtering, kept here so the totals and the count follow it
  const view = useTableView(ORDER_COLUMNS, filtered, { key: "date", dir: "desc" });
  const orders = view.rows;
  const revenue = orders.reduce((s, o) => s + (o.status === "refunded" ? 0 : o.amount), 0);

  return (
    <Page
      title="Orders"
      filters={
        <>
          <Select label="Product" options={PRODUCT_FILTER} value={product} onChange={setProduct} strong className="w-[226px]" />
          <Select label="Status" options={STATUSES} value={status} onChange={setStatus} className="w-40" />
          <DateRangePicker value={dates} onChange={setDates} preset="All Time" className="w-52" />
        </>
      }
      actions={
        <PageAction label="Export">
          <DownloadIcon />
        </PageAction>
      }
    >
      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard label="Orders" value={String(orders.length)} />
          <StatCard label="Revenue" value={usd(revenue)} />
          <StatCard label="Average Order Value" value={usd(orders.length ? revenue / orders.length : 0)} />
        </div>
        <div className="flex flex-col gap-6">
          <DataTable columns={ORDER_COLUMNS} rows={filtered} view={view} rowKey={(o) => o.id} onRowClick={() => {}} />
          <Pagination count={orders.length} pageSize={pageSize} onPageSize={setPageSize} />
        </div>
      </div>
    </Page>
  );
}
