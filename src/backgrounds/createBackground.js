/**
 * Centralized background creation for all game scenes.
 * Usage: import { createBackground } from "./backgrounds/createBackground.js";
 * Call createBackground(scene, backgroundConfig, levelValue)
 */

// Helper: Convert hex to CSS string
function hexToString(hex) {
  return "#" + hex.toString(16).padStart(6, "0");
}

// Helper: Add enhanced noise
function addEnhancedNoise(ctx, width, height, opacity) {
  for (let x = 0; x < width; x += 3) {
    for (let y = 0; y < height; y += 3) {
      if (Math.random() > 0.95) {
        const alpha = Math.random() * (opacity * 0.3);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

// Easy mode backgrounds by level
function createEasyLevel1(ctx, width, height) {
  // Level 1: Calm Ocean Depths
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#001620");
  gradient.addColorStop(0.3, "#002435");
  gradient.addColorStop(0.7, "#003450");
  gradient.addColorStop(1, "#004565");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Gentle waves
  for (let i = 0; i < 8; i++) {
    const waveGradient = ctx.createLinearGradient(0, 0, width, 0);
    waveGradient.addColorStop(0, `rgba(0, 22, 32, ${0.15 - i * 0.015})`);
    waveGradient.addColorStop(0.5, `rgba(0, 69, 101, ${0.2 - i * 0.015})`);
    waveGradient.addColorStop(1, `rgba(0, 22, 32, ${0.15 - i * 0.015})`);
    ctx.strokeStyle = waveGradient;
    ctx.lineWidth = 2;
    const yOffset = height * (i / 8);
    ctx.beginPath();
    for (let x = 0; x < width; x++) {
      const y = yOffset + Math.sin(x * 0.01 + i) * 20;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Soft glow areas
  const glowPoints = [
    { x: width * 0.2, y: height * 0.3, size: 200 },
    { x: width * 0.8, y: height * 0.4, size: 180 },
    { x: width * 0.3, y: height * 0.7, size: 220 }
  ];
  glowPoints.forEach(point => {
    const glow = ctx.createRadialGradient(
      point.x, point.y, 0,
      point.x, point.y, point.size
    );
    glow.addColorStop(0, 'rgba(0, 229, 255, 0.12)');
    glow.addColorStop(0.5, 'rgba(0, 69, 101, 0.06)');
    glow.addColorStop(1, 'rgba(0, 22, 32, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function createEasyLevel2(ctx, width, height) {
  // Level 2: Ethereal Currents
  const centerX = width / 2;
  const centerY = height / 2;
  const baseGradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, Math.max(width, height)
  );
  baseGradient.addColorStop(0, "#002435");
  baseGradient.addColorStop(0.4, "#003450");
  baseGradient.addColorStop(0.7, "#004565");
  baseGradient.addColorStop(1, "#001620");
  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, 0, width, height);

  // Currents
  const radius = Math.min(width, height) * 0.4;
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12;
    const curve = new Path2D();
    curve.moveTo(centerX, centerY);
    curve.quadraticCurveTo(
      centerX + Math.cos(angle) * radius * 0.5,
      centerY + Math.sin(angle) * radius * 0.5,
      centerX + Math.cos(angle) * radius,
      centerY + Math.sin(angle) * radius
    );
    const currentGradient = ctx.createLinearGradient(
      centerX, centerY,
      centerX + Math.cos(angle) * radius,
      centerY + Math.sin(angle) * radius
    );
    currentGradient.addColorStop(0, 'rgba(0, 229, 255, 0.15)');
    currentGradient.addColorStop(1, 'rgba(0, 69, 101, 0)');
    ctx.strokeStyle = currentGradient;
    ctx.lineWidth = 15;
    ctx.stroke(curve);
  }

  // Orbs
  for (let i = 0; i < 5; i++) {
    const x = centerX + Math.cos(i * Math.PI * 0.4) * radius * 0.6;
    const y = centerY + Math.sin(i * Math.PI * 0.4) * radius * 0.6;
    const orbGradient = ctx.createRadialGradient(x, y, 0, x, y, 80);
    orbGradient.addColorStop(0, 'rgba(0, 255, 255, 0.18)');
    orbGradient.addColorStop(0.5, 'rgba(0, 229, 255, 0.12)');
    orbGradient.addColorStop(1, 'rgba(0, 69, 101, 0)');
    ctx.fillStyle = orbGradient;
    ctx.beginPath();
    ctx.arc(x, y, 80, 0, Math.PI * 2);
    ctx.fill();
  }
}

function createEasyLevel3(ctx, width, height) {
  // Level 3: Luminous Depths
  const centerX = width / 2;
  const centerY = height / 2;
  if (ctx.createConicGradient) {
    const baseGradient = ctx.createConicGradient(0, centerX, centerY);
    baseGradient.addColorStop(0, "#001620");
    baseGradient.addColorStop(0.25, "#002435");
    baseGradient.addColorStop(0.5, "#003450");
    baseGradient.addColorStop(0.75, "#004565");
    baseGradient.addColorStop(1, "#001620");
    ctx.fillStyle = baseGradient;
  } else {
    // Fallback for browsers without createConicGradient
    ctx.fillStyle = "#001620";
  }
  ctx.fillRect(0, 0, width, height);

  // Luminous rings
  for (let i = 0; i < 4; i++) {
    const ringGradient = ctx.createRadialGradient(
      centerX, centerY, Math.max(width, height) * (i * 0.2),
      centerX, centerY, Math.max(width, height) * (i * 0.2 + 0.15)
    );
    ringGradient.addColorStop(0, `rgba(0, 229, 255, ${0.15 - i * 0.025})`);
    ringGradient.addColorStop(0.5, `rgba(0, 69, 101, ${0.12 - i * 0.025})`);
    ringGradient.addColorStop(1, 'rgba(0, 22, 32, 0)');
    ctx.fillStyle = ringGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, Math.max(width, height) * (i * 0.2 + 0.15), 0, Math.PI * 2);
    ctx.fill();
  }

  // Luminous paths
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    const path = new Path2D();
    path.moveTo(centerX, centerY);
    path.lineTo(
      centerX + Math.cos(angle) * width,
      centerY + Math.sin(angle) * height
    );
    const pathGradient = ctx.createLinearGradient(
      centerX, centerY,
      centerX + Math.cos(angle) * width * 0.5,
      centerY + Math.sin(angle) * height * 0.5
    );
    pathGradient.addColorStop(0, 'rgba(0, 255, 255, 0.12)');
    pathGradient.addColorStop(1, 'rgba(0, 69, 101, 0)');
    ctx.strokeStyle = pathGradient;
    ctx.lineWidth = 10;
    ctx.stroke(path);
  }
}

// Hard mode backgrounds by level
function createHardLevel1(ctx, width, height) {
  // Level 1: Intense Energy Field
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#080008");
  gradient.addColorStop(0.3, "#100012");
  gradient.addColorStop(0.7, "#180018");
  gradient.addColorStop(1, "#200025");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Energy core
  const coreGradient = ctx.createRadialGradient(
    width/2, height/2, 0,
    width/2, height/2, Math.max(width, height) * 0.7
  );
  coreGradient.addColorStop(0, "rgba(255, 0, 255, 0.04)");
  coreGradient.addColorStop(0.3, "rgba(200, 0, 200, 0.02)");
  coreGradient.addColorStop(1, "rgba(128, 0, 128, 0.01)");
  ctx.fillStyle = coreGradient;
  ctx.fillRect(0, 0, width, height);

  // Energy orbs
  for (let i = 0; i < 3; i++) {
    const angle = (Math.PI * 2 * i) / 6;
    const distance = Math.max(width, height) * 0.25;
    const x = width/2 + Math.cos(angle) * distance;
    const y = height/2 + Math.sin(angle) * distance;
    const orbGradient = ctx.createRadialGradient(
      x, y, 0,
      x, y, 100
    );
    orbGradient.addColorStop(0, "rgba(255, 0, 255, 0.06)");
    orbGradient.addColorStop(0.5, "rgba(200, 0, 200, 0.03)");
    orbGradient.addColorStop(1, "rgba(128, 0, 128, 0)");
    ctx.fillStyle = orbGradient;
    ctx.beginPath();
    ctx.arc(x, y, 100, 0, Math.PI * 2);
    ctx.fill();
  }

  // Energy rings
  for (let i = 0; i < 2; i++) {
    const ringGradient = ctx.createRadialGradient(
      width/2, height/2, 0,
      width/2, height/2, Math.max(width, height) * 0.4
    );
    ringGradient.addColorStop(0, `rgba(255, 0, 255, ${0.08 - i * 0.01})`);
    ringGradient.addColorStop(0.4, `rgba(200, 0, 200, ${0.05 - i * 0.008})`);
    ringGradient.addColorStop(1, "rgba(128, 0, 128, 0)");
    ctx.fillStyle = ringGradient;
    ctx.beginPath();
    ctx.arc(width/2, height/2, Math.max(width, height) * (0.2 + i * 0.15), 0, Math.PI * 2);
    ctx.fill();
  }

  // Energy lines
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI * 2 * i) / 12;
    const length = Math.max(width, height) * 0.6;
    const lineGradient = ctx.createLinearGradient(
      width/2, height/2,
      width/2 + Math.cos(angle) * length,
      height/2 + Math.sin(angle) * length
    );
    lineGradient.addColorStop(0, "rgba(255, 0, 255, 0.06)");
    lineGradient.addColorStop(1, "rgba(128, 0, 128, 0)");
    ctx.strokeStyle = lineGradient;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(
      width/2 + Math.cos(angle) * 30,
      height/2 + Math.sin(angle) * 30
    );
    ctx.lineTo(
      width/2 + Math.cos(angle) * length,
      height/2 + Math.sin(angle) * length
    );
    ctx.stroke();
  }
}

function createHardLevel2(ctx, width, height) {
  // Level 2: Intense Energy Vortex
  const centerX = width/2;
  const centerY = height/2;
  const baseGradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, Math.max(width, height)
  );
  baseGradient.addColorStop(0, "#250035");
  baseGradient.addColorStop(0.3, "#200030");
  baseGradient.addColorStop(0.6, "#180025");
  baseGradient.addColorStop(1, "#100020");
  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, 0, width, height);

  // Swirling energy streams
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12;
    const spiralPoints = [];
    const spirals = 3;
    const maxRadius = Math.max(width, height) * 0.4;
    for (let t = 0; t <= 1; t += 0.01) {
      const radius = t * maxRadius;
      const theta = angle + t * Math.PI * 2 * spirals;
      spiralPoints.push({
        x: centerX + Math.cos(theta) * radius,
        y: centerY + Math.sin(theta) * radius
      });
    }
    const spiralGradient = ctx.createLinearGradient(
      centerX, centerY,
      centerX + Math.cos(angle) * maxRadius,
      centerY + Math.sin(angle) * maxRadius
    );
    spiralGradient.addColorStop(0, "rgba(180, 40, 220, 0.08)");
    spiralGradient.addColorStop(1, "rgba(120, 20, 180, 0)");
    ctx.strokeStyle = spiralGradient;
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.moveTo(spiralPoints[0].x, spiralPoints[0].y);
    for (let j = 1; j < spiralPoints.length; j++) {
      ctx.lineTo(spiralPoints[j].x, spiralPoints[j].y);
    }
    ctx.stroke();
  }

  // Pulsing energy nodes
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    const distance = Math.max(width, height) * 0.35;
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    const nodeGradient = ctx.createRadialGradient(
      x, y, 0,
      x, y, 150
    );
    nodeGradient.addColorStop(0, "rgba(180, 40, 220, 0.1)");
    nodeGradient.addColorStop(0.4, "rgba(150, 30, 200, 0.05)");
    nodeGradient.addColorStop(1, "rgba(120, 20, 180, 0)");
    ctx.fillStyle = nodeGradient;
    ctx.beginPath();
    ctx.arc(x, y, 150, 0, Math.PI * 2);
    ctx.fill();
  }

  // Intense central core
  const coreGradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, 250
  );
  coreGradient.addColorStop(0, "rgba(200, 40, 220, 0.15)");
  coreGradient.addColorStop(0.3, "rgba(180, 30, 200, 0.08)");
  coreGradient.addColorStop(1, "rgba(150, 20, 180, 0)");
  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 250, 0, Math.PI * 2);
  ctx.fill();
}

function createHardLevel3(ctx, width, height) {
  // Level 3: Power Grid
  const centerX = width/2;
  const centerY = height/2;
  const baseGradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, Math.max(width, height)
  );
  baseGradient.addColorStop(0, "#450060");
  baseGradient.addColorStop(0.4, "#350050");
  baseGradient.addColorStop(0.7, "#250040");
  baseGradient.addColorStop(1, "#150030");
  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, 0, width, height);

  // Hexagonal grid
  const hexRadius = 120;
  const hexHeight = hexRadius * Math.sqrt(3);
  const cols = Math.ceil(width / (hexRadius * 3)) + 2;
  const rows = Math.ceil(height / hexHeight) + 2;
  const offsetX = -hexRadius;
  const offsetY = -hexHeight;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * hexRadius * 3 + (row % 2) * hexRadius * 1.5;
      const y = offsetY + row * hexHeight;
      const hexGradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, hexRadius
      );
      hexGradient.addColorStop(0, "rgba(220, 40, 255, 0.12)");
      hexGradient.addColorStop(0.5, "rgba(180, 30, 220, 0.08)");
      hexGradient.addColorStop(1, "rgba(140, 20, 180, 0)");
      ctx.fillStyle = hexGradient;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const hx = x + hexRadius * Math.cos(angle);
        const hy = y + hexRadius * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();

      // Connections
      if (col < cols - 1) {
        const nextX = x + hexRadius * 3;
        const connectionGradient = ctx.createLinearGradient(x, y, nextX, y);
        connectionGradient.addColorStop(0, "rgba(138, 21, 198, 0.06)");
        connectionGradient.addColorStop(0.5, "rgba(107, 15, 153, 0.03)");
        connectionGradient.addColorStop(1, "rgba(138, 21, 198, 0.06)");
        ctx.strokeStyle = connectionGradient;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x + hexRadius, y);
        ctx.lineTo(nextX - hexRadius, y);
        ctx.stroke();
      }
    }
  }

  // Power nodes
  const nodeRadius = 40;
  for (let row = 0; row < rows; row += 2) {
    for (let col = 0; col < cols; col += 2) {
      const x = offsetX + col * hexRadius * 3 + (row % 2) * hexRadius * 1.5;
      const y = offsetY + row * hexHeight;
      const nodeGradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, nodeRadius
      );
      nodeGradient.addColorStop(0, "rgba(138, 21, 198, 0.12)");
      nodeGradient.addColorStop(0.5, "rgba(107, 15, 153, 0.06)");
      nodeGradient.addColorStop(1, "rgba(61, 9, 130, 0)");
      ctx.fillStyle = nodeGradient;
      ctx.beginPath();
      ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Central power core
  const coreGradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, 300
  );
  coreGradient.addColorStop(0, "rgba(255, 60, 255, 0.2)");
  coreGradient.addColorStop(0.4, "rgba(220, 40, 255, 0.12)");
  coreGradient.addColorStop(1, "rgba(180, 30, 220, 0)");
  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 300, 0, Math.PI * 2);
  ctx.fill();
}

// Theme-specific background creation functions
function createEasyBackground(ctx, width, height, levelValue) {
  if (levelValue === 1) {
    createEasyLevel1(ctx, width, height);
  } else if (levelValue === 2) {
    createEasyLevel2(ctx, width, height);
  } else {
    createEasyLevel3(ctx, width, height);
  }
  
  // Add noise to all easy backgrounds
  addEnhancedNoise(ctx, width, height, 0.02);
}

function createHardBackground(ctx, width, height, levelValue) {
  if (levelValue === 1) {
    createHardLevel1(ctx, width, height);
  } else if (levelValue === 2) {
    createHardLevel2(ctx, width, height);
  } else {
    createHardLevel3(ctx, width, height);
  }
}

// Helper function to get the streak intensity level (0-4)
function getStreakIntensity(streak) {
  // Use a continuous function that grows with streak and never decreases
  // This ensures effects always increase and never "simmer down"
  if (streak <= 0) return 0;  // No streak
  
  // Cap the streak at 16 for effect calculations to prevent issues at higher streaks
  // This means visual effects will max out at streak 16 and stay consistent after that
  const effectiveStreak = Math.min(16, streak);
  
  // For streaks 1+, we calculate a continuously growing value
  // We use Math.min to cap visual effects at 4, but the calculation keeps growing
  // Slightly stronger growth curve that never plateaus
  const intensity = 1 + (effectiveStreak * 0.15) + (Math.sqrt(effectiveStreak) * 0.1);
  return Math.min(4, intensity);
}

// Main entry point - updated to support streak-based effects
export function createBackground(scene, backgroundConfig, levelValue = 1, wordStreak = 0) {
  const width = scene.cameras.main.width;
  const height = scene.cameras.main.height;
  const effect = backgroundConfig?.effect || "static";
  const color = backgroundConfig?.color || 0x000000;
  const asset = backgroundConfig?.asset || null;
  const params = backgroundConfig?.params || {};

  // Static image background
  if (effect === "static" && asset) {
    scene.background = scene.add.image(0, 0, asset)
      .setOrigin(0)
      .setDisplaySize(width, height)
      .setDepth(-1);
    return;
  }

  // Calculate streak intensity (0-4)
  const streakIntensity = getStreakIntensity(wordStreak);
  
  // Create a dynamic canvas background with streak intensity included in the key
  const gradientTextureKey = `themeBackground_${effect}_level_${levelValue}_streak_${streakIntensity}`;
  if (!scene.textures.exists(gradientTextureKey)) {
    const gradientCanvas = scene.textures.createCanvas(gradientTextureKey, width, height);
    const ctx = gradientCanvas.getContext();
    if (!ctx) {
      console.error("Failed to get canvas context for background effect.");
      return;
    }

    // Delegate to the appropriate background creator based on effect
    if (effect === "bubbles" || effect === "easy") {
      createEasyBackground(ctx, width, height, levelValue);
    } else if (effect === "electric" || effect === "hard") {
      createHardBackground(ctx, width, height, levelValue);
    }

    gradientCanvas.refresh();
  }

  // Add the generated background image to the scene
  scene.background = scene.add.image(0, 0, gradientTextureKey)
    .setOrigin(0)
    .setDisplaySize(width, height)
    .setDepth(-1);

  // Animation parameters based on streak intensity - ENHANCED effects
  const alphaRange = 0.1 + (streakIntensity * 0.05); // 0.1 to 0.3
  const scaleRange = 0.03 + (streakIntensity * 0.015); // 0.03 to 0.09
  const durationBase = 8000 - (streakIntensity * 1500); // 8000 to 2000ms
  
  console.log(`Background effects for streak intensity: ${streakIntensity}, streak: ${wordStreak}`);
  
  
  // More dramatic pulsing effect
  scene.tweens.add({
    targets: scene.background,
    alpha: { from: 0.9, to: 0.9 + alphaRange },
    duration: durationBase,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.InOut'
  });

  // More noticeable scaling
  scene.tweens.add({
    targets: scene.background,
    scaleX: { from: 1, to: 1 + scaleRange },
    scaleY: { from: 1, to: 1 + scaleRange },
    duration: durationBase * 1.2,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.InOut'
  });
  
  // Only apply streak-specific effects when streak > 0
  if (wordStreak > 0) {
    console.log(`Applying all streak effects for streak: ${wordStreak}, intensity: ${streakIntensity}`);
    
    // Add effects for ALL streak levels, with increasing intensity
    if (streakIntensity >= 1) {
      // Even at low streaks, add a subtle rotation
      const rotationAmount = 0.2 + (streakIntensity * 0.3); // 0.2 to 1.4 degrees
      
      scene.tweens.add({
        targets: scene.background,
        angle: { from: -rotationAmount, to: rotationAmount },
        duration: durationBase * 1.5,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
      
      // Add a visual streak indicator (a colored border) that gets more intense with higher streaks
      const borderColor = effect === "electric" || effect === "hard" ? 0xff00ff : 0x00ffff;
      const borderWidth = 2 + (streakIntensity * 3); // 2px to 14px
      const border = scene.add.rectangle(
        width/2, 
        height/2, 
        width - 20, 
        height - 20, 
        borderColor, 
        0
      ).setStrokeStyle(borderWidth, borderColor, 0.3 + (streakIntensity * 0.15)) // Alpha 0.3 to 0.9
        .setDepth(-0.5);
      
      // Pulse the border
      scene.tweens.add({
        targets: border,
        scaleX: { from: 0.98, to: 1.02 },
        scaleY: { from: 0.98, to: 1.02 },
        duration: durationBase / (1 + streakIntensity * 0.5), // Gets faster with higher streaks
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
      
      // Add to scene.background for cleanup tracking
      scene.background.streakBorder = border;
    }
  
    // For medium and higher streaks, add particle effects
    if (streakIntensity >= 2) {
      try {
        // Create particles for streaks
        const particleColor = effect === "electric" || effect === "hard" ? 0xff00ff : 0x00ffff;
        
        // Create simple particles using circles
        const particles = [];
        // More particles for higher streaks - capped to prevent issues at high streak values
        // Using effectiveStreak (capped at 16) ensures consistent particle count at higher streaks
        const effectiveStreak = Math.min(16, wordStreak);
        const particleCount = 5 + (streakIntensity * 5) + Math.floor(Math.pow(effectiveStreak, 0.7));
        
        for (let i = 0; i < particleCount; i++) {
          const particle = scene.add.circle(
            Math.random() * width,
            Math.random() * height,
            2 + Math.random() * 4,
            particleColor,
            0.5 + (streakIntensity * 0.1) // Brightness increases with streak
          ).setDepth(-0.6);
          
          // Animate each particle
          scene.tweens.add({
            targets: particle,
            x: { from: particle.x, to: particle.x + (Math.random() * 200 - 100) },
            y: { from: particle.y, to: particle.y + (Math.random() * 200 - 100) },
            alpha: { from: particle.alpha, to: 0 },
            scale: { from: 1, to: 0 },
            duration: 1500 + Math.random() * 2000,
            onComplete: () => {
              // Respawn the particle
              particle.x = Math.random() * width;
              particle.y = Math.random() * height;
              particle.alpha = 0.5 + (streakIntensity * 0.1);
              particle.scale = 1;
              
              // Animate again
              scene.tweens.add({
                targets: particle,
                x: { from: particle.x, to: particle.x + (Math.random() * 200 - 100) },
                y: { from: particle.y, to: particle.y + (Math.random() * 200 - 100) },
                alpha: { from: particle.alpha, to: 0 },
                scale: { from: 1, to: 0 },
                duration: 1500 + Math.random() * 2000,
                repeat: -1
              });
            }
          });
          
          particles.push(particle);
        }
        
        // Store reference for cleanup
        scene.background.particles = particles;
      } catch (e) {
        console.error("Error creating streak particles:", e);
      }
    }
    
    // For high streaks, add dramatic overlay effects
    if (streakIntensity >= 3) {
      // Create a glowing overlay
      const glowColor = effect === "electric" || effect === "hard" ? 0xff00ff : 0x00ffff;
      const glowAlpha = 0.15 + (streakIntensity * 0.05); // 0.15 to 0.35
      const glow = scene.add.rectangle(
        width/2, 
        height/2, 
        width, 
        height, 
        glowColor, 
        glowAlpha
      ).setDepth(-0.5);
      
      // Add to scene.background for cleanup tracking
      scene.background.glowOverlay = glow;
      
      // Add pulsing effect
      scene.tweens.add({
        targets: glow,
        alpha: { from: glowAlpha, to: glowAlpha * 2 },
        duration: durationBase / 2,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
      
      // For Epic streak (level 4 or higher), add additional dramatic effects
      if (streakIntensity >= 4) {
        // Add vignette effect (darkened corners)
        const vignette = scene.add.graphics().setDepth(-0.4);
        vignette.fillStyle(0x000000, 0.4);
        
        // Draw a radial gradient manually
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.max(width, height) * 0.7;
        
        for (let r = radius; r > 0; r -= 5) {
          const alpha = 0.4 * (1 - (r / radius));
          vignette.fillStyle(0x000000, alpha);
          vignette.fillCircle(centerX, centerY, r);
        }
        
        // Store for cleanup
        scene.background.vignette = vignette;
        
        // Add corner flares
        const flarePositions = [
          {x: 0, y: 0},
          {x: width, y: 0},
          {x: 0, y: height},
          {x: width, y: height}
        ];
        
        const flares = [];
        
        flarePositions.forEach(pos => {
          const flare = scene.add.circle(pos.x, pos.y, 120, glowColor, 0.2).setDepth(-0.3);
          
          // Pulse the flare
          scene.tweens.add({
            targets: flare,
            scale: { from: 0.8, to: 1.2 },
            alpha: { from: 0.1, to: 0.3 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
          });
          
          flares.push(flare);
        });
        
        // Store for cleanup
        scene.background.flares = flares;
      }
    }
  } else {
    console.log("No streak effects applied - streak is 0");
  }
}
