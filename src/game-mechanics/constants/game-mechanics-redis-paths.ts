import { RESOURCE, ResourceType } from "../types/resource";

export const GAME_MECHANICS_PATH = {
    getResourcePath: (userId: number, resource: ResourceType) => {
        const resourceDict = {
            [RESOURCE.AGILITY]: ".agility",
            [RESOURCE.RAGE]: ".rage",
            [RESOURCE.LIGHT_MANA]: ".light_mana",
            [RESOURCE.DARK_MANA]: ".dark_mana",
            [RESOURCE.DESTRUCTION_MANA]: ".destruction_mana",
        }

        return `.players.${userId}.resources.${resourceDict[resource]}`
    },
    getArtifactsPath: (userId: number) => `.players.${userId}.artifacts`,
    getArtifactPath: (userId: number, artifactId: number) => `.players.${userId}.artifacts.${artifactId}`,
    getArtifactStatePath: (userId: number, artifactId: number) => `.players.${userId}.artifacts.${artifactId}.state`,
    getMovePointsPath: (userId: number) => `.players.${userId}.movePoints`,
};
