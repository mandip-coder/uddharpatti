import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white">
      <h1 className="text-6xl font-extrabold tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-emerald-400">
        Uddhar Patti
      </h1>
      <p className="text-xl text-slate-400 mb-8 max-w-lg text-center">
        The ultimate social card game where trust is currency. Play Teen Patti, lend coins, and request Udhaar from friends.
      </p>

      <div className="flex gap-4">
        <Link href="/login" className="btn-primary transform hover:scale-105 transition-transform text-lg px-8 py-3">
          Play Now
        </Link>
        <Link href="/signup" className="btn-secondary transform hover:scale-105 transition-transform text-lg px-8 py-3">
          Join Free
        </Link>
      </div>
    </div>
  );
}
