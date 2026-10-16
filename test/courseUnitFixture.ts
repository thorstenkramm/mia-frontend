import { randomUUID } from "node:crypto";

export function courseUnitFixture() {
  return {
    name: `course-${randomUUID()}`,
    username: `supervisor.${randomUUID().slice(0, 12)}`,
    csrf: randomUUID(),
    rawError: `body-${randomUUID()}`,
    teachingText: `teaching-${randomUUID()}`,
  };
}
