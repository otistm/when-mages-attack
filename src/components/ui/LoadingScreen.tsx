/**
 * Loading Screen - Displayed while assets load
 */

export function LoadingScreen() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-arcane-dark">
      <div className="relative">
        {/* Animated loader */}
        <div className="w-16 h-16 border-4 border-arcane-purple rounded-full animate-spin border-t-arcane-gold" />
        
        {/* Inner glow */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 bg-arcane-gold/20 rounded-full animate-pulse" />
        </div>
      </div>
      
      <p className="mt-6 text-arcane-gold font-display text-xl animate-pulse">
        Preparing the Arena...
      </p>
    </div>
  );
}

export default LoadingScreen;
