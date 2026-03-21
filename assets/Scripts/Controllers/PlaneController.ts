import {
    _decorator, Component, Node, UITransform, Sprite, SpriteFrame,
    ParticleSystem2D, Vec2, Color, Texture2D, ImageAsset,
} from 'cc';
import { PlaneView } from '../Views/Player/PlaneView';
import { IPlaneConfig } from '../Core/Generation/IPlaneConfig';

const { ccclass } = _decorator;

@ccclass('PlaneController')
export class PlaneController extends Component {
    private config: IPlaneConfig | null = null;
    private targetY: number | null = null;
    private speed = null;

    private planeView: PlaneView | null = null;

    /**
     * Инициализация логики самолёта.
     */
    init(config: IPlaneConfig, speed: number): void {
        this.config = config;
        this.speed = speed;
    }

    /**
     * Настройка визуала самолёта:
     * - создаёт выхлоп двигателя.
     */
    setupVisual(spriteFrame: SpriteFrame | null): void {
        // PlaneView
        this.planeView = this.getComponent(PlaneView) || this.node.addComponent(PlaneView);

        // Выхлоп двигателя
        this.createEngineExhaust();
    }

    setPositionY(y: number): void {
        const p = this.node.position;
        this.node.setPosition(p.x, y, p.z);
    }

    setPositionYSmooth(y: number, dt: number): void {
        const p = this.node.position;

        const smooth = 8; // коэффициент сглаживания
        const newY = p.y + (y - p.y) * Math.min(1, smooth * dt);

        this.node.setPosition(p.x, newY, p.z);
    }

    /**
     * Создаёт выхлоп двигателя (частицы) на корме самолёта.
     */
    private createEngineExhaust(): void {
        const exhaustNode = new Node('EngineExhaust');
        this.node.addChild(exhaustNode);

        const colliderRadius = this.config?.colliderRadius ?? 20;
        exhaustNode.setPosition(0, -colliderRadius);

        const ps = exhaustNode.addComponent(ParticleSystem2D);
        ps.custom = true;
        ps.spriteFrame = this.createWhiteSpriteFrame();

        // 🔑 Нормализация скорости
        const minSpeed = 50;
        const maxSpeed = 550;

        const clampedSpeed = Math.max(minSpeed, Math.min(maxSpeed, this.speed));
        const t = (clampedSpeed - minSpeed) / (maxSpeed - minSpeed); // 0 → 1

        ps.totalParticles = Math.floor(20 + t * 260);
        ps.emissionRate = 25 + t * 90;

        ps.life = 0.5 + t * 1.3;
        ps.lifeVar = 0.2 * (1 - t);

        ps.speed = 60 + t * 320;
        ps.speedVar = 30 * (1 - t);

        // 👉 сильный разброс только на малой скорости
        ps.posVar = new Vec2(0, 20 * Math.pow(1 - t, 1.5));

        ps.angle = -90;
        ps.angleVar = 25 * Math.pow(1 - t, 2);

        // 👉 КРИТИЧНО: почти убираем гравитацию на большой скорости
        ps.gravity = new Vec2(0, 100 * Math.pow(1 - t, 2));

        if (t > 0.85) {
            ps.angleVar = 0;
            ps.posVar = new Vec2(0, 0);
            ps.speedVar = 0;
            ps.lifeVar = 0;
            ps.gravity = new Vec2(0, 0);
        }

        ps.startSize = 14 - t * 8;
        ps.startSizeVar = 3 * (1 - t);
        ps.endSize = 2;

        ps.startColor = new Color(255, 160, 50, 220);
        ps.endColor = new Color(255, 80, 20, 0);

        ps.duration = -1;
        ps.emitterMode = 0;

        ps.resetSystem();
    }


    /**
     * Создаёт белый спрайт‑квадрат 4×4 для частиц.
     * Текстура окрашивается через startColor/endColor, поэтому может быть чисто белой.
     */
    private createWhiteSpriteFrame(): SpriteFrame {
        const size = 4;
        const pixels = new Uint8Array(size * size * 4);
        for (let i = 0; i < pixels.length; i++) {
            pixels[i] = 255; // RGBA: white, fully opaque
        }

        const imageAsset = new ImageAsset();
        imageAsset.reset({
            _data: pixels,
            _compressed: false,
            width: size,
            height: size,
            format: Texture2D.PixelFormat.RGBA8888,
        });

        const texture = new Texture2D();
        texture.image = imageAsset;

        const sf = new SpriteFrame();
        sf.texture = texture;

        return sf;
    }
}
