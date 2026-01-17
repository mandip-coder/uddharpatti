import { Card } from '../ui/Card';
import Link from 'next/link';

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Udhaar Action */}
      <Link href="/debt">
        <Card className="p-4 flex flex-col items-center gap-3 hover:border-violet-500/50 transition-colors cursor-pointer group h-full">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            💸
          </div>
          <div className="text-center">
            <h4 className="font-bold text-white text-sm">Udhaar</h4>
            <p className="text-slate-400 text-xs">Request or Repay</p>
          </div>
        </Card>
      </Link>

      {/* Friends Action */}
      <Link href="/friends">
        <Card className="p-4 flex flex-col items-center gap-3 hover:border-emerald-500/50 transition-colors cursor-pointer group h-full">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            👥
          </div>
          <div className="text-center">
            <h4 className="font-bold text-white text-sm">Friends</h4>
            <p className="text-slate-400 text-xs">Manage connections</p>
          </div>
        </Card>
      </Link>
    </div>
  );
}
