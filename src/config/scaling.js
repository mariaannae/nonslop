
// config/scaling.js
export class ScalingManager {
    constructor(scene) {
      this.scene = scene;
      this.baseWidth = 1200;  // Your base design width
      this.baseHeight = 900;  // Your base design height
      this.updateScaleRatios();
    }
  
    updateScaleRatios() {
      const { width, height } = this.scene.cameras.main;
      
      // Calculate scale ratios
      this.scaleX = width / this.baseWidth;
      this.scaleY = height / this.baseHeight;
      
      // For UI elements that should maintain aspect ratio
      this.scale = Math.min(this.scaleX, this.scaleY);
      
      // For text that might need different scaling
      this.textScale = Math.max(this.scale, 0.5); // Ensure text isn't too small
      
      //console.log(`Screen size: ${width}x${height}, Scale ratios - X: ${this.scaleX.toFixed(2)}, Y: ${this.scaleY.toFixed(2)}, UI: ${this.scale.toFixed(2)}`);
    }

    buttonWidth(cameraWidth) {
        return Phaser.Math.Clamp(cameraWidth * 0.1, cameraWidth * 0.07, 220); // 10% of screen width
    }

    buttonHeight(buttonWidth) {
        return Phaser.Math.Clamp(buttonWidth * 0.4, 40, 80); // 40% of button width
    }

    buttonSpacing(buttonHeight) {
        return buttonHeight;
    }
    
    // Helper functions for common scaling needs
    scaleValue(value) {
      return value * this.scale;
    }
    
    scaleValueX(value) {
      return value * this.scaleX;
    }
    
    scaleValueY(value) {
      return value * this.scaleY;
    }
    
    scaleText(size) {
      return Math.floor(size * this.textScale);
    }
    
    // Calculate responsive positions
    centerX() {
      return this.scene.cameras.main.width / 2;
    }
    
    centerY() {
      return this.scene.cameras.main.height / 2;
    }
    
    // Return position relative to screen size (percentage-based)
    widthPercent(percent) {
      return this.scene.cameras.main.width * (percent / 100);
    }
    
    heightPercent(percent) {
      return this.scene.cameras.main.height * (percent / 100);
    }
  }