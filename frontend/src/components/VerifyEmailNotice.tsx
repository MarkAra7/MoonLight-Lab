import { Link } from "react-router-dom";
import { Alert } from "flowbite-react";
import { useAuth } from "@/context/AuthContext";

export function VerifyEmailNotice({ className = "" }: { className?: string }) {
  const { user } = useAuth();

  if (!user || user.email_verified_at) return null;

  return (
    <Alert color="warning" className={className}>
      <span className="font-bold">Verify your email to create content.</span>{" "}
      We sent a verification link to{" "}
      <span className="font-semibold">{user.email}</span>. Open it from your
      inbox, or{" "}
      <Link to="/settings" className="font-bold underline">
        request a new link
      </Link>
      .
    </Alert>
  );
}
