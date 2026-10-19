"use client";

import { useSyncExternalStore } from "react";

// A store that changes on every minute boundary.
function subscribe(onChange: () => void) {
  let interval: number | undefined;
  const timeout = window.setTimeout(
    () => {
      onChange();
      interval = window.setInterval(onChange, 60_000);
    },
    60_000 - (Date.now() % 60_000),
  );
  return () => {
    window.clearTimeout(timeout);
    window.clearInterval(interval);
  };
}

const getMinute = () => Math.floor(Date.now() / 60_000);
const getServerMinute = () => null;

function format(date: Date) {
  const day = date
    .toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    .replace(",", ""); // "Sun Oct 18"
  const time = date
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .replace(/\s/, " "); // "12:28 PM" with a narrow space
  return { day, time };
}

/** Menu bar clock: "Sun Oct 18  12:28 PM", ticking on the minute. */
export function MenuBarClock() {
  const minute = useSyncExternalStore(subscribe, getMinute, getServerMinute);
  if (minute === null) return null;

  const date = new Date(minute * 60_000);
  const { day, time } = format(date);

  return (
    <time dateTime={date.toISOString()} className="whitespace-pre">
      {day}
      <span className="ml-[7.75px]">{time}</span>
    </time>
  );
}
