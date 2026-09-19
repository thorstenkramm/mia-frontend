# MIA Frontend Brainstorming 1

Answer freely. Short notes, examples, contradictions, and uncertain ideas are all useful. This is discovery input, not a
commitment to a final design.

## Product Experience

### 1. What should using MIA feel like?

Describe the emotional qualities the experience should have. What should users feel while learning, preparing a course,
or
supporting a student?

**Answer:**
First and foremost, they should feel safe. MIA is the space where all errors are allowed. Errors are good for learning.
All users (students, supervisors, and mentors) must feel that they are guided and never left alone.

### 2. What must MIA never feel like?

Consider educational software, administrative systems, AI chat products, surveillance tools, social platforms, or
anything
else that would set the wrong expectation.

**Answer:**
User must never feel controlled. While MIA has the option to simulate an exam, the software is not for controlling.
User must also never feel overwhelmed. This refers to both: Exercises and the UI/UX.

### 3. What would make you say, "This frontend understands the people using it"?

Name the moments, behaviors, or small details that would prove the experience is right.

**Answer:**
When user input is required, especially when supervisors, admin and mentors do the preparing, input field come with
a tooltip explaining what input is expected.
MIA and the tutoring sessions are not a game.
While using MIA the users is not distracted from the primary goal, either preparation or conducting a tutoring session.

## Student Story

### 4. Picture one specific student opening MIA to learn.

Give them a name or nickname. Where are they? What device are they using? What time is it? Why did they open MIA? How
are they feeling before they begin?

**Answer:**
Call the student "Pablo". They are located anywhere in the world, MIA focuses on students from poor backgrounds and
low-income families.
Pablos lives in the middle of nowhere in Argentina. Roads are unpaved, and houses are very simple.
Student will use desktop PCs provided by the school located in some room of the school.
The conduct their tutoring sessions after regular classes, 3pm tp 6pm.
The open MIA because the teacher recommends it. Teacher will explain what MIA is before students have their first
session.
The first session will be something new. Some might feel existed, other might feel anxious.

### 5. Walk through that student's ideal tutoring session.

Describe what they notice first, how they begin, when the experience becomes valuable, and how they know they have made
progress. Include the moment that matters most.

**Answer:**
They shall notice, MIA is a companion. MIA is different from the school's teacher, because it is the most patient
"person"
they have ever worked with.
They begin by selecting a course. MIA suggest activities like doing homework or excercises.
MIA must praise the students. Also, success must be communicated very directly: "That was better than last time." "It
lools like are safe on the topic" etc.

### 6. Where might this student hesitate, become confused, feel judged, or give up?

Consider choosing a course or material, writing the first message, waiting for the tutor, encountering failure, asking
for a mentor, and finishing a session.

**Answer:**
When AI is "thinking" the user must never be uncertain that nothing is happening. Progress and status of what is 
happening behind the scenes must be transparent. This creates certainty. 

### 7. How visible should the AI nature of the tutor be?

What should the student understand about the tutor, its limitations, material use, external processing, and the
involvement or non-involvement of humans?

**Answer:**
MIA shall not try to hide it is AI-powered. Students will always be guided by humans during the tutoring sessions.

## Supervisor Story

### 8. Picture one specific supervisor preparing a course.

Who are they? Where and on what device do they work? How much time and technical confidence do they have? What are they
trying to accomplish?

**Answer:**
Supervisors are teachers, or childhood educators, or other professionals in the education sector.
The work exclusively on a desktop PC.
They are familiar with working on a PC because its part of their job. The spend the time needed to prepare a course.
They will have a lot of material at hand, because MIA uses the same materials used in the class room.


### 9. What must a supervisor understand at a glance?

Consider course readiness, material processing and approval, students, active tutoring status, completed work,
mentoring, and items requiring attention.

**Answer:**
Supervisors must understand that the students success relies heavily on the preparation of the course.
They must also understand that AI cannot do magic. The better they prepare, the better AI can explain the right things
to the student. 

### 10. Walk through the supervisor's most important or difficult workflow.

Describe the starting point, decisions, uncertainties, moment of confidence, and successful outcome.

**Answer:**
Supervisor creates a course and sets the learning goals. Regarding learning goals: The more details the better.
They are familiar with this. They have done this many times, but usually with MS Office or on paper.
The main challenge is now, to enter the information into a purely digital system with very clear rules. 
It's not MS Word where you can enter any free text.

### 11. How should MIA balance power and safety for supervisors?

Supervisors can perform consequential actions involving student access, security, private material, and course-scoped
data.
Where should the interface be fast, and where should it deliberately slow them down?

**Answer:**
User management can be fast.
But course perparation must be done carefully.

## Mentor Story

### 12. Picture one specific mentor responding to a student's request.

Who are they? What context are they in? What do they need to understand quickly, and what must remain outside their
view?

**Answer:**
Mentors can be students from the univeristy or retired people including ex-teachers who voluntary conduct mentoring sessions.
Sessions are conducted remotely using some video conferencing tool, which is not port of MIA, e.g. Google Meet.
Mentors must get quick summary of where the student stands. 
Mentors come from all over the world. A retired nurse from Mexico might help a student in Argentina. 
Many mentors will be older people not that tech-save, but working with a PC has been part of their work.
MIA must be suitable for mentors up to 70 years. Mentors will use a desktop PC only.

### 13. What should make mentoring feel focused, responsible, and distinct from tutoring?

Consider triage, scheduling, external meeting links, boundaries, urgency, and the fact that mentoring is not an
emergency
channel.

**Answer:**
Not losing the focus is the duty of the mentor. MIA only schedules the sessions and provides a link to start.
Mentoring is a real conversation with a human. 

### 14. Walk through the mentor's ideal response and scheduling experience.

Include the point where they feel confident that the student knows what will happen next.

**Answer:**
Let's keep this simple for the fist version. Mentors get an invite as implemented by the backend. That's it.

## Administrator And Multiple Roles

### 15. What is the administrator's mental model of MIA?

Should it feel primarily like account administration, platform operations, organizational oversight, or something else?
What information deserves prominence?

**Answer:**
It's account administration, platform operations, organizational oversight.

### 16. How should MIA behave for a person who holds multiple roles?

Should they move between distinct workspaces, see one combined experience, choose a current context, or use another
model?
What would be least confusing?

**Answer:**
one combined experience on a single unified UI.

## Devices And Environment

### 17. Which devices and contexts matter for each audience?

Describe expected desktop, laptop, tablet, and phone use for students, supervisors, mentors, and administrators. Note
shared devices, weak connections, assistive technology, classroom use, or private home use where relevant.

**Answer:**
Only desktop PC with a screen resolution with at least full HD is in scope. All other devices are out of scope.
Usage from small screen must be prevented. 
MIA runs entirely in the browser. 
Students might use shared devices. The logout process and automated locking on inactivity is crucial. 

### 18. Which activities must work exceptionally well on a phone?

Which activities may reasonably be optimized for a larger screen, if any?

**Answer:**
None. Phones are out of scope. They are used only for MFA.

## Character And Inspiration

### 19. Which products, websites, or physical environments inspire the desired experience?

For each example, say what should be borrowed: clarity, calm, navigation, warmth, typography, interaction, density, or
something else.

**Answer:**
The UIs from ChatGPT or Claude's chatbots are well done. I know what is going on. 
The output is well rendered with rich text elements and not just plain text.
I can give answers by clicking buttons.
They are reduced to what they have been built for: Conduction a conversation. 

### 20. Which products or patterns should MIA explicitly avoid?

Explain what feels manipulative, childish, corporate, clinical, distracting, overcomplicated, generic, or otherwise
wrong.

**Answer:**
No gamefication.
Students are in the ages 9-19 years. It's a big range. But the UI can adapt to the age.
Students are not familiar with keyboard shortcuts or "hidden" browser features. Increasing or decreasing the font size
must be built into MIA ui.
The first version of MIA's UI shall not have a dark theme.  

### 21. Does MIA already have a visual identity?

Note any logo, colors, typefaces, institutional context, existing materials, or brand constraints. If none exist,
describe
the character the identity should express without choosing specific visual tokens yet.

**Answer:**
No.
Having a mascot woul be nice. But keep in mind: A 19-years old student has to be able to identify with it, too.
The GitHub octacat is a good example. All ages like it. 

## Trust, Inclusion, And Language

### 22. What should make users trust MIA?

Consider privacy, AI transparency, data handling, predictable behavior, recovery from errors, and clarity about who can
see what.

**Answer:**
As already mentioned, we want full AI transparancy. MIA does not hide it is AI-powered.
For the first version all backend errors must be transparent. 
The HTTP status code and full response must be visible on the UI. Even if the student doesn't understand the error message,
they can forward a screenshot so the supervisior or the admin knows what went wrong.

### 23. Who is easiest to exclude accidentally?

Consider disability, age, language, literacy, neurodiversity, technical confidence, device quality, connection quality,
and stress. What accommodations or qualities matter most?

**Answer:**
For the students we need simple language.
WCAG-Level AA. But discussable and not strictly required for the first version.


### 24. What languages should the frontend support at launch?

Should the preferred language control interface text, tutor interaction, course content, generated communications, or
only some of these? How should users choose or change it?

**Answer:**
preferred language must apply to the entire UI, expect backend error messages. The latter will be passed through without
translation.

UI must be translated into the user's language. Especially in Spanish and Portuguese we must differenciate between
Europe and latinamerica.
The first version must support the following languages:
- English, US american
- German, Germany
- French, France
- Portuguese, Portugal
- Portuguese, Brasil
- Spanish, Spain
- Spanish, Argentina

### 25. How should MIA speak?

Provide example phrases if possible. Should the interface sound warm, concise, formal, encouraging, neutral, direct, or
different by audience? What words or tones should it avoid?

**Answer:**
Formal but warm. Not colloquial.
Simple language for students. 


## Success And Priorities

### 26. Which three user moments matter most for the first release?

These are the moments where excellent UX would create the greatest value or avoid the greatest harm.

**Answer:**
1. Supervisors are well guided through the self-explanatory course preparation process. 
   Ideally they can do this without a user guide. The absence of complaints is the biggest success. 
2. Students will need one tutoring session with a human sitting behind guiding and making them familiar with MIA.
   Biggest success is when students can conduct the second session without the help of a human. 

### 27. Where can the first release be merely functional?

Identify lower-frequency or lower-risk areas where refinement can wait without undermining trust or usability.

**Answer:**
Everything done by the admin can be functional. Admins are super tech-safe.
Mentoring session have the lowest priority. The first version of the UI can completely hide this feature. 
Course preparation and conducting tutoring sessions is key.

### 28. What would indicate that the frontend failed, even if every feature technically worked?

**Answer:**
The UI/UX has failed when
- A supervisor doesn't know what to do
- A student uses the reload or browser back button because the feel lost, or they don't know what going on.

## Open Brain Dump

### 29. What else is in your vision that these questions did not capture?

Add concerns, sketches in words, unresolved debates, strong preferences, weak intuitions, or ideas you do not yet know
how to
express.

**Answer:**

Consistency is key. 
