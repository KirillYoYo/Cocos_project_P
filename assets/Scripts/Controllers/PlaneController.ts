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
    private verticalSpeed = 350; // px/sec

    private planeView: PlaneView | null = null;

    /**
     * Инициализация логики самолёта.
     */
    init(config: IPlaneConfig): void {
        this.config = config;
        this.verticalSpeed = config.upForce || 350;
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

    /**
     * Установка целевой позиции Y для самолёта.
     * PlaneController сам решает, как двигаться к этой точке.
     */
    setTargetY(y: number): void {
        this.targetY = y;
    }

    update(dt: number): void {
        if (this.targetY === null) return;

        // Плавное движение к targetY
        const currentY = this.node.position.y;
        const dy = (this.targetY - currentY) * 0.3; // 0.3 — коэффициент сглаживания, можно вынести в конфиг
        const nextY = currentY + dy;

        this.node.setPosition(this.node.position.x, nextY, this.node.position.z);
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

        ps.totalParticles = 50;
        ps.duration = -1;
        ps.emissionRate = 30;
        ps.life = 1;
        ps.lifeVar = 1;
        ps.startSize = 10;
        ps.startSizeVar = 5;
        ps.endSize = 2;
        ps.endSizeVar = 1;
        ps.angle = -90;
        ps.angleVar = 12;
        ps.speed = 100;
        ps.speedVar = 20;

        ps.startColor = new Color(255, 160, 50, 220);
        ps.startColorVar = new Color(20, 30, 10, 0);
        ps.endColor = new Color(255, 60, 10, 0);
        ps.endColorVar = new Color(10, 10, 5, 0);

        ps.posVar = new Vec2(0, 3);
        ps.emitterMode = 0;
        ps.gravity = new Vec2(0, 0);

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
