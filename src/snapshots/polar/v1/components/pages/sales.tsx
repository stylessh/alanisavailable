"use client";

import { useState } from "react";
import { ORDERS, PRODUCTS, formatDateTime, usd, type Order, type OrderStatus } from "../data";
import { DownloadIcon } from "../icons";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { DateRangeField } from "../ui/field";
import { Select } from "../ui/select";
import { StatCard } from "../ui/metric";
import { Page } from "../ui/page";
import { Status } from "../ui/status";
import { DataTable, Pagination, type Column } from "../ui/table";

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

// Orders' columns sized 200 / 250 / 250 / 175 / 100, as Polar's table is
export const ORDER_COLUMNS: Column<Order>[] = [
  {
    key: "date",
    header: "Date",
    size: 200,
    sorted: true,
    cell: (o) => <time className="text-sm">{formatDateTime(o.date)}</time>,
  },
  {
    key: "customer",
    header: "Customer",
    size: 250,
    sorted: false,
    cell: (o) => (
      <div className="flex items-center gap-2">
        <Avatar name={o.customer.name} />
        <span className="truncate">{o.customer.email}</span>
      </div>
    ),
  },
  {
    key: "product",
    header: "Product",
    size: 250,
    cell: (o) => <span className="truncate">{o.product.name}</span>,
  },
  {
    key: "status",
    header: "Status",
    size: 175,
    sorted: false,
    cell: (o) => <Status tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Status>,
  },
  {
    key: "amount",
    header: "Amount",
    size: 100,
    sorted: false,
    align: "right",
    cell: (o) => usd(o.amount, 2),
  },
];

/** Sales › Orders: filters and Export, three totals, then the orders table */
export function OrdersPage() {
  const [product, setProduct] = useState("all");
  const [status, setStatus] = useState("any");
  const [pageSize, setPageSize] = useState("50");
  const orders = ORDERS.filter(
    (o) => (product === "all" || o.product.id === product) && (status === "any" || o.status === status),
  );
  const revenue = orders.reduce((s, o) => s + (o.status === "refunded" ? 0 : o.amount), 0);

  return (
    <Page title="Orders">
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select label="Product" options={PRODUCT_FILTER} value={product} onChange={setProduct} strong className="w-[300px]" />
            <Select label="Status" options={STATUSES} value={status} onChange={setStatus} className="w-40" />
            <DateRangeField label="All Time" className="w-52" />
          </div>
          <Button variant="secondary" icon={<DownloadIcon />}>
            Export
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard label="Orders" value={String(orders.length)} />
          <StatCard label="Revenue" value={usd(revenue)} />
          <StatCard label="Average Order Value" value={usd(orders.length ? revenue / orders.length : 0)} />
        </div>
        <div className="flex flex-col gap-6">
          <DataTable columns={ORDER_COLUMNS} rows={orders} rowKey={(o) => o.id} onRowClick={() => {}} />
          <Pagination count={orders.length} pageSize={pageSize} onPageSize={setPageSize} />
        </div>
      </div>
    </Page>
  );
}
