import { defineMessages } from "react-intl";

export const messages = defineMessages({
  preparationBackToHub: {
    id: "preparation.backToHub",
    defaultMessage: "Back to course preparation",
  },
  readinessPanelBlockedHeading: {
    id: "readiness.panel.blocked.heading",
    defaultMessage: "Activation unavailable",
  },
  readinessPanelBlockedBody: {
    id: "readiness.panel.blocked.body",
    defaultMessage:
      "MIA reports {count, plural, one {# unmet prerequisite} other {# unmet prerequisites}} for this course. Resolve them, then check again here.",
  },
  readinessPanelEligibleHeading: {
    id: "readiness.panel.eligible.heading",
    defaultMessage: "Ready for activation",
  },
  readinessPanelEligibleBody: {
    id: "readiness.panel.eligible.body",
    defaultMessage:
      "MIA reports no unmet prerequisites. Activation is a separate step: on the next page you see what changes before you confirm.",
  },
  readinessPanelEligibleAction: {
    id: "readiness.panel.eligible.action",
    defaultMessage: "Continue to activation",
  },
  readinessUnmetHeading: {
    id: "readiness.unmet.heading",
    defaultMessage: "Unmet prerequisites",
  },
  readinessHowHeading: {
    id: "readiness.how.heading",
    defaultMessage: "How course readiness works",
  },
  readinessHowIntro: {
    id: "readiness.how.intro",
    defaultMessage:
      "MIA evaluates readiness from the current course whenever this page loads or you refresh it. Activation needs all of the following:",
  },
  readinessHowGoals: {
    id: "readiness.how.requirement.goals",
    defaultMessage: "Learning goals",
  },
  readinessHowInstructions: {
    id: "readiness.how.requirement.instructions",
    defaultMessage: "AI instructions",
  },
  readinessHowLanguage: {
    id: "readiness.how.requirement.language",
    defaultMessage: "A valid course language",
  },
  readinessHowSupervisor: {
    id: "readiness.how.requirement.supervisor",
    defaultMessage: "At least one assigned supervisor",
  },
  readinessHowMaterial: {
    id: "readiness.how.requirement.material",
    defaultMessage:
      "At least one course-wide material with files that is technically ready and educationally approved",
  },
  readinessHowTechnicalHeading: {
    id: "readiness.how.technical.heading",
    defaultMessage: "Technical readiness",
  },
  readinessHowTechnicalBody: {
    id: "readiness.how.technical.body",
    defaultMessage:
      "When you finalize a material, MIA processes its files. The material is technically ready once processing has finished. If processing fails, the material stays unusable until you correct the draft and finalize it again.",
  },
  readinessHowApprovalHeading: {
    id: "readiness.how.approval.heading",
    defaultMessage: "Educational approval",
  },
  readinessHowApprovalBody: {
    id: "readiness.how.approval.body",
    defaultMessage:
      "You review the generated brief and approve the material for teaching. Approval is separate from processing. A meaningful change to an approved brief removes the approval. Link materials such as websites or videos do not count.",
  },
  activationFormHeading: {
    id: "activation.form.heading",
    defaultMessage: "Activate {courseName}",
  },
  activationFormIntro: {
    id: "activation.form.intro",
    defaultMessage: "Check that this is the course you mean.",
  },
  activationFormCourse: {
    id: "activation.form.course",
    defaultMessage: "Course",
  },
  activationFormState: {
    id: "activation.form.state",
    defaultMessage: "Current state",
  },
  activationFormPrerequisites: {
    id: "activation.form.prerequisites",
    defaultMessage: "Unmet prerequisites",
  },
  activationFormNoneReported: {
    id: "activation.form.noneReported",
    defaultMessage: "None reported",
  },
  activationFormChangesHeading: {
    id: "activation.form.changesHeading",
    defaultMessage: "What changes",
  },
  activationFormChange1: {
    id: "activation.form.change1",
    defaultMessage: "The course becomes active.",
  },
  activationFormChange2: {
    id: "activation.form.change2",
    defaultMessage:
      "Students in the course can start tutoring sessions, as long as the course stays ready.",
  },
  activationFormChange3: {
    id: "activation.form.change3",
    defaultMessage: "You can add students to the course.",
  },
  activationFormPrecheck: {
    id: "activation.form.precheck",
    defaultMessage:
      "MIA checks the course once more right before activating it. If anything changed, you review it again first.",
  },
  activationCancel: { id: "activation.cancel", defaultMessage: "Cancel" },
  activationConfirmPending: {
    id: "activation.confirmPending",
    defaultMessage: "Activating…",
  },
  activationChangedHeading: {
    id: "activation.changed.heading",
    defaultMessage: "Course facts changed",
  },
  activationChangedBody: {
    id: "activation.changed.body",
    defaultMessage:
      "Review the current course before confirming again. The details below show the latest state.",
  },
  activationBadgeChanged: {
    id: "activation.badge.changed",
    defaultMessage: "Changed",
  },
  activationRejectedHeading: {
    id: "activation.rejected.heading",
    defaultMessage: "Activation was not accepted",
  },
  activationRejectedBody: {
    id: "activation.rejected.body",
    defaultMessage:
      "The course is still inactive. Refresh current readiness before confirming again.",
  },
  activationRejectedAction: {
    id: "activation.rejected.action",
    defaultMessage: "Review current readiness",
  },
  activationUnknownHeading: {
    id: "activation.unknown.heading",
    defaultMessage: "Activation outcome unknown",
  },
  activationUnknownBody: {
    id: "activation.unknown.body",
    defaultMessage:
      "MIA did not confirm whether this attempt went through. Refresh to see the current course; that shows its state now, not what happened to this attempt.",
  },
  activationUnknownRefresh: {
    id: "activation.unknown.refresh",
    defaultMessage: "Refresh course",
  },
  activationUnknownNote: {
    id: "activation.unknown.note",
    defaultMessage:
      "Abandoning or leaving this page only drops this page's record of the attempt. It does not cancel anything on the server.",
  },
  activationUnavailableHeading: {
    id: "activation.unavailable.heading",
    defaultMessage: "Activation is unavailable",
  },
  activationUnavailableBody: {
    id: "activation.unavailable.body",
    defaultMessage:
      "MIA currently reports unmet prerequisites for {courseName}. Review current readiness and resolve the reported items.",
  },
  activationUnavailableAction: {
    id: "activation.unavailable.action",
    defaultMessage: "Go to course readiness",
  },

  learnGroup: { id: "learn.group", defaultMessage: "Learn" },
  learnMore: { id: "learn.more", defaultMessage: "Check more joined courses" },
  learnCoursesTitle: {
    id: "learn.coursesTitle",
    defaultMessage: "Courses | MIA",
  },
  learnCourses: { id: "learn.courses", defaultMessage: "Joined courses" },
  learnCourseTitle: { id: "learn.courseTitle", defaultMessage: "Course | MIA" },
  learnCourse: { id: "learn.course", defaultMessage: "Course" },
  learnMaterialsTitle: {
    id: "learn.materialsTitle",
    defaultMessage: "Course materials | MIA",
  },
  learnMaterials: { id: "learn.materials", defaultMessage: "Course materials" },
  learnAcceptance: {
    id: "learn.acceptance",
    defaultMessage: "New tutoring sessions",
  },
  learnAccepting: {
    id: "learn.accepting",
    defaultMessage: "Accepting new sessions",
  },
  learnNotAccepting: {
    id: "learn.notAccepting",
    defaultMessage: "Not accepting new sessions",
  },
  learnEmpty: {
    id: "learn.empty",
    defaultMessage: "No joined active courses were found.",
  },
  learnBatchEmpty: {
    id: "learn.batchEmpty",
    defaultMessage:
      "No active courses in the checked batch. More joined courses remain to check.",
  },
  learnMaterialsEmpty: {
    id: "learn.materialsEmpty",
    defaultMessage: "No approved course material metadata on this page.",
  },
  learnCollectionUpdated: {
    id: "learn.collectionUpdated",
    defaultMessage: "Collection updated.",
  },
  tutoringStartLink: {
    id: "tutoring.startLink",
    defaultMessage: "Start a tutoring session",
  },
  tutoringResumeLink: {
    id: "tutoring.resumeLink",
    defaultMessage: "Resume tutoring",
  },
  tutoringStartTitle: {
    id: "tutoring.startTitle",
    defaultMessage: "Start a tutoring session | MIA",
  },
  tutoringStartHeading: {
    id: "tutoring.startHeading",
    defaultMessage: "Start a tutoring session",
  },
  tutoringMaterialTitle: {
    id: "tutoring.materialTitle",
    defaultMessage: "Choose material | MIA",
  },
  tutoringMaterialHeading: {
    id: "tutoring.materialHeading",
    defaultMessage: "Choose material",
  },
  tutoringRecoveryTitle: {
    id: "tutoring.recoveryTitle",
    defaultMessage: "Resume tutoring | MIA",
  },
  tutoringRecoveryHeading: {
    id: "tutoring.recoveryHeading",
    defaultMessage: "Resume tutoring",
  },
  tutoringWorkspaceTitle: {
    id: "tutoring.workspaceTitle",
    defaultMessage: "Tutoring session | MIA",
  },
  tutoringWorkspaceHeading: {
    id: "tutoring.workspaceHeading",
    defaultMessage: "Tutoring session",
  },
  tutoringNoticeHeading: {
    id: "tutoring.noticeHeading",
    defaultMessage: "AI tutoring",
  },
  // FFR-613: fixed product copy in every launch locale; informational, never
  // operator-configured and never a warning against speaking freely.
  tutoringNoticeBody: {
    id: "tutoring.noticeBody",
    defaultMessage:
      "MIA's tutor is AI-powered. No person watches your session while it happens. Your assigned supervisor can read the session after you finish.",
  },
  tutoringResumeActive: {
    id: "tutoring.resumeActive",
    defaultMessage: "You already have an active tutoring session in {course}.",
  },
  tutoringResumeHelp: {
    id: "tutoring.resumeHelp",
    defaultMessage:
      "Only one tutoring session can be active. Continue the current session to keep working.",
  },
  tutoringContinueSession: {
    id: "tutoring.continueSession",
    defaultMessage: "Continue session",
  },
  tutoringChooseCourse: {
    id: "tutoring.chooseCourse",
    defaultMessage: "Choose a course",
  },
  tutoringActiveSession: {
    id: "tutoring.activeSession",
    defaultMessage: "You already have an active tutoring session.",
  },
  tutoringMaterialLegend: {
    id: "tutoring.materialLegend",
    defaultMessage: "Course material (optional)",
  },
  tutoringMaterialHelp: {
    id: "tutoring.materialHelp",
    defaultMessage:
      "Choose at most one approved course material for the tutor, or start without material.",
  },
  tutoringNoMaterial: {
    id: "tutoring.noMaterial",
    defaultMessage: "No material",
  },
  tutoringStart: {
    id: "tutoring.start",
    defaultMessage: "Start session",
  },
  tutoringChecking: {
    id: "tutoring.checking",
    defaultMessage: "Checking current course and session state…",
  },
  tutoringStarting: {
    id: "tutoring.starting",
    defaultMessage: "Starting the tutoring session…",
  },
  tutoringStartRejected: {
    id: "tutoring.startRejected",
    defaultMessage:
      "The session was not started. Review the current course and material choice before trying again; a new attempt is a fresh start.",
  },
  tutoringStartChanged: {
    id: "tutoring.startChanged",
    defaultMessage:
      "Course or session state changed. Review the current state before starting.",
  },
  tutoringStartConflict: {
    id: "tutoring.startConflict",
    defaultMessage:
      "A tutoring session is already active or this attempt conflicts. Resume the active session; nothing else was started here.",
  },
  tutoringStartUnknown: {
    id: "tutoring.startUnknown",
    defaultMessage:
      "The start outcome is unknown. The session may have been created. Reconcile checks the current state; this attempt is never repeated automatically.",
  },
  tutoringRetry: {
    id: "tutoring.retry",
    defaultMessage: "Retry exact attempt",
  },
  tutoringStartAbandon: {
    id: "tutoring.startAbandon",
    defaultMessage: "Abandon unknown attempt",
  },
  tutoringStartAbandoned: {
    id: "tutoring.startAbandoned",
    defaultMessage:
      "The unknown attempt was abandoned locally, not cancelled on the server. Review the current state before a new attempt.",
  },
  tutoringStartLeave: {
    id: "tutoring.startLeave",
    defaultMessage:
      "A session start is pending or unconfirmed. Leaving drops this page’s attempt record; it does not cancel server work.",
  },
  tutoringRecoveryNone: {
    id: "tutoring.recoveryNone",
    defaultMessage: "No active tutoring session was found.",
  },
  tutoringTranscript: {
    id: "tutoring.transcript",
    defaultMessage: "Transcript",
  },
  tutoringTurn: {
    id: "tutoring.turn",
    defaultMessage: "Turn {number}",
  },
  tutoringTranscriptEmpty: {
    id: "tutoring.transcriptEmpty",
    defaultMessage: "No messages yet.",
  },
  tutoringTurnYou: {
    id: "tutoring.turnYou",
    defaultMessage: "You",
  },
  tutoringTurnTutor: {
    id: "tutoring.turnTutor",
    defaultMessage: "AI tutor",
  },
  tutoringResponseQueued: {
    id: "tutoring.responseQueued",
    defaultMessage: "Response queued",
  },
  tutoringResponseGenerating: {
    id: "tutoring.responseGenerating",
    defaultMessage: "Response in progress",
  },
  tutoringResponseInterrupted: {
    id: "tutoring.responseInterrupted",
    defaultMessage: "Response interrupted",
  },
  tutoringResponseFailed: {
    id: "tutoring.responseFailed",
    defaultMessage: "Response failed",
  },
  tutoringStopResponse: {
    id: "tutoring.stopResponse",
    defaultMessage: "Stop response",
  },
  tutoringStopUnknown: {
    id: "tutoring.stopUnknown",
    defaultMessage:
      "Stop outcome unknown. Check the saved response before acting again.",
  },
  tutoringResponseRetryUnknown: {
    id: "tutoring.responseRetryUnknown",
    defaultMessage:
      "Retry outcome unknown. Check current work; only an explicit exact re-retry sends again.",
  },
  tutoringActionRejected: {
    id: "tutoring.actionRejected",
    defaultMessage: "The response action was not accepted. Check current work.",
  },
  tutoringResponseStopped: {
    id: "tutoring.responseStopped",
    defaultMessage: "Tutor response stopped.",
  },
  tutoringResponseRetryQueued: {
    id: "tutoring.responseRetryQueued",
    defaultMessage: "Linked response queued.",
  },
  tutoringTryNow: { id: "tutoring.tryNow", defaultMessage: "Try now" },
  tutoringResumeRetries: {
    id: "tutoring.resumeRetries",
    defaultMessage: "Resume retries",
  },
  tutoringReconnectAvailable: {
    id: "tutoring.reconnectAvailable",
    defaultMessage: "Reconnect available",
  },
  tutoringRetriesExhausted: {
    id: "tutoring.retriesExhausted",
    defaultMessage: "Reconnect attempts exhausted",
  },
  tutoringStreamLost: {
    id: "tutoring.streamLost",
    defaultMessage: "Connection lost. Response may continue; text unconfirmed.",
  },
  tutoringStreamInvalid: {
    id: "tutoring.streamInvalid",
    defaultMessage: "Stream invalid. Text unconfirmed.",
  },
  tutoringFinalPending: {
    id: "tutoring.finalPending",
    defaultMessage: "Checking saved response…",
  },
  tutoringFinalUnconfirmed: {
    id: "tutoring.finalUnconfirmed",
    defaultMessage: "Saved response unconfirmed.",
  },
  tutoringResponseComplete: {
    id: "tutoring.responseComplete",
    defaultMessage: "Tutor response complete.",
  },
  tutoringPauseUpdates: {
    id: "tutoring.pauseUpdates",
    defaultMessage: "Pause transcript updates",
  },
  tutoringResumeUpdates: {
    id: "tutoring.resumeUpdates",
    defaultMessage: "Resume transcript updates",
  },
  tutoringNewContent: {
    id: "tutoring.newContent",
    defaultMessage: "New tutor content",
  },
  tutoringViewFinal: {
    id: "tutoring.viewFinal",
    defaultMessage: "View final response",
  },
  tutoringSessionFinished: {
    id: "tutoring.sessionFinished",
    defaultMessage: "This tutoring session is finished.",
  },
  tutoringFinishTitle: {
    id: "tutoring.finishTitle",
    defaultMessage: "Finish tutoring session | MIA",
  },
  tutoringFinishHeading: {
    id: "tutoring.finishHeading",
    defaultMessage: "Finish session",
  },
  tutoringFinishReview: {
    id: "tutoring.finishReview",
    defaultMessage: "Review Finish",
  },
  tutoringFinishCheckOutcome: {
    id: "tutoring.finishCheckOutcome",
    defaultMessage: "Check Finish outcome",
  },
  tutoringFinishConfirm: {
    id: "tutoring.finishConfirm",
    defaultMessage: "Confirm Finish",
  },
  tutoringFinishCancel: {
    id: "tutoring.finishCancel",
    defaultMessage: "Cancel",
  },
  tutoringFinishConsequence: {
    id: "tutoring.finishConsequence",
    defaultMessage:
      "Finishing ends this session. You can read the saved transcript and start another permitted session.",
  },
  tutoringFinishUnavailable: {
    id: "tutoring.finishUnavailable",
    defaultMessage:
      "Finish is unavailable while tutoring work is in flight or eligibility cannot be confirmed. Check the current work before trying again.",
  },
  tutoringFinishChanged: {
    id: "tutoring.finishChanged",
    defaultMessage:
      "Tutoring work changed. Review the current state before confirming Finish.",
  },
  tutoringFinishUnknown: {
    id: "tutoring.finishUnknown",
    defaultMessage:
      "The finish outcome is unknown. Refresh to check the session. Finish was not repeated.",
  },
  tutoringFinishing: {
    id: "tutoring.finishing",
    defaultMessage: "Finishing the session…",
  },
  tutoringUnavailableTitle: {
    id: "tutoring.unavailableTitle",
    defaultMessage: "Tutoring access unavailable | MIA",
  },
  tutoringUnavailableHeading: {
    id: "tutoring.unavailableHeading",
    defaultMessage: "Tutoring access unavailable",
  },
  tutoringUnavailableBody: {
    id: "tutoring.unavailableBody",
    defaultMessage: "This tutoring view is unavailable. Use an available exit.",
  },
  tutoringCheckFailed: {
    id: "tutoring.checkFailed",
    defaultMessage:
      "The tutoring check could not be completed. This is not an empty result.",
  },
  tutoringIntentTitle: {
    id: "tutoring.intentTitle",
    defaultMessage: "Choose how to begin | MIA",
  },
  tutoringIntentHeading: {
    id: "tutoring.intentHeading",
    defaultMessage: "Choose how to begin",
  },
  tutoringIntentHelp: {
    id: "tutoring.intentHelp",
    defaultMessage:
      "Write your first message to the tutor, or choose a suggestion to insert editable text. Nothing is sent until you choose Start session.",
  },
  tutoringStarters: {
    id: "tutoring.starters",
    defaultMessage: "Suggestions",
  },
  // FFR-611: five frontend-owned static starters. Each inserts editable
  // localized text or guides the next step; none ever submits.
  tutoringStarterHomework: {
    id: "tutoring.starterHomework",
    defaultMessage: "Homework help",
  },
  tutoringStarterHomeworkText: {
    id: "tutoring.starterHomeworkText",
    defaultMessage: "I need help with my homework:",
  },
  tutoringStarterPractice: {
    id: "tutoring.starterPractice",
    defaultMessage: "Topic practice",
  },
  tutoringStarterPracticeText: {
    id: "tutoring.starterPracticeText",
    defaultMessage: "I want to practice this topic:",
  },
  tutoringStarterExplain: {
    id: "tutoring.starterExplain",
    defaultMessage: "Explanation",
  },
  tutoringStarterExplainText: {
    id: "tutoring.starterExplainText",
    defaultMessage: "Please explain this to me:",
  },
  tutoringStarterExam: {
    id: "tutoring.starterExam",
    defaultMessage: "Exam preparation",
  },
  tutoringStarterExamText: {
    id: "tutoring.starterExamText",
    defaultMessage: "Help me prepare for an exam on:",
  },
  tutoringStarterFreeform: {
    id: "tutoring.starterFreeform",
    defaultMessage: "Free-form question",
  },
  tutoringMaterialContinue: {
    id: "tutoring.materialContinue",
    defaultMessage: "Continue",
  },
  tutoringComposerHeading: {
    id: "tutoring.composerHeading",
    defaultMessage: "Write a message",
  },
  tutoringComposerLabel: {
    id: "tutoring.composerLabel",
    defaultMessage: "Your message to the tutor",
  },
  tutoringMessageBounds: {
    id: "tutoring.messageBounds",
    defaultMessage:
      "1 to 8,000 characters and at most 32 KiB of UTF-8 text. Enter adds a new line.",
  },
  tutoringMessageRequired: {
    id: "tutoring.messageRequired",
    defaultMessage: "Enter a message first.",
  },
  tutoringMessageTooLong: {
    id: "tutoring.messageTooLong",
    defaultMessage:
      "Shorten the message to at most 8,000 characters and 32 KiB of UTF-8 text.",
  },
  tutoringSending: {
    id: "tutoring.sending",
    defaultMessage: "Sending your message…",
  },
  tutoringSendRejected: {
    id: "tutoring.sendRejected",
    defaultMessage:
      "The message was not sent. Review the message and current state before trying again; a new attempt is a fresh send.",
  },
  tutoringSendUnknown: {
    id: "tutoring.sendUnknown",
    defaultMessage:
      "The message outcome is unknown. The message may have been sent. Reconcile checks the current state; this attempt is never repeated automatically.",
  },
  tutoringSendBusy: {
    id: "tutoring.sendBusy",
    defaultMessage:
      "The tutor is busy with other work right now. Your draft stays unchanged. Refresh the current state before sending.",
  },
  tutoringSendConflict: {
    id: "tutoring.sendConflict",
    defaultMessage:
      "This attempt conflicts with committed work. Reconcile to review the current state; the conflicting attempt is discarded and never resent.",
  },
  tutoringSendAbandoned: {
    id: "tutoring.sendAbandoned",
    defaultMessage:
      "The unknown attempt was abandoned locally, not cancelled on the server. Review the current state before a new attempt.",
  },
  tutoringSendLeave: {
    id: "tutoring.sendLeave",
    defaultMessage:
      "A message send is pending or unconfirmed. Leaving drops this page’s attempt record; it does not cancel server work.",
  },
  tutoringSessionReady: {
    id: "tutoring.sessionReady",
    defaultMessage:
      "The session exists and your message was not sent yet. Choose Start session to send it.",
  },
  tutoringWorkUnknown: {
    id: "tutoring.workUnknown",
    defaultMessage:
      "Your message was sent, but the current work state could not be read. Refresh to check the current state.",
  },
  // AC-013 seed: polite, deduped per response ID for the page lifetime.
  tutoringMessageQueued: {
    id: "tutoring.messageQueued",
    defaultMessage: "Message queued.",
  },
  tutoringCurrentWork: {
    id: "tutoring.currentWork",
    defaultMessage: "Current work",
  },
  tutoringAttempt: {
    id: "tutoring.attempt",
    defaultMessage: "Attempt {number}",
  },
  tutoringSend: {
    id: "tutoring.send",
    defaultMessage: "Send",
  },
  tutoringQueueMessage: {
    id: "tutoring.queueMessage",
    defaultMessage: "Queue message",
  },
  tutoringDraftDiscard: {
    id: "tutoring.draftDiscard",
    defaultMessage: "Discard the unsent message?",
  },
  tutoringDraftLeaveHelp: {
    id: "tutoring.draftLeaveHelp",
    defaultMessage:
      "Leaving discards the unsent message. It stays only in this page’s memory and is never saved; nothing will be restored when you return.",
  },
  studentListTitle: {
    id: "students.listTitle",
    defaultMessage: "Course students | MIA",
  },
  studentList: { id: "students.list", defaultMessage: "Course students" },
  studentCreateTitle: {
    id: "students.createTitle",
    defaultMessage: "Create student | MIA",
  },
  studentCreate: { id: "students.create", defaultMessage: "Create student" },
  studentMembershipTitle: {
    id: "students.membershipTitle",
    defaultMessage: "Student membership | MIA",
  },
  studentMembership: {
    id: "students.membership",
    defaultMessage: "Student membership",
  },
  studentJoined: { id: "students.joined", defaultMessage: "Joined" },
  studentEmpty: {
    id: "students.empty",
    defaultMessage: "No student memberships on this page.",
  },
  studentChoose: {
    id: "students.choose",
    defaultMessage: "Choose for the student",
  },
  studentTemporaryPassword: {
    id: "students.password",
    defaultMessage: "Temporary password",
  },
  studentPasswordConfirmation: {
    id: "students.confirmation",
    defaultMessage: "Confirm temporary password",
  },
  studentPasswordReveal: {
    id: "students.reveal",
    defaultMessage: "Show temporary password",
  },
  studentPasswordHide: {
    id: "students.hide",
    defaultMessage: "Hide temporary password",
  },
  studentConfirmationReveal: {
    id: "students.confirmationReveal",
    defaultMessage: "Show temporary password confirmation",
  },
  studentConfirmationHide: {
    id: "students.confirmationHide",
    defaultMessage: "Hide temporary password confirmation",
  },
  studentHandoff: {
    id: "students.handoff",
    defaultMessage:
      "Communicate the chosen username and temporary password to the student outside MIA. MIA will not return them or provide a copy action. The student must replace the temporary password at first sign-in before other authenticated use.",
  },
  studentChecking: {
    id: "students.checking",
    defaultMessage: "Checking current course before creation…",
  },
  studentSubmitting: {
    id: "students.submitting",
    defaultMessage: "Creating student…",
  },
  studentCreated: {
    id: "students.created",
    defaultMessage: "Student created and added to the course.",
  },
  studentInvalid: {
    id: "students.invalid",
    defaultMessage:
      "Check the username, password and all required student choices before submitting.",
  },
  studentUsernameInvalid: {
    id: "students.username.invalid",
    defaultMessage:
      "Choose a username with 3 to 32 letters A–Z, digits, periods, underscores, or hyphens. Start and end with a letter or digit.",
  },
  studentLanguageMissing: {
    id: "students.language.missing",
    defaultMessage: "Choose the student's language.",
  },
  studentCountryMissing: {
    id: "students.country.missing",
    defaultMessage: "Choose the student's country.",
  },
  studentTimeZoneMissing: {
    id: "students.timeZone.missing",
    defaultMessage: "Choose the student's time zone.",
  },
  studentNotSent: {
    id: "students.notSent",
    defaultMessage:
      "Creation was not sent. Review the form before a new submission.",
  },
  studentInactive: {
    id: "students.inactive",
    defaultMessage:
      "The course is inactive. Student creation is unavailable. Check current course state before continuing.",
  },
  studentCheckRequired: {
    id: "students.checkRequired",
    defaultMessage:
      "Check current course state before continuing with a blank form.",
  },
  studentUnknown: {
    id: "students.unknown",
    defaultMessage: "Student creation is unconfirmed",
  },
  studentUnknownHelp: {
    id: "students.unknownHelp",
    defaultMessage:
      "An account and membership may have been created. The chosen credentials have been discarded. Refresh to review one current roster page; it cannot confirm this attempt or prove absence.",
  },
  studentUnconfirmed: {
    id: "students.unconfirmed",
    defaultMessage:
      "This attempt remains unconfirmed. Starting a new blank form may create another account; the earlier creation may already have occurred.",
  },
  studentAbandon: {
    id: "students.abandon",
    defaultMessage: "Abandon unconfirmed attempt and start a new blank form",
  },
  studentUnsaved: {
    id: "students.unsaved",
    defaultMessage: "Discard student credentials?",
  },
  studentDiscardHelp: {
    id: "students.discardHelp",
    defaultMessage:
      "Leaving discards all chosen student fields and credentials. Nothing will be restored when you return.",
  },
  courseReadinessTitle: {
    id: "activation.readinessTitle",
    defaultMessage: "Course readiness | MIA",
  },
  courseReadinessHeading: {
    id: "activation.readiness",
    defaultMessage: "Course readiness",
  },
  courseActivationTitle: {
    id: "activation.title",
    defaultMessage: "Activate course | MIA",
  },
  courseActivationHeading: {
    id: "activation.heading",
    defaultMessage: "Activate course",
  },
  courseActivationConfirm: {
    id: "activation.confirm",
    defaultMessage: "Confirm activation",
  },
  courseActivationSupervisor: {
    id: "activation.supervisor",
    defaultMessage:
      "An administrator must resolve supervisor assignment. Assignment management is not available here.",
  },
  courseActivationChecking: {
    id: "activation.checking",
    defaultMessage: "Checking current course before activation…",
  },
  courseActivationSending: {
    id: "activation.sending",
    defaultMessage: "Waiting for activation…",
  },
  courseActivationAbandon: {
    id: "activation.abandon",
    defaultMessage: "Abandon unknown attempt",
  },
  courseActivationAbandoned: {
    id: "activation.abandoned",
    defaultMessage:
      "The unknown attempt was abandoned locally, not cancelled on the server. Review current readiness before a new attempt.",
  },
  courseActivationSuccess: {
    id: "activation.success",
    defaultMessage: "Course activation confirmed.",
  },
  courseActivationLeave: {
    id: "activation.leave",
    defaultMessage:
      "An activation attempt is pending or unconfirmed. Leaving drops this page’s attempt record; it does not cancel server work.",
  },
  materialRequired: {
    id: "materials.required",
    defaultMessage: "Required. Enter at least one character.",
  },
  materialMinimumItems: {
    id: "materials.minimumItems",
    defaultMessage: "Add at least {limit} item(s).",
  },
  materialMaximum: {
    id: "materials.maximum",
    defaultMessage: "Shorten to at most {limit} characters.",
  },
  materialMaximumItems: {
    id: "materials.maximumItems",
    defaultMessage: "Remove items to leave at most {limit}.",
  },
  materialEncoded: {
    id: "materials.encoded",
    defaultMessage: "Reduce encoded content to at most {limit} UTF-8 bytes.",
  },
  materialSequence: {
    id: "materials.sequence",
    defaultMessage: "Restore contiguous section order.",
  },
  materialJobAnnouncement: {
    id: "materials.jobAnnouncement",
    defaultMessage: "Material processing job: {state}.",
  },
  materialMatches: {
    id: "materials.matches",
    defaultMessage:
      "The current saved brief matches the submitted values. This confirms current values, not the earlier request’s outcome.",
  },
  materialDiffers: {
    id: "materials.differs",
    defaultMessage:
      "Current saved brief values differ. Your submission remains unconfirmed. Review current values or discard local input.",
  },
  materialFieldLimits: {
    id: "materials.fieldLimits",
    defaultMessage: "At most {points} characters and {bytes} UTF-8 bytes.",
  },
  materialProcessingTitle: {
    id: "materials.processingTitle",
    defaultMessage: "Course material processing | MIA",
  },
  materialProcessingHeading: {
    id: "materials.processingHeading",
    defaultMessage: "Course material processing",
  },
  materialBriefTitle: {
    id: "materials.briefTitle",
    defaultMessage: "Review material brief | MIA",
  },
  materialBriefHeading: {
    id: "materials.briefHeading",
    defaultMessage: "Review material brief",
  },
  materialApprovalTitle: {
    id: "materials.approvalTitle",
    defaultMessage: "Material approval | MIA",
  },
  materialApprovalHeading: {
    id: "materials.approvalHeading",
    defaultMessage: "Material approval",
  },
  materialRevokeTitle: {
    id: "materials.revokeTitle",
    defaultMessage: "Revoke material approval | MIA",
  },
  materialRevokeHeading: {
    id: "materials.revokeHeading",
    defaultMessage: "Revoke material approval",
  },
  materialTechnical: {
    id: "materials.technical",
    defaultMessage: "Technical readiness",
  },
  materialEducational: {
    id: "materials.educational",
    defaultMessage: "Educational approval",
  },
  materialFinalize: {
    id: "materials.finalize",
    defaultMessage: "Finalize and process",
  },
  materialFinalizeHelp: {
    id: "materials.finalizeHelp",
    defaultMessage:
      "Finalization freezes these source files. Processing cannot be undone here. PDF and image OCR may use Mistral; text, Markdown and DOCX extraction is local. Brief generation uses OpenAI. This review does not lock the server.",
  },
  materialChanged: {
    id: "materials.changed",
    defaultMessage:
      "Current material changed. Review the latest saved state and confirm again.",
  },
  materialLifecyclePending: {
    id: "materials.lifecyclePending",
    defaultMessage: "Submitting; no outcome is confirmed yet.",
  },
  materialLifecycleUnknown: {
    id: "materials.lifecycleUnknown",
    defaultMessage:
      "Outcome unknown. Refresh to inspect current state; the request will not be repeated.",
  },
  materialNoNotifications: {
    id: "materials.noNotifications",
    defaultMessage:
      "MIA sends no workflow notifications. Use Refresh to check current state. No automatic checks run here.",
  },
  materialJobs: { id: "materials.jobs", defaultMessage: "Processing jobs" },
  materialJobRunning: { id: "materials.jobRunning", defaultMessage: "Running" },
  materialJobSucceeded: {
    id: "materials.jobSucceeded",
    defaultMessage: "Succeeded",
  },
  materialJobCancelled: {
    id: "materials.jobCancelled",
    defaultMessage: "Cancelled",
  },
  materialProcessingFailure: {
    id: "materials.processingFailure",
    defaultMessage:
      "Material processing failed. The material is not usable. Review sources before deliberately finalizing again.",
  },
  materialOcrFailure: {
    id: "materials.ocrFailure",
    defaultMessage: "Source extraction failed. Review the failed source files.",
  },
  materialBriefFailure: {
    id: "materials.briefFailure",
    defaultMessage:
      "Brief generation failed. Review current material before finalizing again.",
  },
  materialBriefMissing: {
    id: "materials.briefMissing",
    defaultMessage: "A saved ready brief is not available for this action.",
  },
  materialSummary: { id: "materials.summary", defaultMessage: "Summary" },
  materialSubjects: { id: "materials.subjects", defaultMessage: "Subjects" },
  materialLearningGoals: {
    id: "materials.learningGoals",
    defaultMessage: "Supported learning goals",
  },
  materialSections: { id: "materials.sections", defaultMessage: "Sections" },
  materialSectionTitle: {
    id: "materials.sectionTitle",
    defaultMessage: "Section title",
  },
  materialSectionLabel: {
    id: "materials.sectionLabel",
    defaultMessage: "Section label (optional)",
  },
  materialSectionDescription: {
    id: "materials.sectionDescription",
    defaultMessage: "Section description",
  },
  materialSearchTerms: {
    id: "materials.searchTerms",
    defaultMessage: "Search terms",
  },
  materialWarnings: { id: "materials.warnings", defaultMessage: "Warnings" },
  materialLevel: {
    id: "materials.level",
    defaultMessage: "Educational level (optional)",
  },
  materialAdd: { id: "materials.add", defaultMessage: "Add item" },
  materialAbsent: { id: "materials.absent", defaultMessage: "Not provided" },
  materialSavedBrief: {
    id: "materials.savedBrief",
    defaultMessage: "Saved brief",
  },
  materialDraftPreview: {
    id: "materials.draftPreview",
    defaultMessage: "Unsaved preview — not approval truth",
  },
  materialGenerated: { id: "materials.generated", defaultMessage: "Generated" },
  materialCorrected: {
    id: "materials.corrected",
    defaultMessage: "Supervisor corrected",
  },
  materialSaveBrief: {
    id: "materials.saveBrief",
    defaultMessage: "Save complete brief",
  },
  materialBriefBounds: {
    id: "materials.briefBounds",
    defaultMessage:
      "Review the highlighted fields. Use the documented character, byte and item limits; the complete encoded brief is limited to 256 KiB.",
  },
  materialEditWarning: {
    id: "materials.editWarning",
    defaultMessage:
      "Changing approved brief content revokes educational approval. Students and the AI tutor lose access until a supervisor deliberately approves it again. An unchanged validated brief stays approved.",
  },
  materialSaved: {
    id: "materials.saved",
    defaultMessage: "Returned material state saved.",
  },
  materialRevoked: {
    id: "materials.revoked",
    defaultMessage:
      "Educational approval revoked. Review the saved brief before approving again.",
  },
  materialApprove: {
    id: "materials.approve",
    defaultMessage: "Approve material",
  },
  materialReviewAck: {
    id: "materials.reviewAck",
    defaultMessage:
      "I have reviewed the complete saved brief for educational suitability.",
  },
  materialApproveHelp: {
    id: "materials.approveHelp",
    defaultMessage:
      "Approval makes this ready course-wide material available to course students and the AI tutor. Current state is checked before dispatch; this is not a content-version lock.",
  },
  materialRevokeHelp: {
    id: "materials.revokeHelp",
    defaultMessage:
      "Revocation removes student access and future AI tutor retrieval. If no other qualifying approved file material remains, new tutoring sessions may be blocked. Existing sessions may finish. The course is not deactivated.",
  },
  materialLinkNonqualifying: {
    id: "materials.linkNonqualifying",
    defaultMessage:
      "Link material does not qualify as file-backed material for course readiness.",
  },
  materialReadinessFailed: {
    id: "materials.readinessFailed",
    defaultMessage:
      "The material change is confirmed, but current course readiness could not be checked. Return to the preparation hub and Refresh.",
  },
  materialChooseBrief: {
    id: "materials.chooseBrief",
    defaultMessage: "Choose material to review its brief",
  },
  markdownExternal: {
    id: "markdown.external",
    defaultMessage: "Opens in a new tab",
  },
  markdownTable: {
    id: "markdown.table",
    defaultMessage: "{context} — table {sequence}",
  },
  markdownTableFallback: {
    id: "markdown.tableFallback",
    defaultMessage: "Table shown as linear text",
  },
  markdownCode: { id: "markdown.code", defaultMessage: "Code" },
  markdownCopy: { id: "markdown.copy", defaultMessage: "Copy code" },
  markdownCopied: { id: "markdown.copied", defaultMessage: "Code copied." },
  markdownCopyDenied: {
    id: "markdown.copyDenied",
    defaultMessage: "Copy unavailable. Select the code and copy manually.",
  },
  markdownMathSource: {
    id: "markdown.mathSource",
    defaultMessage: "Math source",
  },
  markdownMathFailed: {
    id: "markdown.mathFailed",
    defaultMessage: "Math could not be rendered; full source follows.",
  },
  materialCancel: { id: "materials.cancel", defaultMessage: "Cancel" },
  materialsTitle: {
    id: "materials.title",
    defaultMessage: "Course materials | MIA",
  },
  materialsHeading: {
    id: "materials.heading",
    defaultMessage: "Course materials",
  },
  materialCreateTitle: {
    id: "materials.createTitle",
    defaultMessage: "Create course material | MIA",
  },
  materialCreate: {
    id: "materials.create",
    defaultMessage: "Create course material",
  },
  materialDetailTitle: {
    id: "materials.detailTitle",
    defaultMessage: "Course material | MIA",
  },
  materialDetail: { id: "materials.detail", defaultMessage: "Course material" },
  materialFilesTitle: {
    id: "materials.filesTitle",
    defaultMessage: "Course material files | MIA",
  },
  materialFiles: {
    id: "materials.files",
    defaultMessage: "Course material files",
  },
  materialName: { id: "materials.name", defaultMessage: "Material name" },
  materialNameHelp: {
    id: "materials.nameHelp",
    defaultMessage:
      "A unique name within this course; at most 200 characters and 800 UTF-8 bytes after trimming.",
  },
  materialNameRequired: {
    id: "materials.nameRequired",
    defaultMessage: "Enter a material name.",
  },
  materialNameTooLong: {
    id: "materials.nameTooLong",
    defaultMessage:
      "Use at most 200 characters and 800 UTF-8 bytes after trimming.",
  },
  materialDeleted: {
    id: "materials.deleted",
    defaultMessage: "The selected persisted file was deleted.",
  },
  materialKind: { id: "materials.kind", defaultMessage: "Material kind" },
  materialFormat: { id: "materials.format", defaultMessage: "Source format" },
  materialTextBook: { id: "materials.textBook", defaultMessage: "Textbook" },
  materialExam: { id: "materials.exam", defaultMessage: "Exam" },
  materialWorksheet: { id: "materials.worksheet", defaultMessage: "Worksheet" },
  materialWebsite: { id: "materials.website", defaultMessage: "Website link" },
  materialYoutube: { id: "materials.youtube", defaultMessage: "YouTube link" },
  materialPdf: { id: "materials.pdf", defaultMessage: "PDF (.pdf)" },
  materialJpeg: { id: "materials.jpeg", defaultMessage: "JPEG (.jpg, .jpeg)" },
  materialPng: { id: "materials.png", defaultMessage: "PNG (.png)" },
  materialText: {
    id: "materials.text",
    defaultMessage: "UTF-8 plain text (.txt)",
  },
  materialMarkdown: {
    id: "materials.markdown",
    defaultMessage: "UTF-8 Markdown (.md)",
  },
  materialDocx: {
    id: "materials.docx",
    defaultMessage: "Macro-free DOCX (.docx)",
  },
  materialLink: { id: "materials.link", defaultMessage: "Link" },
  materialCourseWide: {
    id: "materials.courseWide",
    defaultMessage: "Course-wide",
  },
  materialPrivate: {
    id: "materials.private",
    defaultMessage: "Student-private; no actions on this surface",
  },
  materialDraft: { id: "materials.draft", defaultMessage: "Draft" },
  materialProcessing: {
    id: "materials.processing",
    defaultMessage: "Processing",
  },
  materialReady: { id: "materials.ready", defaultMessage: "Ready" },
  materialFailed: { id: "materials.failed", defaultMessage: "Failed" },
  materialApproved: {
    id: "materials.approved",
    defaultMessage: "Supervisor approval: approved",
  },
  materialUnapproved: {
    id: "materials.unapproved",
    defaultMessage: "Supervisor approval: not approved",
  },
  materialEmpty: {
    id: "materials.empty",
    defaultMessage: "No materials in this returned collection page.",
  },
  materialError: {
    id: "materials.error",
    defaultMessage:
      "This operation was not accepted. Correct the input or review current material state.",
  },
  materialReadFailed: {
    id: "materials.readFailed",
    defaultMessage:
      "Could not refresh material and files. Any confirmed changes remain confirmed. Reconcile to read the current state again.",
  },
  materialUnknownCreate: {
    id: "materials.unknownCreate",
    defaultMessage:
      "Creation is unconfirmed. Do not create again automatically. Abandon this local attempt and return to the course list to inspect saved drafts; names cannot identify this attempt.",
  },
  materialAbandonCreate: {
    id: "materials.abandonCreate",
    defaultMessage: "Abandon unconfirmed creation and return to list",
  },
  materialLimits: {
    id: "materials.limits",
    defaultMessage: "Documented defaults and hard safety maxima",
  },
  materialLimitsCaveat: {
    id: "materials.limitsCaveat",
    defaultMessage:
      "These are hardcoded documented values, not discovered current operator settings. Operators may lower limits or raise defaults within the hard maxima. Client checks are advisory; the server validates each upload.",
  },
  materialByteLimits: {
    id: "materials.byteLimits",
    defaultMessage:
      "Per file: {fileDefault} MiB default / {fileHard} MiB hard maximum. Combined material: {materialDefault} MiB default / {materialHard} MiB hard maximum. Source files: {count} default and maximum; operators may lower the count.",
  },
  materialPageLimits: {
    id: "materials.pageLimits",
    defaultMessage:
      "Material: {pageDefault} pages default / {pageHard} hard maximum. Each PDF page or JPEG/PNG file counts as one page; DOCX, text and Markdown are non-paged. Images: {imageDefault} megapixels default / {imageHard} hard maximum; each dimension at most {dimension} pixels.",
  },
  materialArchiveLimits: {
    id: "materials.archiveLimits",
    defaultMessage:
      "DOCX: {entries} entries maximum, {total} MiB total expansion, {entry} MiB per entry and {ratio}:1 per-entry expansion ratio. The server inspects content; MIA does not scan for malware or certify safety. External links are not fetched.",
  },
  materialFilenameHelp: {
    id: "materials.filenameHelp",
    defaultMessage:
      "Filename: NFC UTF-8 basename, at most 255 code points and 1 KiB. No controls, bidirectional controls or path separators. Use an unprotected file; encrypted/password-protected PDF or DOCX, macros, executable content, HTML, SVG and other archives are unsupported.",
  },
  materialPicker: {
    id: "materials.picker",
    defaultMessage: "Select source files",
  },
  materialPickerHelp: {
    id: "materials.pickerHelp",
    defaultMessage:
      "Select one or more files, all in this material's chosen format. Files remain in page memory only and are lost on reload or departure.",
  },
  materialQueue: {
    id: "materials.queue",
    defaultMessage: "Local upload queue",
  },
  materialQueueStart: {
    id: "materials.queueStart",
    defaultMessage: "Queue selected files",
  },
  materialQueueContinue: {
    id: "materials.queueContinue",
    defaultMessage: "Upload remaining queued files",
  },
  materialSelected: { id: "materials.selected", defaultMessage: "Selected" },
  materialQueued: { id: "materials.queued", defaultMessage: "Queued" },
  materialUploading: { id: "materials.uploading", defaultMessage: "Uploading" },
  materialVerifying: {
    id: "materials.verifying",
    defaultMessage: "Verifying upload",
  },
  materialUploaded: { id: "materials.uploaded", defaultMessage: "Uploaded" },
  materialRejected: { id: "materials.rejected", defaultMessage: "Rejected" },
  materialUnknown: {
    id: "materials.unknown",
    defaultMessage: "Upload outcome unknown; queue paused",
  },
  materialUnknownAbandonable: {
    id: "materials.unknownAbandonable",
    defaultMessage:
      "Outcome unknown; current list reviewed, attempt may be abandoned",
  },
  materialCancelled: {
    id: "materials.cancelled",
    defaultMessage: "Cancelled before dispatch",
  },
  materialMismatch: {
    id: "materials.mismatch",
    defaultMessage:
      "The selected file does not match the chosen format. Remove it and select a matching file.",
  },
  materialAdvice: {
    id: "materials.advice",
    defaultMessage:
      "This selection exceeds a documented default or count maximum. This feedback is advisory, not proof of rejection; the operator's actual limits and server validation decide acceptance.",
  },
  materialRow: {
    id: "materials.row",
    defaultMessage: "File {position}: {name}",
  },
  materialBytes: {
    id: "materials.bytes",
    defaultMessage: "{bytes, number} bytes",
  },
  materialProgress: {
    id: "materials.progress",
    defaultMessage:
      "{loaded, number} of {total, number} bytes transferred; awaiting server confirmation",
  },
  materialIndeterminate: {
    id: "materials.indeterminate",
    defaultMessage:
      "Upload progress is not measurable; awaiting server confirmation",
  },
  materialAnnouncement: {
    id: "materials.announcement",
    defaultMessage: "{name}: {state}",
  },
  materialRemoveLocal: {
    id: "materials.removeLocal",
    defaultMessage: "Remove local row",
  },
  materialReconcile: {
    id: "materials.reconcile",
    defaultMessage: "Reconcile material and complete file list",
  },
  materialAbandon: {
    id: "materials.abandon",
    defaultMessage: "Abandon unknown attempt",
  },
  materialNewUpload: {
    id: "materials.newUpload",
    defaultMessage: "Upload as a new file",
  },
  materialDuplicateRisk: {
    id: "materials.duplicateRisk",
    defaultMessage:
      "I accept that a new upload may duplicate bytes already saved by the unknown attempt.",
  },
  materialReview: {
    id: "materials.review",
    defaultMessage: "Authoritative persisted file list",
  },
  materialAccept: {
    id: "materials.accept",
    defaultMessage: "Accept authoritative file list",
  },
  materialAccepted: {
    id: "materials.accepted",
    defaultMessage:
      "Current material and complete file list accepted for this page. A new read or edit requires new review.",
  },
  materialFrozen: {
    id: "materials.frozen",
    defaultMessage:
      "Source changes are frozen. Reconcile current material state; only an authoritative draft permits upload or removal.",
  },
  materialNoFiles: {
    id: "materials.noFiles",
    defaultMessage: "No persisted files in the current authoritative list.",
  },
  materialRemove: {
    id: "materials.remove",
    defaultMessage: "Delete this persisted file",
  },
  materialRemoveConfirm: {
    id: "materials.removeConfirm",
    defaultMessage: "Delete the selected persisted file?",
  },
  materialRemoveHelp: {
    id: "materials.removeHelp",
    defaultMessage:
      "Only this exact server file will be deleted. An unknown upload attempt cannot be identified by its filename or size.",
  },
  materialDeleteUnknown: {
    id: "materials.deleteUnknown",
    defaultMessage:
      "File deletion is unconfirmed. The retained row is not proof the file still exists. Reconcile explicitly; never repeat this deletion automatically.",
  },
  materialDeleting: {
    id: "materials.deleting",
    defaultMessage: "Deleting selected file; not yet confirmed",
  },
  materialProcessed: { id: "materials.processed", defaultMessage: "Processed" },
  coursesPagination: {
    id: "courses.pagination",
    defaultMessage: "Collection pages",
  },
  coursesListTitle: {
    id: "courses.listTitle",
    defaultMessage: "Courses | MIA",
  },
  coursesListHeading: { id: "courses.listHeading", defaultMessage: "Courses" },
  coursesCreateTitle: {
    id: "courses.createTitle",
    defaultMessage: "Create course | MIA",
  },
  coursesCreateHeading: {
    id: "courses.createHeading",
    defaultMessage: "Create course",
  },
  coursesDetailTitle: {
    id: "courses.detailTitle",
    defaultMessage: "Course administration | MIA",
  },
  coursesDetailHeading: {
    id: "courses.detailHeading",
    defaultMessage: "Course administration",
  },
  coursesPrepareTitle: {
    id: "courses.prepareTitle",
    defaultMessage: "Prepare courses | MIA",
  },
  coursesPrepareHeading: {
    id: "courses.prepareHeading",
    defaultMessage: "Prepare courses",
  },
  coursesPrepareGroup: {
    id: "courses.prepareGroup",
    defaultMessage: "Prepare",
  },
  coursesName: { id: "courses.name", defaultMessage: "Course name (required)" },
  coursesValidationSummary: {
    id: "courses.validationSummary",
    defaultMessage: "Check the course input",
  },
  coursesNameHelp: {
    id: "courses.nameHelp",
    defaultMessage:
      "Use a unique name of 1–200 characters. The course starts inactive.",
  },
  coursesNameInvalid: {
    id: "courses.nameInvalid",
    defaultMessage:
      "Enter a course name of 1–200 characters (at most 800 UTF-8 bytes).",
  },
  coursesNameConflict: {
    id: "courses.nameConflict",
    defaultMessage: "This course name is already in use. Choose another name.",
  },
  coursesSupervisors: {
    id: "courses.supervisors",
    defaultMessage: "Supervisors (at least one required)",
  },
  coursesSupervisorHelp: {
    id: "courses.supervisorHelp",
    defaultMessage:
      "Select registered active supervisors. Creation validates the complete assignment set; selection alone does not confirm eligibility.",
  },
  coursesSupervisorRequired: {
    id: "courses.supervisorRequired",
    defaultMessage: "Select at least one supervisor.",
  },
  coursesSupervisorInvalid: {
    id: "courses.supervisorInvalid",
    defaultMessage:
      "The supervisor set could not be assigned. Review your selection and try a corrected set.",
  },
  coursesSelected: {
    id: "courses.selected",
    defaultMessage: "Selected supervisors",
  },
  coursesRemoveSelection: {
    id: "courses.removeSelection",
    defaultMessage: "Remove selection",
  },
  coursesPage: { id: "courses.page", defaultMessage: "Current page: {page}" },
  coursesNoCandidates: {
    id: "courses.noCandidates",
    defaultMessage:
      "No candidates on this page. A newly invited supervisor must join before selection.",
  },
  coursesInvite: {
    id: "courses.invite",
    defaultMessage: "Invite a supervisor",
  },
  coursesPrerequisite: {
    id: "courses.prerequisite",
    defaultMessage:
      "Account administration access is required to select supervisors and create this course.",
  },
  coursesSaving: { id: "courses.saving", defaultMessage: "Creating course…" },
  coursesUnknown: {
    id: "courses.unknown",
    defaultMessage: "Save outcome unknown",
  },
  coursesUnknownHelp: {
    id: "courses.unknownHelp",
    defaultMessage:
      "The course may have been created. This request will not be repeated. Review persisted courses before starting a new creation journey.",
  },
  coursesReview: { id: "courses.review", defaultMessage: "Review courses" },
  coursesRejected: {
    id: "courses.rejected",
    defaultMessage:
      "The course was not created. Review the input before submitting a corrected request.",
  },
  coursesBackToList: {
    id: "courses.backToList",
    defaultMessage: "Back to courses",
  },
  coursesListEmpty: {
    id: "courses.listEmpty",
    defaultMessage: "No courses on this page.",
  },
  coursesPrepareEmpty: {
    id: "courses.prepareEmpty",
    defaultMessage: "No courses are currently assigned to you for supervision.",
  },
  coursesMore: {
    id: "courses.more",
    defaultMessage: "Show more assigned courses",
  },
  coursesState: { id: "courses.state", defaultMessage: "State" },
  coursesActive: { id: "courses.active", defaultMessage: "Active" },
  coursesInactive: { id: "courses.inactive", defaultMessage: "Inactive" },
  coursesUnavailableTitle: {
    id: "courses.unavailableTitle",
    defaultMessage: "Course access unavailable | MIA",
  },
  coursesUnavailableHeading: {
    id: "courses.unavailableHeading",
    defaultMessage: "Course access unavailable",
  },
  coursesUnavailable: {
    id: "courses.unavailable",
    defaultMessage: "This course view is unavailable. Use an available exit.",
  },
  coursesCheckFailed: {
    id: "courses.checkFailed",
    defaultMessage:
      "The course or supervisor check could not be completed. This is not an empty result.",
  },
  coursesDiscard: {
    id: "courses.discard",
    defaultMessage: "Discard course input?",
  },
  coursesDiscardHelp: {
    id: "courses.discardHelp",
    defaultMessage:
      "Your unsaved course name and supervisor selection will be discarded.",
  },
  routeLoading: { id: "route.loading", defaultMessage: "Loading this page…" },
  routeUnavailable: {
    id: "route.unavailable",
    defaultMessage: "This page could not be loaded",
  },
  routeLoadFailed: {
    id: "route.loadFailed",
    defaultMessage:
      "Reload to try loading this page again, or use an available exit. Reload does not repeat your submitted action.",
  },
  routeCodesLoadFailed: {
    id: "route.codesLoadFailed",
    defaultMessage:
      "Your recovery-code page could not be loaded. Navigation remains blocked until you save the codes. Browser Reload loses these codes and they cannot be retrieved. You can sign out.",
  },
  routeReload: { id: "route.reload", defaultMessage: "Reload page" },
  routeBackToInvitation: {
    id: "route.backToInvitation",
    defaultMessage: "Back to invitation",
  },
  lifecycleAbsoluteWarning: {
    id: "session.absoluteWarning",
    defaultMessage: "Your sign-in cannot be extended and will end soon.",
  },
  lifecycleAbsoluteHelp: {
    id: "session.absoluteHelp",
    defaultMessage:
      "Sign out. Sign-in expiry does not end your tutoring session.",
  },
  lifecycleRetryContinue: {
    id: "session.retryContinue",
    defaultMessage: "Retry Continue working",
  },
  lifecycleStopWaiting: {
    id: "session.stopWaiting",
    defaultMessage: "Stop waiting",
  },
  lifecycleNotSent: {
    id: "session.notSent",
    defaultMessage:
      "Continue working was not sent. You can try again before sign-in expires.",
  },
  lifecycleUnknown: {
    id: "session.unknown",
    defaultMessage:
      "We cannot confirm whether Continue working succeeded. Content is hidden. Refresh to check your sign-in.",
  },
  lifecycleDenied: {
    id: "session.denied",
    defaultMessage:
      "Continue working was not accepted. Content is hidden. Refresh to check your sign-in.",
  },
  lifecycleRecoveryFailed: {
    id: "session.recoveryFailed",
    defaultMessage:
      "We could not check your sign-in and access. Content remains hidden. Try Refresh again.",
  },
  lifecycleStopped: {
    id: "session.stopped",
    defaultMessage:
      "You stopped waiting. Content remains hidden. Refresh to check again.",
  },
  lifecycleSucceeded: {
    id: "session.succeeded",
    defaultMessage: "Continue working succeeded.",
  },
  lifecycleDeadlineReached: {
    id: "session.deadlineReached",
    defaultMessage:
      "Your observed sign-in deadline has been reached. Content is hidden. Refresh to check your sign-in.",
  },
  lifecycleRefresh: { id: "session.refresh", defaultMessage: "Refresh" },
  lifecycleWarning: {
    id: "session.warning",
    defaultMessage: "Your sign-in is nearing expiry.",
  },
  lifecycleWarningHelp: {
    id: "session.warningHelp",
    defaultMessage:
      "Continue working or sign out. Sign-in expiry does not end your tutoring session.",
  },
  lifecycleContinue: {
    id: "session.continue",
    defaultMessage: "Continue working",
  },
  lifecycleShieldTitle: { id: "session.shieldTitle", defaultMessage: "MIA" },
  lifecycleShieldHeading: {
    id: "session.shieldHeading",
    defaultMessage: "Content hidden",
  },
  lifecycleShieldHelp: {
    id: "session.shieldHelp",
    defaultMessage:
      "Refresh to check your sign-in and access before showing content again.",
  },
  loginUsername: {
    id: "login.username",
    defaultMessage: "Username (required)",
  },
  loginPassword: {
    id: "login.password",
    defaultMessage: "Password (required)",
  },
  loginPasswordHelp: {
    id: "login.passwordHelp",
    defaultMessage:
      "Spaces, Unicode, and password-manager values are allowed. Your password is not trimmed or normalized.",
  },
  loginReveal: { id: "login.reveal", defaultMessage: "Show password" },
  loginHide: { id: "login.hide", defaultMessage: "Hide password" },
  loginSubmit: { id: "login.submit", defaultMessage: "Sign in" },
  loginSubmitting: { id: "login.submitting", defaultMessage: "Signing in…" },
  loginRejected: {
    id: "login.rejected",
    defaultMessage: "Sign-in was rejected. Check your username and password.",
  },
  loginBlocked: {
    id: "login.blocked",
    defaultMessage:
      "Sign-in could not continue. Check your input or contact your local operator.",
  },
  loginThrottled: {
    id: "login.throttled",
    defaultMessage: "Sign-in is temporarily limited. Wait before trying again.",
  },
  loginWait: {
    id: "login.wait",
    defaultMessage:
      "Wait at least {seconds, number} seconds before trying again.",
  },
  loginFailed: {
    id: "login.failed",
    defaultMessage: "MIA could not complete sign-in. Try again later.",
  },
  loginUnconfirmed: {
    id: "login.unconfirmed",
    defaultMessage:
      "The sign-in outcome was not confirmed. The latest check found this browser signed out. You can sign in again.",
  },
  loginReconciling: {
    id: "login.reconciling",
    defaultMessage:
      "The sign-in outcome is uncertain. Checking current sign-in status…",
  },
  loginRecheckNeeded: {
    id: "login.recheckNeeded",
    defaultMessage:
      "The sign-in outcome is uncertain and status could not be checked. Check status before signing in again.",
  },
  loginRecheck: { id: "login.recheck", defaultMessage: "Check sign-in status" },
  pageTitle: {
    id: "entry.pageTitle",
    defaultMessage: "Sign in | MIA",
  },
  skipLink: {
    id: "entry.skipLink",
    defaultMessage: "Skip to main content",
  },
  heading: {
    id: "entry.heading",
    defaultMessage: "Sign in to MIA",
  },
  introduction: {
    id: "entry.introduction",
    defaultMessage: "Choose your language and text size before signing in.",
  },
  languageLabel: {
    id: "entry.language.label",
    defaultMessage: "Language",
  },
  localeChanged: {
    id: "entry.language.changed",
    defaultMessage: "Interface language changed.",
  },
  textSizeLegend: {
    id: "entry.textSize.legend",
    defaultMessage: "Text size",
  },
  textSizeHelp: {
    id: "entry.textSize.help",
    defaultMessage: "Choose the size that is easiest for you to read.",
  },
  textSizeStandard: {
    id: "entry.textSize.standard",
    defaultMessage: "Standard",
  },
  textSizeLarge: {
    id: "entry.textSize.large",
    defaultMessage: "Large",
  },
  textSizeExtraLarge: {
    id: "entry.textSize.extraLarge",
    defaultMessage: "Extra large",
  },
  buildIdentifier: {
    id: "entry.buildIdentifier",
    defaultMessage: "Build {buildId}",
  },
  checkingPageTitle: {
    id: "entry.checking.pageTitle",
    defaultMessage: "MIA",
  },
  checkingHeading: {
    id: "entry.checking.heading",
    defaultMessage: "Checking access",
  },
  checkingIntroduction: {
    id: "entry.checking.introduction",
    defaultMessage: "MIA is checking your sign-in status.",
  },
  mfaPageTitle: {
    id: "entry.mfa.pageTitle",
    defaultMessage: "Verify sign-in | MIA",
  },
  mfaHeading: {
    id: "entry.mfa.heading",
    defaultMessage: "Verify sign-in",
  },
  mfaIntroduction: {
    id: "entry.mfa.introduction",
    defaultMessage:
      "Additional verification is required before MIA can continue.",
  },
  mfaCodeLabel: {
    id: "entry.mfa.code.label",
    defaultMessage: "Six-digit code (required)",
  },
  mfaCodeHelp: {
    id: "entry.mfa.code.help",
    defaultMessage:
      "Enter the current six-digit code from your authenticator app or text message.",
  },
  mfaSubmit: { id: "entry.mfa.submit", defaultMessage: "Verify code" },
  mfaUseRecovery: {
    id: "entry.mfa.useRecovery",
    defaultMessage: "Use a recovery code instead",
  },
  mfaUseVerification: {
    id: "entry.mfa.useVerification",
    defaultMessage: "Use a six-digit code instead",
  },
  mfaRecoveryPageTitle: {
    id: "entry.mfa.recovery.pageTitle",
    defaultMessage: "Use a recovery code | MIA",
  },
  mfaRecoveryHeading: {
    id: "entry.mfa.recovery.heading",
    defaultMessage: "Use a recovery code",
  },
  mfaRecoveryIntroduction: {
    id: "entry.mfa.recovery.introduction",
    defaultMessage: "Enter one unused recovery code to continue sign-in.",
  },
  mfaRecoveryCodeLabel: {
    id: "entry.mfa.recovery.code.label",
    defaultMessage: "Recovery code (required)",
  },
  mfaRecoveryCodeHelp: {
    id: "entry.mfa.recovery.code.help",
    defaultMessage:
      "You may enter the code with or without spaces or hyphens. Letter case does not matter.",
  },
  mfaRecoverySubmit: {
    id: "entry.mfa.recovery.submit",
    defaultMessage: "Use recovery code",
  },
  mfaSubmitting: {
    id: "entry.mfa.submitting",
    defaultMessage: "Verifying sign-in…",
  },
  mfaReconciling: {
    id: "entry.mfa.reconciling",
    defaultMessage:
      "The verification outcome is uncertain. Checking current sign-in status…",
  },
  mfaRecheckNeeded: {
    id: "entry.mfa.recheckNeeded",
    defaultMessage:
      "The verification outcome is uncertain and status could not be checked.",
  },
  mfaRecheck: {
    id: "entry.mfa.recheck",
    defaultMessage: "Check sign-in status",
  },
  mfaLocalInvalid: {
    id: "entry.mfa.localInvalid",
    defaultMessage: "Enter exactly six digits.",
  },
  mfaRecoveryLocalInvalid: {
    id: "entry.mfa.recovery.localInvalid",
    defaultMessage: "Enter a valid 16-character recovery code.",
  },
  mfaStepUsed: {
    id: "entry.mfa.stepUsed",
    defaultMessage:
      "That authenticator code was already used. Enter a new code.",
  },
  mfaInvalidCode: {
    id: "entry.mfa.invalidCode",
    defaultMessage:
      "That six-digit code was not accepted. Check it and try again.",
  },
  mfaInvalidRecoveryCode: {
    id: "entry.mfa.invalidRecoveryCode",
    defaultMessage:
      "That recovery code was not accepted. Check it and try again.",
  },
  mfaExpired: {
    id: "entry.mfa.expired",
    defaultMessage:
      "This verification challenge is no longer valid. Sign out, then start sign-in again.",
  },
  mfaRestartPageTitle: {
    id: "entry.mfa.restart.pageTitle",
    defaultMessage: "Start sign-in again | MIA",
  },
  mfaRestartHeading: {
    id: "entry.mfa.restart.heading",
    defaultMessage: "Start sign-in again",
  },
  mfaRestartIntroduction: {
    id: "entry.mfa.restart.introduction",
    defaultMessage: "Sign out below, then start a fresh sign-in.",
  },
  mfaThrottled: {
    id: "entry.mfa.throttled",
    defaultMessage:
      "Verification is temporarily limited. Wait before trying again.",
  },
  mfaWait: {
    id: "entry.mfa.wait",
    defaultMessage:
      "Wait at least {seconds, number} seconds before trying again.",
  },
  mfaFailed: {
    id: "entry.mfa.failed",
    defaultMessage: "MIA could not verify sign-in. Try again later.",
  },
  mfaUnconfirmed: {
    id: "entry.mfa.unconfirmed",
    defaultMessage:
      "The verification result was not confirmed. This browser still requires verification.",
  },
  passwordChangePageTitle: {
    id: "entry.passwordChange.pageTitle",
    defaultMessage: "Choose a new password | MIA",
  },
  passwordChangeHeading: {
    id: "entry.passwordChange.heading",
    defaultMessage: "Choose a new password",
  },
  passwordChangeIntroduction: {
    id: "entry.passwordChange.introduction",
    defaultMessage: "Password replacement is required before MIA can continue.",
  },
  passwordChangeNewLabel: {
    id: "entry.passwordChange.password.label",
    defaultMessage: "New password (required)",
  },
  passwordChangeRules: {
    id: "entry.passwordChange.password.help",
    defaultMessage:
      "Use 12 to 128 characters and at most 512 bytes. Spaces, Unicode, and password-manager values are allowed. Your password is not trimmed or normalized. Very common passwords are not accepted.",
  },
  passwordChangeConfirmationLabel: {
    id: "entry.passwordChange.confirmation.label",
    defaultMessage: "Confirm new password (required)",
  },
  passwordChangeConfirmationHelp: {
    id: "entry.passwordChange.confirmation.help",
    defaultMessage: "Enter exactly the same password again.",
  },
  passwordChangeReveal: {
    id: "entry.passwordChange.password.reveal",
    defaultMessage: "Show new password",
  },
  passwordChangeHide: {
    id: "entry.passwordChange.password.hide",
    defaultMessage: "Hide new password",
  },
  passwordChangeConfirmationReveal: {
    id: "entry.passwordChange.confirmation.reveal",
    defaultMessage: "Show password confirmation",
  },
  passwordChangeConfirmationHide: {
    id: "entry.passwordChange.confirmation.hide",
    defaultMessage: "Hide password confirmation",
  },
  passwordChangeSubmit: {
    id: "entry.passwordChange.submit",
    defaultMessage: "Save new password",
  },
  passwordChangeSubmitting: {
    id: "entry.passwordChange.submitting",
    defaultMessage: "Saving new password…",
  },
  passwordChangeErrorSummary: {
    id: "entry.passwordChange.errorSummary",
    defaultMessage: "Correct these problems before saving your new password:",
  },
  passwordChangeTooShort: {
    id: "entry.passwordChange.tooShort",
    defaultMessage:
      "The new password is too short. Use at least 12 characters.",
  },
  passwordChangeTooLong: {
    id: "entry.passwordChange.tooLong",
    defaultMessage:
      "The new password is too long. Use at most 128 characters and 512 bytes.",
  },
  passwordChangeMismatch: {
    id: "entry.passwordChange.mismatch",
    defaultMessage:
      "The confirmation does not match the new password. Enter exactly the same password in both fields.",
  },
  passwordChangeRejected: {
    id: "entry.passwordChange.rejected",
    defaultMessage:
      "That password was not accepted. Choose a different password that meets the rules above.",
  },
  passwordChangeThrottled: {
    id: "entry.passwordChange.throttled",
    defaultMessage:
      "Password replacement is temporarily limited. Wait before trying again.",
  },
  passwordChangeWait: {
    id: "entry.passwordChange.wait",
    defaultMessage:
      "Wait at least {seconds, number} seconds before trying again.",
  },
  passwordChangeFailed: {
    id: "entry.passwordChange.failed",
    defaultMessage: "MIA could not save the new password. Try again later.",
  },
  passwordChangeUnconfirmed: {
    id: "entry.passwordChange.unconfirmed",
    defaultMessage:
      "The outcome was not confirmed. This browser still requires a new password.",
  },
  passwordChangeReconciling: {
    id: "entry.passwordChange.reconciling",
    defaultMessage: "The outcome is unknown. Checking current sign-in status…",
  },
  passwordChangeRecheckNeeded: {
    id: "entry.passwordChange.recheckNeeded",
    defaultMessage: "The outcome is unknown and status could not be checked.",
  },
  passwordChangeRecheck: {
    id: "entry.passwordChange.recheck",
    defaultMessage: "Check sign-in status",
  },
  logoutButton: {
    id: "entry.logout.button",
    defaultMessage: "Sign out",
  },
  logoutPageTitle: {
    id: "entry.logout.pageTitle",
    defaultMessage: "Sign out | MIA",
  },
  logoutHeading: {
    id: "entry.logout.heading",
    defaultMessage: "Signing out",
  },
  logoutIntroduction: {
    id: "entry.logout.introduction",
    defaultMessage:
      "Protected content is hidden while MIA checks whether this browser is signed out.",
  },
  logoutUnconfirmedHeading: {
    id: "entry.logout.unconfirmed.heading",
    defaultMessage: "Sign-out not confirmed",
  },
  logoutUnconfirmedIntroduction: {
    id: "entry.logout.unconfirmed.introduction",
    defaultMessage:
      "Protected content has been hidden locally, but this browser may still hold a valid sign-in cookie.",
  },
  logoutCloseBrowserGuidance: {
    id: "entry.logout.closeBrowserGuidance",
    defaultMessage:
      "On a shared device, close the entire browser if MIA cannot confirm sign-out.",
  },
  logoutRetryButton: {
    id: "entry.logout.retryButton",
    defaultMessage: "Retry logout",
  },
  logoutRefreshButton: {
    id: "entry.logout.refreshButton",
    defaultMessage: "Refresh sign-out status",
  },
  logoutConfirmedIntroduction: {
    id: "entry.logout.confirmedIntroduction",
    defaultMessage:
      "Signed out at the last check. A sign-in already in progress in another tab may sign this browser in again.",
  },
  homePageTitle: {
    id: "entry.home.pageTitle",
    defaultMessage: "Home | MIA",
  },
  homeHeading: {
    id: "entry.home.heading",
    defaultMessage: "Home",
  },
  homeIntroduction: {
    id: "entry.home.introduction",
    defaultMessage: "Choose an area from the navigation to continue.",
  },
  errorPageTitle: {
    id: "entry.error.pageTitle",
    defaultMessage: "Unable to check access | MIA",
  },
  errorHeading: {
    id: "entry.error.heading",
    defaultMessage: "Unable to check access",
  },
  errorSummary: {
    id: "entry.error.summary",
    defaultMessage: "MIA could not complete the access check.",
  },
  sessionErrorIntroduction: {
    id: "entry.error.session",
    defaultMessage:
      "Your sign-in status could not be checked. No protected content has been shown.",
  },
  capabilityErrorIntroduction: {
    id: "entry.error.capabilities",
    defaultMessage:
      "Your access could not be checked. No protected content has been shown.",
  },
  technicalDetails: {
    id: "entry.error.technicalDetails",
    defaultMessage: "Technical details",
  },
  httpStatus: {
    id: "entry.error.httpStatus",
    defaultMessage: "HTTP status: {status}",
  },
  copyWarning: {
    id: "entry.error.copy.warning",
    defaultMessage:
      "Review the technical details for sensitive information before sharing them.",
  },
  copyTechnicalDetails: {
    id: "entry.error.copy.button",
    defaultMessage: "Copy technical details",
  },
  copySuccess: {
    id: "entry.error.copy.success",
    defaultMessage: "Technical details copied.",
  },
  copyFailure: {
    id: "entry.error.copy.failure",
    defaultMessage: "Technical details could not be copied.",
  },
  copyManualFallback: {
    id: "entry.error.copy.manualFallback",
    defaultMessage:
      "Copying is unavailable. Select and copy the response text manually.",
  },
  loginForgotPassword: {
    id: "login.forgotPassword",
    defaultMessage: "Forgot your password?",
  },
  recoveryPageTitle: {
    id: "entry.recovery.pageTitle",
    defaultMessage: "Recover access | MIA",
  },
  recoveryHeading: {
    id: "entry.recovery.heading",
    defaultMessage: "Recover access",
  },
  recoveryIntroduction: {
    id: "entry.recovery.introduction",
    defaultMessage:
      "Staff accounts: enter your username, and MIA emails a password-reset link to the verified address of an eligible account. Students: ask your supervisor to set a temporary password.",
  },
  recoverySubmit: {
    id: "entry.recovery.submit",
    defaultMessage: "Send reset link",
  },
  recoverySendAgain: {
    id: "entry.recovery.sendAgain",
    defaultMessage: "Send again",
  },
  recoverySubmitting: {
    id: "entry.recovery.submitting",
    defaultMessage: "Sending your request…",
  },
  recoveryAcceptedHeading: {
    id: "entry.recovery.accepted.heading",
    defaultMessage: "Check your email",
  },
  recoveryAccepted: {
    id: "entry.recovery.accepted",
    defaultMessage:
      "If an eligible account exists, we've sent an email with a password-reset link. Any link expires 30 minutes after it is sent.",
  },
  recoveryCsrfRejected: {
    id: "entry.recovery.csrfRejected",
    defaultMessage:
      "The security check for this page expired. Send the request again.",
  },
  recoveryUnknown: {
    id: "entry.recovery.unknown",
    defaultMessage:
      "We couldn't confirm your request. An email may still arrive, so check your email before sending again.",
  },
  authRequestFailed: {
    id: "entry.authRequest.failed",
    defaultMessage: "Your request couldn't be processed. Try again later.",
  },
  backToSignIn: {
    id: "entry.backToSignIn",
    defaultMessage: "Back to sign-in",
  },
  resetPageTitle: {
    id: "entry.reset.pageTitle",
    defaultMessage: "Reset password | MIA",
  },
  resetHeading: {
    id: "entry.reset.heading",
    defaultMessage: "Reset password",
  },
  resetIntroduction: {
    id: "entry.reset.introduction",
    defaultMessage: "Choose a new password for your account.",
  },
  resetSubmit: {
    id: "entry.reset.submit",
    defaultMessage: "Change password",
  },
  resetSubmitting: {
    id: "entry.reset.submitting",
    defaultMessage: "Changing your password…",
  },
  resetThrottled: {
    id: "entry.reset.throttled",
    defaultMessage: "Too many attempts. Try again later.",
  },
  resetCsrfRejected: {
    id: "entry.reset.csrfRejected",
    defaultMessage:
      "The security check for this page expired. Enter your new password again and submit it.",
  },
  resetLinkUnusableHeading: {
    id: "entry.reset.linkUnusable.heading",
    defaultMessage: "This link is invalid or no longer usable",
  },
  resetLinkUnusable: {
    id: "entry.reset.linkUnusable",
    defaultMessage: "Request a new password-reset link, or go back to sign-in.",
  },
  resetRequestNewLink: {
    id: "entry.reset.requestNewLink",
    defaultMessage: "Request a new link",
  },
  resetUnknownHeading: {
    id: "entry.reset.unknown.heading",
    defaultMessage: "Password change not confirmed",
  },
  resetUnknown: {
    id: "entry.reset.unknown",
    defaultMessage:
      "We couldn't confirm whether your password was changed. Try signing in with your new password. If that doesn't work, request a new link.",
  },
  resetTrySignIn: {
    id: "entry.reset.trySignIn",
    defaultMessage: "Try signing in with your new password",
  },
  resetChangedHeading: {
    id: "entry.reset.changed.heading",
    defaultMessage: "Your password has been changed.",
  },
  resetChangedMfa: {
    id: "entry.reset.changed.mfa",
    defaultMessage:
      "If you use multi-factor authentication, it remains enabled.",
  },
  resetChangedOtherBrowsers: {
    id: "entry.reset.changed.otherBrowsers",
    defaultMessage:
      "Other browsers where you are signed in are not signed out automatically. Those sign-ins expire on their own.",
  },
  resetSignedInIntroduction: {
    id: "entry.reset.signedIn.introduction",
    defaultMessage:
      "You're currently signed in. To reset a password with this link, sign out first.",
  },
  resetSignOutAndContinue: {
    id: "entry.reset.signOutAndContinue",
    defaultMessage: "Sign out and continue",
  },
  resetGoBack: {
    id: "entry.reset.goBack",
    defaultMessage: "Go back",
  },
  resetSignedOut: {
    id: "entry.reset.signedOut",
    defaultMessage: "Signed out. You can now choose a new password.",
  },
  resetRejectedHeading: {
    id: "entry.reset.rejected.heading",
    defaultMessage: "Password not changed",
  },
  invitationPageTitle: {
    id: "entry.invitation.pageTitle",
    defaultMessage: "Invitation | MIA",
  },
  invitationHeading: {
    id: "entry.invitation.heading",
    defaultMessage: "Your MIA invitation",
  },
  invitationAcceptPageTitle: {
    id: "entry.invitation.accept.pageTitle",
    defaultMessage: "Create account | MIA",
  },
  invitationAcceptHeading: {
    id: "entry.invitation.accept.heading",
    defaultMessage: "Create your MIA account",
  },
  invitationChecking: {
    id: "entry.invitation.checking",
    defaultMessage: "Checking your invitation…",
  },
  invitationSignedInIntroduction: {
    id: "entry.invitation.signedIn.introduction",
    defaultMessage:
      "You're currently signed in. To use this invitation, sign out first.",
  },
  invitationSignedOut: {
    id: "entry.invitation.signedOut",
    defaultMessage: "Signed out. Checking your invitation…",
  },
  invitationPreviewIntroduction: {
    id: "entry.invitation.preview.introduction",
    defaultMessage:
      "You've been invited to create a MIA account. Accepting creates the account; you then sign in as usual.",
  },
  invitationRole: {
    id: "entry.invitation.preview.role",
    defaultMessage: "Invited role: {role}",
  },
  roleAdministrator: {
    id: "entry.role.administrator",
    defaultMessage: "Administrator",
  },
  roleSupervisor: {
    id: "entry.role.supervisor",
    defaultMessage: "Supervisor",
  },
  roleMentor: {
    id: "entry.role.mentor",
    defaultMessage: "Mentor",
  },
  invitationAccept: {
    id: "entry.invitation.preview.accept",
    defaultMessage: "Accept invitation",
  },
  invitationPreviewThrottled: {
    id: "entry.invitation.preview.throttled",
    defaultMessage:
      "Too many attempts to check this invitation. Try again once the wait has passed.",
  },
  invitationPreviewCsrfRejected: {
    id: "entry.invitation.preview.csrfRejected",
    defaultMessage: "The security check for this page expired. Try again.",
  },
  invitationPreviewNotSent: {
    id: "entry.invitation.preview.notSent",
    defaultMessage:
      "Your invitation could not be checked because the request was not sent. Try again.",
  },
  invitationTryAgain: {
    id: "entry.invitation.preview.tryAgain",
    defaultMessage: "Try again",
  },
  invitationLostHeading: {
    id: "entry.invitation.lost.heading",
    defaultMessage: "Invitation could not be checked",
  },
  invitationLost: {
    id: "entry.invitation.lost",
    defaultMessage:
      "MIA could not check this invitation. To try again, open the link in your invitation email again.",
  },
  invitationInvalidHeading: {
    id: "entry.invitation.invalid.heading",
    defaultMessage: "This invitation link is invalid or no longer usable",
  },
  invitationInvalid: {
    id: "entry.invitation.invalid",
    defaultMessage:
      "If you already have an account, sign in. Otherwise, ask the person who invited you for a new invitation.",
  },
  invitationAcceptIntroduction: {
    id: "entry.invitation.accept.introduction",
    defaultMessage:
      "Choose your username and password, and confirm your language, country, and time zone.",
  },
  invitationUsernameHelp: {
    id: "entry.invitation.username.help",
    defaultMessage:
      "3 to 32 characters: letters A–Z, digits, periods, underscores, or hyphens. Start and end with a letter or digit.",
  },
  invitationLanguageLabel: {
    id: "entry.invitation.language.label",
    defaultMessage: "Language (required)",
  },
  invitationCountryLabel: {
    id: "entry.invitation.country.label",
    defaultMessage: "Country (required)",
  },
  invitationCountryEmpty: {
    id: "entry.invitation.country.empty",
    defaultMessage: "Choose a country",
  },
  invitationCountryMissing: {
    id: "entry.invitation.country.missing",
    defaultMessage: "Choose your country.",
  },
  invitationTimeZoneLabel: {
    id: "entry.invitation.timeZone.label",
    defaultMessage: "Time zone (required)",
  },
  invitationSubmit: {
    id: "entry.invitation.submit",
    defaultMessage: "Create account",
  },
  invitationSubmitting: {
    id: "entry.invitation.submitting",
    defaultMessage: "Creating your account…",
  },
  invitationStopWaiting: {
    id: "entry.invitation.stopWaiting",
    defaultMessage: "Stop waiting",
  },
  invitationUsernameTaken: {
    id: "entry.invitation.usernameTaken",
    defaultMessage:
      "That username is already taken. Choose another username, enter your password again, and submit.",
  },
  invitationPasswordRejected: {
    id: "entry.invitation.passwordRejected",
    defaultMessage:
      "That password was not accepted. Choose a different password that meets the rules above and submit.",
  },
  invitationRequestInvalid: {
    id: "entry.invitation.requestInvalid",
    defaultMessage:
      "Some details were not accepted. Check your username and the other fields, enter your password again, and submit.",
  },
  invitationThrottled: {
    id: "entry.invitation.throttled",
    defaultMessage:
      "Too many attempts. Enter your password again and submit once the wait has passed.",
  },
  invitationCsrfRejected: {
    id: "entry.invitation.csrfRejected",
    defaultMessage:
      "The security check for this page expired. Enter your password again and submit.",
  },
  invitationNotSent: {
    id: "entry.invitation.notSent",
    defaultMessage:
      "Your account was not created because the request was not sent. Submit again.",
  },
  invitationCreatedHeading: {
    id: "entry.invitation.created.heading",
    defaultMessage: "Your account has been created.",
  },
  invitationCreated: {
    id: "entry.invitation.created",
    defaultMessage:
      "You are not signed in yet. Sign in with the username and password you chose.",
  },
  invitationNotCreatedHeading: {
    id: "entry.invitation.notCreated.heading",
    defaultMessage: "Account not created",
  },
  invitationEmailRegistered: {
    id: "entry.invitation.emailRegistered",
    defaultMessage:
      "An account already uses the email address this invitation was sent to. Sign in with that account, or ask the person who invited you for help.",
  },
  invitationUnknownHeading: {
    id: "entry.invitation.unknown.heading",
    defaultMessage: "Account creation not confirmed",
  },
  invitationUnknown: {
    id: "entry.invitation.unknown",
    defaultMessage:
      "We couldn't confirm whether your account was created. Try signing in with the username and password you chose, or open the link in your invitation email again. Neither step proves whether the account was created.",
  },
  lifecycleAccessLost: {
    id: "session.accessLost",
    defaultMessage:
      "MIA could not confirm your sign-in or access. Content is hidden. Refresh to check your sign-in.",
  },
  shellNavigationLabel: {
    id: "shell.navigation.label",
    defaultMessage: "Application",
  },
  shellOpenNavigation: {
    id: "shell.navigation.open",
    defaultMessage: "Open navigation",
  },
  shellCloseNavigation: {
    id: "shell.navigation.close",
    defaultMessage: "Close navigation",
  },
  shellHomeLink: {
    id: "shell.navigation.home",
    defaultMessage: "Home",
  },
  shellProfileSecurityGroup: {
    id: "shell.navigation.profileSecurity",
    defaultMessage: "Profile and security",
  },
  shellMfaLink: {
    id: "shell.navigation.mfa",
    defaultMessage: "Multi-factor authentication",
  },
  shellProductName: {
    id: "shell.productName",
    defaultMessage: "MIA",
  },
  mfaOverviewPageTitle: {
    id: "mfa.overview.pageTitle",
    defaultMessage: "Multi-factor authentication | MIA",
  },
  mfaOverviewHeading: {
    id: "mfa.overview.heading",
    defaultMessage: "Multi-factor authentication",
  },
  mfaEnrollPageTitle: {
    id: "mfa.enroll.pageTitle",
    defaultMessage: "Set up multi-factor authentication | MIA",
  },
  mfaEnrollHeading: {
    id: "mfa.enroll.heading",
    defaultMessage: "Set up multi-factor authentication",
  },
  mfaVerifyPageTitle: {
    id: "mfa.verify.pageTitle",
    defaultMessage: "Verify multi-factor authentication | MIA",
  },
  mfaVerifyHeading: {
    id: "mfa.verify.heading",
    defaultMessage: "Verify multi-factor authentication",
  },
  mfaCodesPageTitle: {
    id: "mfa.codes.pageTitle",
    defaultMessage: "MFA recovery codes | MIA",
  },
  mfaCodesHeading: {
    id: "mfa.codes.heading",
    defaultMessage: "MFA recovery codes",
  },
  mfaBackToHome: {
    id: "mfa.backToHome",
    defaultMessage: "Back to Home",
  },
  mfaBackToOverview: {
    id: "mfa.backToOverview",
    defaultMessage: "Back to multi-factor authentication",
  },
  mfaOverviewIntroduction: {
    id: "mfa.overview.introduction",
    defaultMessage:
      "Multi-factor authentication asks for a code from another device each time you sign in.",
  },
  mfaStatusOn: {
    id: "mfa.status.on",
    defaultMessage: "Multi-factor authentication is on",
  },
  mfaStatusOnTotp: {
    id: "mfa.status.onTotp",
    defaultMessage:
      "You confirm each sign-in with a code from your authenticator app.",
  },
  mfaStatusOnSms: {
    id: "mfa.status.onSms",
    defaultMessage:
      "You confirm each sign-in with a code sent by text message.",
  },
  mfaStatusOnCodesNote: {
    id: "mfa.status.onCodesNote",
    defaultMessage:
      "Recovery codes are shown only once, when multi-factor authentication is set up.",
  },
  mfaStatusOff: {
    id: "mfa.status.off",
    defaultMessage: "Multi-factor authentication is off",
  },
  mfaStatusOffHelp: {
    id: "mfa.status.offHelp",
    defaultMessage:
      "Set up an authenticator app to add a second step when you sign in.",
  },
  mfaStatusUnavailable: {
    id: "mfa.status.unavailable",
    defaultMessage: "Setup is not available for your account right now.",
  },
  mfaStatusPending: {
    id: "mfa.status.pending",
    defaultMessage: "Setup is pending",
  },
  mfaPendingExpires: {
    id: "mfa.status.pendingExpires",
    defaultMessage: "This setup expires on {expiresAt}.",
  },
  mfaPendingSms: {
    id: "mfa.status.pendingSms",
    defaultMessage:
      "This pending text-message setup can only be cancelled here.",
  },
  mfaSetUp: {
    id: "mfa.action.setUp",
    defaultMessage: "Set up authenticator app",
  },
  mfaContinueSetup: {
    id: "mfa.action.continueSetup",
    defaultMessage: "Continue setup",
  },
  mfaCancelSetup: {
    id: "mfa.action.cancelSetup",
    defaultMessage: "Cancel setup",
  },
  mfaEnrollIntroduction: {
    id: "mfa.enroll.introduction",
    defaultMessage:
      "You need an authenticator app on another device, such as your phone.",
  },
  mfaEnrollStepStart: {
    id: "mfa.enroll.stepStart",
    defaultMessage: "Start setup to get a QR code and a setup key.",
  },
  mfaEnrollStepScan: {
    id: "mfa.enroll.stepScan",
    defaultMessage:
      "Scan the QR code with your authenticator app, or enter the setup key.",
  },
  mfaEnrollStepCode: {
    id: "mfa.enroll.stepCode",
    defaultMessage:
      "Enter the six-digit code that your authenticator app shows.",
  },
  mfaStartSetup: {
    id: "mfa.action.startSetup",
    defaultMessage: "Start setup",
  },
  mfaStarting: {
    id: "mfa.progress.starting",
    defaultMessage: "Starting setup…",
  },
  mfaAlreadyOn: {
    id: "mfa.enroll.alreadyOn",
    defaultMessage: "Multi-factor authentication is already on.",
  },
  mfaVerifyIntroduction: {
    id: "mfa.verify.introduction",
    defaultMessage:
      "Add MIA to your authenticator app, then enter the code it shows.",
  },
  mfaQrLabel: {
    id: "mfa.setup.qrLabel",
    defaultMessage: "QR code for adding MIA to your authenticator app",
  },
  mfaManualHeading: {
    id: "mfa.setup.manualHeading",
    defaultMessage: "Manual setup",
  },
  mfaManualHelp: {
    id: "mfa.setup.manualHelp",
    defaultMessage:
      "If you cannot scan the QR code, enter these values in your authenticator app.",
  },
  mfaIssuer: {
    id: "mfa.setup.issuer",
    defaultMessage: "Issuer",
  },
  mfaAccount: {
    id: "mfa.setup.account",
    defaultMessage: "Account",
  },
  mfaSecret: {
    id: "mfa.setup.secret",
    defaultMessage: "Setup key",
  },
  mfaAlgorithm: {
    id: "mfa.setup.algorithm",
    defaultMessage: "Algorithm",
  },
  mfaDigits: {
    id: "mfa.setup.digits",
    defaultMessage: "Digits",
  },
  mfaPeriod: {
    id: "mfa.setup.period",
    defaultMessage: "Time step",
  },
  mfaPeriodValue: {
    id: "mfa.setup.periodValue",
    defaultMessage: "{seconds, plural, one {# second} other {# seconds}}",
  },
  mfaSetupHidden: {
    id: "mfa.setup.hidden",
    defaultMessage: "Setup details are hidden",
  },
  mfaSetupHiddenHelp: {
    id: "mfa.setup.hiddenHelp",
    defaultMessage:
      "The QR code and setup key were hidden while you were away. Show them again when no one else can see your screen.",
  },
  mfaRevealSetup: {
    id: "mfa.setup.reveal",
    defaultMessage: "Show setup details",
  },
  mfaSetupNotShown: {
    id: "mfa.setup.notShown",
    defaultMessage:
      "The QR code and setup key for this setup cannot be shown again. If you already added MIA to your authenticator app, enter its current code. Otherwise, cancel this setup and start again.",
  },
  mfaUriRejected: {
    id: "mfa.setup.uriRejected",
    defaultMessage:
      "MIA received setup data it cannot use, so no QR code or setup key is shown. Cancel this setup and start again.",
  },
  mfaEnrollCodeLabel: {
    id: "mfa.verify.codeLabel",
    defaultMessage: "Six-digit code from your authenticator app (required)",
  },
  mfaEnrollCodeHelp: {
    id: "mfa.verify.codeHelp",
    defaultMessage:
      "Enter the code that is currently shown. Leading zeros count.",
  },
  mfaEnrollCodeLocalInvalid: {
    id: "mfa.verify.localInvalid",
    defaultMessage: "Enter exactly six digits.",
  },
  mfaVerifySubmit: {
    id: "mfa.action.verify",
    defaultMessage: "Verify code",
  },
  mfaVerifying: {
    id: "mfa.progress.verifying",
    defaultMessage: "Checking your code…",
  },
  mfaCancelling: {
    id: "mfa.progress.cancelling",
    defaultMessage: "Cancelling setup…",
  },
  mfaStatusReconciling: {
    id: "mfa.progress.reconciling",
    defaultMessage: "Checking your multi-factor authentication status…",
  },
  mfaNoPending: {
    id: "mfa.verify.noPending",
    defaultMessage: "There is no pending setup to verify.",
  },
  mfaCodeInvalid: {
    id: "mfa.outcome.codeInvalid",
    defaultMessage:
      "That code was not accepted. Enter the current code from your authenticator app.",
  },
  mfaSetupGone: {
    id: "mfa.outcome.setupGone",
    defaultMessage:
      "This setup has ended. It may have expired or received too many incorrect codes. Start a new setup.",
  },
  mfaCodesLost: {
    id: "mfa.outcome.codesLost",
    defaultMessage:
      "Multi-factor authentication is now on, but the recovery codes from this setup could not be shown. They cannot be retrieved. Only a future replacement of this factor issues new codes.",
  },
  mfaVerifyUnknownPending: {
    id: "mfa.outcome.verifyUnknownPending",
    defaultMessage:
      "We could not confirm whether your code was accepted. The setup is still pending, so you can enter a new code.",
  },
  mfaVerifyRejected: {
    id: "mfa.outcome.verifyRejected",
    defaultMessage: "Your code could not be checked.",
  },
  mfaNotSent: {
    id: "mfa.outcome.notSent",
    defaultMessage:
      "The request was not sent. Check your connection and try again.",
  },
  mfaSettingsThrottled: {
    id: "mfa.outcome.throttled",
    defaultMessage:
      "There have been too many attempts. Wait a while before trying again.",
  },
  mfaStartRejected: {
    id: "mfa.outcome.startRejected",
    defaultMessage: "Setup could not be started.",
  },
  mfaStartUnknownPending: {
    id: "mfa.outcome.startUnknownPending",
    defaultMessage:
      "We could not confirm the setup response. A setup is pending, but its QR code and setup key cannot be shown.",
  },
  mfaStartUnknownNone: {
    id: "mfa.outcome.startUnknownNone",
    defaultMessage: "Setup did not start. You can start again.",
  },
  mfaPendingExists: {
    id: "mfa.outcome.pendingExists",
    defaultMessage:
      "A setup is already pending. Continue it or cancel it before starting again.",
  },
  mfaCancelled: {
    id: "mfa.outcome.cancelled",
    defaultMessage: "Setup cancelled.",
  },
  mfaCancelGone: {
    id: "mfa.outcome.cancelGone",
    defaultMessage: "This setup no longer exists.",
  },
  mfaCancelRejected: {
    id: "mfa.outcome.cancelRejected",
    defaultMessage: "The setup could not be cancelled.",
  },
  mfaCancelUnknownPending: {
    id: "mfa.outcome.cancelUnknownPending",
    defaultMessage:
      "We could not confirm whether the setup was cancelled. It is still pending, so you can cancel it again.",
  },
  mfaCancelUnknownGone: {
    id: "mfa.outcome.cancelUnknownGone",
    defaultMessage: "The setup is no longer pending.",
  },
  mfaCheckFailed: {
    id: "mfa.outcome.checkFailed",
    defaultMessage:
      "We could not check your multi-factor authentication status.",
  },
  mfaCheckAgain: {
    id: "mfa.action.checkAgain",
    defaultMessage: "Check again",
  },
  mfaCodesWarningHeading: {
    id: "mfa.codes.warningHeading",
    defaultMessage: "Save these recovery codes now",
  },
  mfaCodesWarning: {
    id: "mfa.codes.warning",
    defaultMessage:
      "Each code works once if you cannot use your authenticator app. MIA shows these codes only now and cannot show them again. MIA cannot remove copies from your clipboard, screenshots, print queue, or paper.",
  },
  mfaCodesListLabel: {
    id: "mfa.codes.listLabel",
    defaultMessage: "Recovery codes",
  },
  mfaCopyCodes: {
    id: "mfa.codes.copy",
    defaultMessage: "Copy all recovery codes",
  },
  mfaCopyCodesSuccess: {
    id: "mfa.codes.copySuccess",
    defaultMessage: "Recovery codes copied.",
  },
  mfaCopyCodesFailure: {
    id: "mfa.codes.copyFailure",
    defaultMessage:
      "Recovery codes could not be copied. Select and copy them manually.",
  },
  mfaPrintCodes: {
    id: "mfa.codes.print",
    defaultMessage: "Print recovery codes",
  },
  mfaPrintFailure: {
    id: "mfa.codes.printFailure",
    defaultMessage:
      "Printing could not start. Copy the codes or write them down.",
  },
  mfaPrintInitiated: {
    id: "mfa.codes.printInitiated",
    defaultMessage: "Print dialog requested. Printing is not confirmed.",
  },
  mfaCodesStorageLegend: {
    id: "mfa.codes.storageLegend",
    defaultMessage: "Safe storage confirmation",
  },
  mfaCodesAcknowledge: {
    id: "mfa.codes.acknowledge",
    defaultMessage: "I have saved my recovery codes",
  },
  mfaCodesAcknowledgeHelp: {
    id: "mfa.codes.acknowledgeHelp",
    defaultMessage:
      "Store them somewhere safe and private. You will not see them again.",
  },
  mfaCodesDone: {
    id: "mfa.codes.done",
    defaultMessage: "Done",
  },
  mfaCodesAcknowledgeFirst: {
    id: "mfa.codes.acknowledgeFirst",
    defaultMessage: "Confirm that you saved your recovery codes first.",
  },
  mfaCodesHidden: {
    id: "mfa.codes.hidden",
    defaultMessage: "Recovery codes are hidden",
  },
  mfaCodesHiddenHelp: {
    id: "mfa.codes.hiddenHelp",
    defaultMessage:
      "Your recovery codes were hidden while you were away. Show them again when no one else can see your screen.",
  },
  mfaRevealCodes: {
    id: "mfa.codes.reveal",
    defaultMessage: "Show recovery codes",
  },
  mfaCodesUnavailable: {
    id: "mfa.codes.unavailable",
    defaultMessage:
      "Recovery codes are no longer available. They are shown only once and cannot be retrieved. Only a future replacement of this factor issues new codes.",
  },
  shellAdministerGroup: {
    id: "shell.navigation.administer",
    defaultMessage: "Administer",
  },
  shellInvitationsLink: {
    id: "shell.navigation.invitations",
    defaultMessage: "Invitations",
  },
  unsavedStay: {
    id: "unsaved.stay",
    defaultMessage: "Stay on this page",
  },
  unsavedDiscard: {
    id: "unsaved.discard",
    defaultMessage: "Discard and leave",
  },
  invitationsDiscardTitle: {
    id: "invitations.discard.title",
    defaultMessage: "Discard this invitation?",
  },
  invitationsDiscardDescription: {
    id: "invitations.discard.description",
    defaultMessage:
      "The email address you entered has not been sent. If you leave this page, it is discarded.",
  },
  invitationsListPageTitle: {
    id: "invitations.list.pageTitle",
    defaultMessage: "Invitations | MIA",
  },
  invitationsListHeading: {
    id: "invitations.list.heading",
    defaultMessage: "Invitations",
  },
  invitationsCreatePageTitle: {
    id: "invitations.create.pageTitle",
    defaultMessage: "Create invitation | MIA",
  },
  invitationsCreateHeading: {
    id: "invitations.create.heading",
    defaultMessage: "Invite a supervisor",
  },
  invitationsDetailPageTitle: {
    id: "invitations.detail.pageTitle",
    defaultMessage: "Invitation details | MIA",
  },
  invitationsDetailHeading: {
    id: "invitations.detail.heading",
    defaultMessage: "Invitation details",
  },
  invitationsResendPageTitle: {
    id: "invitations.resend.pageTitle",
    defaultMessage: "Resend invitation | MIA",
  },
  invitationsResendHeading: {
    id: "invitations.resend.heading",
    defaultMessage: "Resend invitation",
  },
  invitationsRevokePageTitle: {
    id: "invitations.revoke.pageTitle",
    defaultMessage: "Revoke invitation | MIA",
  },
  invitationsRevokeHeading: {
    id: "invitations.revoke.heading",
    defaultMessage: "Revoke invitation",
  },
  invitationsBackToHome: {
    id: "invitations.backToHome",
    defaultMessage: "Back to Home",
  },
  invitationsBackToList: {
    id: "invitations.backToList",
    defaultMessage: "Back to invitations",
  },
  invitationsBackToDetail: {
    id: "invitations.backToDetail",
    defaultMessage: "Back to invitation details",
  },
  invitationsCheckFailed: {
    id: "invitations.checkFailed",
    defaultMessage:
      "Invitation information could not be loaded. Check again, or use an available exit.",
  },
  invitationsUnavailablePageTitle: {
    id: "invitations.unavailable.pageTitle",
    defaultMessage: "Not available | MIA",
  },
  invitationsUnavailableHeading: {
    id: "invitations.unavailable.heading",
    defaultMessage: "Not available",
  },
  invitationsUnavailableSummary: {
    id: "invitations.unavailable.summary",
    defaultMessage: "This item is not available",
  },
  invitationsUnavailable: {
    id: "invitations.unavailable.body",
    defaultMessage: "It may not exist, or you may not have access to it.",
  },
  invitationsStatusPending: {
    id: "invitations.status.pending",
    defaultMessage: "Pending",
  },
  invitationsStatusAccepted: {
    id: "invitations.status.accepted",
    defaultMessage: "Accepted",
  },
  invitationsStatusRevoked: {
    id: "invitations.status.revoked",
    defaultMessage: "Revoked",
  },
  invitationsStatusFaulty: {
    id: "invitations.status.faulty",
    defaultMessage: "Faulty",
  },
  invitationsDeliveryQueued: {
    id: "invitations.delivery.queued",
    defaultMessage: "Delivery queued",
  },
  invitationsDeliveryDelivered: {
    id: "invitations.delivery.delivered",
    defaultMessage: "Accepted by mail server",
  },
  invitationsDeliveryAmbiguous: {
    id: "invitations.delivery.ambiguous",
    defaultMessage: "Delivery unconfirmed",
  },
  invitationsDeliveryFailed: {
    id: "invitations.delivery.failed",
    defaultMessage: "Delivery failed",
  },
  invitationsDeliveryQueuedHelp: {
    id: "invitations.delivery.queuedHelp",
    defaultMessage:
      "MIA has admitted the email for sending but has not recorded a result yet. It may not have been sent.",
  },
  invitationsDeliveryDeliveredHelp: {
    id: "invitations.delivery.deliveredHelp",
    defaultMessage:
      "The mail server accepted the email. This does not confirm that it arrived or was read.",
  },
  invitationsDeliveryAmbiguousHelp: {
    id: "invitations.delivery.ambiguousHelp",
    defaultMessage:
      "MIA could not confirm whether the email was sent. The invitation is still usable, and MIA does not retry automatically. You can resend it.",
  },
  invitationsDeliveryFailedHelp: {
    id: "invitations.delivery.failedHelp",
    defaultMessage:
      "The mail server definitively rejected the email. This invitation cannot be used.",
  },
  invitationsDeliveryLifecycleNeutral: {
    id: "invitations.delivery.lifecycleNeutral",
    defaultMessage:
      "MIA recorded the delivery state at the time of the last update. The current state may have changed.",
  },
  invitationsDeliveryCode: {
    id: "invitations.delivery.code",
    defaultMessage: "Reason: {reason}",
  },
  invitationsDeliveryCodeTimeout: {
    id: "invitations.delivery.code.timeout",
    defaultMessage: "the mail server did not answer in time",
  },
  invitationsDeliveryCodeAmbiguous: {
    id: "invitations.delivery.code.ambiguous",
    defaultMessage: "the mail server’s answer was inconclusive",
  },
  invitationsDeliveryCodeRejected: {
    id: "invitations.delivery.code.rejected",
    defaultMessage: "the mail server rejected the email",
  },
  invitationsFieldEmail: {
    id: "invitations.field.email",
    defaultMessage: "Email address",
  },
  invitationsFieldRole: {
    id: "invitations.field.role",
    defaultMessage: "Role",
  },
  invitationsFieldStatus: {
    id: "invitations.field.status",
    defaultMessage: "Status",
  },
  invitationsFieldDelivery: {
    id: "invitations.field.delivery",
    defaultMessage: "Latest delivery",
  },
  invitationsFieldAttempted: {
    id: "invitations.field.attempted",
    defaultMessage: "Latest delivery attempt",
  },
  invitationsFieldFailureCode: {
    id: "invitations.field.failureCode",
    defaultMessage: "Failure code",
  },
  invitationsFieldCreated: {
    id: "invitations.field.created",
    defaultMessage: "Created",
  },
  invitationsNoAttempt: {
    id: "invitations.noAttempt",
    defaultMessage: "No completed attempt recorded yet",
  },
  invitationsSummaryHeading: {
    id: "invitations.summary.heading",
    defaultMessage: "Invitation",
  },
  invitationsLastChecked: {
    id: "invitations.lastChecked",
    defaultMessage: "Last checked {time}",
  },
  invitationsRefresh: {
    id: "invitations.refresh",
    defaultMessage: "Refresh",
  },
  invitationsChecking: {
    id: "invitations.checking",
    defaultMessage: "Checking…",
  },
  invitationsListIntroduction: {
    id: "invitations.list.introduction",
    defaultMessage:
      "Invitations you can manage, with their persisted status and latest delivery. MIA sends no notifications when these change; use Refresh.",
  },
  invitationsListSectionHeading: {
    id: "invitations.list.sectionHeading",
    defaultMessage: "Invitation list",
  },
  invitationsTableCaption: {
    id: "invitations.list.caption",
    defaultMessage: "Invitations",
  },
  invitationsInviteSupervisor: {
    id: "invitations.inviteSupervisor",
    defaultMessage: "Invite a supervisor",
  },
  invitationsEmptyHeading: {
    id: "invitations.empty.heading",
    defaultMessage: "No invitations",
  },
  invitationsEmpty: {
    id: "invitations.empty.body",
    defaultMessage: "No invitations are available to you yet.",
  },
  invitationsEmptyPageHeading: {
    id: "invitations.emptyPage.heading",
    defaultMessage: "No invitations on this page",
  },
  invitationsEmptyPage: {
    id: "invitations.emptyPage.body",
    defaultMessage: "Use Previous to return to earlier invitations.",
  },
  invitationsPagination: {
    id: "invitations.pagination",
    defaultMessage: "Invitation pages",
  },
  invitationsPreviousPage: {
    id: "invitations.previousPage",
    defaultMessage: "Previous",
  },
  invitationsNextPage: {
    id: "invitations.nextPage",
    defaultMessage: "Next",
  },
  invitationsListUpdated: {
    id: "invitations.list.updated",
    defaultMessage: "Invitation list updated.",
  },
  invitationsListLoadFailed: {
    id: "invitations.list.loadFailed",
    defaultMessage: "The invitation list could not be loaded",
  },
  invitationsShowingOld: {
    id: "invitations.showingOld",
    defaultMessage:
      "The information shown is from the last successful check and may be out of date.",
  },
  invitationsCheckStateFailed: {
    id: "invitations.checkStateFailed",
    defaultMessage: "The current state could not be checked",
  },
  invitationsStateChanged: {
    id: "invitations.stateChanged",
    defaultMessage: "The invitation state has changed.",
  },
  invitationsStateUnchanged: {
    id: "invitations.stateUnchanged",
    defaultMessage: "Checked. The invitation state has not changed.",
  },
  invitationsCheckCurrentState: {
    id: "invitations.checkCurrentState",
    defaultMessage: "Check current state",
  },
  invitationsNoActions: {
    id: "invitations.noActions",
    defaultMessage: "No actions are available for an invitation in this state.",
  },
  invitationsFaultyHelp: {
    id: "invitations.faultyHelp",
    defaultMessage:
      "This invitation cannot be used or resent. To invite this address again, create a new invitation.",
  },
  invitationsViewInvitation: {
    id: "invitations.viewInvitation",
    defaultMessage: "View invitation",
  },
  invitationsStopWaiting: {
    id: "invitations.stopWaiting",
    defaultMessage: "Stop waiting",
  },
  invitationsNothingChanged: {
    id: "invitations.nothingChanged",
    defaultMessage: "MIA did not make this change. You can try again.",
  },
  invitationsCreateIntroduction: {
    id: "invitations.create.introduction",
    defaultMessage:
      "MIA emails an invitation link to this address. The invited person chooses a username and password when accepting. No account exists until then.",
  },
  invitationsEmailLabel: {
    id: "invitations.email.label",
    defaultMessage: "Supervisor’s email address",
  },
  invitationsEmailHelp: {
    id: "invitations.email.help",
    defaultMessage:
      "The invitation is for the supervisor role. Use an address that has no MIA account and no pending invitation.",
  },
  invitationsEmailRequired: {
    id: "invitations.email.required",
    defaultMessage: "Enter the supervisor’s email address.",
  },
  invitationsEmailTooLong: {
    id: "invitations.email.tooLong",
    defaultMessage: "Enter an email address of at most 254 characters.",
  },
  invitationsEmailInvalid: {
    id: "invitations.email.invalid",
    defaultMessage:
      "MIA did not accept this email address. Check it and try again.",
  },
  invitationsEmailConflict: {
    id: "invitations.email.conflict",
    defaultMessage:
      "This address already has a MIA account or a pending invitation. No new invitation was created.",
  },
  invitationsSendInvitation: {
    id: "invitations.send",
    defaultMessage: "Send invitation",
  },
  invitationsCreating: {
    id: "invitations.creating",
    defaultMessage: "Sending invitation…",
  },
  invitationsCreatedHeading: {
    id: "invitations.created.heading",
    defaultMessage: "Invitation created",
  },
  invitationsCreated: {
    id: "invitations.created.body",
    defaultMessage:
      "MIA created a pending supervisor invitation. Email delivery is queued: MIA has not confirmed that the email was sent or read, and no account exists until the invitation is accepted.",
  },
  invitationsInviteAnother: {
    id: "invitations.inviteAnother",
    defaultMessage: "Invite another supervisor",
  },
  invitationsNotCreated: {
    id: "invitations.notCreated",
    defaultMessage: "The invitation was not created",
  },
  invitationsNotCreatedHelp: {
    id: "invitations.notCreated.help",
    defaultMessage:
      "Nothing was created. Your entry is kept, so you can try again.",
  },
  invitationsCreateUnknownHeading: {
    id: "invitations.createUnknown.heading",
    defaultMessage: "Invitation not confirmed",
  },
  invitationsCreateUnknown: {
    id: "invitations.createUnknown.body",
    defaultMessage:
      "MIA could not confirm whether the invitation was created. Do not assume it was sent. Review the invitation list. A new attempt for the same address is rejected if the earlier one exists.",
  },
  invitationsReviewList: {
    id: "invitations.reviewList",
    defaultMessage: "Review invitations",
  },
  invitationsNewAttempt: {
    id: "invitations.newAttempt",
    defaultMessage: "Start a new invitation",
  },
  invitationsResendAction: {
    id: "invitations.resend.action",
    defaultMessage: "Resend invitation",
  },
  invitationsRevokeAction: {
    id: "invitations.revoke.action",
    defaultMessage: "Revoke invitation",
  },
  invitationsResendPanelHeading: {
    id: "invitations.resend.panelHeading",
    defaultMessage: "Resend this invitation?",
  },
  invitationsResendConsequence: {
    id: "invitations.resend.consequence",
    defaultMessage:
      "MIA sends a new link to the same address. Any link sent earlier stops working immediately. MIA does not retry automatically.",
  },
  invitationsResending: {
    id: "invitations.resending",
    defaultMessage: "Resending…",
  },
  invitationsResentHeading: {
    id: "invitations.resent.heading",
    defaultMessage: "Invitation resent",
  },
  invitationsResent: {
    id: "invitations.resent.body",
    defaultMessage:
      "MIA admitted a new link for delivery, and the earlier link no longer works. The delivery state shown is the latest MIA has recorded; it does not confirm that the email was read.",
  },
  invitationsResendNotPendingHeading: {
    id: "invitations.resend.notPendingHeading",
    defaultMessage: "Invitation not resent",
  },
  invitationsResendNotPending: {
    id: "invitations.resend.notPending",
    defaultMessage:
      "This invitation is no longer pending, so it cannot be resent. Its current state is shown.",
  },
  invitationsResendUnknownHeading: {
    id: "invitations.resend.unknownHeading",
    defaultMessage: "Resend not confirmed",
  },
  invitationsResendUnknown: {
    id: "invitations.resend.unknown",
    defaultMessage:
      "MIA could not confirm whether the invitation was resent. The earlier link may no longer work, and the delivery state is unknown. MIA does not retry automatically. Check the current state before deciding again.",
  },
  invitationsResendUnknownReconciled: {
    id: "invitations.resend.unknownReconciled",
    defaultMessage:
      "The current state is shown. It does not confirm whether the earlier resend happened.",
  },
  invitationsNotResentHeading: {
    id: "invitations.notResent.heading",
    defaultMessage: "Invitation not resent",
  },
  invitationsRevokePanelHeading: {
    id: "invitations.revoke.panelHeading",
    defaultMessage: "Revoke this invitation?",
  },
  invitationsRevokeConsequence: {
    id: "invitations.revoke.consequence",
    defaultMessage:
      "The invitation record is kept and marked revoked. Its link stops working immediately and cannot be used to create an account. This cannot be undone.",
  },
  invitationsRevoking: {
    id: "invitations.revoking",
    defaultMessage: "Revoking…",
  },
  invitationsRevokedHeading: {
    id: "invitations.revoked.heading",
    defaultMessage: "Invitation revoked",
  },
  invitationsRevoked: {
    id: "invitations.revoked.body",
    defaultMessage:
      "The invitation is kept as revoked. Its link no longer works.",
  },
  invitationsRevokeChangedHeading: {
    id: "invitations.revoke.changedHeading",
    defaultMessage: "This invitation changed",
  },
  invitationsRevokeChanged: {
    id: "invitations.revoke.changed",
    defaultMessage:
      "The invitation changed since you reviewed it, so MIA made no change. Review its current state before deciding again.",
  },
  invitationsNotRevokedHeading: {
    id: "invitations.notRevoked.heading",
    defaultMessage: "Invitation not revoked",
  },
  invitationsRevokeUnknownHeading: {
    id: "invitations.revoke.unknownHeading",
    defaultMessage: "Revocation not confirmed",
  },
  invitationsRevokeUnknown: {
    id: "invitations.revoke.unknown",
    defaultMessage:
      "MIA could not confirm whether the invitation was revoked. MIA does not retry automatically. Check the current state.",
  },
  invitationsRevokeNotConfirmedHeading: {
    id: "invitations.revoke.notConfirmedHeading",
    defaultMessage: "Revocation not confirmed",
  },
  invitationsRevokeNotConfirmed: {
    id: "invitations.revoke.notConfirmed",
    defaultMessage:
      "The current state is shown. It does not confirm whether the earlier attempt revoked the invitation. Any new revocation needs a new review.",
  },
  invitationsRevokeNotPending: {
    id: "invitations.revoke.notPending",
    defaultMessage:
      "Only a pending invitation can be revoked. This invitation’s current state is shown.",
  },
  preparationHub: {
    id: "preparation.hub",
    defaultMessage: "Course preparation",
  },
  preparationCheckFailed: {
    id: "preparation.checkFailed",
    defaultMessage:
      "Current course values could not be confirmed. This is not an empty result.",
  },
  preparationUnsaved: {
    id: "preparation.unsaved",
    defaultMessage: "Unsaved teaching-field changes",
  },
  preparationDiscardHelp: {
    id: "preparation.discardHelp",
    defaultMessage:
      "Your local teaching-field input will be discarded. Persisted course values will not change.",
  },
  preparationHubTitle: {
    id: "preparation.hubTitle",
    defaultMessage: "Course preparation | MIA",
  },
  preparationBreadcrumbs: {
    id: "preparation.breadcrumbs",
    defaultMessage: "Course path",
  },
  preparationStatePillInactive: {
    id: "preparation.statePill.inactive",
    defaultMessage: "Inactive",
  },
  preparationStatePillActive: {
    id: "preparation.statePill.active",
    defaultMessage: "Active",
  },
  preparationBadgeOptional: {
    id: "preparation.badge.optional",
    defaultMessage: "Optional",
  },
  preparationBadgeBlocksActivation: {
    id: "preparation.badge.blocksActivation",
    defaultMessage: "Blocks activation",
  },
  preparationBadgeBlocksSessions: {
    id: "preparation.badge.blocksSessions",
    defaultMessage: "Blocks new sessions",
  },
  preparationOpenReadiness: {
    id: "preparation.openReadiness",
    defaultMessage: "Open readiness review",
  },
  preparationPanelIncompleteHeading: {
    id: "preparation.panel.incomplete.heading",
    defaultMessage:
      "{count, plural, one {# item blocks activation} other {# items block activation}}",
  },
  preparationPanelIncompleteBody: {
    id: "preparation.panel.incomplete.body",
    defaultMessage:
      "The course stays inactive until {count, plural, one {it is} other {they are}} resolved. Work on them in any order; everything else on this page can wait.",
  },
  preparationPanelActivatableHeading: {
    id: "preparation.panel.activatable.heading",
    defaultMessage: "Ready to activate",
  },
  preparationPanelActivatableBody: {
    id: "preparation.panel.activatable.body",
    defaultMessage:
      "Nothing blocks activation. Review the summary and confirm to open the course for new tutoring sessions.",
  },
  preparationPanelActivatableAction: {
    id: "preparation.panel.activatable.action",
    defaultMessage: "Review and activate",
  },
  preparationPanelPreviousHeading: {
    id: "preparation.panel.previous.heading",
    defaultMessage: "Nothing blocks activation",
  },
  preparationPanelPreviousBody: {
    id: "preparation.panel.previous.body",
    defaultMessage:
      "This course was active before. Activating it again is not available on this page. While the course is inactive, students cannot start new tutoring sessions.",
  },
  preparationPanelAcceptingHeading: {
    id: "preparation.panel.accepting.heading",
    defaultMessage: "Active — open for new tutoring sessions",
  },
  preparationPanelAcceptingBody: {
    id: "preparation.panel.accepting.body",
    defaultMessage:
      "Students in this course can start new tutoring sessions. Activated {activatedAt}.",
  },
  preparationPanelNotAcceptingHeading: {
    id: "preparation.panel.notAccepting.heading",
    defaultMessage: "Active, but new tutoring sessions are unavailable",
  },
  preparationPanelNotAcceptingBody: {
    id: "preparation.panel.notAccepting.body",
    defaultMessage:
      "Sessions already in progress continue. Students can start new sessions again once the {count, plural, one {item} other {items}} below {count, plural, one {is} other {are}} resolved.",
  },
  preparationPanelUnavailableHeading: {
    id: "preparation.panel.unavailable.heading",
    defaultMessage: "Readiness could not be checked",
  },
  preparationPanelUnavailableBody: {
    id: "preparation.panel.unavailable.body",
    defaultMessage:
      "MIA could not evaluate this course safely, so its preparation details are not shown. Try again in a moment.",
  },
  preparationPanelUnavailableRetry: {
    id: "preparation.panel.unavailable.retry",
    defaultMessage: "Check again",
  },
  preparationPanelUnavailableBack: {
    id: "preparation.panel.unavailable.back",
    defaultMessage: "Back to Prepare courses",
  },
  preparationBlockersHeadingInactive: {
    id: "preparation.blockers.heading.inactive",
    defaultMessage: "Blocking activation",
  },
  preparationBlockersHeadingActive: {
    id: "preparation.blockers.heading.active",
    defaultMessage: "Blocking new tutoring sessions",
  },
  preparationBlockerLearningGoalsName: {
    id: "preparation.blocker.learningGoals.name",
    defaultMessage: "Learning goals",
  },
  preparationBlockerLearningGoalsBody: {
    id: "preparation.blocker.learningGoals.body",
    defaultMessage:
      "Describe what students should be able to do after this course.",
  },
  preparationBlockerLearningGoalsAction: {
    id: "preparation.blocker.learningGoals.action",
    defaultMessage: "Write learning goals",
  },
  preparationBlockerInstructionsName: {
    id: "preparation.blocker.instructions.name",
    defaultMessage: "AI instructions",
  },
  preparationBlockerInstructionsBody: {
    id: "preparation.blocker.instructions.body",
    defaultMessage:
      "Describe how the AI tutor should work with students in this course. Examples and a preview help you along.",
  },
  preparationBlockerInstructionsAction: {
    id: "preparation.blocker.instructions.action",
    defaultMessage: "Write AI instructions",
  },
  preparationBlockerLanguageName: {
    id: "preparation.blocker.language.name",
    defaultMessage: "Course language",
  },
  preparationBlockerLanguageBody: {
    id: "preparation.blocker.language.body",
    defaultMessage: "Set the language this course is taught in.",
  },
  preparationBlockerLanguageAction: {
    id: "preparation.blocker.language.action",
    defaultMessage: "Set course language",
  },
  preparationBlockerSupervisorName: {
    id: "preparation.blocker.supervisor.name",
    defaultMessage: "Assigned supervisor",
  },
  preparationBlockerMaterialName: {
    id: "preparation.blocker.material.name",
    defaultMessage: "Approved course-wide material",
  },
  preparationBlockerMaterialInactive: {
    id: "preparation.blocker.material.body.inactive",
    defaultMessage:
      "At least one course-wide material with uploaded files that has finished processing and that you have approved. Processing and approval are separate steps.",
  },
  preparationBlockerMaterialActive: {
    id: "preparation.blocker.material.body.active",
    defaultMessage:
      "No course-wide material qualifies right now. This happens, for example, when the brief of an approved material is changed and needs your approval again.",
  },
  preparationBlockerMaterialAction: {
    id: "preparation.blocker.material.action",
    defaultMessage: "Open course materials",
  },
  preparationBlockerUnmet: {
    id: "preparation.blocker.unmet",
    defaultMessage: "Unmet",
  },
  preparationSetupHeading: {
    id: "preparation.setup.heading",
    defaultMessage: "Course setup",
  },
  preparationSetupIntro: {
    id: "preparation.setup.intro",
    defaultMessage:
      "What the AI tutor works with. Each part is edited and saved on its own page.",
  },
  preparationSetupDetails: {
    id: "preparation.setup.details",
    defaultMessage: "Name and description",
  },
  preparationSetupSupervisorLabel: {
    id: "preparation.setup.supervisorLabel",
    defaultMessage: "Supervisors",
  },
  preparationSetupNotWritten: {
    id: "preparation.setup.notWritten",
    defaultMessage: "Not written yet",
  },
  preparationSetupNotAdded: {
    id: "preparation.setup.notAdded",
    defaultMessage: "Not added",
  },
  preparationSetupNoDescription: {
    id: "preparation.setup.noDescription",
    defaultMessage: "no description",
  },
  preparationSetupEdit: {
    id: "preparation.setup.edit",
    defaultMessage: "Edit",
  },
  preparationSetupWrite: {
    id: "preparation.setup.write",
    defaultMessage: "Write",
  },
  preparationSetupAdd: { id: "preparation.setup.add", defaultMessage: "Add" },
  preparationSetupActionName: {
    id: "preparation.setup.actionName",
    defaultMessage: "{action} {field}",
  },
  preparationSetupSupervisors: {
    id: "preparation.setup.supervisors",
    defaultMessage:
      "{count, number} assigned · assignments are managed by an administrator",
  },
  preparationEntriesHeading: {
    id: "preparation.entries.heading",
    defaultMessage: "Materials and students",
  },
  preparationEntriesMaterialsTitle: {
    id: "preparation.entries.materials.title",
    defaultMessage: "Course materials",
  },
  preparationEntriesMaterialsBody: {
    id: "preparation.entries.materials.body",
    defaultMessage: "Upload files, follow processing and approve briefs.",
  },
  preparationEntriesStudentsTitle: {
    id: "preparation.entries.students.title",
    defaultMessage: "Course students",
  },
  preparationEntriesStudentsInactive: {
    id: "preparation.entries.students.body.inactive",
    defaultMessage: "Students can be added once the course is active.",
  },
  preparationEntriesStudentsActive: {
    id: "preparation.entries.students.body.active",
    defaultMessage: "Create student accounts or add existing students.",
  },
  preparationDetails: {
    id: "preparation.details",
    defaultMessage: "Course details",
  },
  preparationDetailsTitle: {
    id: "preparation.detailsTitle",
    defaultMessage: "Course details | MIA",
  },
  preparationDescription: {
    id: "preparation.description",
    defaultMessage: "Course description",
  },
  preparationCurriculum: {
    id: "preparation.curriculum",
    defaultMessage: "Curriculum",
  },
  preparationCurriculumTitle: {
    id: "preparation.curriculumTitle",
    defaultMessage: "Curriculum | MIA",
  },
  preparationGoals: {
    id: "preparation.goals",
    defaultMessage: "Learning goals",
  },
  preparationGoalsTitle: {
    id: "preparation.goalsTitle",
    defaultMessage: "Learning goals | MIA",
  },
  preparationInstructions: {
    id: "preparation.instructions",
    defaultMessage: "AI instructions",
  },
  preparationInstructionsTitle: {
    id: "preparation.instructionsTitle",
    defaultMessage: "AI instructions | MIA",
  },
  preparationLanguage: {
    id: "preparation.language",
    defaultMessage: "Course language",
  },
  preparationLanguageTitle: {
    id: "preparation.languageTitle",
    defaultMessage: "Course language | MIA",
  },
  preparationIncomplete: {
    id: "preparation.incomplete",
    defaultMessage: "Inactive — preparation is incomplete",
  },
  preparationActivatable: {
    id: "preparation.activatable",
    defaultMessage: "Inactive — ready for activation",
  },
  preparationAccepting: {
    id: "preparation.accepting",
    defaultMessage: "Active — accepting new tutoring sessions",
  },
  preparationBlocked: {
    id: "preparation.blocked",
    defaultMessage:
      "Active — not accepting new tutoring sessions; existing sessions may finish",
  },
  preparationTextHelp: {
    id: "preparation.textHelp",
    defaultMessage:
      "Plain text, up to {points, number} Unicode code points and {bytes, number} UTF-8 bytes before normalization. An empty value removes this optional field.",
  },
  preparationLanguageHelp: {
    id: "preparation.languageHelp",
    defaultMessage:
      "Enter a non-private-use BCP 47 language tag, for example en-GB or ja. This sets the course language, not the interface language. Leave empty to remove it.",
  },
  preparationCounts: {
    id: "preparation.counts",
    defaultMessage: "{points, number} code points; {bytes, number} UTF-8 bytes",
  },
  preparationPrivacy: {
    id: "preparation.privacy",
    defaultMessage:
      "Do not include passwords, secrets, or unnecessary personal data. Learning goals describe outcomes; AI instructions guide the tutor’s behavior.",
  },
  preparationExample: {
    id: "preparation.example",
    defaultMessage: "Show an example",
  },
  preparationPreview: {
    id: "preparation.preview",
    defaultMessage: "Exact plain-text preview",
  },
  preparationDescriptionExample: {
    id: "preparation.descriptionExample",
    defaultMessage: "An introductory course with guided practice.",
  },
  preparationCurriculumExample: {
    id: "preparation.curriculumExample",
    defaultMessage: "Context: introductory concepts, then practical exercises.",
  },
  preparationGoalsExample: {
    id: "preparation.goalsExample",
    defaultMessage:
      "Learners will explain a concept and apply it to a new example.",
  },
  preparationInstructionsExample: {
    id: "preparation.instructionsExample",
    defaultMessage:
      "Ask one guiding question at a time. Invite the learner to explain their reasoning.",
  },
  preparationLanguageExample: {
    id: "preparation.languageExample",
    defaultMessage: "en-GB",
  },
  preparationBoundsError: {
    id: "preparation.boundsError",
    defaultMessage: "Shorten this text to stay within both displayed limits.",
  },
  preparationRejected: {
    id: "preparation.rejected",
    defaultMessage:
      "The change was not accepted. Check this field and its requirements, then save again.",
  },
  preparationActiveError: {
    id: "preparation.activeError",
    defaultMessage:
      "This change would remove an active-course prerequisite. Keep the required teaching fields valid.",
  },
  preparationSave: { id: "preparation.save", defaultMessage: "Save changes" },
  preparationSaved: {
    id: "preparation.saved",
    defaultMessage: "Changes saved. The confirmed values are shown.",
  },
  preparationUnknown: {
    id: "preparation.unknown",
    defaultMessage:
      "Save outcome unknown. Submitted values are unconfirmed. Check the current course before deciding; MIA does not replay the request.",
  },
  preparationReconcile: {
    id: "preparation.reconcile",
    defaultMessage: "Check current course",
  },
  preparationMatches: {
    id: "preparation.matches",
    defaultMessage:
      "The current course matches the submitted value. This confirms the current value, not the earlier request’s outcome.",
  },
  preparationDiffers: {
    id: "preparation.differs",
    defaultMessage:
      "Current course values differ. Your submitted value remains unconfirmed. Review the current value or discard your local input.",
  },
  preparationCurrent: {
    id: "preparation.current",
    defaultMessage: "Current persisted value",
  },
  preparationUseCurrent: {
    id: "preparation.useCurrent",
    defaultMessage: "Discard local input and use current value",
  },
  preparationNewer: {
    id: "preparation.newer",
    defaultMessage:
      "Newer persisted values are shown. Local edits were not replaced; review before saving.",
  },
});

export type MessageId = (typeof messages)[keyof typeof messages]["id"];

// Public catalog keys, shared by build-compiled value tables (FFR-955).
export const catalogMessageIds = Object.values(messages)
  .map((message) => message.id)
  .sort();
