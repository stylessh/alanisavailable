"use client";

import { useState } from "react";
import { PRODUCTS, priceLabel } from "../data";
import { AddIcon, ArchiveIcon, CodeIcon, CopyIcon, DuplicateIcon, MoreVertIcon, PencilIcon, ProductsIcon } from "../icons";
import { Button, IconButton } from "../ui/button";
import { SearchInput } from "../ui/field";
import { Menu, MenuItem, MenuSeparator } from "../ui/menu";
import { PopoverGroup } from "../ui/popover";
import { Select, type SelectOption } from "../ui/select";
import { EmptyState, Page, PageAction } from "../ui/page";
import { StatusDot } from "../ui/status";

// each status by its light, as a product's state shows elsewhere
const STATUS: SelectOption<"active" | "archived" | "all">[] = [
  { id: "active", label: "Active", icon: <StatusDot tone="success" /> },
  { id: "archived", label: "Archived", icon: <StatusDot tone="neutral" /> },
  { id: "all", label: "All" },
];

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
    <Page
      title="Catalogue"
      filters={
        <>
          <SearchInput
            placeholder="Search Products"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-[196px]"
          />
          <Select label="Status" options={STATUS} value={status} onChange={setStatus} />
          <Select label="Sort" options={[...SORT]} value={sort} onChange={setSort} />
        </>
      }
      actions={
        <PageAction primary label="New Product">
          <AddIcon />
        </PageAction>
      }
    >
      <div className="flex flex-col gap-8">
        {products.length === 0 ? (
          <EmptyState icon={<ProductsIcon size={24} />} title="No products found">
            Start selling digital products today
          </EmptyState>
        ) : (
          <PopoverGroup>
            <div className="flex flex-col rounded-(--pl-radius-lg) border border-(--pl-border)">
              {products.map((p) => (
                <a
                  key={p.id}
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="group flex items-center gap-6 border-b border-(--pl-border) py-4 pr-3 transition-colors last:border-b-0 hover:bg-(--pl-subtle)"
                >
                  {/* 48px tall in a 40px row, as Polar's: it overhangs by 4px top and bottom */}
                  <div className="-my-1 flex items-center py-4 pr-1 pl-4">
                    <span className="size-4 rounded-(--pl-radius-xs) border border-(--pl-rule) opacity-0 transition-opacity group-hover:opacity-100" />
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
                    {/* Polar's product menu, with a glyph for each action */}
                    <Menu
                      align="end"
                      trigger={(t) => (
                        <IconButton
                          {...t}
                          label="More"
                          size={40}
                          className="opacity-50 hover:opacity-100 aria-expanded:opacity-100"
                        >
                          <MoreVertIcon />
                        </IconButton>
                      )}
                    >
                      <MenuItem icon={<CopyIcon />} onSelect={() => navigator.clipboard?.writeText(p.id)}>
                        Copy Product ID
                      </MenuItem>
                      <MenuItem icon={<CodeIcon />}>Integrate Checkout</MenuItem>
                      <MenuSeparator />
                      <MenuItem icon={<PencilIcon />} shortcut="E">
                        Edit Product
                      </MenuItem>
                      <MenuItem icon={<DuplicateIcon />} shortcut="D">
                        Duplicate Product
                      </MenuItem>
                      <MenuSeparator />
                      <MenuItem icon={<ArchiveIcon />} destructive>
                        Archive Product
                      </MenuItem>
                    </Menu>
                  </div>
                </a>
              ))}
            </div>
          </PopoverGroup>
        )}
      </div>
    </Page>
  );
}
