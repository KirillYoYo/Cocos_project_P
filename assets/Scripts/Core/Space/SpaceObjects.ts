import { RingScrollBuffer } from '../../Utils/RingScrollBuffer';

export enum SpaceObjectType {
    Planet,
    Star
}

export interface SpaceObject {
    x: number;
    y: number;
    depth: number;
    size: number;
    type: SpaceObjectType;
}

export class SpaceManager {

    private buffer: RingScrollBuffer<SpaceObject>;

    constructor(
        private screenWidth: number,
        private screenHeight: number
    ) {
        this.buffer = new RingScrollBuffer<SpaceObject>(
            400,
            screenWidth,

            // мировой X
            (obj) => obj.x,

            // экранный X (параллакс)
            (obj, scroll) => obj.x - scroll * obj.depth
        );
    }

    init() {
        this.buffer.init(this.generate(1000));
        this.buffer.fillStep();
    }

    update(dt: number, speed: number) {
        this.buffer.update(dt, speed);
        this.buffer.fillStep();
    }

    forEach(callback: (obj: SpaceObject, screenX: number) => void) {
        this.buffer.forEach(callback);
    }

    // ------------------------

    private generate(count: number): SpaceObject[] {
        const result: SpaceObject[] = [];

        let x = 0;

        for (let i = 0; i < count; i++) {

            // 🔥 смещаем распределение к дальним
            const depth = Math.pow(Math.random(), 2) * 1.3 + 0.2;

            x += 40 + Math.random() * 80;

            // 🔥 тип зависит от глубины
            let type: SpaceObjectType;

            if (depth < 0.5) {
                type = SpaceObjectType.Star; // далеко → почти всегда звезды
            } else if (depth < 1.0) {
                type = Math.random() > 0.3
                    ? SpaceObjectType.Star
                    : SpaceObjectType.Planet;
            } else {
                type = SpaceObjectType.Planet; // близко → планеты
            }

            // 🔥 размер тоже зависит от depth
            const size =
                type === SpaceObjectType.Star
                    ? 2 + Math.random() * 4
                    : (20 + Math.random() * 80) * depth;

            result.push({
                x,
                y: Math.random() * this.screenHeight,
                depth,
                size,
                type
            });
        }

        return result;
    }
}