// starfield.js
// This script creates a high-performance, animated starfield on a canvas.

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.createElement('canvas');
  canvas.id = 'starfield';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  let width, height;
  let stars = [];

  // Star properties
  const STAR_COUNT = 400;
  const STAR_COLORS = ['#ffffff', '#e2e8f0', '#a5b4fc', '#fbcfe8'];
  const STAR_SPEED = 0.2; // Pixels per frame

  function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    createStars();
  }

  function createStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.5, // Small to medium stars
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        speed: Math.random() * STAR_SPEED + 0.05,
        twinkle: Math.random() * 0.5 + 0.5, // For twinkling effect
      });
    }
  }

  function animate() {
    // Clear the canvas with a semi-transparent black to create a "trail" effect
    ctx.fillStyle = 'rgba(5, 5, 16, 0.2)';
    ctx.fillRect(0, 0, width, height);

    stars.forEach(star => {
      // Draw the star
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      // Use globalAlpha to create a twinkling effect
      ctx.fillStyle = star.color;
      ctx.globalAlpha = star.twinkle;
      ctx.fill();

      // Move the star downwards (or any direction for a "warp" effect)
      star.y += star.speed;

      // Reset star to the top if it goes off-screen
      if (star.y > height) {
        star.y = 0;
        star.x = Math.random() * width;
      }
    });

    // Reset globalAlpha for the next frame
    ctx.globalAlpha = 1.0;

    requestAnimationFrame(animate);
  }

  // Initial setup
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  animate();
});
