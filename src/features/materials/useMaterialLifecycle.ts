import {
  useActionState,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useIntl } from "react-intl";
import {
  approveMaterial,
  getMaterial,
  isHiddenMaterialFailure,
  listMaterialFiles,
  listMaterialJobs,
  revokeMaterialApproval,
  updateMaterialBrief,
  type Material,
  type MaterialFile,
  type MaterialJobPage,
} from "../../platform/api/materials";
import {
  briefErrors,
  sameBrief,
  type MaterialBrief,
  type BriefError,
} from "../../platform/api/materialBrief";
import {
  getCoursePreparation,
  isHiddenCourseFailure,
  type CoursePreparation,
} from "../../platform/api/courses";
import type { EntryApiFailure } from "../../platform/api/entry";
import {
  useMaterialUpload,
  useSessionActions,
} from "../../platform/data/EntryDataProvider";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { messages } from "../../platform/i18n/messages";
import { useRouteActivity } from "../../platform/ui/useRouteActivity";
import { useUnsavedInputGuard } from "../../platform/ui/routeDeparture";

type LifecycleState =
  | {
      readonly kind:
        | "Clean"
        | "Dirty sensitive"
        | "Save accepted"
        | "Read matches submit"
        | "Post-save newer"
        | "Rejected"
        | "State changed";
    }
  | { readonly kind: "Confirming" | "Checking" }
  | {
      readonly kind:
        "Save submitting" | "Save outcome unknown" | "Read differs";
      readonly submitted: MaterialBrief | null;
    }
  | {
      readonly kind: "Reconciling form";
      readonly previous: Exclude<LifecycleState, { kind: "Reconciling form" }>;
    };
type Mode = "brief" | "approval" | "revoke" | "processing";
const readinessLabels = {
  inactive_incomplete: messages.preparationIncomplete,
  inactive_activatable: messages.preparationActivatable,
  active_accepting: messages.preparationAccepting,
  active_not_accepting: messages.preparationBlocked,
} as const;
function reviewIdentity(material: Material): string {
  return JSON.stringify([
    material.id,
    material.courseId,
    material.scope,
    material.state,
    material.format,
    material.approved,
    material.brief,
    material.brief_updated_at,
    material.updated_at,
    material.approved_at,
  ]);
}

// Machine 11/18/22/23 route-memory owner. Unsafe outcomes are never replayed.
export function useMaterialLifecycle(
  initial: Material,
  mode: Mode,
  unavailable: (failure: EntryApiFailure | null) => void,
  initialFiles: readonly MaterialFile[] = [],
  initialJobs: MaterialJobPage | null = null,
  onRevokeConfirmed?: () => void,
) {
  const intl = useIntl();
  const { announce, clear } = useAnnouncer();
  const actions = useSessionActions();
  const transfer = useMaterialUpload();
  const [material, setMaterial] = useState<Material | null>(initial);
  const applied = useRef<Material | null>(initial);
  const [draft, setDraft] = useState<MaterialBrief | null>(initial.brief);
  const draftRef = useRef<MaterialBrief | null>(initial.brief);
  const [files, setFiles] = useState(initialFiles);
  const [jobs, setJobs] = useState(initialJobs);
  const [offset, setOffset] = useState(0);
  const [checkedAt, setCheckedAt] = useState(Date.now);
  const [readiness, setReadiness] = useState<CoursePreparation | null>(null);
  const [readinessFailed, setReadinessFailed] = useState(false);
  const [error, setError] = useState<EntryApiFailure | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<readonly BriefError[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const acknowledgement = useRef(false);
  const control = useRef<HTMLTextAreaElement | null>(null);
  const statusTarget = useRef<HTMLParagraphElement | null>(null);
  const heading = useRef<HTMLHeadingElement | null>(null);
  const liveAttempt = useRef<symbol | null>(null);
  const active = useRef(true);
  const readinessAttempt = useRef<symbol | null>(null);
  const observedJobs = useRef(
    new Map(initialJobs?.items.map((job) => [job.id, job.state])),
  );
  const revokedLedger = useRef(new Set<string>());
  const { state, stateRef, update, mounted } = useRouteActivity<LifecycleState>(
    { kind: "Clean" },
  );
  const current = (attempt: symbol) =>
    mounted.current && active.current && liveAttempt.current === attempt;
  const setAck = (value: boolean) => {
    acknowledgement.current = value;
    setAcknowledged(value);
  };
  const setInput = (value: MaterialBrief | null) => {
    draftRef.current = value;
    setDraft(value);
  };
  const release = () => {
    active.current = false;
    liveAttempt.current = null;
    readinessAttempt.current = null;
    observedJobs.current.clear();
    applied.current = null;
    draftRef.current = null;
    revokedLedger.current.clear();
    acknowledgement.current = false;
    update({ kind: "Clean" });
    setMaterial(null);
    setDraft(null);
    setFiles([]);
    setJobs(null);
    setReadiness(null);
    setError(null);
    setFeedback(null);
    setInvalid([]);
    setAcknowledged(false);
    clear();
  };
  const teardown = useEffectEvent(release);
  useLayoutEffect(() => {
    // The transfer/session owner supplies synchronous security teardown; this is
    // registration only, not a second session or route-admission mechanism.
    active.current = true;
    applied.current = initial;
    draftRef.current = initial.brief;
    setMaterial(initial);
    setDraft(initial.brief);
    observedJobs.current = new Map(
      initialJobs?.items.map((job) => [job.id, job.state]),
    );
    const hide = () => teardown();
    const unregister = transfer.registerRouteTeardown(hide);
    window.addEventListener("pagehide", hide);
    return () => {
      unregister();
      window.removeEventListener("pagehide", hide);
      hide();
    };
  }, [transfer, initial, initialJobs]);
  const deny = (failure: EntryApiFailure) => {
    if (
      !mounted.current ||
      !active.current ||
      (!isHiddenMaterialFailure(failure) && !isHiddenCourseFailure(failure))
    )
      return false;
    release();
    unavailable(failure);
    return true;
  };
  const install = (value: Material, urgent = false): string | null => {
    const before = applied.current;
    if (before && reviewIdentity(before) !== reviewIdentity(value)) {
      readinessAttempt.current = null;
      setReadiness(null);
      setReadinessFailed(false);
    }
    let announcement: string | null = null;
    if (before?.approved && !value.approved) {
      const key = JSON.stringify([
        value.id,
        value.updated_at,
        value.brief_updated_at,
        value.approved_at,
      ]);
      if (!revokedLedger.current.has(key)) {
        revokedLedger.current.add(key);
        announcement = intl.formatMessage(messages.materialRevoked);
        if (urgent) statusTarget.current?.focus();
      }
    } else if (before?.state !== value.state)
      announcement = intl.formatMessage(
        value.state === "failed"
          ? messages.materialProcessingFailure
          : value.state === "ready"
            ? messages.materialReady
            : value.state === "processing"
              ? messages.materialProcessing
              : messages.materialDraft,
      );
    applied.current = value;
    setMaterial(value);
    setCheckedAt(Date.now());
    return announcement;
  };
  const eligible =
    material !== null &&
    material.scope === "course-wide" &&
    material.state === "ready" &&
    material.brief !== null;
  const dirty = !sameBrief(draft, material?.brief ?? null);
  const unknown =
    state.kind === "Save outcome unknown" || state.kind === "Read differs";
  const [, action, pending] = useActionState(async () => {
    const before = applied.current;
    if (
      !before ||
      liveAttempt.current !== null ||
      stateRef.current.kind === "Save outcome unknown" ||
      stateRef.current.kind === "Read differs" ||
      stateRef.current.kind === "Reconciling form"
    )
      return;
    if (before.state !== "ready" || before.brief === null) return;
    if (mode !== "brief" && stateRef.current.kind !== "Confirming") return;
    if (mode === "approval" && !acknowledgement.current) return;
    const submitted = mode === "brief" ? draftRef.current : null;
    if (mode === "brief" && submitted !== null) {
      const errors = briefErrors(submitted);
      setInvalid(errors);
      if (errors.length) {
        const message = intl.formatMessage(messages.materialBriefBounds);
        setFeedback(message);
        announce(message, "urgent");
        statusTarget.current?.focus();
        return;
      }
    }
    if (mode === "brief" && submitted === null) return;
    const attempt = Symbol("material-mutation");
    liveAttempt.current = attempt;
    setError(null);
    setFeedback(null);
    if (mode !== "brief") {
      update({ kind: "Checking" });
      const checked = await actions.readAuthenticated(async (signal) => {
        await getCoursePreparation(before.courseId, signal);
        return getMaterial(before.courseId, before.id, signal);
      });
      if (checked.kind === "failed" && deny(checked.failure)) return;
      if (!current(attempt)) return;
      if (checked.kind !== "completed") {
        liveAttempt.current = null;
        update({ kind: "Rejected" });
        setAck(false);
        if (checked.kind === "failed") setError(checked.failure);
        setFeedback(intl.formatMessage(messages.materialReadFailed));
        return;
      }
      if (checked.value.scope !== "course-wide") {
        release();
        unavailable(null);
        return;
      }
      if (reviewIdentity(checked.value) !== reviewIdentity(before)) {
        const transition = install(checked.value, true);
        liveAttempt.current = null;
        setAck(false);
        update({ kind: "State changed" });
        const message =
          transition ?? intl.formatMessage(messages.materialChanged);
        setFeedback(message);
        announce(message, "urgent");
        statusTarget.current?.focus();
        return;
      }
    }
    const immutable = submitted === null ? null : structuredClone(submitted);
    update({ kind: "Save submitting", submitted: immutable });
    announce(intl.formatMessage(messages.materialLifecyclePending));
    const result = await actions.runAuthenticatedMutation(
      {
        send: (csrf) =>
          mode === "brief" && immutable !== null
            ? updateMaterialBrief(before.courseId, before.id, immutable, csrf)
            : mode === "approval"
              ? approveMaterial(before.courseId, before.id, csrf)
              : revokeMaterialApproval(before.courseId, before.id, csrf),
      },
      () => current(attempt),
    );
    if (
      (result.kind === "rejected" || result.kind === "unknown") &&
      deny(result.failure)
    )
      return;
    if (!current(attempt)) return;
    liveAttempt.current = null;
    setAck(false);
    if (result.kind === "completed") {
      const transition = install(result.value);
      setInput(result.value.brief);
      update({ kind: "Save accepted" });
      const message = transition ?? intl.formatMessage(messages.materialSaved);
      setFeedback(message);
      announce(message);
      // Mutation is definitive even if this dependent readiness read fails.
      const readAttempt = Symbol("readiness");
      readinessAttempt.current = readAttempt;
      const readinessResult = await actions.readAuthenticated((signal) =>
        getCoursePreparation(before.courseId, signal),
      );
      // Stop retires ordinary results, not a current course's hidden denial.
      // deny() itself fences unmounted/inactive routes before clearing content.
      if (readinessResult.kind === "failed" && deny(readinessResult.failure))
        return;
      if (
        !mounted.current ||
        !active.current ||
        readinessAttempt.current !== readAttempt
      )
        return;
      if (readinessResult.kind === "completed") {
        setReadiness(readinessResult.value);
        setReadinessFailed(false);
        if (mode === "revoke") onRevokeConfirmed?.();
      } else if (readinessResult.kind === "failed") {
        setReadinessFailed(true);
        setError(readinessResult.failure);
      }
    } else if (result.kind === "unknown") {
      update({ kind: "Save outcome unknown", submitted: immutable });
      setError(result.failure);
      setFeedback(intl.formatMessage(messages.materialLifecycleUnknown));
      announce(intl.formatMessage(messages.materialLifecycleUnknown), "urgent");
    } else if (result.kind === "rejected" || result.kind === "not-sent") {
      update({ kind: "Rejected" });
      setError(result.failure);
      setFeedback(intl.formatMessage(messages.materialError));
      announce(intl.formatMessage(messages.materialError), "urgent");
    }
  }, undefined);
  const locked =
    pending ||
    unknown ||
    ["Save submitting", "Reconciling form", "Checking", "Confirming"].includes(
      state.kind,
    );
  const refreshLocked =
    ["Save submitting", "Reconciling form", "Checking", "Confirming"].includes(
      state.kind,
    ) ||
    (pending && liveAttempt.current !== null);
  const departure = useUnsavedInputGuard({
    dirty: dirty || unknown,
    clear: release,
    stayTarget: mode === "brief" ? control : statusTarget,
  });
  const change = (value: MaterialBrief) => {
    if (!locked) {
      setInput(value);
      update({ kind: "Dirty sensitive" });
      setInvalid([]);
      setFeedback(null);
    }
  };
  const reconcile = async (page = offset, pagination = false) => {
    const before = applied.current;
    const previous = stateRef.current;
    if (
      !before ||
      liveAttempt.current !== null ||
      previous.kind === "Reconciling form" ||
      previous.kind === "Save submitting"
    )
      return;
    const attempt = Symbol("material-refresh");
    liveAttempt.current = attempt;
    readinessAttempt.current = attempt;
    update({ kind: "Reconciling form", previous });
    const result = await actions.readAuthenticated(async (signal) => {
      const course = await getCoursePreparation(before.courseId, signal);
      const value = await getMaterial(before.courseId, before.id, signal);
      if (value.scope !== "course-wide") return null;
      if (mode !== "processing")
        return { material: value, course, files: null, jobs: null };
      return {
        material: value,
        course,
        files: await listMaterialFiles(value.id, signal),
        jobs: await listMaterialJobs(value.id, page, signal),
      };
    });
    if (result.kind === "failed" && deny(result.failure)) return;
    if (!current(attempt)) return;
    liveAttempt.current = null;
    if (result.kind === "failed") {
      setError(result.failure);
      update(previous);
      const message = intl.formatMessage(messages.materialReadFailed);
      setFeedback(message);
      announce(message, "urgent");
      return;
    }
    if (result.kind !== "completed") return;
    if (result.value === null) {
      release();
      unavailable(null);
      return;
    }
    const value = result.value.material;
    let message = install(value, acknowledgement.current);
    let urgent = value.state === "failed";
    setReadiness(result.value.course);
    setReadinessFailed(false);
    setAck(false);
    setError(null);
    if (result.value.files !== null) setFiles(result.value.files);
    if (result.value.jobs !== null) {
      for (const job of result.value.jobs.items) {
        if (
          observedJobs.current.has(job.id) &&
          observedJobs.current.get(job.id) !== job.state
        ) {
          if (job.state === "failed") urgent = true;
          const descriptor = {
            queued: messages.materialQueued,
            running: messages.materialJobRunning,
            succeeded: messages.materialJobSucceeded,
            failed: messages.materialFailed,
            cancelled: messages.materialJobCancelled,
          }[job.state];
          if (message === null || job.state === "failed")
            message = intl.formatMessage(messages.materialJobAnnouncement, {
              state: intl.formatMessage(descriptor),
            });
        }
        observedJobs.current.set(job.id, job.state);
      }
      setJobs(result.value.jobs);
      setOffset(page);
    }
    if (
      previous.kind === "Save outcome unknown" ||
      previous.kind === "Read differs"
    ) {
      if (mode === "brief" && sameBrief(value.brief, previous.submitted)) {
        setInput(value.brief);
        update({ kind: "Read matches submit" });
        setFeedback(intl.formatMessage(messages.materialMatches));
      } else if (mode === "brief") {
        update({ kind: "Read differs", submitted: previous.submitted });
        setFeedback(intl.formatMessage(messages.materialDiffers));
      } else {
        update({ kind: "State changed" });
        setFeedback(intl.formatMessage(messages.materialChanged));
      }
    } else {
      if (sameBrief(draftRef.current, before.brief)) setInput(value.brief);
      update({ kind: "Post-save newer" });
      setFeedback(message);
    }
    if (message !== null) announce(message, urgent ? "urgent" : "polite");
    if (pagination) heading.current?.focus();
  };
  const confirm = () => {
    if (eligible && !locked && (mode !== "approval" || acknowledgement.current))
      update({ kind: "Confirming" });
  };
  const cancel = () => {
    if (stateRef.current.kind === "Confirming") update({ kind: "Clean" });
  };
  const stop = () => {
    liveAttempt.current = null;
    readinessAttempt.current = null;
    const previous = stateRef.current;
    if (previous.kind === "Save submitting") {
      update({ kind: "Save outcome unknown", submitted: previous.submitted });
      setFeedback(intl.formatMessage(messages.materialLifecycleUnknown));
      announce(intl.formatMessage(messages.materialLifecycleUnknown), "urgent");
    } else if (previous.kind === "Reconciling form") update(previous.previous);
    else if (previous.kind === "Checking") update({ kind: "Clean" });
  };
  const useCurrent = () => {
    if (
      !pending &&
      stateRef.current.kind !== "Save submitting" &&
      stateRef.current.kind !== "Reconciling form"
    ) {
      setInput(applied.current?.brief ?? null);
      update({ kind: "Clean" });
      setFeedback(null);
      setInvalid([]);
      control.current?.focus();
    }
  };
  return {
    material,
    draft,
    files,
    jobs,
    checkedAt,
    readinessMessage: readiness
      ? readinessLabels[readiness.readiness.state]
      : null,
    readinessFailed,
    state,
    action,
    pending,
    locked,
    refreshLocked,
    dirty,
    eligible,
    acknowledged,
    setAck,
    control,
    statusTarget,
    heading,
    departure,
    error,
    feedback,
    invalid,
    change,
    reconcile,
    confirm,
    cancel,
    stop,
    useCurrent,
  };
}
