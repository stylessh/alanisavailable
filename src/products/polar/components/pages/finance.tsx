"use client";

import { ORDERS, usd, type Order } from "../data";
import { DownloadIcon } from "../icons";
import { Page, PageAction } from "../ui/page";
import { Status } from "../ui/status";
import { DataTable, TableDate, type Column } from "../ui/table";
import { ORDER_STATUS } from "./sales";

// Polar's fee on each payment: 4% + 40¢
const fee = (o: Order) => Math.round(o.amount * 0.04 + 40);

// Finance's columns are fixed: 170 / 200 / 150 × 4 / 190 (Polar's Date is
// 150; natural dates, "Wednesday, 11:18 PM", need 20 more), headers muted but
// Date; the money sorts, the description and status filter
const COLUMNS: Column<Order>[] = [
  {
    key: "date",
    header: "Date",
    size: 170,
    sortBy: (o) => o.date.getTime(),
    sortLabels: ["Oldest first", "Newest first"],
    cell: (o) => <TableDate date={o.date} />,
  },
  {
    key: "description",
    header: "Description",
    size: 200,
    muted: true,
    filterBy: (o) => ({ value: o.product.id, label: o.product.name }),
    cell: (o) => <span className="truncate">Payment for {o.product.name}</span>,
  },
  {
    key: "gross",
    header: "Gross",
    size: 150,
    muted: true,
    sortBy: (o) => o.amount,
    sortLabels: ["Lowest first", "Highest first"],
    cell: (o) => usd(o.amount, 2),
  },
  {
    key: "fees",
    header: "Fees",
    size: 150,
    muted: true,
    sortBy: (o) => fee(o),
    sortLabels: ["Lowest first", "Highest first"],
    cell: (o) => usd(-fee(o), 2),
  },
  { key: "tax", header: "Tax", size: 150, muted: true, cell: () => usd(0, 2) },
  {
    key: "net",
    header: "Net",
    size: 150,
    muted: true,
    sortBy: (o) => o.amount - fee(o),
    sortLabels: ["Lowest first", "Highest first"],
    cell: (o) => usd(o.amount - fee(o), 2),
  },
  {
    key: "status",
    header: "Status",
    size: 190,
    muted: true,
    filterBy: (o) => ({ value: o.status, label: ORDER_STATUS[o.status].label }),
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
        <PageAction label="Export">
          <DownloadIcon />
        </PageAction>
      }
    >
      <DataTable columns={COLUMNS} rows={ORDERS} rowKey={(o) => o.id} defaultSort={{ key: "date", dir: "desc" }} fixed />
    </Page>
  );
}
