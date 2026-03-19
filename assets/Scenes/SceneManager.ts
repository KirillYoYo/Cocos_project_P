import { _decorator, Component, director, Node } from 'cc';
const { ccclass } = _decorator;

@ccclass('SceneManager')
export class SceneManager extends Component {
    private static _instance: SceneManager;
    
    static get instance(): SceneManager {
        return SceneManager._instance!;
    }
    
    onLoad() {
        if (SceneManager._instance) {
            this.node.destroy();
        } else {
            SceneManager._instance = this;
            director.addPersistRootNode(this.node);
        }
    }
    
    switchTo(event: Event, sceneName: string = 'MainScene') {
        console.log(`Loading scene: ${sceneName}`);
        director.loadScene(sceneName);
    }
    
    async switchToAsync(sceneName: string) {
        await director.preloadScene(sceneName);
        this.switchTo(sceneName);
    }
}
