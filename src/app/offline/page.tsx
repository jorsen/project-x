import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <WifiOff className="h-6 w-6 text-slate-400" />
      </div>
      <h1 className="text-lg font-semibold text-slate-900">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-slate-500">
        This app needs a connection to load or save data. Check your connection and try again.
      </p>
    </div>
  );
}
