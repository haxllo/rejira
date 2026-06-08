import { LoaderIcon } from '@/components/icons';

export default function VerifyEmailLoading() {
  return (
    <>
      <h1 className="auth-title">Email verification</h1>
      <div className="auth-state" role="status" aria-live="polite">
        <div className="auth-state-icon auth-state-icon--neutral">
          <LoaderIcon size={20} className="auth-spinner" />
        </div>
        <h2 className="auth-state-title">Preparing your link</h2>
        <p className="auth-state-description">Just a moment…</p>
        <div className="auth-skeleton-stack mt-4 w-full">
          <div className="auth-skeleton h-10" />
          <div className="auth-skeleton h-10" />
          <div className="auth-skeleton h-10 w-2/3" />
        </div>
      </div>
    </>
  );
}
