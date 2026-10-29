"use client";

import { useState } from "react";
import { ORG } from "../data";
import { AddIcon, CloseIcon } from "../icons";
import { Avatar } from "../ui/avatar";
import { Button, IconButton } from "../ui/button";
import { FIELD, Input } from "../ui/field";
import { Select } from "../ui/select";
import { Page, Section } from "../ui/page";

// Settings panels: a gray-50 box with a gray-200 border and 16px corners
const PANEL = "flex flex-col rounded-2xl border border-(--pl-border) bg-(--pl-subtle)";

/** A labelled read-only value with Copy, as in Identifiers */
function IdentifierRow({ title, description, value }: { title: string; description: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-start md:justify-between md:gap-12">
      <div className="flex flex-1 flex-col gap-1">
        <h3 className="text-sm leading-[21px] font-medium text-(--pl-text-strong)">{title}</h3>
        <p className="text-sm leading-[21px] text-(--pl-text-muted)">{description}</p>
      </div>
      <div className={`flex h-[42px] flex-1 items-center ${FIELD}`}>
        <input
          readOnly
          value={value}
          className="h-10 min-w-0 flex-1 rounded-xl bg-transparent px-3 text-sm leading-5 text-(--pl-text-dim) outline-none"
        />
        <Button
          variant="ghost"
          size="sm"
          className="mr-1"
          onClick={() => {
            navigator.clipboard?.writeText(value).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-sm leading-5 font-medium text-(--pl-text)">
      {children}
    </label>
  );
}

const COUNTRIES = [
  { id: "US", label: "United States" },
  { id: "SE", label: "Sweden" },
  { id: "DE", label: "Germany" },
  { id: "GB", label: "United Kingdom" },
];

function XLogo() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** Settings › General: identifiers, the public profile, and the danger zone */
export function GeneralSettingsPage() {
  const [country, setCountry] = useState("");
  const [socials, setSocials] = useState([ORG.social]);
  return (
    <Page title="General" narrow>
      <div className="flex flex-col gap-8">
        <Section title="Identifiers">
          <div className={PANEL}>
            <IdentifierRow title="Organization ID" description="Unique identifier for your organization" value={ORG.id} />
            <div className="h-px border-t border-(--pl-border)" />
            <IdentifierRow
              title="Organization Slug"
              description="Used for Customer Portal, Transaction Statements, etc."
              value={ORG.slug}
            />
          </div>
        </Section>
        <Section title="Profile">
          <form className={`${PANEL} gap-6 p-6`} onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-[40px_1fr] gap-x-5 gap-y-2">
              <Label>Logo</Label>
              <Label htmlFor="pl-org-name">Organization Name *</Label>
              <Avatar name={ORG.name} size={40} />
              <Input id="pl-org-name" defaultValue={ORG.name} placeholder="Acme Inc" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Country</Label>
              <Select label="Country" placeholder="Select country" options={COUNTRIES} value={country} onChange={setCountry} />
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="pl-website">Website *</Label>
                <Input id="pl-website" defaultValue={ORG.website} placeholder="https://acme.com" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pl-email">Support Email *</Label>
                <Input id="pl-email" defaultValue={ORG.email} placeholder="support@acme.com" />
              </div>
            </div>
            {/* 16px from the help text to the links, 12px from the links to Add Social */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <p className="text-sm leading-5 font-medium text-(--pl-text)">Social Media</p>
                <p className="text-xs leading-4 text-(--pl-text-dim)">
                  Your personal social media links are used for identity verification. They will never be shown publicly.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {socials.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex w-5 justify-center text-(--pl-text-faint)">
                      <XLogo />
                    </div>
                    <Input
                      value={s}
                      placeholder="https://"
                      onChange={(e) => setSocials((all) => all.map((v, j) => (j === i ? e.target.value : v)))}
                    />
                    <IconButton label="Remove" size={40} onClick={() => setSocials((all) => all.filter((_, j) => j !== i))}>
                      <CloseIcon className="text-(--pl-text-faint)" />
                    </IconButton>
                  </div>
                ))}
                <Button variant="secondary" size="sm" className="self-start" onClick={() => setSocials((all) => [...all, ""])}>
                  {/* the glyph sits 4px from the label here, not the usual 8 */}
                  <span className="flex items-center gap-1">
                    <AddIcon />
                    Add Social
                  </span>
                </Button>
              </div>
            </div>
          </form>
        </Section>
        <Section title="Danger Zone">
          <div className={PANEL}>
            <div className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-start md:justify-between md:gap-12">
              <div className="flex flex-1 flex-col gap-1">
                <h3 className="text-sm leading-[21px] font-medium text-(--pl-text-strong)">Delete Organization</h3>
                <p className="text-sm leading-[21px] text-(--pl-text-muted)">
                  Permanently delete this organization and all its associated data. This action cannot be undone.
                </p>
              </div>
              <div className="flex flex-1 justify-end">
                <Button variant="danger" size="sm">
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </Page>
  );
}
