export const GAMEPATH = {
    getPlayerConnectionPath: (userId: string) =>
        `.players.${userId}.connection`,
    getPlayersPath: () => `.players`,
    getPlayerReadyPath: (userId: string) => `.players.${userId}.isReady`,
    getArtifactsPath: (userId: string) => `.players.${userId}.artifacts`,
    getPhasePath: () => `.phase`,
};
