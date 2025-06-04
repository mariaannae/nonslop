// config/scaling.js
export class ScalingManager {
    constructor(scene) {
      this.scene = scene;
      this.deviceType = this.detectDeviceType();
      // Set base dimensions depending on device type
      if (this.deviceType === "tablet") {
        this.baseWidth = 1000;
        this.baseHeight = 800;
      } else if (this.deviceType === "phone") {
        this.baseWidth = 720;
        this.baseHeight = 1280;
      } else {
        // desktop
        this.baseWidth = 1200;
        this.baseHeight = 900;
      }
      this.updateScaleRatios();
    }

    detectDeviceType() {
      // Use screen size and user agent to distinguish phone/tablet/desktop
      const ua = navigator.userAgent.toLowerCase();
      const width = window.screen.width;
      const height = window.screen.height;
      const minDim = Math.min(width, height);

      // iPad or Android tablet detection
      if (
        (ua.includes("ipad")) ||
        (ua.includes("android") && !ua.includes("mobile")) ||
        (minDim >= 600 && minDim < 900)
      ) {
        return "tablet";
      }
      // Phone detection
      if (
        (ua.includes("iphone")) ||
        (ua.includes("android") && ua.includes("mobile")) ||
        (minDim < 600)
      ) {
        return "phone";
      }
      // Default to desktop
      return "desktop";
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
      
      //console.log(`Screen size: ${width}x${height}, Scale ratios - X: ${this.scaleX.toFixed(2)}, Y: ${this.scaleY.toFixed(2)}, UI: ${this.scale.toFixed(2)}, Device: ${this.deviceType}`);
    }

    buttonWidth(cameraWidth) {
        // Fixed size for desktop/tablet, larger for mobile
        if (this.deviceType === "desktop" || this.deviceType === "tablet") {
            return 115;
        } else {
            return 115;
        }
    }

    buttonHeight(buttonWidth) {
        if (this.deviceType === "desktop" || this.deviceType === "tablet") {
            return 40;
        } else {
            return 40;
        }
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
