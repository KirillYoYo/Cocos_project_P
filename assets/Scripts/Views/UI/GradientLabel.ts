import { _decorator, Component, Label, BitmapFont, Material } from 'cc';

const { ccclass } = _decorator;

/**
 * Привязывает текстуру BMFont к кастомному материалу Label.
 * Cocos Creator не делает это автоматически для BMFont —
 * нужно вручную прокинуть spriteFrame в mainTexture материала.
 *
 * Установка: повесить на ту же ноду что и Label с BMFont + Custom Material.
 */
@ccclass('GradientLabel')
export class GradientLabel extends Component {

    onLoad(): void {
        this.bindFontTexture();
    }

    /**
     * Берёт текстуру из BMFont и передаёт в mainTexture кастомного материала.
     */
    private bindFontTexture(): void {
        const label = this.getComponent(Label);
        if (!label || !label.customMaterial) return;

        // Получаем текстуру атласа BMFont
        const font = label.font;
        if (!(font instanceof BitmapFont)) return;

        const spriteFrame = font.spriteFrame;
        if (!spriteFrame) return;

        // Прокидываем текстуру в материал
        const material = label.customMaterial;
        const pass = material.passes[0];
        if (pass) {
            // Устанавливаем текстуру по имени свойства mainTexture
            pass.bindTexture(
                pass.getBinding('mainTexture'),
                spriteFrame.texture
            );
        }
    }
}
