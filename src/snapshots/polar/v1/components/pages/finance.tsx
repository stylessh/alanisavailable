"use client";

import { ORDERS, formatDateTime, usd, type Order } from "../data";
import { DownloadIcon } from "../icons";
import { Button } from "../ui/button";
import { Page } from "../ui/page";
import { Status } from "../ui/status";
import { DataTable, type Column } from "../ui/table";
import { ORDER_STATUS } from "./sales";

// Polar's fee on each payment: 4% + 40¢
const fee = (o: Order) => Math.round(o.amount * 0.04 + 40);

// Finance's columns are fixed: 150 / 200 / 150 × 4 / 190, headers muted but Date
const COLUMNS: Column<Order>[] = [
  {
    key: "date",
    header: "Date",
    size: 150,
    sorted: true,
    cell: (o) => <time>{formatDateTime(o.date)}</time>,
  },
  {
    key: "description",
    header: "Description",
    size: 200,
    muted: true,
    cell: (o) => <span className="truncate">Payment for {o.product.name}</span>,
  },
  {
    key: "gross",
    header: "Gross",
    size: 150,
    muted: true,
    cell: (o) => usd(o.amount, 2),
  },
  {
    key: "fees",
    header: "Fees",
    size: 150,
    muted: true,
    cell: (o) => usd(-fee(o), 2),
  },
  { key: "tax", header: "Tax", size: 150, muted: true, cell: () => usd(0, 2) },
  {
    key: "net",
    header: "Net",
    size: 150,
    muted: true,
    cell: (o) => usd(o.amount - fee(o), 2),
  },
  {
    key: "status",
    header: "Status",
    size: 190,
    muted: true,
    cell: (o) => <Status tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Status>,
  },
];

/** Finance › Income: every payment with its fees and what's left */
export function IncomePage() {
  return (
    <Page
      title="Income"
      gap={16}
      actions={
        <Button variant="secondary" icon={<DownloadIcon />}>
          Export
        </Button>
      }
    >
      <DataTable columns={COLUMNS} rows={ORDERS} rowKey={(o) => o.id} fixed />
    </Page>
  );
}
