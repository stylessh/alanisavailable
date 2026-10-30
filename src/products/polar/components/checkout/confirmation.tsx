"use client";

import { useState } from "react";
import {
  CheckIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  DownloadIcon,
  KeyIcon,
  PlusIcon,
  PolarLogo,
  ShieldCheckIcon,
  XIcon,
} from "../icons";
import { Avatar } from "../ui/avatar";
import { Button, IconButton } from "../ui/button";
import { CopyInput, Input } from "../ui/field";
import { Skeleton } from "../ui/feedback";
import { Modal } from "../ui/overlay";
import { Code } from "../ui/status";
import { Frame, PoweredBy } from "./bits";
import { SEATS, SELLER, setScenario, type Pricing, type Scenario } from "./scenario";

// After the button: CheckoutConfirmation (processing, needs action, failed,
// succeeded with its benefits and seat invitations), the expired page Polar
// doesn't draw yet (it 404s), and Stripe's 3-D Secure challenge.

/**
 * A page of its own on the shell, the full height of the view: the seller at
 * the top, the news centred in what's left, and "Powered by Polar" pinned to
 * the foot, centred on the page rather than trailing the content.
 */
function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center px-4">
      <span className="flex shrink-0 items-center gap-2 pt-8 text-sm leading-5 text-(--pl-text) @3xl:pt-10">
        <Avatar name={SELLER.name} size={24} />
        {SELLER.name}
      </span>
      <div className="flex w-full max-w-[440px] flex-1 flex-col justify-center gap-8 py-12">{children}</div>
      <div className="shrink-0 pb-8">
        <PoweredBy />
      </div>
    </div>
  );
}

/**
 * Polar's mark as the loader: drawn faint, with a sheen sweeping across it
 * (pl-sheen in styles.css), on a raised disc. It waits on Polar, so it says
 * so, where a generic spinner wouldn't.
 */
function PolarLoader() {
  return (
    <span role="status" aria-label="Loading" className="relative flex size-14 items-center justify-center rounded-(--pl-radius-full) bg-(--pl-surface) shadow-(--pl-shadow-sm)">
      <PolarLogo size={32} className="text-(--pl-text-faint)" />
      <PolarLogo size={32} className="pl-sheen absolute text-(--pl-text)" />
    </span>
  );
}

/** What's being paid for, and with what: the same rows on every page after the button */
function Recap({ s, p }: { s: Scenario; p: Pricing }) {
  const rows: [string, React.ReactNode][] = [
    [p.product.name, p.dueToday ? `${p.dueToday} today, then ${p.trial?.then}` : p.total.amount],
    ["Paying with", s.payment === "wallet" ? "Apple Pay" : "Visa •••• 4242"],
    ["Receipt to", "maya.lin@example.com"],
  ];
  return (
    <Frame>
      <dl className="flex flex-col">
        {rows.map(([label, value], i) => (
          <div
            key={label}
            className={`flex items-baseline justify-between gap-4 px-4 py-3 text-sm leading-5 ${i ? "shadow-[inset_0_0.5px_0_var(--pl-hairline)]" : ""}`}
          >
            <dt className="text-(--pl-text-secondary)">{label}</dt>
            <dd className="text-right text-(--pl-text) tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </Frame>
  );
}

/** Where the order is: done steps ticked, the current one breathing, the rest waiting */
function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-col gap-3 px-1">
      {steps.map((step, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li key={step} className="flex items-center gap-3 text-sm leading-5">
            <span className="flex size-5 shrink-0 items-center justify-center">
              {done ? (
                <span className="flex size-5 items-center justify-center rounded-(--pl-radius-full) bg-(--pl-text) text-(--pl-primary-fg)">
                  <CheckIcon size={12} strokeWidth={3} />
                </span>
              ) : now ? (
                <span className="relative flex size-2.5">
                  <span className="pl-ping absolute inset-0 rounded-(--pl-radius-full) bg-(--pl-text-muted)" />
                  <span className="relative size-2.5 rounded-(--pl-radius-full) bg-(--pl-text)" />
                </span>
              ) : (
                <span className="size-2.5 rounded-(--pl-radius-full) border border-(--pl-rule)" />
              )}
            </span>
            <span className={done ? "text-(--pl-text-secondary)" : now ? "font-medium text-(--pl-text)" : "text-(--pl-text-faint)"}>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Heading({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="flex size-12 items-center justify-center rounded-(--pl-radius-full) bg-(--pl-surface) shadow-(--pl-shadow-sm)">
        {icon}
      </span>
      <h1 className="text-xl leading-7 font-medium text-balance text-(--pl-text)">{title}</h1>
      <p className="max-w-[360px] text-sm leading-5 text-pretty text-(--pl-text-muted)">{children}</p>
    </div>
  );
}

/** One benefit's row: its glyph, what it is, and its action */
function Benefit({
  icon,
  title,
  detail,
  first,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  first?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-3 px-4 py-4 ${first ? "" : "shadow-[inset_0_0.5px_0_var(--pl-hairline)]"}`}>
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-(--pl-radius-sm) bg-(--pl-subtle) text-(--pl-text-secondary)">
          {icon}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm leading-5 font-medium text-(--pl-text)">{title}</span>
          <span className="text-xs leading-4 text-(--pl-text-muted)">{detail}</span>
        </span>
      </div>
      {/* its action lines up with the text, past the 32px glyph and its 12px gap */}
      {children && <div className="flex flex-col pl-11">{children}</div>}
    </div>
  );
}

const GitHubGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
    <path d="M8 0a8 8 0 0 0-2.5 15.6c.4 0 .5-.2.5-.4v-1.5c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.3 1.9.9 2.3.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-4 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8a7.5 7.5 0 0 1 4 0c1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.1 0 3.1-1.9 3.7-3.6 3.9.3.3.5.8.5 1.5v2.2c0 .2.1.5.6.4A8 8 0 0 0 8 0Z" />
  </svg>
);

/** CheckoutBenefits: granted ones with their action, or skeletons while they're being granted */
function Benefits({ granting }: { granting: boolean }) {
  return (
    <Frame
      title="Your benefits"
      end={
        granting ? (
          <span className="flex items-center gap-2 text-xs leading-4 text-(--pl-text-muted)">
            <span className="relative flex">
              <PolarLogo size={14} className="text-(--pl-text-faint)" />
              <PolarLogo size={14} className="pl-sheen absolute inset-0 text-(--pl-text)" />
            </span>
            Granting benefits...
          </span>
        ) : undefined
      }
    >
      {granting ? (
        <div className="flex flex-col">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-4 ${i ? "shadow-[inset_0_0.5px_0_var(--pl-hairline)]" : ""}`}>
              <Skeleton width={32} height={32} radius={8} />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton width="45%" height={12} radius={4} />
                <Skeleton width="70%" height={10} radius={4} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          <Benefit first icon={<KeyIcon />} title="License key" detail="Activate Acme on up to 3 machines">
            <CopyInput label="License key" value="ACME-7F3K-Q9DM-2LXP-H4RT" />
          </Benefit>
          <Benefit icon={<DownloadIcon />} title="Acme for macOS" detail="acme-2.4.0-universal.dmg · 48 MB">
            <Button variant="secondary" size="sm" className="self-start" icon={<DownloadIcon size={14} />}>
              Download
            </Button>
          </Benefit>
          <Benefit icon={<GitHubGlyph />} title="Private repository" detail="Read access to acme/recipes on GitHub">
            <Button variant="secondary" size="sm" className="self-start">
              Connect GitHub account
            </Button>
          </Benefit>
        </div>
      )}
    </Frame>
  );
}

/** CheckoutSeatInvitations: the buyer holds one seat; the rest can go to teammates now or later */
function SeatInvitations() {
  const remaining = SEATS.initial - 1;
  const [emails, setEmails] = useState(["sam@linstudio.example", ""]);
  return (
    <Frame title="Invite your team" end={<span className="text-xs leading-4 text-(--pl-text-muted)">{remaining} seats left</span>}>
      <div className="flex flex-col gap-3 p-4">
        <p className="text-sm leading-5 text-(--pl-text-secondary)">
          You&apos;ve claimed your seat. Invite up to {remaining} more team members to the remaining seats. You can always manage this later
          through the Customer Portal.
        </p>
        {emails.map((email, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              type="email"
              aria-label={`Teammate ${i + 1} email`}
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmails(emails.map((v, j) => (j === i ? e.target.value : v)))}
            />
            <IconButton size={32} label="Remove" disabled={emails.length === 1} onClick={() => setEmails(emails.filter((_, j) => j !== i))}>
              <XIcon size={14} />
            </IconButton>
          </div>
        ))}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2"
            icon={<PlusIcon size={14} />}
            disabled={emails.length >= remaining}
            onClick={() => setEmails([...emails, ""])}
          >
            Add another
          </Button>
          <Button size="sm" disabled={!emails.some((e) => e.includes("@"))}>
            Send invitations
          </Button>
        </div>
      </div>
    </Frame>
  );
}

const MOR =
  "This order is processed by our online reseller & Merchant of Record, Polar, who also handles order-related inquiries and returns.";

export function Confirmation({ s, p }: { s: Scenario; p: Pricing }) {
  const [confirming, setConfirming] = useState(false);
  // Failed: what happened, that nothing was charged, and the ways forward,
  // with a reference to quote to support
  if (s.step === "failed")
    return (
      <Centered>
        <Heading icon={<CircleAlertIcon size={20} className="text-(--pl-danger)" />} title="Your order didn't go through">
          A problem occurred while processing it, and nothing was charged. Your details are still filled in.
        </Heading>
        <Frame
          title="What you can do"
          footer={
            <p className="text-xs leading-4 text-(--pl-text-muted)">
              Still stuck? Contact {SELLER.name} and quote <Code>ACM-48213</Code>
            </p>
          }
        >
          <div className="flex flex-col">
            {[
              ["Try again", "Most failures are momentary. The same card often works a minute later."],
              ["Use another payment method", "A different card, Link or Apple Pay."],
            ].map(([title, detail], i) => (
              <div key={title} className={`flex flex-col gap-0.5 px-4 py-3 ${i ? "shadow-[inset_0_0.5px_0_var(--pl-hairline)]" : ""}`}>
                <span className="text-sm leading-5 font-medium text-(--pl-text)">{title}</span>
                <span className="text-xs leading-4 text-(--pl-text-muted)">{detail}</span>
              </div>
            ))}
          </div>
        </Frame>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="lg" onClick={() => setScenario({ step: "ready", payment: "card" })}>
            Another method
          </Button>
          <Button size="lg" onClick={() => setScenario({ step: "ready" })}>
            Try again
          </Button>
        </div>
      </Centered>
    );
  // Needs action: the bank holds the payment until the buyer confirms it,
  // so the page leads with what's being confirmed and the one button
  if (s.step === "confirm-action")
    return (
      <Centered>
        <Heading icon={<ShieldCheckIcon size={20} className="text-(--pl-text)" />} title="Confirm your payment">
          Your bank wants to verify this payment before it goes through. It opens a short check of its own.
        </Heading>
        <Recap s={s} p={p} />
        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            fullWidth
            loading={confirming}
            onClick={() => {
              setConfirming(true);
              setScenario({ step: "3ds" });
            }}
          >
            Confirm payment
          </Button>
          <p className="text-center text-xs leading-4 text-(--pl-text-muted)">Nothing is charged until your bank approves it.</p>
        </div>
      </Centered>
    );
  // Confirming: Polar's mark while it waits, and where the order has got to
  if (s.step === "confirming")
    return (
      <Centered>
        <div className="flex flex-col items-center gap-3 text-center">
          <PolarLoader />
          <h1 className="text-xl leading-7 font-medium text-balance text-(--pl-text)">We are processing your order</h1>
          <p className="max-w-[360px] text-sm leading-5 text-pretty text-(--pl-text-muted)">
            Please wait while we confirm your payment. This page updates on its own.
          </p>
        </div>
        <Frame
          footer={
            <p className="text-xs leading-4 text-(--pl-text-muted)">
              You can close this page: the receipt and your access go to maya.lin@example.com either way.
            </p>
          }
        >
          <div className="px-4 py-4">
            <Steps steps={["Payment submitted", "Confirming with your bank", `Granting access to ${p.product.name}`]} current={1} />
          </div>
        </Frame>
      </Centered>
    );
  const granting = s.step === "granting";
  return (
    <Centered>
      <Heading icon={<CircleCheckIcon size={20} className="text-(--pl-success)" />} title="Thank you for your order!">
        You now have access to {p.product.name}. A receipt is on its way to maya.lin@example.com.
      </Heading>
      <Benefits granting={granting} />
      {s.offer === "seats" && !granting && <SeatInvitations />}
      <p className="text-center text-xs leading-[1.6] text-pretty text-(--pl-text-muted)">{MOR}</p>
    </Centered>
  );
}

export function Expired() {
  return (
    <Centered>
      <Heading
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden className="text-(--pl-text-muted)">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        }
        title="This checkout has expired"
      >
        Checkout sessions last 24 hours, and nothing was charged. Start again from {SELLER.name}&apos;s pricing page to get a fresh one.
      </Heading>
      <div className="flex justify-center">
        <Button variant="secondary" onClick={() => setScenario({ step: "ready" })}>
          Return to {SELLER.name}
        </Button>
      </div>
    </Centered>
  );
}

/** Stripe's 3-D Secure test challenge, as a modal over the processing checkout */
export function ThreeDSecure({ p, open }: { p: Pricing; open: boolean }) {
  return (
    <Modal open={open} onClose={() => setScenario({ step: "3ds-failed" })} title="3-D Secure" className="lg:w-[440px]!">
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm leading-5 font-semibold tracking-[0.04em] text-(--pl-text)">ACME BANK</span>
          <span className="rounded-(--pl-radius-xs) bg-(--pl-subtle) px-1.5 py-0.5 text-[10px] leading-4 font-medium text-(--pl-text-muted)">
            TEST MODE
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-lg leading-6 font-medium text-(--pl-text)">Confirm it&apos;s you</h2>
          <p className="text-sm leading-5 text-(--pl-text-muted)">
            Approve the payment of {p.trial ? "$0.00 to save your card for" : <span className="text-(--pl-text)">{p.total.amount}</span>}{" "}
            {p.trial ? "" : "to"} Polar (for {SELLER.name}) with Visa •••• 4242.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button size="lg" fullWidth onClick={() => setScenario({ step: "confirming" })}>
            Complete authentication
          </Button>
          <Button variant="secondary" size="lg" fullWidth onClick={() => setScenario({ step: "3ds-failed" })}>
            Fail authentication
          </Button>
        </div>
      </div>
    </Modal>
  );
}
