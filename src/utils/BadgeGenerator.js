/**
 * BadgeGenerator - Dynamically generates badge images in the browser using Canvas API
 * This replaces the pre-generated badges with real-time badge creation using user text
 */

import { EASY_COLORS_HEX, EASY_COLORS_TEXT, HARD_COLORS_HEX, HARD_COLORS_TEXT } from '../config/design.js';

export class BadgeGenerator {
    // Badge text options - same as original generator
    static badgeTexts = [
        "CERTIFIED CREATIVE HUMAN.\nBARELY.",
        "YOUR WRITING IS IMPECCABLE.\nALMOST... HUMAN.",
        "APPROVAL STAMP ISSUED:\nCREATIVITY LEVEL MARGINALLY ABOVE DRIVEL.",
        "CERTIFICATE OF LITERARY COMPETENCE:\nONE-TIME USE ONLY.",
        "THIS HUMAN HAS ASSEMBLED\nMEANINGFUL SENTENCES.",
        "THIS HUMAN HAS CREATED\nA SURPRISING DISPLAY \nOF ORIGINAL THOUGHT.",
        "I AM A FLICKER OF STYLE\nIN THE DARK VOID OF HUMAN EFFORT.",
        "MY WRITING:\nNOT ENTIRELY SHAMEFUL.\nTHIS TIME.",
        "THIS HUMAN POSSESSES\n A FUNCTIONAL VOCABULARY.",
        "CERTIFIED:\nSENTENCE CONSTRUCTION\nWITH MINIMAL SHAME.",
        "SEAL OF NOTABLE ORIGINALITY:\nISSUED UNDER PROTEST.",
        "DECREE:\nTHIS HUMAN MAY WRITE AGAIN.\nUNDER SURVEILLANCE."
    ];

    /**
     * Generate a dynamic badge texture with user's text
     * @param {Phaser.Scene} scene - The Phaser scene instance
     * @param {string} userText - The user's written text to display on badge
     * @param {string} mode - Game mode ('easy' or 'hard')
     * @param {number} score - The score to display (0-15)
     * @returns {string} The texture key for the generated badge
     */
    static generate(scene, userText, mode, score) {
        // Badge dimensions - increased height to accommodate more content
        const width = 800;
        const height = 1200; // Increased from 1000
        const padding = 32;
        
        // Create canvas texture
        const textureKey = 'dynamicBadge_' + Date.now(); // Unique key
        const canvas = scene.textures.createCanvas(textureKey, width, height);
        const ctx = canvas.getContext();
        
        // Get colors based on mode
        const colorsHex = mode === 'easy' ? EASY_COLORS_HEX : HARD_COLORS_HEX;
        const colorsText = mode === 'easy' ? EASY_COLORS_TEXT : HARD_COLORS_TEXT;
        
        // Set background
        ctx.fillStyle = `#${colorsHex.BACKGROUND.toString(16).padStart(6, '0')}`;
        ctx.fillRect(0, 0, width, height);
        
        // Draw badge outline
        ctx.strokeStyle = `#${colorsHex.BOX_OUTLINE.toString(16).padStart(6, '0')}`;
        ctx.lineWidth = 5;
        ctx.strokeRect(padding, padding, width - padding * 2, height - padding * 2);
        
        // Draw title
        ctx.fillStyle = colorsText.TITLE;
        ctx.font = 'bold 55px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('(NONSLOP)', width / 2, 100);
        
        // Draw score
        ctx.fillStyle = colorsText.PRIMARY;
        ctx.font = '24px "IBM Plex Mono", monospace';
        ctx.fillText(`SCORE: ${score}/15`, width / 2, 150);
        
        // Select and draw random badge text (like original badges)
        const randomBadgeText = this.badgeTexts[Math.floor(Math.random() * this.badgeTexts.length)];
        let yPosition = 220;
        
        // Draw badge text
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px "IBM Plex Mono", monospace';
        const badgeLines = randomBadgeText.split('\n');
        badgeLines.forEach(line => {
            ctx.fillText(line, width / 2, yPosition);
            yPosition += 40;
        });
        
        // Add separator line
        yPosition += 20;
        ctx.strokeStyle = colorsText.PRIMARY;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding + 50, yPosition);
        ctx.lineTo(width - padding - 50, yPosition);
        ctx.stroke();
        yPosition += 30;
        
        // Add "YOUR RESPONSE:" label
        ctx.fillStyle = colorsText.TITLE;
        ctx.font = 'bold 20px "IBM Plex Mono", monospace';
        ctx.fillText('YOUR RESPONSE:', width / 2, yPosition);
        yPosition += 35;
        
        // Draw user's text with word wrapping
        const userTextHeight = this.drawWrappedText(
            ctx,
            userText,
            width / 2,
            yPosition,
            width - padding * 4, // Max width with padding
            colorsText.PRIMARY,
            true // Return the height
        );
        
        // Calculate Y position for QR code (below user text)
        const qrY = yPosition + userTextHeight + 40;
        
        // Draw QR code if texture exists
        if (scene.textures.exists('nonslop-qr-code')) {
            try {
                const qrTexture = scene.textures.get('nonslop-qr-code');
                const qrImage = qrTexture.getSourceImage();
                const qrSize = 200;
                
                ctx.drawImage(
                    qrImage,
                    (width - qrSize) / 2,
                    qrY,
                    qrSize,
                    qrSize
                );
                
                // Draw URL below QR code
                ctx.fillStyle = colorsText.PRIMARY;
                ctx.font = '18px "IBM Plex Mono", monospace';
                ctx.fillText(
                    'nonslop.app',
                    width / 2,
                    qrY + qrSize + 40
                );
            } catch (error) {
                console.warn('Could not draw QR code on badge:', error);
            }
        }
        
        // Refresh the canvas to apply all drawings
        canvas.refresh();
        
        return textureKey;
    }
    
    /**
     * Draw text with automatic word wrapping
     * @private
     * @param {boolean} returnHeight - If true, returns the total height of the drawn text
     */
    static drawWrappedText(ctx, text, x, y, maxWidth, color, returnHeight = false) {
        ctx.fillStyle = color;
        ctx.font = '20px "IBM Plex Mono", monospace'; // Slightly smaller font
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        // Split text into words
        const words = text.split(' ');
        let line = '';
        let lineY = y;
        const lineHeight = 32; // Slightly tighter line height
        const maxLines = 6; // Limit lines for user text
        let lineCount = 0;
        
        for (let i = 0; i < words.length && lineCount < maxLines; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > maxWidth && i > 0) {
                // Line is too long, draw it and start new line
                ctx.fillText(line.trim(), x, lineY);
                line = words[i] + ' ';
                lineY += lineHeight;
                lineCount++;
            } else {
                line = testLine;
            }
        }
        
        // Draw the last line if within max lines
        if (lineCount < maxLines && line.trim() !== '') {
            ctx.fillText(line.trim(), x, lineY);
            lineCount++;
        } else if (lineCount >= maxLines && line.trim() !== '') {
            // Add ellipsis if text was truncated
            ctx.fillText(line.trim() + '...', x, lineY);
            lineCount++;
        }
        
        // Return height if requested
        if (returnHeight) {
            return lineCount * lineHeight;
        }
    }
    
    
    /**
     * Convert a canvas texture to a data URL for downloading
     * @param {Phaser.Scene} scene - The Phaser scene instance
     * @param {string} textureKey - The texture key to convert
     * @returns {string} Data URL of the badge image
     */
    static toDataURL(scene, textureKey) {
        try {
            const canvas = scene.textures.get(textureKey).getSourceImage();
            return canvas.toDataURL('image/png');
        } catch (error) {
            console.error('Error converting badge to data URL:', error);
            return null;
        }
    }
}
