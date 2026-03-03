export default function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950">
      <div className="text-center">
        <img src="/logo.png" alt="Proof Bunker" className="w-40 h-40 object-contain mx-auto mb-6 opacity-90" />
        <div className="inline-block w-6 h-6 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}
