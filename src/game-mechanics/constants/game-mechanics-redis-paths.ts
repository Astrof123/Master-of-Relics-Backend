import { RESOURCE, ResourceType } from '../types/resource';

export const GAME_MECHANICS_PATH = {
    getResourcePath: (userId: string, resource: ResourceType) => {
        const resourceDict = {
            [RESOURCE.AGILITY]: '.agility',
            [RESOURCE.RAGE]: '.rage',
            [RESOURCE.LIGHT_MANA]: '.light_mana',
            [RESOURCE.DARK_MANA]: '.dark_mana',
            [RESOURCE.DESTRUCTION_MANA]: '.destruction_mana',
        };

        return `.players.${userId}.resources.${resourceDict[resource]}`;
    },
    getArtifactsPath: (userId: string) => `.players.${userId}.artifacts`,
    getArtifactPath: (userId: string, artifactId: number) =>
        `.players.${userId}.artifacts.${artifactId}`,
    getArtifactStatePath: (userId: string, artifactId: number) =>
        `.players.${userId}.artifacts.${artifactId}.state`,
    getMovePointsPath: (userId: string) => `.players.${userId}.movePoints`,
};
