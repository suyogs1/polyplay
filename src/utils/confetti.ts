// Simple confetti animation without external dependencies

export function triggerConfetti() {
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd'];
  const confettiCount = 50;
  
  for (let i = 0; i < confettiCount; i++) {
    createConfettiPiece(colors[Math.floor(Math.random() * colors.length)]);
  }
}

function createConfettiPiece(color: string) {
  const confetti = document.createElement('div');
  confetti.style.position = 'fixed';
  confetti.style.width = '10px';
  confetti.style.height = '10px';
  confetti.style.backgroundColor = color;
  confetti.style.left = Math.random() * 100 + 'vw';
  confetti.style.top = '-10px';
  confetti.style.zIndex = '9999';
  confetti.style.pointerEvents = 'none';
  confetti.style.borderRadius = '50%';
  
  document.body.appendChild(confetti);
  
  const animation = confetti.animate([
    {
      transform: `translateY(0) rotate(0deg)`,
      opacity: 1
    },
    {
      transform: `translateY(100vh) rotate(720deg)`,
      opacity: 0
    }
  ], {
    duration: 3000 + Math.random() * 2000,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
  });
  
  animation.onfinish = () => {
    confetti.remove();
  };
}