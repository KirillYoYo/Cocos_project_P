import { Graphics, Color } from 'cc';
import { SpaceManager, SpaceObjectType } from './SpaceObjects';

export class SpaceRenderer {

    constructor(
        private graphics: Graphics,
        private screenWidth: number,
        private screenHeight: number
    ) {}

    draw(spaceManager: SpaceManager) {
        const g = this.graphics;

        const centerX = this.screenWidth / 2;
        const centerY = this.screenHeight / 2;

        // ⭐ STARS
        spaceManager.forEach((obj, screenX) => {

            if (obj.type !== SpaceObjectType.Star) return;

            if (
                screenX < -50 ||
                screenX > this.screenWidth + 50 ||
                obj.y < -50 ||
                obj.y > this.screenHeight + 50
            ) return;

            const x = screenX - centerX;
            const y = obj.y - centerY;

            g.fillColor = new Color(255, 255, 255, 180);
            g.circle(x, y, 1);
        });

        // 🪐 PLANETS
        spaceManager.forEach((obj, screenX) => {

            if (obj.type !== SpaceObjectType.Planet) return;

            if (
                screenX < -50 ||
                screenX > this.screenWidth + 50 ||
                obj.y < -50 ||
                obj.y > this.screenHeight + 50
            ) return;

            const x = screenX - centerX;
            const y = obj.y - centerY;

            const radius = obj.size * obj.depth * 0.1;
            const alpha = Math.max(60, 255 * obj.depth);

            g.fillColor = new Color(180, 180, 255, alpha);
            g.circle(x, y, radius);
        });

        g.fill();
    }
}