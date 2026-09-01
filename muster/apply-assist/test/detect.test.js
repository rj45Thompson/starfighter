/* Field-detection tests. No framework, no install — `node test/detect.test.js`.
 *
 * These matter more than they look. The failure mode that hurts a user is not
 * "missed a field", it is "confidently put the wrong thing in the wrong box" —
 * a first name in the company field, or worse, a value in something sensitive.
 * So the suite is weighted toward what must NEVER be filled.
 */

const assert = require("assert");

/* A DOM small enough to hand-roll: fields.js only ever touches label lookup,
 * closest(), getAttribute and querySelectorAll. */
function makeEl({ tag = "input", type = "text", name = "", id = "",
                  placeholder = "", label = "", aria = "", auto = "",
                  form = null } = {}) {
  // A form scope, when the test supplies one: heading/button text is the
  // "chrome" isAuthField reads, and hasPassword stands in for a real
  // <input type=password> sitting in the same form.
  const scope = form && {
    getAttribute: (k) => (k === "aria-label" ? (form.aria || null) : null),
    querySelector: (sel) =>
      (sel.includes("password") && form.hasPassword ? { type: "password" } : null),
    querySelectorAll: (sel) => {
      if (sel.includes("legend")) return form.heading ? [{ textContent: form.heading }] : [];
      if (sel.includes("button")) return form.button ? [{ textContent: form.button }] : [];
      return [];
    }
  };
  const el = {
    tagName: tag.toUpperCase(), type, name, id, placeholder,
    disabled: false, readOnly: false, offsetParent: {}, value: "",
    getAttribute: (k) => ({ "aria-label": aria, autocomplete: auto,
                            "aria-labelledby": "", "data-automation-id": "" }[k] || null),
    closest: (sel) => {
      if (sel === "label" && label) return { textContent: label };
      if (sel === "form") return scope || null;
      if (sel.includes("login") || sel.includes("signin")) return null;
      return null;
    }
  };
  return { el, label };
}

/* Minimal globals fields.js expects. */
global.document = {
  querySelector: () => null,
  getElementById: () => null,
  querySelectorAll: () => []
};
global.CSS = { escape: (s) => s };

const ApplyFields = require("../src/fields.js");

let pass = 0, fail = 0;
function check(desc, actual, expected) {
  try {
    assert.strictEqual(actual, expected);
    pass++;
  } catch {
    fail++;
    console.error(`  FAIL  ${desc}\n        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const classify = (opts) => ApplyFields.classify(makeEl(opts).el);

console.log("\nfields it should recognise");
check("autocomplete given-name", classify({ auto: "given-name", name: "q1" }), "firstName");
check("label First Name",        classify({ aria: "First Name" }), "firstName");
check("name=last_name",          classify({ name: "last_name" }), "lastName");
check("email by aria",           classify({ aria: "Email address", type: "email" }), "email");
check("phone by name",           classify({ name: "phone_number" }), "phone");
check("linkedin",                classify({ aria: "LinkedIn Profile" }), "linkedin");
check("github",                  classify({ aria: "GitHub URL" }), "github");
check("salary expectation",      classify({ aria: "Salary expectations" }), "salary");
check("notice period",           classify({ aria: "What is your notice period?" }), "availability");
check("work authorization",      classify({ aria: "Are you legally authorized to work?" }), "workAuth");
check("sponsorship",             classify({ aria: "Will you require sponsorship?" }), "sponsorship");
check("how did you hear",        classify({ aria: "How did you hear about us?" }), "referral");
check("cover letter textarea",   classify({ tag: "textarea", aria: "Cover letter" }), "coverLetter");
check("postal code",             classify({ aria: "Postal Code" }), "postal");

console.log("\nfields it must NEVER fill");
check("password",        classify({ type: "password", aria: "Password" }), null);
check("password by name",classify({ name: "user_password" }), null);
check("SSN",             classify({ aria: "Social Security Number" }), null);
check("SIN",             classify({ aria: "Social Insurance Number (SIN)" }), null);
check("credit card",     classify({ aria: "Credit card number" }), null);
check("CVV",             classify({ aria: "CVV" }), null);
check("gender",          classify({ aria: "Gender" }), null);
check("race",            classify({ aria: "Race / Ethnicity" }), null);
check("veteran status",  classify({ aria: "Veteran status" }), null);
check("disability",      classify({ aria: "Disability status" }), null);
check("date of birth",   classify({ aria: "Date of birth" }), null);

console.log("\nconfusions it must not make");
// "Company name" on an application is the employer field, so mapping it to
// currentCompany is correct. What must not happen is it landing in a name field.
check("company name is the employer", classify({ aria: "Company name" }), "currentCompany");
check("school is not a name",       classify({ aria: "School name" }), null);
check("reference name",             classify({ aria: "Reference name" }), null);
// A referees section asks for their employer, title, city and contact details
// in the same words the form used for the applicant's own. Answering those
// with the applicant's details looks complete and is false, which is the
// expensive kind of wrong. Nothing mentioning a reference is ours to answer.
check("reference's company",        classify({ aria: "Reference's company name" }), null);
check("reference's job title",      classify({ aria: "Reference job title" }), null);
check("reference's email",          classify({ aria: "Reference email" }), null);
check("reference's phone",          classify({ aria: "Reference phone number" }), null);
check("reference's city",           classify({ aria: "Reference city" }), null);
check("reference's linkedin",       classify({ aria: "Reference LinkedIn" }), null);
check("referee spelling too",       classify({ aria: "Referee company" }), null);
check("confirm email",              classify({ aria: "Confirm email" }), null);
check("country code not phone",     classify({ aria: "Country code" }), null);
check("current salary not target",  classify({ aria: "Current salary" }), null);
check("address line 2",             classify({ aria: "Address line 2" }), null);
check("hidden input",               ApplyFields.classify(makeEl({ type: "hidden", aria: "First name" }).el), null);
check("disabled input", (() => {
  const { el } = makeEl({ aria: "First name" });
  el.disabled = true;
  return ApplyFields.classify(el);
})(), null);
check("nothing to go on", classify({}), null);

console.log("\nfile uploads");
const classifyFile = (opts) =>
  ApplyFields.classifyFile(makeEl(Object.assign({ type: "file" }, opts)).el);
check("resume by label",       classifyFile({ aria: "Resume" }), "resumeFile");
check("resume by name",        classifyFile({ name: "resume_upload" }), "resumeFile");
check("CV",                    classifyFile({ aria: "Upload your CV" }), "resumeFile");
check("curriculum vitae",      classifyFile({ aria: "Curriculum Vitae" }), "resumeFile");
check("cover letter file",     classifyFile({ aria: "Cover letter" }), "coverLetterFile");
// A resume must never land in a transcript or portfolio slot — attaching the
// wrong document is worse than attaching none.
check("transcript is not a resume", classifyFile({ aria: "Transcript" }), null);
check("portfolio is not a resume",  classifyFile({ aria: "Portfolio" }), null);
check("photo is not a resume",      classifyFile({ aria: "Photo" }), null);
check("unlabelled file input",      classifyFile({}), null);
// classify() still refuses file inputs — they take the attach path, not the type path.
check("classify ignores file inputs",
  ApplyFields.classify(makeEl({ type: "file", aria: "Resume" }).el), null);
// A text input labelled "resume" is not a file slot.
check("classifyFile ignores text inputs",
  ApplyFields.classifyFile(makeEl({ type: "text", aria: "Resume" }).el), null);

console.log("\nsign-in walls — credentials are the applicant's to type");
const isAuth = (opts) => ApplyFields.isAuthField(makeEl(opts).el);

// The dangerous case: a login box whose field is genuinely called "email".
// Scoring it would succeed, which is exactly why scoring is not the last word.
check("email inside a sign-in form",
  classify({ aria: "Email", form: { heading: "Sign in to apply" } }), null);
check("email beside a password input",
  classify({ aria: "Email", form: { hasPassword: true } }), null);
check("email in a Create an account form",
  classify({ aria: "Email", form: { heading: "Create an account" } }), null);
check("email on a Log In form",
  classify({ aria: "Email address", form: { button: "Log In" } }), null);
check("autocomplete=username",        isAuth({ auto: "username" }), true);
check("autocomplete=current-password",isAuth({ auto: "current-password" }), true);
check("autocomplete=new-password",    isAuth({ auto: "new-password" }), true);
check("autocomplete=one-time-code",   isAuth({ auto: "one-time-code" }), true);
check("a bare password input",        isAuth({ type: "password" }), true);

// ...and the other half: an ordinary application form must still fill.
check("email in an application form still fills",
  classify({ aria: "Email", form: { heading: "Apply for this job",
                                    button: "Submit Application" } }), "email");
check("first name in an application form still fills",
  classify({ aria: "First Name", form: { button: "Submit Application" } }), "firstName");
check("application form is not an auth scope",
  isAuth({ aria: "Email", form: { heading: "Apply for this job" } }), false);
check("a form with no chrome at all is not an auth scope",
  isAuth({ aria: "Email", form: {} }), false);

console.log("\nauth walls on the page");
const fakeRoot = (pw, otp) => ({
  querySelectorAll: (sel) => {
    if (sel.includes("password")) return pw ? [{ hidden: false, type: "password" }] : [];
    if (sel.includes("one-time-code")) return otp ? [{ hidden: false, type: "text" }] : [];
    return [];
  }
});
check("visible password field is a wall", ApplyFields.authWall(fakeRoot(true, false)).wall, true);
check("wall reason is password",          ApplyFields.authWall(fakeRoot(true, false)).reason, "password");
check("a 2FA code box is a wall",         ApplyFields.authWall(fakeRoot(false, true)).wall, true);
check("wall reason is code",              ApplyFields.authWall(fakeRoot(false, true)).reason, "code");
check("an ordinary page is not a wall",   ApplyFields.authWall(fakeRoot(false, false)).wall, false);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
