import { useEffect, useState, type FormEvent } from "react";
import { Alert, Badge, Button, Label, Spinner } from "flowbite-react";
import { adminApi } from "@/api/admin";
import { getErrorMessage } from "@/api";
import { Pagination } from "@/components/Pagination";
import { useAuth } from "@/context/AuthContext";
import type { Role, User } from "@/api/types";

const inputClasses = [
  "w-full rounded-[10px] border bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900",
  "outline-none transition-colors duration-200",
  "border-slate-300 placeholder:text-slate-400 focus:border-sky-500",
  "dark:border-white/10 dark:bg-white/[0.03] dark:text-white",
  "dark:placeholder:text-slate-500 dark:focus:border-sky-400",
].join(" ");

const emptyForm = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  password_confirmation: "",
  role_id: "",
};

export function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role?.title === "admin";

  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState({ currentPage: 1, lastPage: 1, total: 0 });

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [refreshToken, setRefreshToken] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  const [roleDrafts, setRoleDrafts] = useState<Record<number, number>>({});
  const [savingRoleId, setSavingRoleId] = useState<number | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;

    (async () => {
      try {
        const { data } = await adminApi.roles();
        if (active) setRoles(data);
      } catch (err) {
        if (active) setError(getErrorMessage(err, "Could not load roles."));
      }
    })();

    return () => {
      active = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await adminApi.users({ q: q || undefined, page });
        if (!active) return;
        setUsers(data.data);
        setMeta({
          currentPage: data.meta.current_page,
          lastPage: data.meta.last_page,
          total: data.meta.total,
        });
        setRoleDrafts({});
      } catch (err) {
        if (!active) return;
        setUsers([]);
        setError(getErrorMessage(err, "Could not load users."));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isAdmin, q, page, refreshToken]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setQ(qInput.trim());
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");

    if (!form.role_id) {
      setFormError("Pick a role for the new account.");
      return;
    }

    setCreating(true);
    try {
      await adminApi.createUser({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        password: form.password,
        password_confirmation: form.password_confirmation,
        role_id: Number(form.role_id),
      });
      setNotice("User created.");
      setForm(emptyForm);
      setShowForm(false);
      setPage(1);
      setRefreshToken((token) => token + 1);
    } catch (err) {
      setFormError(getErrorMessage(err, "Could not create the user."));
    } finally {
      setCreating(false);
    }
  };

  const handleSaveRole = async (target: User) => {
    const roleId = roleDrafts[target.id];
    if (!roleId) return;

    setSavingRoleId(target.id);
    setError("");
    try {
      const { data } = await adminApi.updateRole(target.id, roleId);
      setUsers((current) => current.map((item) => (item.id === data.id ? data : item)));
      setRoleDrafts((current) => {
        const next = { ...current };
        delete next[target.id];
        return next;
      });
      setNotice(`${target.username ?? "User"}'s role was updated.`);
    } catch (err) {
      setError(getErrorMessage(err, "Could not update the role."));
    } finally {
      setSavingRoleId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex w-full justify-center py-12">
        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
          <Spinner size="sm" />
          Checking your session…
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="w-full max-w-xl py-12">
        <Alert color="failure">
          You do not have permission to manage users. This page is only
          available to administrators.
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">
            User management
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            Create teacher accounts and adjust the role of an existing account.
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm((open) => !open);
            setFormError("");
          }}
          className="bg-sky-600 enabled:hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:enabled:hover:bg-sky-300"
        >
          {showForm ? "Close form" : "New user"}
        </Button>
      </div>

      {notice && (
        <Alert color="success" className="mb-4" onDismiss={() => setNotice("")}>
          {notice}
        </Alert>
      )}

      {error && (
        <Alert color="failure" className="mb-4">
          {error}
        </Alert>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="glass-moon mb-8 p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
            New user
          </h2>

          {formError && (
            <Alert color="failure" className="mb-4">
              {formError}
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="new-first-name" className="mb-2">
                First name
              </Label>
              <input
                id="new-first-name"
                required
                autoComplete="off"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className={inputClasses}
              />
            </div>

            <div>
              <Label htmlFor="new-last-name" className="mb-2">
                Last name
              </Label>
              <input
                id="new-last-name"
                required
                autoComplete="off"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className={inputClasses}
              />
            </div>

            <div>
              <Label htmlFor="new-email" className="mb-2">
                Email
              </Label>
              <input
                id="new-email"
                type="email"
                required
                autoComplete="off"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClasses}
              />
            </div>

            <div>
              <Label htmlFor="new-role" className="mb-2">
                Role
              </Label>
              <select
                id="new-role"
                required
                value={form.role_id}
                onChange={(e) => setForm({ ...form, role_id: e.target.value })}
                className={inputClasses}
              >
                <option value="">Select a role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="new-password" className="mb-2">
                Password
              </Label>
              <input
                id="new-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={inputClasses}
              />
            </div>

            <div>
              <Label htmlFor="new-password-confirmation" className="mb-2">
                Confirm password
              </Label>
              <input
                id="new-password-confirmation"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password_confirmation}
                onChange={(e) =>
                  setForm({ ...form, password_confirmation: e.target.value })
                }
                className={inputClasses}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={creating}
            className="mt-5 bg-sky-600 enabled:hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:enabled:hover:bg-sky-300"
          >
            {creating ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Creating…
              </>
            ) : (
              "Create user"
            )}
          </Button>
        </form>
      )}

      <form onSubmit={handleSearch} role="search" className="mb-4 flex gap-2">
        <label htmlFor="admin-user-search" className="sr-only">
          Search users
        </label>
        <input
          id="admin-user-search"
          type="search"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Search by name, username or email…"
          className={inputClasses}
        />
        <Button type="submit" color="light">
          Search
        </Button>
        {q && (
          <Button
            type="button"
            color="light"
            onClick={() => {
              setQInput("");
              setQ("");
              setPage(1);
            }}
          >
            Clear
          </Button>
        )}
      </form>

      <div className="glass-moon overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-slate-400">
            <tr>
              <th scope="col" className="px-5 py-3">
                User
              </th>
              <th scope="col" className="px-5 py-3">
                Email
              </th>
              <th scope="col" className="px-5 py-3">
                Role
              </th>
              <th scope="col" className="px-5 py-3">
                Joined
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-5 py-8">
                  <div className="flex items-center justify-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                    <Spinner size="sm" />
                    Loading users…
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-8 text-center text-sm text-slate-600 dark:text-slate-400"
                >
                  {q
                    ? "No users match that search."
                    : "There are no users to show."}
                </td>
              </tr>
            ) : (
              users.map((item) => {
                const isSelf = item.id === user?.id;
                const draftRole = roleDrafts[item.id];
                const changed =
                  draftRole !== undefined && draftRole !== (item.role_id ?? undefined);

                return (
                  <tr key={item.id}>
                    <td className="px-5 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {item.name || item.username || "—"}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          @{item.username}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-700 dark:text-slate-300">
                          {item.email}
                        </span>
                        {item.email_verified_at ? (
                          <Badge color="success" size="sm" className="w-fit">
                            Verified
                          </Badge>
                        ) : (
                          <Badge color="warning" size="sm" className="w-fit">
                            Unverified
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          aria-label={`Role for ${item.username ?? item.id}`}
                          value={draftRole ?? item.role_id ?? ""}
                          disabled={isSelf || savingRoleId === item.id}
                          onChange={(e) =>
                            setRoleDrafts({
                              ...roleDrafts,
                              [item.id]: Number(e.target.value),
                            })
                          }
                          className={`${inputClasses} w-36 py-2`}
                        >
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.title}
                            </option>
                          ))}
                        </select>
                        {isSelf ? (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Your account
                          </span>
                        ) : (
                          <Button
                            size="xs"
                            color="light"
                            disabled={!changed || savingRoleId === item.id}
                            onClick={() => handleSaveRole(item)}
                          >
                            {savingRoleId === item.id ? "Saving…" : "Save"}
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {meta.total} {meta.total === 1 ? "user" : "users"}
          {q && " matching your search"}
        </p>
        <Pagination
          currentPage={meta.currentPage}
          lastPage={meta.lastPage}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
