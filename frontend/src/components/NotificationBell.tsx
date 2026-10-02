import { useCallback, useEffect, useState } from "react";
import { Dropdown, DropdownDivider, DropdownHeader, DropdownItem } from "flowbite-react";
import { miscApi, type NotificationItem } from "@/api/misc";

const timeFormat: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

const panelClasses =
  "block w-[22rem] max-w-[80vw] bg-slate-800/95 py-1 text-sm text-slate-200";

function relativeTime(value?: string): string {
  if (!value) return "";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "";

  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat("en-US", timeFormat).format(new Date(timestamp));
}

export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadCount = useCallback(async () => {
    try {
      const { data } = await miscApi.unreadCount();
      setUnread(data.count ?? 0);
    } catch (err) {
      console.error("Failed to load unread notification count:", err);
      setUnread(0);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const { data } = await miscApi.notifications();
      setItems(data);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setItems([]);
    }
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const { data } = await miscApi.unreadCount();
        if (active) setUnread(data.count ?? 0);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load unread notification count:", err);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleOpen = useCallback(async () => {
    await loadCount();
    await loadNotifications();
    setLoaded(true);
  }, [loadCount, loadNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await miscApi.markAllRead();
      setItems((current) => current.map((item) => ({ ...item, is_read: true })));
      setUnread(0);
    } catch (err) {
      console.error("Failed to mark notifications as read:", err);
    }
  }, []);

  return (
    <Dropdown
      inline
      arrowIcon={false}
      placement="bottom-end"
      renderTrigger={() => (
        <button
          type="button"
          onClick={() => {
            void handleOpen();
          }}
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          className="relative flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:text-sky-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:text-slate-400 dark:hover:text-sky-400 dark:focus-visible:ring-sky-400 dark:focus-visible:ring-offset-[#020617]"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-600 px-1 text-[10px] font-black text-white dark:bg-sky-400 dark:text-slate-900">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      )}
    >
      <DropdownHeader className={panelClasses}>
        <span className="block text-sm font-semibold text-white">Notifications</span>
      </DropdownHeader>

      <div className={panelClasses}>
        {!loaded ? (
          <p className="px-3.5 py-4 text-sm font-medium text-slate-400">Loading…</p>
        ) : items.length === 0 ? (
          <p className="px-3.5 py-4 text-sm font-medium text-slate-400">
            You have no notifications.
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {items.map((item) => (
              <li
                key={item.id}
                className={`border-l-2 px-3.5 py-3 ${
                  item.is_read
                    ? "border-transparent"
                    : "border-sky-500 bg-white/[0.04]"
                }`}
              >
                <p className="text-sm font-semibold text-white">{item.title}</p>
                {item.body && (
                  <p className="mt-0.5 text-xs font-medium text-slate-400">{item.body}</p>
                )}
                {item.created_at && (
                  <p className="mt-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                    {relativeTime(item.created_at)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <DropdownDivider />
      <DropdownItem onClick={() => void handleMarkAllRead()} disabled={unread === 0}>
        Mark all as read
      </DropdownItem>
    </Dropdown>
  );
}