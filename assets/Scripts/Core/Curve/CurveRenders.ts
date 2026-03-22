import { Graphics, Color } from 'cc';
import { CurveManager } from './CurveManager';

export class CurveRenderer {

    constructor(
        private graphics: Graphics,
        private screenWidth: number,
        private screenHeight: number
    ) {}

    draw(curve: CurveManager) {
        const g = this.graphics;

        const centerX = this.screenWidth / 2;
        const centerY = this.screenHeight / 2;

        curve.forEachRenderablePoint((screenX, y) => {

            if (screenX >= -50 && screenX <= this.screenWidth + 50) {

                const localX = screenX - centerX;
                const localY = y - centerY;

                g.circle(localX, localY, 6);
            }
        });

        g.fillColor = new Color(255, 100, 100, 255);
        g.fill();
    }
}