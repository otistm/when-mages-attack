/**
 * Loading Screen - Displayed while assets load
 */

export function LoadingScreen() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-arcane-dark">
      <div className="relative" style={{ width: 'clamp(3rem, 5vw, 4rem)', height: 'clamp(3rem, 5vw, 4rem)' }}>
        {/* Animated loader */}
        <div className="w-full h-full border-4 border-arcane-purple rounded-full animate-spin border-t-arcane-gold" />
        
        {/* Inner glow */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1/2 h-1/2 bg-arcane-gold/20 rounded-full animate-pulse" />
        </div>
      </div>
      
      <p className="text-arcane-gold font-display text-game-subheading animate-pulse" style={{ marginTop: 'var(--space-lg)' }}>
        Preparing the Arena...
      </p>
    </div>
  );
}

export default LoadingScreen;
