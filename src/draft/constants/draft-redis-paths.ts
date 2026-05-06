export const DRAFTPATH  = {
    getPickedArtifact: (userId: string) => `.players.${userId}.draft.pickedArtifact`,
    getArtifactPath: (userId: string, artifactId: string) => `.players.${userId}.artifacts.${artifactId}`,
};