"use client";

import { useState } from "react";
import { PRODUCTS, priceLabel } from "../data";
import { AddIcon, MoreVertIcon, ProductsIcon } from "../icons";
import { Button, IconButton } from "../ui/button";
import { SearchInput } from "../ui/field";
import { Select } from "../ui/select";
import { EmptyState, Page } from "../ui/page";

const STATUS = [
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" },
  { id: "all", label: "All" },
] as const;

const SORT = [
  { id: "az", label: "Name A-Z" },
  { id: "za", label: "Name Z-A" },
  { id: "price-desc", label: "Price High-Low" },
  { id: "price-asc", label: "Price Low-High" },
] as const;

type Status = (typeof STATUS)[number]["id"];
type Sort = (typeof SORT)[number]["id"];

/**
 * Products › Catalogue: search, status and sort over a bordered list of
 * products, each a 72px row with a hover checkbox, the name, its price, Share
 * and a menu.
 */
export function CataloguePage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("active");
  const [sort, setSort] = useState<Sort>("az");

  const products = PRODUCTS.filter((p) => (status === "all" ? true : status === "archived" ? p.archived : !p.archived))
    .filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) =>
      sort === "az"
        ? a.name.localeCompare(b.name)
        : sort === "za"
          ? b.name.localeCompare(a.name)
          : sort === "price-desc"
            ? b.price - a.price
            : a.price - b.price,
    );

  return (
    <Page title="Catalogue">
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-4">
            <SearchInput
              placeholder="Search Products"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-[196px]"
            />
            <Select label="Status" options={[...STATUS]} value={status} onChange={setStatus} />
            <Select label="Sort" options={[...SORT]} value={sort} onChange={setSort} />
          </div>
          <Button icon={<AddIcon />}>New Product</Button>
        </div>
        {products.length === 0 ? (
          <EmptyState icon={<ProductsIcon size={24} />} title="No products found">
            Start selling digital products today
          </EmptyState>
        ) : (
          <div className="flex flex-col rounded-2xl border border-(--pl-border)">
            {products.map((p) => (
              <a
                key={p.id}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="group flex items-center gap-6 border-b border-(--pl-border) py-4 pr-3 transition-colors last:border-b-0 hover:bg-(--pl-subtle)"
              >
                {/* 48px tall in a 40px row, as Polar's: it overhangs by 4px top and bottom */}
                <div className="-my-1 flex items-center py-4 pr-1 pl-4">
                  <span className="size-4 rounded-[2px] border border-(--pl-rule) opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <span className="truncate text-sm leading-5 text-(--pl-text)">{p.name}</span>
                  {p.archived && <span className="text-sm leading-5 text-(--pl-text-muted)">Archived</span>}
                </div>
                <div className="flex shrink-0 items-center gap-6">
                  <span className="text-sm leading-[19.25px] text-(--pl-text)">{priceLabel(p)}</span>
                  <Button variant="secondary" size="sm" onClick={(e) => e.preventDefault()}>
                    Share
                  </Button>
                  <IconButton label="More" size={40} className="opacity-50 hover:opacity-100" onClick={(e) => e.preventDefault()}>
                    <MoreVertIcon />
                  </IconButton>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}
