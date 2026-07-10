"use client";

import { useEffect, useState } from "react";

// Live clock + date in the ADMIN's timezone (phase 4.8 A4 / C1). The tz comes
// from the admin's presence (device timezone, written by the app on launch);
// falls back to Europe/Paris. Renders nothing until mounted to avoid an SSR /
// client mismatch on the minute value.
export default function HeaderClock({ tz }: { tz: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <div className="qr-clock" aria-hidden />;

  let time = "";
  let date = "";
  try {
    time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(now);
    date = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: tz }).format(now);
  } catch {
    time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(now);
    date = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(now);
  }

  return (
    <div className="qr-clock" title={tz}>
      <span className="qr-clock__time">{time}</span>
      <span className="qr-clock__date">{date}</span>
    </div>
  );
}
