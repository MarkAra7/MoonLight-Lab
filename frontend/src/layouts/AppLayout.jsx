import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Avatar, Dropdown, DropdownDivider, DropdownHeader, DropdownItem } from "flowbite-react";
import { useAuth } from "@/context/AuthContext";
import { mediaUrl } from "@/utils/helpers";
import { ThemeToggle } from "@/components/ThemeToggle";

const navLinkClass = ({ isActive }) =>
  `text-sm font-semibold no-underline transition-colors ${
    isActive
      ? "text-sky-600 dark:text-sky-400"
      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
  }`;

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-white text-slate-700 dark:bg-moon-dark dark:text-slate-300">
      <header className="sticky top-0 z-20 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-white/5 dark:bg-[#020617]/80">
        <div className="mx-auto flex w-full max-w-[2000px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="text-xl font-extrabold tracking-wide text-slate-900 no-underline dark:text-white"
          >
            MOONLIGHT <span className="text-sky-600 dark:text-sky-400">LAB</span>
          </Link>

          <nav aria-label="Main navigation" className="flex items-center gap-6">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>

            <ThemeToggle />

            {user ? (
              <Dropdown
                inline
                arrowIcon={false}
                placement="bottom-end"
                trigger={
                  <button type="button" className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-[#020617]">
                    {user.avatar?.file_path || user.avatar?.url ? (
                      <Avatar
                        img={mediaUrl(user.avatar.file_path ?? user.avatar.url)}
                        rounded
                        size="sm"
                        className="h-8 w-8"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-600 dark:bg-sky-900/40 dark:text-sky-400">
                        {user.name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                    )}
                    <svg className="h-4 w-4 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                }
              >
                <DropdownHeader>
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white">{user.name || user.username}</span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</span>
                </DropdownHeader>
                <DropdownItem as={Link} to="/profile">
                  Profile
                </DropdownItem>
                <DropdownItem as={Link} to="/my-quizzes">
                  My Quizzes
                </DropdownItem>
                <DropdownItem as={Link} to="/settings">
                  Settings
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem onClick={handleLogout}>
                  Sign out
                </DropdownItem>
              </Dropdown>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>
                  Sign In
                </NavLink>
                <Link
                  to="/register"
                  className="rounded-xl bg-sky-600 px-5 py-2 text-sm font-bold text-white no-underline transition-colors hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:hover:bg-sky-300"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex w-full flex-1 flex-col items-center">
        <div className="flex w-full max-w-[2000px] flex-col items-center px-4 py-12 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>

      <footer className="w-full border-t border-slate-200 bg-slate-50 py-10 dark:border-white/5 dark:bg-black/20">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-5 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10">
              <span className="text-sm font-black text-sky-600 dark:text-sky-400">
                ML
              </span>
            </div>
            <span className="font-black tracking-widest text-slate-900 uppercase dark:text-white">
              MoonLight Lab
            </span>
          </div>
          <p className="text-sm font-medium tracking-wide text-slate-500">
            &copy; {new Date().getFullYear()} MOONLIGHT LAB
          </p>
        </div>
      </footer>
    </div>
  );
}