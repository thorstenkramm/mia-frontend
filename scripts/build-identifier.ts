const packageVersionPattern = /^\d+\.\d+\.\d+$/;
const gitRevisionPattern = /^[0-9a-f]{40}$/;

export function createBuildIdentifier(
  packageVersion: string,
  buildRevision: string | undefined,
) {
  if (!packageVersionPattern.test(packageVersion)) {
    throw new Error("The package version must be a semantic version.");
  }

  if (buildRevision === undefined || !gitRevisionPattern.test(buildRevision)) {
    throw new Error(
      "BUILD_REVISION must be the full lowercase Git commit revision.",
    );
  }

  return `${packageVersion}+${buildRevision}`;
}
